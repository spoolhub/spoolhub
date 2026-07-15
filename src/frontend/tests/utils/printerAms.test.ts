import { describe, expect, it } from 'vitest'
import {
  countLoadedAmsTrays,
  isExtraTrayClickable,
  isExtraTrayLoaded,
  isTrayClickable,
  isTrayEmptyMqtt,
  isTrayLoaded,
  trayRemainPercent,
} from '@/utils/printerAms'
import type { SpoolResponse } from '@/types/spool'

const spool = (pct: number): SpoolResponse => ({
  id: 's1',
  brand: 'eSUN',
  material: 'PLA',
  colorName: 'White',
  colorHex: '#fff',
  initialWeightG: 1000,
  currentWeightG: pct * 10,
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
})

describe('printerAms', () => {
  it('detects MQTT-empty trays', () => {
    expect(isTrayEmptyMqtt(false)).toBe(true)
    expect(isTrayEmptyMqtt(true)).toBe(false)
    expect(isTrayEmptyMqtt(undefined)).toBe(false)
  })

  it('detects loaded trays from occupied bit or linked spool', () => {
    expect(isTrayLoaded(true, null)).toBe(true)
    expect(isTrayLoaded(undefined, spool(50))).toBe(true)
    expect(isTrayLoaded(false, null)).toBe(false)
  })

  it('disables clicks on MQTT-empty trays', () => {
    expect(isTrayClickable(false, null)).toBe(false)
    expect(isTrayClickable(true, null)).toBe(true)
  })

  it('computes remain percent from spool weight', () => {
    expect(trayRemainPercent(spool(75))).toBe(75)
    expect(trayRemainPercent(null)).toBeNull()
  })

  it('counts loaded AMS trays', () => {
    expect(countLoadedAmsTrays([true, false, undefined, true], [null, null, null, null])).toBe(2)
  })

  it('handles extra spool MQTT states', () => {
    expect(isExtraTrayLoaded(false, null)).toBe(false)
    expect(isExtraTrayLoaded(null, spool(100))).toBe(true)
    expect(isExtraTrayClickable(null, null)).toBe(true)
    expect(isExtraTrayClickable(false, null)).toBe(false)
  })
})
