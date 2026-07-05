import type { TradeAppApi } from '@shared/ipc'

declare global {
  interface Window {
    tradeapp: TradeAppApi
  }
}
