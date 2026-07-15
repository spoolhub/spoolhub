import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Activity } from '@/types/activity'
import ActivityFeedItem, { type ActivityFeedVariant } from './ActivityFeedItem'
import { dayGroupLabel } from './activityFeedModel'
import styles from './ActivityFeed.module.css'

interface Props {
  activities: Activity[]
  variant?: ActivityFeedVariant
  loading?: boolean
  emptyMessage?: string
  groupByDay?: boolean
  className?: string
}

export default function ActivityFeed({
  activities,
  variant = 'stream',
  loading = false,
  emptyMessage,
  groupByDay = false,
  className,
}: Props) {
  const { t } = useTranslation()

  const groups = useMemo(() => {
    if (!groupByDay) return [{ label: null as string | null, items: activities }]
    const map = new Map<string, Activity[]>()
    for (const a of activities) {
      const label = dayGroupLabel(a.createdAt, t)
      const list = map.get(label) ?? []
      list.push(a)
      map.set(label, list)
    }
    return [...map.entries()].map(([label, items]) => ({ label, items }))
  }, [activities, groupByDay, t])

  const isLedger = variant === 'ledger'

  if (loading) {
    return (
      <div className={`${isLedger ? styles.ledger : ''} ${className ?? ''}`}>
        {isLedger && (
          <div className={styles.ledgerHeader} aria-hidden>
            <span />
            <span>{t('activity.colEvent')}</span>
            <span>{t('activity.colDetail')}</span>
            <span>{t('activity.colInfo')}</span>
            <span>{t('activity.colTime')}</span>
          </div>
        )}
        <div className={styles.skeleton}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={isLedger ? styles.skeletonLedgerRow : styles.skeletonRow} />
          ))}
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={`${styles.empty} ${className ?? ''}`}>
        {emptyMessage ?? t('activity.noActivity')}
      </div>
    )
  }

  return (
    <div className={`${styles.activityFeed}${isLedger ? ` ${styles.ledger}` : ''} ${className ?? ''}`}>
      {isLedger && (
        <div className={styles.ledgerHeader}>
          <span aria-hidden />
          <span>{t('activity.colEvent')}</span>
          <span>{t('activity.colDetail')}</span>
          <span>{t('activity.colInfo')}</span>
          <span>{t('activity.colTime')}</span>
        </div>
      )}
      {groups.map(group => (
        <section key={group.label ?? 'all'} className={group.label ? (isLedger ? styles.ledgerDay : styles.dayGroup) : undefined}>
          {group.label && (
            <div className={isLedger ? styles.dayPill : styles.dayLabel}>{group.label}</div>
          )}
          {group.items.map(a => (
            <ActivityFeedItem key={a.id} activity={a} variant={variant} />
          ))}
        </section>
      ))}
    </div>
  )
}
