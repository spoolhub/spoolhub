import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import styles from './ConnectionBanner.module.css'

export default function ConnectionBanner() {
  const { t } = useTranslation()
  const { isOffline } = useConnection()

  if (!isOffline) return null

  return (
    <div className={styles.banner}>
      <svg
        className={styles.spinner}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
      {t('connection.reconnecting')}
    </div>
  )
}
