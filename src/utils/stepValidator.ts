import type { OcclusionFormData, MissingField } from '@/types/form'
import { FORM_STEPS } from '@/constants/steps'

interface FieldCheck {
  key: string
  label: string
  step: string
  check: (data: OcclusionFormData) => boolean
}

const FIELD_CHECKS: FieldCheck[] = [
  { key: 'patientCode', label: '患者代号', step: 'basic', check: d => !!d.patientCode.trim() },
  { key: 'restorationType', label: '修复类型', step: 'basic', check: d => !!d.restorationType },
  { key: 'dentistName', label: '医生姓名', step: 'basic', check: d => !!d.dentistName.trim() },
  { key: 'clinicName', label: '诊所名称', step: 'basic', check: d => !!d.clinicName.trim() },
  { key: 'fillDate', label: '填写日期', step: 'basic', check: d => !!d.fillDate },
  { key: 'jawRecord.method', label: '颌位记录方式', step: 'occlusion', check: d => !!d.jawRecord.method },
  { key: 'verticalDistance.restPosition', label: '息止颌位距离', step: 'occlusion', check: d => !!d.verticalDistance.restPosition },
  { key: 'verticalDistance.occlusalPosition', label: '咬合位距离', step: 'occlusion', check: d => !!d.verticalDistance.occlusalPosition },
  { key: 'jawRecord.stability', label: '颌位稳定性', step: 'occlusion', check: d => !!d.jawRecord.stability },
  { key: 'occlusalPlane.reference', label: '咬合平面参考', step: 'occlusion', check: d => !!d.occlusalPlane.reference }
]

export function getMissingFields(data: OcclusionFormData): MissingField[] {
  return FIELD_CHECKS
    .filter(fc => !fc.check(data))
    .map(fc => ({ key: fc.key, label: fc.label, step: fc.step }))
}

export function getStepMissingFields(
  data: OcclusionFormData,
  stepKey: string
): MissingField[] {
  return getMissingFields(data).filter(f => f.step === stepKey)
}

export function isStepComplete(data: OcclusionFormData, stepKey: string): boolean {
  return getStepMissingFields(data, stepKey).length === 0
}

export function getStepProgress(data: OcclusionFormData): { step: string; complete: boolean; missingCount: number }[] {
  return FORM_STEPS.map(step => {
    const missing = getStepMissingFields(data, step.key)
    return {
      step: step.key,
      complete: missing.length === 0,
      missingCount: missing.length
    }
  })
}

export function getOverallProgress(data: OcclusionFormData): number {
  const total = FIELD_CHECKS.length
  const filled = FIELD_CHECKS.filter(fc => fc.check(data)).length
  return Math.round((filled / total) * 100)
}
