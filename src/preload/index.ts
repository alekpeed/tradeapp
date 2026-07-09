import { contextBridge, ipcRenderer } from 'electron'
import type { TradeAppApi } from '@shared/ipc'

const api: TradeAppApi = {
  instruments: {
    list: (type) => ipcRenderer.invoke('instruments:list', type),
    createCustom: (input) => ipcRenderer.invoke('instruments:createCustom', input),
    setManualPrice: (instrumentId, price) =>
      ipcRenderer.invoke('instruments:setManualPrice', instrumentId, price)
  },
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (input) => ipcRenderer.invoke('accounts:create', input)
  },
  transactions: {
    list: (filters) => ipcRenderer.invoke('transactions:list', filters),
    create: (input) => ipcRenderer.invoke('transactions:create', input),
    update: (id, input) => ipcRenderer.invoke('transactions:update', id, input),
    delete: (id) => ipcRenderer.invoke('transactions:delete', id)
  },
  positions: {
    list: (accountId) => ipcRenderer.invoke('positions:list', accountId)
  },
  lots: {
    openList: (accountId, instrumentId) => ipcRenderer.invoke('lots:openList', accountId, instrumentId)
  },
  realizedGains: {
    list: (filters) => ipcRenderer.invoke('realizedGains:list', filters)
  },
  netWorthItems: {
    list: () => ipcRenderer.invoke('netWorthItems:list'),
    create: (input) => ipcRenderer.invoke('netWorthItems:create', input),
    update: (id, input) => ipcRenderer.invoke('netWorthItems:update', id, input),
    delete: (id) => ipcRenderer.invoke('netWorthItems:delete', id)
  },
  csv: {
    openAndParse: () => ipcRenderer.invoke('csv:openAndParse'),
    commitImport: (input) => ipcRenderer.invoke('csv:commitImport', input)
  },
  reports: {
    exportPdf: (input) => ipcRenderer.invoke('reports:exportPdf', input)
  },
  updater: {
    getVersion: () => ipcRenderer.invoke('updater:getVersion'),
    checkNow: () => ipcRenderer.invoke('updater:checkNow'),
    restartAndInstall: () => ipcRenderer.invoke('updater:restartAndInstall'),
    onStatus: (callback) => {
      const listener = (_event: unknown, status: Parameters<typeof callback>[0]): void => callback(status)
      ipcRenderer.on('updater:status', listener)
      return () => ipcRenderer.removeListener('updater:status', listener)
    }
  }
}

contextBridge.exposeInMainWorld('tradeapp', api)
