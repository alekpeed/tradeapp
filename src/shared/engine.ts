// Platform-neutral lot-matching / P&L engine.
//
// This is the single source of truth for how transactions become open lots and
// realized gains — extracted from the Electron/SQLite service so the SAME math
// runs on desktop (over SQLite) and on web/native (over Firestore). It has NO
// dependency on any datastore: callers map their stored rows onto the plain
// shapes below, call `replayPair`, and write the results back however they store.
//
// Fidelity note: this mirrors the original SQLite implementation exactly —
// lot id == opening transaction id, FIFO/LIFO ordering by (acquiredDate, id),
// average-cost re-pricing at the account-wide weighted average while keeping each
// lot's own acquisition date for term, split scaling of remaining qty / per-unit
// basis, and the oversell guard. Changing this changes P&L everywhere.
import type { CostBasisMethod, GainTerm, TransactionType } from './types'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const OPENING_TYPES: TransactionType[] = ['buy', 'transfer_in']
const CLOSING_TYPES: TransactionType[] = ['sell', 'transfer_out']

/** The minimal transaction fields the replay needs (datastore-agnostic). */
export interface EngineTransaction {
  id: number
  type: TransactionType
  date: string
  quantity: number
  amount: number
  estimatedBasis: boolean
  specificLotId: number | null
}

export interface EngineLot {
  id: number
  openTransactionId: number
  acquiredDate: string
  originalQuantity: number
  remainingQuantity: number
  costBasisPerUnit: number
  costBasisTotal: number
  estimatedBasis: boolean
  closedAt: string | null
}

export interface EngineGain {
  sellTransactionId: number
  lotId: number
  quantity: number
  proceeds: number
  costBasis: number
  gain: number
  term: GainTerm
  holdingPeriodDays: number
  acquiredDate: string
  soldDate: string
}

export interface ReplayResult {
  lots: EngineLot[]
  gains: EngineGain[]
}

/** Holding period in whole days; >365 days is long-term (matches original). */
export function holdingPeriod(
  acquiredDate: string,
  soldDate: string
): { term: GainTerm; days: number } {
  const days = Math.floor(
    (new Date(soldDate).getTime() - new Date(acquiredDate).getTime()) / MS_PER_DAY
  )
  return { term: days > 365 ? 'long' : 'short', days }
}

/** amount = quantity*price, with fees added to cost on opens and netted out of proceeds on closes. */
export function computeAmount(input: {
  type: TransactionType
  quantity: number
  price: number
  fees: number
}): number {
  return (
    input.quantity * input.price + (OPENING_TYPES.includes(input.type) ? input.fees : -input.fees)
  )
}

function weightedAverageCostPerUnit(lots: EngineLot[]): number {
  const totalQty = lots.reduce((sum, l) => sum + l.remainingQuantity, 0)
  if (totalQty === 0) return 0
  const totalCost = lots.reduce((sum, l) => sum + l.remainingQuantity * l.costBasisPerUnit, 0)
  return totalCost / totalQty
}

/**
 * Open lots eligible to satisfy a close, in consumption order. specific_lot picks
 * exactly one lot; otherwise ordered by (acquiredDate, id) ascending for FIFO and
 * average, descending for LIFO. Returns references into `lots` so callers mutate
 * remaining quantities in place.
 */
function openLotsFor(
  lots: EngineLot[],
  method: CostBasisMethod,
  specificLotId: number | null
): EngineLot[] {
  const open = lots.filter((l) => l.remainingQuantity > 0)
  if (method === 'specific_lot' && specificLotId != null) {
    const lot = open.find((l) => l.id === specificLotId)
    return lot ? [lot] : []
  }
  const dir = method === 'lifo' ? -1 : 1
  return open.sort((a, b) => {
    if (a.acquiredDate !== b.acquiredDate) return a.acquiredDate < b.acquiredDate ? -dir : dir
    return (a.id - b.id) * dir
  })
}

/**
 * Replay every transaction for ONE account+instrument pair, in (date, id) order,
 * into the resulting open lots and realized gains. Pure and deterministic.
 * Throws (the way the SQLite version rolled back) if the history sells more than
 * is held at any point.
 */
export function replayPair(
  transactions: EngineTransaction[],
  accountMethod: CostBasisMethod
): ReplayResult {
  const ordered = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return a.id - b.id
  })

  const lots: EngineLot[] = []
  const gains: EngineGain[] = []

  for (const txn of ordered) {
    if (OPENING_TYPES.includes(txn.type)) {
      // A buy/transfer_in opens exactly one lot whose id IS the opening txn id, so
      // lot identity survives rebuilds and stored specific-lot references stay valid.
      lots.push({
        id: txn.id,
        openTransactionId: txn.id,
        acquiredDate: txn.date,
        originalQuantity: txn.quantity,
        remainingQuantity: txn.quantity,
        costBasisPerUnit: txn.amount / txn.quantity,
        costBasisTotal: txn.amount,
        estimatedBasis: txn.estimatedBasis,
        closedAt: null
      })
    } else if (CLOSING_TYPES.includes(txn.type)) {
      const method: CostBasisMethod = txn.specificLotId != null ? 'specific_lot' : accountMethod
      const open = openLotsFor(lots, method, txn.specificLotId)
      const availableQty = open.reduce((sum, l) => sum + l.remainingQuantity, 0)
      if (availableQty + 1e-9 < txn.quantity) {
        throw new Error(
          `Cannot sell ${txn.quantity} on ${txn.date}: only ${availableQty} open units available for this instrument/account`
        )
      }

      const avgCost = method === 'average' ? weightedAverageCostPerUnit(open) : null
      const proceedsPerUnit = txn.amount / txn.quantity
      let remainingToSell = txn.quantity

      for (const lot of open) {
        if (remainingToSell <= 1e-9) break
        const qtyFromLot = Math.min(lot.remainingQuantity, remainingToSell)
        const costPerUnit = avgCost ?? lot.costBasisPerUnit
        const costBasis = qtyFromLot * costPerUnit
        const proceeds = qtyFromLot * proceedsPerUnit
        const { term, days } = holdingPeriod(lot.acquiredDate, txn.date)

        gains.push({
          sellTransactionId: txn.id,
          lotId: lot.id,
          quantity: qtyFromLot,
          proceeds,
          costBasis,
          gain: proceeds - costBasis,
          term,
          holdingPeriodDays: days,
          acquiredDate: lot.acquiredDate,
          soldDate: txn.date
        })

        lot.remainingQuantity -= qtyFromLot
        if (lot.remainingQuantity <= 0) lot.closedAt = txn.date
        remainingToSell -= qtyFromLot
      }
    } else if (txn.type === 'split') {
      // Ratio = new units per old unit. Scale open lots' quantity up and per-unit
      // basis down so total remaining basis (and any later gain) is unchanged.
      if (txn.quantity <= 0) {
        throw new Error(`Split ratio must be positive (got ${txn.quantity})`)
      }
      for (const lot of lots) {
        if (lot.remainingQuantity > 0) {
          lot.remainingQuantity *= txn.quantity
          lot.costBasisPerUnit /= txn.quantity
        }
      }
    }
    // dividend / interest / fee / deposit / withdrawal carry no lot effect.
  }

  return { lots, gains }
}
