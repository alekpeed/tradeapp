// The single data seam every screen talks to.
//
// On desktop, Electron's preload exposes `window.tradeapp` (IPC → SQLite). On the
// web/PWA/native build that global is absent, so we fall back to the Firebase-
// backed implementation. Screens import `api` from here instead of reaching for
// `window.tradeapp` directly, so the same UI runs on all three surfaces.
import type { TradeAppApi } from '@shared/ipc'
import { firebaseApi } from './firebaseApi'

const hasElectronBridge = typeof window !== 'undefined' && Boolean(window.tradeapp)

export const api: TradeAppApi = hasElectronBridge ? window.tradeapp : firebaseApi

/** True when running inside the Electron desktop app (native SQLite backend). */
export const isDesktop = hasElectronBridge
