import type {
  Account,
  CsvColumnMapping,
  CsvImportRow,
  Instrument,
  InstrumentType,
  NewTransactionInput,
  OpenLotSummary,
  Position,
  RealizedGainLoss,
  Transaction
} from './types'

export interface TradeAppApi {
  instruments: {
    list(type?: InstrumentType): Promise<Instrument[]>
    createCustom(input: {
      type: InstrumentType
      symbol: string
      name: string
      currency: string
      exchange?: string
    }): Promise<Instrument>
    setManualPrice(instrumentId: number, price: number | null): Promise<void>
  }
  accounts: {
    list(): Promise<Account[]>
    create(input: {
      name: string
      kind: Account['kind']
      institution?: string
      costBasisMethod: Account['costBasisMethod']
    }): Promise<Account>
  }
  transactions: {
    list(filters?: { accountId?: number; instrumentId?: number }): Promise<Transaction[]>
    create(input: NewTransactionInput): Promise<Transaction>
    update(id: number, input: NewTransactionInput): Promise<Transaction>
    delete(id: number): Promise<void>
  }
  positions: {
    list(accountId?: number): Promise<Position[]>
  }
  lots: {
    openList(accountId: number, instrumentId: number): Promise<OpenLotSummary[]>
  }
  realizedGains: {
    list(filters?: { accountId?: number; instrumentId?: number; year?: number }): Promise<
      RealizedGainLoss[]
    >
  }
  csv: {
    openAndParse(): Promise<{ filePath: string; headers: string[]; rows: CsvImportRow[] } | null>
    commitImport(input: {
      accountId: number
      defaultInstrumentType: InstrumentType
      rows: CsvImportRow[]
      mapping: CsvColumnMapping
      markEstimatedBasis: boolean
    }): Promise<{ imported: number; errors: string[] }>
  }
  reports: {
    exportPdf(input: {
      title: string
      html: string
    }): Promise<{ filePath: string | null }>
  }
}
