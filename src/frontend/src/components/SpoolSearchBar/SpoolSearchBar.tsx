import { useTranslation } from 'react-i18next'
import styles from './SpoolSearchBar.module.css'

interface SpoolSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SpoolSearchBar({ value, onChange, placeholder }: SpoolSearchBarProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('search.placeholder')

  return (
    <div className={styles.wrap}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={styles.input}
      />
      {value && (
        <button onClick={() => onChange('')} className={styles.clearBtn} aria-label={t('search.clear')}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
