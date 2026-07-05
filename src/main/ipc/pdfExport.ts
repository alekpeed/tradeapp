import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'

function wrapHtml(title: string, html: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
  th { background: #f0f0f0; }
  .gain-positive { color: #0a7a2f; }
  .gain-negative { color: #b3261e; }
</style>
</head>
<body>
<h1>${title}</h1>
${html}
</body>
</html>`
}

export function registerPdfHandlers(): void {
  ipcMain.handle('reports:exportPdf', async (event, input: { title: string; html: string }) => {
    const parentWin = BrowserWindow.fromWebContents(event.sender)
    const saveDialogOptions: Electron.SaveDialogOptions = {
      title: 'Save PDF Report',
      defaultPath: `${input.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    }
    const saveResult = parentWin
      ? await dialog.showSaveDialog(parentWin, saveDialogOptions)
      : await dialog.showSaveDialog(saveDialogOptions)
    if (saveResult.canceled || !saveResult.filePath) return { filePath: null }

    const offscreen = new BrowserWindow({ show: false, width: 900, height: 1200 })
    try {
      const fullHtml = wrapHtml(input.title, input.html)
      await offscreen.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`)
      const pdfBuffer = await offscreen.webContents.printToPDF({
        printBackground: true,
        pageSize: 'Letter'
      })
      writeFileSync(saveResult.filePath, pdfBuffer)
    } finally {
      offscreen.destroy()
    }

    return { filePath: saveResult.filePath }
  })
}
