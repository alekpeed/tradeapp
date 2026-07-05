import { LAYOUTS, useSettings } from '../context/Settings'
import { THEMES } from '../themes'

export default function Settings(): JSX.Element {
  const { themeId, layout, setThemeId, setLayout } = useSettings()

  return (
    <div>
      <h1>Settings</h1>

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
