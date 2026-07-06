import { useMemo, useState } from 'react'
import { useSettings } from '../context/Settings'
import { getTheme } from '../themes'

// Categorical series colors follow the entity (asset type), never its rank.
// Fixed slot order; both mode variants validated against the app surfaces.
const SERIES_LIGHT: Record<string, string> = {
  stock: '#2a78d6',
  crypto: '#1baf7a',
  commodity: '#eda100',
  etf: '#008300',
  bond: '#4a3aa7',
  mutual_fund: '#e34948',
  reit: '#e87ba4',
  option: '#eb6834'
}
const SERIES_DARK: Record<string, string> = {
  stock: '#3987e5',
  crypto: '#199e70',
  commodity: '#c98500',
  etf: '#008300',
  bond: '#9085e9',
  mutual_fund: '#e66767',
  reit: '#d55181',
  option: '#d95926'
}
const OTHER_COLOR = '#898781'

// Diverging pair for gain/loss polarity (blue ↔ red, CVD-safe).
const GAIN_LIGHT = '#2a78d6'
const LOSS_LIGHT = '#e34948'
const GAIN_DARK = '#3987e5'
const LOSS_DARK = '#e66767'

function useDarkMode(): boolean {
  const { themeId } = useSettings()
  return getTheme(themeId).dark
}

function fmtMoney(v: number): string {
  const sign = v < 0 ? '-' : ''
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ---------- Allocation (part-to-whole): horizontal stacked bar + legend ----------

export interface AllocationSlice {
  label: string
  value: number
}

export function AllocationChart({ slices }: { slices: AllocationSlice[] }): JSX.Element {
  const dark = useDarkMode()
  const palette = dark ? SERIES_DARK : SERIES_LIGHT
  const [hovered, setHovered] = useState<number | null>(null)

  const { segments, total } = useMemo(() => {
    const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value)
    // Fold anything past 7 named series into "Other" — never generate more hues.
    const named = sorted.slice(0, 7)
    const tail = sorted.slice(7)
    const segs = named.map((s) => ({
      ...s,
      color: palette[s.label] ?? OTHER_COLOR
    }))
    if (tail.length > 0) {
      segs.push({ label: 'other', value: tail.reduce((sum, s) => sum + s.value, 0), color: OTHER_COLOR })
    }
    return { segments: segs, total: segs.reduce((sum, s) => sum + s.value, 0) }
  }, [slices, palette])

  if (total <= 0) {
    return <p className="hint-text">Nothing to chart yet — record a buy and it will appear here.</p>
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 2, // 2px surface gap between fills (also the CVD relief between segments)
          height: 34,
          borderRadius: 6,
          overflow: 'hidden'
        }}
      >
        {segments.map((s, i) => (
          <div
            key={s.label}
            title={`${s.label}: ${fmtMoney(s.value)} (${((s.value / total) * 100).toFixed(1)}%)`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: `${(s.value / total) * 100}%`,
              minWidth: 3,
              background: s.color,
              opacity: hovered === null || hovered === i ? 1 : 0.45,
              transition: 'opacity 0.1s'
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginTop: 10 }}>
        {segments.map((s, i) => (
          <span
            key={s.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12.5px', cursor: 'default' }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span>{s.label.replace('_', ' ')}</span>
            <span style={{ color: 'var(--muted)' }}>
              {fmtMoney(s.value)} · {((s.value / total) * 100).toFixed(1)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------- Realized gain by year (polarity): diverging columns ----------

export interface YearGain {
  year: number
  gain: number
}

const W = 640
const H = 220
const M = { top: 14, right: 12, bottom: 26, left: 64 }

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const span = max - min
  const step = Math.pow(10, Math.floor(Math.log10(span / count)))
  const err = (count * step) / span
  const mult = err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1
  const s = step * mult
  const ticks: number[] = []
  for (let v = Math.ceil(min / s) * s; v <= max + 1e-9; v += s) ticks.push(Math.round(v * 100) / 100)
  return ticks
}

/** Column with a 4px rounded data-end; the baseline end stays square. */
function columnPath(x: number, w: number, yBase: number, yEnd: number): string {
  const r = Math.min(4, w / 2, Math.abs(yBase - yEnd))
  if (yEnd < yBase) {
    // positive bar: rounded top
    return `M ${x} ${yBase} V ${yEnd + r} Q ${x} ${yEnd} ${x + r} ${yEnd} H ${x + w - r} Q ${x + w} ${yEnd} ${x + w} ${yEnd + r} V ${yBase} Z`
  }
  // negative bar: rounded bottom
  return `M ${x} ${yBase} V ${yEnd - r} Q ${x} ${yEnd} ${x + r} ${yEnd} H ${x + w - r} Q ${x + w} ${yEnd} ${x + w} ${yEnd - r} V ${yBase} Z`
}

export function GainsByYearChart({ data }: { data: YearGain[] }): JSX.Element {
  const dark = useDarkMode()
  const [hovered, setHovered] = useState<number | null>(null)
  const gainColor = dark ? GAIN_DARK : GAIN_LIGHT
  const lossColor = dark ? LOSS_DARK : LOSS_LIGHT

  const sorted = useMemo(() => [...data].sort((a, b) => a.year - b.year), [data])

  if (sorted.length === 0) {
    return <p className="hint-text">No completed sales yet — profits by year will appear here after your first sale.</p>
  }

  const values = sorted.map((d) => d.gain)
  const rawMin = Math.min(0, ...values)
  const rawMax = Math.max(0, ...values)
  const pad = (rawMax - rawMin || Math.abs(rawMax) || 1) * 0.1
  const min = rawMin < 0 ? rawMin - pad : 0
  const max = rawMax > 0 ? rawMax + pad : 0

  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom
  const y = (v: number): number => M.top + plotH * (1 - (v - min) / (max - min))
  const slot = plotW / sorted.length
  const barW = Math.min(48, slot * 0.6)
  const ticks = niceTicks(min, max)
  const baseline = y(0)

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 720, display: 'block' }} role="img" aria-label="Realized gain or loss by year">
        {/* hairline gridlines */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={M.left - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10.5} fill="var(--muted)">
              {Math.abs(t) >= 1000 ? `$${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : `$${t}`}
            </text>
          </g>
        ))}
        {/* baseline */}
        <line x1={M.left} x2={W - M.right} y1={baseline} y2={baseline} stroke="var(--muted)" strokeWidth={1.25} />
        {/* columns */}
        {sorted.map((d, i) => {
          const x = M.left + slot * i + (slot - barW) / 2
          const isLast = i === sorted.length - 1
          return (
            <g key={d.year}>
              <path
                d={columnPath(x, barW, baseline, y(d.gain))}
                fill={d.gain >= 0 ? gainColor : lossColor}
                opacity={hovered === null || hovered === i ? 1 : 0.45}
              />
              {/* selective direct label: latest year only */}
              {isLast && (
                <text
                  x={x + barW / 2}
                  y={d.gain >= 0 ? y(d.gain) - 6 : y(d.gain) + 13}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--text)"
                >
                  {fmtMoney(d.gain)}
                </text>
              )}
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                {d.year}
              </text>
              {/* hit target wider than the mark */}
              <rect
                x={M.left + slot * i}
                y={M.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          )
        })}
      </svg>
      {hovered !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${((M.left + slot * hovered + slot / 2) / W) * 100}%`,
            top: 0,
            transform: 'translateX(-50%)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 12,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap'
          }}
        >
          <strong>{sorted[hovered].year}</strong> · {fmtMoney(sorted[hovered].gain)}
        </div>
      )}
    </div>
  )
}
