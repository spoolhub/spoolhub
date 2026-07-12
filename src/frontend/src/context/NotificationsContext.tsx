import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { activitiesApi } from '@/api/activities'
import ActivityCard from '@/components/ActivityCard'
import type { Activity } from '@/types/activity'
import panelStyles from '@/components/NotificationBell/NotificationBell.module.css'

const SEEN_KEY = 'spoolhub-notifications-seen-at'
const POLL_MS = 60_000

interface NotificationsContextValue {
  open: boolean
  loading: boolean
  activities: Activity[]
  unreadCount: number
  toggle: () => void
  close: () => void
  markAllRead: () => void
  refresh: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

function getSeenAt(): string {
  return localStorage.getItem(SEEN_KEY) ?? ''
}

function setSeenAt(value: string) {
  localStorage.setItem(SEEN_KEY, value)
}

function NotificationsPanel({
  open,
  loading,
  activities,
  onClose,
}: {
  open: boolean
  loading: boolean
  activities: Activity[]
  onClose: () => void
}) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button type="button" className={panelStyles.scrim} aria-label={t('common.close')} onClick={onClose} />
      <aside className={panelStyles.panel} aria-label={t('notifications.title')}>
        <div className={panelStyles.head}>
          <h2>{t('notifications.title')}</h2>
        </div>
        <div className={panelStyles.list}>
          {loading && activities.length === 0
            ? <div className={panelStyles.loading}>{t('common.loading')}</div>
            : activities.length === 0
              ? <div className={panelStyles.empty}>{t('notifications.empty')}</div>
              : activities.map(activity => (
                  <div key={activity.id} className={panelStyles.listItem}>
                    <ActivityCard activity={activity} flat />
                  </div>
                ))}
        </div>
        <div className={panelStyles.foot}>
          <Link to="/activity" onClick={onClose}>{t('notifications.viewAll')}</Link>
        </div>
      </aside>
    </>
  )
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<Activity[]>([])
  const [seenAt, setSeenAtState] = useState(getSeenAt)

  const refresh = useCallback(async () => {
    try {
      const data = await activitiesApi.getRecent(20)
      setActivities(data.activities)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh() // eslint-disable-line react-hooks/set-state-in-effect
    const timer = window.setInterval(() => { void refresh() }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [refresh])

  const unreadCount = useMemo(
    () => activities.filter(a => a.createdAt > seenAt).length,
    [activities, seenAt],
  )

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString()
    setSeenAt(now)
    setSeenAtState(now)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const toggle = useCallback(() => {
    setOpen(prev => {
      const next = !prev
      if (next) {
        const now = new Date().toISOString()
        setSeenAt(now)
        setSeenAtState(now)
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({
    open,
    loading,
    activities,
    unreadCount,
    toggle,
    close,
    markAllRead,
    refresh,
  }), [open, loading, activities, unreadCount, toggle, close, markAllRead, refresh])

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationsPanel open={open} loading={loading} activities={activities} onClose={close} />
    </NotificationsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
