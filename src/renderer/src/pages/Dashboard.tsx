import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Position, RealizedGainLoss } from '@shared/types'
import { useAppData } from '../context/AppData'

function PriceCell({
  position,
  onSaved
}: {
  position: Position
  onSaved: () => void
}): JSX.Element {
  const [value, setValue] = useState(position.manualPrice?.toString() ?? '')

  useEffect(() => {
    setValue(position.manualPrice?.toString() ?? '')
  }, [position.manualPrice])

  async function save(): Promise<void> {
    const trimmed = value.trim()
    const parsed = trimmed === '' ? null : parseFloat(trimmed)
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return
    if (parsed === position.manualPrice) return
    await window.tradeapp.instruments.setManualPrice(position.instrumentId, parsed)
    onSaved()
  }

  return (
    <input
      className="inline-price-input"
      value={value}
      placeholder="set price"
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

export default function Dashboard(): JSX.Element {
  const { accounts, refreshInstruments } = useAppData()
  const [positions, setPositions] = useState<Position[]>([])
  const [realizedGains, setRealizedGains] = useState<RealizedGainLoss[]>([])

  const reload = useCallback(async (): Promise<void> => {
    setPositions(await window.tradeapp.positions.list())
    setRealizedGains(await window.tradeapp.realizedGains.list())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const totalCostBasis = useMemo(
    () => positions.reduce((sum, p) => sum + p.costBasisTotal, 0),
    [positions]
  )
  const totalRealizedGain = useMemo(
    () => realizedGains.reduce((sum, g) => sum + g.gain, 0),
    [realizedGains]
  )
  const ytdRealizedGain = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return realizedGains
      .filter((g) => new Date(g.soldDate).getFullYear() === currentYear)
      .reduce((sum, g) => sum + g.gain, 0)
  }, [realizedGains])

  const pricedPositions = useMemo(() => positions.filter((p) => p.manualPrice !== null), [positions])
  const totalUnrealized = useMemo(
    () =>
      pricedPositions.reduce(
        (sum, p) => sum + (p.quantity * (p.manualPrice as number) - p.costBasisTotal),
        0
      ),
    [pricedPositions]
  )

  const byType = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of positions) {
      map.set(p.type, (map.get(p.type) ?? 0) + p.costBasisTotal)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [positions])

  async function handlePriceSaved(): Promise<void> {
    await reload()
    await refreshInstruments()
  }

  return (
    <div>
      <h1>My Portfolio</h1>

      {accounts.length === 0 && (
        <div className="welcome-banner">
          <strong>Welcome! Two quick steps to get started:</strong>
          <ol>
            <li>
              Add your first account on the <Link to="/accounts">Accounts</Link> page (your
              brokerage, a crypto exchange, or a &quot;Legacy&quot; bucket for old records).
            </li>
            <li>
              Then record your first trade on the <Link to="/transactions">Record Trades</Link>{' '}
              page — or bring in history via <Link to="/import">Import Old Trades</Link>.
            </li>
          </ol>
          <p className="hint-text">
            Not sure about anything? The <Link to="/help">Help</Link> page walks through every step.
          </p>
        </div>
      )}

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-label">Open positions</div>
          <div className="stat-value">{positions.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Total cost basis (open)</div>
          <div className="stat-value">${totalCostBasis.toFixed(2)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Realized gain — all time</div>
          <div className={'stat-value ' + (totalRealizedGain >= 0 ? 'gain-positive' : 'gain-negative')}>
            ${totalRealizedGain.toFixed(2)}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Realized gain — this year</div>
          <div className={'stat-value ' + (ytdRealizedGain >= 0 ? 'gain-positive' : 'gain-negative')}>
            ${ytdRealizedGain.toFixed(2)}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">
            Unrealized gain {pricedPositions.length < positions.length ? '(priced only)' : ''}
          </div>
          <div className={'stat-value ' + (totalUnrealized >= 0 ? 'gain-positive' : 'gain-negative')}>
            {pricedPositions.length > 0 ? `$${totalUnrealized.toFixed(2)}` : '—'}
          </div>
        </div>
      </div>

      <h2>Current positions</h2>
      <div className="card">
        <p className="hint-text">
          💡 Type today&apos;s price into the &quot;Current price&quot; box on any row (then press
          Enter) to see its market value and unrealized gain.
        </p>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Avg cost/unit</th>
              <th>Cost basis</th>
              <th>Current price</th>
              <th>Market value</th>
              <th>Unrealized gain</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const marketValue = p.manualPrice !== null ? p.quantity * p.manualPrice : null
              const unrealized = marketValue !== null ? marketValue - p.costBasisTotal : null
              return (
                <tr key={`${p.accountId}-${p.instrumentId}`}>
                  <td>{p.symbol}</td>
                  <td>{p.name}</td>
                  <td>{p.type}</td>
                  <td>{p.quantity}</td>
                  <td>${p.avgCostPerUnit.toFixed(2)}</td>
                  <td>${p.costBasisTotal.toFixed(2)}</td>
                  <td>
                    <PriceCell position={p} onSaved={handlePriceSaved} />
                  </td>
                  <td>{marketValue !== null ? `$${marketValue.toFixed(2)}` : '—'}</td>
                  <td className={unrealized === null ? '' : unrealized >= 0 ? 'gain-positive' : 'gain-negative'}>
                    {unrealized !== null ? `$${unrealized.toFixed(2)}` : '—'}
                  </td>
                </tr>
              )
            })}
            {positions.length === 0 && (
              <tr>
                <td colSpan={9} className="hint-text">
                  Nothing here yet — record a buy on the Record Trades page and it will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Cost basis by asset type</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Cost basis</th>
            </tr>
          </thead>
          <tbody>
            {byType.map(([type, value]) => (
              <tr key={type}>
                <td>{type}</td>
                <td>${value.toFixed(2)}</td>
              </tr>
            ))}
            {byType.length === 0 && (
              <tr>
                <td colSpan={2} className="hint-text">
                  No open positions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
