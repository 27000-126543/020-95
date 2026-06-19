import type { FormStep } from '@/types/form'

export const FORM_STEPS: FormStep[] = [
  {
    key: 'basic',
    title: '基本信息',
    subtitle: '患者与诊所基础信息',
    requiredFields: ['patientCode', 'restorationType', 'dentistName', 'clinicName', 'fillDate']
  },
  {
    key: 'occlusion',
    title: '咬合记录',
    subtitle: '垂直距离、颌位、咬合平面与运动观察',
    requiredFields: ['jawRecord.method']
  },
  {
    key: 'concerns',
    title: '技师关注点',
    subtitle: '需要技师特别留意的事项',
    requiredFields: []
  },
  {
    key: 'delivery',
    title: '材料与交付',
    subtitle: '送检材料与交付要求',
    requiredFields: []
  }
]

export const ISSUE_SEVERITY_MAP: Record<string, { label: string; color: string; badge: string; description: string }> = {
  minor: {
    label: '轻微',
    color: '#64748b',
    badge: 'badge-gray',
    description: '小问题，技师可自行判断处理'
  },
  confirm: {
    label: '需确认',
    color: '#f59e0b',
    badge: 'badge-orange',
    description: '建议电话或微信联系医生确认'
  },
  revisit: {
    label: '需返诊',
    color: '#dc2626',
    badge: 'badge-red',
    description: '问题较严重，需要患者返诊重取记录'
  }
}
