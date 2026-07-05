import { useEffect, useMemo, useState } from 'react'
import type { Position, RealizedGainLoss, Transaction } from '@shared/types'
import { useAppData } from '../context/AppData'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export default function Reports(): JSX.Element {
  const { instruments, accounts } = useAppData()
  const [realizedGains, setRealizedGains] = useState<RealizedGainLoss[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [year, setYear] = useState<number | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [txnYear, setTxnYear] = useState('')
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  useEffect(() => {
    window.tradeapp.positions.list().then(setPositions)
    window.tradeapp.transactions.list().then(setTransactions)
  }, [])

  useEffect(() => {
    window.tradeapp.realizedGains.list(year ? { year: Number(year) } : {}).then(setRealizedGains)
  }, [year])

  const symbolFor = (id: number): string => instruments.find((i) => i.id === id)?.symbol ?? `#${id}`
  const accountFor = (id: number): string => accounts.find((a) => a.id === id)?.name ?? `#${id}`

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        if (fromDate && t.date < fromDate) return false
        if (toDate && t.date > toDate) return false
        return true
      }),
    [transactions, fromDate, toDate]
  )

  function applyTxnYear(value: string): void {
    setTxnYear(value)
    const parsed = parseInt(value, 10)
    if (value.length === 4 && !Number.isNaN(parsed)) {
      setFromDate(`${parsed}-01-01`)
      setToDate(`${parsed}-12-31`)
    } else if (value === '') {
      setFromDate('')
      setToDate('')
    }
  }

  const txnRangeLabel = useMemo(() => {
    if (txnYear.length === 4 && fromDate === `${txnYear}-01-01` && toDate === `${txnYear}-12-31`) {
      return `Transactions ${txnYear}`
    }
    if (fromDate || toDate) {
      return `Transactions ${fromDate || 'beginning'} to ${toDate || 'today'}`
    }
    return 'Full Transaction History'
  }, [txnYear, fromDate, toDate])

  const totalGain = useMemo(() => realizedGains.reduce((s, g) => s + g.gain, 0), [realizedGains])
  const shortTermGain = useMemo(
    () => realizedGains.filter((g) => g.term === 'short').reduce((s, g) => s + g.gain, 0),
    [realizedGains]
  )
  const longTermGain = useMemo(
    () => realizedGains.filter((g) => g.term === 'long').reduce((s, g) => s + g.gain, 0),
    [realizedGains]
  )

  async function exportRealizedGainsPdf(): Promise<void> {
    const rowsHtml = realizedGains
      .map(
        (g) => `<tr>
          <td>${escapeHtml(symbolFor(g.instrumentId))}</td>
          <td>${escapeHtml(accountFor(g.accountId))}</td>
          <td>${g.acquiredDate}</td>
          <td>${g.soldDate}</td>
          <td>${g.quantity}</td>
          <td>$${g.proceeds.toFixed(2)}</td>
          <td>$${g.costBasis.toFixed(2)}</td>
          <td class="${g.gain >= 0 ? 'gain-positive' : 'gain-negative'}">$${g.gain.toFixed(2)}</td>
          <td>${g.term}</td>
        </tr>`
      )
      .join('')
    const html = `
      <p>Short-term gain/loss: $${shortTermGain.toFixed(2)} &nbsp;|&nbsp; Long-term gain/loss: $${longTermGain.toFixed(2)} &nbsp;|&nbsp; Total: $${totalGain.toFixed(2)}</p>
      <table>
        <thead><tr><th>Symbol</th><th>Account</th><th>Acquired</th><th>Sold</th><th>Qty</th><th>Proceeds</th><th>Cost basis</th><th>Gain/loss</th><th>Term</th></tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="9">No realized gains in this period.</td></tr>'}</tbody>
      </table>`
    const title = year ? `Realized Gains ${year}` : 'Realized Gains — All Time'
    const result = await window.tradeapp.reports.exportPdf({ title, html })
    setExportStatus(result.filePath ? `Saved to ${result.filePath}` : 'Export canceled.')
  }

  async function exportPositionsPdf(): Promise<void> {
    const rowsHtml = positions
      .map(
        (p) => `<tr>
          <td>${escapeHtml(p.symbol)}</td>
          <td>${escapeHtml(p.name)}</td>
          <td>${p.type}</td>
          <td>${p.quantity}</td>
          <td>$${p.avgCostPerUnit.toFixed(2)}</td>
          <td>$${p.costBasisTotal.toFixed(2)}</td>
        </tr>`
      )
      .join('')
    const html = `<table>
        <thead><tr><th>Symbol</th><th>Name</th><th>Type</th><th>Quantity</th><th>Avg cost/unit</th><th>Cost basis</th></tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="6">No open positions.</td></tr>'}</tbody>
      </table>`
    const result = await window.tradeapp.reports.exportPdf({ title: 'Current Positions', html })
    setExportStatus(result.filePath ? `Saved to ${result.filePath}` : 'Export canceled.')
  }

  async function exportTransactionHistoryPdf(): Promise<void> {
    const rowsHtml = filteredTransactions
      .map(
        (t) => `<tr>
          <td>${t.date}</td>
          <td>${escapeHtml(accountFor(t.accountId))}</td>
          <td>${escapeHtml(symbolFor(t.instrumentId))}</td>
          <td>${t.type}</td>
          <td>${t.quantity}</td>
          <td>$${t.price.toFixed(2)}</td>
          <td>$${t.amount.toFixed(2)}</td>
          <td>$${t.fees.toFixed(2)}</td>
        </tr>`
      )
      .join('')
    const html = `
      <p>${filteredTransactions.length} transaction(s)${fromDate || toDate ? ` from ${fromDate || 'the beginning'} through ${toDate || 'today'}` : ''}.</p>
      <table>
        <thead><tr><th>Date</th><th>Account</th><th>Symbol</th><th>Type</th><th>Qty</th><th>Price</th><th>Amount</th><th>Fees</th></tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="8">No transactions in this period.</td></tr>'}</tbody>
      </table>`
    const result = await window.tradeapp.reports.exportPdf({ title: txnRangeLabel, html })
    setExportStatus(result.filePath ? `Saved to ${result.filePath}` : 'Export canceled.')
  }

  return (
    <div>
      <h1>Reports &amp; PDF Export</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Realized gains / losses</h2>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <label>
            Year
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
              placeholder="all years"
            />
          </label>
          <button type="button" onClick={exportRealizedGainsPdf}>
            Export this table to PDF
          </button>
        </div>
        <p>
          Short-term: <strong className={shortTermGain >= 0 ? 'gain-positive' : 'gain-negative'}>${shortTermGain.toFixed(2)}</strong>
          {'   '}Long-term: <strong className={longTermGain >= 0 ? 'gain-positive' : 'gain-negative'}>${longTermGain.toFixed(2)}</strong>
          {'   '}Total: <strong className={totalGain >= 0 ? 'gain-positive' : 'gain-negative'}>${totalGain.toFixed(2)}</strong>
        </p>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Account</th>
              <th>Acquired</th>
              <th>Sold</th>
              <th>Qty</th>
              <th>Proceeds</th>
              <th>Cost basis</th>
              <th>Gain/loss</th>
              <th>Term</th>
            </tr>
          </thead>
          <tbody>
            {realizedGains.map((g) => (
              <tr key={g.id}>
                <td>{symbolFor(g.instrumentId)}</td>
                <td>{accountFor(g.accountId)}</td>
                <td>{g.acquiredDate}</td>
                <td>{g.soldDate}</td>
                <td>{g.quantity}</td>
                <td>${g.proceeds.toFixed(2)}</td>
                <td>${g.costBasis.toFixed(2)}</td>
                <td className={g.gain >= 0 ? 'gain-positive' : 'gain-negative'}>${g.gain.toFixed(2)}</td>
                <td>{g.term}</td>
              </tr>
            ))}
            {realizedGains.length === 0 && (
              <tr>
                <td colSpan={9} className="hint-text">
                  No realized gains yet — record a sell on the Transactions page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Print transactions for any period</h2>
        <p className="hint-text">
          Type a year for a full-year report, or pick exact From/To dates for any custom period.
          Leave everything blank for your complete history.
        </p>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <label>
            Year (quick pick)
            <input
              type="number"
              value={txnYear}
              onChange={(e) => applyTxnYear(e.target.value)}
              placeholder="e.g. 2025"
            />
          </label>
          <label>
            From date
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            To date
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <button type="button" onClick={exportTransactionHistoryPdf}>
            📄 Export &quot;{txnRangeLabel}&quot; to PDF
          </button>
        </div>
        <p className="hint-text">
          {filteredTransactions.length} transaction(s) in this period — preview below.
        </p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Symbol</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
              <th>Fees</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.slice(0, 50).map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{accountFor(t.accountId)}</td>
                <td>{symbolFor(t.instrumentId)}</td>
                <td>{t.type}</td>
                <td>{t.quantity}</td>
                <td>${t.price.toFixed(2)}</td>
                <td>${t.amount.toFixed(2)}</td>
                <td>${t.fees.toFixed(2)}</td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={8} className="hint-text">
                  No transactions in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filteredTransactions.length > 50 && (
          <p className="hint-text">
            Showing first 50 of {filteredTransactions.length} — the PDF will include all of them.
          </p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Other exports</h2>
        <div className="button-row">
          <button type="button" onClick={exportPositionsPdf}>
            Export current positions
          </button>
        </div>
      </div>

      {exportStatus && <p className="hint-text">{exportStatus}</p>}
    </div>
  )
}
