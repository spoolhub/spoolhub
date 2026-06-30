import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrinterDetailPage from '@/pages/PrinterDetailPage'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'
import type { PrintJobResponse } from '@/types/printJob'

vi.mock('@/api/printers', () => ({
  printersApi: {
    getById:    vi.fn(),
    getStatus:  vi.fn(),
    mockStatus: vi.fn(),
    update:     vi.fn(),
    remove:     vi.fn(),
  },
}))

vi.mock('@/api/spools', () => ({
  spoolsApi: { getAll: vi.fn() },
}))

vi.mock('@/api/printJobs', () => ({
  printJobsApi: { getByPrinter: vi.fn() },
}))

import { printersApi } from '@/api/printers'
import { spoolsApi } from '@/api/spools'
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
}

function renderPage(id = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/printers/${id}`]}>
      <Routes>
        <Route path="/printers/:id" element={<PrinterDetailPage />} />
        <Route path="/printers" element={<div>Printers list</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PrinterDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(spoolsApi.getAll).mockResolvedValue([])
    vi.mocked(printJobsApi.getByPrinter).mockResolvedValue([])
    vi.mocked(printersApi.getStatus).mockResolvedValue(null)
    vi.mocked(printersApi.mockStatus).mockResolvedValue(undefined as never)
  })

  it('shows loading skeleton initially', () => {
    vi.mocked(printersApi.getById).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('shows printer name after load', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    renderPage()
    await waitFor(() => expect(screen.getByText('Garage X1C')).toBeInTheDocument())
  })

  it('shows brand and model spec boxes', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    renderPage()
    await waitFor(() => screen.getByText('Garage X1C'))
    expect(screen.getAllByText('Bambu Lab').length).toBeGreaterThan(0)
    expect(screen.getAllByText('X1 Carbon').length).toBeGreaterThan(0)
  })

  it('shows IP address in details', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    renderPage()
    await waitFor(() => expect(screen.getByText('192.168.1.100')).toBeInTheDocument())
  })

  it('shows AMS badge when hasAms is true', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    renderPage()
    await waitFor(() => expect(screen.getAllByText('AMS').length).toBeGreaterThan(0))
  })

  it('shows not-found when API returns 404', async () => {
    vi.mocked(printersApi.getById).mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => expect(screen.getByText('Printer not found.')).toBeInTheDocument())
  })

  it('shows AMS accordion for printer with AMS', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    renderPage()
    await waitFor(() => expect(screen.getByText('0/4 loaded')).toBeInTheDocument())
  })

  it('shows Spool accordion for non-AMS printer', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue({ ...basePrinter, hasAms: false })
    renderPage()
    await waitFor(() => expect(screen.getByText('Spool')).toBeInTheDocument())
  })

  it('shows Print History accordion', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    renderPage()
    await waitFor(() => expect(screen.getByText('Print History')).toBeInTheDocument())
  })

  it('shows job count in Print History header', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    renderPage()
    await waitFor(() => expect(screen.getByText('0 jobs')).toBeInTheDocument())
  })

  it('AMS accordion is open by default', async () => {
    const spool = { id: 's1', brand: 'Bambu Lab', material: 'PLA', colorName: 'Jade White', colorHex: '#fff', initialWeightG: 1000, currentWeightG: 800, spoolWeightG: 200, lowStockThresholdG: 100, isActive: true, isArchived: false, createdAt: '2026-01-01T00:00:00Z', lastScannedAt: null, notes: null, density: null, extruderMin: null, extruderMax: null, bedMin: null, bedMax: null, hasNfcTag: false, nfcTagUid: null, printerId: 'p1', amsSlot: 1, printerName: null }
    vi.mocked(printersApi.getById).mockResolvedValue({ ...basePrinter, tray1Spool: { id: 's1', brand: 'Bambu Lab', material: 'PLA', colorName: 'Jade White', colorHex: '#fff' } })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([spool])
    renderPage()
    await waitFor(() => expect(screen.getByText('Jade White')).toBeInTheDocument())
  })

  it('opening Print History closes AMS', async () => {
    const spool = { id: 's1', brand: 'Bambu Lab', material: 'PLA', colorName: 'Jade White', colorHex: '#fff', initialWeightG: 1000, currentWeightG: 800, spoolWeightG: 200, lowStockThresholdG: 100, isActive: true, isArchived: false, createdAt: '2026-01-01T00:00:00Z', lastScannedAt: null, notes: null, density: null, extruderMin: null, extruderMax: null, bedMin: null, bedMax: null, hasNfcTag: false, nfcTagUid: null, printerId: 'p1', amsSlot: 1, printerName: null }
    vi.mocked(printersApi.getById).mockResolvedValue({ ...basePrinter, tray1Spool: { id: 's1', brand: 'Bambu Lab', material: 'PLA', colorName: 'Jade White', colorHex: '#fff' } })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([spool])
    renderPage()
    await waitFor(() => expect(screen.getByText('Jade White')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Print History').closest('button')!)
    await waitFor(() => expect(screen.queryByText('Jade White')).not.toBeInTheDocument())
  })

  it('Print History expands and shows job file name', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    const job: PrintJobResponse = { id: 'j1', printerId: 'p1', spoolId: null, spoolColorName: null, spoolColorHex: null, spoolMaterial: null, printFileName: 'My_print_v3', status: 'finished', gramsUsed: 15, startedAt: '2026-01-01T10:00:00Z', finishedAt: '2026-01-01T11:00:00Z', source: 'mqtt', notes: null, filaments: [] }
    vi.mocked(printJobsApi.getByPrinter).mockResolvedValue([job])
    renderPage()
    await waitFor(() => screen.getByText('1 job'))
    fireEvent.click(screen.getByText('Print History').closest('button')!)
    await waitFor(() => expect(screen.getByText('My_print_v3')).toBeInTheDocument())
  })

  it('Print History single-spool job shows linked pill', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    const job: PrintJobResponse = { id: 'j1', printerId: 'p1', spoolId: 's1', spoolColorName: 'Jade White', spoolColorHex: '#fff', spoolMaterial: 'PLA', printFileName: 'Test_print', status: 'finished', gramsUsed: 10, startedAt: '2026-01-01T10:00:00Z', finishedAt: '2026-01-01T11:00:00Z', source: 'mqtt', notes: null, filaments: [] }
    vi.mocked(printJobsApi.getByPrinter).mockResolvedValue([job])
    renderPage()
    await waitFor(() => screen.getByText('1 job'))
    fireEvent.click(screen.getByText('Print History').closest('button')!)
    await waitFor(() => {
      const links = screen.getAllByRole('link')
      expect(links.some(l => l.getAttribute('href') === '/spools/s1')).toBe(true)
    })
  })

  it('Print History multi-color job shows linked pills per filament', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    const job: PrintJobResponse = { id: 'j1', printerId: 'p1', spoolId: null, spoolColorName: null, spoolColorHex: null, spoolMaterial: null, printFileName: 'Multicolor_print', status: 'finished', gramsUsed: 30, startedAt: '2026-01-01T10:00:00Z', finishedAt: '2026-01-01T11:00:00Z', source: 'mqtt', notes: null, filaments: [
      { id: 'f1', spoolId: 'sa', colorName: 'Red', colorHex: '#f00', material: 'PLA', gramsUsed: 15, slotIndex: 0 },
      { id: 'f2', spoolId: 'sb', colorName: 'Blue', colorHex: '#00f', material: 'PLA', gramsUsed: 15, slotIndex: 1 },
    ]}
    vi.mocked(printJobsApi.getByPrinter).mockResolvedValue([job])
    renderPage()
    await waitFor(() => screen.getByText('1 job'))
    fireEvent.click(screen.getByText('Print History').closest('button')!)
    await waitFor(() => {
      const links = screen.getAllByRole('link')
      expect(links.some(l => l.getAttribute('href') === '/spools/sa')).toBe(true)
      expect(links.some(l => l.getAttribute('href') === '/spools/sb')).toBe(true)
    })
  })

  it('shows live status progress when RUNNING', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    const status: PrinterStatus = { gcodeState: 'RUNNING', progressPercent: 54, remainingMinutes: 38, subtaskName: 'Test_file', layerNum: 33, totalLayerNum: 62, nozzleTempC: 220, bedTempC: 55, updatedAt: '2026-01-01T00:00:00Z' }
    vi.mocked(printersApi.getStatus).mockResolvedValue(status)
    renderPage()
    await waitFor(() => expect(screen.getByText('54%')).toBeInTheDocument())
    expect(screen.getByText('38m left')).toBeInTheDocument()
  })

  it('shows Layer and Nozzle in Details when live status active', async () => {
    vi.mocked(printersApi.getById).mockResolvedValue(basePrinter)
    const status: PrinterStatus = { gcodeState: 'RUNNING', progressPercent: 54, remainingMinutes: 38, subtaskName: null, layerNum: 33, totalLayerNum: 62, nozzleTempC: 220, bedTempC: 55, updatedAt: '2026-01-01T00:00:00Z' }
    vi.mocked(printersApi.getStatus).mockResolvedValue(status)
    renderPage()
    await waitFor(() => expect(screen.getByText('33 / 62')).toBeInTheDocument())
    expect(screen.getByText('220°C')).toBeInTheDocument()
    expect(screen.getByText('55°C')).toBeInTheDocument()
  })
})
