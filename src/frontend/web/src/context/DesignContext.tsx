import { createContext, useContext, useState, useEffect, useCallback } from 'react'

type Direction = 'a' | 'b'
type ThemeMode = 'dark' | 'light' | 'system'

interface DesignCtx {
  dir: Direction
  setDir: (d: Direction) => void
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  dark: boolean
  toggleDir: () => void
  toggleDark: () => void
}

const Ctx = createContext<DesignCtx | null>(null)

const THEME_EVENT = 'spoolhub:theme'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readMode(): ThemeMode {
  const s = localStorage.getItem('theme')
  if (s === 'dark' || s === 'light' || s === 'system') return s
  return 'dark'
}

function readDir(): Direction {
  const s = localStorage.getItem('spoolhub-dir')
  return s === 'a' ? 'a' : 'b'
}

function applyMode(mode: ThemeMode) {
  localStorage.setItem('theme', mode)
  if (mode === 'system') {
    document.documentElement.classList.toggle('dark', getSystemDark())
  } else {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT))
}

export function DesignProvider({ children }: { children?: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [dir, setDirState] = useState<Direction>(readDir)
  const [dark, setDark] = useState(() => {
    const m = readMode()
    return m === 'system' ? getSystemDark() : m === 'dark'
  })

  const setMode = useCallback((m: ThemeMode) => {
    applyMode(m)
    setModeState(m)
    setDark(m === 'system' ? getSystemDark() : m === 'dark')
  }, [])

  const setDir = useCallback((d: Direction) => {
    localStorage.setItem('spoolhub-dir', d)
    setDirState(d)
  }, [])

  useEffect(() => { document.documentElement.setAttribute('data-dir', dir) }, [dir])
  useEffect(() => {
    const theme = mode === 'system' ? (getSystemDark() ? 'dark' : 'light') : mode
    document.documentElement.setAttribute('data-theme', theme)
  }, [mode])

  useEffect(() => {
    function sync() {
      const m = readMode()
      setModeState(m)
      setDark(m === 'system' ? getSystemDark() : m === 'dark')
    }
    window.addEventListener(THEME_EVENT, sync)
    return () => window.removeEventListener(THEME_EVENT, sync)
  }, [])

  useEffect(() => {
    if (mode !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
      setDark(e.matches)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [mode])

  return (
    <Ctx.Provider value={{
      dir, setDir, mode, setMode, dark,
      toggleDir: () => setDir(dir === 'a' ? 'b' : 'a'),
      toggleDark: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDesign() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDesign must be used within DesignProvider')
  return ctx
}
