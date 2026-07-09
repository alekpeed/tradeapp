export interface Packed<T> {
  item: T
  x: number
  y: number
  r: number
}

export interface PackBounds {
  left: number
  right: number
  top: number
  bottom: number
}

// Iterative relaxation circle-packing: radius by sqrt(value) (gently
// compressed), then repel overlapping circles while pulling everything
// toward the center, clamped to the given bounds.
export function packCircles<T>(
  items: T[],
  valueOf: (t: T) => number,
  bounds: PackBounds,
  opts: { rMin?: number; rMax?: number; gap?: number; iterations?: number } = {}
): Packed<T>[] {
  if (!items.length) return []
  const { rMin = 40, rMax = 120, gap = 30, iterations = 500 } = opts
  const cx = (bounds.left + bounds.right) / 2
  const cy = (bounds.top + bounds.bottom) / 2
  const values = items.map((it) => Math.abs(valueOf(it)))
  const maxV = Math.max(...values)
  const minV = Math.min(...values)

  const nodes: Packed<T>[] = items.map((item, i) => {
    const v = values[i]
    const t = maxV === minV ? 1 : (Math.sqrt(v) - Math.sqrt(minV)) / (Math.sqrt(maxV) - Math.sqrt(minV))
    const r = rMin + t * (rMax - rMin)
    const a = (i / items.length) * Math.PI * 2
    const spanX = (bounds.right - bounds.left) / 2
    const spanY = (bounds.bottom - bounds.top) / 2
    return { item, r, x: cx + Math.cos(a) * spanX * 0.5, y: cy + Math.sin(a) * spanY * 0.5 }
  })

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x += (cx - nodes[i].x) * 0.006
      nodes[i].y += (cy - nodes[i].y) * 0.008
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x
        let dy = nodes[j].y - nodes[i].y
        const d = Math.hypot(dx, dy) || 0.01
        const need = nodes[i].r + nodes[j].r + gap
        if (d < need) {
          const push = (need - d) / 2
          dx /= d
          dy /= d
          nodes[i].x -= dx * push
          nodes[i].y -= dy * push
          nodes[j].x += dx * push
          nodes[j].y += dy * push
        }
      }
    }
    for (const n of nodes) {
      n.x = Math.max(bounds.left + n.r, Math.min(bounds.right - n.r, n.x))
      n.y = Math.max(bounds.top + n.r, Math.min(bounds.bottom - n.r, n.y))
    }
  }
  return nodes
}
