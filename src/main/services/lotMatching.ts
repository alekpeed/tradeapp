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

interface TxnRow {
  id: number
  account_id: number
  instrument_id: number
  type: TransactionType
  date: string
  quantity: number
  amount: number
  estimated_basis: number
  specific_lot_id: number | null
}

interface OpenLotRow {
  id: number
  acquired_date: string
  remaining_quantity: number
  cost_basis_per_unit: number
}

function holdingPeriod(acquiredDate: string, soldDate: string): { term: GainTerm; days: number } {
  const days = Math.floor(
    (new Date(soldDate).getTime() - new Date(acquiredDate).getTime()) / MS_PER_DAY
  )
  return { term: days > 365 ? 'long' : 'short', days }
}

function computeAmount(input: NewTransactionInput): number {
  return (
    input.quantity * input.price + (OPENING_TYPES.includes(input.type) ? input.fees : -input.fees)
  )
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
        `SELECT id, acquired_date, remaining_quantity, cost_basis_per_unit
         FROM lots WHERE id = ? AND account_id = ? AND instrument_id = ? AND remaining_quantity > 0`
      )
      .get(specificLotId, accountId, instrumentId) as OpenLotRow | undefined
    return row ? [row] : []
  }

  const order = method === 'lifo' ? 'DESC' : 'ASC'
  return db
    .prepare(
      `SELECT id, acquired_date, remaining_quantity, cost_basis_per_unit
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

/** A buy/transfer_in opens exactly one lot. The lot's id IS the opening transaction's id,
 *  so lot identity survives rebuilds and stored specific-lot references stay valid. */
function applyOpeningEffect(db: Database.Database, txn: TxnRow): void {
  db.prepare(
    `INSERT INTO lots
      (id, account_id, instrument_id, open_transaction_id, acquired_date, original_quantity,
       remaining_quantity, cost_basis_per_unit, cost_basis_total, estimated_basis)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    txn.id,
    txn.account_id,
    txn.instrument_id,
    txn.id,
    txn.date,
    txn.quantity,
    txn.quantity,
    txn.amount / txn.quantity,
    txn.amount,
    txn.estimated_basis
  )
}

function applyClosingEffect(db: Database.Database, txn: TxnRow): void {
  const account = db
    .prepare(`SELECT cost_basis_method FROM accounts WHERE id = ?`)
    .get(txn.account_id) as { cost_basis_method: CostBasisMethod } | undefined
  const method: CostBasisMethod =
    (txn.specific_lot_id ? 'specific_lot' : account?.cost_basis_method) ?? 'fifo'

  const openLots = fetchOpenLots(db, txn.account_id, txn.instrument_id, method, txn.specific_lot_id)
  const availableQty = openLots.reduce((sum, l) => sum + l.remaining_quantity, 0)
  if (availableQty + 1e-9 < txn.quantity) {
    throw new Error(
      `Cannot sell ${txn.quantity} on ${txn.date}: only ${availableQty} open units available for this instrument/account`
    )
  }

  const avgCost = method === 'average' ? weightedAverageCostPerUnit(openLots) : null
  const proceedsPerUnit = txn.amount / txn.quantity
  let remainingToSell = txn.quantity

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
    const { term, days } = holdingPeriod(lot.acquired_date, txn.date)

    insertGain.run({
      accountId: txn.account_id,
      instrumentId: txn.instrument_id,
      sellTransactionId: txn.id,
      lotId: lot.id,
      quantity: qtyFromLot,
      proceeds,
      costBasis,
      gain: proceeds - costBasis,
      term,
      holdingPeriodDays: days,
      acquiredDate: lot.acquired_date,
      soldDate: txn.date
    })

    const newRemaining = lot.remaining_quantity - qtyFromLot
    updateLot.run(newRemaining, newRemaining, txn.date, lot.id)
    remainingToSell -= qtyFromLot
  }
}

function applyEffects(db: Database.Database, txn: TxnRow): void {
  if (OPENING_TYPES.includes(txn.type)) applyOpeningEffect(db, txn)
  else if (CLOSING_TYPES.includes(txn.type)) applyClosingEffect(db, txn)
}

/**
 * Wipe and replay all lots and realized gains for one account+instrument pair, in
 * date order. Called after any edit or delete so downstream profit/loss always
 * reflects the corrected history. Throws (rolling back the enclosing transaction)
 * if the new history would sell more than is owned at any point.
 */
export function rebuildPair(db: Database.Database, accountId: number, instrumentId: number): void {
  db.prepare(`DELETE FROM realized_gains WHERE account_id = ? AND instrument_id = ?`).run(
    accountId,
    instrumentId
  )
  db.prepare(`DELETE FROM lots WHERE account_id = ? AND instrument_id = ?`).run(
    accountId,
    instrumentId
  )
  const rows = db
    .prepare(
      `SELECT id, account_id, instrument_id, type, date, quantity, amount, estimated_basis, specific_lot_id
       FROM transactions WHERE account_id = ? AND instrument_id = ?
       ORDER BY date ASC, id ASC`
    )
    .all(accountId, instrumentId) as TxnRow[]
  for (const row of rows) applyEffects(db, row)
}

function auditLog(
  db: Database.Database,
  action: 'create' | 'update' | 'delete',
  transactionId: number,
  oldData: unknown,
  newData: unknown
): void {
  db.prepare(
    `INSERT INTO audit_log (action, transaction_id, old_data, new_data) VALUES (?, ?, ?, ?)`
  ).run(
    action,
    transactionId,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null
  )
}

export function insertTransaction(db: Database.Database, input: NewTransactionInput): Transaction {
  const amount = computeAmount(input)

  const run = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO transactions
          (account_id, instrument_id, type, date, quantity, price, amount, fees, currency, fx_rate_to_usd,
           notes, tags, source, estimated_basis, specific_lot_id)
         VALUES (@accountId, @instrumentId, @type, @date, @quantity, @price, @amount, @fees, @currency, @fxRateToUsd,
           @notes, @tags, @source, @estimatedBasis, @specificLotId)`
      )
      .run({
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

    const row = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(transactionId) as Record<
      string,
      unknown
    >
    applyEffects(db, row as unknown as TxnRow)
    auditLog(db, 'create', transactionId, null, row)
    return row
  })

  return rowToTransaction(run())
}

export function updateTransaction(
  db: Database.Database,
  transactionId: number,
  input: NewTransactionInput
): Transaction {
  const amount = computeAmount(input)

  const run = db.transaction(() => {
    const oldRow = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(transactionId) as
      | (Record<string, unknown> & { account_id: number; instrument_id: number })
      | undefined
    if (!oldRow) throw new Error(`Transaction #${transactionId} not found`)

    db.prepare(
      `UPDATE transactions SET
        account_id = @accountId, instrument_id = @instrumentId, type = @type, date = @date,
        quantity = @quantity, price = @price, amount = @amount, fees = @fees,
        currency = @currency, fx_rate_to_usd = @fxRateToUsd, notes = @notes, tags = @tags,
        estimated_basis = @estimatedBasis, specific_lot_id = @specificLotId
       WHERE id = @id`
    ).run({
      id: transactionId,
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
      estimatedBasis: input.estimatedBasis ? 1 : 0,
      specificLotId: input.specificLotId ?? null
    })

    rebuildPair(db, oldRow.account_id, oldRow.instrument_id)
    if (oldRow.account_id !== input.accountId || oldRow.instrument_id !== input.instrumentId) {
      rebuildPair(db, input.accountId, input.instrumentId)
    }

    const newRow = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(transactionId)
    auditLog(db, 'update', transactionId, oldRow, newRow)
    return newRow
  })

  return rowToTransaction(run())
}

export function deleteTransaction(db: Database.Database, transactionId: number): void {
  const run = db.transaction(() => {
    const oldRow = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(transactionId) as
      | (Record<string, unknown> & { account_id: number; instrument_id: number })
      | undefined
    if (!oldRow) throw new Error(`Transaction #${transactionId} not found`)

    // Wipe derived rows first: lots and realized_gains hold foreign keys into
    // transactions, so the row can't be deleted while they still reference it.
    db.prepare(`DELETE FROM realized_gains WHERE account_id = ? AND instrument_id = ?`).run(
      oldRow.account_id,
      oldRow.instrument_id
    )
    db.prepare(`DELETE FROM lots WHERE account_id = ? AND instrument_id = ?`).run(
      oldRow.account_id,
      oldRow.instrument_id
    )
    db.prepare(`DELETE FROM transactions WHERE id = ?`).run(transactionId)
    rebuildPair(db, oldRow.account_id, oldRow.instrument_id)
    auditLog(db, 'delete', transactionId, oldRow, null)
  })

  run()
}
