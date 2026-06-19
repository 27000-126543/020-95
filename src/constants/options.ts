import type {
  RestorationType,
  JawRecordMethod,
  OcclusalPlaneReference,
  MovementObservation,
  SpecialConcern,
  TechnicianIssue
} from '@/types/form'

export const RESTORATION_TYPES: { value: RestorationType; label: string }[] = [
  { value: '全口义齿', label: '全口义齿' },
  { value: '可摘局部义齿', label: '可摘局部义齿' },
  { value: '固定桥修复', label: '固定桥修复' },
  { value: '种植修复上部结构', label: '种植修复上部结构' },
  { value: '咬合重建', label: '咬合重建' },
  { value: '其他', label: '其他' }
]

export const JAW_RECORD_METHODS: { value: JawRecordMethod; label: string }[] = [
  { value: '哥特式弓描记', label: '哥特式弓描记' },
  { value: '直接咬合法', label: '直接咬合法' },
  { value: '肌监控仪法', label: '肌监控仪法' },
  { value: '旧义齿参考法', label: '旧义齿参考法' },
  { value: '蜡堤记录法', label: '蜡堤记录法' },
  { value: '数字化咬合记录', label: '数字化咬合记录' }
]

export const OCCLUSAL_PLANE_REFERENCES: { value: OcclusalPlaneReference; label: string }[] = [
  { value: '鼻翼耳屏线', label: '鼻翼耳屏线' },
  { value: '眶耳平面', label: '眶耳平面' },
  { value: '咬合平面板', label: '咬合平面板' },
  { value: '旧义齿咬合平面', label: '旧义齿咬合平面' },
  { value: '前牙参考法', label: '前牙参考法' }
]

export const MOVEMENT_OBSERVATIONS: { value: MovementObservation; label: string }[] = [
  { value: '前伸运动正常', label: '前伸运动正常' },
  { value: '前伸运动受限', label: '前伸运动受限' },
  { value: '侧方运动正常', label: '侧方运动正常' },
  { value: '侧方运动偏斜', label: '侧方运动偏斜' },
  { value: '开闭口轨迹异常', label: '开闭口轨迹异常' },
  { value: '关节弹响', label: '关节弹响' }
]

export const SPECIAL_CONCERNS: { value: SpecialConcern; label: string; description?: string }[] = [
  { value: '疑似正中关系不稳定', label: '疑似正中关系不稳定', description: '需技师在制作过程中特别关注颌位稳定性' },
  { value: '需保留试排反馈', label: '需保留试排反馈', description: '试排后需医生确认后方可继续' },
  { value: '上颌蜡堤已调整但需技师复核', label: '上颌蜡堤已调整但需技师复核', description: '临床已做初步调整，请技师专业复核' },
  { value: '下颌隆突区需缓冲', label: '下颌隆突区需缓冲', description: '该区域黏膜较薄，需注意基托缓冲' },
  { value: '旧义齿基托适合性良好可参考', label: '旧义齿基托适合性良好可参考', description: '旧义齿佩戴多年，形态可作参考' },
  { value: '面下1/3距离需重点关注', label: '面下1/3距离需重点关注', description: '垂直距离恢复是关键' },
  { value: '颞下颌关节病史需注意', label: '颞下颌关节病史需注意', description: '患者有TMD病史，咬合设计需谨慎' },
  { value: '患者咀嚼习惯特殊', label: '患者咀嚼习惯特殊', description: '长期单侧咀嚼等习惯需考虑' }
]

export const TECHNICIAN_ISSUES: { value: TechnicianIssue; label: string }[] = [
  { value: '咬合架安装疑问', label: '咬合架安装疑问' },
  { value: '记录基托不稳', label: '记录基托不稳' },
  { value: '左右高度差明显', label: '左右高度差明显' },
  { value: '咬合记录模糊不清', label: '咬合记录模糊不清' },
  { value: '模型缺损或变形', label: '模型缺损或变形' },
  { value: '颌位记录与模型不符', label: '颌位记录与模型不符' },
  { value: '垂直距离需确认', label: '垂直距离需确认' },
  { value: '前伸平衡咬合设置疑问', label: '前伸平衡咬合设置疑问' }
]

export const STABILITY_OPTIONS = [
  { value: '稳定', label: '稳定' },
  { value: '较稳定', label: '较稳定' },
  { value: '不稳定', label: '不稳定' }
]

export const PRIORITY_OPTIONS = [
  { value: '常规', label: '常规' },
  { value: '加急', label: '加急' },
  { value: '特急', label: '特急' }
]

export const MODEL_CONDITION_OPTIONS = [
  { value: '良好', label: '良好' },
  { value: '一般', label: '一般' },
  { value: '较差', label: '较差' }
]

export const GENDER_OPTIONS = [
  { value: '男', label: '男' },
  { value: '女', label: '女' }
]
