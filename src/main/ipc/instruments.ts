import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { Instrument, InstrumentType } from '@shared/types'

function toInstrument(row: unknown): Instrument {
  const r = row as Record<string, unknown>
  return {
    id: r.id as number,
    type: r.type as InstrumentType,
    symbol: r.symbol as string,
    name: r.name as string,
    exchange: (r.exchange as string) ?? null,
    currency: r.currency as string,
    metadata: (r.metadata as string) ?? null,
    isCustom: Boolean(r.is_custom),
    manualPrice: (r.manual_price as number) ?? null,
    createdAt: r.created_at as string
  }
}

export function registerInstrumentHandlers(db: Database.Database): void {
  ipcMain.handle('instruments:list', (_event, type?: InstrumentType) => {
    const rows = type
      ? db.prepare(`SELECT * FROM instruments WHERE type = ? ORDER BY symbol`).all(type)
      : db.prepare(`SELECT * FROM instruments ORDER BY type, symbol`).all()
    return rows.map(toInstrument)
  })

  ipcMain.handle(
    'instruments:createCustom',
    (
      _event,
      input: { type: InstrumentType; symbol: string; name: string; currency: string; exchange?: string }
    ) => {
      const info = db
        .prepare(
          `INSERT INTO instruments (type, symbol, name, exchange, currency, is_custom)
           VALUES (@type, @symbol, @name, @exchange, @currency, 1)`
        )
        .run({
          type: input.type,
          symbol: input.symbol.toUpperCase(),
          name: input.name,
          exchange: input.exchange ?? null,
          currency: input.currency || 'USD'
        })
      const row = db.prepare(`SELECT * FROM instruments WHERE id = ?`).get(info.lastInsertRowid)
      return toInstrument(row)
    }
  )

  ipcMain.handle('instruments:setManualPrice', (_event, instrumentId: number, price: number | null) => {
    db.prepare(`UPDATE instruments SET manual_price = ? WHERE id = ?`).run(price, instrumentId)
  })
}
