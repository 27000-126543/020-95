import type { OcclusionFormData, MissingField, CaseStatus } from '@/types/form'
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

export function determineCaseStatus(data: OcclusionFormData): CaseStatus {
  const missing = getMissingFields(data)
  const hasCoreMissing = missing.some(m =>
    ['patientCode', 'restorationType', 'dentistName', 'clinicName', 'jawRecord.method'].includes(m.key)
  )
  if (hasCoreMissing || missing.length >= 3) {
    return 'doctor_incomplete'
  }
  if (!data.receipt) {
    return 'awaiting_receipt'
  }
  const receipt = data.receipt
  const revisit = receipt.issues.selected?.some?.(i => i.severity === 'revisit')
  const confirm = receipt.issues.selected?.some?.(i => i.severity === 'confirm')
  if (receipt.requiresReturnVisit || revisit || confirm) {
    return 'doctor_action'
  }
  return 'completed'
}

export const CASE_STATUS_META: Record<CaseStatus, { label: string; color: string; badge: string; icon: string; description: string }> = {
  doctor_incomplete: {
    label: '待医生补充',
    color: '#0ea5e9',
    badge: 'badge-blue',
    icon: '📝',
    description: '核心信息有缺失，需要医生继续完善'
  },
  awaiting_receipt: {
    label: '待技工回执',
    color: '#f59e0b',
    badge: 'badge-orange',
    icon: '⏳',
    description: '已送交技工所，等待技师填写回执'
  },
  doctor_action: {
    label: '需医生处理',
    color: '#dc2626',
    badge: 'badge-red',
    icon: '⚠️',
    description: '技工标注了需确认/返诊问题，需要医生处理'
  },
  completed: {
    label: '已完成',
    color: '#16a34a',
    badge: 'badge-green',
    icon: '✅',
    description: '双方确认完毕，病例可归档'
  }
}
