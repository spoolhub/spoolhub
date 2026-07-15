import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import ActivityCard from '@/components/ActivityCard'
import ActivityPrintLoadDetail from '@/components/ActivityPrintLoadDetail'
import { getIconCfg } from '@/components/ActivityCard/ActivityCard'
import type { Activity } from '@/types/activity'
import {
  actionLabel, assignedPrinterName, buildMetaPills, feedCategory,
  isPrintEvent, relativeFeedTime,
} from './activityFeedModel'
import styles from './ActivityFeed.module.css'

export type ActivityFeedVariant = 'stream' | 'dense' | 'compact' | 'ledger'

const RAIL: Record<string, string> = {
  print: styles.railPrint,
  scan: styles.railScan,
  spool: styles.railSpool,
  stock: styles.railStock,
  system: styles.railSystem,
}

function SpoolContext({ activity }: { activity: Activity }) {
  const snap = activity.snapshot
  const brand = snap?.brand ?? ''
  const colorName = snap?.colorName ?? ''
  if (!brand && !colorName && !snap?.colorHex) return null
  return (
    <>
      {snap?.colorHex && <SpoolIcon color={snap.colorHex} size={16} />}
      {brand && <span>{brand}</span>}
      {colorName && <span>{colorName}</span>}
      {snap?.material && <span className={styles.pill}>{snap.material}</span>}
    </>
  )
}

function ContextLine({ activity, accentColor, accentBg }: {
  activity: Activity
  accentColor: string
  accentBg: string
}) {
  const snap = activity.snapshot
  const printer = assignedPrinterName(activity.description, activity.eventType)

  if (isPrintEvent(activity.eventType)) {
    return (
      <>
        <span className={styles.printerName}>{activity.resourceName}</span>
        <ActivityPrintLoadDetail snap={snap} accentColor={accentColor} accentBg={accentBg} />
      </>
    )
  }

  if (activity.eventType === 'SpoolAssigned' || activity.eventType === 'SpoolUnassigned') {
    return (
      <>
        <SpoolContext activity={activity} />
        {printer && (
          <>
            <span>→</span>
            <span className={styles.printerName}>{printer}</span>
          </>
        )}
      </>
    )
  }

  if (feedCategory(activity.eventType) === 'scan') {
    return <SpoolContext activity={activity} />
  }

  if (snap?.brand || snap?.colorHex) return <SpoolContext activity={activity} />
  if (activity.description) return <span>{activity.description}</span>
  return <span>{activity.resourceName}</span>
}

function compactContext(activity: Activity, t: ReturnType<typeof useTranslation>['t']): string {
  const snap = activity.snapshot
  if (isPrintEvent(activity.eventType)) {
    const parts = [activity.resourceName]
    const loaded = snap?.loadedSpools?.[0]
    if (loaded?.brand) parts.push(`${loaded.brand} ${loaded.colorName ?? ''}`.trim())
    else if (snap?.brand) parts.push(`${snap.brand} ${snap.colorName ?? ''}`.trim())
    const meta = buildMetaPills(activity, t)
    if (meta.length) parts.push(meta.slice(0, 2).join(' · '))
    return parts.filter(Boolean).join(' · ')
  }
  const brand = snap?.brand ?? activity.resourceName
  const color = snap?.colorName ?? ''
  const printer = assignedPrinterName(activity.description, activity.eventType)
  return [brand, color, snap?.material, printer].filter(Boolean).join(' · ')
}

export default function ActivityFeedItem({
  activity,
  variant = 'stream',
}: {
  activity: Activity
  variant?: ActivityFeedVariant
}) {
  const { t } = useTranslation()
  const { color, bg } = getIconCfg(activity.eventType)
  const cat = feedCategory(activity.eventType)
  const title = actionLabel(activity, t)
  const time = relativeFeedTime(activity.createdAt, t)
  const meta = buildMetaPills(activity, t)

  if (variant === 'ledger') {
    return <ActivityCard activity={activity} row ledger />
  }

  if (variant === 'compact') {
    const ctx = compactContext(activity, t)
    return (
      <div className={styles.compact}>
        <div className={styles.compactDot} style={{ background: color }} />
        <div className={styles.compactBody}>
          <div className={styles.compactLine1}>
            <b>{title}</b>
            <span style={{ color: 'var(--faint)' }}> · {time}</span>
          </div>
          {ctx && <div className={styles.compactLine2}>{ctx}</div>}
        </div>
      </div>
    )
  }

  const itemClass = variant === 'dense' ? `${styles.item} ${styles.dense}` : styles.item

  return (
    <article className={itemClass}>
      <div className={`${styles.rail} ${RAIL[cat]}`} style={{ background: color }} aria-hidden />
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.title}>{title}</span>
          <time className={styles.time} dateTime={activity.createdAt}>{time}</time>
        </div>
        <div className={styles.context}>
          <ContextLine activity={activity} accentColor={color} accentBg={bg} />
        </div>
        {meta.length > 0 && (
          <div className={styles.meta}>
            {meta.map((pill, i) => (
              <span
                key={`${pill}-${i}`}
                className={`${styles.pill}${i === meta.length - 1 && pill.includes('.') ? ` ${styles.pillFile}` : ''}`}
                title={pill}
              >
                {pill}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
