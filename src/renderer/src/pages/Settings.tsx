import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/ipc'
import { LAYOUTS, useSettings } from '../context/Settings'
import { THEMES } from '../themes'

function UpdateStatusText({ status }: { status: UpdateStatus }): JSX.Element | null {
  switch (status.state) {
    case 'checking':
      return <p className="hint-text">Checking for updates…</p>
    case 'available':
      return <p className="hint-text">Update {status.version} found — downloading now…</p>
    case 'not-available':
      return <p className="hint-text">You're up to date.</p>
    case 'downloading':
      return <p className="hint-text">Downloading update… {status.percent}%</p>
    case 'downloaded':
      return (
        <p className="hint-text">
          Version {status.version} is downloaded and ready — use the &quot;Restart now to update&quot;
          button in the corner of the screen whenever you're ready.
        </p>
      )
    case 'error':
      return <p className="error-text">Couldn't check for updates: {status.message}</p>
    default:
      return null
  }
}

export default function Settings(): JSX.Element {
  const { themeId, layout, setThemeId, setLayout } = useSettings()
  const [version, setVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })

  useEffect(() => {
    window.tradeapp.updater.getVersion().then(setVersion)
    return window.tradeapp.updater.onStatus(setUpdateStatus)
  }, [])

  async function checkForUpdates(): Promise<void> {
    setUpdateStatus({ state: 'checking' })
    await window.tradeapp.updater.checkNow()
  }

  return (
    <div>
      <h1>Settings</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Software update</h2>
        <p className="hint-text">You're running version {version || '…'}.</p>
        <button type="button" onClick={checkForUpdates}>
          Check for updates now
        </button>
        <UpdateStatusText status={updateStatus} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Layout</h2>
        <p className="hint-text">
          Choose how the app is arranged. &quot;Big &amp; Simple&quot; uses larger text and a Home
          screen with big buttons — great if you want everything spelled out.
        </p>
        <div className="layout-cards">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={'layout-card' + (layout === l.id ? ' selected' : '')}
              onClick={() => setLayout(l.id)}
            >
              <div className="layout-card-name">
                {layout === l.id ? '✓ ' : ''}
                {l.name}
              </div>
              <div className="layout-card-desc">{l.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Color theme</h2>
        <p className="hint-text">
          20 themes — 12 light, 8 dark. Click any of them to try it; your choice is saved
          automatically.
        </p>
        <h2>Light themes</h2>
        <div className="theme-grid">
          {THEMES.filter((t) => !t.dark).map((t) => (
            <button
              key={t.id}
              type="button"
              className={'theme-swatch' + (themeId === t.id ? ' selected' : '')}
              onClick={() => setThemeId(t.id)}
            >
              <span className="swatch-dots">
                <span className="swatch-dot" style={{ background: t.vars['--primary'] }} />
                <span className="swatch-dot" style={{ background: t.vars['--nav-bg'] }} />
                <span className="swatch-dot" style={{ background: t.vars['--bg'] }} />
              </span>
              <span className="theme-swatch-name">
                {themeId === t.id ? '✓ ' : ''}
                {t.name}
              </span>
            </button>
          ))}
        </div>
        <h2>Dark themes</h2>
        <div className="theme-grid">
          {THEMES.filter((t) => t.dark).map((t) => (
            <button
              key={t.id}
              type="button"
              className={'theme-swatch' + (themeId === t.id ? ' selected' : '')}
              onClick={() => setThemeId(t.id)}
            >
              <span className="swatch-dots">
                <span className="swatch-dot" style={{ background: t.vars['--primary'] }} />
                <span className="swatch-dot" style={{ background: t.vars['--surface'] }} />
                <span className="swatch-dot" style={{ background: t.vars['--bg'] }} />
              </span>
              <span className="theme-swatch-name">
                {themeId === t.id ? '✓ ' : ''}
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
