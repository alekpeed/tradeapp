import { contextBridge, ipcRenderer } from 'electron'
import type { TradeAppApi } from '@shared/ipc'

const api: TradeAppApi = {
  instruments: {
    list: (type) => ipcRenderer.invoke('instruments:list', type),
    createCustom: (input) => ipcRenderer.invoke('instruments:createCustom', input)
  },
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (input) => ipcRenderer.invoke('accounts:create', input)
  },
  transactions: {
    list: (filters) => ipcRenderer.invoke('transactions:list', filters),
    create: (input) => ipcRenderer.invoke('transactions:create', input)
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
  csv: {
    openAndParse: () => ipcRenderer.invoke('csv:openAndParse'),
    commitImport: (input) => ipcRenderer.invoke('csv:commitImport', input)
  },
  reports: {
    exportPdf: (input) => ipcRenderer.invoke('reports:exportPdf', input)
  }
}

contextBridge.exposeInMainWorld('tradeapp', api)
