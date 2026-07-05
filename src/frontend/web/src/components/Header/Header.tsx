import { useSidebar } from '@/context/SidebarContext'
import styles from './Header.module.css'

export default function Header() {
  const { toggle: toggleSidebar } = useSidebar()

  return (
    <header className={styles.topbar}>
      {/* Hamburger — hidden on desktop, shown on mobile */}
      <button className={`${styles.btn} ${styles.btnIcon} ${styles.menubtn}`} onClick={toggleSidebar} title="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Brand logo — hidden on desktop, shown on mobile */}
      <div className={styles.topbarLogo}>
        <svg width="38" height="38" viewBox="47 22 136 136" fill="none" aria-label="SpoolHub">
          <circle cx="115" cy="90" r="65" fill="none" stroke="#15803D" strokeWidth="3" />
          <g transform="translate(115,90)">
            <circle r="53" fill="none" stroke="#22C55E" strokeWidth="6" opacity=".4" />
            <circle r="43" fill="none" stroke="#22C55E" strokeWidth="6" opacity=".65" />
            <circle r="33" fill="none" stroke="#22C55E" strokeWidth="6" opacity=".9" />
            <circle r="17" fill="#15803D" />
            <circle r="9" fill="none" stroke="#fff" strokeWidth="2" opacity=".6" />
          </g>
        </svg>
        <div className={styles.topbarLogoName}>Spool<b>Hub</b></div>
      </div>

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