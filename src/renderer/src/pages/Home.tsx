import { Link } from 'react-router-dom'
import { useAppData } from '../context/AppData'

const TILES = [
  {
    to: '/dashboard',
    icon: '📊',
    title: 'My Portfolio',
    desc: 'See everything you own, what it cost, and your profit so far.'
  },
  {
    to: '/transactions',
    icon: '💱',
    title: 'Record a Trade',
    desc: 'Bought or sold something? Write it down here — it takes a minute.'
  },
  {
    to: '/import',
    icon: '📥',
    title: 'Import Old Trades',
    desc: 'Bring in history from a CSV file or type in old holdings by hand.'
  },
  {
    to: '/reports',
    icon: '📄',
    title: 'Reports & PDF',
    desc: 'See your profits and losses by year, and save any report as a PDF.'
  },
  {
    to: '/instruments',
    icon: '📈',
    title: 'Instruments',
    desc: 'Browse stocks, crypto, gold and more — or add your own ticker.'
  },
  {
    to: '/accounts',
    icon: '🏦',
    title: 'Accounts',
    desc: 'Set up your brokerage accounts, wallets, and legacy buckets.'
  },
  {
    to: '/help',
    icon: '❓',
    title: 'Help & Manual',
    desc: 'Step-by-step instructions for everything in this app.'
  },
  {
    to: '/settings',
    icon: '⚙️',
    title: 'Settings',
    desc: 'Pick your favorite colors and change how the app is laid out.'
  }
]

export default function Home(): JSX.Element {
  const { accounts } = useAppData()

  return (
    <div>
      <h1>Welcome back 👋</h1>
      {accounts.length === 0 && (
        <div className="welcome-banner">
          <strong>First time here? Two quick steps to get started:</strong>
          <ol>
            <li>
              Go to <Link to="/accounts">Accounts</Link> and add your first account (your brokerage,
              a crypto exchange, or a &quot;Legacy&quot; bucket for old records).
            </li>
            <li>
              Then go to <Link to="/transactions">Record a Trade</Link> — or{' '}
              <Link to="/import">Import Old Trades</Link> if you have history to bring in.
            </li>
          </ol>
        </div>
      )}
      <div className="home-grid">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="home-tile">
            <span className="home-tile-icon">{t.icon}</span>
            <span className="home-tile-title">{t.title}</span>
            <span className="home-tile-desc">{t.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
