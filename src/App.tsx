import { useState, useCallback, useRef, useEffect } from 'react'
import { FillForm } from '@/pages/FillForm'
import { PreviewForm } from '@/pages/PreviewForm'
import { ReceiptForm } from '@/pages/ReceiptForm'
import { FormList } from '@/pages/FormList'
import { useFormStore } from '@/hooks/useFormStore'
import type { OcclusionFormData, View, CaseStatus } from '@/types/form'
import { upsertHistory } from '@/utils/historyStore'
import { migrateFormData } from '@/utils/formUtils'

export default function App() {
  const [currentView, setCurrentView] = useState<View>('list')
  const store = useFormStore()
  const { formData, loadForm, loadedFilePath, isDirty, resetForm, addReceipt, setLoadedFilePath } = store
  const previewFocusSummaryRef = useRef(false)
  const receiptEntryRef = useRef(false)
  const [appToast, setAppToast] = useState<string | null>(null)

  useEffect(() => {
    if (!appToast) return
    const t = window.setTimeout(() => setAppToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [appToast])

  const promptIfDirty = async () => {
    if (isDirty) {
      return window.confirm('当前表单有未保存的更改，继续将丢失更改，确定吗？')
    }
    return true
  }

  const handleOpenFile = useCallback(async () => {
    if (!await promptIfDirty()) return
    const result = await window.electronAPI.loadForm()
    if (result.success && result.data && result.filePath) {
      const normalized = migrateFormData(result.data as OcclusionFormData)
      loadForm(normalized, result.filePath)
      upsertHistory(result.filePath, normalized)
      receiptEntryRef.current = !normalized.receipt
      setCurrentView(normalized.receipt ? 'preview' : 'fill')
      setAppToast(`✅ 已载入：${result.filePath}`)
    }
  }, [isDirty, loadForm])

  const handleNewForm = useCallback(async () => {
    if (!await promptIfDirty()) return
    resetForm()
    receiptEntryRef.current = false
    previewFocusSummaryRef.current = false
    setCurrentView('fill')
  }, [isDirty, resetForm])

  const handleSelectFromList = useCallback((data: OcclusionFormData, filePath: string, targetViewHint?: string) => {
    loadForm(data, filePath)
    upsertHistory(filePath, data)
    if (targetViewHint === 'fill') {
      setCurrentView('fill')
    } else if (targetViewHint === 'receipt-entry') {
      receiptEntryRef.current = true
      if (!data.receipt) addReceipt()
      setCurrentView('receipt')
    } else if (targetViewHint === 'preview-summary') {
      previewFocusSummaryRef.current = true
      setCurrentView('preview')
    } else {
      receiptEntryRef.current = !data.receipt
      setCurrentView(data.receipt ? 'preview' : 'fill')
    }
  }, [loadForm, addReceipt])

  const handleImportedForm = useCallback(async (data: OcclusionFormData, caseStatusHint?: string) => {
    if (!await promptIfDirty()) return
    loadForm(data, '')
    setLoadedFilePath('')
    receiptEntryRef.current = caseStatusHint === 'awaiting_receipt'
    if (caseStatusHint === 'doctor_action') {
      previewFocusSummaryRef.current = true
      setCurrentView('preview')
    } else if (caseStatusHint === 'awaiting_receipt') {
      addReceipt()
      setCurrentView('receipt')
    } else if (caseStatusHint === 'doctor_incomplete') {
      setCurrentView('fill')
    } else {
      setCurrentView(data.receipt ? 'preview' : 'fill')
    }
    setAppToast('📥 交接包导入成功，请点击顶部「保存文件」选择本地存放路径')
  }, [isDirty, loadForm, setLoadedFilePath, addReceipt])

  const handleGoToList = useCallback(async () => {
    if (!await promptIfDirty()) return
    previewFocusSummaryRef.current = false
    receiptEntryRef.current = false
    setCurrentView('list')
  }, [isDirty])

  const handleGoToFill = useCallback(() => {
    previewFocusSummaryRef.current = false
    setCurrentView('fill')
  }, [])

  const handleGoToPreview = useCallback(() => {
    previewFocusSummaryRef.current = false
    setCurrentView('preview')
  }, [])

  const handleGoToReceipt = useCallback(() => {
    previewFocusSummaryRef.current = false
    addReceipt()
    receiptEntryRef.current = true
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

  const consumeReceiptEntryRef = () => {
    const v = receiptEntryRef.current
    receiptEntryRef.current = false
    return v
  }
  const consumePreviewFocusRef = () => {
    const v = previewFocusSummaryRef.current
    previewFocusSummaryRef.current = false
    return v
  }

  return (
    <div className="app-container">
      {appToast && <div className="toast">{appToast}</div>}
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
          {!loadedFilePath && formData.patientCode && (
            <div className="file-info" style={{ opacity: 0.75 }}>
              <p className="file-label">未保存的病例</p>
              <p className="file-path">{formData.patientCode} · 请点击「保存文件」存入本地</p>
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
            onImportedForm={handleImportedForm}
          />
        )}
        {currentView === 'fill' && (
          <FillForm store={store} onPreview={handleGoToPreview} onBackToList={handleGoToList}
            focusReceipt={consumeReceiptEntryRef()}
          />
        )}
        {currentView === 'preview' && (
          <PreviewForm
            store={store}
            onBack={formData.receipt ? handleGoToReceipt : handleGoToFill}
            onFillReceipt={handleGoToReceipt}
            onBackToList={handleGoToList}
            focusSummary={consumePreviewFocusRef()}
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
          咬合交接单工具 v1.2.0 | 离线可用 · 支持交接包
        </div>
      </footer>
    </div>
  )
}

// 引用 CaseStatus 类型以保持类型文件在 tsc 下不被 treeshake 警告
export type { CaseStatus }
