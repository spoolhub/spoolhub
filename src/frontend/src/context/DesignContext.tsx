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

  // Pin the browser chrome tint (iOS Safari bottom bar) to the app background,
  // so it never re-samples the page under overlays like the sidebar scrim.
  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;background:var(--bg)'
    document.body.appendChild(probe)
    let bg = getComputedStyle(probe).backgroundColor
    probe.remove()
    // Serialize modern color spaces (oklch) to a hex every Safari accepts
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const cctx = canvas.getContext('2d')
    if (cctx) {
      cctx.fillStyle = bg
      cctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = cctx.getImageData(0, 0, 1, 1).data
      bg = `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
    }
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = bg
  }, [mode, dir, dark])

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
