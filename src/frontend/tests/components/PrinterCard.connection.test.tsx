import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import PrinterCard from '@/components/PrinterCard'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'

const mqttPrinter: PrinterResponse = {
  id: 'printer-1',
  name: 'My A1',
  brand: 'Bambu Lab',
  model: 'A1',
  serialNumber: null,
  ipAddress: '192.168.1.100',
  port: null,
  protocol: 'mqtt_cloud',
  hasAms: false,
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
  tray1Mqtt: null, tray2Mqtt: null, tray3Mqtt: null, tray4Mqtt: null, extraMqtt: null,
}

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

describe('PrinterCard connection status', () => {
  it('shows Offline when MQTT printer has no status', () => {
    render(<PrinterCard printer={mqttPrinter} spools={[]} />, { wrapper: MemoryRouter })
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows Online when MQTT printer is connected', () => {
    render(<PrinterCard printer={mqttPrinter} spools={[]} status={onlineStatus} />, { wrapper: MemoryRouter })
    expect(screen.getByText('Online')).toBeInTheDocument()
  })
})
