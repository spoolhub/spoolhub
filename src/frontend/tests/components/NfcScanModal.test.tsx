import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NfcScanModal from '@/components/NfcScanModal'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse } from '@/types/printer'

vi.mock('@/api/spools', () => ({
  spoolsApi: {
    activate: vi.fn(),
    assignPrinter: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/api/printers', () => ({
  printersApi: { getAll: vi.fn() },
}))

vi.mock('@/api/locations', () => ({
  locationsApi: { getAll: vi.fn() },
}))

import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import { locationsApi } from '@/api/locations'

const spool: SpoolResponse = {
  id: 's-new',
  brand: 'Bambu',
  material: 'PLA',
  colorName: 'Black',
  colorHex: '#111111',
  initialWeightG: 1000,
  currentWeightG: 900,
  spoolWeightG: 200,
  lowStockThresholdG: 100,
  isActive: false,
  isArchived: false,
  createdAt: '2026-01-01T00:00:00Z',
  lastScannedAt: null,
  notes: null,
  density: null,
  diameterTolerance: null,
  extruderMin: null,
  extruderMax: null,
  bedMin: null,
  bedMax: null,
  hasNfcTag: true,
  nfcTagUid: 'AABBCCDD',
  nfcTagUids: ['AABBCCDD'],
  printerId: null,
  printerName: null,
  amsSlot: null,
  price: null,
  stockLocation: null,
}

const occupant = {
  id: 's-old',
  brand: 'eSUN',
  material: 'PLA',
  colorName: 'White',
  colorHex: '#FFFFFF',
}

const printer: PrinterResponse = {
  id: 'p1',
  name: 'Garage X1C',
  brand: 'Bambu Lab',
  model: 'X1 Carbon',
  serialNumber: null,
  ipAddress: '192.168.1.1',
  port: null,
  protocol: 'mqtt_lan',
  hasAms: true,
  createdAt: '2026-01-01T00:00:00Z',
  tray1Spool: null,
  tray2Spool: occupant,
  tray3Spool: null,
  tray4Spool: null,
  extraSpool: null,
  tray1RemainPct: null,
  tray2RemainPct: null,
  tray3RemainPct: null,
  tray4RemainPct: null,
  tray1Occupied: false,
  tray2Occupied: true,
  tray3Occupied: false,
  tray4Occupied: false,
  extraSpoolOccupied: null,
  extraSpoolRemainPct: null,
  tray1Mqtt: null,
  tray2Mqtt: null,
  tray3Mqtt: null,
  tray4Mqtt: null,
  extraMqtt: null,
}

async function goToOccupiedSlotAssign(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /assign/i }))
  await user.click(screen.getByRole('button', { name: /loaded in printer/i }))
  await waitFor(() => expect(printersApi.getAll).toHaveBeenCalled())

  const printerSelect = screen.getAllByRole('combobox')[0]
  await user.selectOptions(printerSelect, 'p1')

  // Slot tiles: number + color name; occupied tray 2 shows White until selected
  const slot2 = screen.getByRole('button', { name: /2\s*White/i })
  await user.click(slot2)
}

describe('NfcScanModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(printersApi.getAll).mockResolvedValue([printer])
    vi.mocked(locationsApi.getAll).mockResolvedValue([
      { id: 'l1', name: 'Shelf A', type: 'shelf', capacity: 10, humidity: null, createdAt: '2026-01-01T00:00:00Z' },
    ])
    vi.mocked(spoolsApi.activate).mockResolvedValue(spool)
    vi.mocked(spoolsApi.assignPrinter).mockResolvedValue({
      ...spool,
      isActive: true,
      printerId: 'p1',
      amsSlot: 2,
    })
  })

  it('shows scanned spool details', () => {
    render(<NfcScanModal spool={spool} onClose={vi.fn()} />)
    expect(screen.getByText('Black')).toBeInTheDocument()
    expect(screen.getByText('Bambu')).toBeInTheDocument()
    expect(screen.getByText('AABBCCDD')).toBeInTheDocument()
  })

  it('shows inline displace alert when assigning to an occupied AMS slot (no conflict modal)', async () => {
    const user = userEvent.setup()
    render(<NfcScanModal spool={spool} onClose={vi.fn()} />)
    await goToOccupiedSlotAssign(user)

    expect(await screen.findByText(/this slot already has a spool loaded/i)).toBeInTheDocument()
    expect(screen.getByText('Currently loaded')).toBeInTheDocument()
    expect(screen.getByText(/where should the current spool be stored/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unassign & assign/i })).not.toBeInTheDocument()
  })

  it('requires location and does not assign when displace location is missing', async () => {
    const user = userEvent.setup()
    render(<NfcScanModal spool={spool} onClose={vi.fn()} />)
    await goToOccupiedSlotAssign(user)
    await screen.findByText(/this slot already has a spool loaded/i)

    await user.click(screen.getByRole('button', { name: /^load$/i }))

    expect(await screen.findByText(/select a storage location/i)).toBeInTheDocument()
    expect(spoolsApi.assignPrinter).not.toHaveBeenCalled()
  })

  it('assigns with displacedStockLocation when location is chosen', async () => {
    const user = userEvent.setup()
    render(<NfcScanModal spool={spool} onClose={vi.fn()} />)
    await goToOccupiedSlotAssign(user)
    await screen.findByText(/this slot already has a spool loaded/i)

    const alert = screen.getByRole('alert')
    const locationSelect = within(alert).getByRole('combobox')
    await user.selectOptions(locationSelect, 'Shelf A')
    await user.click(screen.getByRole('button', { name: /^load$/i }))

    await waitFor(() => {
      expect(spoolsApi.assignPrinter).toHaveBeenCalledWith('s-new', {
        printerId: 'p1',
        amsSlot: 2,
        displacedStockLocation: 'Shelf A',
      })
    })
  })
})
