import { useState, useMemo, type ChangeEvent } from 'react'
import { FormSection } from '@/components/FormSection'
import { InputField, TextareaField, FormField } from '@/components/FormField'
import type { TechnicianIssue, IssueSeverity, IssueWithSeverity, TechnicianReceipt } from '@/types/form'
import { TECHNICIAN_ISSUES, MODEL_CONDITION_OPTIONS } from '@/constants/options'
import { ISSUE_SEVERITY_MAP } from '@/constants/steps'
import { validateReceipt, formatDate } from '@/utils/formUtils'
import { upsertHistory } from '@/utils/historyStore'
import type { FormStore } from '@/hooks/useFormStore'

interface ReceiptFormProps {
  store: FormStore
  onBack: () => void
  onPreview: () => void
}

export function ReceiptForm({ store, onBack, onPreview }: ReceiptFormProps) {
  const { formData, updateReceipt, loadedFilePath, clearReceipt, markSaved } = store
  const receipt = formData.receipt!
  const [errors, setErrors] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState<string>('')

  const selectedIssues = useMemo(() => receipt.issues.selected || [], [receipt.issues.selected])

  const countsBySeverity = useMemo(() => {
    const counts = { minor: 0, confirm: 0, revisit: 0 }
    selectedIssues.forEach((item: IssueWithSeverity) => {
      counts[item.severity]++
    })
    return counts
  }, [selectedIssues])

  const updateReceiptData = (updates: Partial<TechnicianReceipt>) => {
    updateReceipt({ ...receipt, ...updates })
  }

  const updateReceiptSection = <K extends keyof TechnicianReceipt>(
    section: K,
    updates: Partial<TechnicianReceipt[K]>
  ) => {
    updateReceipt({
      ...receipt,
      [section]: { ...(receipt[section] as Record<string, unknown>), ...updates }
    })
  }

  const toggleIssue = (issue: TechnicianIssue) => {
    const existing = selectedIssues.find((i: IssueWithSeverity) => i.issue === issue)
    let next: IssueWithSeverity[]
    if (existing) {
      next = selectedIssues.filter((i: IssueWithSeverity) => i.issue !== issue)
    } else {
      next = [...selectedIssues, { issue, severity: 'confirm' }]
    }
    updateReceiptSection('issues', { selected: next })
    if (next.some((i: IssueWithSeverity) => i.severity === 'revisit')) {
      updateReceiptData({ requiresReturnVisit: true })
    } else if (next.length === 0) {
      updateReceiptData({ requiresReturnVisit: false })
    }
  }

  const setIssueSeverity = (issue: TechnicianIssue, severity: IssueSeverity) => {
    const next = selectedIssues.map((i: IssueWithSeverity) =>
      i.issue === issue ? { ...i, severity } : i
    )
    updateReceiptSection('issues', { selected: next })
    if (severity === 'revisit') {
      updateReceiptData({ requiresReturnVisit: true })
    }
  }

  const handleSave = async () => {
    const validation = validateReceipt(receipt)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setErrors([])

    const fullData = {
      ...formData,
      receipt
    }

    const result = await window.electronAPI.saveReceipt(fullData, loadedFilePath || undefined)
    if (result.success && result.filePath) {
      markSaved(result.filePath)
      upsertHistory(result.filePath, fullData)
      setShowSuccess(`✓ 回执已保存：${result.filePath}`)
      setTimeout(() => setShowSuccess(''), 4000)
    }
  }

  const handleDeleteReceipt = () => {
    if (confirm('确定要删除当前回执吗？此操作不可撤销。')) {
      clearReceipt()
      onBack()
    }
  }

  return (
    <div className="receipt-form">
      <div className="form-header">
        <div className="header-content">
          <h1 className="form-title">技工回执</h1>
          <p className="form-subtitle">
            患者：<strong>{formData.patientCode || '-'}</strong> &nbsp;|&nbsp;
            修复类型：<strong>{formData.restorationType || '-'}</strong> &nbsp;|&nbsp;
            诊所：<strong>{formData.clinicName || '-'}</strong>
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-danger" onClick={handleDeleteReceipt}>删除回执</button>
          <button className="btn btn-secondary" onClick={onBack}>返回</button>
          <button className="btn btn-secondary" onClick={onPreview}>预览完整文档</button>
          <button className="btn btn-primary" onClick={handleSave}>保存回执</button>
        </div>
      </div>

      {showSuccess && (
        <div className="alert alert-success">{showSuccess}</div>
      )}

      {errors.length > 0 && (
        <div className="alert alert-error">
          <h4>请修正以下问题：</h4>
          <ul>
            {errors.map((err: string, idx: number) => <li key={idx}>{err}</li>)}
          </ul>
        </div>
      )}

      <div className="receipt-summary">
        <div className="summary-card">
          <h3>送检信息概览</h3>
          <div className="summary-grid">
            <div className="summary-item"><span className="summary-label">患者代号：</span><span className="summary-value">{formData.patientCode || '-'}</span></div>
            <div className="summary-item"><span className="summary-label">修复类型：</span><span className="summary-value">{formData.restorationType || '-'}</span></div>
            <div className="summary-item"><span className="summary-label">主治医生：</span><span className="summary-value">{formData.dentistName || '-'}</span></div>
            <div className="summary-item"><span className="summary-label">送检日期：</span><span className="summary-value">{formatDate(formData.fillDate)}</span></div>
          </div>
        </div>

        <div className="severity-summary">
          <h4>问题分级统计</h4>
          <div className="severity-stats">
            {(['revisit', 'confirm', 'minor'] as IssueSeverity[]).map(sev => {
              const info = ISSUE_SEVERITY_MAP[sev]
              return (
                <div key={sev} className={`severity-stat ${sev}`}>
                  <span className="severity-count">{countsBySeverity[sev]}</span>
                  <span className={`badge ${info.badge}`}>{info.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="form-body">
        <FormSection title="回执基本信息" required>
          <div className="form-grid">
            <InputField
              label="技工所名称" required
              value={receipt.labName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ labName: e.target.value })}
            />
            <InputField
              label="技师姓名" required
              value={receipt.technicianName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ technicianName: e.target.value })}
            />
            <InputField
              label="收到日期" required type="date"
              value={receipt.receivedDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ receivedDate: e.target.value })}
            />
            <InputField
              label="预计完成日期" type="date"
              value={receipt.estimatedCompletionDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ estimatedCompletionDate: e.target.value })}
            />
          </div>
        </FormSection>

        <FormSection title="模型整体状况">
          <div className="form-grid">
            <div className="form-field">
              <label className="field-label">状况评估</label>
              <div className="radio-group">
                {MODEL_CONDITION_OPTIONS.map(opt => (
                  <label key={opt.value} className="radio-item">
                    <input
                      type="radio"
                      checked={receipt.modelCondition === opt.value}
                      onChange={() => updateReceiptData({ modelCondition: opt.value as TechnicianReceipt['modelCondition'] })}
                      className="radio-input"
                    />
                    <span className="radio-label">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="发现问题（分级）"
          subtitle="勾选存在的问题，并为每一项标注严重程度。严重等级将在预览中汇总展示给医生。"
        >
          <div className="severity-legend">
            {(['minor', 'confirm', 'revisit'] as IssueSeverity[]).map(sev => {
              const info = ISSUE_SEVERITY_MAP[sev]
              return (
                <div key={sev} className="severity-legend-item">
                  <span className={`badge ${info.badge}`}>{info.label}</span>
                  <span className="severity-desc">{info.description}</span>
                </div>
              )
            })}
          </div>

          <div className="issue-grid">
            {TECHNICIAN_ISSUES.map(opt => {
              const selected = selectedIssues.find((i: IssueWithSeverity) => i.issue === opt.value)
              return (
                <div key={opt.value} className={`issue-card ${selected ? 'selected' : ''}`}>
                  <label className="issue-check">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={!!selected}
                      onChange={() => toggleIssue(opt.value)}
                    />
                    <span className="issue-title">{opt.label}</span>
                  </label>
                  {selected && (
                    <div className="issue-severity">
                      {(['minor', 'confirm', 'revisit'] as IssueSeverity[]).map(sev => {
                        const info = ISSUE_SEVERITY_MAP[sev]
                        return (
                          <label key={sev} className="severity-pick">
                            <input
                              type="radio"
                              name={`sev-${opt.value}`}
                              className="radio-input"
                              checked={selected.severity === sev}
                              onChange={() => setIssueSeverity(opt.value, sev)}
                            />
                            <span className={`badge ${info.badge}`}>{info.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <TextareaField
            label="问题详情说明"
            value={receipt.issues.details}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateReceiptSection('issues', { details: e.target.value })}
            placeholder="详细描述发现的问题，包括位置、程度等..."
            rows={4}
          />
        </FormSection>

        <FormSection
          title="是否需要返诊"
          subtitle="如存在影响修复质量的问题，请标记并说明原因"
        >
          <div className="form-grid">
            <FormField label="处理方式">
              <div className="radio-group inline">
                <label className="radio-item">
                  <input
                    type="radio"
                    checked={!receipt.requiresReturnVisit}
                    onChange={() => updateReceiptData({ requiresReturnVisit: false })}
                    className="radio-input"
                  />
                  <span className="radio-label">正常制作，无需返诊</span>
                </label>
                <label className="radio-item warning">
                  <input
                    type="radio"
                    checked={receipt.requiresReturnVisit}
                    onChange={() => updateReceiptData({ requiresReturnVisit: true })}
                    className="radio-input"
                  />
                  <span className="radio-label">需要返诊重取记录</span>
                </label>
              </div>
            </FormField>

            {receipt.requiresReturnVisit && (
              <TextareaField
                label="返诊原因" required
                value={receipt.returnVisitReason}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateReceiptData({ returnVisitReason: e.target.value })}
                placeholder="请详细说明需要返诊的原因和建议..."
                rows={4}
                helpText="此信息将在预览中醒目展示给医生"
              />
            )}

            <TextareaField
              label="特别说明"
              value={receipt.specialInstructions}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateReceiptData({ specialInstructions: e.target.value })}
              placeholder="其他需要告知医生的事项..."
              rows={3}
            />
          </div>
        </FormSection>

        <FormSection title="签名确认">
          <div className="form-grid">
            <InputField
              label="技师签名"
              value={receipt.technicianSignature}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ technicianSignature: e.target.value })}
            />
          </div>
        </FormSection>
      </div>

      <div className="form-footer">
        <button className="btn btn-secondary" onClick={onBack}>返回</button>
        <div className="footer-actions">
          <button className="btn btn-secondary" onClick={onPreview}>预览完整文档</button>
          <button className="btn btn-primary" onClick={handleSave}>保存并导出回执</button>
        </div>
      </div>
    </div>
  )
}
