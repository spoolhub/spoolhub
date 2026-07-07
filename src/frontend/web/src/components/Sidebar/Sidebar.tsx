import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clearSession } from '@/api/session'
import SpoolHubLogo from '@/components/SpoolHubLogo'
import styles from './Sidebar.module.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  spoolCount?: number
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.link} ${styles.linkActive}` : styles.link
}

const COLLAPSE_KEY = 'spoolhub-sidebar-collapsed'

export default function Sidebar({ isOpen, onClose, spoolCount }: SidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed))
  }, [collapsed])

  return (
    <>
      <div
        className={`${styles.overlay}${isOpen ? ` ${styles.overlayOpen}` : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`${styles.aside}${isOpen ? ` ${styles.asideOpen}` : ''}${collapsed ? ` ${styles.asideCollapsed}` : ''}`}>
        <button
          className={styles.railFab}
          title={t('nav.toggleSidebar')}
          onClick={() => setCollapsed(v => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className={styles.brand}>
          <NavLink to="/" end onClick={onClose} className={styles.mark}>
            {collapsed
              ? <SpoolHubLogo variant="icon" size={48} waves />
              : <SpoolHubLogo variant="full" size={48} />}
          </NavLink>
        </div>

        <nav className={styles.nav}>

          <NavLink to="/" end onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
            {t('nav.dashboard')}
          </NavLink>

          <NavLink to="/scan" onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><path d="M14 14h2v2M20 14v6M14 20h2"/></svg>
            {t('nav.scan')}
          </NavLink>

          <NavLink to="/spools" end onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></svg>
            Spools
            {spoolCount !== undefined && <span className={styles.badge}>{spoolCount}</span>}
          </NavLink>

          <NavLink to="/printers" onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="3" x2="4" y2="19"/><line x1="20" y1="3" x2="20" y2="19"/><path d="M4 3h16"/><line x1="4" y1="9" x2="20" y2="9"/><rect x="9.5" y="6.5" width="5" height="4" rx="0.75"/><path d="M11.5 10.5 L12 13 L12.5 10.5" strokeWidth="1.3"/><rect x="3" y="19" width="18" height="2" rx="0.75"/><rect x="8.5" y="14.5" width="7" height="4" rx="0.5"/></svg>
            {t('nav.printers')}
          </NavLink>

          <NavLink to="/brands" onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            {t('nav.brands')}
          </NavLink>

          <NavLink to="/locations" onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 4l9 5.5"/><path d="M5 11v8h14v-8"/><path d="M9 19v-5h6v5"/></svg>
            {t('nav.locations')}
          </NavLink>

          <NavLink to="/activity" onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>
            Activity
          </NavLink>

          <NavLink to="/print-history" onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 8v4l3 2"/><circle cx="12" y="12" r="8"/></svg>
            Print History
          </NavLink>

          <NavLink to="/settings" onClick={onClose} className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z"/></svg>
            {t('nav.settings')}
          </NavLink>

          <div className={styles.spacer} />

          <div className={styles.usercard}>
            <div className={styles.avatar}>MK</div>
            <div className={styles.who}>
              <div className={styles.name}>Mira Kovač</div>
              <div className={styles.email}>studio · pro plan</div>
            </div>
            <button
              className={styles.logoutBtn}
              title="Log out"
              onClick={() => { clearSession(); navigate('/login') }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            </button>
          </div>

        </nav>
      </aside>
    </>
  )
}