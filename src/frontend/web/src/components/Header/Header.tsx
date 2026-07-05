import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSidebar } from '@/context/SidebarContext'
import styles from './Header.module.css'

interface HeaderProps {
  title: string
  subtitle?: string
  searchPlaceholder?: string
  onSearch?: (value: string) => void
  /** Primary action button label (e.g. "Add Spool", "Add Printer") */
  actionLabel?: string
  /** If set, action links to this route */
  actionLink?: string
  /** If set, action runs this callback instead of navigating */
  actionOnClick?: () => void
  /** Custom icon for the action button (default: plus icon) */
  actionIcon?: ReactNode
}

export default function Header({
  title,
  subtitle,
  searchPlaceholder = 'Search spools, brands, colors…',
  onSearch,
  actionLabel,
  actionLink,
  actionOnClick,
  actionIcon,
}: HeaderProps) {
  const { toggle: toggleSidebar } = useSidebar()
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setSearchValue(v)
    onSearch?.(v)
  }

  const renderAction = () => {
    if (!actionLabel) return null
    const children = (
      <>
        {actionIcon ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
        {actionLabel}
      </>
    )
    if (actionLink) {
      return (
        <Link to={actionLink} className={styles.btnPrimary}>
          {children}
        </Link>
      )
    }
    return (
      <button className={styles.btnPrimary} onClick={actionOnClick}>
        {children}
      </button>
    )
  }

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
        <svg viewBox="47 22 136 136" fill="none" aria-label="SpoolHub" width="28" height="28">
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

      {/* Search icon button — mobile only, left of bell */}
      <button className={`${styles.btn} ${styles.btnIcon} ${styles.searchMobile}`} title="Search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </svg>
      </button>

      {/* Bell notification — pushed to right edge */}
      <button className={`${styles.btn} ${styles.btnIcon}`} style={{ marginLeft: 'auto' }} title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0" />
        </svg>
      </button>

      {/* Actions wrapper — search + primary button (search hidden on mobile) */}
      <div className={styles.topbarActions}>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleSearch}
          />
          <span className={styles.k}>⌘K</span>
        </label>
        {renderAction()}
      </div>

      {/* Title + subtitle — ALWAYS LAST in markup for correct mobile wrap */}
      <div className={styles.h}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <div className={styles.sub}>{subtitle}</div>}
      </div>
    </header>
  )
}