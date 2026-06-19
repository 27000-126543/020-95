import { useState, useCallback } from 'react'
import { FillForm } from '@/pages/FillForm'
import { PreviewForm } from '@/pages/PreviewForm'
import { ReceiptForm } from '@/pages/ReceiptForm'
import { FormList } from '@/pages/FormList'
import { useFormStore } from '@/hooks/useFormStore'
import type { OcclusionFormData, View } from '@/types/form'

export default function App() {
  const [currentView, setCurrentView] = useState<View>('list')
  const store = useFormStore()
  const { formData, loadForm, loadedFilePath, isDirty, resetForm, addReceipt } = store

  const handleOpenFile = useCallback(async () => {
    if (isDirty) {
      const ok = window.confirm('当前表单有未保存的更改，确定要打开新文件吗？')
      if (!ok) return
    }

    const result = await window.electronAPI.loadForm()
    if (result.success && result.data && result.filePath) {
      loadForm(result.data as OcclusionFormData, result.filePath)
      if ((result.data as OcclusionFormData).receipt) {
        setCurrentView('preview')
      } else {
        setCurrentView('fill')
      }
    }
  }, [isDirty, loadForm])

  const handleNewForm = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('当前表单有未保存的更改，确定要新建吗？')
      if (!ok) return
    }
    resetForm()
    setCurrentView('fill')
  }, [isDirty, resetForm])

  const handleSelectFromList = useCallback((data: OcclusionFormData, filePath: string) => {
    loadForm(data, filePath)
    if (data.receipt) {
      setCurrentView('preview')
    } else {
      setCurrentView('fill')
    }
  }, [loadForm])

  const handleGoToList = useCallback(() => setCurrentView('list'), [])
  const handleGoToFill = useCallback(() => setCurrentView('fill'), [])
  const handleGoToPreview = useCallback(() => setCurrentView('preview'), [])
  const handleGoToReceipt = useCallback(() => {
    addReceipt()
    setCurrentView('receipt')
  }, [addReceipt])

  const getViewLabel = (view: View) => {
    switch (view) {
      case 'list': return '工作台'
      case 'fill': return '填写交接单'
      case 'preview': return '预览'
      case 'receipt': return '技工回执'
    }
  }

  const canAccessFill = currentView !== 'list'
  const canAccessReceipt = !!formData.patientCode && currentView !== 'list'

  return (
    <div className="app-container">
      <nav className="app-nav">
        <div className="nav-brand" onClick={handleGoToList} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">🦷</div>
          <div className="brand-text">
            <h1>咬合交接单</h1>
            <p>口腔修复专业协作工具</p>
          </div>
        </div>

        <div className="nav-actions">
          <button className="nav-btn" onClick={handleNewForm}>
            <span className="nav-icon">📄</span>新建
          </button>
          <button className="nav-btn" onClick={handleOpenFile}>
            <span className="nav-icon">📂</span>打开文件
          </button>
        </div>

        <div className="nav-tabs">
          <button
            className={`tab-btn ${currentView === 'list' ? 'active' : ''}`}
            onClick={handleGoToList}
          >
            <span className="tab-icon">🏠</span>工作台
          </button>
          <button
            className={`tab-btn ${currentView === 'fill' ? 'active' : ''}`}
            onClick={handleGoToFill}
            disabled={!canAccessFill && !formData.patientCode}
          >
            <span className="tab-icon">✏️</span>填写
          </button>
          <button
            className={`tab-btn ${currentView === 'preview' ? 'active' : ''}`}
            onClick={handleGoToPreview}
            disabled={!canAccessFill && !formData.patientCode}
          >
            <span className="tab-icon">👁️</span>预览
          </button>
          <button
            className={`tab-btn ${currentView === 'receipt' ? 'active' : ''}`}
            onClick={handleGoToReceipt}
            disabled={!canAccessReceipt}
            title={!canAccessReceipt ? '请先填写患者信息' : ''}
          >
            <span className="tab-icon">📋</span>回执
          </button>
        </div>

        <div className="nav-footer">
          {loadedFilePath && (
            <div className="file-info">
              <p className="file-label">当前文件</p>
              <p className="file-path" title={loadedFilePath}>{loadedFilePath}</p>
            </div>
          )}
          {isDirty && (
            <div className="dirty-indicator">
              <span className="dot"></span>
              有未保存更改
            </div>
          )}
        </div>
      </nav>

      <main className="app-main">
        {currentView === 'list' && (
          <FormList
            onNewForm={handleNewForm}
            onOpenForm={handleOpenFile}
            onSelectForm={handleSelectFromList}
          />
        )}
        {currentView === 'fill' && (
          <FillForm store={store} onPreview={handleGoToPreview} onBackToList={handleGoToList} />
        )}
        {currentView === 'preview' && (
          <PreviewForm
            store={store}
            onBack={formData.receipt ? handleGoToReceipt : handleGoToFill}
            onFillReceipt={handleGoToReceipt}
            onBackToList={handleGoToList}
          />
        )}
        {currentView === 'receipt' && (
          <ReceiptForm
            store={store}
            onBack={handleGoToPreview}
            onPreview={handleGoToPreview}
          />
        )}
      </main>

      <footer className="app-footer no-print">
        <div className="footer-info">
          <span>当前视图：{getViewLabel(currentView)}</span>
          {formData.patientCode && (
            <span className="footer-patient">患者：{formData.patientCode}</span>
          )}
        </div>
        <div className="footer-version">
          咬合交接单工具 v1.1.0 | 离线可用
        </div>
      </footer>
    </div>
  )
}
