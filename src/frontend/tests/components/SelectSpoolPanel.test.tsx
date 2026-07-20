import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import SelectSpoolPanel from '@/components/SelectSpoolPanel'
import type { PrinterResponse } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'

const printer: PrinterResponse = {
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
  tray1Mqtt: { material: 'PLA+', colorName: 'White', colorHex: '#FFFFFF', brand: 'eSUN' },
  tray2Mqtt: null,
  tray3Mqtt: null,
  tray4Mqtt: null,
  extraMqtt: null,
}

const matchingSpool: SpoolResponse = {
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

describe('SelectSpoolPanel', () => {
  it('shows matching spool card without search or header add button', () => {
    render(
      <MemoryRouter>
        <SelectSpoolPanel
          printer={printer}
          spools={[matchingSpool]}
          amsSlot={1}
          onSelect={vi.fn()}
          variant="drawer"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('White')).toBeInTheDocument()
    expect(screen.getByText('eSUN 3D')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /add spool/i })).not.toBeInTheDocument()
  })

  it('shows add CTA when no matching spools', () => {
    const printerSlot4: PrinterResponse = {
      ...printer,
      tray4Mqtt: { material: 'PLA+', colorName: 'Matte Black', colorHex: '#000000', brand: 'eSUN' },
    }
    render(
      <MemoryRouter>
        <SelectSpoolPanel
          printer={printerSlot4}
          spools={[]}
          amsSlot={4}
          onSelect={vi.fn()}
          variant="drawer"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/no .* spools in your library/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add .* spool/i })).toBeInTheDocument()
  })

  it('calls onSelect when a spool card is clicked', () => {
    const onSelect = vi.fn()
    render(
      <MemoryRouter>
        <SelectSpoolPanel
          printer={printer}
          spools={[matchingSpool]}
          amsSlot={1}
          onSelect={onSelect}
          variant="drawer"
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('White'))
    expect(onSelect).toHaveBeenCalledWith(matchingSpool)
  })
})
