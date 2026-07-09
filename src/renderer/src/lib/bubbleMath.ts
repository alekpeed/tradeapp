// Generic tree node for the bubble drill-down chart, plus time-aware
// valuation helpers. A node is a "leaf" when `value` is set; group nodes
// roll up from `children` instead. Leaves with a known acquiredDate +
// costBasis are reconstructed historically by linear interpolation from
// cost basis to today's value — no fabricated volatility, since this is
// real money and we have no historical price feed.

export type BubbleMeta =
  | { kind: 'group' }
  | { kind: 'position'; accountId: number; instrumentId: number; symbol: string }
  | { kind: 'lot'; lotId: number; accountId: number; instrumentId: number }
  | { kind: 'netWorthItem'; itemId: number }

export interface BubbleNode {
  id: string
  name: string
  caption?: string
  value?: number
  costBasis?: number
  acquiredDate?: string | null
  unpriced?: boolean
  hue: number
  debt?: boolean
  isLot?: boolean
  children?: BubbleNode[]
  meta?: BubbleMeta
}

export const TIME_START = 2022.0

export function timeEndYear(): number {
  const now = new Date()
  return now.getFullYear() + now.getMonth() / 12 + now.getDate() / 365
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function yearOfT(t: number): number {
  return TIME_START + t * (timeEndYear() - TIME_START)
}

export function dateLabelForT(t: number): string {
  const year = yearOfT(t)
  const y = Math.floor(year)
  return MONTHS[Math.min(11, Math.max(0, Math.round((year - y) * 12)))] + ' ' + y
}

export function dateToT(iso: string): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  const year = d.getFullYear() + d.getMonth() / 12 + d.getDate() / 365
  return (year - TIME_START) / (timeEndYear() - TIME_START)
}

export function leafValueAt(n: BubbleNode, t: number): number {
  const cur = n.value ?? 0
  if (!n.acquiredDate || n.costBasis === undefined) return cur
  const t0 = dateToT(n.acquiredDate)
  const k = Math.max(0, Math.min(1, (t - t0) / Math.max(0.001, 1 - t0)))
  return n.costBasis + (cur - n.costBasis) * k
}

export function leafChangeAt(n: BubbleNode, t: number): number | undefined {
  if (n.unpriced || n.costBasis === undefined || n.costBasis === 0) return undefined
  const v = leafValueAt(n, t)
  return ((v - n.costBasis) / Math.abs(n.costBasis)) * 100
}

// whether a node has come into existence by time t (only leaves with a
// known acquisition date can be "not yet acquired"; everything else is
// treated as always having existed, since we don't know its history)
export function existsAt(n: BubbleNode, t: number): boolean {
  if (n.value === undefined) return true
  if (!n.acquiredDate) return true
  return dateToT(n.acquiredDate) <= t
}

// A node with loaded children (a group, or a position whose lots have been
// fetched) rolls up from those children — that's the more accurate source
// once available. A node with a plain `value` and no children yet (a position
// not drilled into, a net-worth item) falls back to its own leaf valuation.
// Children not yet acquired at time t contribute nothing.
export function nodeValueAt(n: BubbleNode, t: number): number {
  if (n.children && n.children.length) {
    return n.children.reduce((s, c) => s + (existsAt(c, t) ? nodeValueAt(c, t) : 0), 0)
  }
  if (n.value !== undefined) return leafValueAt(n, t)
  return 0
}

export function nodeChangeAt(n: BubbleNode, t: number): number | undefined {
  if (n.children && n.children.length) {
    let w = 0
    let acc = 0
    for (const c of n.children) {
      if (!existsAt(c, t)) continue
      const v = Math.abs(nodeValueAt(c, t))
      const ch = nodeChangeAt(c, t)
      if (ch !== undefined) {
        acc += ch * v
        w += v
      }
    }
    return w ? acc / w : undefined
  }
  if (n.value !== undefined) return leafChangeAt(n, t)
  return undefined
}

export function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function hueFrom(base: number, key: string): number {
  return (base + (hashStr(key) % 140) - 70 + 360) % 360
}
