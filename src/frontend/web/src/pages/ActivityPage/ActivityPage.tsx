import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useConnection } from '@/context/ConnectionContext'
import { activitiesApi } from '@/api/activities'
import ActivityCard from '@/components/ActivityCard'
import Pagination from '@/components/Pagination'
import type { Activity, ActivityFilters } from '@/types/activity'
import styles from './ActivityPage.module.css'

const TYPE_FILTERS: { key: ActivityFilters['eventType']; labelKey: string }[] = [
  { key: '',        labelKey: 'activity.allTypes' },
  { key: 'spool',   labelKey: 'activity.typeSpools' },
  { key: 'printer', labelKey: 'activity.typePrinters' },
  { key: 'brand',   labelKey: 'activity.typeBrands' },
  { key: 'print',   labelKey: 'activity.typePrintJobs' },
  { key: 'nfc',     labelKey: 'activity.typeNfc' },
]

function groupByDate(activities: Activity[], today: string, yesterday: string) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yestStart  = todayStart - 86_400_000

  function dayLabel(iso: string): string {
    const d = new Date(iso)
    if (d.getTime() >= todayStart) return today
    if (d.getTime() >= yestStart)  return yesterday
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const groups: { label: string; items: Activity[] }[] = []
  for (const a of activities) {
    const label = dayLabel(a.createdAt)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(a)
    else groups.push({ label, items: [a] })
  }
  return groups
}

export default function ActivityPage() {
  const { t } = useTranslation()
  const { refreshKey } = useConnection()
  const {
    activities, total,
    page, setPage,
    perPage, setPerPage,
    filters, updateFilter, resetFilters,
    loading, error, refetch,
  } = useActivityLog(20)

  const [query, setQuery] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (refreshKey > 0) refetch()
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = Object.values(filters).some(v => v !== '') || query !== ''

  const visible = useMemo(() => {
    if (!query) return activities
    const q = query.toLowerCase()
    return activities.filter(a => {
      const hay = [a.resourceName, a.description, a.snapshot?.brand, a.snapshot?.colorName, a.snapshot?.printFileName]
        .filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [activities, query])

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
    resetFilters()
    setQuery('')
  }

  return (
    <div className={`${styles.page} page`}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('activity.title')}</h1>
          <div className={styles.sub}>{loading ? t('activity.loading') : t('activity.eventsRecorded', { count: total })}</div>
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
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key || 'all'}
              className={`${styles.chip}${filters.eventType === f.key ? ` ${styles.on}` : ''}`}
              onClick={() => updateFilter('eventType', f.key)}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
        <div className={styles.invtools}>
          <select className={styles.sortsel} value={filters.action} onChange={e => updateFilter('action', e.target.value)}>
            <option value="">{t('activity.allActions')}</option>
            <option value="Added">{t('activity.actionAdded')}</option>
            <option value="Updated">{t('activity.actionUpdated')}</option>
            <option value="Deleted">{t('activity.actionDeleted')}</option>
            <option value="Activated">{t('activity.actionActivated')}</option>
            <option value="Deactivated">{t('activity.actionDeactivated')}</option>
            <option value="Assigned">{t('activity.actionAssigned')}</option>
            <option value="Unassigned">{t('activity.actionUnassigned')}</option>
            <option value="Scanned">{t('activity.actionScanned')}</option>
            <option value="Completed">{t('activity.actionCompleted')}</option>
            <option value="Registered">{t('activity.actionRegistered')}</option>
            <option value="Removed">{t('activity.actionRemoved')}</option>
          </select>
          <select className={styles.sortsel} value={filters.timePeriod} onChange={e => updateFilter('timePeriod', e.target.value)}>
            <option value="">{t('activity.allTime')}</option>
            <option value="today">{t('activity.periodToday')}</option>
            <option value="week">{t('activity.periodWeek')}</option>
            <option value="month">{t('activity.periodMonth')}</option>
          </select>
          <select className={styles.sortsel} value={filters.sortBy} onChange={e => updateFilter('sortBy', e.target.value)}>
            <option value="">{t('activity.newestFirst')}</option>
            <option value="oldest">{t('activity.oldestFirst')}</option>
            <option value="az">{t('activity.nameAZ')}</option>
            <option value="za">{t('activity.nameZA')}</option>
          </select>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>{t('activity.title')}</h2>
          <span className={styles.meta}>{loading ? t('activity.loading') : t('activity.eventsRecorded', { count: visible.length })}</span>
        </div>

        <div className={styles.body}>
          {loading ? (
            <>
              {[0, 1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonRow} style={{ marginBottom: 6 }} />)}
            </>
          ) : error ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⚠</div>
              <p>{t('activity.failedLoad')}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <p>{hasFilters ? t('activity.noMatch') : t('activity.noActivity')}</p>
              {hasFilters && (
                <button className={styles.btn} onClick={resetAll}>{t('activity.clearFilters')}</button>
              )}
            </div>
          ) : (
            groupByDate(visible, t('common.today'), t('common.yesterday')).map(({ label, items }) => (
              <div key={label} className={styles.dayGroup}>
                <div className={styles.dateHeader}>{label}</div>
                {items.map(a => <ActivityCard key={a.id} activity={a} flat />)}
              </div>
            ))
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
