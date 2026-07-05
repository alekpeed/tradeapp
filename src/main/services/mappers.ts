import type { Transaction } from '@shared/types'

export function rowToTransaction(row: unknown): Transaction {
  const r = row as Record<string, unknown>
  return {
    id: r.id as number,
    accountId: r.account_id as number,
    instrumentId: r.instrument_id as number,
    type: r.type as Transaction['type'],
    date: r.date as string,
    quantity: r.quantity as number,
    price: r.price as number,
    amount: r.amount as number,
    fees: r.fees as number,
    currency: r.currency as string,
    fxRateToUsd: r.fx_rate_to_usd as number,
    notes: (r.notes as string) ?? null,
    tags: (r.tags as string) ?? null,
    source: r.source as Transaction['source'],
    documentId: (r.document_id as number) ?? null,
    estimatedBasis: Boolean(r.estimated_basis),
    specificLotId: (r.specific_lot_id as number) ?? null,
    createdAt: r.created_at as string
  }
}
