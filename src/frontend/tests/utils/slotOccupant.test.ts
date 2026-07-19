import { describe, it, expect } from 'vitest'
import { getSlotOccupant } from '@/utils/slotOccupant'
import type { PrinterResponse, TraySpoolSummary } from '@/types/printer'

const spool = (id: string, colorName: string): TraySpoolSummary => ({
  id,
  brand: 'Bambu',
  material: 'PLA',
  colorName,
  colorHex: '#fff',
})

const printer = (overrides: Partial<PrinterResponse> = {}): PrinterResponse => ({
  id: 'p1',
  name: 'X1C',
  brand: 'Bambu Lab',
  model: 'X1 Carbon',
  serialNumber: null,
  ipAddress: '192.168.1.1',
  port: null,
  protocol: 'mqtt_lan',
  hasAms: true,
  createdAt: '2026-01-01T00:00:00Z',
  tray1Spool: null,
  tray2Spool: null,
  tray3Spool: null,
  tray4Spool: null,
  extraSpool: null,
  tray1RemainPct: null,
  tray2RemainPct: null,
  tray3RemainPct: null,
  tray4RemainPct: null,
  tray1Occupied: false,
  tray2Occupied: false,
  tray3Occupied: false,
  tray4Occupied: false,
  extraSpoolOccupied: null,
  extraSpoolRemainPct: null,
  tray1Mqtt: null,
  tray2Mqtt: null,
  tray3Mqtt: null,
  tray4Mqtt: null,
  extraMqtt: null,
  ...overrides,
})

describe('getSlotOccupant', () => {
  it('returns tray occupant for AMS slot', () => {
    const white = spool('s2', 'White')
    const p = printer({ tray4Spool: white })
    expect(getSlotOccupant(p, 4)).toEqual(white)
  })

  it('returns extra spool when amsSlot is null', () => {
    const orange = spool('s3', 'Orange')
    const p = printer({ hasAms: false, extraSpool: orange })
    expect(getSlotOccupant(p, null)).toEqual(orange)
  })

  it('returns null when slot is empty', () => {
    expect(getSlotOccupant(printer(), 2)).toBeNull()
  })

  it('returns null when occupant is the excluded spool', () => {
    const black = spool('s1', 'Black')
    const p = printer({ tray1Spool: black })
    expect(getSlotOccupant(p, 1, 's1')).toBeNull()
  })

  it('returns other occupant when exclude id differs', () => {
    const white = spool('s2', 'White')
    const p = printer({ tray1Spool: white })
    expect(getSlotOccupant(p, 1, 's1')).toEqual(white)
  })
})
