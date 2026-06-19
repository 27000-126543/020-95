export interface ElectronAPI {
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

export {}
