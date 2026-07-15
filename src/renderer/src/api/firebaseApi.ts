// Firebase-backed implementation of TradeAppApi — the web/PWA/native data path.
//
// Design:
//  - Source of truth stored in Firestore: instruments, accounts, transactions,
//    net-worth items (under users/{uid}/...). Doc id == String(numeric id).
//  - Derived data (positions, open lots, realized gains) is NOT stored: it is
//    computed on read with the SAME shared engine desktop uses (src/shared/engine).
//  - IDs are timestamp-monotonic (not a server counter) so creates succeed
//    offline; Firestore queues writes and syncs later (Principle #0).
//  - Desktop-only features (native CSV dialog, PDF print, electron auto-update)
//    degrade gracefully here rather than break the shared UI.
//
// NOTE: field values are stored in the clear for now. Client-side encryption
// (owner-held key) is the next increment and will wrap toDoc/fromDoc; do not put
// real financial data in Firestore until that lands.
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint
} from 'firebase/firestore'
import type { TradeAppApi, UpdateStatus } from '@shared/ipc'
import type {
  Account,
  Instrument,
  InstrumentType,
  NetWorthItem,
  NewNetWorthItemInput,
  NewTransactionInput,
  OpenLotSummary,
  Position,
  RealizedGainLoss,
  Transaction
} from '@shared/types'
import { computeAmount, replayPair, type EngineTransaction } from '@shared/engine'
import { ensureSignedIn, getDb } from '../firebase'

// --- ids: monotonic, offline-safe, unique per device -----------------------
let lastId = 0
function newId(): number {
  const id = Math.max(Date.now(), lastId + 1)
  lastId = id
  return id
}

// --- helpers ---------------------------------------------------------------
async function uid(): Promise<string> {
  const user = await ensureSignedIn()
  if (!user) throw new Error('offline: not signed in')
  return user.uid
}

function col(userId: string, name: string) {
  return collection(getDb(), 'users', userId, name)
}
function ref(userId: string, name: string, id: number) {
  return doc(getDb(), 'users', userId, name, String(id))
}

async function readAll<T>(userId: string, name: string, ...constraints: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(col(userId, name), ...constraints))
  return snap.docs.map((d) => d.data() as T)
}

// --- transactions → engine input ------------------------------------------
function toEngineTxn(t: Transaction): EngineTransaction {
  return {
    id: t.id,
    type: t.type,
    date: t.date,
    quantity: t.quantity,
    amount: t.amount,
    estimatedBasis: t.estimatedBasis,
    specificLotId: t.specificLotId
  }
}

/** Group transactions by account+instrument and replay each pair with its account's method. */
async function replayAll(
  userId: string,
  filter?: { accountId?: number; instrumentId?: number }
): Promise<{
  accounts: Account[]
  instruments: Instrument[]
  byPair: Map<string, { accountId: number; instrumentId: number; lots: ReturnType<typeof replayPair>['lots']; gains: ReturnType<typeof replayPair>['gains'] }>
}> {
  const [txns, accounts, instruments] = await Promise.all([
    readAll<Transaction>(userId, 'transactions'),
    readAll<Account>(userId, 'accounts'),
    readAll<Instrument>(userId, 'instruments')
  ])
  const methodOf = new Map(accounts.map((a) => [a.id, a.costBasisMethod]))
  const groups = new Map<string, Transaction[]>()
  for (const t of txns) {
    if (filter?.accountId && t.accountId !== filter.accountId) continue
    if (filter?.instrumentId && t.instrumentId !== filter.instrumentId) continue
    const key = `${t.accountId}:${t.instrumentId}`
    ;(groups.get(key) ?? groups.set(key, []).get(key)!).push(t)
  }
  const byPair = new Map<string, { accountId: number; instrumentId: number; lots: ReturnType<typeof replayPair>['lots']; gains: ReturnType<typeof replayPair>['gains'] }>()
  for (const [key, pairTxns] of groups) {
    const [accountId, instrumentId] = key.split(':').map(Number)
    const method = methodOf.get(accountId) ?? 'fifo'
    const { lots, gains } = replayPair(pairTxns.map(toEngineTxn), method)
    byPair.set(key, { accountId, instrumentId, lots, gains })
  }
  return { accounts, instruments, byPair }
}

// --- the API ---------------------------------------------------------------
export const firebaseApi: TradeAppApi = {
  instruments: {
    async list(type?: InstrumentType): Promise<Instrument[]> {
      const userId = await uid()
      const items = await readAll<Instrument>(userId, 'instruments')
      return items
        .filter((i) => !type || i.type === type)
        .sort((a, b) => a.symbol.localeCompare(b.symbol))
    },
    async createCustom(input): Promise<Instrument> {
      const userId = await uid()
      const instrument: Instrument = {
        id: newId(),
        type: input.type,
        symbol: input.symbol.toUpperCase(),
        name: input.name,
        exchange: input.exchange ?? null,
        currency: input.currency || 'USD',
        metadata: null,
        isCustom: true,
        manualPrice: null,
        createdAt: new Date().toISOString()
      }
      await setDoc(ref(userId, 'instruments', instrument.id), instrument)
      return instrument
    },
    async setManualPrice(instrumentId: number, price: number | null): Promise<void> {
      const userId = await uid()
      await updateDoc(ref(userId, 'instruments', instrumentId), { manualPrice: price })
    }
  },

  accounts: {
    async list(): Promise<Account[]> {
      const userId = await uid()
      const items = await readAll<Account>(userId, 'accounts')
      return items.sort((a, b) => a.name.localeCompare(b.name))
    },
    async create(input): Promise<Account> {
      const userId = await uid()
      const account: Account = {
        id: newId(),
        name: input.name,
        kind: input.kind,
        institution: input.institution ?? null,
        costBasisMethod: input.costBasisMethod,
        createdAt: new Date().toISOString()
      }
      await setDoc(ref(userId, 'accounts', account.id), account)
      return account
    }
  },

  transactions: {
    async list(filters): Promise<Transaction[]> {
      const userId = await uid()
      const constraints: QueryConstraint[] = []
      if (filters?.accountId) constraints.push(where('accountId', '==', filters.accountId))
      if (filters?.instrumentId) constraints.push(where('instrumentId', '==', filters.instrumentId))
      const items = await readAll<Transaction>(userId, 'transactions', ...constraints)
      return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
    },
    async create(input: NewTransactionInput): Promise<Transaction> {
      const userId = await uid()
      const txn: Transaction = {
        id: newId(),
        accountId: input.accountId,
        instrumentId: input.instrumentId,
        type: input.type,
        date: input.date,
        quantity: input.quantity,
        price: input.price,
        amount: computeAmount(input),
        fees: input.fees,
        currency: input.currency,
        fxRateToUsd: input.fxRateToUsd,
        notes: input.notes ?? null,
        tags: input.tags ?? null,
        source: input.source ?? 'manual',
        documentId: null,
        estimatedBasis: input.estimatedBasis ?? false,
        specificLotId: input.specificLotId ?? null,
        createdAt: new Date().toISOString()
      }
      await setDoc(ref(userId, 'transactions', txn.id), txn)
      return txn
    },
    async update(id: number, input: NewTransactionInput): Promise<Transaction> {
      const userId = await uid()
      const existing = (await getDoc(ref(userId, 'transactions', id))).data() as Transaction | undefined
      if (!existing) throw new Error(`Transaction #${id} not found`)
      const txn: Transaction = {
        ...existing,
        accountId: input.accountId,
        instrumentId: input.instrumentId,
        type: input.type,
        date: input.date,
        quantity: input.quantity,
        price: input.price,
        amount: computeAmount(input),
        fees: input.fees,
        currency: input.currency,
        fxRateToUsd: input.fxRateToUsd,
        notes: input.notes ?? null,
        tags: input.tags ?? null,
        estimatedBasis: input.estimatedBasis ?? false,
        specificLotId: input.specificLotId ?? null
      }
      await setDoc(ref(userId, 'transactions', id), txn)
      return txn
    },
    async delete(id: number): Promise<void> {
      const userId = await uid()
      await deleteDoc(ref(userId, 'transactions', id))
    }
  },

  positions: {
    async list(accountId?: number): Promise<Position[]> {
      const userId = await uid()
      const { instruments, byPair } = await replayAll(userId, { accountId })
      const instrumentById = new Map(instruments.map((i) => [i.id, i]))
      const positions: Position[] = []
      for (const { accountId: aId, instrumentId, lots } of byPair.values()) {
        const open = lots.filter((l) => l.remainingQuantity > 1e-9)
        const quantity = open.reduce((s, l) => s + l.remainingQuantity, 0)
        if (quantity <= 1e-9) continue
        const costBasisTotal = open.reduce((s, l) => s + l.remainingQuantity * l.costBasisPerUnit, 0)
        const inst = instrumentById.get(instrumentId)
        if (!inst) continue
        positions.push({
          accountId: aId,
          instrumentId,
          symbol: inst.symbol,
          name: inst.name,
          type: inst.type,
          quantity,
          costBasisTotal,
          avgCostPerUnit: quantity > 0 ? costBasisTotal / quantity : 0,
          manualPrice: inst.manualPrice
        })
      }
      return positions.sort((a, b) => a.symbol.localeCompare(b.symbol))
    }
  },

  lots: {
    async openList(accountId: number, instrumentId: number): Promise<OpenLotSummary[]> {
      const userId = await uid()
      const { byPair } = await replayAll(userId, { accountId, instrumentId })
      const pair = byPair.get(`${accountId}:${instrumentId}`)
      if (!pair) return []
      return pair.lots
        .filter((l) => l.remainingQuantity > 1e-9)
        .map((l) => ({
          id: l.id,
          acquiredDate: l.acquiredDate,
          remainingQuantity: l.remainingQuantity,
          costBasisPerUnit: l.costBasisPerUnit,
          estimatedBasis: l.estimatedBasis
        }))
    }
  },

  realizedGains: {
    async list(filters): Promise<RealizedGainLoss[]> {
      const userId = await uid()
      const { byPair } = await replayAll(userId, {
        accountId: filters?.accountId,
        instrumentId: filters?.instrumentId
      })
      const out: RealizedGainLoss[] = []
      let syntheticId = 1
      for (const { accountId, instrumentId, gains } of byPair.values()) {
        for (const g of gains) {
          if (filters?.year && new Date(g.soldDate).getUTCFullYear() !== filters.year) continue
          out.push({ id: syntheticId++, accountId, instrumentId, ...g })
        }
      }
      return out.sort((a, b) => (a.soldDate < b.soldDate ? 1 : -1))
    }
  },

  netWorthItems: {
    async list(): Promise<NetWorthItem[]> {
      const userId = await uid()
      const items = await readAll<NetWorthItem>(userId, 'netWorthItems')
      return items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    },
    async create(input: NewNetWorthItemInput): Promise<NetWorthItem> {
      const userId = await uid()
      const item: NetWorthItem = {
        id: newId(),
        category: input.category,
        name: input.name,
        value: input.value,
        originalValue: input.originalValue ?? null,
        acquiredDate: input.acquiredDate ?? null,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString()
      }
      await setDoc(ref(userId, 'netWorthItems', item.id), item)
      return item
    },
    async update(id: number, input: NewNetWorthItemInput): Promise<NetWorthItem> {
      const userId = await uid()
      const existing = (await getDoc(ref(userId, 'netWorthItems', id))).data() as NetWorthItem | undefined
      if (!existing) throw new Error(`Net-worth item #${id} not found`)
      const item: NetWorthItem = {
        ...existing,
        category: input.category,
        name: input.name,
        value: input.value,
        originalValue: input.originalValue ?? null,
        acquiredDate: input.acquiredDate ?? null,
        notes: input.notes ?? null
      }
      await setDoc(ref(userId, 'netWorthItems', id), item)
      return item
    },
    async delete(id: number): Promise<void> {
      const userId = await uid()
      await deleteDoc(ref(userId, 'netWorthItems', id))
    }
  },

  // Desktop-only features degrade gracefully on web (added properly later).
  csv: {
    async openAndParse() {
      return null // native file dialog is desktop-only; web import comes later
    },
    async commitImport() {
      return { imported: 0, errors: ['CSV import is not yet available on the web version'] }
    }
  },

  reports: {
    async exportPdf() {
      return { filePath: null } // web PDF/print path comes later
    }
  },

  updater: {
    async getVersion(): Promise<string> {
      return '0.3.0'
    },
    async checkNow(): Promise<void> {
      // PWAs update via the service worker, not electron-updater.
    },
    async restartAndInstall(): Promise<void> {
      // no-op on web
    },
    onStatus(_callback: (status: UpdateStatus) => void): () => void {
      return () => {}
    }
  }
}
