import { useState, type ChangeEvent } from 'react'
import { FormSection } from '@/components/FormSection'
import { InputField, SelectField, TextareaField, CheckboxGroup, RadioGroup, FormField } from '@/components/FormField'
import type { OcclusionFormData, MovementObservation, SpecialConcern } from '@/types/form'
import {
  RESTORATION_TYPES,
  JAW_RECORD_METHODS,
  OCCLUSAL_PLANE_REFERENCES,
  MOVEMENT_OBSERVATIONS,
  SPECIAL_CONCERNS,
  STABILITY_OPTIONS,
  PRIORITY_OPTIONS,
  GENDER_OPTIONS
} from '@/constants/options'
import { validateForm } from '@/utils/formUtils'
import type { FormStore } from '@/hooks/useFormStore'

interface FillFormProps {
  store: FormStore
  onPreview: () => void
}

export function FillForm({ store, onPreview }: FillFormProps) {
  const { formData, updateFormData, updateSection, resetForm } = store
  const [errors, setErrors] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSave = async () => {
    const validation = validateForm(formData)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setErrors([])

    const result = await window.electronAPI.saveForm(formData)
    if (result.success && result.filePath) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handlePreview = () => {
    const validation = validateForm(formData)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setErrors([])
    onPreview()
  }

  return (
    <div className="fill-form">
      <div className="form-header">
        <div className="header-content">
          <h1 className="form-title">咬合交接单</h1>
          <p className="form-subtitle">请按步骤填写患者咬合记录信息</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={resetForm}>
            清空表单
          </button>
          <button className="btn btn-secondary" onClick={handlePreview}>
            预览
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存文件
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="alert alert-success">
          ✓ 文件保存成功！
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

      <div className="form-body">
        <FormSection title="基本信息" required>
          <div className="form-grid">
            <InputField
              label="患者代号"
              required
              value={formData.patientCode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ patientCode: e.target.value })}
              placeholder="如：张XX-2024-001"
            />
            <InputField
              label="年龄"
              value={formData.patientAge || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ patientAge: e.target.value })}
              placeholder="岁"
              type="number"
              min="1"
              max="120"
            />
            <SelectField
              label="性别"
              value={formData.patientGender || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => updateFormData({ patientGender: e.target.value as '男' | '女' | '' })}
              options={GENDER_OPTIONS}
            />
            <SelectField
              label="修复类型"
              required
              value={formData.restorationType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => updateFormData({ restorationType: e.target.value as OcclusionFormData['restorationType'] })}
              options={RESTORATION_TYPES}
            />
            <InputField
              label="医生姓名"
              required
              value={formData.dentistName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ dentistName: e.target.value })}
              placeholder="主治医生姓名"
            />
            <InputField
              label="诊所名称"
              required
              value={formData.clinicName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ clinicName: e.target.value })}
              placeholder="诊所或医院名称"
            />
            <InputField
              label="联系电话"
              value={formData.clinicPhone}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ clinicPhone: e.target.value })}
              placeholder="诊所联系电话"
            />
            <InputField
              label="填写日期"
              required
              type="date"
              value={formData.fillDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ fillDate: e.target.value })}
            />
          </div>
        </FormSection>

        <FormSection
          title="垂直距离记录"
          subtitle="记录息止颌位与咬合位的垂直距离，单位：mm"
          required
        >
          <div className="form-grid">
            <InputField
              label="息止颌位垂直距离"
              value={formData.verticalDistance.restPosition}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('verticalDistance', { restPosition: e.target.value })}
              placeholder="如：68"
              type="number"
              step="0.5"
              helpText="鼻底至颏底距离"
            />
            <InputField
              label="咬合位垂直距离"
              value={formData.verticalDistance.occlusalPosition}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('verticalDistance', { occlusalPosition: e.target.value })}
              placeholder="如：64"
              type="number"
              step="0.5"
              helpText="咬合时鼻底至颏底距离"
            />
            <InputField
              label="息止颌间隙"
              value={formData.verticalDistance.freeWaySpace}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('verticalDistance', { freeWaySpace: e.target.value })}
              placeholder="如：4"
              type="number"
              step="0.5"
              helpText="自动计算或手动输入，通常2-4mm"
            />
            <TextareaField
              label="备注"
              value={formData.verticalDistance.notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('verticalDistance', { notes: e.target.value })}
              placeholder="垂直距离测量的特殊说明..."
              rows={2}
            />
          </div>
        </FormSection>

        <FormSection title="颌位记录方式" required>
          <div className="form-grid">
            <SelectField
              label="记录方法"
              required
              value={formData.jawRecord.method}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSection('jawRecord', { method: e.target.value as OcclusionFormData['jawRecord']['method'] })}
              options={JAW_RECORD_METHODS}
            />
            <InputField
              label="记录次数"
              value={formData.jawRecord.attempts}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('jawRecord', { attempts: e.target.value })}
              placeholder="如：3次"
              helpText="重复确认的次数"
            />
            <RadioGroup
              label="颌位稳定性"
              value={formData.jawRecord.stability}
              onChange={(value: string) => updateSection('jawRecord', { stability: value as OcclusionFormData['jawRecord']['stability'] })}
              options={STABILITY_OPTIONS}
            />
            <TextareaField
              label="记录过程说明"
              value={formData.jawRecord.notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('jawRecord', { notes: e.target.value })}
              placeholder="记录过程中的特殊情况、患者配合度等..."
              rows={3}
            />
          </div>
        </FormSection>

        <FormSection title="咬合平面参考">
          <div className="form-grid">
            <SelectField
              label="参考标志"
              value={formData.occlusalPlane.reference}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSection('occlusalPlane', { reference: e.target.value as OcclusionFormData['occlusalPlane']['reference'] })}
              options={OCCLUSAL_PLANE_REFERENCES}
            />
            <InputField
              label="上颌前牙区高度"
              value={formData.occlusalPlane.maxillaryAnteriorHeight}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('occlusalPlane', { maxillaryAnteriorHeight: e.target.value })}
              placeholder="如：唇下2mm"
            />
            <InputField
              label="下颌前牙区高度"
              value={formData.occlusalPlane.mandibularAnteriorHeight}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('occlusalPlane', { mandibularAnteriorHeight: e.target.value })}
              placeholder="如：唇上1mm"
            />
            <TextareaField
              label="备注"
              value={formData.occlusalPlane.notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('occlusalPlane', { notes: e.target.value })}
              placeholder="咬合平面调整的特殊说明..."
              rows={2}
            />
          </div>
        </FormSection>

        <FormSection title="前伸侧方运动观察">
          <div className="form-grid">
            <CheckboxGroup
              label="观察结果（可多选）"
              options={MOVEMENT_OBSERVATIONS}
              selected={formData.movement.observations as string[]}
              onChange={(selected: string[]) => updateSection('movement', { observations: selected as MovementObservation[] })}
            />
            <InputField
              label="前伸髁道斜度"
              value={formData.movement.protrusivePath}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('movement', { protrusivePath: e.target.value })}
              placeholder="如：30°"
            />
            <InputField
              label="侧方髁道斜度"
              value={formData.movement.lateralPath}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('movement', { lateralPath: e.target.value })}
              placeholder="如：15°"
            />
            <TextareaField
              label="运动功能备注"
              value={formData.movement.notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('movement', { notes: e.target.value })}
              placeholder="下颌运动的特殊观察..."
              rows={2}
            />
          </div>
        </FormSection>

        <FormSection
          title="医生特别关注点"
          subtitle="选择需要技师特别注意的事项，避免电话口头交代遗漏"
        >
          <div className="form-grid">
            <CheckboxGroup
              label="常见关注点（可多选）"
              options={SPECIAL_CONCERNS}
              selected={formData.specialConcerns.selected as string[]}
              onChange={(selected: string[]) => updateSection('specialConcerns', { selected: selected as SpecialConcern[] })}
            />
            <TextareaField
              label="其他特别说明"
              value={formData.specialConcerns.additionalNotes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('specialConcerns', { additionalNotes: e.target.value })}
              placeholder="其他需要特别说明的事项..."
              rows={3}
            />
          </div>
        </FormSection>

        <FormSection title="送检材料">
          <div className="form-grid">
            <InputField
              label="印模材料"
              value={formData.materials.impressionType}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('materials', { impressionType: e.target.value })}
              placeholder="如：加聚型硅橡胶"
            />
            <InputField
              label="咬合记录材料"
              value={formData.materials.biteRegistrationMaterial}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('materials', { biteRegistrationMaterial: e.target.value })}
              placeholder="如：聚醚咬合记录材料"
            />
            <InputField
              label="模型类型"
              value={formData.materials.modelType}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('materials', { modelType: e.target.value })}
              placeholder="如：超硬石膏模型 / 数字扫描件"
            />
            <div className="form-grid">
              <FormField label="附加材料">
                <div className="checkbox-group inline">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.materials.includesOldDenture}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('materials', { includesOldDenture: e.target.checked })}
                      className="checkbox-input"
                    />
                    <span className="checkbox-label">旧义齿</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.materials.includesFacebow}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('materials', { includesFacebow: e.target.checked })}
                      className="checkbox-input"
                    />
                    <span className="checkbox-label">面弓转移记录</span>
                  </label>
                </div>
              </FormField>
            </div>
            <TextareaField
              label="材料备注"
              value={formData.materials.notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('materials', { notes: e.target.value })}
              placeholder="材料相关的其他说明..."
              rows={2}
            />
          </div>
        </FormSection>

        <FormSection title="交付要求">
          <div className="form-grid">
            <InputField
              label="预计交付日期"
              type="date"
              value={formData.estimatedDeliveryDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ estimatedDeliveryDate: e.target.value })}
            />
            <RadioGroup
              label="优先级"
              value={formData.priority}
              onChange={(value: string) => updateFormData({ priority: value as OcclusionFormData['priority'] })}
              options={PRIORITY_OPTIONS}
            />
            <InputField
              label="医生签名"
              value={formData.dentistSignature}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateFormData({ dentistSignature: e.target.value })}
              placeholder="请输入医生姓名作为签名"
            />
          </div>
        </FormSection>
      </div>

      <div className="form-footer">
        <button className="btn btn-secondary" onClick={resetForm}>
          清空表单
        </button>
        <div className="footer-actions">
          <button className="btn btn-secondary" onClick={handlePreview}>
            预览交接单
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存并导出
          </button>
        </div>
      </div>
    </div>
  )
}
