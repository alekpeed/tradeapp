import type Database from 'better-sqlite3'
import type {
  CostBasisMethod,
  GainTerm,
  NewTransactionInput,
  Transaction,
  TransactionType
} from '@shared/types'
import { rowToTransaction } from './mappers'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const OPENING_TYPES: TransactionType[] = ['buy', 'transfer_in']
const CLOSING_TYPES: TransactionType[] = ['sell', 'transfer_out']

interface OpenLotRow {
  id: number
  acquired_date: string
  remaining_quantity: number
  cost_basis_per_unit: number
  estimated_basis: number
}

function holdingPeriod(acquiredDate: string, soldDate: string): { term: GainTerm; days: number } {
  const days = Math.floor(
    (new Date(soldDate).getTime() - new Date(acquiredDate).getTime()) / MS_PER_DAY
  )
  return { term: days > 365 ? 'long' : 'short', days }
}

function fetchOpenLots(
  db: Database.Database,
  accountId: number,
  instrumentId: number,
  method: CostBasisMethod,
  specificLotId?: number | null
): OpenLotRow[] {
  if (method === 'specific_lot' && specificLotId) {
    const row = db
      .prepare(
        `SELECT id, acquired_date, remaining_quantity, cost_basis_per_unit, estimated_basis
         FROM lots WHERE id = ? AND account_id = ? AND instrument_id = ? AND remaining_quantity > 0`
      )
      .get(specificLotId, accountId, instrumentId) as OpenLotRow | undefined
    return row ? [row] : []
  }

  const order = method === 'lifo' ? 'DESC' : 'ASC'
  return db
    .prepare(
      `SELECT id, acquired_date, remaining_quantity, cost_basis_per_unit, estimated_basis
       FROM lots
       WHERE account_id = ? AND instrument_id = ? AND remaining_quantity > 0
       ORDER BY acquired_date ${order}, id ${order}`
    )
    .all(accountId, instrumentId) as OpenLotRow[]
}

/**
 * Average-cost sales use each open lot's own acquisition date (so holding-period/term stays
 * accurate) but re-price every consumed unit at the account-wide weighted average cost,
 * matching how brokerages report average-cost-method sales.
 */
function weightedAverageCostPerUnit(lots: OpenLotRow[]): number {
  const totalQty = lots.reduce((sum, l) => sum + l.remaining_quantity, 0)
  if (totalQty === 0) return 0
  const totalCost = lots.reduce((sum, l) => sum + l.remaining_quantity * l.cost_basis_per_unit, 0)
  return totalCost / totalQty
}

export function insertTransaction(db: Database.Database, input: NewTransactionInput): Transaction {
  const amount = input.quantity * input.price + (OPENING_TYPES.includes(input.type) ? input.fees : -input.fees)

  const insertTxn = db.prepare(
    `INSERT INTO transactions
      (account_id, instrument_id, type, date, quantity, price, amount, fees, currency, fx_rate_to_usd,
       notes, tags, source, estimated_basis, specific_lot_id)
     VALUES (@accountId, @instrumentId, @type, @date, @quantity, @price, @amount, @fees, @currency, @fxRateToUsd,
       @notes, @tags, @source, @estimatedBasis, @specificLotId)`
  )

  const run = db.transaction(() => {
    const info = insertTxn.run({
      accountId: input.accountId,
      instrumentId: input.instrumentId,
      type: input.type,
      date: input.date,
      quantity: input.quantity,
      price: input.price,
      amount,
      fees: input.fees,
      currency: input.currency,
      fxRateToUsd: input.fxRateToUsd,
      notes: input.notes ?? null,
      tags: input.tags ?? null,
      source: input.source ?? 'manual',
      estimatedBasis: input.estimatedBasis ? 1 : 0,
      specificLotId: input.specificLotId ?? null
    })
    const transactionId = Number(info.lastInsertRowid)

    if (OPENING_TYPES.includes(input.type)) {
      openLot(db, input, transactionId, amount)
    } else if (CLOSING_TYPES.includes(input.type)) {
      closeLots(db, input, transactionId, amount)
    }

    return db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(transactionId)
  })

  return rowToTransaction(run())
}

function openLot(
  db: Database.Database,
  input: NewTransactionInput,
  transactionId: number,
  costBasisTotal: number
): void {
  db.prepare(
    `INSERT INTO lots
      (account_id, instrument_id, open_transaction_id, acquired_date, original_quantity,
       remaining_quantity, cost_basis_per_unit, cost_basis_total, estimated_basis)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.accountId,
    input.instrumentId,
    transactionId,
    input.date,
    input.quantity,
    input.quantity,
    costBasisTotal / input.quantity,
    costBasisTotal,
    input.estimatedBasis ? 1 : 0
  )
}

function closeLots(
  db: Database.Database,
  input: NewTransactionInput,
  transactionId: number,
  saleAmount: number
): void {
  const account = db
    .prepare(`SELECT cost_basis_method FROM accounts WHERE id = ?`)
    .get(input.accountId) as { cost_basis_method: CostBasisMethod } | undefined
  const method: CostBasisMethod =
    (input.specificLotId ? 'specific_lot' : account?.cost_basis_method) ?? 'fifo'

  const openLots = fetchOpenLots(db, input.accountId, input.instrumentId, method, input.specificLotId)
  const availableQty = openLots.reduce((sum, l) => sum + l.remaining_quantity, 0)
  if (availableQty + 1e-9 < input.quantity) {
    throw new Error(
      `Cannot sell ${input.quantity}: only ${availableQty} open units available for this instrument/account`
    )
  }

  const avgCost = method === 'average' ? weightedAverageCostPerUnit(openLots) : null
  const proceedsPerUnit = saleAmount / input.quantity
  let remainingToSell = input.quantity

  const updateLot = db.prepare(
    `UPDATE lots SET remaining_quantity = ?, closed_at = CASE WHEN ? <= 0 THEN ? ELSE closed_at END WHERE id = ?`
  )
  const insertGain = db.prepare(
    `INSERT INTO realized_gains
      (account_id, instrument_id, sell_transaction_id, lot_id, quantity, proceeds, cost_basis, gain,
       term, holding_period_days, acquired_date, sold_date)
     VALUES (@accountId, @instrumentId, @sellTransactionId, @lotId, @quantity, @proceeds, @costBasis, @gain,
       @term, @holdingPeriodDays, @acquiredDate, @soldDate)`
  )

  for (const lot of openLots) {
    if (remainingToSell <= 1e-9) break
    const qtyFromLot = Math.min(lot.remaining_quantity, remainingToSell)
    const costPerUnit = avgCost ?? lot.cost_basis_per_unit
    const costBasis = qtyFromLot * costPerUnit
    const proceeds = qtyFromLot * proceedsPerUnit
    const { term, days } = holdingPeriod(lot.acquired_date, input.date)

    insertGain.run({
      accountId: input.accountId,
      instrumentId: input.instrumentId,
      sellTransactionId: transactionId,
      lotId: lot.id,
      quantity: qtyFromLot,
      proceeds,
      costBasis,
      gain: proceeds - costBasis,
      term,
      holdingPeriodDays: days,
      acquiredDate: lot.acquired_date,
      soldDate: input.date
    })

    const newRemaining = lot.remaining_quantity - qtyFromLot
    updateLot.run(newRemaining, newRemaining, input.date, lot.id)
    remainingToSell -= qtyFromLot
  }
}
