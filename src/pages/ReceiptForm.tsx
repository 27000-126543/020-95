import { useState, type ChangeEvent } from 'react'
import { FormSection } from '@/components/FormSection'
import { InputField, TextareaField, CheckboxGroup, RadioGroup, FormField } from '@/components/FormField'
import type { TechnicianIssue, TechnicianReceipt } from '@/types/form'
import { TECHNICIAN_ISSUES, MODEL_CONDITION_OPTIONS } from '@/constants/options'
import { validateReceipt, formatDate } from '@/utils/formUtils'
import type { FormStore } from '@/hooks/useFormStore'

interface ReceiptFormProps {
  store: FormStore
  onBack: () => void
  onPreview: () => void
}

export function ReceiptForm({ store, onBack, onPreview }: ReceiptFormProps) {
  const { formData, updateReceipt, loadedFilePath, clearReceipt } = store
  const receipt = formData.receipt!
  const [errors, setErrors] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

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
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
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
            患者：{formData.patientCode} | 修复类型：{formData.restorationType} | 诊所：{formData.clinicName}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-danger" onClick={handleDeleteReceipt}>
            删除回执
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            返回
          </button>
          <button className="btn btn-secondary" onClick={onPreview}>
            预览完整文档
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存回执
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="alert alert-success">
          ✓ 回执保存成功！
        </div>
      )}

      {errors.length > 0 && (
        <div className="alert alert-error">
          <h4>请修正以下问题：</h4>
          <ul>
            {errors.map((err: string, idx: number) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="receipt-summary">
        <div className="summary-card">
          <h3>送检信息概览</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">患者代号：</span>
              <span className="summary-value">{formData.patientCode}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">修复类型：</span>
              <span className="summary-value">{formData.restorationType}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">主治医生：</span>
              <span className="summary-value">{formData.dentistName}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">送检日期：</span>
              <span className="summary-value">{formatDate(formData.fillDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="form-body">
        <FormSection title="回执基本信息" required>
          <div className="form-grid">
            <InputField
              label="技工所名称"
              required
              value={receipt.labName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ labName: e.target.value })}
              placeholder="技工所名称"
            />
            <InputField
              label="技师姓名"
              required
              value={receipt.technicianName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ technicianName: e.target.value })}
              placeholder="负责技师姓名"
            />
            <InputField
              label="收到日期"
              required
              type="date"
              value={receipt.receivedDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ receivedDate: e.target.value })}
            />
            <InputField
              label="预计完成日期"
              type="date"
              value={receipt.estimatedCompletionDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ estimatedCompletionDate: e.target.value })}
            />
          </div>
        </FormSection>

        <FormSection title="模型检查">
          <div className="form-grid">
            <RadioGroup
              label="模型整体状况"
              value={receipt.modelCondition}
              onChange={(value: string) => updateReceiptData({ modelCondition: value as TechnicianReceipt['modelCondition'] })}
              options={MODEL_CONDITION_OPTIONS}
            />
            <TextareaField
              label="模型检查备注"
              value={receipt.specialInstructions}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateReceiptData({ specialInstructions: e.target.value })}
              placeholder="模型质量、完整性等其他说明..."
              rows={3}
            />
          </div>
        </FormSection>

        <FormSection
          title="发现问题"
          subtitle="请勾选模型或咬合记录中发现的问题，必要时联系医生确认"
        >
          <div className="form-grid">
            <CheckboxGroup
              label="常见问题（可多选）"
              options={TECHNICIAN_ISSUES}
              selected={receipt.issues.selected as string[]}
              onChange={(selected: string[]) => updateReceiptSection('issues', { selected: selected as TechnicianIssue[] })}
            />
            <TextareaField
              label="问题详情说明"
              value={receipt.issues.details}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateReceiptSection('issues', { details: e.target.value })}
              placeholder="详细描述发现的问题，包括位置、程度等..."
              rows={4}
            />
          </div>
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
                label="返诊原因"
                required
                value={receipt.returnVisitReason}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateReceiptData({ returnVisitReason: e.target.value })}
                placeholder="请详细说明需要返诊的原因和建议..."
                rows={4}
                helpText="此信息将直接反馈给临床医生，请清晰说明问题和建议的解决方案"
              />
            )}
          </div>
        </FormSection>

        <FormSection title="签名确认">
          <div className="form-grid">
            <InputField
              label="技师签名"
              value={receipt.technicianSignature}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateReceiptData({ technicianSignature: e.target.value })}
              placeholder="请输入技师姓名作为签名"
            />
          </div>
        </FormSection>
      </div>

      <div className="form-footer">
        <button className="btn btn-secondary" onClick={onBack}>
          返回
        </button>
        <div className="footer-actions">
          <button className="btn btn-secondary" onClick={onPreview}>
            预览完整文档
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存并导出回执
          </button>
        </div>
      </div>
    </div>
  )
}
