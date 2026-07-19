import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import SpoolCard from '@/components/SpoolCard'
import type { SpoolResponse } from '@/types/spool'

const baseSpool: SpoolResponse = {
  id: '1',
  brand: 'Bambu Lab',
  material: 'PLA',
  colorName: 'Jade White',
  colorHex: '#FFFFFF',
  initialWeightG: 1000,
  currentWeightG: 1000,
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
  hasNfcTag: false,
  nfcTagUid: null,
  printerId: null,
  printerName: null,
  amsSlot: null,
  price: null,
  stockLocation: null,
}

function render_(spool: SpoolResponse) {
  return render(<SpoolCard spool={spool} />, { wrapper: MemoryRouter })
}

describe('SpoolCard', () => {
  it('renders brand name', () => {
    render_(baseSpool)
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
  })

  it('renders material badge', () => {
    render_(baseSpool)
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })

  it('renders color name as title and brand separately', () => {
    render_(baseSpool)
    expect(screen.getByText('Jade White')).toBeInTheDocument()
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
  })

  it('renders weight display', () => {
    render_({ ...baseSpool, currentWeightG: 750 })
    expect(screen.getByText('750g')).toBeInTheDocument()
  })

  it('renders percentage', () => {
    render_(baseSpool)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows LOADED badge when assigned to a printer', () => {
    render_({ ...baseSpool, isActive: true, printerId: 'p1', printerName: 'X1C' })
    expect(screen.getByText('LOADED')).toBeInTheDocument()
  })

  it('does not show LOADED badge when not assigned to a printer', () => {
    render_(baseSpool)
    expect(screen.queryByText('LOADED')).not.toBeInTheDocument()
  })

  it('shows NFC icon when hasNfcTag is true', () => {
    const { container } = render_({ ...baseSpool, hasNfcTag: true })
    expect(container.querySelector('[aria-label="NFC tag linked"]')).toBeInTheDocument()
  })

  it('does not show NFC icon when hasNfcTag is false', () => {
    const { container } = render_(baseSpool)
    expect(container.querySelector('[aria-label="NFC tag linked"]')).not.toBeInTheDocument()
  })

  it('shows never for lastScannedAt null', () => {
    render_(baseSpool)
    expect(screen.getByText('never')).toBeInTheDocument()
  })

  it('shows formatted last-used date when lastScannedAt is set', () => {
    render_({ ...baseSpool, lastScannedAt: '2026-06-01T10:00:00Z' })
    expect(screen.queryByText('never')).not.toBeInTheDocument()
  })

  it('links to the spool detail page', () => {
    render_(baseSpool)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/spools/1')
  })

  it('does not render extruder temperature chips', () => {
    render_({ ...baseSpool, extruderMin: 190, extruderMax: 230 })
    expect(screen.queryByText(/190.*230/)).not.toBeInTheDocument()
    expect(screen.queryByText(/190–230/)).not.toBeInTheDocument()
  })

  it('does not render bed temperature chips', () => {
    render_({ ...baseSpool, bedMin: 35, bedMax: 60 })
    expect(screen.queryByText(/35.*60\s*°C/)).not.toBeInTheDocument()
  })

  it('shows stock location when provided', () => {
    render_({ ...baseSpool, stockLocation: 'Shelf A' })
    expect(screen.getByText('Shelf A')).toBeInTheDocument()
  })

  it('shows printer name when assigned to a printer', () => {
    render_({ ...baseSpool, printerName: 'Printer A', amsSlot: 1 })
    expect(screen.getByText('Printer A • Slot 1')).toBeInTheDocument()
  })

  it('shows printer name without slot when no amsSlot', () => {
    render_({ ...baseSpool, printerName: 'Printer B' })
    expect(screen.getByText('Printer B')).toBeInTheDocument()
  })

  it('shows printer name instead of stock location when both are set', () => {
    render_({ ...baseSpool, printerName: 'Printer A', amsSlot: 2, stockLocation: 'Shelf A' })
    expect(screen.getByText('Printer A • Slot 2')).toBeInTheDocument()
    expect(screen.queryByText('Shelf A')).not.toBeInTheDocument()
  })
})
