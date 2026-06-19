import { useState, useCallback, useRef } from 'react'
import type { OcclusionFormData, TechnicianReceipt } from '@/types/form'
import { createEmptyForm, createEmptyReceipt, migrateFormData } from '@/utils/formUtils'

export function useFormStore() {
  const [formData, setFormData] = useState<OcclusionFormData>(() => createEmptyForm())
  const [loadedFilePath, setLoadedFilePath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const lastSavedSnapshot = useRef<string>('')

  const snapshot = (data: OcclusionFormData) => JSON.stringify(data)

  const updateFormData = useCallback((updates: Partial<OcclusionFormData>) => {
    setFormData((prev: OcclusionFormData) => {
      const next = { ...prev, ...updates }
      setIsDirty(snapshot(next) !== lastSavedSnapshot.current)
      return next
    })
  }, [])

  const updateSection = useCallback(<K extends keyof OcclusionFormData>(
    section: K,
    updates: Partial<OcclusionFormData[K]>
  ) => {
    setFormData((prev: OcclusionFormData) => {
      const next = {
        ...prev,
        [section]: { ...(prev[section] as Record<string, unknown>), ...updates }
      }
      setIsDirty(snapshot(next) !== lastSavedSnapshot.current)
      return next
    })
  }, [])

  const resetForm = useCallback(() => {
    const empty = createEmptyForm()
    setFormData(empty)
    setLoadedFilePath(null)
    lastSavedSnapshot.current = snapshot(empty)
    setIsDirty(false)
  }, [])

  const loadForm = useCallback((data: OcclusionFormData, filePath: string) => {
    const migrated = migrateFormData(data)
    setFormData(migrated)
    setLoadedFilePath(filePath)
    lastSavedSnapshot.current = snapshot(migrated)
    setIsDirty(false)
  }, [])

  const markSaved = useCallback((filePath?: string) => {
    setFormData(prev => {
      lastSavedSnapshot.current = snapshot(prev)
      return prev
    })
    if (filePath) setLoadedFilePath(filePath)
    setIsDirty(false)
  }, [])

  const updateReceipt = useCallback((receipt: TechnicianReceipt) => {
    setFormData((prev: OcclusionFormData) => {
      const next = { ...prev, receipt }
      setIsDirty(snapshot(next) !== lastSavedSnapshot.current)
      return next
    })
  }, [])

  const clearReceipt = useCallback(() => {
    setFormData((prev: OcclusionFormData) => {
      const { receipt, ...rest } = prev
      const next = rest as OcclusionFormData
      setIsDirty(snapshot(next) !== lastSavedSnapshot.current)
      return next
    })
  }, [])

  const addReceipt = useCallback(() => {
    if (!formData.receipt) {
      setFormData((prev: OcclusionFormData) => {
        const next = { ...prev, receipt: createEmptyReceipt() }
        setIsDirty(snapshot(next) !== lastSavedSnapshot.current)
        return next
      })
    }
  }, [formData.receipt])

  return {
    formData,
    loadedFilePath,
    isDirty,
    updateFormData,
    updateSection,
    resetForm,
    loadForm,
    updateReceipt,
    clearReceipt,
    addReceipt,
    markSaved,
    setLoadedFilePath,
    setFormData
  }
}

export type FormStore = ReturnType<typeof useFormStore>
