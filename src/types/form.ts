export type RestorationType =
  | '全口义齿'
  | '可摘局部义齿'
  | '固定桥修复'
  | '种植修复上部结构'
  | '咬合重建'
  | '其他'

export type JawRecordMethod =
  | '哥特式弓描记'
  | '直接咬合法'
  | '肌监控仪法'
  | '旧义齿参考法'
  | '蜡堤记录法'
  | '数字化咬合记录'

export type OcclusalPlaneReference =
  | '鼻翼耳屏线'
  | '眶耳平面'
  | '咬合平面板'
  | '旧义齿咬合平面'
  | '前牙参考法'

export type MovementObservation =
  | '前伸运动正常'
  | '前伸运动受限'
  | '侧方运动正常'
  | '侧方运动偏斜'
  | '开闭口轨迹异常'
  | '关节弹响'

export type SpecialConcern =
  | '疑似正中关系不稳定'
  | '需保留试排反馈'
  | '上颌蜡堤已调整但需技师复核'
  | '下颌隆突区需缓冲'
  | '旧义齿基托适合性良好可参考'
  | '面下1/3距离需重点关注'
  | '颞下颌关节病史需注意'
  | '患者咀嚼习惯特殊'

export type TechnicianIssue =
  | '咬合架安装疑问'
  | '记录基托不稳'
  | '左右高度差明显'
  | '咬合记录模糊不清'
  | '模型缺损或变形'
  | '颌位记录与模型不符'
  | '垂直距离需确认'
  | '前伸平衡咬合设置疑问'

export type IssueSeverity = 'minor' | 'confirm' | 'revisit'

export interface IssueWithSeverity {
  issue: TechnicianIssue
  severity: IssueSeverity
}

export interface OcclusionFormData {
  id?: string
  patientCode: string
  patientAge?: string
  patientGender?: '男' | '女' | ''
  restorationType: RestorationType | ''
  dentistName: string
  clinicName: string
  clinicPhone: string
  fillDate: string

  verticalDistance: {
    restPosition: string
    occlusalPosition: string
    freeWaySpace: string
    notes: string
  }

  jawRecord: {
    method: JawRecordMethod | ''
    attempts: string
    stability: '稳定' | '较稳定' | '不稳定' | ''
    notes: string
  }

  occlusalPlane: {
    reference: OcclusalPlaneReference | ''
    maxillaryAnteriorHeight: string
    mandibularAnteriorHeight: string
    notes: string
  }

  movement: {
    observations: MovementObservation[]
    protrusivePath: string
    lateralPath: string
    notes: string
  }

  specialConcerns: {
    selected: SpecialConcern[]
    additionalNotes: string
  }

  materials: {
    impressionType: string
    biteRegistrationMaterial: string
    modelType: string
    includesOldDenture: boolean
    includesFacebow: boolean
    notes: string
  }

  estimatedDeliveryDate: string
  priority: '常规' | '加急' | '特急'
  dentistSignature: string

  notes?: string

  createdAt?: string
  updatedAt?: string

  receipt?: TechnicianReceipt
}

export interface TechnicianReceipt {
  receivedDate: string
  technicianName: string
  labName: string
  issues: {
    selected: IssueWithSeverity[]
    legacySelected?: TechnicianIssue[]
    details: string
  }
  modelCondition: '良好' | '一般' | '较差' | ''
  requiresReturnVisit: boolean
  returnVisitReason: string
  estimatedCompletionDate: string
  specialInstructions: string
  technicianSignature: string
  receiptCreatedAt?: string
}

export interface FormHistoryItem {
  id: string
  filePath: string
  patientCode: string
  restorationType: string
  hasReceipt: boolean
  lastUpdatedAt: string
  dentistName?: string
  priority?: string
  status?: CaseStatus
}

export interface TransferSource {
  type?: 'clinic' | 'lab'
  name?: string
  contact?: string
  exportedAt?: string
  importedAt?: string
  importSourcePath?: string
  caseStatusHint?: CaseStatus
  latestNotes?: string
}

declare module './form' {
  interface OcclusionFormData {
    transferSource?: TransferSource
  }
}

export interface FormStep {
  key: string
  title: string
  subtitle?: string
  requiredFields: string[]
}

export interface MissingField {
  key: string
  label: string
  step: string
}

export type View = 'list' | 'fill' | 'preview' | 'receipt'

export type CaseStatus =
  | 'doctor_incomplete'   // 待医生补充
  | 'awaiting_receipt'    // 待技工回执
  | 'doctor_action'       // 需医生处理
  | 'completed'           // 已完成

export interface TransferPackage {
  version: number
  packageType: 'occlusion-transfer'
  source: {
    type: 'clinic' | 'lab'
    name: string
    contact?: string
  }
  formData: OcclusionFormData
  latestNotes: string
  caseStatus?: CaseStatus
  history?: {
    action: string
    actor: string
    time: string
    note?: string
  }[]
  exportedAt?: string
  importedAt?: string
  importSourcePath?: string
}
