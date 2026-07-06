import { app, ipcMain, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '@shared/ipc'

function broadcast(status: UpdateStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:status', status)
  }
}

/**
 * electron-updater requires a packaged, published build (it reads
 * app-update.yml, which only exists inside a real electron-builder output).
 * Running it under `npm run dev` logs noisy, meaningless errors, so the
 * whole feature is a no-op there.
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    ipcMain.handle('updater:getVersion', () => app.getVersion())
    ipcMain.handle('updater:checkNow', () => {
      broadcast({ state: 'not-available' })
    })
    ipcMain.handle('updater:restartAndInstall', () => {})
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => broadcast({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => broadcast({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => broadcast({ state: 'not-available' }))
  autoUpdater.on('download-progress', (progress) =>
    broadcast({ state: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => broadcast({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (err) => broadcast({ state: 'error', message: err.message }))

  ipcMain.handle('updater:getVersion', () => app.getVersion())
  ipcMain.handle('updater:checkNow', () => autoUpdater.checkForUpdates().catch(() => {}))
  ipcMain.handle('updater:restartAndInstall', () => autoUpdater.quitAndInstall())

  // Quiet startup check — errors (e.g. no internet) are swallowed here since
  // this wasn't a check the user explicitly asked for.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 5000)
}
