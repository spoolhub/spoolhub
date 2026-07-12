import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import type { PrintJobResponse } from '@/types/printJob'
import styles from './PrintHistoryList.module.css'

type Translate = (key: string, options?: { count: number }) => string

// Relative calendar day: Today / Yesterday / weekday (within the past week) / exact date
function dayLabel(iso: string, t: Translate, locale: string): string {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((todayStart - dayStart) / 86_400_000)
  if (diffDays <= 0) return t('common.today')
  if (diffDays === 1) return t('common.yesterday')
  if (diffDays <= 6) { const w = d.toLocaleDateString(locale, { weekday: 'long' }); return w.charAt(0).toUpperCase() + w.slice(1) }
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Relative time: "X min/hrs ago" within 24h, otherwise the exact 24h clock time
function relativeTime(iso: string, t: Translate, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 86_400_000) {
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 1) return t('common.justNow')
    if (mins < 60) return t('common.minutesAgo', { count: mins })
    return t('common.hoursAgo', { count: Math.floor(diffMs / 3_600_000) })
  }
  return clock(iso, locale)
}

const clock = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })

interface PrintHistoryListProps {
  jobs: PrintJobResponse[]
  /** Printer page shows the spool pills (icon · name · material · grams); spool page shows just the used grams. */
  showSpool?: boolean
}

export default function PrintHistoryList({ jobs, showSpool = false }: PrintHistoryListProps) {
  const { t, i18n } = useTranslation()

  if (jobs.length === 0) {
    return <p className={styles.historyEmpty}>{t('spoolDetail.noJobs')}</p>
  }

  return (
    <div className={styles.historyList}>
      {jobs.map(job => {
        const statusClass =
          job.status === 'finished'  ? styles.statusFinished  :
          job.status === 'failed'    ? styles.statusFailed    :
          job.status === 'cancelled' ? styles.statusCancelled : styles.statusRunning
        const statusLabel =
          job.status === 'finished'  ? t('printerDetail.statusFinished')  :
          job.status === 'failed'    ? t('printerDetail.statusFailed')    :
          job.status === 'cancelled' ? t('printerDetail.statusCancelled') : t('printerDetail.statusRunning')

        const durationMs = job.finishedAt
          ? new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()
          : null
        const durationLabel = durationMs != null
          ? durationMs < 3_600_000
            ? `${Math.round(durationMs / 60_000)}m`
            : `${Math.floor(durationMs / 3_600_000)}h ${Math.round((durationMs % 3_600_000) / 60_000)}m`
          : t('printerDetail.ongoing')

        const anchorIso = job.finishedAt ?? job.startedAt

        const isMultiColor = (job.filaments?.length ?? 0) > 1
        type Pill = { spoolId: string | null; colorHex: string | null; label: string; grams: number }
        const pills: Pill[] = isMultiColor
          ? (job.filaments ?? []).map(f => ({
              spoolId: f.spoolId, colorHex: f.colorHex,
              label: f.colorName ?? '—', grams: f.gramsUsed,
            }))
          : [{
              spoolId: job.spoolId, colorHex: job.spoolColorHex,
              label: [job.spoolMaterial, job.spoolColorName].filter(Boolean).join(' · ') || '—',
              grams: job.gramsUsed,
            }]

        return (
          <div key={job.id} className={styles.historyItem}>
            <div className={styles.historyHeader}>
              <p className={styles.historyName}>
              {job.printFileName ?? <span className={styles.fileNameSkeleton} />}
            </p>
              <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
            </div>

            <div className={styles.historyRow2}>
              {showSpool ? (
                <div className={styles.filamentPills}>
                  {pills.map((pill, i) => {
                    const content = (
                      <>
                        <SpoolIcon color={pill.colorHex ?? '#888'} className="w-4 h-4 flex-shrink-0" />
                        <span className={styles.pillLabel}>{pill.label}</span>
                        <span className={styles.pillGrams}>{pill.grams.toFixed(1)}g</span>
                      </>
                    )
                    return pill.spoolId ? (
                      <Link key={i} to={`/spools/${pill.spoolId}`} className={styles.pill}>{content}</Link>
                    ) : (
                      <div key={i} className={styles.pill}>{content}</div>
                    )
                  })}
                </div>
              ) : (
                <div className={styles.filamentPills}>
                  <span className={styles.usedGrams}>{job.gramsUsed.toFixed(1)}g</span>
                  {job.printerName && (
                    <span className={styles.printerName}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      {job.printerName}
                    </span>
                  )}
                </div>
              )}
              <span className={styles.historyDate}>{dayLabel(anchorIso, t, i18n.language)}</span>
            </div>

            <div className={styles.historyMeta}>
              <span>{clock(job.startedAt, i18n.language)}{job.finishedAt ? ` → ${clock(job.finishedAt, i18n.language)}` : ''}</span>
              <span>·</span>
              <span>{durationLabel}</span>
              <span className={styles.historyTime}>{relativeTime(anchorIso, t, i18n.language)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
