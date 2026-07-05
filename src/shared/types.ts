export type InstrumentType =
  | 'stock'
  | 'etf'
  | 'mutual_fund'
  | 'bond'
  | 'crypto'
  | 'commodity'
  | 'forex'
  | 'option'
  | 'future'
  | 'reit'
  | 'cash'
  | 'custom'

export interface Instrument {
  id: number
  type: InstrumentType
  symbol: string
  name: string
  exchange: string | null
  currency: string
  metadata: string | null // JSON blob, type-specific fields
  isCustom: boolean
  createdAt: string
}

export type AccountKind = 'brokerage' | 'wallet' | 'legacy' | 'other'

export interface Account {
  id: number
  name: string
  kind: AccountKind
  institution: string | null
  costBasisMethod: CostBasisMethod
  createdAt: string
}

export type CostBasisMethod = 'fifo' | 'lifo' | 'average' | 'specific_lot'

export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'interest'
  | 'split'
  | 'transfer_in'
  | 'transfer_out'
  | 'fee'
  | 'deposit'
  | 'withdrawal'

export type TransactionSource = 'manual' | 'csv_import' | 'pdf_import' | 'ocr' | 'legacy_opening'

export interface Transaction {
  id: number
  accountId: number
  instrumentId: number
  type: TransactionType
  date: string // ISO date
  quantity: number
  price: number
  amount: number
  fees: number
  currency: string
  fxRateToUsd: number
  notes: string | null
  tags: string | null // comma-separated
  source: TransactionSource
  documentId: number | null
  estimatedBasis: boolean
  specificLotId: number | null
  createdAt: string
}

export interface Lot {
  id: number
  accountId: number
  instrumentId: number
  openTransactionId: number
  acquiredDate: string
  originalQuantity: number
  remainingQuantity: number
  costBasisPerUnit: number
  costBasisTotal: number
  estimatedBasis: boolean
  closedAt: string | null
}

export type GainTerm = 'short' | 'long'

export interface RealizedGainLoss {
  id: number
  accountId: number
  instrumentId: number
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

export type DocumentType = 'consolidated_1099' | 'statement' | 'trade_confirmation' | 'other'
export type DocumentStatus = 'uploaded' | 'staged' | 'committed' | 'ignored'

export interface DocumentRecord {
  id: number
  accountId: number | null
  type: DocumentType
  year: number | null
  filePath: string
  status: DocumentStatus
  createdAt: string
}

export interface Position {
  accountId: number
  instrumentId: number
  symbol: string
  name: string
  type: InstrumentType
  quantity: number
  costBasisTotal: number
  avgCostPerUnit: number
  manualPrice: number | null
}

export interface NewTransactionInput {
  accountId: number
  instrumentId: number
  type: TransactionType
  date: string
  quantity: number
  price: number
  fees: number
  currency: string
  fxRateToUsd: number
  notes?: string
  tags?: string
  source?: TransactionSource
  estimatedBasis?: boolean
  specificLotId?: number | null
}

export interface OpenLotSummary {
  id: number
  acquiredDate: string
  remainingQuantity: number
  costBasisPerUnit: number
  estimatedBasis: boolean
}

export interface CsvImportRow {
  [key: string]: string
}

export interface CsvColumnMapping {
  date: string
  type: string
  symbol: string
  quantity: string
  price: string
  fees?: string
  notes?: string
}
