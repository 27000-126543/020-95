import type { OcclusionFormData, TechnicianReceipt } from '@/types/form'

export function createEmptyForm(): OcclusionFormData {
  const today = new Date().toISOString().slice(0, 10)
  const estimatedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return {
    patientCode: '',
    patientAge: '',
    patientGender: '',
    restorationType: '',
    dentistName: '',
    clinicName: '',
    clinicPhone: '',
    fillDate: today,

    verticalDistance: {
      restPosition: '',
      occlusalPosition: '',
      freeWaySpace: '',
      notes: ''
    },

    jawRecord: {
      method: '',
      attempts: '',
      stability: '',
      notes: ''
    },

    occlusalPlane: {
      reference: '',
      maxillaryAnteriorHeight: '',
      mandibularAnteriorHeight: '',
      notes: ''
    },

    movement: {
      observations: [],
      protrusivePath: '',
      lateralPath: '',
      notes: ''
    },

    specialConcerns: {
      selected: [],
      additionalNotes: ''
    },

    materials: {
      impressionType: '',
      biteRegistrationMaterial: '',
      modelType: '',
      includesOldDenture: false,
      includesFacebow: false,
      notes: ''
    },

    estimatedDeliveryDate: estimatedDate,
    priority: '常规',
    dentistSignature: ''
  }
}

export function createEmptyReceipt(): TechnicianReceipt {
  const today = new Date().toISOString().slice(0, 10)
  const estimatedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return {
    receivedDate: today,
    technicianName: '',
    labName: '',
    issues: {
      selected: [],
      details: ''
    },
    modelCondition: '',
    requiresReturnVisit: false,
    returnVisitReason: '',
    estimatedCompletionDate: estimatedDate,
    specialInstructions: '',
    technicianSignature: ''
  }
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function validateForm(data: OcclusionFormData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.patientCode.trim()) {
    errors.push('请填写患者代号')
  }
  if (!data.restorationType) {
    errors.push('请选择修复类型')
  }
  if (!data.dentistName.trim()) {
    errors.push('请填写医生姓名')
  }
  if (!data.clinicName.trim()) {
    errors.push('请填写诊所名称')
  }
  if (!data.fillDate) {
    errors.push('请选择填写日期')
  }
  if (!data.jawRecord.method) {
    errors.push('请选择颌位记录方式')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateReceipt(receipt: TechnicianReceipt): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!receipt.technicianName.trim()) {
    errors.push('请填写技师姓名')
  }
  if (!receipt.labName.trim()) {
    errors.push('请填写技工所名称')
  }
  if (!receipt.receivedDate) {
    errors.push('请选择收到日期')
  }
  if (receipt.requiresReturnVisit && !receipt.returnVisitReason.trim()) {
    errors.push('如需返诊，请填写返诊原因')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function generateFormId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `OCF-${timestamp}-${random}`
}
