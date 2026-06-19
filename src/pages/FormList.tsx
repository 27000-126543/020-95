import { useState, useEffect, useMemo } from 'react'
import type { FormHistoryItem, OcclusionFormData, CaseStatus, TransferPackage } from '@/types/form'
import { getHistory, removeHistoryItem, clearHistory, saveHistory } from '@/utils/historyStore'
import { formatDateTime } from '@/utils/formUtils'
import { determineCaseStatus, CASE_STATUS_META } from '@/utils/stepValidator'
import { migrateFormData } from '@/utils/formUtils'

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
    const result = await window.electronAPI.loadFormByPath(row.item.filePath)
    if (result.success && result.data && result.filePath) {
      const data = migrateFormData(result.data as OcclusionFormData)
      const status = determineCaseStatus(data)
      // 更新此条目的状态字段
      const updatedHistory = getHistory().map(h =>
        h.filePath === result.filePath ? { ...h, status, lastUpdatedAt: new Date().toISOString() } : h
      )
      saveHistory(updatedHistory)
      setRows(updatedHistory.map(item => ({ item, status: (item.status || 'awaiting_receipt') as CaseStatus })))
      onSelectForm(data, result.filePath, targetViewHint)
    } else {
      showToast(`文件读取失败：${result.error || '路径已失效'}`)
      // 尝试自动刷新失效条目的状态
      setRows(prev => prev.map(r => r.item.filePath === row.item.filePath ? { ...r, invalidPath: true } : r))
    }
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
    if (pkg && pkg.packageType === 'occlusion-transfer' && pkg.formData) {
      formData = migrateFormData({
        ...pkg.formData,
        transferSource: {
          type: pkg.source?.type,
          name: pkg.source?.name,
          contact: pkg.source?.contact,
          exportedAt: pkg.exportedAt,
          importedAt,
          importSourcePath: result.filePath,
          caseStatusHint: pkg.caseStatus,
          latestNotes: pkg.latestNotes
        },
        notes: pkg.latestNotes
          ? (pkg.formData.notes ? `${pkg.formData.notes}\n\n[${importedAt.slice(0, 10)} 交接备注] ${pkg.latestNotes}` : `[${importedAt.slice(0, 10)} 交接备注] ${pkg.latestNotes}`)
          : pkg.formData.notes
      })
    } else if (pkg && ((pkg as unknown as OcclusionFormData).patientCode) !== undefined) {
      formData = migrateFormData(pkg as unknown as OcclusionFormData)
    } else {
      showToast('未识别为有效的咬合交接单文件')
      return
    }
    showToast('✅ 已导入交接包，首次保存时请选择本地存放路径')
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
                return (
                  <tr
                    key={item.filePath}
                    className={`history-row ${r.invalidPath ? 'list-row-highlight' : ''}`}
                    style={{
                      ['--kb-color' as string]: r.invalidPath ? 'var(--color-danger)' : statusMeta.color
                    } as React.CSSProperties}
                    onClick={() => loadFromHistory(r, hintForStatus(r.status))}
                  >
                    <td>
                      <span className="patient-code">{item.patientCode || '-'}</span>
                    </td>
                    <td>{item.restorationType || '-'}</td>
                    <td>{item.dentistName || '-'}</td>
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
