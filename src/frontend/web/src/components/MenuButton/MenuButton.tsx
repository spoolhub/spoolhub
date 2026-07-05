import { useSidebar } from '@/context/SidebarContext'

export default function MenuButton() {
  const { toggle } = useSidebar()
  return (
    <button className="menubtn" onClick={toggle} title="Menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}