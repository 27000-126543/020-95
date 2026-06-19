import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveForm: (data: unknown) => ipcRenderer.invoke('save-form', data),
  loadForm: () => ipcRenderer.invoke('load-form'),
  saveReceipt: (data: unknown, originalPath?: string) =>
    ipcRenderer.invoke('save-receipt', data, originalPath),
  printForm: () => ipcRenderer.invoke('print-form')
})

export type ElectronAPI = {
  saveForm: (data: unknown) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
  loadForm: () => Promise<{ success: boolean; data?: unknown; filePath?: string; canceled?: boolean; error?: string }>
  saveReceipt: (data: unknown, originalPath?: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
  printForm: () => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
