import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  InstrumentType,
  NetWorthCategory,
  NetWorthItem,
  OpenLotSummary,
  Position,
  RealizedGainLoss
} from '@shared/types'
import { useAppData } from '../context/AppData'
import BubbleChart from '../components/BubbleChart'
import { buildBubbleTree, positionKey } from '../lib/buildBubbleTree'

const TYPE_OPTIONS: { value: InstrumentType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'bond', label: 'Bond' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'reit', label: 'REIT' },
  { value: 'forex', label: 'Forex' },
  { value: 'custom', label: 'Custom / Other' }
]

const CATEGORY_OPTIONS: { value: NetWorthCategory; label: string }[] = [
  { value: 'retirement', label: 'Retirement account' },
  { value: 'cash', label: 'Cash & bank' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'collectible', label: 'Collectible' },
  { value: 'debt', label: 'Credit & debt' }
]

export default function Bubbles(): JSX.Element {
  const { accounts, instruments, refreshInstruments } = useAppData()
  const [positions, setPositions] = useState<Position[]>([])
  const [netWorthItems, setNetWorthItems] = useState<NetWorthItem[]>([])
  const [realizedGains, setRealizedGains] = useState<RealizedGainLoss[]>([])
  const [lotsByKey, setLotsByKey] = useState<Record<string, OpenLotSummary[]>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'trade' | 'networth'>('trade')
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setPositions(await window.tradeapp.positions.list())
    setNetWorthItems(await window.tradeapp.netWorthItems.list())
    setRealizedGains(await window.tradeapp.realizedGains.list())
  }, [])

  const realizedGainSummary = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const allTime = realizedGains.reduce((sum, g) => sum + g.gain, 0)
    const ytd = realizedGains
      .filter((g) => new Date(g.soldDate).getFullYear() === currentYear)
      .reduce((sum, g) => sum + g.gain, 0)
    return { ytd, allTime }
  }, [realizedGains])

  useEffect(() => {
    reload()
  }, [reload])

  const root = useMemo(
    () => buildBubbleTree(accounts, positions, netWorthItems, lotsByKey),
    [accounts, positions, netWorthItems, lotsByKey]
  )

  const handleDrillPosition = useCallback(
    (accountId: number, instrumentId: number) => {
      const key = positionKey(accountId, instrumentId)
      if (lotsByKey[key]) return
      window.tradeapp.lots.openList(accountId, instrumentId).then((lots) => {
        setLotsByKey((prev) => ({ ...prev, [key]: lots }))
      })
    },
    [lotsByKey]
  )

  // ---------- trade form state ----------
  const [tAccountId, setTAccountId] = useState<number | ''>('')
  const [tAction, setTAction] = useState<'buy' | 'sell'>('buy')
  const [tInstrumentType, setTInstrumentType] = useState<InstrumentType>('stock')
  const [tInstrumentId, setTInstrumentId] = useState<number | '' | '__new__'>('')
  const [tNewSymbol, setTNewSymbol] = useState('')
  const [tNewName, setTNewName] = useState('')
  const [tDate, setTDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tQty, setTQty] = useState('')
  const [tPrice, setTPrice] = useState('')

  const filteredInstruments = useMemo(
    () => instruments.filter((i) => i.type === tInstrumentType),
    [instruments, tInstrumentType]
  )

  // ---------- net worth item form state ----------
  const [nCategory, setNCategory] = useState<NetWorthCategory>('cash')
  const [nName, setNName] = useState('')
  const [nValue, setNValue] = useState('')
  const [nOriginalValue, setNOriginalValue] = useState('')
  const [nAcquiredDate, setNAcquiredDate] = useState('')

  function openModal(): void {
    setError(null)
    setEditingItemId(null)
    setMode('trade')
    setModalOpen(true)
  }
  function closeModal(): void {
    setModalOpen(false)
    setError(null)
    setEditingItemId(null)
  }
  function openEditNetWorthItem(itemId: number): void {
    const item = netWorthItems.find((i) => i.id === itemId)
    if (!item) return
    setError(null)
    setEditingItemId(itemId)
    setMode('networth')
    setNCategory(item.category)
    setNName(item.name)
    setNValue(String(Math.abs(item.value)))
    setNOriginalValue(item.originalValue !== null ? String(Math.abs(item.originalValue)) : '')
    setNAcquiredDate(item.acquiredDate ?? '')
    setModalOpen(true)
  }

  async function submitTrade(): Promise<void> {
    setError(null)
    if (!tAccountId) {
      setError('Choose an account.')
      return
    }
    const qty = parseFloat(tQty)
    const price = parseFloat(tPrice)
    if (!qty || qty <= 0) {
      setError('Quantity must be greater than zero.')
      return
    }
    if (!price || price < 0) {
      setError('Price must be zero or greater.')
      return
    }

    let instrumentId: number
    if (tInstrumentId === '__new__') {
      if (!tNewSymbol.trim() || !tNewName.trim()) {
        setError('Enter a symbol and name for the new instrument.')
        return
      }
      const created = await window.tradeapp.instruments.createCustom({
        type: tInstrumentType,
        symbol: tNewSymbol.trim(),
        name: tNewName.trim(),
        currency: 'USD'
      })
      instrumentId = created.id
      await refreshInstruments()
    } else if (tInstrumentId === '') {
      setError('Choose an instrument.')
      return
    } else {
      instrumentId = tInstrumentId
    }

    const finalAccountId = Number(tAccountId)
    await window.tradeapp.transactions.create({
      accountId: finalAccountId,
      instrumentId,
      type: tAction,
      date: tDate,
      quantity: qty,
      price,
      fees: 0,
      currency: 'USD',
      fxRateToUsd: 1
    })

    // refresh this position's lots in case it was already drilled into and cached
    const key = positionKey(finalAccountId, instrumentId)
    const freshLots = await window.tradeapp.lots.openList(finalAccountId, instrumentId)
    setLotsByKey((prev) => ({ ...prev, [key]: freshLots }))

    setTQty('')
    setTPrice('')
    setTNewSymbol('')
    setTNewName('')
    setTInstrumentId('')
    closeModal()
    await reload()
  }

  async function submitNetWorthItem(): Promise<void> {
    setError(null)
    if (!nName.trim()) {
      setError('Give it a name.')
      return
    }
    const value = parseFloat(nValue)
    if (!value || value <= 0) {
      setError('Value must be greater than zero.')
      return
    }
    const original = nOriginalValue.trim() ? parseFloat(nOriginalValue) : undefined
    const isDebt = nCategory === 'debt'

    const payload = {
      category: nCategory,
      name: nName.trim(),
      value: isDebt ? -Math.abs(value) : value,
      originalValue: original !== undefined ? (isDebt ? -Math.abs(original) : original) : undefined,
      acquiredDate: nAcquiredDate || undefined
    }

    if (editingItemId !== null) {
      await window.tradeapp.netWorthItems.update(editingItemId, payload)
    } else {
      await window.tradeapp.netWorthItems.create(payload)
    }

    setNName('')
    setNValue('')
    setNOriginalValue('')
    setNAcquiredDate('')
    closeModal()
    await reload()
  }

  async function deleteNetWorthItem(): Promise<void> {
    if (editingItemId === null) return
    if (!window.confirm(`Delete "${nName}"? This can't be undone.`)) return
    await window.tradeapp.netWorthItems.delete(editingItemId)
    closeModal()
    await reload()
  }

  return (
    <div>
      <h1>Net Worth — Bubbles</h1>
      <p className="hint-text">
        Every account and holding as a bubble — size is value, drilling in reveals lots and detail.
        Drag the time dial to replay your history.
      </p>

      <BubbleChart
        root={root}
        onDrillPosition={handleDrillPosition}
        onAddClick={openModal}
        onEditNetWorthItem={openEditNetWorthItem}
        realizedGain={realizedGainSummary}
      />

      {modalOpen && (
        <div className="bv-modalOverlay bv-open" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bv-modalCard">
            <h3>
              {editingItemId !== null
                ? 'Edit net worth item'
                : mode === 'trade'
                  ? 'Record a trade'
                  : 'Add a net worth item'}
            </h3>

            {editingItemId === null && (
              <div className="bv-formRow">
                <div className="bv-segmented">
                  <button
                    type="button"
                    className={'bv-segBtn' + (mode === 'trade' ? ' bv-active' : '')}
                    onClick={() => setMode('trade')}
                  >
                    Investment trade
                  </button>
                  <button
                    type="button"
                    className={'bv-segBtn' + (mode === 'networth' ? ' bv-active' : '')}
                    onClick={() => setMode('networth')}
                  >
                    Net worth item
                  </button>
                </div>
              </div>
            )}

            {mode === 'trade' ? (
              <>
                <div className="bv-formRow">
                  <label>Action</label>
                  <div className="bv-segmented">
                    <button
                      type="button"
                      className={'bv-segBtn' + (tAction === 'buy' ? ' bv-active' : '')}
                      onClick={() => setTAction('buy')}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      className={'bv-segBtn' + (tAction === 'sell' ? ' bv-active' : '')}
                      onClick={() => setTAction('sell')}
                    >
                      Sell
                    </button>
                  </div>
                </div>
                <div className="bv-formRow">
                  <label>Account</label>
                  <select
                    value={tAccountId}
                    onChange={(e) => setTAccountId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Select account…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bv-formRow">
                  <label>Instrument type</label>
                  <select
                    value={tInstrumentType}
                    onChange={(e) => {
                      setTInstrumentType(e.target.value as InstrumentType)
                      setTInstrumentId('')
                    }}
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bv-formRow">
                  <label>Instrument</label>
                  <select
                    value={tInstrumentId}
                    onChange={(e) =>
                      setTInstrumentId(e.target.value === '__new__' ? '__new__' : e.target.value ? Number(e.target.value) : '')
                    }
                  >
                    <option value="">Select instrument…</option>
                    <option value="__new__">+ New instrument…</option>
                    {filteredInstruments.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.symbol} — {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                {tInstrumentId === '__new__' && (
                  <>
                    <div className="bv-formRow">
                      <label>Symbol</label>
                      <input value={tNewSymbol} onChange={(e) => setTNewSymbol(e.target.value)} placeholder="e.g. TSLA" />
                    </div>
                    <div className="bv-formRow">
                      <label>Name</label>
                      <input value={tNewName} onChange={(e) => setTNewName(e.target.value)} placeholder="e.g. Tesla Inc." />
                    </div>
                  </>
                )}
                <div className="bv-formRow">
                  <label>Date</label>
                  <input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} />
                </div>
                <div className="bv-formRow">
                  <label>Quantity</label>
                  <input value={tQty} onChange={(e) => setTQty(e.target.value)} placeholder="e.g. 10" />
                </div>
                <div className="bv-formRow">
                  <label>Price per unit</label>
                  <input value={tPrice} onChange={(e) => setTPrice(e.target.value)} placeholder="e.g. 120.50" />
                </div>
                {error && <div className="bv-formErr">{error}</div>}
                <div className="bv-formActions">
                  <button type="button" className="bv-btn bv-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="button" className="bv-btn bv-gold" onClick={submitTrade}>
                    Record trade
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bv-formRow">
                  <label>Category</label>
                  <select value={nCategory} onChange={(e) => setNCategory(e.target.value as NetWorthCategory)}>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bv-formRow">
                  <label>Name</label>
                  <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="e.g. Primary Home" />
                </div>
                <div className="bv-formRow">
                  <label>{nCategory === 'debt' ? 'Amount owed' : 'Current value'}</label>
                  <input value={nValue} onChange={(e) => setNValue(e.target.value)} placeholder="e.g. 420000" />
                </div>
                <div className="bv-formRow">
                  <label>{nCategory === 'debt' ? 'Original balance (optional)' : 'Original / cost value (optional)'}</label>
                  <input
                    value={nOriginalValue}
                    onChange={(e) => setNOriginalValue(e.target.value)}
                    placeholder="for tracking gain/loss over time"
                  />
                </div>
                <div className="bv-formRow">
                  <label>Acquired date (optional)</label>
                  <input type="date" value={nAcquiredDate} onChange={(e) => setNAcquiredDate(e.target.value)} />
                </div>
                {error && <div className="bv-formErr">{error}</div>}
                <div className="bv-formActions">
                  {editingItemId !== null && (
                    <button type="button" className="bv-btn bv-ghost" onClick={deleteNetWorthItem}>
                      Delete
                    </button>
                  )}
                  <button type="button" className="bv-btn bv-ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="button" className="bv-btn bv-gold" onClick={submitNetWorthItem}>
                    {editingItemId !== null ? 'Save changes' : 'Add item'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
