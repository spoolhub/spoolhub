import { describe, it, expect } from 'vitest'
import {
  getPrinterStatusClass,
  getPrinterStatusLabel,
  isPrinterOffline,
  isPrinterOnline,
} from '@/utils/printerStatus'
import type { PrinterStatus } from '@/types/printer'

const onlineStatus: PrinterStatus = {
  gcodeState: 'IDLE',
  progressPercent: 0,
  remainingMinutes: 0,
  subtaskName: null,
  layerNum: 0,
  totalLayerNum: 0,
  nozzleTempC: 25,
  bedTempC: 25,
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('printerStatus', () => {
  it('MQTT printer with no status is offline', () => {
    expect(isPrinterOffline(null, 'mqtt_lan')).toBe(true)
    expect(getPrinterStatusLabel(null, 'mqtt_lan')).toBe('Offline')
    expect(getPrinterStatusClass(null, 'mqtt_lan')).toBe('offline')
  })

  it('MQTT printer with connection error is offline', () => {
    const status = { ...onlineStatus, connectionError: 'Wrong access code' }
    expect(isPrinterOffline(status, 'mqtt_cloud')).toBe(true)
    expect(getPrinterStatusLabel(status, 'mqtt_cloud')).toBe('Offline')
  })

  it('MQTT printer with live status is online when idle', () => {
    expect(isPrinterOnline(onlineStatus, 'mqtt_lan')).toBe(true)
    expect(getPrinterStatusLabel(onlineStatus, 'mqtt_lan')).toBe('Online')
    expect(getPrinterStatusClass(onlineStatus, 'mqtt_lan')).toBe('online')
  })

  it('MQTT printer shows printing state when running', () => {
    const status = { ...onlineStatus, gcodeState: 'RUNNING' }
    expect(getPrinterStatusLabel(status, 'mqtt_lan')).toBe('Printing')
    expect(getPrinterStatusClass(status, 'mqtt_lan')).toBe('printing')
  })

  it('non-MQTT printer without status stays idle', () => {
    expect(getPrinterStatusLabel(null, 'marlin_serial')).toBe('Idle')
    expect(getPrinterStatusClass(null, 'marlin_serial')).toBe('idle')
    expect(isPrinterOnline(null, 'marlin_serial')).toBe(true)
  })
})
