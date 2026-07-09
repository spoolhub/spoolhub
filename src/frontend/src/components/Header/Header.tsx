import { Link, useLocation } from 'react-router-dom'
import { useSidebar } from '@/context/SidebarContext'
import SpoolHubLogo from '@/components/SpoolHubLogo'
import NotificationBell from '@/components/NotificationBell'
import styles from './Header.module.css'

export default function Header() {
  const { toggle: toggleSidebar, isOpen } = useSidebar()
  const { pathname } = useLocation()
  const showBell = pathname !== '/activity' && pathname !== '/scan'

  return (
    <header className={styles.topbar}>
      {/* Hamburger — hidden on desktop, shown on mobile */}
      <button
        className={`${styles.btn} ${styles.btnIcon} ${styles.menubtn}${isOpen ? ` ${styles.menubtnOpen}` : ''}`}
        onClick={toggleSidebar}
        title="Menu"
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <span className={styles.menuLines} aria-hidden="true">
          <span className={styles.menuLine} />
          <span className={styles.menuLine} />
        </span>
      </button>

      {/* Brand logo — hidden on desktop, shown on mobile */}
      <Link to="/" className={styles.topbarLogo} title="Dashboard">
        <SpoolHubLogo variant="full" size={44} />
      </Link>

      {/* Search bar — desktop only */}
      <label className={styles.search}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </svg>
        <input placeholder="Search spools, brands, colors…" />
        <span className={styles.k}>⌘K</span>
      </label>

      {/* Search icon button — mobile only, pushed right with bell */}
      <button className={`${styles.btn} ${styles.btnIcon} ${styles.searchMobile}`} style={{ marginLeft: 'auto' }} title="Search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </svg>
      </button>

      {showBell && <NotificationBell className={styles.bellMobile} />}

      {showBell && <NotificationBell className={styles.bellDesktop} />}
    </header>
  )
}