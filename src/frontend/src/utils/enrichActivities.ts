import { spoolsApi } from '@/api/spools'
import { printJobsApi } from '@/api/printJobs'
import { printersApi } from '@/api/printers'
import type { Activity, ActivitySnapshot, LoadedSpoolSnapshot } from '@/types/activity'
import type { PrintJobResponse } from '@/types/printJob'
import type { PrinterResponse, TraySpoolSummary } from '@/types/printer'

const NFC_EVENTS = new Set(['NfcTagRegistered', 'NfcTagRemoved'])
const SPOOL_EVENTS = new Set([
  'SpoolCreated', 'SpoolActivated', 'SpoolDeactivated', 'SpoolUpdated',
  'SpoolDeleted', 'SpoolScanned', 'SpoolAssigned', 'SpoolUnassigned',
])
export const PRINT_EVENTS = new Set([
  'PrintStarted', 'PrintPaused', 'PrintResumed',
  'PrintCompleted', 'PrintFailed', 'PrintCancelled',
])

type SpoolSnapshot = {
  brand: string
  colorName: string
  colorHex: string
  material: string
  stockLocation?: string
}

export type SpoolCache = Map<string, SpoolSnapshot>

function needsEnrich(a: Activity): boolean {
  if (!a.resourceId) return false
  if (NFC_EVENTS.has(a.eventType) && !a.snapshot) return true
  if (SPOOL_EVENTS.has(a.eventType) && a.snapshot && !a.snapshot.stockLocation) return true
  return false
}

function needsPrintEnrich(a: Activity): boolean {
  return PRINT_EVENTS.has(a.eventType)
    && !!a.resourceId
    && (!a.snapshot?.loadedSpools || a.snapshot.loadedSpools.length === 0)
}

function trayToLoaded(
  tray: TraySpoolSummary | null,
  slot: number,
  activeSpoolId: string | null | undefined,
): LoadedSpoolSnapshot | null {
  if (!tray) return null
  return {
    slot,
    brand: tray.brand,
    colorName: tray.colorName,
    colorHex: tray.colorHex,
    material: tray.material,
    isActive: activeSpoolId != null && tray.id === activeSpoolId,
  }
}

function printerToLoadedSpools(printer: PrinterResponse, activeSpoolId?: string | null): LoadedSpoolSnapshot[] {
  if (printer.hasAms) {
    return [
      trayToLoaded(printer.tray1Spool, 0, activeSpoolId),
      trayToLoaded(printer.tray2Spool, 1, activeSpoolId),
      trayToLoaded(printer.tray3Spool, 2, activeSpoolId),
      trayToLoaded(printer.tray4Spool, 3, activeSpoolId),
    ].filter((s): s is LoadedSpoolSnapshot => s != null)
  }
  const extra = trayToLoaded(printer.extraSpool, 0, activeSpoolId)
  return extra ? [extra] : []
}

function applyPrinterToSnapshot(
  snap: ActivitySnapshot | null | undefined,
  printer: PrinterResponse,
  activeSpoolId?: string | null,
): ActivitySnapshot {
  const loaded = snap?.loadedSpools?.length
    ? snap.loadedSpools
    : printerToLoadedSpools(printer, activeSpoolId)
  const active = loaded.find(s => s.isActive) ?? loaded[0]
  return {
    ...(snap ?? {}),
    hasAms: snap?.hasAms ?? printer.hasAms,
    loadedSpools: loaded.length > 0 ? loaded : undefined,
    brand:         snap?.brand     ?? active?.brand,
    colorName:     snap?.colorName ?? active?.colorName,
    colorHex:      snap?.colorHex  ?? active?.colorHex,
    material:      snap?.material  ?? active?.material,
    weight:        snap?.weight    ?? active?.weight,
    printerName:   snap?.printerName ?? printer.name,
  }
}

function applyJobToSnapshot(a: Activity, job: PrintJobResponse, printer?: PrinterResponse): Activity {
  const remainingMins = job.estimatedFinishTime ?? undefined
  const base: ActivitySnapshot = {
    ...(a.snapshot ?? {}),
    brand:         job.spoolBrand     ?? a.snapshot?.brand,
    colorName:     job.spoolColorName ?? a.snapshot?.colorName,
    colorHex:      job.spoolColorHex  ?? a.snapshot?.colorHex,
    material:      job.spoolMaterial  ?? a.snapshot?.material,
    estimatedMins: remainingMins      ?? a.snapshot?.estimatedMins,
    printFileName: job.printFileName  ?? a.snapshot?.printFileName,
    gramsUsed:     job.gramsUsed      ?? a.snapshot?.gramsUsed,
    printerName:   job.printerName    ?? a.snapshot?.printerName,
  }
  return {
    ...a,
    snapshot: printer && !a.snapshot?.loadedSpools?.length
      ? applyPrinterToSnapshot(base, printer, job.spoolId)
      : base,
  }
}

export async function enrichActivities(
  activities: Activity[],
  spoolCache?: SpoolCache,
): Promise<Activity[]> {
  const toEnrich    = activities.filter(needsEnrich)
  const printEvts   = activities.filter(a => PRINT_EVENTS.has(a.eventType) && a.snapshot?.printJobId)
  const printLoad   = activities.filter(needsPrintEnrich)
  if (toEnrich.length === 0 && printEvts.length === 0 && printLoad.length === 0) return activities

  const spoolIds = [...new Set(toEnrich.map(a => a.resourceId!))]
  const jobIds   = [...new Set(printEvts.map(a => a.snapshot!.printJobId!))]
  const printerIds = [...new Set(
    activities
      .filter(a => PRINT_EVENTS.has(a.eventType) && a.resourceId && needsPrintEnrich(a))
      .map(a => a.resourceId!),
  )]
  const spoolById: SpoolCache = new Map(spoolCache ?? [])
  const jobById = new Map<string, PrintJobResponse>()
  const printerById = new Map<string, PrinterResponse>()

  await Promise.all([
    ...spoolIds.filter(id => !spoolById.has(id)).map(async id => {
      try {
        const s = await spoolsApi.getById(id)
        spoolById.set(id, {
          brand: s.brand,
          colorName: s.colorName,
          colorHex: s.colorHex,
          material: s.material,
          stockLocation: s.stockLocation ?? undefined,
        })
      } catch { /* deleted or not found */ }
    }),
    ...jobIds.map(async id => {
      try { jobById.set(id, await printJobsApi.getById(id)) } catch { /* not found */ }
    }),
    ...printerIds.filter(id => !printerById.has(id)).map(async id => {
      try { printerById.set(id, await printersApi.getById(id)) } catch { /* not found */ }
    }),
  ])

  return activities.map(a => {
    if (PRINT_EVENTS.has(a.eventType) && a.snapshot?.printJobId) {
      const job = jobById.get(a.snapshot.printJobId)
      if (job) {
        const printer = a.resourceId ? printerById.get(a.resourceId) : undefined
        return applyJobToSnapshot(a, job, printer)
      }
    }
    if (needsPrintEnrich(a) && a.resourceId) {
      const printer = printerById.get(a.resourceId)
      if (printer) {
        return { ...a, snapshot: applyPrinterToSnapshot(a.snapshot, printer, a.snapshot?.printJobId ? jobById.get(a.snapshot.printJobId)?.spoolId : undefined) }
      }
    }
    if (!a.resourceId) return a
    const s = spoolById.get(a.resourceId)
    if (!s) return a
    if (NFC_EVENTS.has(a.eventType) && !a.snapshot) return { ...a, snapshot: s }
    if (SPOOL_EVENTS.has(a.eventType) && a.snapshot && !a.snapshot.stockLocation && s.stockLocation) {
      return { ...a, snapshot: { ...a.snapshot, stockLocation: s.stockLocation } }
    }
    return a
  })
}
