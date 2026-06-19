import { useState, useEffect } from 'react'
import type { FormHistoryItem, OcclusionFormData } from '@/types/form'
import { getHistory, removeHistoryItem, clearHistory } from '@/utils/historyStore'
import { formatDateTime } from '@/utils/formUtils'

interface FormListProps {
  onNewForm: () => void
  onOpenForm: () => void
  onSelectForm: (data: OcclusionFormData, filePath: string) => void
}

export function FormList({ onNewForm, onOpenForm, onSelectForm }: FormListProps) {
  const [history, setHistory] = useState<FormHistoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterReceipt, setFilterReceipt] = useState<'all' | 'with' | 'without'>('all')

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const loadFromHistory = async (_item: FormHistoryItem) => {
    const result = await window.electronAPI.loadForm()
    if (result.success && result.data && result.filePath) {
      onSelectForm(result.data as OcclusionFormData, result.filePath)
    }
  }

  const handleRemove = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation()
    if (confirm('确定要从列表中移除这条记录吗？（不会删除实际文件）')) {
      setHistory(removeHistoryItem(filePath))
    }
  }

  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？（不会删除实际文件）')) {
      clearHistory()
      setHistory([])
    }
  }

  const filteredHistory = history.filter(item => {
    const matchSearch = item.patientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.restorationType.includes(searchTerm) ||
      (item.dentistName || '').includes(searchTerm)
    const matchReceipt = filterReceipt === 'all'
      ? true
      : filterReceipt === 'with' ? item.hasReceipt : !item.hasReceipt
    return matchSearch && matchReceipt
  })

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    const map: Record<string, string> = {
      '常规': 'badge-gray',
      '加急': 'badge-orange',
      '特急': 'badge-red'
    }
    return <span className={`badge ${map[priority] || 'badge-gray'}`}>{priority}</span>
  }

  return (
    <div className="form-list">
      <div className="list-header">
        <div className="header-content">
          <h1 className="form-title">🦷 咬合交接单工作台</h1>
          <p className="form-subtitle">快速访问最近的交接单，或创建新的咬合记录</p>
        </div>
        <div className="header-actions">
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
          <span className="stat-value">{history.filter(h => h.hasReceipt).length}</span>
          <span className="stat-label">已回执</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{history.filter(h => !h.hasReceipt).length}</span>
          <span className="stat-label">待回执</span>
        </div>
      </div>

      <div className="list-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            className="text-input search-input"
            placeholder="🔍 搜索患者代号、修复类型、医生姓名..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select
            className="select-input filter-select"
            value={filterReceipt}
            onChange={e => setFilterReceipt(e.target.value as 'all' | 'with' | 'without')}
          >
            <option value="all">全部状态</option>
            <option value="with">已有回执</option>
            <option value="without">待回执</option>
          </select>
        </div>
        {history.length > 0 && (
          <button className="btn-link danger" onClick={handleClearAll}>
            清空历史
          </button>
        )}
      </div>

      {filteredHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>{history.length === 0 ? '还没有交接单记录' : '没有匹配的记录'}</h3>
          <p>{history.length === 0
            ? '新建一份咬合交接单，开始高效协作'
            : '尝试调整搜索条件或筛选状态'}
          </p>
          {history.length === 0 && (
            <button className="btn btn-primary" onClick={onNewForm}>
              ➕ 创建第一份交接单
            </button>
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
                <th>状态</th>
                <th>最后更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(item => (
                <tr key={item.filePath} className="history-row" onClick={() => loadFromHistory(item)}>
                  <td>
                    <span className="patient-code">{item.patientCode || '-'}</span>
                  </td>
                  <td>{item.restorationType || '-'}</td>
                  <td>{item.dentistName || '-'}</td>
                  <td>{getPriorityBadge(item.priority)}</td>
                  <td>
                    {item.hasReceipt
                      ? <span className="badge badge-green">✓ 已回执</span>
                      : <span className="badge badge-orange">⏳ 待回执</span>
                    }
                  </td>
                  <td className="date-cell">{formatDateTime(item.lastUpdatedAt)}</td>
                  <td className="action-cell">
                    <button
                      className="btn-icon"
                      title="打开"
                      onClick={() => loadFromHistory(item)}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="list-footer-hint">
        <p>💡 提示：数据保存在本地 JSON 文件中，可随时通过文件在诊所和技工所之间传输</p>
      </div>
    </div>
  )
}
