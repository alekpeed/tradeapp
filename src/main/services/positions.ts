import type Database from 'better-sqlite3'
import type { Position, RealizedGainLoss } from '@shared/types'

export function getPositions(db: Database.Database, accountId?: number): Position[] {
  const rows = db
    .prepare(
      `SELECT l.account_id as accountId, l.instrument_id as instrumentId,
              i.symbol, i.name, i.type, i.manual_price as manualPrice,
              SUM(l.remaining_quantity) as quantity,
              SUM(l.remaining_quantity * l.cost_basis_per_unit) as costBasisTotal
       FROM lots l
       JOIN instruments i ON i.id = l.instrument_id
       WHERE l.remaining_quantity > 1e-9
         ${accountId ? 'AND l.account_id = @accountId' : ''}
       GROUP BY l.account_id, l.instrument_id
       ORDER BY i.symbol`
    )
    .all({ accountId }) as Array<{
    accountId: number
    instrumentId: number
    symbol: string
    name: string
    type: Position['type']
    manualPrice: number | null
    quantity: number
    costBasisTotal: number
  }>

  return rows.map((r) => ({
    accountId: r.accountId,
    instrumentId: r.instrumentId,
    symbol: r.symbol,
    name: r.name,
    type: r.type,
    quantity: r.quantity,
    costBasisTotal: r.costBasisTotal,
    avgCostPerUnit: r.quantity > 0 ? r.costBasisTotal / r.quantity : 0,
    manualPrice: r.manualPrice
  }))
}

export function getRealizedGains(
  db: Database.Database,
  filters: { accountId?: number; instrumentId?: number; year?: number } = {}
): RealizedGainLoss[] {
  const conditions: string[] = []
  const params: Record<string, unknown> = {}
  if (filters.accountId) {
    conditions.push('rg.account_id = @accountId')
    params.accountId = filters.accountId
  }
  if (filters.instrumentId) {
    conditions.push('rg.instrument_id = @instrumentId')
    params.instrumentId = filters.instrumentId
  }
  if (filters.year) {
    conditions.push(`strftime('%Y', rg.sold_date) = @year`)
    params.year = String(filters.year)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = db
    .prepare(
      `SELECT rg.id, rg.account_id as accountId, rg.instrument_id as instrumentId,
              rg.sell_transaction_id as sellTransactionId, rg.lot_id as lotId,
              rg.quantity, rg.proceeds, rg.cost_basis as costBasis, rg.gain, rg.term,
              rg.holding_period_days as holdingPeriodDays, rg.acquired_date as acquiredDate,
              rg.sold_date as soldDate
       FROM realized_gains rg
       ${where}
       ORDER BY rg.sold_date DESC`
    )
    .all(params) as RealizedGainLoss[]

  return rows
}
