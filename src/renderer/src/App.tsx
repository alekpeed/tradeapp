import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from './context/AppData'
import { SettingsProvider, useSettings } from './context/Settings'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Bubbles from './pages/Bubbles'
import Transactions from './pages/Transactions'
import Instruments from './pages/Instruments'
import Accounts from './pages/Accounts'
import Import from './pages/Import'
import Reports from './pages/Reports'
import Help from './pages/Help'
import Settings from './pages/Settings'
import UpdateToast from './components/UpdateToast'

export interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/bubbles', label: 'Bubbles', icon: '🫧' },
  { to: '/transactions', label: 'Record Trades', icon: '💱' },
  { to: '/import', label: 'Import Old Trades', icon: '📥' },
  { to: '/instruments', label: 'Instruments', icon: '📈' },
  { to: '/accounts', label: 'Accounts', icon: '🏦' },
  { to: '/reports', label: 'Reports & PDF', icon: '📄' },
  { to: '/help', label: 'Help', icon: '❓' },
  { to: '/settings', label: 'Settings', icon: '⚙️' }
]

const SIMPLE_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/help', label: 'Help', icon: '❓' },
  { to: '/settings', label: 'Settings', icon: '⚙️' }
]

function NavLinks({ items }: { items: NavItem[] }): JSX.Element {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          title={item.label}
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </>
  )
}

function Shell(): JSX.Element {
  const { layout } = useSettings()
  const isTop = layout === 'topbar' || layout === 'simple'
  const navItems = layout === 'simple' ? SIMPLE_NAV : NAV_ITEMS

  return (
    <div className={`app-shell layout-${layout}`}>
      {isTop ? (
        <nav className="topbar">
          <div className="brand">
            <span>💼</span>
            <span className="brand-text">TradeApp</span>
          </div>
          <NavLinks items={navItems} />
        </nav>
      ) : (
        <nav className="sidebar">
          <div className="brand">
            <span>💼</span>
            <span className="brand-text">TradeApp</span>
          </div>
          <NavLinks items={navItems} />
        </nav>
      )}
      <main className="content">
        <Routes>
          <Route path="/" element={layout === 'simple' ? <Home /> : <Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bubbles" element={<Bubbles />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/instruments" element={<Instruments />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/import" element={<Import />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/help" element={<Help />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App(): JSX.Element {
  return (
    <SettingsProvider>
      <AppDataProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
        <UpdateToast />
      </AppDataProvider>
    </SettingsProvider>
  )
}
