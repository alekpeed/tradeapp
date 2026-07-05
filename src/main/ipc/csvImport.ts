import { ipcMain, dialog, BrowserWindow } from 'electron'
import type Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import Papa from 'papaparse'
import type { CsvColumnMapping, CsvImportRow, InstrumentType, TransactionType } from '@shared/types'
import { insertTransaction } from '../services/lotMatching'

function findOrCreateInstrument(
  db: Database.Database,
  type: InstrumentType,
  symbol: string
): number {
  const normalized = symbol.trim().toUpperCase()
  const existing = db
    .prepare(`SELECT id FROM instruments WHERE type = ? AND symbol = ?`)
    .get(type, normalized) as { id: number } | undefined
  if (existing) return existing.id

  const info = db
    .prepare(
      `INSERT INTO instruments (type, symbol, name, currency, is_custom) VALUES (?, ?, ?, 'USD', 1)`
    )
    .run(type, normalized, normalized)
  return Number(info.lastInsertRowid)
}

function normalizeType(raw: string): TransactionType {
  const t = raw.trim().toLowerCase()
  if (t.includes('sell')) return 'sell'
  if (t.includes('buy')) return 'buy'
  if (t.includes('dividend')) return 'dividend'
  if (t.includes('interest')) return 'interest'
  if (t.includes('split')) return 'split'
  if (t.includes('transfer') && t.includes('out')) return 'transfer_out'
  if (t.includes('transfer')) return 'transfer_in'
  if (t.includes('fee')) return 'fee'
  if (t.includes('withdraw')) return 'withdrawal'
  if (t.includes('deposit')) return 'deposit'
  return 'buy'
}

export function registerCsvHandlers(db: Database.Database): void {
  ipcMain.handle('csv:openAndParse', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      filters: [{ name: 'CSV files', extensions: ['csv'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const content = readFileSync(filePath, 'utf-8')
    const parsed = Papa.parse<CsvImportRow>(content, { header: true, skipEmptyLines: true })
    return {
      filePath,
      headers: parsed.meta.fields ?? [],
      rows: parsed.data
    }
  })

  ipcMain.handle(
    'csv:commitImport',
    (
      _event,
      input: {
        accountId: number
        defaultInstrumentType: InstrumentType
        rows: CsvImportRow[]
        mapping: CsvColumnMapping
        markEstimatedBasis: boolean
      }
    ) => {
      const errors: string[] = []
      let imported = 0

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i]
        try {
          const symbol = row[input.mapping.symbol]
          const dateRaw = row[input.mapping.date]
          const quantity = parseFloat(row[input.mapping.quantity])
          const price = parseFloat(row[input.mapping.price])
          const fees = input.mapping.fees ? parseFloat(row[input.mapping.fees] || '0') || 0 : 0
          const type = normalizeType(row[input.mapping.type] ?? 'buy')

          if (!symbol || !dateRaw || Number.isNaN(quantity) || Number.isNaN(price)) {
            errors.push(`Row ${i + 2}: missing/invalid required field`)
            continue
          }

          const instrumentId = findOrCreateInstrument(db, input.defaultInstrumentType, symbol)
          insertTransaction(db, {
            accountId: input.accountId,
            instrumentId,
            type,
            date: new Date(dateRaw).toISOString().slice(0, 10),
            quantity: Math.abs(quantity),
            price: Math.abs(price),
            fees,
            currency: 'USD',
            fxRateToUsd: 1,
            notes: input.mapping.notes ? row[input.mapping.notes] : undefined,
            source: 'csv_import',
            estimatedBasis: input.markEstimatedBasis
          })
          imported++
        } catch (err) {
          errors.push(`Row ${i + 2}: ${(err as Error).message}`)
        }
      }

      return { imported, errors }
    }
  )
}
