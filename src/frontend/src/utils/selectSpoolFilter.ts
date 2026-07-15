import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse, TrayMqttHint, TraySpoolSummary } from '@/types/printer'
import {
  buildAddSpoolFromTrayUrl,
  colorLabelFromHex,
  hexColorsAreClose,
  normalizeColorHex,
  resolveTrayColorLabel,
  trayMqttHintForSlot,
} from '@/utils/spoolTrayMatch'

/** PLA+ counts as PLA when matching spools to a tray. */
export function filterMaterial(material: string): string {
  const m = material.trim().toUpperCase().replace(/\s+/g, '')
  return m === 'PLA+' ? 'PLA' : material
}

/** Real color name from MQTT — not material repeated as color. */
export function distinctTrayColor(hint: { material: string | null; colorName: string | null }): string | null {
  if (!hint.colorName || !hint.material) return null
  const color = hint.colorName.trim().toLowerCase()
  const mat = filterMaterial(hint.material).trim().toLowerCase()
  if (color === mat || color === hint.material.trim().toLowerCase()) return null
  return hint.colorName
}

/** eSUN matches eSUN 3D, etc. */
export function brandsMatch(spoolBrand: string, hintBrand: string): boolean {
  const a = spoolBrand.trim().toLowerCase()
  const b = hintBrand.trim().toLowerCase()
  return a === b || a.includes(b) || b.includes(a)
}

export function selectTrayHintLabel(
  hint: TrayMqttHint,
  printerBrand: string | null | undefined,
  spools: SpoolResponse[],
  traySpool?: TraySpoolSummary | null,
): string {
  const mat = hint.material
  const color = resolveTrayColorLabel(hint, spools, traySpool)
  const brand = hint.brand ?? (color && printerBrand ? printerBrand : null)

  if (brand && color && mat) return `${brand} ${mat} ${color}`
  if (brand && mat) return `${brand} ${mat}`
  if (color && mat) return `${mat} ${color}`
  return mat ?? color ?? brand ?? ''
}

function hasReportedColor(hint: TrayMqttHint): boolean {
  return distinctTrayColor(hint) !== null || normalizeColorHex(hint.colorHex) !== null
}

function colorsMatchForSelect(spool: SpoolResponse, hint: TrayMqttHint): boolean {
  if (!hasReportedColor(hint)) return true

  const color = distinctTrayColor(hint)
  const hintHex = normalizeColorHex(hint.colorHex)
  const spoolHex = normalizeColorHex(spool.colorHex)

  if (hintHex && spoolHex) return hexColorsAreClose(hintHex, spoolHex)

  if (hintHex) {
    const derived = colorLabelFromHex(hint.colorHex)
    if (derived) {
      const derivedLo = derived.toLowerCase()
      const spoolLo = spool.colorName.toLowerCase()
      if (spoolLo.includes(derivedLo) || derivedLo.includes(spoolLo)) return true
    }
  }

  if (color) {
    const a = spool.colorName.toLowerCase()
    const b = color.toLowerCase()
    return a.includes(b) || b.includes(a)
  }

  return false
}

/** Material + brand; color when printer reports it. PLA+ tray includes PLA spools. */
export function spoolMatchesTrayForSelect(spool: SpoolResponse, hint: TrayMqttHint): boolean {
  if (!hint.material) return true
  if (filterMaterial(spool.material).toLowerCase() !== filterMaterial(hint.material).toLowerCase()) return false
  if (hint.brand && !brandsMatch(spool.brand, hint.brand)) return false
  if (!colorsMatchForSelect(spool, hint)) return false
  return true
}

export function trayContextForSlot(printer: PrinterResponse, amsSlot: number | null) {
  const trayHint = trayMqttHintForSlot(printer, amsSlot)
  const traySpool = amsSlot === 1 ? printer.tray1Spool
    : amsSlot === 2 ? printer.tray2Spool
    : amsSlot === 3 ? printer.tray3Spool
    : amsSlot === 4 ? printer.tray4Spool
    : printer.extraSpool
  const remainPct = amsSlot === 1 ? printer.tray1RemainPct
    : amsSlot === 2 ? printer.tray2RemainPct
    : amsSlot === 3 ? printer.tray3RemainPct
    : amsSlot === 4 ? printer.tray4RemainPct
    : printer.extraSpoolRemainPct

  return { trayHint, traySpool, remainPct }
}

export function buildSelectSpoolAddUrl(
  printer: PrinterResponse,
  amsSlot: number | null,
  spools: SpoolResponse[],
) {
  const { trayHint, remainPct } = trayContextForSlot(printer, amsSlot)
  if (!trayHint?.material) return null
  return buildAddSpoolFromTrayUrl({
    printerId: printer.id,
    amsSlot,
    hint: trayHint,
    remainPct,
    printerBrand: printer.brand,
  })
}

export function filterSpoolsForTraySelect(
  spools: SpoolResponse[],
  trayHint: TrayMqttHint | null,
  query: string,
): SpoolResponse[] {
  const available = spools.filter(s => !s.isActive)
  const base = trayHint?.material
    ? available.filter(s => spoolMatchesTrayForSelect(s, trayHint))
    : available
  const q = query.trim().toLowerCase()
  if (!q) return base
  return base.filter(s =>
    s.brand.toLowerCase().includes(q) ||
    s.material.toLowerCase().includes(q) ||
    s.colorName.toLowerCase().includes(q),
  )
}
