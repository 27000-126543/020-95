import type { FormHistoryItem, OcclusionFormData, CaseStatus } from '@/types/form'
import { determineCaseStatus } from './stepValidator'

const HISTORY_KEY = 'occlusion_form_history'
const MAX_HISTORY = 100
const MAX_IN_MEMORY_SIZE = 20
const NEW_IMPORT_WINDOW_MS = 1000 * 60 * 60 * 48  // 48 小时内视为新导入

let _batchCounter = 0
function nextBatchId(): string {
  _batchCounter += 1
  return `batch-${Date.now()}-${_batchCounter}`
}

export function getHistory(): FormHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as FormHistoryItem[]
    // 先按已查看/未查看分堆，再按 lastUpdatedAt 倒序；未查看的优先
    return data.sort((a, b) => {
      const aNew = isRecentlyImported(a)
      const bNew = isRecentlyImported(b)
      if (aNew !== bNew) return aNew ? -1 : 1
      return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    })
  } catch {
    return []
  }
}

export function isRecentlyImported(item: FormHistoryItem): boolean {
  if (!item.isNewlyImported) return false
  const importedAt = item.transferSource?.importedAt || item.lastUpdatedAt
  return Date.now() - new Date(importedAt).getTime() < NEW_IMPORT_WINDOW_MS
}

export function saveHistory(history: FormHistoryItem[]): void {
  try {
    const sorted = [...history].sort((a, b) => {
      const aNew = isRecentlyImported(a)
      const bNew = isRecentlyImported(b)
      if (aNew !== bNew) return aNew ? -1 : 1
      return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    })
    const limited = sorted.slice(0, MAX_HISTORY)
    let inMemoryCount = 0
    const trimmed = limited.map(item => {
      if (item.inMemoryData) {
        inMemoryCount += 1
        if (inMemoryCount > MAX_IN_MEMORY_SIZE) {
          const { inMemoryData, ...rest } = item
          return { ...rest, pendingLocalSave: true }
        }
      }
      return item
    })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  } catch (err) {
    console.error('Failed to save history:', err)
  }
}

export function upsertHistory(
  filePathOrForm: string | OcclusionFormData,
  formDataOrNull?: OcclusionFormData,
  opts?: {
    importSourcePath?: string
    transferSource?: FormHistoryItem['transferSource']
    pendingLocalSave?: boolean
    isNewlyImported?: boolean
    importBatchId?: string
  }
): FormHistoryItem[] {
  const history = getHistory()
  const now = new Date().toISOString()

  let filePath: string
  let formData: OcclusionFormData

  if (typeof filePathOrForm === 'string') {
    filePath = filePathOrForm
    formData = formDataOrNull!
  } else {
    formData = filePathOrForm
    filePath = opts?.importSourcePath || `mem://${formData.id || `tmp-${Date.now()}`}`
  }

  const id = formData.id || `form-${Date.now()}`
  const status: CaseStatus = determineCaseStatus(formData)
  const hasReceipt = !!formData.receipt
  const saved = !!opts?.pendingLocalSave ? false : /^[A-Za-z]:[\\/]/.test(filePath) || filePath.startsWith('/')
  const inMemoryData = !saved ? formData : undefined

  const item: FormHistoryItem = {
    id,
    filePath,
    patientCode: formData.patientCode || '未命名病例',
    restorationType: formData.restorationType || '',
    hasReceipt,
    lastUpdatedAt: now,
    dentistName: formData.dentistName,
    priority: formData.priority,
    status,
    saved,
    importSourcePath: opts?.importSourcePath,
    transferSource: opts?.transferSource || (formData as unknown as { transferSource?: FormHistoryItem['transferSource'] }).transferSource,
    inMemoryData,
    pendingLocalSave: opts?.pendingLocalSave || !saved,
    importBatchId: opts?.importBatchId || (formData as unknown as { transferSource?: { importBatchId?: string } }).transferSource?.importBatchId,
    isNewlyImported: opts?.isNewlyImported ?? false
  }

  const existingIdx = history.findIndex(h => h.id === id || (filePath && h.filePath === filePath))
  if (existingIdx >= 0) {
    const existing = history[existingIdx]
    history[existingIdx] = {
      ...existing,
      ...item,
      isNewlyImported: item.isNewlyImported || existing.isNewlyImported,
      importBatchId: item.importBatchId || existing.importBatchId,
      viewedAt: existing.viewedAt && !item.isNewlyImported ? existing.viewedAt : undefined
    }
  } else {
    history.unshift(item)
  }

  saveHistory(history)
  return getHistory()
}

export function upsertFromImport(
  formData: OcclusionFormData,
  importSourcePath: string,
  transferSource: FormHistoryItem['transferSource'],
  opts?: { importBatchId?: string }
): FormHistoryItem[] {
  return upsertHistory(formData, undefined, {
    importSourcePath,
    transferSource,
    pendingLocalSave: true,
    isNewlyImported: true,
    importBatchId: opts?.importBatchId
  })
}

export function markAsViewed(id: string): FormHistoryItem[] {
  const history = getHistory()
  const idx = history.findIndex(h => h.id === id)
  if (idx < 0) return history
  history[idx] = { ...history[idx], viewedAt: new Date().toISOString(), isNewlyImported: false }
  saveHistory(history)
  return getHistory()
}

export function markAsSaved(id: string, filePath: string, formData: OcclusionFormData): FormHistoryItem[] {
  const history = getHistory()
  const idx = history.findIndex(h => h.id === id || h.filePath === filePath || h.filePath === `mem://${id}`)
  if (idx < 0) {
    return upsertHistory(filePath, formData)
  }
  const now = new Date().toISOString()
  const status = determineCaseStatus(formData)
  history[idx] = {
    ...history[idx],
    filePath,
    lastUpdatedAt: now,
    status,
    saved: true,
    pendingLocalSave: false,
    hasReceipt: !!formData.receipt,
    inMemoryData: undefined,
    isNewlyImported: false,
    viewedAt: history[idx].viewedAt || now
  }
  saveHistory(history)
  return getHistory()
}

export function removeHistoryItem(filePathOrId: string): FormHistoryItem[] {
  const history = getHistory().filter(h => h.filePath !== filePathOrId && h.id !== filePathOrId)
  saveHistory(history)
  return history
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}

export function generateFormId(): string {
  return `form-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getHistoryItemById(id: string): FormHistoryItem | undefined {
  return getHistory().find(h => h.id === id)
}

export function startNewImportBatch(): string {
  return nextBatchId()
}

export function groupByImportBatch(history: FormHistoryItem[]): Map<string | 'local', FormHistoryItem[]> {
  const map = new Map<string | 'local', FormHistoryItem[]>()
  for (const item of history) {
    const key = item.importBatchId || (item.pendingLocalSave && item.transferSource ? 'untracked-import' : 'local')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}
