import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { NewTransactionInput } from '@shared/types'
import { deleteTransaction, insertTransaction, updateTransaction } from '../services/lotMatching'
import { rowToTransaction } from '../services/mappers'
import { getPositions, getRealizedGains } from '../services/positions'

export function registerTransactionHandlers(db: Database.Database): void {
  ipcMain.handle(
    'transactions:list',
    (_event, filters?: { accountId?: number; instrumentId?: number }) => {
      const conditions: string[] = []
      const params: Record<string, unknown> = {}
      if (filters?.accountId) {
        conditions.push('account_id = @accountId')
        params.accountId = filters.accountId
      }
      if (filters?.instrumentId) {
        conditions.push('instrument_id = @instrumentId')
        params.instrumentId = filters.instrumentId
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
      const rows = db
        .prepare(`SELECT * FROM transactions ${where} ORDER BY date DESC, id DESC`)
        .all(params)
      return rows.map(rowToTransaction)
    }
  )

  ipcMain.handle('transactions:create', (_event, input: NewTransactionInput) => {
    return insertTransaction(db, input)
  })

  ipcMain.handle('transactions:update', (_event, id: number, input: NewTransactionInput) => {
    return updateTransaction(db, id, input)
  })

  ipcMain.handle('transactions:delete', (_event, id: number) => {
    deleteTransaction(db, id)
  })

  ipcMain.handle('positions:list', (_event, accountId?: number) => {
    return getPositions(db, accountId)
  })

  ipcMain.handle(
    'realizedGains:list',
    (_event, filters?: { accountId?: number; instrumentId?: number; year?: number }) => {
      return getRealizedGains(db, filters ?? {})
    }
  )
}
