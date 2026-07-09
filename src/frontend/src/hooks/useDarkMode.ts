import { useState, useEffect } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'

const THEME_EVENT = 'spoolhub:theme'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readMode(): ThemeMode {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  return 'dark'
}

function applyMode(mode: ThemeMode): void {
  localStorage.setItem('theme', mode)
  if (mode === 'system') {
    document.documentElement.classList.toggle('dark', getSystemDark())
  } else {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT))
}

export function useDarkMode() {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [dark, setDark] = useState(() => {
    const m = readMode()
    return m === 'system' ? getSystemDark() : m === 'dark'
  })

  function setMode(newMode: ThemeMode) {
    applyMode(newMode)
    setModeState(newMode)
    setDark(newMode === 'system' ? getSystemDark() : newMode === 'dark')
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

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

  return {
    dark,
    mode,
    setMode,
    toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
  }
}
