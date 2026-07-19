import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SpoolDetailDrawer from '@/components/SpoolDetailDrawer'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse } from '@/types/printer'

vi.mock('@/api/spools', () => ({
  spoolsApi: {
    update: vi.fn(),
    assignPrinter: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/api/printJobs', () => ({
  printJobsApi: { getBySpool: vi.fn() },
}))

vi.mock('@/api/locations', () => ({
  locationsApi: { getAll: vi.fn() },
}))

vi.mock('@/api/settings', () => ({
  settingsApi: { getApp: vi.fn() },
}))

import { spoolsApi } from '@/api/spools'
import { printJobsApi } from '@/api/printJobs'
import { locationsApi } from '@/api/locations'
import { settingsApi } from '@/api/settings'

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
  density: 1.24,
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
  price: 2,
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

async function openEditAndSelectOccupiedSlot(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /edit/i }))
  await user.click(screen.getByRole('button', { name: /loaded in printer/i }))
  const printerSelect = screen.getByDisplayValue(/select printer/i)
  await user.selectOptions(printerSelect, 'p1')
  await user.click(screen.getByRole('button', { name: /2\s*White/i }))
}

describe('SpoolDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(printJobsApi.getBySpool).mockResolvedValue([])
    vi.mocked(locationsApi.getAll).mockResolvedValue([
      { id: 'l1', name: 'Shelf A', type: 'shelf', capacity: 10, humidity: null, createdAt: '2026-01-01T00:00:00Z' },
    ])
    vi.mocked(settingsApi.getApp).mockResolvedValue({ currency: 'SEK' } as never)
    vi.mocked(spoolsApi.update).mockResolvedValue(spool)
    vi.mocked(spoolsApi.assignPrinter).mockResolvedValue({
      ...spool,
      isActive: true,
      printerId: 'p1',
      amsSlot: 2,
    })
  })

  it('shows spool details and SEK-formatted price', async () => {
    render(
      <SpoolDetailDrawer spool={spool} printers={[printer]} onClose={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { name: /spool details/i })).toBeInTheDocument()
    expect(screen.getAllByText('Black').length).toBeGreaterThan(0)
    expect(await screen.findByText('2,00 Kr')).toBeInTheDocument()
  })

  it('shows inline displace alert for occupied AMS slot (no conflict modal)', async () => {
    const user = userEvent.setup()
    render(
      <SpoolDetailDrawer spool={spool} printers={[printer]} onClose={vi.fn()} />,
    )
    await openEditAndSelectOccupiedSlot(user)

    expect(await screen.findByText(/this slot already has a spool loaded/i)).toBeInTheDocument()
    expect(screen.getByText('Currently loaded')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unassign & assign/i })).not.toBeInTheDocument()
  })

  it('requires location and does not save when displace location is missing', async () => {
    const user = userEvent.setup()
    render(
      <SpoolDetailDrawer spool={spool} printers={[printer]} onClose={vi.fn()} />,
    )
    await openEditAndSelectOccupiedSlot(user)
    await screen.findByText(/this slot already has a spool loaded/i)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/select a storage location/i)).toBeInTheDocument()
    expect(spoolsApi.assignPrinter).not.toHaveBeenCalled()
  })

  it('saves with displacedStockLocation when location is chosen', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    render(
      <SpoolDetailDrawer
        spool={spool}
        printers={[printer]}
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />,
    )
    await openEditAndSelectOccupiedSlot(user)
    await screen.findByText(/this slot already has a spool loaded/i)

    const alert = screen.getByRole('alert')
    await user.selectOptions(within(alert).getByRole('combobox'), 'Shelf A')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(spoolsApi.assignPrinter).toHaveBeenCalledWith('s-new', {
        printerId: 'p1',
        amsSlot: 2,
        displacedStockLocation: 'Shelf A',
      })
    })
    expect(onUpdated).toHaveBeenCalled()
  })
})
