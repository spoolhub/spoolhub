import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import type { Activity } from '@/types/activity'
import styles from './ActivityCard.module.css'

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso: string, today: string, yesterday: string): string {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yestStart  = todayStart - 86_400_000
  if (d.getTime() >= todayStart) return today
  if (d.getTime() >= yestStart)  return yesterday
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type Translate = (key: string, options?: { count: number }) => string

function formatMins(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function relativeTime(iso: string, t: Translate): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 86_400_000) {
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 1) return t('common.justNow')
    if (mins < 60) return t('common.minutesAgo', { count: mins })
    return t('common.hoursAgo', { count: Math.floor(diffMs / 3_600_000) })
  }
  return clockTime(iso)
}

const S = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const ICONS = {
  plus:    <svg {...S}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:    <svg {...S}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:   <svg {...S}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  check:   <svg {...S}><polyline points="20 6 9 17 4 12"/></svg>,
  scan:    <svg {...S}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  tag:     <svg {...S}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  minus:   <svg {...S}><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x:       <svg {...S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  printer: <svg {...S}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  pause:   <svg {...S}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  play:    <svg {...S}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  weight:  <svg {...S}><circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.905 1.4L2.1 17.4A2 2 0 0 0 4 20h16a2 2 0 0 0 1.9-2.6l-2.495-8A2 2 0 0 0 17.5 8z"/></svg>,
  mapPin:  <svg {...S}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  clock:   <svg {...S}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
}

interface IconCfg { color: string; bg: string; icon: React.ReactNode }

// eslint-disable-next-line react-refresh/only-export-components
export function getIconCfg(eventType: string): IconCfg {
  switch (eventType) {
    case 'SpoolCreated':     return { color: '#06b6d4', bg: 'rgba(6,182,212,.15)',    icon: ICONS.plus    }
    case 'SpoolActivated':   return { color: '#22c55e', bg: 'rgba(34,197,94,.15)',    icon: ICONS.check   }
    case 'SpoolDeactivated': return { color: '#f59e0b', bg: 'rgba(245,158,11,.15)',   icon: ICONS.minus   }
    case 'SpoolUpdated':     return { color: '#3b82f6', bg: 'rgba(59,130,246,.15)',   icon: ICONS.edit    }
    case 'SpoolDeleted':     return { color: '#ef4444', bg: 'rgba(239,68,68,.15)',    icon: ICONS.trash   }
    case 'SpoolScanned':     return { color: '#8b5cf6', bg: 'rgba(139,92,246,.15)',   icon: ICONS.scan    }
    case 'SpoolAssigned':    return { color: '#06b6d4', bg: 'rgba(6,182,212,.15)',    icon: ICONS.printer }
    case 'SpoolUnassigned':  return { color: '#6b7280', bg: 'rgba(107,114,128,.15)', icon: ICONS.printer }
    case 'PrinterAdded':     return { color: '#06b6d4', bg: 'rgba(6,182,212,.15)',    icon: ICONS.plus    }
    case 'PrinterUpdated':   return { color: '#3b82f6', bg: 'rgba(59,130,246,.15)',   icon: ICONS.edit    }
    case 'PrinterDeleted':   return { color: '#ef4444', bg: 'rgba(239,68,68,.15)',    icon: ICONS.trash   }
    case 'PrintStarted':     return { color: '#22c55e', bg: 'rgba(34,197,94,.15)',    icon: ICONS.printer }
    case 'PrintPaused':      return { color: '#f59e0b', bg: 'rgba(245,158,11,.15)',   icon: ICONS.pause   }
    case 'PrintResumed':     return { color: '#0ea5e9', bg: 'rgba(14,165,233,.15)',   icon: ICONS.play    }
    case 'PrintCompleted':   return { color: '#22c55e', bg: 'rgba(34,197,94,.15)',    icon: ICONS.check   }
    case 'PrintFailed':      return { color: '#ef4444', bg: 'rgba(239,68,68,.15)',    icon: ICONS.x       }
    case 'PrintCancelled':   return { color: '#f97316', bg: 'rgba(249,115,22,.15)',   icon: ICONS.x       }
    case 'NfcTagRegistered': return { color: '#8b5cf6', bg: 'rgba(139,92,246,.15)',   icon: ICONS.scan    }
    case 'NfcTagRemoved':    return { color: '#ef4444', bg: 'rgba(239,68,68,.15)',    icon: ICONS.scan    }
    case 'BrandAdded':       return { color: '#06b6d4', bg: 'rgba(6,182,212,.15)',    icon: ICONS.tag     }
    case 'BrandDeleted':     return { color: '#ef4444', bg: 'rgba(239,68,68,.15)',    icon: ICONS.tag     }
    default:                 return { color: '#6b7280', bg: 'rgba(107,114,128,.15)', icon: ICONS.printer }
  }
}

interface Props {
  activity: Activity
  flat?: boolean
}

export default function ActivityCard({ activity, flat }: Props) {
  const { t } = useTranslation()
  const { color, bg, icon } = getIconCfg(activity.eventType)
  const PRINT_EVENTS = new Set(['PrintStarted', 'PrintCompleted', 'PrintPaused', 'PrintResumed', 'PrintFailed', 'PrintCancelled'])
  const isPrintEvent = PRINT_EVENTS.has(activity.eventType)
  const snap = activity.snapshot
  const brand = snap?.brand ?? ''
  const colorName = brand && activity.resourceName.startsWith(brand)
    ? activity.resourceName.slice(brand.length).trim()
    : snap?.colorName ?? ''

  const isPrintCompleted = activity.eventType === 'PrintCompleted'
  const isPrintPaused    = activity.eventType === 'PrintPaused'

  const printFileLabel = (() => {
    if (!isPrintEvent) return null
    if (snap?.printFileName) return snap.printFileName
    if (!activity.description) return null
    const d = activity.description
    if (isPrintCompleted) {
      const m = d.match(/^(.+?) — [\d.]+g used$/i)
      return m ? m[1].trim() : d
    }
    const m = d.match(/^(?:started|paused|resumed|failed:\s*|cancelled:\s*)(.*)/i)
    return m ? m[1].trim() : d
  })()

  const printUsedGrams = (() => {
    if (!isPrintCompleted) return null
    if (snap?.gramsUsed != null && snap.gramsUsed > 0) return snap.gramsUsed
    if (!activity.description) return null
    const m = activity.description.match(/— ([\d.]+)g used$/i)
    return m ? parseFloat(m[1]) : null
  })()

  const printEstimatedMins = (
    (activity.eventType === 'PrintStarted' || activity.eventType === 'PrintPaused') && snap?.estimatedMins
  ) ? snap.estimatedMins : null

  const printStartedFile = (() => {
    if (activity.eventType !== 'PrintStarted' || !printFileLabel) return null
    const m = printFileLabel.match(/^printing\s*-\s*(.*)/i)
    const f = m ? m[1].trim() : ''
    return f || printFileLabel
  })()

  const today     = t('common.today')
  const yesterday = t('common.yesterday')

  const actionLabel = (() => {
    switch (activity.eventType) {
      case 'SpoolCreated':     return t('activityCard.spoolCreated')
      case 'SpoolActivated':   return t('activityCard.spoolActivated')
      case 'SpoolDeactivated': return t('activityCard.spoolDeactivated')
      case 'SpoolUpdated':     return activity.description
        ? t('activityCard.spoolUpdatedField', { field: activity.description.split(':')[0].trim() })
        : t('activityCard.spoolUpdated')
      case 'SpoolDeleted':     return t('activityCard.spoolDeleted')
      case 'SpoolScanned':     return t('activityCard.spoolScanned')
      case 'SpoolAssigned':    return t('activityCard.spoolAssigned')
      case 'SpoolUnassigned':  return t('activityCard.spoolUnassigned')
      case 'PrinterAdded':     return t('activityCard.printerAdded')
      case 'PrinterUpdated':   return t('activityCard.printerUpdated')
      case 'PrinterDeleted':   return t('activityCard.printerDeleted')
      case 'PrintStarted':     return t('activityCard.printStarted')
      case 'PrintPaused':      return t('activityCard.printPaused')
      case 'PrintResumed':     return t('activityCard.printResumed')
      case 'PrintCompleted':   return t('activityCard.printCompleted')
      case 'PrintFailed':      return t('activityCard.printFailed')
      case 'PrintCancelled':   return t('activityCard.printCancelled')
      case 'NfcTagRegistered': return t('activityCard.nfcRegistered')
      case 'NfcTagRemoved':    return t('activityCard.nfcRemoved')
      case 'BrandAdded':       return t('activityCard.brandAdded')
      case 'BrandDeleted':     return t('activityCard.brandDeleted')
      default:                 return activity.action
    }
  })()

  const row1Weight = snap?.weight && snap.weight > 0 &&
    (activity.eventType === 'SpoolActivated' || activity.eventType === 'SpoolDeactivated' || activity.eventType === 'SpoolScanned')
      ? <span className={styles.weight}>{snap.weight}g</span>
      : null

  const row2Desc = activity.description
    ? <span className={styles.desc}>{activity.description}</span>
    : null

  const isNfcEvent = activity.eventType === 'NfcTagRegistered' || activity.eventType === 'NfcTagRemoved'

  const hasSpoolSnapshotForNfc = isNfcEvent && !!(snap?.colorHex || snap?.material || snap?.brand)
  const nfcSpoolName = isNfcEvent && !hasSpoolSnapshotForNfc
    ? (/\bto (.+)$/i.exec(activity.description ?? '') ?? [])[1]?.trim() ?? ''
    : ''
  const nfcFallbackParts = (() => {
    if (!nfcSpoolName) return { text: '', mat: '' }
    const words = nfcSpoolName.split(/\s+/)
    const last = words.at(-1) ?? ''
    if (last.length >= 2 && last === last.toUpperCase() && /^[A-Z]/.test(last)) {
      return { text: words.slice(0, -1).join(' '), mat: last }
    }
    return { text: nfcSpoolName, mat: '' }
  })()

  const printerSummary = (() => {
    switch (activity.eventType) {
      case 'PrinterAdded':      return t('activityCard.resourceAdded',   { name: activity.resourceName })
      case 'PrinterUpdated':    return t('activityCard.resourceUpdated', { name: activity.resourceName })
      case 'PrinterDeleted':    return t('activityCard.resourceDeleted', { name: activity.resourceName })
      case 'BrandAdded':        return t('activityCard.resourceAdded',   { name: activity.resourceName })
      case 'BrandDeleted':      return t('activityCard.resourceDeleted', { name: activity.resourceName })
      case 'PrintStarted':
      case 'PrintPaused':
      case 'PrintResumed':
      case 'PrintCompleted':
      case 'PrintFailed':
      case 'PrintCancelled':    return null
      default: return null
    }
  })()

  const content = (
    <>
      {/* Row 1: action · badge · weight · date */}
      <div className={styles.row1}>
        {!flat && <div className={styles.iconWrap} style={{ background: bg, color }}>{icon}</div>}
        <span className={styles.action}>{actionLabel}</span>
        <span className={styles.badge} style={{ color, background: bg }}>{activity.resourceType}</span>
        {row1Weight}
        <div className={styles.meta}>
          <span className={styles.date}>{dayLabel(activity.createdAt, today, yesterday)}</span>
          <span className={styles.timeMobile}>{clockTime(activity.createdAt)}</span>
        </div>
      </div>
      {/* Row 2 */}
      <div className={flat ? styles.row2Flat : styles.row2}>
        {isPrintEvent ? (
          <>
            <span className={styles.name}>{activity.resourceName}</span>
            {printFileLabel && <span className={styles.desc}>{printFileLabel}</span>}
          </>
        ) : printerSummary ? (
          <span className={styles.desc}>{printerSummary}</span>
        ) : (
          <>
            {snap?.colorHex && <span className={styles.dot} style={{ background: snap.colorHex }} />}
            {brand
              ? <><span className={styles.name}>{brand}</span>{colorName && <span className={styles.colorName}>{colorName}</span>}</>
              : <span className={styles.name}>{activity.resourceName}</span>
            }
            {snap?.material && <span className={styles.mat} style={{ color, background: bg }}>{snap.material}</span>}
            {row2Desc}
          </>
        )}
        <span className={styles.time}>{clockTime(activity.createdAt)}</span>
      </div>
      {/* Row 3: filament chip */}
      {isPrintEvent && snap && !!(snap.brand || snap.material || snap.colorHex) && (
        <div className={flat ? styles.filamentRowFlat : styles.filamentRow}>
          {snap.colorHex && <span className={styles.dot} style={{ background: snap.colorHex }} />}
          {snap.brand && <span className={styles.name}>{snap.brand}</span>}
          {colorName && <span className={styles.colorName}>{colorName}</span>}
          {snap.material && <span className={styles.mat} style={{ color, background: bg }}>{snap.material}</span>}
          {snap.weight != null && snap.weight > 0 && (
            <span className={styles.weight}>{snap.weight}g left</span>
          )}
        </div>
      )}
    </>
  )

  const isSpoolEvent = !isPrintEvent && !isNfcEvent && !printerSummary && (snap?.colorHex || snap?.material || snap?.brand)
  const hasWeight = isSpoolEvent && snap?.weight != null && snap.weight > 0

  if (flat) {
    return (
      <div className={styles.flatRow} style={{ '--accent': color } as React.CSSProperties}>
        <div className={styles.flatIcon} style={{ background: bg, color }}>{icon}</div>
        <div className={styles.flatContent}>
          {/* Line 1: action (+ printer name for print events) · day */}
          <div className={styles.flatLine1}>
            <div className={styles.flatLine1Left}>
              <span className={styles.flatAction}>{actionLabel}</span>
              {isPrintEvent && (
                <>
                  <span className={styles.flatSep}>·</span>
                  <span className={styles.flatPrinterName}>{activity.resourceName}</span>
                </>
              )}
            </div>
            <span className={styles.flatDay}>{dayLabel(activity.createdAt, today, yesterday)}</span>
          </div>

          {/* Line 2: identity (left) · relative time (right) */}
          <div className={styles.flatLine2}>
            <div className={styles.flatSub}>
              {isPrintEvent ? (
                <>
                  {isPrintPaused ? (
                    printEstimatedMins != null && printEstimatedMins > 0
                      ? <div className={styles.flatPauseSlot}>
                          {ICONS.clock}
                          <span>{formatMins(printEstimatedMins)}</span>
                          <span>{t('activityCard.minsRemains')}</span>
                        </div>
                      : null
                  ) : (
                    <>
                      {snap?.colorHex && <SpoolIcon color={snap.colorHex} size={18} />}
                      {snap?.brand && <span className={styles.flatName}>{snap.brand}</span>}
                      {snap?.colorName && <span className={styles.flatColorName}>{snap.colorName}</span>}
                      {snap?.material && <span className={styles.flatMat}>{snap.material}</span>}
                      {isPrintCompleted && printUsedGrams != null && printUsedGrams > 0 && (
                        <>
                          <span className={styles.flatSep}>·</span>
                          <span className={styles.flatUsedBadge}>{printUsedGrams}g</span>
                          <span className={styles.flatUsedLabel}>{t('activityCard.used')}</span>
                        </>
                      )}
                    </>
                  )}
                </>
              ) : isNfcEvent ? (
                hasSpoolSnapshotForNfc ? (
                  <>
                    {snap?.colorHex && <SpoolIcon color={snap.colorHex} size={18} />}
                    <span className={styles.flatName}>{brand}</span>
                    {colorName && <span className={styles.flatColorName}>{colorName}</span>}
                    {snap?.material && <span className={styles.flatMat}>{snap.material}</span>}
                  </>
                ) : nfcSpoolName ? (
                  <>
                    <SpoolIcon color="#9ca3af" size={18} />
                    <span className={styles.flatName}>{nfcFallbackParts.text || nfcSpoolName}</span>
                    {nfcFallbackParts.mat && <span className={styles.flatMat}>{nfcFallbackParts.mat}</span>}
                  </>
                ) : null
              ) : printerSummary ? (
                <span className={styles.flatDesc}>{printerSummary}</span>
              ) : (
                <>
                  {snap?.colorHex && <SpoolIcon color={snap.colorHex} size={18} />}
                  <span className={styles.flatName}>{brand || activity.resourceName}</span>
                  {brand && colorName && <span className={styles.flatColorName}>{colorName}</span>}
                  {snap?.material && <span className={styles.flatMat}>{snap.material}</span>}
                </>
              )}
            </div>
            <span className={styles.flatTime}>{relativeTime(activity.createdAt, t)}</span>
          </div>

          {/* Line 3: remaining weight + location / tag UID / filament chip */}
          {(hasWeight || (isSpoolEvent && snap?.stockLocation)) && (
            <div className={styles.flatLine3}>
              {hasWeight && (
                <>
                  <span className={styles.flatRowIcon}>{ICONS.weight}</span>
                  <span className={styles.flatWeight}>{snap!.weight}g</span>
                </>
              )}
              {isSpoolEvent && snap?.stockLocation && (
                <>
                  {hasWeight && <span className={styles.flatSep}>·</span>}
                  <span className={styles.flatRowIcon}>{ICONS.mapPin}</span>
                  <span className={styles.flatSubName}>{snap.stockLocation}</span>
                </>
              )}
            </div>
          )}
          {isNfcEvent && (
            <div className={styles.flatLine3}>
              <span className={styles.flatWeightLabel}>{t('activityCard.tagUidLabel')}:</span>
              <span className={styles.flatTagUid}>{activity.resourceName}</span>
            </div>
          )}
          {activity.eventType === 'PrintStarted' && (
            (printEstimatedMins != null && printEstimatedMins > 0) || !!printStartedFile || !!snap?.printJobId
          ) && (
            <div className={styles.flatLine3}>
              <div className={styles.flatPauseSlot}>
                {ICONS.clock}
                {printEstimatedMins != null && printEstimatedMins > 0 && <span>{formatMins(printEstimatedMins)}</span>}
                <span>{t('activityCard.printing')}</span>
                {printStartedFile
                  ? <span className={styles.flatPrintFile}>{printStartedFile}</span>
                  : snap?.printJobId ? <span className={styles.flatFileSkeleton} /> : null}
              </div>
            </div>
          )}
          {isPrintEvent && activity.eventType !== 'PrintStarted' && (!!printFileLabel || !!snap?.printJobId) && (
            <div className={styles.flatLine3}>
              {printFileLabel
                ? <span className={styles.flatPrintFile}>{printFileLabel}</span>
                : <span className={styles.flatFileSkeleton} />}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.card} style={{ '--accent': color } as React.CSSProperties}>
      {content}
    </div>
  )
}
