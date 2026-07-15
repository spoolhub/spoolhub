import type { TFunction } from 'i18next'
import type { Activity } from '@/types/activity'

export type ActivityFeedCategory = 'print' | 'scan' | 'spool' | 'stock' | 'system'

const PRINT_EVENTS = new Set([
  'PrintStarted', 'PrintPaused', 'PrintResumed',
  'PrintCompleted', 'PrintFailed', 'PrintCancelled',
])

export function feedCategory(eventType: string): ActivityFeedCategory {
  if (PRINT_EVENTS.has(eventType)) return 'print'
  if (eventType === 'SpoolScanned' || eventType.startsWith('NfcTag')) return 'scan'
  if (eventType === 'LowStockAlert') return 'stock'
  if (eventType.startsWith('Spool') || eventType.startsWith('Printer') || eventType.startsWith('Brand')) return 'spool'
  return 'system'
}

export function actionLabel(activity: Activity, t: TFunction): string {
  switch (activity.eventType) {
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
    case 'LowStockAlert':    return t('activity.lowStock', 'Low stock alert')
    default:                 return activity.action
  }
}

export function relativeFeedTime(iso: string, t: TFunction): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 86_400_000) {
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 1) return t('common.justNow')
    if (mins < 60) return t('common.minutesAgo', { count: mins })
    return t('common.hoursAgo', { count: Math.floor(diffMs / 3_600_000) })
  }
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 1) return t('common.yesterday')
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function dayGroupLabel(iso: string, t: TFunction): string {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yestStart = todayStart - 86_400_000
  if (d.getTime() >= todayStart) return t('common.today')
  if (d.getTime() >= yestStart) return t('common.yesterday')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function parsePrintFile(activity: Activity): string | null {
  const snap = activity.snapshot
  const isPrint = PRINT_EVENTS.has(activity.eventType)
  if (!isPrint) return null
  if (snap?.printFileName) return snap.printFileName
  if (!activity.description) return null
  const d = activity.description
  if (activity.eventType === 'PrintCompleted') {
    const m = d.match(/^(.+?) — [\d.]+g used$/i)
    return m ? m[1].trim() : d
  }
  const m = d.match(/^(?:printing\s*-\s*|started|paused|resumed|failed:\s*|cancelled:\s*)(.*)/i)
  const raw = m ? m[1].trim() : d
  const strip = raw.match(/^printing\s*-\s*(.*)/i)
  return strip ? strip[1].trim() : raw
}

export function buildMetaPills(activity: Activity, t: TFunction): string[] {
  const snap = activity.snapshot
  const pills: string[] = []
  const isPrint = PRINT_EVENTS.has(activity.eventType)

  if (isPrint) {
    if (activity.eventType === 'PrintStarted' && snap?.weight != null && snap.weight > 0) {
      pills.push(`${snap.weight}g left`)
    }
    if ((activity.eventType === 'PrintStarted' || activity.eventType === 'PrintPaused')
      && snap?.estimatedMins != null && snap.estimatedMins > 0) {
      const h = Math.floor(snap.estimatedMins / 60)
      const m = snap.estimatedMins % 60
      pills.push(m > 0 ? `${h}h ${m}m` : `${h}h`)
    }
    if (activity.eventType === 'PrintCompleted' && snap?.gramsUsed != null && snap.gramsUsed > 0) {
      pills.push(`${snap.gramsUsed}g ${t('activityCard.used')}`)
    }
    const file = parsePrintFile(activity)
    if (file) pills.push(file)
  }

  if (!isPrint && snap?.weight != null && snap.weight > 0) pills.push(`${snap.weight}g`)
  if (snap?.stockLocation) pills.push(snap.stockLocation)
  if (activity.eventType.startsWith('NfcTag')) pills.push(activity.resourceName)

  return pills
}

export function assignedPrinterName(description: string | null, eventType: string): string | null {
  if (eventType === 'SpoolAssigned') return (description?.match(/^to\s+(.+)/i) ?? [])[1]?.trim() ?? null
  if (eventType === 'SpoolUnassigned') return (description?.match(/^from\s+(.+)/i) ?? [])[1]?.trim() ?? null
  return null
}

export function isPrintEvent(eventType: string): boolean {
  return PRINT_EVENTS.has(eventType)
}
