import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrinterDrawer from '@/components/PrinterDrawer'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'
import type { PrintJobResponse } from '@/types/printJob'

vi.mock('@/api/printers', () => ({
  printersApi: {
    remove: vi.fn(),
    assignTraySpool: vi.fn(),
    assignExtraSpool: vi.fn(),
  },
}))

vi.mock('@/api/printJobs', () => ({
  printJobsApi: { getByPrinter: vi.fn() },
}))

import { printersApi } from '@/api/printers'
import { printJobsApi } from '@/api/printJobs'

const basePrinter: PrinterResponse = {
  id: 'p1',
  name: 'Garage X1C',
  brand: 'Bambu Lab',
  model: 'X1 Carbon',
  serialNumber: null,
  ipAddress: '192.168.1.100',
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
  tray1Mqtt: null, tray2Mqtt: null, tray3Mqtt: null, tray4Mqtt: null, extraMqtt: null,
}

import type { SpoolResponse } from '@/types/spool'

const inactiveSpool: SpoolResponse = {
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
  nfcTagUids: [],
  printerId: null,
  printerName: null,
  amsSlot: null,
  price: null,
  stockLocation: null,
}

const printerLoadedSlot1: PrinterResponse = {
  ...basePrinter,
  tray1Occupied: true,
  tray1Mqtt: { material: 'PLA+', colorName: 'White', colorHex: '#FFFFFF', brand: 'eSUN' },
}

function renderDrawer(overrides: Partial<Parameters<typeof PrinterDrawer>[0]> = {}) {
  const onClose = vi.fn()
  render(
    <MemoryRouter>
      <PrinterDrawer printer={basePrinter} spools={[]} onClose={onClose} {...overrides} />
    </MemoryRouter>
  )
  return { onClose }
}

describe('PrinterDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(printJobsApi.getByPrinter).mockResolvedValue([])
  })

  it('shows printer name, brand and model', async () => {
    renderDrawer()
    expect(screen.getByText('Garage X1C')).toBeInTheDocument()
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('X1 Carbon')).toBeInTheDocument()
  })

  it('shows no progress bar when idle', () => {
    renderDrawer()
    expect(screen.queryByText('Test_file')).not.toBeInTheDocument()
  })

  it('shows progress bar with job name and percent when printing', () => {
    const status: PrinterStatus = { gcodeState: 'RUNNING', progressPercent: 54, remainingMinutes: 38, subtaskName: 'Test_file', layerNum: 33, totalLayerNum: 62, nozzleTempC: 220, bedTempC: 55, updatedAt: '2026-01-01T00:00:00Z' }
    renderDrawer({ status })
    expect(screen.getByText('Test_file')).toBeInTheDocument()
    expect(screen.getAllByText('54%').length).toBeGreaterThan(0)
  })

  it('shows the status pill without percent when paused', () => {
    const status: PrinterStatus = { gcodeState: 'PAUSE', progressPercent: 37, remainingMinutes: 20, subtaskName: 'Test_file', layerNum: 10, totalLayerNum: 62, nozzleTempC: 0, bedTempC: 0, updatedAt: '2026-01-01T00:00:00Z' }
    renderDrawer({ status })
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.getByText('Test_file')).toBeInTheDocument()
  })

  it('shows the brand logo next to the brand name', () => {
    renderDrawer()
    expect(screen.getByAltText('Bambu Lab')).toBeInTheDocument()
  })

  it('shows AMS section with 4 empty slots', () => {
    renderDrawer()
    expect(screen.getAllByText('Empty').length).toBe(4)
  })

  it('shows temperatures from status', () => {
    const status: PrinterStatus = { gcodeState: 'RUNNING', progressPercent: 10, remainingMinutes: 5, subtaskName: null, layerNum: 1, totalLayerNum: 10, nozzleTempC: 220, bedTempC: 55, updatedAt: '2026-01-01T00:00:00Z' }
    renderDrawer({ status })
    expect(screen.getByText('220°C')).toBeInTheDocument()
    expect(screen.getByText('55°C')).toBeInTheDocument()
  })

  it('loads and shows recent jobs', async () => {
    const job: PrintJobResponse = { id: 'j1', printerId: 'p1', printerName: null, spoolId: null, spoolBrand: null, spoolColorName: null, spoolColorHex: null, spoolMaterial: null, printFileName: 'My_print_v3', taskId: null, status: 'finished', gramsUsed: 15, filamentDeducted: true, startedAt: '2026-01-01T10:00:00Z', finishedAt: '2026-01-01T11:00:00Z', estimatedFinishTime: null, source: 'mqtt', notes: null, filaments: [] }
    vi.mocked(printJobsApi.getByPrinter).mockResolvedValue([job])
    renderDrawer()
    await waitFor(() => expect(screen.getByText('My_print_v3')).toBeInTheDocument())
  })

  it('calls onClose when close button is clicked', () => {
    const { onClose } = renderDrawer()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('disconnects the printer after confirming', async () => {
    vi.mocked(printersApi.remove).mockResolvedValue(undefined)
    const onDisconnected = vi.fn()
    const { onClose } = renderDrawer({ onDisconnected })
    fireEvent.click(screen.getByText('Disconnect'))
    fireEvent.click(screen.getByText('Yes, disconnect'))
    await waitFor(() => expect(printersApi.remove).toHaveBeenCalledWith('p1'))
    expect(onDisconnected).toHaveBeenCalledWith('p1')
    expect(onClose).toHaveBeenCalled()
  })

  it('opens shared select panel and assigns spool to loaded tray', async () => {
    vi.mocked(printersApi.assignTraySpool).mockResolvedValue(printerLoadedSlot1)
    const onTrayAssigned = vi.fn()
    renderDrawer({
      printer: printerLoadedSlot1,
      spools: [inactiveSpool],
      onTrayAssigned,
    })
    fireEvent.click(screen.getByText('Loaded'))
    expect(screen.getByText('Select a Spool — Slot 1')).toBeInTheDocument()
    expect(screen.getByText('White')).toBeInTheDocument()
    fireEvent.click(screen.getByText('White'))
    await waitFor(() => expect(printersApi.assignTraySpool).toHaveBeenCalledWith('p1', 1, 's1', undefined))
    expect(onTrayAssigned).toHaveBeenCalled()
  })
})
