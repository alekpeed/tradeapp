import type { Account, InstrumentType, NetWorthCategory, NetWorthItem, OpenLotSummary, Position } from '@shared/types'
import { type BubbleNode, hueFrom } from './bubbleMath'

const TYPE_GROUPS: Record<InstrumentType, { label: string; hue: number }> = {
  stock: { label: 'Stocks', hue: 220 },
  etf: { label: 'Funds & ETFs', hue: 155 },
  mutual_fund: { label: 'Funds & ETFs', hue: 155 },
  bond: { label: 'Bonds', hue: 276 },
  crypto: { label: 'Crypto', hue: 175 },
  commodity: { label: 'Commodities', hue: 42 },
  reit: { label: 'Real Estate (REIT)', hue: 30 },
  forex: { label: 'Forex', hue: 190 },
  option: { label: 'Options', hue: 300 },
  future: { label: 'Futures', hue: 260 },
  cash: { label: 'Cash Equivalents', hue: 195 },
  custom: { label: 'Other Instruments', hue: 0 }
}

const CATEGORY_ORDER: NetWorthCategory[] = ['retirement', 'cash', 'real_estate', 'collectible', 'debt']
const CATEGORY_LABEL: Record<NetWorthCategory, string> = {
  retirement: 'Retirement',
  cash: 'Cash & Bank',
  real_estate: 'Real Estate',
  collectible: 'Collectibles',
  debt: 'Credit & Debt'
}
const CATEGORY_HUE: Record<NetWorthCategory, number> = {
  retirement: 145,
  cash: 195,
  real_estate: 38,
  collectible: 322,
  debt: 352
}

export function positionKey(accountId: number, instrumentId: number): string {
  return `${accountId}:${instrumentId}`
}

function lotNode(l: OpenLotSummary, priced: boolean, manualPrice: number | null, hue: number, accountId: number, instrumentId: number): BubbleNode {
  const costBasis = l.remainingQuantity * l.costBasisPerUnit
  const value = priced && manualPrice !== null ? l.remainingQuantity * manualPrice : costBasis
  const acquired = new Date(l.acquiredDate)
  const label = Number.isNaN(acquired.getTime())
    ? l.acquiredDate
    : acquired.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return {
    id: `lot-${l.id}`,
    name: label,
    caption: `${l.remainingQuantity} units @ $${l.costBasisPerUnit.toFixed(2)}${l.estimatedBasis ? ' (est.)' : ''}`,
    value,
    costBasis,
    acquiredDate: l.acquiredDate,
    unpriced: !priced,
    isLot: true,
    hue,
    meta: { kind: 'lot', lotId: l.id, accountId, instrumentId }
  }
}

function positionNode(p: Position, accounts: Account[], lotsByKey: Record<string, OpenLotSummary[]>, groupHue: number): BubbleNode {
  const priced = p.manualPrice !== null
  const value = priced ? p.quantity * (p.manualPrice as number) : p.costBasisTotal
  const accountName = accounts.find((a) => a.id === p.accountId)?.name ?? `Account #${p.accountId}`
  const hue = hueFrom(groupHue, p.symbol)
  const key = positionKey(p.accountId, p.instrumentId)
  const lots = lotsByKey[key]
  return {
    id: `pos-${key}`,
    name: p.name,
    caption: `${p.symbol} · ${accountName}`,
    value,
    costBasis: priced ? p.costBasisTotal : undefined,
    unpriced: !priced,
    hue,
    children: lots?.map((l) => lotNode(l, priced, p.manualPrice, hue, p.accountId, p.instrumentId)),
    meta: { kind: 'position', accountId: p.accountId, instrumentId: p.instrumentId, symbol: p.symbol }
  }
}

function netWorthNode(item: NetWorthItem): BubbleNode {
  const isDebt = item.category === 'debt'
  return {
    id: `nwi-${item.id}`,
    name: item.name,
    value: item.value,
    costBasis: item.originalValue ?? undefined,
    acquiredDate: item.acquiredDate,
    debt: isDebt,
    hue: hueFrom(CATEGORY_HUE[item.category], item.name),
    meta: { kind: 'netWorthItem', itemId: item.id }
  }
}

export function buildBubbleTree(
  accounts: Account[],
  positions: Position[],
  netWorthItems: NetWorthItem[],
  lotsByKey: Record<string, OpenLotSummary[]>
): BubbleNode {
  const groups = new Map<string, { hue: number; kids: BubbleNode[] }>()
  for (const p of positions) {
    const g = TYPE_GROUPS[p.type] ?? TYPE_GROUPS.custom
    const bucket = groups.get(g.label) ?? { hue: g.hue, kids: [] }
    bucket.kids.push(positionNode(p, accounts, lotsByKey, g.hue))
    groups.set(g.label, bucket)
  }

  const topChildren: BubbleNode[] = []
  if (groups.size) {
    const investmentChildren: BubbleNode[] = [...groups.entries()].map(([label, { hue, kids }]) => ({
      id: `grp-${label}`,
      name: label,
      hue,
      children: kids
    }))
    topChildren.push({ id: 'investments', name: 'Investments', hue: 265, children: investmentChildren })
  }

  for (const cat of CATEGORY_ORDER) {
    const items = netWorthItems.filter((i) => i.category === cat)
    if (!items.length) continue
    topChildren.push({
      id: `cat-${cat}`,
      name: CATEGORY_LABEL[cat],
      hue: CATEGORY_HUE[cat],
      debt: cat === 'debt',
      children: items.map(netWorthNode)
    })
  }

  return { id: 'root', name: 'Net Worth', hue: 255, children: topChildren }
}
