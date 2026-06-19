import type { FormHistoryItem, OcclusionFormData } from '@/types/form'

const HISTORY_KEY = 'occlusion_form_history'
const MAX_HISTORY = 50

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
      .slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sorted))
  } catch (err) {
    console.error('Failed to save history:', err)
  }
}

export function upsertHistory(
  filePath: string,
  formData: OcclusionFormData
): FormHistoryItem[] {
  const history = getHistory()
  const now = new Date().toISOString()
  const id = formData.id || `form-${Date.now()}`

  const existingIdx = history.findIndex(h => h.filePath === filePath)
  const item: FormHistoryItem = {
    id,
    filePath,
    patientCode: formData.patientCode,
    restorationType: formData.restorationType,
    hasReceipt: !!formData.receipt,
    lastUpdatedAt: now,
    dentistName: formData.dentistName,
    priority: formData.priority
  }

  if (existingIdx >= 0) {
    history[existingIdx] = item
  } else {
    history.unshift(item)
  }

  saveHistory(history)
  return getHistory()
}

export function removeHistoryItem(filePath: string): FormHistoryItem[] {
  const history = getHistory().filter(h => h.filePath !== filePath)
  saveHistory(history)
  return history
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}

export function generateFormId(): string {
  return `form-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
