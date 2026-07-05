import { useEffect, useMemo, useState } from 'react'
import type { Position, RealizedGainLoss } from '@shared/types'
import { useAppData } from '../context/AppData'

export default function Dashboard(): JSX.Element {
  const { accounts } = useAppData()
  const [positions, setPositions] = useState<Position[]>([])
  const [realizedGains, setRealizedGains] = useState<RealizedGainLoss[]>([])

  useEffect(() => {
    window.tradeapp.positions.list().then(setPositions)
    window.tradeapp.realizedGains.list().then(setRealizedGains)
  }, [])

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

  const byType = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of positions) {
      map.set(p.type, (map.get(p.type) ?? 0) + p.costBasisTotal)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [positions])

  return (
    <div>
      <h1>Dashboard</h1>

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
          <div className="stat-label">Accounts</div>
          <div className="stat-value">{accounts.length}</div>
        </div>
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
                  No open positions yet — record a buy on the Transactions page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Current positions</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Avg cost/unit</th>
              <th>Cost basis</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={`${p.accountId}-${p.instrumentId}`}>
                <td>{p.symbol}</td>
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td>{p.quantity}</td>
                <td>${p.avgCostPerUnit.toFixed(2)}</td>
                <td>${p.costBasisTotal.toFixed(2)}</td>
              </tr>
            ))}
            {positions.length === 0 && (
              <tr>
                <td colSpan={6} className="hint-text">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
