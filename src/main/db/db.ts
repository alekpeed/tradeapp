import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { SCHEMA_SQL } from './schema'
import top100Crypto from './seed/top100-crypto.json'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const userDataDir = app.getPath('userData')
  if (!existsSync(userDataDir)) mkdirSync(userDataDir, { recursive: true })
  const dbPath = join(userDataDir, 'tradeapp.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_SQL)

  seedInstruments(db)

  return db
}

function seedInstruments(database: Database.Database): void {
  const countRow = database
    .prepare(`SELECT COUNT(*) as count FROM instruments WHERE type = 'crypto' AND is_custom = 0`)
    .get() as { count: number }
  if (countRow.count > 0) return

  const insert = database.prepare(
    `INSERT OR IGNORE INTO instruments (type, symbol, name, currency, is_custom) VALUES ('crypto', ?, ?, 'USD', 0)`
  )
  const insertMany = database.transaction((rows: { symbol: string; name: string }[]) => {
    for (const row of rows) insert.run(row.symbol, row.name)
  })
  insertMany(top100Crypto as { symbol: string; name: string }[])

  const commodities = [
    { symbol: 'XAU', name: 'Gold' },
    { symbol: 'XAG', name: 'Silver' },
    { symbol: 'WTI', name: 'Crude Oil (WTI)' },
    { symbol: 'BRENT', name: 'Crude Oil (Brent)' },
    { symbol: 'NG', name: 'Natural Gas' },
    { symbol: 'HG', name: 'Copper' },
    { symbol: 'PL', name: 'Platinum' },
    { symbol: 'PA', name: 'Palladium' },
    { symbol: 'ZC', name: 'Corn' },
    { symbol: 'ZW', name: 'Wheat' },
    { symbol: 'ZS', name: 'Soybeans' }
  ]
  const insertCommodity = database.prepare(
    `INSERT OR IGNORE INTO instruments (type, symbol, name, currency, is_custom) VALUES ('commodity', ?, ?, 'USD', 0)`
  )
  const insertCommodities = database.transaction((rows: { symbol: string; name: string }[]) => {
    for (const row of rows) insertCommodity.run(row.symbol, row.name)
  })
  insertCommodities(commodities)

  const cash = database.prepare(
    `INSERT OR IGNORE INTO instruments (type, symbol, name, currency, is_custom) VALUES ('cash', 'USD', 'US Dollar Cash', 'USD', 0)`
  )
  cash.run()
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
