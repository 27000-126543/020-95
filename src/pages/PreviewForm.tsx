import { useState } from 'react'
import type { OcclusionFormData, MovementObservation, SpecialConcern, TechnicianIssue } from '@/types/form'
import { formatDate, formatDateTime, validateForm } from '@/utils/formUtils'
import type { FormStore } from '@/hooks/useFormStore'

interface PreviewFormProps {
  store: FormStore
  onBack: () => void
  onFillReceipt: () => void
}

export function PreviewForm({ store, onBack, onFillReceipt }: PreviewFormProps) {
  const { formData, loadedFilePath, addReceipt } = store
  const [showSuccess, setShowSuccess] = useState(false)

  const handlePrint = async () => {
    await window.electronAPI.printForm()
  }

  const handleSave = async () => {
    const validation = validateForm(formData)
    if (!validation.valid) {
      alert('请先完善必填项：\n' + validation.errors.join('\n'))
      return
    }

    const result = await window.electronAPI.saveForm(formData)
    if (result.success && result.filePath) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleFillReceipt = () => {
    addReceipt()
    onFillReceipt()
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      '常规': 'badge-gray',
      '加急': 'badge-orange',
      '特急': 'badge-red'
    }
    return colors[priority] || 'badge-gray'
  }

  const hasReceipt = !!formData.receipt

  return (
    <div className="preview-form" id="print-content">
      <div className="form-header no-print">
        <div className="header-content">
          <h1 className="form-title">交接单预览</h1>
          <p className="form-subtitle">
            {loadedFilePath ? `文件路径: ${loadedFilePath}` : '请核对信息无误后保存或打印'}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            返回编辑
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            打印
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存文件
          </button>
          {!hasReceipt && (
            <button className="btn btn-accent" onClick={handleFillReceipt}>
              填写技工回执
            </button>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="alert alert-success no-print">
          ✓ 文件保存成功！
        </div>
      )}

      <div className="preview-content">
        <div className="preview-header print-only">
          <h1 className="document-title">口腔修复咬合交接单</h1>
          <p className="document-subtitle">Dental Occlusion Registration Form</p>
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">基本信息</h2>
          <div className="preview-grid">
            <div className="preview-item">
              <span className="preview-label">患者代号：</span>
              <span className="preview-value">{formData.patientCode || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">性别：</span>
              <span className="preview-value">{formData.patientGender || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">年龄：</span>
              <span className="preview-value">{formData.patientAge || '-'} 岁</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">修复类型：</span>
              <span className="preview-value">{formData.restorationType || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">主治医生：</span>
              <span className="preview-value">{formData.dentistName || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">诊所名称：</span>
              <span className="preview-value">{formData.clinicName || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">联系电话：</span>
              <span className="preview-value">{formData.clinicPhone || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">填写日期：</span>
              <span className="preview-value">{formatDate(formData.fillDate)}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">优先级：</span>
              <span className={`badge ${getPriorityBadge(formData.priority)}`}>{formData.priority}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">预计交付：</span>
              <span className="preview-value">{formatDate(formData.estimatedDeliveryDate)}</span>
            </div>
          </div>
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">垂直距离记录 (mm)</h2>
          <div className="preview-grid">
            <div className="preview-item">
              <span className="preview-label">息止颌位：</span>
              <span className="preview-value">{formData.verticalDistance.restPosition || '-'} mm</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">咬合位：</span>
              <span className="preview-value">{formData.verticalDistance.occlusalPosition || '-'} mm</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">息止颌间隙：</span>
              <span className="preview-value">{formData.verticalDistance.freeWaySpace || '-'} mm</span>
            </div>
          </div>
          {formData.verticalDistance.notes && (
            <div className="preview-notes">
              <span className="preview-label">备注：</span>
              <span>{formData.verticalDistance.notes}</span>
            </div>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">颌位记录方式</h2>
          <div className="preview-grid">
            <div className="preview-item">
              <span className="preview-label">记录方法：</span>
              <span className="preview-value">{formData.jawRecord.method || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">记录次数：</span>
              <span className="preview-value">{formData.jawRecord.attempts || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">颌位稳定性：</span>
              <span className="preview-value">{formData.jawRecord.stability || '-'}</span>
            </div>
          </div>
          {formData.jawRecord.notes && (
            <div className="preview-notes">
              <span className="preview-label">记录过程说明：</span>
              <span>{formData.jawRecord.notes}</span>
            </div>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">咬合平面参考</h2>
          <div className="preview-grid">
            <div className="preview-item">
              <span className="preview-label">参考标志：</span>
              <span className="preview-value">{formData.occlusalPlane.reference || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">上颌前牙高度：</span>
              <span className="preview-value">{formData.occlusalPlane.maxillaryAnteriorHeight || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">下颌前牙高度：</span>
              <span className="preview-value">{formData.occlusalPlane.mandibularAnteriorHeight || '-'}</span>
            </div>
          </div>
          {formData.occlusalPlane.notes && (
            <div className="preview-notes">
              <span className="preview-label">备注：</span>
              <span>{formData.occlusalPlane.notes}</span>
            </div>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">前伸侧方运动观察</h2>
          {formData.movement.observations.length > 0 && (
            <div className="preview-tags">
              {formData.movement.observations.map((obs: MovementObservation, idx: number) => (
                <span key={idx} className="tag tag-blue">{obs}</span>
              ))}
            </div>
          )}
          <div className="preview-grid">
            <div className="preview-item">
              <span className="preview-label">前伸髁道斜度：</span>
              <span className="preview-value">{formData.movement.protrusivePath || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">侧方髁道斜度：</span>
              <span className="preview-value">{formData.movement.lateralPath || '-'}</span>
            </div>
          </div>
          {formData.movement.notes && (
            <div className="preview-notes">
              <span className="preview-label">运动功能备注：</span>
              <span>{formData.movement.notes}</span>
            </div>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">医生特别关注点</h2>
          {formData.specialConcerns.selected.length > 0 && (
            <div className="preview-tags">
              {formData.specialConcerns.selected.map((concern: SpecialConcern, idx: number) => (
                <span key={idx} className="tag tag-orange">{concern}</span>
              ))}
            </div>
          )}
          {formData.specialConcerns.additionalNotes && (
            <div className="preview-notes">
              <span className="preview-label">其他特别说明：</span>
              <span>{formData.specialConcerns.additionalNotes}</span>
            </div>
          )}
          {formData.specialConcerns.selected.length === 0 && !formData.specialConcerns.additionalNotes && (
            <p className="preview-empty">无特别关注点</p>
          )}
        </div>

        <div className="preview-section">
          <h2 className="preview-section-title">送检材料</h2>
          <div className="preview-grid">
            <div className="preview-item">
              <span className="preview-label">印模材料：</span>
              <span className="preview-value">{formData.materials.impressionType || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">咬合记录材料：</span>
              <span className="preview-value">{formData.materials.biteRegistrationMaterial || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">模型类型：</span>
              <span className="preview-value">{formData.materials.modelType || '-'}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">附加材料：</span>
              <span className="preview-value">
                {formData.materials.includesOldDenture && '旧义齿'}
                {formData.materials.includesOldDenture && formData.materials.includesFacebow && '、'}
                {formData.materials.includesFacebow && '面弓转移记录'}
                {!formData.materials.includesOldDenture && !formData.materials.includesFacebow && '-'}
              </span>
            </div>
          </div>
          {formData.materials.notes && (
            <div className="preview-notes">
              <span className="preview-label">材料备注：</span>
              <span>{formData.materials.notes}</span>
            </div>
          )}
        </div>

        <div className="preview-section signature-section">
          <div className="signature-block">
            <span className="preview-label">医生签名：</span>
            <span className="signature-line">{formData.dentistSignature || '____________________'}</span>
          </div>
          <div className="signature-block">
            <span className="preview-label">日期：</span>
            <span className="signature-line">{formatDate(formData.fillDate)}</span>
          </div>
        </div>

        {formData.createdAt && (
          <div className="preview-meta print-only">
            <p>创建时间：{formatDateTime(formData.createdAt)}</p>
            {formData.updatedAt && <p>更新时间：{formatDateTime(formData.updatedAt)}</p>}
          </div>
        )}

        {hasReceipt && (
          <>
            <div className="preview-divider" />
            <PreviewReceipt receipt={formData.receipt!} />
          </>
        )}
      </div>

      <div className="form-footer no-print">
        <button className="btn btn-secondary" onClick={onBack}>
          返回编辑
        </button>
        <div className="footer-actions">
          <button className="btn btn-secondary" onClick={handlePrint}>
            打印交接单
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存文件
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewReceipt({ receipt }: { receipt: OcclusionFormData['receipt'] }) {
  if (!receipt) return null

  return (
    <div className="preview-section receipt-section">
      <div className="receipt-header">
        <h2 className="preview-section-title">技工回执</h2>
        <span className="badge badge-teal">已回执</span>
      </div>

      <div className="preview-grid">
        <div className="preview-item">
          <span className="preview-label">技工所：</span>
          <span className="preview-value">{receipt.labName || '-'}</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">技师：</span>
          <span className="preview-value">{receipt.technicianName || '-'}</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">收到日期：</span>
          <span className="preview-value">{formatDate(receipt.receivedDate)}</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">模型状况：</span>
          <span className="preview-value">{receipt.modelCondition || '-'}</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">预计完成：</span>
          <span className="preview-value">{formatDate(receipt.estimatedCompletionDate)}</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">需返诊：</span>
          <span className={`badge ${receipt.requiresReturnVisit ? 'badge-red' : 'badge-green'}`}>
            {receipt.requiresReturnVisit ? '是' : '否'}
          </span>
        </div>
      </div>

      {receipt.issues.selected.length > 0 && (
        <>
          <h3 className="preview-subtitle">发现问题：</h3>
          <div className="preview-tags">
            {receipt.issues.selected.map((issue: TechnicianIssue, idx: number) => (
              <span key={idx} className="tag tag-red">{issue}</span>
            ))}
          </div>
        </>
      )}

      {receipt.issues.details && (
        <div className="preview-notes">
          <span className="preview-label">问题详情：</span>
          <span>{receipt.issues.details}</span>
        </div>
      )}

      {receipt.requiresReturnVisit && receipt.returnVisitReason && (
        <div className="preview-notes">
          <span className="preview-label">返诊原因：</span>
          <span className="text-red">{receipt.returnVisitReason}</span>
        </div>
      )}

      {receipt.specialInstructions && (
        <div className="preview-notes">
          <span className="preview-label">特别说明：</span>
          <span>{receipt.specialInstructions}</span>
        </div>
      )}

      <div className="preview-section signature-section">
        <div className="signature-block">
          <span className="preview-label">技师签名：</span>
          <span className="signature-line">{receipt.technicianSignature || '____________________'}</span>
        </div>
        {receipt.receiptCreatedAt && (
          <div className="signature-block">
            <span className="preview-label">回执日期：</span>
            <span className="signature-line">{formatDateTime(receipt.receiptCreatedAt)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
