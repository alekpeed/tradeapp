export interface Theme {
  id: string
  name: string
  dark: boolean
  vars: Record<string, string>
}

const LIGHT_BASE: Record<string, string> = {
  '--bg': '#f4f6f9',
  '--surface': '#ffffff',
  '--border': '#e2e6ec',
  '--text': '#1b1e24',
  '--muted': '#68717e',
  '--positive': '#0a7a2f',
  '--negative': '#b3261e',
  '--primary-contrast': '#ffffff',
  '--nav-text': '#c9d1dd',
  '--nav-active-text': '#ffffff'
}

const DARK_BASE: Record<string, string> = {
  '--bg': '#14161a',
  '--surface': '#1e2126',
  '--border': '#32363e',
  '--text': '#e8eaed',
  '--muted': '#9aa3af',
  '--positive': '#4ade80',
  '--negative': '#f87171',
  '--primary-contrast': '#ffffff',
  '--nav-text': '#9aa3af',
  '--nav-active-text': '#ffffff'
}

function theme(id: string, name: string, dark: boolean, vars: Record<string, string>): Theme {
  return { id, name, dark, vars: { ...(dark ? DARK_BASE : LIGHT_BASE), ...vars } }
}

export const THEMES: Theme[] = [
  // ---------- Light themes ----------
  theme('ocean', 'Ocean Blue', false, {
    '--primary': '#2f6fed', '--primary-hover': '#2559c9', '--nav-bg': '#1b2430', '--nav-active-bg': '#2f6fed'
  }),
  theme('forest', 'Forest Green', false, {
    '--primary': '#2e7d32', '--primary-hover': '#256428', '--nav-bg': '#1d2a1f', '--nav-active-bg': '#2e7d32'
  }),
  theme('sunset', 'Sunset Orange', false, {
    '--primary': '#e65100', '--primary-hover': '#bf4300', '--nav-bg': '#2b1c12', '--nav-active-bg': '#e65100'
  }),
  theme('plum', 'Plum Purple', false, {
    '--primary': '#7b1fa2', '--primary-hover': '#641985', '--nav-bg': '#241329', '--nav-active-bg': '#7b1fa2'
  }),
  theme('rose', 'Rose Pink', false, {
    '--primary': '#c2185b', '--primary-hover': '#a0134b', '--nav-bg': '#2a121c', '--nav-active-bg': '#c2185b'
  }),
  theme('teal', 'Teal', false, {
    '--primary': '#00796b', '--primary-hover': '#005f54', '--nav-bg': '#10201d', '--nav-active-bg': '#00796b'
  }),
  theme('sand', 'Warm Sand', false, {
    '--bg': '#f7f3ee', '--primary': '#a0522d', '--primary-hover': '#84421f', '--nav-bg': '#2b2320', '--nav-active-bg': '#a0522d'
  }),
  theme('sky', 'Clear Sky', false, {
    '--bg': '#f2f8fc', '--primary': '#0288d1', '--primary-hover': '#026da8', '--nav-bg': '#102734', '--nav-active-bg': '#0288d1'
  }),
  theme('mint', 'Fresh Mint', false, {
    '--bg': '#f1faf5', '--primary': '#059669', '--primary-hover': '#047a56', '--nav-bg': '#0f231c', '--nav-active-bg': '#059669'
  }),
  theme('coral', 'Coral Red', false, {
    '--primary': '#e53935', '--primary-hover': '#c62828', '--nav-bg': '#2b1514', '--nav-active-bg': '#e53935'
  }),
  theme('steel', 'Steel Gray', false, {
    '--primary': '#546e7a', '--primary-hover': '#435861', '--nav-bg': '#1f272b', '--nav-active-bg': '#546e7a'
  }),
  theme('grape', 'Grape', false, {
    '--primary': '#5e35b1', '--primary-hover': '#4c2b91', '--nav-bg': '#191331', '--nav-active-bg': '#5e35b1'
  }),
  // ---------- Dark themes ----------
  theme('midnight', 'Midnight', true, {
    '--bg': '#0f1320', '--surface': '#171c2b', '--border': '#2a3147',
    '--primary': '#4f8cff', '--primary-hover': '#3a75e8', '--nav-bg': '#0b0e14', '--nav-active-bg': '#4f8cff'
  }),
  theme('charcoal', 'Charcoal', true, {
    '--bg': '#1a1a1a', '--surface': '#242424', '--border': '#3a3a3a',
    '--primary': '#8ab4f8', '--primary-hover': '#6c9ef2', '--primary-contrast': '#0b1220',
    '--nav-bg': '#111111', '--nav-active-bg': '#8ab4f8', '--nav-active-text': '#0b1220'
  }),
  theme('deep-ocean', 'Deep Ocean', true, {
    '--bg': '#0c1a22', '--surface': '#12242e', '--border': '#24404d',
    '--primary': '#26c6da', '--primary-hover': '#1ba9bc', '--primary-contrast': '#04262b',
    '--nav-bg': '#081218', '--nav-active-bg': '#26c6da', '--nav-active-text': '#04262b'
  }),
  theme('dark-forest', 'Dark Forest', true, {
    '--bg': '#111813', '--surface': '#182219', '--border': '#2c3c2e',
    '--primary': '#66bb6a', '--primary-hover': '#4fa354', '--primary-contrast': '#0b190c',
    '--nav-bg': '#0b120d', '--nav-active-bg': '#66bb6a', '--nav-active-text': '#0b190c'
  }),
  theme('espresso', 'Espresso', true, {
    '--bg': '#191412', '--surface': '#221c19', '--border': '#3c322c',
    '--primary': '#d7a86e', '--primary-hover': '#c29357', '--primary-contrast': '#241a10',
    '--nav-bg': '#120e0c', '--nav-active-bg': '#d7a86e', '--nav-active-text': '#241a10'
  }),
  theme('slate-night', 'Slate Night', true, {
    '--bg': '#0f172a', '--surface': '#1e293b', '--border': '#334155',
    '--primary': '#38bdf8', '--primary-hover': '#22a7e0', '--primary-contrast': '#06212e',
    '--nav-bg': '#0a101f', '--nav-active-bg': '#38bdf8', '--nav-active-text': '#06212e'
  }),
  theme('amethyst', 'Amethyst Night', true, {
    '--bg': '#16121f', '--surface': '#1f1930', '--border': '#382e4d',
    '--primary': '#b388ff', '--primary-hover': '#9c6cf5', '--primary-contrast': '#1c1030',
    '--nav-bg': '#0f0c17', '--nav-active-bg': '#b388ff', '--nav-active-text': '#1c1030'
  }),
  theme('crimson', 'Crimson Night', true, {
    '--bg': '#1a1214', '--surface': '#241a1c', '--border': '#41302f',
    '--primary': '#ef5350', '--primary-hover': '#d43c39', '--nav-bg': '#120c0d', '--nav-active-bg': '#ef5350'
  }),
  // Matches the Bubbles view's dark-glass-and-gold palette, so the rest of
  // the app (tables, forms, nav) reads as the same world when that layout
  // is selected — not just the net-worth page.
  theme('bubbles-glass', 'Bubble Glass', true, {
    '--bg': '#0a0b12', '--surface': '#14161f', '--border': '#2a2d3d',
    '--text': '#e6e8f0', '--muted': '#8b91ac',
    '--primary': '#c9a24b', '--primary-hover': '#b8903e', '--primary-contrast': '#241a06',
    '--nav-bg': '#0b0d14', '--nav-text': '#a6acc4', '--nav-active-bg': '#c9a24b', '--nav-active-text': '#241a06',
    '--positive': '#7fd6a0', '--negative': '#e0886e'
  })
]

export const DEFAULT_THEME_ID = 'ocean'

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
