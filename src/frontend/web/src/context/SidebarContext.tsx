import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface SidebarCtx {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  isCollapsed: boolean
  toggleCollapsed: () => void
}

const Ctx = createContext<SidebarCtx | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [isCollapsed, setCollapsed] = useState(() => {
    const s = localStorage.getItem('spoolhub-rail')
    return s === 'collapsed'
  })

  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(o => !o), [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('spoolhub-rail', next ? 'collapsed' : 'expanded')
      return next
    })
  }, [])

  return (
    <Ctx.Provider value={{ isOpen, open, close, toggle, isCollapsed, toggleCollapsed }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebar() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}