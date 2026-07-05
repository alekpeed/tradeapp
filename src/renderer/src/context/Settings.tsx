import React, { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_THEME_ID, getTheme } from '../themes'

export type LayoutId = 'sidebar' | 'compact' | 'topbar' | 'simple'

export const LAYOUTS: { id: LayoutId; name: string; description: string }[] = [
  {
    id: 'sidebar',
    name: 'Classic Sidebar',
    description: 'Full menu down the left side with labels — the standard look.'
  },
  {
    id: 'compact',
    name: 'Compact Sidebar',
    description: 'Slim icon-only menu on the left. More room for your tables.'
  },
  {
    id: 'topbar',
    name: 'Top Bar',
    description: 'Menu across the top of the window, like a website.'
  },
  {
    id: 'simple',
    name: 'Big & Simple',
    description: 'Large text and a Home screen with big buttons for each task. The easiest to use.'
  }
]

interface SettingsValue {
  themeId: string
  layout: LayoutId
  setThemeId: (id: string) => void
  setLayout: (layout: LayoutId) => void
}

const SettingsContext = createContext<SettingsValue | null>(null)

const THEME_KEY = 'tradeapp.theme'
const LAYOUT_KEY = 'tradeapp.layout'

export function SettingsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [themeId, setThemeIdState] = useState<string>(
    () => localStorage.getItem(THEME_KEY) ?? DEFAULT_THEME_ID
  )
  const [layout, setLayoutState] = useState<LayoutId>(
    () => (localStorage.getItem(LAYOUT_KEY) as LayoutId) ?? 'sidebar'
  )

  useEffect(() => {
    const theme = getTheme(themeId)
    const root = document.documentElement
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value)
    }
    root.style.colorScheme = theme.dark ? 'dark' : 'light'
  }, [themeId])

  const setThemeId = (id: string): void => {
    localStorage.setItem(THEME_KEY, id)
    setThemeIdState(id)
  }

  const setLayout = (l: LayoutId): void => {
    localStorage.setItem(LAYOUT_KEY, l)
    setLayoutState(l)
  }

  return (
    <SettingsContext.Provider value={{ themeId, layout, setThemeId, setLayout }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
