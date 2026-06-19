import { useState, useCallback } from 'react'
import { FillForm } from '@/pages/FillForm'
import { PreviewForm } from '@/pages/PreviewForm'
import { ReceiptForm } from '@/pages/ReceiptForm'
import { useFormStore } from '@/hooks/useFormStore'
import type { OcclusionFormData } from '@/types/form'

type View = 'fill' | 'preview' | 'receipt'

export default function App() {
  const [currentView, setCurrentView] = useState<View>('fill')
  const store = useFormStore()
  const { formData, loadForm, loadedFilePath, isDirty, resetForm, addReceipt } = store

  const handleOpenFile = useCallback(async () => {
    if (isDirty) {
      const confirm = window.confirm('当前表单有未保存的更改，确定要打开新文件吗？')
      if (!confirm) return
    }

    const result = await window.electronAPI.loadForm()
    if (result.success && result.data) {
      loadForm(result.data as OcclusionFormData, result.filePath!)
      if ((result.data as OcclusionFormData).receipt) {
        setCurrentView('preview')
      } else {
        setCurrentView('fill')
      }
    }
  }, [isDirty, loadForm])

  const handleNewForm = useCallback(() => {
    if (isDirty) {
      const confirm = window.confirm('当前表单有未保存的更改，确定要新建吗？')
      if (!confirm) return
    }
    resetForm()
    setCurrentView('fill')
  }, [isDirty, resetForm])

  const handleGoToFill = useCallback(() => setCurrentView('fill'), [])
  const handleGoToPreview = useCallback(() => setCurrentView('preview'), [])
  const handleGoToReceipt = useCallback(() => {
    addReceipt()
    setCurrentView('receipt')
  }, [addReceipt])

  const getViewLabel = (view: View) => {
    switch (view) {
      case 'fill': return '填写交接单'
      case 'preview': return '预览'
      case 'receipt': return '技工回执'
    }
  }

  return (
    <div className="app-container">
      <nav className="app-nav">
        <div className="nav-brand">
          <div className="brand-icon">🦷</div>
          <div className="brand-text">
            <h1>咬合交接单</h1>
            <p>口腔修复专业协作工具</p>
          </div>
        </div>

        <div className="nav-actions">
          <button className="nav-btn" onClick={handleNewForm}>
            <span className="nav-icon">📄</span>
            新建
          </button>
          <button className="nav-btn" onClick={handleOpenFile}>
            <span className="nav-icon">📂</span>
            打开文件
          </button>
        </div>

        <div className="nav-tabs">
          <button
            className={`tab-btn ${currentView === 'fill' ? 'active' : ''}`}
            onClick={handleGoToFill}
          >
            <span className="tab-icon">✏️</span>
            填写
          </button>
          <button
            className={`tab-btn ${currentView === 'preview' ? 'active' : ''}`}
            onClick={handleGoToPreview}
          >
            <span className="tab-icon">👁️</span>
            预览
          </button>
          <button
            className={`tab-btn ${currentView === 'receipt' ? 'active' : ''}`}
            onClick={handleGoToReceipt}
            disabled={!formData.patientCode}
            title={!formData.patientCode ? '请先填写患者信息' : ''}
          >
            <span className="tab-icon">📋</span>
            回执
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
        {currentView === 'fill' && (
          <FillForm store={store} onPreview={handleGoToPreview} />
        )}
        {currentView === 'preview' && (
          <PreviewForm
            store={store}
            onBack={formData.receipt ? handleGoToReceipt : handleGoToFill}
            onFillReceipt={handleGoToReceipt}
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
          咬合交接单工具 v1.0.0 | 离线可用
        </div>
      </footer>
    </div>
  )
}
