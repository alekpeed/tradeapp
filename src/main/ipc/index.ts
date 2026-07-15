import type Database from 'better-sqlite3'
import { registerInstrumentHandlers } from './instruments'
import { registerAccountHandlers } from './accounts'
import { registerTransactionHandlers } from './transactions'
import { registerCsvHandlers } from './csvImport'
import { registerPdfHandlers } from './pdfExport'
import { registerLotHandlers } from './lots'
import { registerNetWorthItemHandlers } from './netWorthItems'

export function registerAllIpcHandlers(db: Database.Database): void {
  registerInstrumentHandlers(db)
  registerAccountHandlers(db)
  registerTransactionHandlers(db)
  registerCsvHandlers(db)
  registerPdfHandlers()
  registerLotHandlers(db)
  registerNetWorthItemHandlers(db)
}
