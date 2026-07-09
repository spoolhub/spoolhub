import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/context/NotificationsContext'
import styles from './NotificationBell.module.css'

interface NotificationBellProps {
  className?: string
  variant?: 'ghost' | 'bordered'
}

export default function NotificationBell({ className, variant = 'ghost' }: NotificationBellProps) {
  const { t } = useTranslation()
  const { open, unreadCount, toggle } = useNotifications()

  const badge = unreadCount > 0
    ? (unreadCount > 9 ? '9+' : String(unreadCount))
    : null

  return (
    <div className={`${styles.wrap}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className={`${styles.btn}${variant === 'bordered' ? ` ${styles.bordered}` : ''}${open ? ` ${styles.on}` : ''}`}
        title={t('notifications.title')}
        aria-label={t('notifications.title')}
        aria-expanded={open}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0" />
        </svg>
        {badge && <span className={styles.badge}>{badge}</span>}
      </button>
    </div>
  )
}
