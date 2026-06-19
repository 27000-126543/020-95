import { useState, useCallback } from 'react'
import type { OcclusionFormData, TechnicianReceipt } from '@/types/form'
import { createEmptyForm, createEmptyReceipt } from '@/utils/formUtils'

export function useFormStore() {
  const [formData, setFormData] = useState<OcclusionFormData>(createEmptyForm())
  const [loadedFilePath, setLoadedFilePath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const updateFormData = useCallback((updates: Partial<OcclusionFormData>) => {
    setFormData((prev: OcclusionFormData) => ({ ...prev, ...updates }))
    setIsDirty(true)
  }, [])

  const updateSection = useCallback(<K extends keyof OcclusionFormData>(
    section: K,
    updates: Partial<OcclusionFormData[K]>
  ) => {
    setFormData((prev: OcclusionFormData) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown>), ...updates }
    }))
    setIsDirty(true)
  }, [])

  const resetForm = useCallback(() => {
    setFormData(createEmptyForm())
    setLoadedFilePath(null)
    setIsDirty(false)
  }, [])

  const loadForm = useCallback((data: OcclusionFormData, filePath: string) => {
    setFormData(data)
    setLoadedFilePath(filePath)
    setIsDirty(false)
  }, [])

  const updateReceipt = useCallback((receipt: TechnicianReceipt) => {
    setFormData((prev: OcclusionFormData) => ({
      ...prev,
      receipt
    }))
    setIsDirty(true)
  }, [])

  const clearReceipt = useCallback(() => {
    setFormData((prev: OcclusionFormData) => {
      const { receipt, ...rest } = prev
      return rest as OcclusionFormData
    })
    setIsDirty(true)
  }, [])

  const addReceipt = useCallback(() => {
    if (!formData.receipt) {
      setFormData((prev: OcclusionFormData) => ({
        ...prev,
        receipt: createEmptyReceipt()
      }))
      setIsDirty(true)
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
    setIsDirty
  }
}

export type FormStore = ReturnType<typeof useFormStore>
