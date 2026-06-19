import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    backgroundColor: '#f8fafc',
    title: '口腔咬合交接单'
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
  mainWindow = null
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

app.whenReady().then(createWindow)

ipcMain.handle('save-form', async (_event, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '保存咬合交接单',
      defaultPath: `咬合交接单_${data.patientCode}_${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }]
    })

    if (!result.canceled && result.filePath) {
      const saveData = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      fs.writeFileSync(result.filePath, JSON.stringify(saveData, null, 2), 'utf-8')
      return { success: true, filePath: result.filePath }
    }
    return { success: false, canceled: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('load-form', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '打开咬合交接单',
      filters: [{ name: 'JSON 文件', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8')
      const data = JSON.parse(content)
      return { success: true, data, filePath: result.filePaths[0] }
    }
    return { success: false, canceled: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('save-receipt', async (_event, data, originalPath) => {
  try {
    const defaultPath = originalPath
      ? originalPath.replace('.json', '_回执.json')
      : `咬合回执_${data.patientCode}_${new Date().toISOString().slice(0, 10)}.json`

    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '保存技工回执',
      defaultPath,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }]
    })

    if (!result.canceled && result.filePath) {
      const saveData = {
        ...data,
        receiptCreatedAt: new Date().toISOString()
      }
      fs.writeFileSync(result.filePath, JSON.stringify(saveData, null, 2), 'utf-8')
      return { success: true, filePath: result.filePath }
    }
    return { success: false, canceled: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('print-form', async () => {
  if (mainWindow) {
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
      color: true,
      margins: { marginType: 'printableArea' }
    })
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('load-form-by-path', async (_event, filePath: string) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' }
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)
    return { success: true, data, filePath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('export-transfer-package', async (_event, pkg: unknown) => {
  try {
    const anyPkg = pkg as Record<string, unknown>
    const patientCode = (anyPkg.formData as Record<string, unknown>)?.patientCode ?? 'unknown'
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出交接包',
      defaultPath: `交接包_${patientCode}_${new Date().toISOString().slice(0, 10)}.ocp.json`,
      filters: [{ name: '咬合交接包', extensions: ['ocp.json', 'json'] }]
    })
    if (!result.canceled && result.filePath) {
      const savePkg = {
        ...pkg,
        exportedAt: new Date().toISOString()
      }
      fs.writeFileSync(result.filePath, JSON.stringify(savePkg, null, 2), 'utf-8')
      return { success: true, filePath: result.filePath }
    }
    return { success: false, canceled: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('import-transfer-package', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '导入交接包',
      filters: [{ name: '咬合交接包 / JSON', extensions: ['ocp.json', 'json'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8')
      const pkg = JSON.parse(content)
      return { success: true, package: pkg, filePath: result.filePaths[0] }
    }
    return { success: false, canceled: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('save-package-form', async (_event, data, suggestedName) => {
  try {
    const name = suggestedName || `咬合交接单_${new Date().toISOString().slice(0, 10)}.json`
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '保存交接单',
      defaultPath: name,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }]
    })
    if (!result.canceled && result.filePath) {
      const saveData = {
        ...data,
        createdAt: (data as Record<string, unknown>)?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      fs.writeFileSync(result.filePath, JSON.stringify(saveData, null, 2), 'utf-8')
      return { success: true, filePath: result.filePath }
    }
    return { success: false, canceled: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})
