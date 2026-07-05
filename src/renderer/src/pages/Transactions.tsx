import { useEffect, useMemo, useState } from 'react'
import type { InstrumentType, OpenLotSummary, Transaction, TransactionType } from '@shared/types'
import { useAppData } from '../context/AppData'

const TYPE_OPTIONS: { value: InstrumentType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'bond', label: 'Bond' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'forex', label: 'Forex' },
  { value: 'option', label: 'Option' },
  { value: 'future', label: 'Future' },
  { value: 'reit', label: 'REIT' },
  { value: 'cash', label: 'Cash' },
  { value: 'custom', label: 'Custom / Other' }
]

const TXN_TYPES: TransactionType[] = [
  'buy',
  'sell',
  'dividend',
  'interest',
  'split',
  'transfer_in',
  'transfer_out',
  'fee',
  'deposit',
  'withdrawal'
]

export default function Transactions(): JSX.Element {
  const { accounts, instruments } = useAppData()
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [accountId, setAccountId] = useState<number | ''>('')
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('stock')
  const [instrumentId, setInstrumentId] = useState<number | ''>('')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [type, setType] = useState<TransactionType>('buy')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fees, setFees] = useState('0')
  const [notes, setNotes] = useState('')
  const [estimatedBasis, setEstimatedBasis] = useState(false)
  const [openLots, setOpenLots] = useState<OpenLotSummary[]>([])
  const [specificLotId, setSpecificLotId] = useState<number | ''>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const filteredInstruments = useMemo(
    () =>
      instruments.filter(
        (i) =>
          i.type === instrumentType &&
          (!symbolFilter || `${i.symbol} ${i.name}`.toLowerCase().includes(symbolFilter.toLowerCase()))
      ),
    [instruments, instrumentType, symbolFilter]
  )

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const isClosingType = type === 'sell' || type === 'transfer_out'

  async function loadTransactions(): Promise<void> {
    setTransactions(await window.tradeapp.transactions.list())
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    setInstrumentId('')
  }, [instrumentType])

  useEffect(() => {
    if (isClosingType && accountId && instrumentId && selectedAccount?.costBasisMethod === 'specific_lot') {
      window.tradeapp.lots.openList(Number(accountId), Number(instrumentId)).then(setOpenLots)
    } else {
      setOpenLots([])
      setSpecificLotId('')
    }
  }, [isClosingType, accountId, instrumentId, selectedAccount])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setStatus(null)

    if (!accountId || !instrumentId) {
      setError('Choose an account and an instrument')
      return
    }
    const qty = parseFloat(quantity)
    const prc = parseFloat(price)
    if (Number.isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive number')
      return
    }
    if (Number.isNaN(prc) || prc < 0) {
      setError('Price must be a non-negative number')
      return
    }

    const payload = {
      accountId: Number(accountId),
      instrumentId: Number(instrumentId),
      type,
      date,
      quantity: qty,
      price: prc,
      fees: parseFloat(fees) || 0,
      currency: 'USD',
      fxRateToUsd: 1,
      notes: notes.trim() || undefined,
      estimatedBasis,
      specificLotId: specificLotId ? Number(specificLotId) : undefined
    }

    try {
      if (editingId !== null) {
        await window.tradeapp.transactions.update(editingId, payload)
        setStatus(`Transaction #${editingId} updated — profits and lots were recalculated.`)
      } else {
        await window.tradeapp.transactions.create(payload)
        setStatus('Transaction recorded.')
      }
      resetForm()
      await loadTransactions()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function resetForm(): void {
    setEditingId(null)
    setQuantity('')
    setPrice('')
    setFees('0')
    setNotes('')
    setEstimatedBasis(false)
    setSpecificLotId('')
  }

  function startEdit(t: Transaction): void {
    const instrument = instruments.find((i) => i.id === t.instrumentId)
    setEditingId(t.id)
    setAccountId(t.accountId)
    setType(t.type)
    if (instrument) setInstrumentType(instrument.type)
    // instrumentId must be set after instrumentType (the type change effect clears it)
    setTimeout(() => setInstrumentId(t.instrumentId), 0)
    setDate(t.date)
    setQuantity(String(t.quantity))
    setPrice(String(t.price))
    setFees(String(t.fees))
    setNotes(t.notes ?? '')
    setEstimatedBasis(t.estimatedBasis)
    setError(null)
    setStatus(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(t: Transaction): Promise<void> {
    const label = `${t.type} ${t.quantity} × ${instrumentLabel(t.instrumentId)} on ${t.date}`
    if (!window.confirm(`Delete this transaction?\n\n${label}\n\nProfits and lots will be recalculated.`)) {
      return
    }
    setError(null)
    setStatus(null)
    try {
      await window.tradeapp.transactions.delete(t.id)
      if (editingId === t.id) resetForm()
      setStatus('Transaction deleted — profits and lots were recalculated.')
      await loadTransactions()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function instrumentLabel(id: number): string {
    const i = instruments.find((x) => x.id === id)
    return i ? `${i.symbol} — ${i.name}` : `#${id}`
  }

  function accountLabel(id: number): string {
    return accounts.find((a) => a.id === id)?.name ?? `#${id}`
  }

  return (
    <div>
      <h1>Transactions</h1>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>
          {editingId !== null ? `✏️ Editing transaction #${editingId}` : 'Record a trade'}
        </h2>
        {editingId !== null && (
          <p className="hint-text">
            Change any field below and click &quot;Save changes&quot;. All profits and lots will be
            recalculated automatically.
          </p>
        )}
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Account
            <select value={accountId} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Transaction type
            <select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              {TXN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Instrument type
            <select value={instrumentType} onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Search symbol
            <input value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)} placeholder="filter…" />
          </label>
          <label>
            Instrument
            <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select instrument…</option>
              {filteredInstruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.symbol} — {i.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Quantity
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.00" />
          </label>
          <label>
            Price per unit ($)
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </label>
          <label>
            Fees ($)
            <input value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0.00" />
          </label>
          <label>
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
          </label>
          <label>
            <span style={{ visibility: 'hidden' }}>_</span>
            <span>
              <input
                type="checkbox"
                checked={estimatedBasis}
                onChange={(e) => setEstimatedBasis(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Estimated cost basis
            </span>
          </label>
          {isClosingType && selectedAccount?.costBasisMethod === 'specific_lot' && (
            <label>
              Specific lot to sell from
              <select value={specificLotId} onChange={(e) => setSpecificLotId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Choose lot…</option>
                {openLots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.acquiredDate} — {l.remainingQuantity} @ ${l.costBasisPerUnit.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit">{editingId !== null ? 'Save changes' : 'Save transaction'}</button>
          {editingId !== null && (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel edit
            </button>
          )}
        </form>
        {error && <p className="error-text">{error}</p>}
        {status && <p className="hint-text">{status}</p>}
      </div>

      <h2>History</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Instrument</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
              <th>Fees</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{accountLabel(t.accountId)}</td>
                <td>{instrumentLabel(t.instrumentId)}</td>
                <td>{t.type}</td>
                <td>{t.quantity}</td>
                <td>${t.price.toFixed(2)}</td>
                <td>${t.amount.toFixed(2)}</td>
                <td>${t.fees.toFixed(2)}</td>
                <td>{t.source}{t.estimatedBasis ? ' (est.)' : ''}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="secondary"
                    style={{ marginRight: 6, padding: '4px 10px' }}
                    title="Edit this transaction"
                    onClick={() => startEdit(t)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: '4px 10px' }}
                    title="Delete this transaction"
                    onClick={() => handleDelete(t)}
                  >
                    🗑 Delete
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={10} className="hint-text">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
