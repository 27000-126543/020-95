import type { FormHistoryItem, OcclusionFormData, CaseStatus } from '@/types/form'
import { determineCaseStatus } from './stepValidator'

const HISTORY_KEY = 'occlusion_form_history'
const MAX_HISTORY = 80
const MAX_IN_MEMORY_SIZE = 12

export function getHistory(): FormHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as FormHistoryItem[]
    return data.sort((a, b) =>
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    )
  } catch {
    return []
  }
}

export function saveHistory(history: FormHistoryItem[]): void {
  try {
    const sorted = history
      .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())
    const limited = sorted.slice(0, MAX_HISTORY)
    // 控制内存存储数量：保留最近 MAX_IN_MEMORY_SIZE 个 inMemoryData
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
  opts?: { importSourcePath?: string; transferSource?: FormHistoryItem['transferSource']; pendingLocalSave?: boolean }
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
    pendingLocalSave: opts?.pendingLocalSave || !saved
  }

  const existingIdx = history.findIndex(h => h.id === id || h.filePath === filePath)
  if (existingIdx >= 0) {
    history[existingIdx] = { ...history[existingIdx], ...item }
  } else {
    history.unshift(item)
  }

  saveHistory(history)
  return getHistory()
}

export function upsertFromImport(
  formData: OcclusionFormData,
  importSourcePath: string,
  transferSource: FormHistoryItem['transferSource']
): FormHistoryItem[] {
  return upsertHistory(formData, undefined, {
    importSourcePath,
    transferSource,
    pendingLocalSave: true
  })
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
    inMemoryData: undefined
  }
  saveHistory(history)
  return getHistory()
}

export function removeHistoryItem(filePath: string): FormHistoryItem[] {
  const history = getHistory().filter(h => h.filePath !== filePath && h.id !== filePath)
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
