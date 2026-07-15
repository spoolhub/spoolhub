import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrintersPage from '@/pages/PrintersPage'
import type { PrinterResponse } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'

vi.mock('@/api/printers', () => ({
  printersApi: {
    getAll:      vi.fn(),
    getStatus:   vi.fn(),
    registerLan: vi.fn(),
  },
}))

vi.mock('@/api/spools', () => ({
  spoolsApi: { getAll: vi.fn() },
}))

import { printersApi } from '@/api/printers'
import { spoolsApi } from '@/api/spools'
import { withNotificationsProvider } from '../utils/withNotificationsProvider'

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

const emptySpools: SpoolResponse[] = []

function renderPage() {
  return render(
    withNotificationsProvider(
      <MemoryRouter initialEntries={['/printers']}>
        <PrintersPage />
      </MemoryRouter>,
    ),
  )
}

describe('PrintersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(spoolsApi.getAll).mockResolvedValue(emptySpools)
    vi.mocked(printersApi.getStatus).mockResolvedValue(null)
  })

  it('shows loading skeleton initially', () => {
    vi.mocked(printersApi.getAll).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('shows page heading', async () => {
    vi.mocked(printersApi.getAll).mockResolvedValue([basePrinter])
    renderPage()
    await waitFor(() => expect(screen.getByText('Printers')).toBeInTheDocument())
  })

  it('shows Add Printer button', async () => {
    vi.mocked(printersApi.getAll).mockResolvedValue([])
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: /add printer/i })).toBeInTheDocument())
  })

  it('shows printer card after load', async () => {
    vi.mocked(printersApi.getAll).mockResolvedValue([basePrinter])
    renderPage()
    await waitFor(() => expect(screen.getByText('Garage X1C')).toBeInTheDocument())
  })

  it('shows all printer cards when multiple printers', async () => {
    const p2: PrinterResponse = { ...basePrinter, id: 'p2', name: 'Office P1S', model: 'P1S', hasAms: false }
    vi.mocked(printersApi.getAll).mockResolvedValue([basePrinter, p2])
    renderPage()
    await waitFor(() => expect(screen.getByText('Garage X1C')).toBeInTheDocument())
    expect(screen.getByText('Office P1S')).toBeInTheDocument()
  })
})
