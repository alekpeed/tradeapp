import { useMemo, useState } from 'react'
import type { InstrumentType } from '@shared/types'
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

export default function Instruments(): JSX.Element {
  const { instruments, refreshInstruments } = useAppData()
  const [filterType, setFilterType] = useState<InstrumentType | 'all'>('all')
  const [search, setSearch] = useState('')

  const [newType, setNewType] = useState<InstrumentType>('stock')
  const [newSymbol, setNewSymbol] = useState('')
  const [newName, setNewName] = useState('')
  const [newExchange, setNewExchange] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return instruments.filter((i) => {
      if (filterType !== 'all' && i.type !== filterType) return false
      if (search && !`${i.symbol} ${i.name}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [instruments, filterType, search])

  async function handleAddCustom(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!newSymbol.trim() || !newName.trim()) {
      setError('Symbol and name are required')
      return
    }
    try {
      await window.tradeapp.instruments.createCustom({
        type: newType,
        symbol: newSymbol.trim(),
        name: newName.trim(),
        currency: 'USD',
        exchange: newExchange.trim() || undefined
      })
      setNewSymbol('')
      setNewName('')
      setNewExchange('')
      await refreshInstruments()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div>
      <h1>Instruments</h1>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add a custom ticker</h2>
        <p className="hint-text">
          Top 100 crypto and common commodities are pre-loaded. Anything else — a stock ticker not
          yet in the list, a private placement, employer RSUs, whatever — can be added here.
        </p>
        <form onSubmit={handleAddCustom} className="form-grid">
          <label>
            Type
            <select value={newType} onChange={(e) => setNewType(e.target.value as InstrumentType)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Symbol / ticker
            <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="e.g. AAPL" />
          </label>
          <label>
            Name
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Apple Inc." />
          </label>
          <label>
            Exchange (optional)
            <input value={newExchange} onChange={(e) => setNewExchange(e.target.value)} placeholder="e.g. NASDAQ" />
          </label>
          <button type="submit">Add instrument</button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <h2>Browse instruments</h2>
      <div className="card">
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <label>
            Filter by type
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as InstrumentType | 'all')}>
              <option value="all">All types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Search
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="symbol or name" />
          </label>
        </div>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th>Type</th>
              <th>Exchange</th>
              <th>Custom?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((i) => (
              <tr key={i.id}>
                <td>{i.symbol}</td>
                <td>{i.name}</td>
                <td>{i.type}</td>
                <td>{i.exchange ?? '—'}</td>
                <td>{i.isCustom ? 'Yes' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 300 && (
          <p className="hint-text">Showing first 300 of {filtered.length} matches — narrow your search.</p>
        )}
      </div>
    </div>
  )
}
