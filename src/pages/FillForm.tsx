import { useState, useMemo, type ChangeEvent } from 'react'
import { FormSection } from '@/components/FormSection'
import { InputField, SelectField, TextareaField, CheckboxGroup, RadioGroup, FormField } from '@/components/FormField'
import type { OcclusionFormData, MovementObservation, SpecialConcern, MissingField } from '@/types/form'
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
import { FORM_STEPS } from '@/constants/steps'
import { validateForm } from '@/utils/formUtils'
import { getMissingFields, getStepProgress, getOverallProgress } from '@/utils/stepValidator'
import { upsertHistory } from '@/utils/historyStore'
import type { FormStore } from '@/hooks/useFormStore'

interface FillFormProps {
  store: FormStore
  onPreview: () => void
  onBackToList: () => void
}

export function FillForm({ store, onPreview, onBackToList }: FillFormProps) {
  const { formData, updateFormData, updateSection, resetForm, markSaved } = store
  const [currentStep, setCurrentStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [showSuccess, setShowSuccess] = useState<string>('')

  const missingFields = useMemo(() => getMissingFields(formData), [formData])
  const stepProgress = useMemo(() => getStepProgress(formData), [formData])
  const overallProgress = useMemo(() => getOverallProgress(formData), [formData])

  const currentStepData = FORM_STEPS[currentStep]

  const handleSave = async () => {
    const validation = validateForm(formData)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setErrors([])

    const result = await window.electronAPI.saveForm(formData)
    if (result.success && result.filePath) {
      markSaved(result.filePath)
      upsertHistory(result.filePath, formData)
      setShowSuccess(`✓ 文件已保存：${result.filePath}`)
      setTimeout(() => setShowSuccess(''), 4000)
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

  const handleNext = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      handlePreview()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
    }
  }

  const goToStep = (idx: number) => {
    setCurrentStep(idx)
  }

  const getStepMissing = (stepKey: string): MissingField[] => {
    return missingFields.filter(f => f.step === stepKey)
  }

  const renderStepContent = () => {
    switch (currentStepData.key) {
      case 'basic':
        return (
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
        )

      case 'occlusion':
        return (
          <>
            <FormSection title="垂直距离记录" subtitle="记录息止颌位与咬合位的垂直距离，单位：mm" required>
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
                  helpText="通常 2-4 mm"
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
                />
                <InputField
                  label="下颌前牙区高度"
                  value={formData.occlusalPlane.mandibularAnteriorHeight}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('occlusalPlane', { mandibularAnteriorHeight: e.target.value })}
                />
                <TextareaField
                  label="备注"
                  value={formData.occlusalPlane.notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('occlusalPlane', { notes: e.target.value })}
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
                />
                <InputField
                  label="侧方髁道斜度"
                  value={formData.movement.lateralPath}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('movement', { lateralPath: e.target.value })}
                />
                <TextareaField
                  label="运动功能备注"
                  value={formData.movement.notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('movement', { notes: e.target.value })}
                  rows={2}
                />
              </div>
            </FormSection>
          </>
        )

      case 'concerns':
        return (
          <FormSection title="医生特别关注点" subtitle="选择需要技师特别注意的事项，避免电话口头交代遗漏">
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
                rows={4}
              />
            </div>
          </FormSection>
        )

      case 'delivery':
        return (
          <>
            <FormSection title="送检材料">
              <div className="form-grid">
                <InputField
                  label="印模材料"
                  value={formData.materials.impressionType}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('materials', { impressionType: e.target.value })}
                />
                <InputField
                  label="咬合记录材料"
                  value={formData.materials.biteRegistrationMaterial}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('materials', { biteRegistrationMaterial: e.target.value })}
                />
                <InputField
                  label="模型类型"
                  value={formData.materials.modelType}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateSection('materials', { modelType: e.target.value })}
                  placeholder="如：超硬石膏模型 / 数字扫描件"
                />
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
                <TextareaField
                  label="材料备注"
                  value={formData.materials.notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateSection('materials', { notes: e.target.value })}
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
                />
              </div>
            </FormSection>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="fill-form stepped">
      <div className="form-header">
        <div className="header-content">
          <button className="btn-link" onClick={onBackToList}>← 返回列表</button>
          <h1 className="form-title">咬合交接单</h1>
          <p className="form-subtitle">按步骤填写患者咬合记录信息</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={resetForm}>清空表单</button>
          <button className="btn btn-secondary" onClick={handlePreview}>预览</button>
          <button className="btn btn-primary" onClick={handleSave}>保存文件</button>
        </div>
      </div>

      {showSuccess && (
        <div className="alert alert-success">{showSuccess}</div>
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

      <div className="stepped-layout">
        <aside className="step-sidebar">
          <div className="progress-overview">
            <div className="progress-ring" style={{ '--progress': overallProgress } as React.CSSProperties}>
              <span className="progress-value">{overallProgress}%</span>
            </div>
            <p className="progress-label">表单完成度</p>
            {missingFields.length > 0 && (
              <p className="progress-hint">{missingFields.length} 项待完善</p>
            )}
          </div>

          <nav className="step-nav">
            {FORM_STEPS.map((step, idx) => {
              const progress = stepProgress[idx]
              const stepMissing = getStepMissing(step.key)
              return (
                <button
                  key={step.key}
                  className={`step-nav-item ${idx === currentStep ? 'active' : ''} ${progress.complete ? 'complete' : ''}`}
                  onClick={() => goToStep(idx)}
                >
                  <div className="step-indicator">
                    {progress.complete ? '✓' : idx + 1}
                    {!progress.complete && progress.missingCount > 0 && (
                      <span className="step-missing-badge">{progress.missingCount}</span>
                    )}
                  </div>
                  <div className="step-text">
                    <span className="step-title">{step.title}</span>
                    {stepMissing.length > 0 && (
                      <span className="step-missing-list">
                        {stepMissing.map(m => m.label).join('、')}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </nav>

          {missingFields.length > 0 && (
            <div className="missing-panel">
              <h4 className="missing-title">
                ⚠️ 待完善项 ({missingFields.length})
              </h4>
              <ul className="missing-list">
                {missingFields.map((f: MissingField) => {
                  const stepIdx = FORM_STEPS.findIndex(s => s.key === f.step)
                  return (
                    <li key={f.key} onClick={() => goToStep(stepIdx)}>
                      <span className="missing-dot" />
                      <span className="missing-label">{f.label}</span>
                      <span className="missing-step">· {FORM_STEPS[stepIdx].title}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </aside>

        <section className="step-content">
          <div className="step-header-bar">
            <div>
              <span className="step-badge">步骤 {currentStep + 1} / {FORM_STEPS.length}</span>
              <h2 className="step-main-title">{currentStepData.title}</h2>
              {currentStepData.subtitle && (
                <p className="step-subtitle">{currentStepData.subtitle}</p>
              )}
            </div>
          </div>

          <div className="form-body">
            {renderStepContent()}
          </div>

          <div className="form-footer stepped-footer">
            <button
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              ← 上一步
            </button>
            <div className="footer-actions">
              <button className="btn btn-secondary" onClick={handleSave}>暂存</button>
              <button className="btn btn-primary" onClick={handleNext}>
                {currentStep === FORM_STEPS.length - 1 ? '预览并导出 →' : '下一步 →'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
