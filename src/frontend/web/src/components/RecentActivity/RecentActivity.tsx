import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { activitiesApi } from '@/api/activities'
import { spoolsApi } from '@/api/spools'
import { printJobsApi } from '@/api/printJobs'
import { useConnection } from '@/context/ConnectionContext'
import type { Activity } from '@/types/activity'
import type { PrintJobResponse } from '@/types/printJob'
import type { SpoolResponse } from '@/types/spool'
import styles from './RecentActivity.module.css'

const NFC_EVENTS = new Set(['NfcTagRegistered', 'NfcTagRemoved'])
const SPOOL_EVENTS = new Set(['SpoolCreated', 'SpoolActivated', 'SpoolDeactivated', 'SpoolUpdated', 'SpoolDeleted', 'SpoolScanned', 'SpoolAssigned', 'SpoolUnassigned'])
const PRINT_EVENTS = new Set(['PrintStarted', 'PrintPaused', 'PrintResumed', 'PrintCompleted', 'PrintFailed', 'PrintCancelled'])

function needsEnrich(a: Activity): boolean {
  if (!a.resourceId) return false
  if (NFC_EVENTS.has(a.eventType) && !a.snapshot) return true
  if (SPOOL_EVENTS.has(a.eventType) && a.snapshot && !a.snapshot.stockLocation) return true
  return false
}

function applyJobToSnapshot(a: Activity, job: PrintJobResponse): Activity {
  const remainingMins = job.estimatedFinishTime ?? undefined
  return {
    ...a,
    snapshot: {
      ...(a.snapshot ?? {}),
      brand:         job.spoolBrand     ?? a.snapshot?.brand,
      colorName:     job.spoolColorName ?? a.snapshot?.colorName,
      colorHex:      job.spoolColorHex  ?? a.snapshot?.colorHex,
      material:      job.spoolMaterial  ?? a.snapshot?.material,
      estimatedMins: remainingMins      ?? a.snapshot?.estimatedMins,
      printFileName: job.printFileName  ?? undefined,
      gramsUsed:     job.gramsUsed,
    },
  }
}

type SpoolCache = Map<string, { brand: string; colorName: string; colorHex: string; material: string; stockLocation?: string }>

async function enrichActivities(activities: Activity[], spoolCache?: SpoolCache): Promise<Activity[]> {
  const toEnrich   = activities.filter(needsEnrich)
  const printEvts  = activities.filter(a => PRINT_EVENTS.has(a.eventType) && a.snapshot?.printJobId)
  if (toEnrich.length === 0 && printEvts.length === 0) return activities

  const spoolIds  = [...new Set(toEnrich.map(a => a.resourceId!))]
  const jobIds    = [...new Set(printEvts.map(a => a.snapshot!.printJobId!))]
  const spoolById: SpoolCache = new Map(spoolCache ?? [])
  const jobById   = new Map<string, PrintJobResponse>()

  await Promise.all([
    ...spoolIds.filter(id => !spoolById.has(id)).map(async id => {
      try {
        const s = await spoolsApi.getById(id)
        spoolById.set(id, { brand: s.brand, colorName: s.colorName, colorHex: s.colorHex, material: s.material, stockLocation: s.stockLocation ?? undefined })
      } catch { /* deleted or not found */ }
    }),
    ...jobIds.map(async id => {
      try { jobById.set(id, await printJobsApi.getById(id)) } catch { /* not found */ }
    }),
  ])

  return activities.map(a => {
    if (PRINT_EVENTS.has(a.eventType) && a.snapshot?.printJobId) {
      const job = jobById.get(a.snapshot.printJobId)
      if (job) return applyJobToSnapshot(a, job)
    }
    if (!a.resourceId) return a
    const s = spoolById.get(a.resourceId)
    if (!s) return a
    if (NFC_EVENTS.has(a.eventType) && !a.snapshot) return { ...a, snapshot: s }
    if (SPOOL_EVENTS.has(a.eventType) && a.snapshot && !a.snapshot.stockLocation && s.stockLocation)
      return { ...a, snapshot: { ...a.snapshot, stockLocation: s.stockLocation } }
    return a
  })
}

function relativeTime(iso: string, t: (k: string, o?: { count: number }) => string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) return t('common.justNow')
  if (diffMs < 86_400_000) {
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 1) return t('common.justNow')
    if (mins < 60) return t('common.minutesAgo', { count: mins })
    return t('common.hoursAgo', { count: Math.floor(diffMs / 3_600_000) })
  }
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 1) return t('common.yesterday')
  return t('common.daysAgo', { count: days })
}

// Build activity description lines as JSX (mimics handoff's ACTS array pattern)
interface ActionLine { text: string; bold?: boolean }

function buildActionLines(a: Activity, t: (k: string) => string): { line1: ActionLine[]; line2?: string } {
  const snap = a.snapshot
  const snapBrand = snap?.brand ?? ''
  const snapColor = snap?.colorName ?? ''
  const spoolName = snapBrand && snapColor ? `${snapBrand} ${snapColor}` : snapBrand || snapColor || a.resourceName || ''

  const bold = (text: string): ActionLine => ({ text, bold: true })
  const plain = (text: string): ActionLine => ({ text })

  switch (a.eventType) {
    case 'SpoolCreated':
      return { line1: [bold(spoolName), plain(` ${t('activityCard.spoolCreated')}`)] }
    case 'SpoolActivated':
      return { line1: [bold(spoolName), plain(` ${t('activityCard.spoolActivated')}`)] }
    case 'SpoolDeactivated':
      return { line1: [bold(spoolName), plain(` ${t('activityCard.spoolDeactivated')}`)] }
    case 'SpoolUpdated':
      return { line1: [bold(spoolName), plain(` ${t('activityCard.spoolUpdated')}`)] }
    case 'SpoolDeleted':
      return { line1: [bold(spoolName), plain(` ${t('activityCard.spoolDeleted')}`)] }
    case 'SpoolScanned':
      return { line1: [bold(spoolName), plain(` ${t('activityCard.spoolScanned')}`)] }
    case 'SpoolAssigned':
      return { line1: [bold(spoolName), plain(` ${t('activityCard.spoolAssigned')}`)] }
    case 'SpoolUnassigned':
      return { line1: [bold(spoolName), plain(` ${t('activityCard.spoolUnassigned')}`)] }
    case 'PrinterAdded':
      return { line1: [bold(a.resourceName), plain(` ${t('activityCard.printerAdded')}`)] }
    case 'PrinterUpdated':
      return { line1: [bold(a.resourceName), plain(` ${t('activityCard.printerUpdated')}`)] }
    case 'PrinterDeleted':
      return { line1: [bold(a.resourceName), plain(` ${t('activityCard.printerDeleted')}`)] }
    case 'PrintStarted':
      return {
        line1: [plain(t('activityCard.printStarted')), bold(a.resourceName ? ` ${a.resourceName}` : '')],
      }
    case 'PrintCompleted':
      return {
        line1: [plain(t('activityCard.printCompleted')), bold(a.resourceName ? ` ${a.resourceName}` : '')],
      }
    case 'PrintPaused':
      return { line1: [plain(t('activityCard.printPaused')), bold(a.resourceName ? ` ${a.resourceName}` : '')] }
    case 'PrintFailed':
      return { line1: [plain(`⚠ ${t('activityCard.printFailed')}`), bold(a.resourceName ? ` ${a.resourceName}` : '')] }
    case 'NfcTagRegistered':
    case 'NfcTagRemoved':
      return { line1: [plain(t('activityCard.nfcRegistered')), bold(spoolName ? ` ${spoolName}` : '')] }
    case 'BrandAdded':
      return { line1: [bold(a.resourceName), plain(` ${t('activityCard.brandAdded')}`)] }
    case 'BrandDeleted':
      return { line1: [bold(a.resourceName), plain(` ${t('activityCard.brandDeleted')}`)] }
    default:
      return { line1: [plain(a.action || a.eventType)] }
  }
}

export default function RecentActivity({ limit = 5, spools }: { limit?: number; spools?: SpoolResponse[] }) {
  const { t } = useTranslation()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const { refreshKey } = useConnection()

  const spoolCache = spools
    ? new Map(spools.map(s => [s.id, { brand: s.brand, colorName: s.colorName, colorHex: s.colorHex, material: s.material, stockLocation: s.stockLocation ?? undefined }]))
    : undefined

  useEffect(() => {
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    activitiesApi.getRecent(20)
      .then(r => enrichActivities(r.activities, spoolCache))
      .then(enriched => { setActivities(enriched); setLoading(false) })
      .catch(() => {})
  }, [refreshKey])

  useEffect(() => {
    const timer = setInterval(() => {
      activitiesApi.getRecent(20)
        .then(r => enrichActivities(r.activities, spoolCache))
        .then(enriched => setActivities(enriched))
        .catch(() => {})
    }, 10_000)
    return () => clearInterval(timer)
  }, [])

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {[0, 1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonItem} />)}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={styles.empty}>
        <svg className={styles.emptyIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <span className={styles.emptyText}>{t('recentActivity.noActivity')}</span>
      </div>
    )
  }

  return (
    <div className={styles.act}>
      {activities.slice(0, limit).map(a => {
        const { line1 } = buildActionLines(a, t)
        const time = relativeTime(a.createdAt, t as (k: string, o?: { count: number }) => string)
        return (
          <div key={a.id} className={styles.actitem}>
            <div className={styles.dot} />
            <div className={styles.text}>
              <div className={styles.a}>
                {line1.map((seg, i) =>
                  seg.bold ? <b key={i}>{seg.text}</b> : <span key={i}>{seg.text}</span>
                )}
              </div>
              <div className={styles.b}>{time}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
