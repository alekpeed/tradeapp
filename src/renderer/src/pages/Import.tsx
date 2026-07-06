import { useState } from 'react'
import Papa from 'papaparse'
import type { CsvColumnMapping, CsvImportRow, InstrumentType } from '@shared/types'
import { useAppData } from '../context/AppData'

const TYPE_OPTIONS: { value: InstrumentType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'bond', label: 'Bond' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'forex', label: 'Forex' },
  { value: 'custom', label: 'Custom / Other' }
]

export default function Import(): JSX.Element {
  const { accounts, instruments, refreshInstruments } = useAppData()

  // CSV import state
  const [csvFilePath, setCsvFilePath] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvImportRow[]>([])
  const [csvAccountId, setCsvAccountId] = useState<number | ''>('')
  const [csvInstrumentType, setCsvInstrumentType] = useState<InstrumentType>('stock')
  const [mapping, setMapping] = useState<CsvColumnMapping>({
    date: '',
    type: '',
    symbol: '',
    quantity: '',
    price: '',
    fees: '',
    notes: ''
  })
  const [markEstimated, setMarkEstimated] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)

  // Legacy manual opening-position state
  const [legacyAccountId, setLegacyAccountId] = useState<number | ''>('')
  const [legacyType, setLegacyType] = useState<InstrumentType>('stock')
  const [legacySymbol, setLegacySymbol] = useState('')
  const [legacyName, setLegacyName] = useState('')
  const [legacyDate, setLegacyDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [legacyQty, setLegacyQty] = useState('')
  const [legacyTotalCost, setLegacyTotalCost] = useState('')
  const [legacyUnknownBasis, setLegacyUnknownBasis] = useState(false)
  const [legacyStatus, setLegacyStatus] = useState<string | null>(null)
  const [legacyError, setLegacyError] = useState<string | null>(null)

  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)

  function guessMapping(headerList: string[]): void {
    const guess = (name: string): string =>
      headerList.find((h) => h.toLowerCase().includes(name)) ?? ''
    setMapping({
      date: guess('date'),
      type: guess('type') || guess('action'),
      symbol: guess('symbol') || guess('ticker'),
      quantity: guess('quantity') || guess('shares') || guess('qty'),
      price: guess('price'),
      fees: guess('fee') || guess('commission'),
      notes: guess('note') || guess('description')
    })
  }

  async function handleChooseCsv(): Promise<void> {
    setCsvError(null)
    setImportResult(null)
    const result = await window.tradeapp.csv.openAndParse()
    if (!result) return
    setCsvFilePath(result.filePath)
    setHeaders(result.headers)
    setRows(result.rows)
    guessMapping(result.headers)
  }

  function handleParsePaste(): void {
    setCsvError(null)
    setImportResult(null)
    const text = pasteText.trim()
    if (!text) {
      setCsvError('Paste some rows first — include the header row (Date, Symbol, Quantity, Price…)')
      return
    }
    // Papaparse auto-detects the delimiter, so both spreadsheet copies (tabs)
    // and comma-separated text work.
    const parsed = Papa.parse<CsvImportRow>(text, { header: true, skipEmptyLines: true })
    const fields = (parsed.meta.fields ?? []).filter((f) => f && f.trim() !== '')
    if (fields.length < 2 || parsed.data.length === 0) {
      setCsvError(
        'Could not read that as a table. Make sure the first line is a header row and each row has the same columns.'
      )
      return
    }
    setCsvFilePath(`(pasted rows — ${parsed.data.length} rows)`)
    setHeaders(fields)
    setRows(parsed.data)
    guessMapping(fields)
  }

  async function handleCommitImport(): Promise<void> {
    setCsvError(null)
    if (!csvAccountId) {
      setCsvError('Choose an account for this import')
      return
    }
    if (!mapping.date || !mapping.symbol || !mapping.quantity || !mapping.price) {
      setCsvError('Map at least date, symbol, quantity, and price columns')
      return
    }
    const result = await window.tradeapp.csv.commitImport({
      accountId: Number(csvAccountId),
      defaultInstrumentType: csvInstrumentType,
      rows,
      mapping,
      markEstimatedBasis: markEstimated
    })
    setImportResult(result)
    await refreshInstruments()
  }

  async function handleLegacySubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLegacyError(null)
    setLegacyStatus(null)
    if (!legacyAccountId || !legacySymbol.trim()) {
      setLegacyError('Choose an account and enter a symbol')
      return
    }
    const qty = parseFloat(legacyQty)
    if (Number.isNaN(qty) || qty <= 0) {
      setLegacyError('Quantity must be positive')
      return
    }
    const totalCost = legacyUnknownBasis ? 0 : parseFloat(legacyTotalCost) || 0

    try {
      let instrument = instruments.find(
        (i) => i.type === legacyType && i.symbol.toUpperCase() === legacySymbol.trim().toUpperCase()
      )
      if (!instrument) {
        instrument = await window.tradeapp.instruments.createCustom({
          type: legacyType,
          symbol: legacySymbol.trim(),
          name: legacyName.trim() || legacySymbol.trim(),
          currency: 'USD'
        })
        await refreshInstruments()
      }

      await window.tradeapp.transactions.create({
        accountId: Number(legacyAccountId),
        instrumentId: instrument.id,
        type: 'buy',
        date: legacyDate,
        quantity: qty,
        price: totalCost / qty,
        fees: 0,
        currency: 'USD',
        fxRateToUsd: 1,
        notes: 'Legacy opening position',
        source: 'legacy_opening',
        estimatedBasis: true
      })
      setLegacyStatus(`Recorded opening position for ${legacySymbol.toUpperCase()}.`)
      setLegacySymbol('')
      setLegacyName('')
      setLegacyQty('')
      setLegacyTotalCost('')
    } catch (err) {
      setLegacyError((err as Error).message)
    }
  }

  return (
    <div>
      <h1>Import Old Trades</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>1. Import from a CSV export</h2>
        <p className="hint-text">
          Export a CSV from her brokerage or exchange (Fidelity, Schwab, Coinbase, etc.) and map its
          columns below. Nothing is saved until you click &quot;Import rows&quot;.
        </p>
        <div className="button-row">
          <button type="button" onClick={handleChooseCsv}>
            Choose CSV file…
          </button>
          <button type="button" className="secondary" onClick={() => setShowPaste(!showPaste)}>
            📋 …or paste rows from a spreadsheet
          </button>
        </div>
        {showPaste && (
          <div style={{ marginTop: 12 }}>
            <p className="hint-text">
              Copy rows straight out of Excel, Google Sheets, or a statement table (include the
              header row) and paste them here:
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
              placeholder={'Date\tSymbol\tType\tQuantity\tPrice\n2023-05-01\tAAPL\tbuy\t10\t170.25'}
            />
            <button type="button" onClick={handleParsePaste} style={{ marginTop: 8 }}>
              Read pasted rows
            </button>
          </div>
        )}
        {csvFilePath && <p className="hint-text">Loaded: {csvFilePath} ({rows.length} rows)</p>}

        {headers.length > 0 && (
          <>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <label>
                Account
                <select value={csvAccountId} onChange={(e) => setCsvAccountId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Default instrument type
                <select value={csvInstrumentType} onChange={(e) => setCsvInstrumentType(e.target.value as InstrumentType)}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              {(['date', 'type', 'symbol', 'quantity', 'price', 'fees', 'notes'] as const).map((field) => (
                <label key={field}>
                  {field} column
                  <select
                    value={mapping[field] ?? ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  >
                    <option value="">— none —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                <span style={{ visibility: 'hidden' }}>_</span>
                <span>
                  <input
                    type="checkbox"
                    checked={markEstimated}
                    onChange={(e) => setMarkEstimated(e.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  Mark cost basis as estimated
                </span>
              </label>
            </div>

            <h2>Preview (first 5 rows)</h2>
            <table>
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, idx) => (
                  <tr key={idx}>
                    {headers.map((h) => (
                      <td key={h}>{r[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <button type="button" onClick={handleCommitImport} style={{ marginTop: 12 }}>
              Import rows
            </button>
            {csvError && <p className="error-text">{csvError}</p>}
            {importResult && (
              <p className="hint-text">
                Imported {importResult.imported} of {rows.length} rows.
                {importResult.errors.length > 0 && (
                  <>
                    {' '}
                    {importResult.errors.length} error(s):
                    <ul>
                      {importResult.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>2. Manually enter an old/consolidated position</h2>
        <p className="hint-text">
          For years where you only have a year-end balance (not full transaction history), enter it
          as an opening position here. It&apos;s flagged as estimated cost basis so later reports are
          clear about it.
        </p>
        <form onSubmit={handleLegacySubmit} className="form-grid">
          <label>
            Account
            <select value={legacyAccountId} onChange={(e) => setLegacyAccountId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Instrument type
            <select value={legacyType} onChange={(e) => setLegacyType(e.target.value as InstrumentType)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Symbol
            <input value={legacySymbol} onChange={(e) => setLegacySymbol(e.target.value)} placeholder="e.g. AAPL" />
          </label>
          <label>
            Name (if new)
            <input value={legacyName} onChange={(e) => setLegacyName(e.target.value)} placeholder="optional" />
          </label>
          <label>
            As-of date
            <input type="date" value={legacyDate} onChange={(e) => setLegacyDate(e.target.value)} />
          </label>
          <label>
            Quantity held
            <input value={legacyQty} onChange={(e) => setLegacyQty(e.target.value)} placeholder="0.00" />
          </label>
          <label>
            Total cost basis ($)
            <input
              value={legacyTotalCost}
              onChange={(e) => setLegacyTotalCost(e.target.value)}
              placeholder="0.00"
              disabled={legacyUnknownBasis}
            />
          </label>
          <label>
            <span style={{ visibility: 'hidden' }}>_</span>
            <span>
              <input
                type="checkbox"
                checked={legacyUnknownBasis}
                onChange={(e) => setLegacyUnknownBasis(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Cost basis unknown
            </span>
          </label>
          <button type="submit">Record opening position</button>
        </form>
        {legacyError && <p className="error-text">{legacyError}</p>}
        {legacyStatus && <p className="hint-text">{legacyStatus}</p>}
      </div>
    </div>
  )
}
