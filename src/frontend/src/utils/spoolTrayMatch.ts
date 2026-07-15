import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse, TrayMqttHint } from '@/types/printer'

export function normalizeColorHex(hex: string | null | undefined): string | null {
  if (!hex) return null
  const raw = hex.replace(/^#/, '').toLowerCase()
  return raw.length >= 6 ? raw.slice(0, 6) : null
}

type Rgb = { r: number; g: number; b: number }

/** Max RGB distance (~10 per channel) to treat filament hex values as the same color. */
export const HEX_COLOR_MATCH_DISTANCE = 42

function rgbFromHex(hex: string): Rgb | null {
  const n = normalizeColorHex(hex)
  if (!n) return null
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  }
}

function rgbDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/** True when two hex values are close enough for filament tray ↔ library matching. */
export function hexColorsAreClose(
  a: string | null | undefined,
  b: string | null | undefined,
  maxDistance = HEX_COLOR_MATCH_DISTANCE,
): boolean {
  const rgbA = a ? rgbFromHex(a) : null
  const rgbB = b ? rgbFromHex(b) : null
  if (!rgbA || !rgbB) return false
  return rgbDistance(rgbA, rgbB) <= maxDistance
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / d + 2) / 6
        break
      default:
        h = ((rn - gn) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s, l }
}

/** Generic color name from RGB — works for any hex, no hardcoded filament table. */
function colorLabelFromRgb(r: number, g: number, b: number): string {
  const { h, s, l } = rgbToHsl(r, g, b)

  if (s < 0.12) {
    if (l > 0.9) return 'White'
    if (l < 0.1) return 'Black'
    if (l > 0.72) return 'Silver'
    if (l < 0.28) return 'Dark Grey'
    return 'Grey'
  }

  if (s < 0.35 && l < 0.55 && (h < 55 || h > 320)) return 'Brown'

  let name: string
  if (h < 12 || h >= 348) name = 'Red'
  else if (h < 38) name = 'Orange'
  else if (h < 68) name = 'Yellow'
  else if (h < 155) name = 'Green'
  else if (h < 195) name = 'Cyan'
  else if (h < 250) name = 'Blue'
  else if (h < 285) name = 'Purple'
  else if (h < 330) name = 'Pink'
  else name = 'Red'

  if (l > 0.75 && s < 0.5) return `Light ${name}`
  if (l < 0.25) return `Dark ${name}`
  return name
}

/** Best-effort color name when MQTT only sent tray_color hex (no tray_id_name). */
export function colorLabelFromHex(hex: string | null | undefined): string | null {
  const rgb = hex ? rgbFromHex(hex) : null
  if (!rgb) return null
  return colorLabelFromRgb(rgb.r, rgb.g, rgb.b)
}

function nearestLibraryColorName(
  hintHex: string,
  spools: Array<{ colorName: string; colorHex: string }>,
): string | null {
  const hintRgb = rgbFromHex(hintHex)
  if (!hintRgb) return null

  let best: { name: string; dist: number } | null = null
  for (const spool of spools) {
    const hex = normalizeColorHex(spool.colorHex)
    const name = spool.colorName?.trim()
    if (!hex || !name) continue
    const rgb = rgbFromHex(hex)
    if (!rgb) continue
    const dist = rgbDistance(hintRgb, rgb)
    if (dist <= HEX_COLOR_MATCH_DISTANCE && (!best || dist < best.dist)) {
      best = { name, dist }
    }
  }
  return best?.name ?? null
}

/** Resolve display color — MQTT name, library hex match, then hex label. */
export function resolveTrayColorLabel(
  hint: TrayMqttHint,
  spools: Array<{ colorName: string; colorHex: string }> = [],
  traySpool?: { colorName: string } | null,
): string | null {
  const named = hint.colorName?.trim()
  if (named && hint.material) {
    const namedLo = named.toLowerCase()
    const matLo = hint.material.trim().toLowerCase()
    if (namedLo === matLo) return null
    if (namedLo.startsWith(matLo)) {
      const rest = named.slice(hint.material.trim().length).trim()
      if (rest) return rest
    }
    return named
  } else if (named) {
    return named
  }

  if (traySpool?.colorName) return traySpool.colorName

  // Hex fallback only when MQTT sent no usable color name
  const hintHex = normalizeColorHex(hint.colorHex)
  if (hintHex) {
    const exact = spools.find(s => normalizeColorHex(s.colorHex) === hintHex)
    if (exact?.colorName) return exact.colorName
    const nearest = nearestLibraryColorName(hintHex, spools)
    if (nearest) return nearest
    return colorLabelFromHex(hint.colorHex)
  }

  return null
}

/** Color name only when MQTT sent a real name, not the material repeated. */
export function distinctColorName(hint: TrayMqttHint): string | null {
  if (!hint.colorName || !hint.material) return null
  if (hint.colorName.toLowerCase() === hint.material.toLowerCase()) return null
  return hint.colorName
}

function hasColorConstraint(hint: TrayMqttHint): boolean {
  if (distinctColorName(hint)) return true
  return normalizeColorHex(hint.colorHex) !== null
}

export function hasTrayColorInfo(hint: TrayMqttHint): boolean {
  return hasColorConstraint(hint)
}

function colorsMatch(spool: SpoolResponse, hint: TrayMqttHint): boolean {
  const color = distinctColorName(hint)
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

  return true
}

function effectiveBrand(hint: TrayMqttHint, printerBrand?: string | null): string | null {
  if (hint.brand) return hint.brand
  if (distinctColorName(hint) && printerBrand) return printerBrand
  return null
}

/** Match spools to MQTT tray data — material always; brand/color when reported. */
export function spoolMatchesTrayHint(
  spool: SpoolResponse,
  hint: TrayMqttHint,
  printerBrand?: string | null,
): boolean {
  if (!hint.material) return false
  if (spool.material.toLowerCase() !== hint.material.toLowerCase()) return false

  if (hasColorConstraint(hint) && !colorsMatch(spool, hint)) return false

  const brand = effectiveBrand(hint, printerBrand)
  if (brand && spool.brand.toLowerCase() !== brand.toLowerCase()) return false

  return true
}

export function trayMqttHintForSlot(printer: PrinterResponse, amsSlot: number | null): TrayMqttHint | null {
  if (amsSlot === 1) return printer.tray1Mqtt
  if (amsSlot === 2) return printer.tray2Mqtt
  if (amsSlot === 3) return printer.tray3Mqtt
  if (amsSlot === 4) return printer.tray4Mqtt
  if (amsSlot == null) return printer.extraMqtt
  return null
}

/** Human label for MQTT tray — e.g. "PLA", "Bambu Lab PLA Jade White", "Polymaker PLA PolyLite". */
export function trayHintLabel(hint: TrayMqttHint, printerBrand?: string | null): string {
  const mat = hint.material
  const color = distinctColorName(hint) ?? resolveTrayColorLabel(hint)
  const brand = hint.brand ?? (color && printerBrand ? printerBrand : null)

  if (brand && color && mat) return `${brand} ${mat} ${color}`
  if (brand && mat) return `${brand} ${mat}`
  if (color && mat) return `${mat} ${color}`
  return mat ?? color ?? brand ?? ''
}

export function buildAddSpoolFromTrayUrl(opts: {
  printerId: string
  amsSlot: number | null
  hint: TrayMqttHint
  remainPct?: number | null
  printerBrand?: string
}): string {
  const params = new URLSearchParams({
    printerId: opts.printerId,
    place: 'printer',
    material: opts.hint.material ?? 'PLA',
  })
  const color = distinctColorName(opts.hint) ?? resolveTrayColorLabel(opts.hint)
  if (color) params.set('colorName', color)
  if (opts.hint.colorHex) params.set('colorHex', opts.hint.colorHex)
  if (opts.hint.brand) params.set('brand', opts.hint.brand)
  else if (color && opts.printerBrand) params.set('brand', opts.printerBrand)
  if (opts.amsSlot != null) params.set('amsSlot', String(opts.amsSlot))
  if (opts.remainPct != null && opts.remainPct >= 0) params.set('remainPct', String(opts.remainPct))
  return `/spools/add/manual?${params.toString()}`
}

export type PreviewTrayLike = {
  material: string | null
  colorName: string | null
  colorHex: string | null
  brand: string | null
  isBambuFilament: boolean
}

export function distinctPreviewColorName(slot: PreviewTrayLike): string | null {
  if (!slot.colorName || !slot.material) return null
  const color = slot.colorName.trim().toLowerCase()
  const mat = slot.material.trim().toLowerCase()
  const matNorm = slot.material.trim().toUpperCase().replace(/\s+/g, '')
  const matBase = matNorm === 'PLA+' ? 'pla' : mat
  if (color === mat || color === matBase || color === matNorm.toLowerCase()) return null
  return slot.colorName
}

/** Brand for add-printer MQTT preview — from MQTT sub_brand, tray_info_idx profile, or Bambu RFID only. */
export function effectivePreviewBrand(slot: PreviewTrayLike, printerBrand?: string | null): string | null {
  if (slot.brand) return slot.brand
  if (slot.isBambuFilament && printerBrand) return printerBrand
  return null
}

/** Human label for add-printer tray preview — e.g. "Bambu Lab PLA", "Polymaker PLA PolyLite". */
export function previewTrayLabel(slot: PreviewTrayLike, printerBrand?: string | null): string {
  const mat = slot.material
  const color = distinctPreviewColorName(slot) ?? colorLabelFromHex(slot.colorHex)
  const brand = effectivePreviewBrand(slot, printerBrand)
  if (brand && color && mat) return `${brand} ${mat} ${color}`
  if (brand && mat) return `${brand} ${mat}`
  if (color && mat) return `${mat} ${color}`
  return mat ?? color ?? brand ?? 'Filament'
}
