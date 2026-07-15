import { describe, expect, it } from 'vitest'
import {
  brandsMatch,
  buildSelectSpoolAddUrl,
  filterMaterial,
  filterSpoolsForTraySelect,
  spoolMatchesTrayForSelect,
  trayContextForSlot,
} from '@/utils/selectSpoolFilter'
import type { PrinterResponse } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'

const baseSpool = (overrides: Partial<SpoolResponse> = {}): SpoolResponse => ({
  id: 's1',
  brand: 'eSUN 3D',
  material: 'PLA',
  colorName: 'White',
  colorHex: '#FFFFFF',
  initialWeightG: 1000,
  currentWeightG: 1000,
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
  ...overrides,
})

const basePrinter: PrinterResponse = {
  id: 'p1',
  name: 'X1C',
  brand: 'Bambu Lab',
  model: 'X1 Carbon',
  serialNumber: null,
  ipAddress: '10.0.0.1',
  port: null,
  protocol: 'mqtt_lan',
  hasAms: true,
  createdAt: '2026-01-01T00:00:00Z',
  tray1Spool: null,
  tray2Spool: null,
  tray3Spool: null,
  tray4Spool: null,
  extraSpool: null,
  tray1RemainPct: 80,
  tray2RemainPct: null,
  tray3RemainPct: null,
  tray4RemainPct: null,
  tray1Occupied: true,
  tray2Occupied: false,
  tray3Occupied: false,
  tray4Occupied: false,
  extraSpoolOccupied: null,
  extraSpoolRemainPct: null,
  tray1Mqtt: { material: 'PLA+', colorName: 'Matte White', colorHex: '#FFFFFF', brand: 'eSUN' },
  tray2Mqtt: null,
  tray3Mqtt: null,
  tray4Mqtt: { material: 'PLA+', colorName: null, colorHex: '#000000', brand: 'eSUN' },
  extraMqtt: null,
}

describe('selectSpoolFilter', () => {
  it('normalizes PLA+ to PLA for material matching', () => {
    expect(filterMaterial('PLA+')).toBe('PLA')
    expect(filterMaterial('PETG')).toBe('PETG')
  })

  it('matches fuzzy brands', () => {
    expect(brandsMatch('eSUN 3D', 'eSUN')).toBe(true)
    expect(brandsMatch('Polymaker', 'eSUN')).toBe(false)
  })

  it('matches PLA spool to PLA+ tray with brand and color', () => {
    const hint = basePrinter.tray1Mqtt!
    expect(spoolMatchesTrayForSelect(baseSpool(), hint)).toBe(true)
    expect(spoolMatchesTrayForSelect(baseSpool({ brand: 'Polymaker' }), hint)).toBe(false)
    expect(spoolMatchesTrayForSelect(baseSpool({ material: 'ABS' }), hint)).toBe(false)
  })

  it('excludes active spools from tray select list', () => {
    const spools = [
      baseSpool({ id: 'a', isActive: true }),
      baseSpool({ id: 'b', isActive: false }),
    ]
    const filtered = filterSpoolsForTraySelect(spools, basePrinter.tray1Mqtt, '')
    expect(filtered.map(s => s.id)).toEqual(['b'])
  })

  it('resolves tray context for AMS slot', () => {
    const ctx = trayContextForSlot(basePrinter, 1)
    expect(ctx.trayHint?.material).toBe('PLA+')
    expect(ctx.remainPct).toBe(80)
  })

  it('builds add-spool URL from tray MQTT hint', () => {
    const url = buildSelectSpoolAddUrl(basePrinter, 1)
    expect(url).toContain('/spools/add/manual?')
    expect(url).toContain('printerId=p1')
    expect(url).toContain('amsSlot=1')
    expect(url).toContain('material=PLA%2B')
  })
})
