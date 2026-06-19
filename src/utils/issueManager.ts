import type { OcclusionFormData, TechnicianIssue, IssueSeverity, IssueWithSeverity, TransferPackage, CaseStatus } from '@/types/form'
import { determineCaseStatus } from './stepValidator'

export function buildIssueFromId(id: string): IssueWithSeverity {
  return { issue: id as TechnicianIssue, severity: 'confirm' }
}

export function toggleIssueWithSeverity(
  selected: IssueWithSeverity[] | undefined,
  issueId: string,
  severity: IssueSeverity | null,
  options?: { returnVisitManuallySet?: boolean; currentRequiresReturnVisit?: boolean }
): {
  selected: IssueWithSeverity[]
  hasRevisit: boolean
  hasConfirm: boolean
  hasMinor: boolean
  requiresReturnVisit: boolean
} {
  const base = selected ? [...selected] : []
  const idx = base.findIndex(i => i.issue === issueId)

  if (severity === null) {
    if (idx >= 0) base.splice(idx, 1)
  } else {
    if (idx >= 0) {
      base[idx] = { issue: base[idx].issue, severity }
    } else {
      base.push({ issue: issueId as TechnicianIssue, severity })
    }
  }

  const hasRevisit = base.some(i => i.severity === 'revisit')
  const hasConfirm = base.some(i => i.severity === 'confirm')
  const hasMinor = base.length > 0 && base.every(i => i.severity === 'minor')

  // 手动打开的返诊开关不受自动逻辑影响
  let requiresReturnVisit: boolean
  if (options?.returnVisitManuallySet) {
    requiresReturnVisit = options.currentRequiresReturnVisit ?? hasRevisit
  } else {
    requiresReturnVisit = hasRevisit || (options?.currentRequiresReturnVisit ?? false)
  }

  return {
    selected: base,
    hasRevisit,
    hasConfirm,
    hasMinor,
    requiresReturnVisit
  }
}

export interface IssueCounts {
  minor: number
  confirm: number
  revisit: number
  total: number
}

export function countIssuesBySeverity(selected: IssueWithSeverity[] | undefined): IssueCounts {
  if (!selected) return { minor: 0, confirm: 0, revisit: 0, total: 0 }
  const counts: IssueCounts = { minor: 0, confirm: 0, revisit: 0, total: selected.length }
  selected.forEach(i => {
    if (i.severity === 'revisit') counts.revisit += 1
    else if (i.severity === 'confirm') counts.confirm += 1
    else counts.minor += 1
  })
  return counts
}

export function buildTransferPackage(
  formData: OcclusionFormData,
  opts: {
    actorType: 'clinic' | 'lab'
    actorName: string
    contact?: string
    additionalNotes?: string
    caseStatusOverride?: CaseStatus
  }
): TransferPackage {
  const status = opts.caseStatusOverride || determineCaseStatus(formData)
  const existingSource = (formData as unknown as { transferSource?: { history?: TransferPackage['history'] } }).transferSource
  const existingHistory = existingSource?.history || []
  const action = opts.actorType === 'clinic' ? '诊所发起/更新交接' : '技工所回执/反馈'
  const historyEntry: TransferPackage['history'] = [
    ...existingHistory,
    {
      action,
      actor: opts.actorName || (opts.actorType === 'clinic' ? '诊所' : '技工所'),
      time: new Date().toISOString(),
      note: opts.additionalNotes
    }
  ]

  const latestNotes =
    opts.additionalNotes
      ? (formData.notes
          ? `${opts.additionalNotes}`
          : opts.additionalNotes)
      : formData.notes || ''

  return {
    version: 1,
    packageType: 'occlusion-transfer',
    source: {
      type: opts.actorType,
      name: opts.actorName,
      contact: opts.contact
    },
    formData,
    latestNotes,
    caseStatus: status,
    history: historyEntry
  }
}
