import { useEffect, useMemo, useRef, useState } from 'react'
import {
  type BubbleNode,
  dateLabelForT,
  existsAt,
  nodeChangeAt,
  nodeValueAt
} from '../lib/bubbleMath'
import { packCircles } from '../lib/packCircles'
import './BubbleChart.css'

const fmt = (n: number): string => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US')

function resolvePath(root: BubbleNode, path: string[]): BubbleNode[] {
  const result: BubbleNode[] = [root]
  let node = root
  for (let i = 1; i < path.length; i++) {
    const next = (node.children ?? []).find((c) => c.id === path[i])
    if (!next) break
    result.push(next)
    node = next
  }
  return result
}

interface BubbleChartProps {
  root: BubbleNode
  onDrillPosition: (accountId: number, instrumentId: number) => void
  onAddClick: () => void
  onEditNetWorthItem: (itemId: number) => void
  realizedGain?: { ytd: number; allTime: number }
}

export default function BubbleChart({
  root,
  onDrillPosition,
  onAddClick,
  onEditNetWorthItem,
  realizedGain
}: BubbleChartProps): JSX.Element {
  const [path, setPath] = useState<string[]>(['root'])
  const [timeT, setTimeT] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 900, h: 640 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setSize({ w: box.width, h: box.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const resolved = useMemo(() => resolvePath(root, path), [root, path])
  const current = resolved[resolved.length - 1]

  const kids = useMemo(
    () => (current.children ?? []).filter((n) => existsAt(n, timeT)),
    [current, timeT]
  )

  const bounds = { left: 50, right: size.w - 50, top: 76, bottom: size.h - 130 }
  const laid = useMemo(
    () =>
      packCircles(kids, (n) => nodeValueAt(n, timeT), bounds, {
        rMin: Math.max(34, size.w * 0.045),
        rMax: Math.max(90, size.w * 0.13),
        gap: 26,
        iterations: 400
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kids, timeT, size.w, size.h]
  )

  const total = nodeValueAt(current, timeT)
  const change = nodeChangeAt(current, timeT)

  function enter(n: BubbleNode): void {
    if (n.children && n.children.length) {
      setPath((p) => [...p, n.id])
      return
    }
    if (n.meta?.kind === 'position') {
      onDrillPosition(n.meta.accountId, n.meta.instrumentId)
      setPath((p) => [...p, n.id])
      return
    }
    if (n.meta?.kind === 'netWorthItem') {
      onEditNetWorthItem(n.meta.itemId)
    }
  }

  function stepOut(): void {
    setPath((p) => (p.length > 1 ? p.slice(0, -1) : p))
  }

  return (
    <div className="bv-root" ref={containerRef}>
      <div className="bv-crumb">
        {resolved.map((n, i) => (
          <span key={n.id} style={{ display: 'contents' }}>
            {i > 0 && <span className="bv-sep">▸</span>}
            <span
              className={'bv-step' + (i === resolved.length - 1 ? ' bv-here' : '') + (i === 0 ? ' bv-home' : '')}
              onClick={() => setPath(path.slice(0, i + 1))}
            >
              {i === 0 ? '◉ ' + n.name : n.name}
            </span>
          </span>
        ))}
      </div>

      <div className="bv-readout">
        <div className="bv-v">{fmt(total)}</div>
        <div className="bv-l2">
          {current.id === 'root' ? 'total net worth' : current.name}
          {change !== undefined && !current.debt && (
            <>
              {' · '}
              <span className={change >= 0 ? 'bv-up' : 'bv-down'}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(change % 1 ? 1 : 0)}%
              </span>
            </>
          )}
          {timeT < 0.999 && <span style={{ color: '#c9a95e' }}> · as of {dateLabelForT(timeT)}</span>}
        </div>
        {realizedGain && (current.id === 'root' || current.id === 'investments') && timeT >= 0.999 && (
          <div className="bv-l2">
            realized this year{' '}
            <span className={realizedGain.ytd >= 0 ? 'bv-up' : 'bv-down'}>
              {realizedGain.ytd >= 0 ? '+' : ''}
              {fmt(realizedGain.ytd)}
            </span>
            {' · all-time '}
            <span className={realizedGain.allTime >= 0 ? 'bv-up' : 'bv-down'}>
              {realizedGain.allTime >= 0 ? '+' : ''}
              {fmt(realizedGain.allTime)}
            </span>
          </div>
        )}
      </div>

      <div className="bv-stage" onClick={stepOut}>
        {kids.length === 0 && (
          <div className="bv-empty">
            {current.children ? `nothing held yet as of ${dateLabelForT(timeT)}` : 'nothing here yet'}
          </div>
        )}
        {laid.map((L, idx) => {
          const n = L.item
          const val = nodeValueAt(n, timeT)
          const chg = n.value !== undefined ? nodeChangeAt(n, timeT) : undefined
          const gain = n.isLot && n.costBasis !== undefined ? val - n.costBasis : undefined
          const nameFs = Math.max(11, Math.min(19, L.r * 0.24))
          const valFs = Math.max(10, Math.min(15, L.r * 0.18))
          const hueVars = { '--h': n.hue, '--h2': (n.hue + 42) % 360, '--h3': (n.hue + 310) % 360 } as React.CSSProperties
          return (
            <div key={n.id}>
              <div
                className="bv-refl"
                style={{
                  ...hueVars,
                  left: L.x,
                  top: L.y + L.r * 0.78,
                  width: L.r * 1.5,
                  height: L.r * 0.5
                }}
              />
              <div
                className={'bv-bubble' + (n.debt ? ' bv-debt' : '')}
                style={
                  {
                    ...hueVars,
                    left: L.x,
                    top: L.y,
                    width: L.r * 2,
                    height: L.r * 2,
                    '--dur': `${((6 + idx * 0.7) % 5) + 6}s`,
                    '--delay': `${idx * 0.6}s`,
                    '--bob': `${-8 - (idx % 3) * 4}px`,
                    '--rot': (idx * 67) % 360
                  } as React.CSSProperties
                }
                onClick={(e) => {
                  e.stopPropagation()
                  enter(n)
                }}
              >
                <div className="bv-skin" />
                <div className="bv-iris" />
                <div className="bv-edge" />
                <div className="bv-glow" />
                <div className="bv-glint" />
                <div className="bv-refl2" />
                <div className="bv-content">
                  <div className="bv-nm" style={{ fontSize: nameFs }}>
                    {n.name}
                  </div>
                  {n.caption && <div className="bv-caption">{n.caption}</div>}
                  <div className="bv-val" style={{ fontSize: valFs }}>
                    {fmt(val)}
                  </div>
                  {chg !== undefined && !n.debt && (
                    <div className={'bv-chg ' + (chg >= 0 ? 'bv-up' : 'bv-down')}>
                      {chg >= 0 ? '+' : ''}
                      {chg.toFixed(chg % 1 ? 1 : 0)}%
                    </div>
                  )}
                  {n.debt && <div className="bv-chg bv-down">owed</div>}
                  {n.isLot && gain !== undefined && (
                    <div className="bv-lotsub">
                      {gain >= 0 ? '+' : ''}
                      {fmt(gain)}
                    </div>
                  )}
                  {n.unpriced && !n.isLot && <div className="bv-lotsub">no price set</div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button type="button" className="bv-addbtn" onClick={onAddClick} title="Record a trade or net-worth item">
        +
      </button>

      <div className="bv-dial">
        <div className="bv-cap">⟲ turn back time — drag to any date</div>
        <div className="bv-track">
          <div className="bv-datelabel">{timeT >= 0.999 ? 'Today' : dateLabelForT(timeT)}</div>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(timeT * 1000)}
            onChange={(e) => setTimeT(Number(e.target.value) / 1000)}
          />
        </div>
        <div className="bv-ticks">
          <span>2022</span>
          <span>2023</span>
          <span>2024</span>
          <span>2025</span>
          <span className="bv-now">today</span>
        </div>
      </div>

      <div className="bv-hint">click a bubble to look inside · click empty space to step back out</div>
    </div>
  )
}
