import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useConnection } from '@/context/ConnectionContext'
import { activitiesApi } from '@/api/activities'
import Pagination from '@/components/Pagination'
import NotificationBell from '@/components/NotificationBell'
import ActivityCard from '@/components/ActivityCard'
import { feedCategory } from '@/components/ActivityFeed'
import { activityPrintLoadSearchText } from '@/components/ActivityPrintLoadDetail'
import type { Activity } from '@/types/activity'
import styles from './ActivityPage.module.css'

type Category = 'scan' | 'print' | 'stock' | 'inventory'

function pageCategoryOf(a: Activity): Category {
  const cat = feedCategory(a.eventType)
  if (cat === 'scan') return 'scan'
  if (cat === 'print') return 'print'
  if (cat === 'stock') return 'stock'
  return 'inventory'
}

const CHIPS: { key: Category | 'all'; labelKey: string }[] = [
  { key: 'all',       labelKey: 'activity.chipAll' },
  { key: 'scan',      labelKey: 'activity.chipScans' },
  { key: 'print',     labelKey: 'activity.chipPrints' },
  { key: 'stock',     labelKey: 'activity.chipStock' },
  { key: 'inventory', labelKey: 'activity.chipInventory' },
]

function activitySearchText(a: Activity): string {
  return [
    a.resourceName,
    a.description,
    a.snapshot?.brand,
    a.snapshot?.colorName,
    a.snapshot?.material,
    a.snapshot?.printFileName,
    a.snapshot?.stockLocation,
    a.snapshot?.weight != null ? `${a.snapshot.weight}g` : '',
    activityPrintLoadSearchText(a.snapshot),
  ].filter(Boolean).join(' ').toLowerCase()
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
    if (category !== 'all') list = list.filter(a => pageCategoryOf(a) === category)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(a => activitySearchText(a).includes(q))
    }
    return list
  }, [activities, category, query])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

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

  const metaCount = loading
    ? t('activity.loading')
    : t('activity.eventsRecorded', { count: visible.length })

  return (
    <div className={`${styles.page} page`}>
      <header className={styles.topbar}>
        <div className={styles.topbarH}>
          <h1>{t('activity.title')}</h1>
          <div className={styles.sub}>{t('activity.subtitle')}</div>
        </div>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            placeholder={t('activity.searchPlaceholder')}
            value={query}
            onChange={handleSearchChange}
          />
          <span className={styles.k}>⌘K</span>
        </label>
        <NotificationBell variant="bordered" />
        {total > 0 && (
          <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={() => setConfirmClear(true)}>
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
              <button type="button" className={styles.btn} onClick={() => setConfirmClear(false)}>{t('common.cancel')}</button>
              <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={handleClearAll} disabled={clearing}>
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
              type="button"
              className={`${styles.chip}${category === c.key ? ` ${styles.chipOn}` : ''}`}
              onClick={() => setCategory(c.key)}
            >
              {t(c.labelKey)}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.ph}>
          <h2>{t('activity.listTitle')}</h2>
          <span className={styles.phMeta}>{metaCount}</span>
        </div>

        {error ? (
          <div className={styles.loading}>{t('activity.failedLoad')}</div>
        ) : loading ? (
          <div className={styles.loading}>{t('common.loading')}</div>
        ) : (
          <div className={styles.jtablewrap}>
            <table className={styles.jtable}>
              <thead>
                <tr>
                  <th>{t('activity.colEvent')}</th>
                  <th>{t('activity.colDetail')}</th>
                  <th>{t('activity.colInfo')}</th>
                  <th>{t('activity.colTime')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className={styles.emptyNote}>
                        {hasFilters ? t('activity.noMatch') : t('activity.noActivity')}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visible.map(a => (
                    <ActivityCard key={a.id} activity={a} tableRow />
                  ))
                )}
              </tbody>
            </table>

            <Pagination
              total={total}
              page={page}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={p => { setPerPage(p); setPage(1) }}
              perPageOptions={[...new Set([perPage, 10, 20, 50, 100])].sort((a, b) => a - b)}
              itemLabel={t('pagination.events')}
              className="pt-5 pb-2"
            />
          </div>
        )}
      </section>
    </div>
  )
}
