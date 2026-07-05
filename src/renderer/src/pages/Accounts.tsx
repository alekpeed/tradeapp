import { useState } from 'react'
import type { Account } from '@shared/types'
import { useAppData } from '../context/AppData'

export default function Accounts(): JSX.Element {
  const { accounts, refreshAccounts } = useAppData()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Account['kind']>('brokerage')
  const [institution, setInstitution] = useState('')
  const [costBasisMethod, setCostBasisMethod] = useState<Account['costBasisMethod']>('fifo')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Account name is required')
      return
    }
    await window.tradeapp.accounts.create({
      name: name.trim(),
      kind,
      institution: institution.trim() || undefined,
      costBasisMethod
    })
    setName('')
    setInstitution('')
    await refreshAccounts()
  }

  return (
    <div>
      <h1>Accounts</h1>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add an account</h2>
        <p className="hint-text">
          An account can be a real brokerage/exchange account, a crypto wallet, or a
          &quot;Legacy&quot; bucket for old statements where you don&apos;t have full transaction detail.
        </p>
        <form onSubmit={handleCreate} className="form-grid">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fidelity Brokerage" />
          </label>
          <label>
            Kind
            <select value={kind} onChange={(e) => setKind(e.target.value as Account['kind'])}>
              <option value="brokerage">Brokerage</option>
              <option value="wallet">Crypto wallet / exchange</option>
              <option value="legacy">Legacy (old statements)</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Institution (optional)
            <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Coinbase" />
          </label>
          <label>
            Cost basis method
            <select
              value={costBasisMethod}
              onChange={(e) => setCostBasisMethod(e.target.value as Account['costBasisMethod'])}
            >
              <option value="fifo">FIFO (first in, first out)</option>
              <option value="lifo">LIFO (last in, first out)</option>
              <option value="average">Average cost</option>
              <option value="specific_lot">Specific lot (choose per sale)</option>
            </select>
          </label>
          <button type="submit">Add account</button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <h2>Existing accounts</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Institution</th>
              <th>Cost basis method</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.kind}</td>
                <td>{a.institution ?? '—'}</td>
                <td>{a.costBasisMethod}</td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={4} className="hint-text">
                  No accounts yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
