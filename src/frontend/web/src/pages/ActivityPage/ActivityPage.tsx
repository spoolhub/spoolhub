import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useConnection } from '@/context/ConnectionContext'
import { activitiesApi } from '@/api/activities'
import ActivityCard from '@/components/ActivityCard'
import Pagination from '@/components/Pagination'
import type { Activity } from '@/types/activity'
import styles from './ActivityPage.module.css'

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

function guessPerPage(): number {
  if (window.innerWidth < 640) return 100
  return Math.max(5, Math.floor((window.innerHeight - 260) / 60))
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
  } = useActivityLog(guessPerPage())

  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  const contentRef    = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function measure() {
      if (!contentRef.current) return
      if (window.innerWidth < 640) { setPerPage(100); return }
      const paginationH = paginationRef.current
        ? paginationRef.current.offsetHeight + 16
        : 80
      const count = Math.max(5, Math.floor((contentRef.current.clientHeight - paginationH) / 60))
      setPerPage(count)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (contentRef.current)    ro.observe(contentRef.current)
    if (paginationRef.current) ro.observe(paginationRef.current)
    return () => ro.disconnect()
  }, [setPerPage])

  useEffect(() => {
    if (refreshKey > 0) refetch()
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = Object.values(filters).some(v => v !== '')

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

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight leading-none">
            {t('activity.title')}
          </h1>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {loading ? t('activity.loading') : t('activity.eventsRecorded', { count: total })}
          </p>
        </div>
        {total > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 hover:text-red-500 transition-colors px-2.5 py-1.5 rounded-lg border border-red-400/30 hover:border-red-400/60 hover:bg-red-400/5"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
            {t('activity.clearAll')}
          </button>
        )}
      </div>

      {/* ── Confirm clear modal ─────────────────────────── */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4 ${styles.confirmModal}`}>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-[var(--text-primary)]">{t('activity.clearTitle')}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{t('activity.clearConfirm', { count: total })}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmClear(false)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/5 ${styles.cancelBtn}`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {clearing ? t('activity.clearing') : t('activity.clearAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────── */}
      <div className={`${styles.filterBar} mb-4`}>
        <div className={styles.filterGroup}>

          <select className={styles.select} value={filters.eventType}
                  onChange={e => updateFilter('eventType', e.target.value)}>
            <option value="">{t('activity.allTypes')}</option>
            <option value="spool">{t('activity.typeSpools')}</option>
            <option value="printer">{t('activity.typePrinters')}</option>
            <option value="brand">{t('activity.typeBrands')}</option>
            <option value="print">{t('activity.typePrintJobs')}</option>
            <option value="nfc">{t('activity.typeNfc')}</option>
          </select>

          <select className={styles.select} value={filters.action}
                  onChange={e => updateFilter('action', e.target.value)}>
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

          <select className={styles.select} value={filters.timePeriod}
                  onChange={e => updateFilter('timePeriod', e.target.value)}>
            <option value="">{t('activity.allTime')}</option>
            <option value="today">{t('activity.periodToday')}</option>
            <option value="week">{t('activity.periodWeek')}</option>
            <option value="month">{t('activity.periodMonth')}</option>
          </select>

          <select className={styles.select} value={filters.sortBy}
                  onChange={e => updateFilter('sortBy', e.target.value)}>
            <option value="">{t('activity.newestFirst')}</option>
            <option value="oldest">{t('activity.oldestFirst')}</option>
            <option value="az">{t('activity.nameAZ')}</option>
            <option value="za">{t('activity.nameZA')}</option>
          </select>

        </div>

        {hasFilters && (
          <button className={styles.clearBtn} onClick={resetFilters}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            {t('activity.clearFilter')}
          </button>
        )}
      </div>

      {/* ── Content + Pagination ── */}
      <div ref={contentRef} className="flex flex-col flex-1 min-h-0">

        {loading ? (
          <div className={styles.group}>
            {[0,1,2,3,4].map(i => <div key={i} className={styles.skeletonRow} />)}
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⚠</div>
            <p>{t('activity.failedLoad')}</p>
          </div>
        ) : activities.length === 0 ? (
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
              <button className={styles.clearBtn} onClick={resetFilters}>{t('activity.clearFilters')}</button>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {groupByDate(activities, t('common.today'), t('common.yesterday')).map(({ label, items }) => (
              <div key={label} className={styles.dayGroup}>
                <div className={styles.dateHeader}>{label}</div>
                <div className={styles.flatGroup}>
                  {items.map(a => <ActivityCard key={a.id} activity={a} flat />)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={paginationRef}>
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

      </div>

    </div>
  )
}
