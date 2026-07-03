import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { printJobsApi } from '@/api/printJobs'
import { SpoolIcon } from '@/components/icons'
import type { PrintJobResponse } from '@/types/printJob'
import styles from './PrintHistoryPage.module.css'

type FilterKey = 'all' | 'done' | 'printing' | 'failed'

const FILTERS: { key: FilterKey; labelKey: string }[] = [
  { key: 'all',      labelKey: 'printHistory.filterAll' },
  { key: 'done',     labelKey: 'printHistory.filterCompleted' },
  { key: 'printing', labelKey: 'printHistory.filterInProgress' },
  { key: 'failed',   labelKey: 'printHistory.filterFailed' },
]

function statusToFilter(status: string): FilterKey {
  if (status === 'finished')  return 'done'
  if (status === 'running' || status === 'paused') return 'printing'
  return 'failed' // failed, cancelled, unknown
}

function statusLabel(job: PrintJobResponse, t: (k: string) => string): string {
  switch (job.status) {
    case 'finished':  return t('printHistory.statusCompleted')
    case 'failed':    return t('printHistory.statusFailed')
    case 'cancelled': return t('printHistory.statusCancelled')
    case 'running':   return t('printHistory.statusPrinting')
    case 'paused':    return t('printHistory.statusPaused')
    default:          return t('printHistory.statusUnknown')
  }
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return '—'
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 3_600_000) {
    const m = Math.round(ms / 60_000)
    return `${m}m`
  }
  const h = Math.floor(ms / 3_600_000)
  const m = Math.round((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((todayStart - dayStart) / 86_400_000)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (diffDays <= 0) return `Today, ${time}`
  if (diffDays === 1) return `Yesterday, ${time}`
  if (diffDays <= 6) {
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    return `${dayName} ${time}`
  }
  return d.toLocaleDateString('en-GB')
}

export default function PrintHistoryPage() {
  const { t } = useTranslation()
  const [jobs, setJobs] = useState<PrintJobResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    printJobsApi.getAll({ limit: 100, sortBy: 'startedAt_desc' })
      .then(res => {
        if (!cancelled) {
          setJobs(res.jobs)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (activeFilter !== 'all' && statusToFilter(j.status) !== activeFilter) return false
      if (searchQuery) {
        const hay = [j.printFileName, j.printerName, j.spoolBrand, j.spoolColorName, j.spoolMaterial]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(searchQuery.toLowerCase())) return false
      }
      return true
    })
  }, [jobs, activeFilter, searchQuery])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div className={styles.topbarH}>
          <h1>{t('printHistory.title')}</h1>
          <div className={styles.sub}>{t('printHistory.subtitle')}</div>
        </div>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            placeholder={t('printHistory.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <span className={styles.k}>⌘K</span>
        </label>
        <button className={`${styles.btn} ${styles.btnIcon}`} title="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0" />
          </svg>
        </button>
      </header>

      {/* Filter chips */}
      <section className={styles.invbar}>
        <div className={styles.chips}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.chip}${activeFilter === f.key ? ` ${styles.chipOn}` : ''}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </section>

      {/* Table panel */}
      <section className={styles.panel}>
        <div className={styles.ph}>
          <h2>{t('printHistory.jobsSectionTitle')}</h2>
          <span className={styles.phMeta}>
            {filtered.length} {filtered.length === 1 ? t('printHistory.job') : t('printHistory.jobs')}
          </span>
        </div>

        {loading ? (
          <div className={styles.loading}>{t('common.loading')}</div>
        ) : (
          <div className={styles.jtablewrap}>
            <table className={styles.jtable}>
              <thead>
                <tr>
                  <th>{t('printHistory.colPart')}</th>
                  <th>{t('printHistory.colPrinter')}</th>
                  <th>{t('printHistory.colFilament')}</th>
                  <th>{t('printHistory.colUsed')}</th>
                  <th>{t('printHistory.colDuration')}</th>
                  <th>{t('printHistory.colDate')}</th>
                  <th>{t('printHistory.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.emptyNote}>{t('printHistory.emptyFilter')}</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(job => {
                    const st = job.status === 'finished' ? 'done'
                      : job.status === 'failed' || job.status === 'cancelled' ? 'failed'
                      : 'printing'
                    const statusClass = st === 'done' ? styles.jstatusDone
                      : st === 'failed' ? styles.jstatusFailed
                      : styles.jstatusPrinting

                    const filLabel = [job.spoolBrand, job.spoolMaterial].filter(Boolean).join(' · ') || '—'

                    return (
                      <tr key={job.id} className={styles.jrow}>
                        <td>
                          <div className={styles.jpart}>{job.printFileName ?? '—'}</div>
                        </td>
                        <td>{job.printerName ?? '—'}</td>
                        <td>
                          <div className={styles.jspool}>
                            <div className={styles.sc}>
                              {job.spoolColorHex ? (
                                <SpoolIcon color={job.spoolColorHex} size={20} />
                              ) : (
                                <div style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--border)' }} />
                              )}
                            </div>
                            <div className={styles.scn}>
                              <div className={styles.a}>{job.spoolColorName ?? '—'}</div>
                              <div className={styles.b}>{filLabel}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.jnum}>{job.gramsUsed} g</td>
                        <td className={styles.jnum}>{formatDuration(job.startedAt, job.finishedAt)}</td>
                        <td className={styles.jnum} style={{ color: 'var(--muted)' }}>
                          {formatDate(job.finishedAt ?? job.startedAt)}
                        </td>
                        <td>
                          <span className={`${styles.jstatus} ${statusClass}`}>
                            <i />
                            {statusLabel(job, t)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  )
}
