import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '@/components/LanguageSelector'
import { SpoolHubLogo } from '@/components/icons'
import styles from './Header.module.css'

interface HeaderProps {
  isDark?: boolean
  onToggleDark?: () => void
  onOpenSidebar: () => void
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const { t } = useTranslation()
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button
          onClick={onOpenSidebar}
          className={styles.hamburger}
          aria-label={t('header.openSidebar')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link to="/" className={styles.logoLink}>
          <SpoolHubLogo height={40} />
        </Link>

        <div className={styles.actions}>
          <LanguageSelector />
        </div>
      </div>
    </header>
  )
}
