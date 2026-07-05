import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from './context/AppData'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Instruments from './pages/Instruments'
import Accounts from './pages/Accounts'
import Import from './pages/Import'
import Reports from './pages/Reports'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transactions' },
  { to: '/instruments', label: 'Instruments' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/import', label: 'Import Old Trades' },
  { to: '/reports', label: 'Reports & PDF Export' }
]

export default function App(): JSX.Element {
  return (
    <AppDataProvider>
      <HashRouter>
        <div className="app-shell">
          <nav className="sidebar">
            <div className="brand">TradeApp</div>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/instruments" element={<Instruments />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/import" element={<Import />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AppDataProvider>
  )
}
