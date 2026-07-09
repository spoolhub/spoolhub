import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useConnection } from '@/context/ConnectionContext'
import { activitiesApi } from '@/api/activities'
import Pagination from '@/components/Pagination'
import type { Activity } from '@/types/activity'
import styles from './ActivityPage.module.css'

/* ── Categories (handoff chips: All / Scans / Prints / Stock / Inventory) ── */

type Category = 'scan' | 'print' | 'stock' | 'inventory'

function categoryOf(a: Activity): Category {
  if (a.eventType === 'SpoolScanned' || a.eventType.startsWith('NfcTag')) return 'scan'
  if (a.eventType.startsWith('Print') && !a.eventType.startsWith('Printer')) return 'print'
  if (a.eventType === 'LowStockAlert') return 'stock'
  return 'inventory'
}

const CHIPS: { key: Category | 'all'; labelKey: string }[] = [
  { key: 'all',       labelKey: 'activity.chipAll' },
  { key: 'scan',      labelKey: 'activity.chipScans' },
  { key: 'print',     labelKey: 'activity.chipPrints' },
  { key: 'stock',     labelKey: 'activity.chipStock' },
  { key: 'inventory', labelKey: 'activity.chipInventory' },
]

/* ── Handoff icon set (ICONS map from SpoolHub Activity.html) ── */

const S = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const ICONS = {
  // NFC / contactless waves — scan events
  scan:   <svg {...S}><path d="M6 8.5a6.5 6.5 0 0 1 0 7"/><path d="M9.5 6.5a10 10 0 0 1 0 11"/><path d="M13 4.5a13.5 13.5 0 0 1 0 15"/><circle cx="3.2" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>,
  // check inside circle — print completed
  done:   <svg {...S}><circle cx="12" cy="12" r="8"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/></svg>,
  // play — print started
  play:   <svg {...S}><circle cx="12" cy="12" r="8"/><path d="M10 9.2v5.6l4.6-2.8Z"/></svg>,
  // pause inside circle — print paused
  pause:  <svg {...S}><circle cx="12" cy="12" r="8"/><path d="M10 9v6M14 9v6"/></svg>,
  // warning triangle — low stock alert
  stock:  <svg {...S}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  // spool with plus — added
  add:    <svg {...S}><circle cx="10" cy="12" r="7"/><circle cx="10" cy="12" r="2"/><path d="M18.5 15.5v5M16 18h5"/></svg>,
  // spool with minus — removed
  remove: <svg {...S}><circle cx="10" cy="12" r="7"/><circle cx="10" cy="12" r="2"/><path d="M16 18h5"/></svg>,
  // bare spool — updates / everything else
  spool:  <svg {...S}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></svg>,
  // x inside circle — print failed / cancelled
  fail:   <svg {...S} strokeLinejoin={undefined}><circle cx="12" cy="12" r="8"/><path d="M9.5 9.5l5 5m0-5-5 5"/></svg>,
}

function iconOf(a: Activity): React.ReactNode {
  switch (a.eventType) {
    case 'SpoolScanned':
    case 'NfcTagRegistered':
    case 'NfcTagRemoved':    return ICONS.scan
    case 'PrintCompleted':   return ICONS.done
    case 'PrintStarted':
    case 'PrintResumed':     return ICONS.play
    case 'PrintPaused':      return ICONS.pause
    case 'PrintFailed':
    case 'PrintCancelled':   return ICONS.fail
    case 'LowStockAlert':    return ICONS.stock
    case 'SpoolCreated':
    case 'PrinterAdded':
    case 'BrandAdded':       return ICONS.add
    case 'SpoolDeleted':
    case 'PrinterDeleted':
    case 'BrandDeleted':     return ICONS.remove
    default:                 return ICONS.spool
  }
}

/* ── Row content ── */

function eventTitle(a: Activity, t: (k: string, o?: Record<string, unknown>) => string): string {
  switch (a.eventType) {
    case 'SpoolCreated':     return t('activityCard.spoolCreated')
    case 'SpoolActivated':   return t('activityCard.spoolActivated')
    case 'SpoolDeactivated': return t('activityCard.spoolDeactivated')
    case 'SpoolUpdated':     return t('activityCard.spoolUpdated')
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
    default:                 return a.action
  }
}

function eventDetail(a: Activity): string {
  const snap = a.snapshot
  const isPrint = categoryOf(a) === 'print'
  if (isPrint) {
    const file = snap?.printFileName
    return file ? `${file} · ${a.resourceName}` : a.resourceName
  }
  if (snap?.brand) {
    const color = snap.colorName ?? (a.resourceName.startsWith(snap.brand) ? a.resourceName.slice(snap.brand.length).trim() : '')
    return color ? `${color} · ${snap.brand}` : snap.brand
  }
  return a.resourceName
}

function eventInfo(a: Activity, t: (k: string) => string): string {
  const snap = a.snapshot
  if (a.eventType.startsWith('NfcTag')) return `${t('activityCard.tagUidLabel')} ${a.resourceName}`
  if (a.eventType === 'PrintCompleted' && snap?.gramsUsed != null && snap.gramsUsed > 0) return `${snap.gramsUsed} g`
  if (snap?.weight != null && snap.weight > 0) {
    return snap.stockLocation ? `${snap.weight} g · ${snap.stockLocation}` : `${snap.weight} g`
  }
  return a.description ?? ''
}

function relativeTime(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1)  return t('common.justNow')
  if (mins < 60) return t('common.minutesAgo', { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return t('common.hoursAgo', { count: hrs })
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  if (d.getTime() >= todayStart - 86_400_000) return `${t('common.yesterday')}, ${time}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ActivityPage() {
  const { t } = useTranslation()
  const { refreshKey } = useConnection()
  const {
    activities, total,
    page, setPage,
    perPage, setPerPage,
    loading, error, refetch,
  } = useActivityLog(20)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (refreshKey > 0) refetch()
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = category !== 'all' || query !== ''

  const visible = useMemo(() => {
    let list = activities
    if (category !== 'all') list = list.filter(a => categoryOf(a) === category)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(a => {
        const hay = [a.resourceName, a.description, a.snapshot?.brand, a.snapshot?.colorName, a.snapshot?.printFileName]
          .filter(Boolean).join(' ').toLowerCase()
        return hay.includes(q)
      })
    }
    return list
  }, [activities, category, query])

  async function handleClearAll() {
    setClearing(true)
    try {
      await activitiesApi.clearAll()
      setConfirmClear(false)
      refetch()
    } finally {
      setClearing(false)
    }
  }

  function resetAll() {
    setCategory('all')
    setQuery('')
  }

  return (
    <div className={`${styles.page} page`}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('activity.title')}</h1>
          <div className={styles.sub}>{t('activity.subtitle')}</div>
        </div>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          <input placeholder={t('activity.searchPlaceholder', 'Search activity…')} value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        {total > 0 && (
          <button className={`${styles.btn} ${styles.danger}`} onClick={() => setConfirmClear(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
            {t('activity.clearAll')}
          </button>
        )}
      </header>

      {confirmClear && (
        <div className={styles.scrim} onClick={() => setConfirmClear(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div>
              <h2>{t('activity.clearTitle')}</h2>
              <p>{t('activity.clearConfirm', { count: total })}</p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setConfirmClear(false)}>{t('common.cancel')}</button>
              <button className={`${styles.btn} ${styles.danger}`} onClick={handleClearAll} disabled={clearing}>
                {clearing ? t('activity.clearing') : t('activity.clearAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={styles.invbar}>
        <div className={styles.chips}>
          {CHIPS.map(c => (
            <button
              key={c.key}
              className={`${styles.chip}${category === c.key ? ` ${styles.on}` : ''}`}
              onClick={() => setCategory(c.key)}
            >
              {t(c.labelKey)}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>{t('activity.title')}</h2>
          <span className={styles.meta}>{loading ? t('activity.loading') : t('activity.eventsRecorded', { count: visible.length })}</span>
        </div>

        <div className={styles.tablewrap}>
          {loading ? (
            <div className={styles.skeletons}>
              {[0, 1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonRow} />)}
            </div>
          ) : error ? (
            <div className={styles.empty}>{t('activity.failedLoad')}</div>
          ) : visible.length === 0 ? (
            <div className={styles.empty}>
              <p>{hasFilters ? t('activity.noMatch') : t('activity.noActivity')}</p>
              {hasFilters && (
                <button className={styles.btn} onClick={resetAll}>{t('activity.clearFilters')}</button>
              )}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>{t('activity.colEvent')}</th>
                  <th>{t('activity.colDetail')}</th>
                  <th>{t('activity.colInfo')}</th>
                  <th>{t('activity.colTime')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(a => (
                  <tr key={a.id} className={styles.row}>
                    <td className={styles.iconCell}>
                      <div className={`${styles.aicon} ${styles[categoryOf(a)]}`}>{iconOf(a)}</div>
                    </td>
                    <td><span className={styles.eventName}>{eventTitle(a, t)}</span></td>
                    <td><span className={styles.detail}>{eventDetail(a)}</span></td>
                    <td><span className={styles.info}>{eventInfo(a, t)}</span></td>
                    <td className={styles.time}>{relativeTime(a.createdAt, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <Pagination
            total={total}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={p => { setPerPage(p); setPage(1) }}
            perPageOptions={[...new Set([perPage, 10, 20, 50, 100])].sort((a, b) => a - b)}
            itemLabel={t('pagination.events')}
            className="pt-5 pb-4"
          />
        </div>
      </section>
    </div>
  )
}
