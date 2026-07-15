import { describe, expect, it } from 'vitest'
import {
  colorLabelFromHex,
  effectivePreviewBrand,
  previewTrayLabel,
  resolveTrayColorLabel,
  spoolMatchesTrayHint,
  trayHintLabel,
  buildAddSpoolFromTrayUrl,
} from '@/utils/spoolTrayMatch'
import type { SpoolResponse } from '@/types/spool'

const baseSpool: SpoolResponse = {
  id: 's1',
  brand: 'Bambu Lab',
  material: 'PLA',
  colorName: 'Jade White',
  colorHex: '#FFFFFF',
  initialWeightG: 1000,
  currentWeightG: 800,
  spoolWeightG: 250,
  lowStockThresholdG: 120,
  isActive: false,
  isArchived: false,
  createdAt: '2024-01-01',
  lastScannedAt: null,
  notes: null,
  density: null,
  diameterTolerance: null,
  extruderMin: null,
  extruderMax: null,
  bedMin: null,
  bedMax: null,
  hasNfcTag: false,
  nfcTagUid: null,
  printerId: null,
  printerName: null,
  amsSlot: null,
  price: null,
  stockLocation: null,
}

describe('spoolTrayMatch', () => {
  it('matches by color hex when MQTT has no color name', () => {
    expect(spoolMatchesTrayHint(baseSpool, {
      material: 'PLA',
      colorName: null,
      colorHex: '#FFFFFF',
      brand: null,
    })).toBe(true)
    expect(spoolMatchesTrayHint({ ...baseSpool, colorHex: '#0000FF' }, {
      material: 'PLA',
      colorName: null,
      colorHex: '#FFFFFF',
      brand: null,
    })).toBe(false)
  })

  it('matches spool by material only when MQTT has no color', () => {
    expect(spoolMatchesTrayHint(baseSpool, {
      material: 'PLA',
      colorName: null,
      colorHex: null,
      brand: null,
    })).toBe(true)
    expect(spoolMatchesTrayHint({ ...baseSpool, material: 'ABS' }, {
      material: 'PLA',
      colorName: null,
      colorHex: null,
      brand: null,
    })).toBe(false)
  })

  it('matches material, color, and printer brand for Bambu trays', () => {
    expect(spoolMatchesTrayHint(baseSpool, {
      material: 'PLA',
      colorName: 'Jade White',
      colorHex: '#FFFFFF',
      brand: null,
    }, 'Bambu Lab')).toBe(true)
    expect(spoolMatchesTrayHint({ ...baseSpool, brand: 'Polymaker' }, {
      material: 'PLA',
      colorName: 'Jade White',
      colorHex: '#FFFFFF',
      brand: null,
    }, 'Bambu Lab')).toBe(false)
  })

  it('matches third-party brand when MQTT reports brand', () => {
    expect(spoolMatchesTrayHint({ ...baseSpool, brand: 'Polymaker', colorName: 'PolyLite White' }, {
      material: 'PLA',
      colorName: 'PolyLite',
      colorHex: '#FFFFFF',
      brand: 'Polymaker',
    })).toBe(true)
  })

  it('rejects different material', () => {
    expect(spoolMatchesTrayHint(baseSpool, {
      material: 'PETG',
      colorName: 'White',
      colorHex: '#FFFFFF',
      brand: null,
    })).toBe(false)
  })

  it('builds add spool url with printer and slot', () => {
    const url = buildAddSpoolFromTrayUrl({
      printerId: 'p1',
      amsSlot: 2,
      hint: { material: 'PLA', colorName: 'Jade White', colorHex: '#FFFFFF', brand: null },
      remainPct: 80,
      printerBrand: 'Bambu Lab',
    })
    expect(url).toContain('/spools/add/manual?')
    expect(url).toContain('printerId=p1')
    expect(url).toContain('amsSlot=2')
    expect(url).toContain('material=PLA')
    expect(url).toContain('remainPct=80')
  })

  it('preview tray label shows brand from MQTT without inferring printer brand', () => {
    const slot = {
      material: 'PLA',
      colorName: null,
      colorHex: '#FFFFFF',
      brand: 'eSUN',
      isBambuFilament: false,
    }
    expect(effectivePreviewBrand(slot, 'Bambu Lab')).toBe('eSUN')
    expect(previewTrayLabel(slot, 'Bambu Lab')).toBe('eSUN PLA White')
    expect(previewTrayLabel({ ...slot, brand: 'Polymaker', colorName: 'PolyLite' }, 'Bambu Lab'))
      .toBe('Polymaker PLA PolyLite')
  })

  it('derives color name from tray hex when MQTT has no color name', () => {
    expect(colorLabelFromHex('#FF0000')).toBe('Red')
    expect(colorLabelFromHex('000000FF')).toBe('Black')
    expect(colorLabelFromHex('#E60012')).toBe('Red')
    expect(colorLabelFromHex('#A855F7')).toBe('Purple')
    expect(colorLabelFromHex('#FF8800')).toBe('Orange')
    expect(resolveTrayColorLabel({
      material: 'PLA+',
      colorName: null,
      colorHex: '#FF0000',
      brand: 'eSUN',
    })).toBe('Red')
    expect(trayHintLabel({
      material: 'PLA+',
      colorName: null,
      colorHex: '#FF0000',
      brand: 'eSUN',
    })).toBe('eSUN PLA+ Red')
  })

  it('uses nearest library spool color name for close hex values', () => {
    const spools = [
      { colorName: 'Crimson', colorHex: '#D40000' },
      { colorName: 'Jade White', colorHex: '#FEFEFF' },
    ]
    expect(resolveTrayColorLabel({
      material: 'PLA',
      colorName: null,
      colorHex: '#E60012',
      brand: null,
    }, spools)).toBe('Crimson')
    expect(spoolMatchesTrayHint(
      { ...baseSpool, colorHex: '#D40000', colorName: 'Crimson' },
      { material: 'PLA', colorName: null, colorHex: '#E60012', brand: null },
    )).toBe(true)
  })

  it('formats tray hint label without duplicate material', () => {
    expect(trayHintLabel({ material: 'PLA', colorName: 'PLA', colorHex: '#FFFFFF', brand: null }, 'Bambu Lab'))
      .toBe('PLA')
    expect(trayHintLabel({ material: 'PLA', colorName: 'Jade White', colorHex: '#FFFFFF', brand: null }, 'Bambu Lab'))
      .toBe('Bambu Lab PLA Jade White')
    expect(trayHintLabel({ material: 'PLA', colorName: 'PolyLite', colorHex: '#FFFFFF', brand: 'Polymaker' }))
      .toBe('Polymaker PLA PolyLite')
  })
})
