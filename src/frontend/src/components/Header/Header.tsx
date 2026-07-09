import { Link } from 'react-router-dom'
import { useSidebar } from '@/context/SidebarContext'
import SpoolHubLogo from '@/components/SpoolHubLogo'
import styles from './Header.module.css'

export default function Header() {
  const { toggle: toggleSidebar, isOpen } = useSidebar()

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

      {/* Bell — mobile only */}
      <button className={`${styles.btn} ${styles.btnIcon} ${styles.bellMobile}`} title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0" />
        </svg>
      </button>

      {/* Bell — desktop only */}
      <button className={`${styles.btn} ${styles.btnIcon} ${styles.bellDesktop}`} title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0" />
        </svg>
      </button>
    </header>
  )
}