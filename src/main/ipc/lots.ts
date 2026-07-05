import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { OpenLotSummary } from '@shared/types'

export function registerLotHandlers(db: Database.Database): void {
  ipcMain.handle('lots:openList', (_event, accountId: number, instrumentId: number) => {
    const rows = db
      .prepare(
        `SELECT id, acquired_date as acquiredDate, remaining_quantity as remainingQuantity,
                cost_basis_per_unit as costBasisPerUnit, estimated_basis as estimatedBasis
         FROM lots
         WHERE account_id = ? AND instrument_id = ? AND remaining_quantity > 1e-9
         ORDER BY acquired_date ASC`
      )
      .all(accountId, instrumentId) as Array<
      Omit<OpenLotSummary, 'estimatedBasis'> & { estimatedBasis: number }
    >
    return rows.map((r) => ({ ...r, estimatedBasis: Boolean(r.estimatedBasis) }))
  })
}
