export interface ElectronAPI {
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
