import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Account, Instrument } from '@shared/types'

interface AppDataValue {
  accounts: Account[]
  instruments: Instrument[]
  refreshAccounts: () => Promise<void>
  refreshInstruments: () => Promise<void>
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])

  const refreshAccounts = useCallback(async () => {
    setAccounts(await window.tradeapp.accounts.list())
  }, [])

  const refreshInstruments = useCallback(async () => {
    setInstruments(await window.tradeapp.instruments.list())
  }, [])

  useEffect(() => {
    refreshAccounts()
    refreshInstruments()
  }, [refreshAccounts, refreshInstruments])

  return (
    <AppDataContext.Provider value={{ accounts, instruments, refreshAccounts, refreshInstruments }}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
