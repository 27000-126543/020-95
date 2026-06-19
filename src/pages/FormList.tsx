import { useState, useEffect, useMemo } from 'react'
import type { FormHistoryItem, OcclusionFormData, CaseStatus, TransferPackage } from '@/types/form'
import { getHistory, removeHistoryItem, clearHistory, saveHistory, upsertFromImport } from '@/utils/historyStore'
import { formatDateTime } from '@/utils/formUtils'
import { determineCaseStatus, CASE_STATUS_META } from '@/utils/stepValidator'
import { migrateFormData } from '@/utils/formUtils'
import { buildTransferPackage } from '@/utils/issueManager'

interface FormListProps {
  onNewForm: () => void
  onOpenForm: () => void
  onSelectForm: (data: OcclusionFormData, filePath: string, targetViewHint?: string) => void
  onImportedForm: (data: OcclusionFormData, hint?: string) => void
}

type KanbanFilter = 'all' | CaseStatus

interface RowDisplay {
  item: FormHistoryItem
  status: CaseStatus
  invalidPath?: boolean
}

export function FormList({ onNewForm, onOpenForm, onSelectForm, onImportedForm }: FormListProps) {
  const [history, setHistory] = useState<FormHistoryItem[]>([])
  const [rows, setRows] = useState<RowDisplay[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [kanbanFilter, setKanbanFilter] = useState<KanbanFilter>('all')
  const [toast, setToast] = useState<string | null>(null)

  const refresh = () => {
    const h = getHistory()
    setHistory(h)
    setRows(h.map(item => ({
      item,
      status: item.status || 'awaiting_receipt'
    })))
  }

  useEffect(() => { refresh() }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 4000)
  }

  const kanbanCounts = useMemo(() => {
    const counts: Record<CaseStatus, number> = {
      doctor_incomplete: 0,
      awaiting_receipt: 0,
      doctor_action: 0,
      completed: 0
    }
    rows.forEach(r => { if (r.status in counts) counts[r.status] += 1 })
    return counts
  }, [rows])

  const loadFromHistory = async (row: RowDisplay, targetViewHint?: string) => {
    let data: OcclusionFormData | null = null
    let filePath = row.item.filePath

    // 有内存数据的待保存条目，直接用内存数据
    if (row.item.inMemoryData) {
      data = row.item.inMemoryData
      filePath = ''
    } else if (filePath.startsWith('mem://') && row.item.inMemoryData) {
      data = row.item.inMemoryData
      filePath = ''
    } else if (filePath.startsWith('mem://')) {
      showToast('⚠ 该记录已超出内存保留期，请从原导入的 .ocp.json 文件重新导入')
      setRows(prev => prev.map(r => r.item.filePath === row.item.filePath ? { ...r, invalidPath: true } : r))
      return
    } else {
      const result = await window.electronAPI.loadFormByPath(filePath)
      if (result.success && result.data && result.filePath) {
        data = migrateFormData(result.data as OcclusionFormData)
        filePath = result.filePath
      } else {
        showToast(`文件读取失败：${result.error || '路径已失效'}`)
        setRows(prev => prev.map(r => r.item.filePath === row.item.filePath ? { ...r, invalidPath: true } : r))
        return
      }
    }

    if (!data) {
      showToast('❌ 无法获取该记录的数据')
      return
    }

    const status = determineCaseStatus(data)
    const updatedHistory = getHistory().map(h =>
      h.id === row.item.id || h.filePath === row.item.filePath
        ? { ...h, status, lastUpdatedAt: new Date().toISOString(), inMemoryData: data, pendingLocalSave: !filePath }
        : h
    )
    saveHistory(updatedHistory)
    setRows(updatedHistory.map(item => ({ item, status: (item.status || 'awaiting_receipt') as CaseStatus })))
    onSelectForm(data, filePath, targetViewHint)
  }

  const handleRemove = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation()
    if (confirm('确定要从列表中移除这条记录吗？（不会删除实际文件）')) {
      const updated = removeHistoryItem(filePath)
      setHistory(updated)
      setRows(updated.map(item => ({ item, status: (item.status || 'awaiting_receipt') as CaseStatus })))
    }
  }

  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？（不会删除实际文件）')) {
      clearHistory()
      setHistory([])
      setRows([])
    }
  }

  const handleExportRow = async (e: React.MouseEvent, row: RowDisplay) => {
    e.stopPropagation()
    e.preventDefault()
    let data: OcclusionFormData | null = null
    let patientCode = row.item.patientCode || 'unknown'
    if (row.item.inMemoryData) {
      data = row.item.inMemoryData
      patientCode = data.patientCode || patientCode
    } else if (row.item.filePath && !row.item.filePath.startsWith('mem://')) {
      const rt = await window.electronAPI.loadFormByPath(row.item.filePath)
      if (rt.success && rt.data) {
        data = migrateFormData(rt.data as OcclusionFormData)
        patientCode = data.patientCode || patientCode
      } else {
        showToast('❌ 导出失败：无法读取文件')
        return
      }
    } else {
      showToast('❌ 该记录没有可用数据，请先保存或重新导入')
      return
    }
    const actorName = data.receipt?.technicianName || data.receipt?.labName || data.dentistName || data.clinicName || '诊所'
    const isLab = !!data.receipt && row.item.status !== 'doctor_incomplete'
    const pkg = buildTransferPackage(data, {
      actorType: isLab ? 'lab' : 'clinic',
      actorName
    })
    const r = await window.electronAPI.exportPackage(pkg)
    if (r.success && r.filePath) {
      showToast('✅ 已导出交接包：' + r.filePath)
    }
  }

  const handleBatchExport = async () => {
    if (filteredRows.length === 0) return
    const dataMap: Record<string, OcclusionFormData> = {}
    for (const row of filteredRows) {
      if (row.item.inMemoryData) {
        dataMap[row.item.id] = row.item.inMemoryData
      } else if (row.item.filePath && !row.item.filePath.startsWith('mem://') && !row.invalidPath) {
        const rt = await window.electronAPI.loadFormByPath(row.item.filePath)
        if (rt.success && rt.data) {
          dataMap[row.item.id] = migrateFormData(rt.data as OcclusionFormData)
        }
      }
    }
    const ids = Object.keys(dataMap)
    if (ids.length === 0) {
      showToast('❌ 没有可导出的有效数据')
      return
    }
    if (ids.length === 1) {
      const row = filteredRows.find(r => r.item.id === ids[0])
      if (row) {
        const fakeEvt = { stopPropagation: () => {}, preventDefault: () => {} } as unknown as React.MouseEvent
        return handleExportRow(fakeEvt, row)
      }
      return
    }
    const pkg = {
      version: 1,
      packageType: 'occlusion-transfer-batch' as const,
      exportedAt: new Date().toISOString(),
      count: ids.length,
      items: ids.map(id => {
        const d = dataMap[id]
        const isLab = !!d.receipt
        return buildTransferPackage(d, {
          actorType: isLab ? 'lab' : 'clinic',
          actorName: isLab ? (d.receipt?.technicianName || d.receipt?.labName || '技工所') : (d.dentistName || d.clinicName || '诊所')
        })
      })
    }
    const result = await window.electronAPI.exportPackage(pkg)
    if (result.success && result.filePath) {
      showToast(`✅ 已导出 ${ids.length} 份交接包：${result.filePath}`)
    }
  }

  const handleImport = async () => {
    const result = await window.electronAPI.importPackage()
    if (!result.success) {
      if (result.canceled) return
      showToast(`导入失败：${result.error}`)
      return
    }
    const pkg = result.package as TransferPackage & { formData?: OcclusionFormData }
    const importedAt = new Date().toISOString()
    let formData: OcclusionFormData
    let transferSource: FormHistoryItem['transferSource'] | undefined

    // 支持批量包导入
    if (pkg && (pkg as { packageType?: string }).packageType === 'occlusion-transfer-batch' && Array.isArray((pkg as unknown as { items?: TransferPackage[] }).items)) {
      const batch = pkg as unknown as { items: TransferPackage[] }
      let count = 0
      for (const itemPkg of batch.items) {
        if (itemPkg.formData) {
          const ts: FormHistoryItem['transferSource'] = {
            type: itemPkg.source?.type,
            name: itemPkg.source?.name,
            contact: itemPkg.source?.contact,
            exportedAt: itemPkg.exportedAt,
            importedAt,
            importSourcePath: result.filePath,
            caseStatusHint: itemPkg.caseStatus,
            latestNotes: itemPkg.latestNotes,
            history: itemPkg.history
          }
          const fd = migrateFormData({
            ...itemPkg.formData,
            transferSource: ts,
            notes: itemPkg.latestNotes
              ? (itemPkg.formData.notes
                  ? `${itemPkg.formData.notes}\n\n[${importedAt.slice(0, 10)} 交接备注] ${itemPkg.latestNotes}`
                  : `[${importedAt.slice(0, 10)} 交接备注] ${itemPkg.latestNotes}`)
              : itemPkg.formData.notes
          })
          upsertFromImport(fd, result.filePath!, ts)
          count += 1
        }
      }
      refresh()
      showToast(`✅ 已导入 ${count} 份交接包，显示在列表中（待保存）`)
      return
    }

    if (pkg && pkg.packageType === 'occlusion-transfer' && pkg.formData) {
      transferSource = {
        type: pkg.source?.type,
        name: pkg.source?.name,
        contact: pkg.source?.contact,
        exportedAt: pkg.exportedAt,
        importedAt,
        importSourcePath: result.filePath,
        caseStatusHint: pkg.caseStatus,
        latestNotes: pkg.latestNotes,
        history: pkg.history
      }
      formData = migrateFormData({
        ...pkg.formData,
        transferSource,
        notes: pkg.latestNotes
          ? (pkg.formData.notes
              ? `${pkg.formData.notes}\n\n[${importedAt.slice(0, 10)} 交接备注] ${pkg.latestNotes}`
              : `[${importedAt.slice(0, 10)} 交接备注] ${pkg.latestNotes}`)
          : pkg.formData.notes
      })
    } else if (pkg && ((pkg as unknown as OcclusionFormData).patientCode) !== undefined) {
      formData = migrateFormData(pkg as unknown as OcclusionFormData)
    } else {
      showToast('未识别为有效的咬合交接单文件')
      return
    }

    // 立刻入历史（待保存状态），这样工作台能看到
    if (transferSource && result.filePath) {
      upsertFromImport(formData, result.filePath, transferSource)
    } else {
      upsertFromImport(formData, result.filePath || '', { importedAt, importSourcePath: result.filePath })
    }
    refresh()

    showToast('✅ 已导入交接包，显示在列表中（待保存）')
    onImportedForm(formData, (pkg as TransferPackage)?.caseStatus)
  }

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const item = r.item
      const matchSearch = (item.patientCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.restorationType || '').includes(searchTerm) ||
        (item.dentistName || '').includes(searchTerm)
      const matchKanban = kanbanFilter === 'all' ? true : r.status === kanbanFilter
      return matchSearch && matchKanban
    })
  }, [rows, searchTerm, kanbanFilter])

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    const map: Record<string, string> = {
      '常规': 'badge-gray',
      '加急': 'badge-orange',
      '特急': 'badge-red'
    }
    return <span className={`badge ${map[priority] || 'badge-gray'}`}>{priority}</span>
  }

  const hintForStatus = (status: CaseStatus): string | undefined => {
    switch (status) {
      case 'doctor_incomplete': return 'fill'
      case 'awaiting_receipt': return 'receipt-entry'
      case 'doctor_action': return 'preview-summary'
      default: return undefined
    }
  }

  const renderKanban = () => {
    const order: CaseStatus[] = ['doctor_incomplete', 'awaiting_receipt', 'doctor_action', 'completed']
    return (
      <div className="case-kanban">
        {order.map(k => {
          const meta = CASE_STATUS_META[k]
          const isActive = kanbanFilter === k
          return (
            <div
              key={k}
              className={`kanban-card ${isActive ? 'active' : ''}`}
              style={{ ['--kb-color' as string]: meta.color } as React.CSSProperties}
              onClick={() => setKanbanFilter(isActive ? 'all' : k)}
            >
              <div className="kb-head">
                <span className="kb-icon">{meta.icon}</span>
                <span className="kb-label">{meta.label}</span>
              </div>
              <div className="kb-count" style={{ color: meta.color }}>{kanbanCounts[k]}</div>
              <div className="kb-desc">{meta.description}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="form-list">
      {toast && <div className="toast">{toast}</div>}
      <div className="list-header">
        <div className="header-content">
          <h1 className="form-title">🦷 咬合交接单工作台</h1>
          <p className="form-subtitle">按病例状态看板管理，支持一键导入导出交接包</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleImport} title="从 .ocp.json 交接包导入">
            📥 导入交接包
          </button>
          <button className="btn btn-secondary" onClick={onOpenForm}>
            📂 浏览文件...
          </button>
          <button className="btn btn-primary" onClick={onNewForm}>
            ➕ 新建交接单
          </button>
        </div>
      </div>

      <div className="list-stats">
        <div className="stat-card">
          <span className="stat-value">{history.length}</span>
          <span className="stat-label">总记录数</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {kanbanCounts.awaiting_receipt + kanbanCounts.doctor_incomplete}
          </span>
          <span className="stat-label">待处理</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--color-danger)' }}>
            {kanbanCounts.doctor_action}
          </span>
          <span className="stat-label">需医生处理</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
            {kanbanCounts.completed}
          </span>
          <span className="stat-label">已完成</span>
        </div>
      </div>

      {renderKanban()}

      <div className="list-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="text-input search-input"
            placeholder="🔍 搜索患者代号、修复类型、医生姓名..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button
            className={`btn-link ${kanbanFilter === 'all' ? '' : 'btn-ghost'}`}
            onClick={() => setKanbanFilter('all')}
            style={{ padding: '6px 14px', borderRadius: '6px' }}
          >
            🗂 全部 {history.length}
          </button>
          {kanbanFilter !== 'all' && (
            <span className="badge" style={{ background: 'rgba(14,165,233,0.12)', color: 'var(--color-primary)' }}>
              筛选中：{CASE_STATUS_META[kanbanFilter].label}（点击看板卡片可取消）
            </span>
          )}
        </div>
        <div className="spacer" />
        {filteredRows.length > 0 && (
          <button className="btn-link" onClick={handleBatchExport} title="导出当前筛选结果为交接包">
            📤 批量导出
          </button>
        )}
        {history.length > 0 && (
          <button className="btn-link danger" onClick={handleClearAll}>
            清空历史
          </button>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>{history.length === 0 ? '还没有交接单记录' : '当前筛选条件下没有匹配的记录'}</h3>
          <p>{history.length === 0
            ? '新建一份咬合交接单，或从「导入交接包」载入收到的病例'
            : '尝试调整搜索条件或点击其他看板分组'}
          </p>
          {history.length === 0 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={handleImport}>
                📥 导入交接包
              </button>
              <button className="btn btn-primary" onClick={onNewForm}>
                ➕ 创建第一份交接单
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="list-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>患者代号</th>
                <th>修复类型</th>
                <th>医生</th>
                <th>来源</th>
                <th>优先级</th>
                <th>病例状态</th>
                <th>最后更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(r => {
                const item = r.item
                const statusMeta = CASE_STATUS_META[r.status]
                const isTransfer = !!item.transferSource || !!item.importSourcePath
                const isPending = item.pendingLocalSave || !item.saved
                const sourceType = item.transferSource?.type
                const sourceName = item.transferSource?.name
                return (
                  <tr
                    key={item.filePath}
                    className={`history-row ${r.invalidPath ? 'list-row-highlight' : ''} ${isPending ? 'list-row-highlight' : ''}`}
                    style={{
                      ['--kb-color' as string]: isPending ? 'var(--color-warning)' : (r.invalidPath ? 'var(--color-danger)' : statusMeta.color)
                    } as React.CSSProperties}
                    onClick={() => loadFromHistory(r, hintForStatus(r.status))}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="patient-code">{item.patientCode || '-'}</span>
                        {isPending && (
                          <span className="badge badge-orange" title="尚未保存到本地 JSON 文件">
                            待保存
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{item.restorationType || '-'}</td>
                    <td>{item.dentistName || '-'}</td>
                    <td>
                      {isTransfer ? (
                        <span
                          className="status-badge badge-blue"
                          title={sourceName ? `${sourceType === 'lab' ? '技工所' : '诊所'}：${sourceName}` : '外部交接包'}
                        >
                          <span>{sourceType === 'lab' ? '🏭' : '🏥'}</span>
                          {sourceName || '外部交接包'}
                        </span>
                      ) : (
                        <span className="status-badge badge-gray" title="本地创建或通过浏览文件打开">
                          <span>💾</span>
                          本地文件
                        </span>
                      )}
                    </td>
                    <td>{getPriorityBadge(item.priority)}</td>
                    <td>
                      <span className={`status-badge ${statusMeta.badge}`}>
                        <span>{statusMeta.icon}</span>
                        {r.invalidPath ? '文件已失效' : statusMeta.label}
                      </span>
                    </td>
                    <td className="date-cell">{formatDateTime(item.lastUpdatedAt)}</td>
                    <td className="action-cell">
                      <button
                        className="btn-icon"
                        title="导出交接包"
                        onClick={(ev) => handleExportRow(ev, r)}
                      >
                        📤
                      </button>
                      <button
                        className="btn-icon"
                        title="打开"
                        onClick={(ev) => { ev.stopPropagation(); loadFromHistory(r) }}
                      >
                        📂
                      </button>
                      <button
                        className="btn-icon danger"
                        title="从列表移除"
                        onClick={e => handleRemove(e, item.filePath)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="list-footer-hint">
        <p>💡 点击列表直接打开文件；接收对方病例可使用「📥 导入交接包」。数据保存在本地 JSON 文件中，便于离线传递。</p>
      </div>
    </div>
  )
}
