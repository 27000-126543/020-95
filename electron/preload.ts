import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveForm: (data: unknown) => ipcRenderer.invoke('save-form', data),
  loadForm: () => ipcRenderer.invoke('load-form'),
  loadFormByPath: (filePath: string) => ipcRenderer.invoke('load-form-by-path', filePath),
  saveReceipt: (data: unknown, originalPath?: string) =>
    ipcRenderer.invoke('save-receipt', data, originalPath),
  printForm: () => ipcRenderer.invoke('print-form'),
  exportPackage: (pkg: unknown) => ipcRenderer.invoke('export-transfer-package', pkg),
  importPackage: () => ipcRenderer.invoke('import-transfer-package'),
  savePackageForm: (data: unknown, suggestedName?: string) =>
    ipcRenderer.invoke('save-package-form', data, suggestedName)
})

export type ElectronAPI = {
  saveForm: (data: unknown) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
  loadForm: () => Promise<{ success: boolean; data?: unknown; filePath?: string; canceled?: boolean; error?: string }>
  loadFormByPath: (filePath: string) => Promise<{ success: boolean; data?: unknown; filePath?: string; error?: string }>
  saveReceipt: (data: unknown, originalPath?: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
  printForm: () => Promise<{ success: boolean }>
  exportPackage: (pkg: unknown) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
  importPackage: () => Promise<{ success: boolean; package?: unknown; filePath?: string; canceled?: boolean; error?: string }>
  savePackageForm: (data: unknown, suggestedName?: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
