import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import PrinterCard from '@/components/PrinterCard'
import type { PrinterResponse } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'

const basePrinter: PrinterResponse = {
  id: 'printer-1',
  name: 'My P1S',
  brand: 'Bambu Lab',
  model: 'P1S',
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

// Tray summary matching activeSpool
const spoolSummary = { id: 'spool-1', brand: 'Bambu Lab', material: 'PLA', colorName: 'Jade White', colorHex: '#FFFFFF' }
const printerWithSpool = { ...basePrinter, tray1Occupied: true, tray1Spool: spoolSummary }
const printerNonAmsWithSpool = { ...basePrinter, hasAms: false, extraSpool: spoolSummary }

const activeSpool: SpoolResponse = {
  id: 'spool-1',
  brand: 'Bambu Lab',
  material: 'PLA',
  colorName: 'Jade White',
  colorHex: '#FFFFFF',
  initialWeightG: 1000,
  currentWeightG: 750,
  spoolWeightG: 200,
  lowStockThresholdG: 100,
  isActive: true,
  isArchived: false,
  createdAt: '2026-01-01T00:00:00Z',
  lastScannedAt: null,
  notes: null,
  density: null,
  extruderMin: null,
  extruderMax: null,
  bedMin: null,
  bedMax: null,
  hasNfcTag: false,
  nfcTagUid: null,
  nfcTagUids: [],
  printerId: 'printer-1',
  printerName: 'My P1S',
  amsSlot: 1,
}

function render_(printer: PrinterResponse, spools: SpoolResponse[] = []) {
  return render(<PrinterCard printer={printer} spools={spools} />, { wrapper: MemoryRouter })
}

function clickAccordion(labelText: string) {
  fireEvent.click(screen.getByText(labelText).closest('button')!)
}

describe('PrinterCard', () => {
  it('renders printer name', () => {
    render_(basePrinter)
    expect(screen.getByText('My P1S')).toBeInTheDocument()
  })

  it('renders brand and model', () => {
    render_(basePrinter)
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('P1S')).toBeInTheDocument()
  })

  // ── AMS printers ──────────────────────────────────────────────

  it('shows AMS accordion when hasAms is true', () => {
    render_(basePrinter)
    expect(screen.getAllByText('AMS').length).toBeGreaterThanOrEqual(1)
  })

  it('does not show AMS when hasAms is false', () => {
    render_({ ...basePrinter, hasAms: false })
    expect(screen.queryByText('AMS')).not.toBeInTheDocument()
  })

  it('shows reserved spool on card when assigned but MQTT empty', () => {
    const reserved = { id: 'spool-2', brand: 'eSUN', material: 'PLA', colorName: 'Red', colorHex: '#FF0000' }
    render_({
      ...basePrinter,
      tray1Occupied: false,
      tray2Occupied: false,
      tray3Occupied: false,
      tray4Occupied: false,
      tray2Spool: reserved,
    }, [])
    expect(screen.getByText('0/4 loaded · 1 reserved')).toBeInTheDocument()
    clickAccordion('0/4 loaded · 1 reserved')
    expect(screen.getByText('Reserved')).toBeInTheDocument()
    const reservedLink = screen.getAllByRole('link').find(l => l.getAttribute('href') === '/spools/spool-2')
    expect(reservedLink).toBeTruthy()
  })

  it('shows loaded count from MQTT tray occupied', () => {
    render_({
      ...basePrinter,
      tray1Occupied: true,
      tray2Occupied: false,
      tray3Occupied: false,
      tray4Occupied: false,
    }, [])
    expect(screen.getByText('1/4 loaded')).toBeInTheDocument()
  })

  it('MQTT empty tray is not a link', () => {
    render_({
      ...basePrinter,
      tray1Occupied: false,
      tray2Occupied: false,
      tray3Occupied: false,
      tray4Occupied: false,
    }, [])
    clickAccordion('0/4 loaded')
    const assignLinks = screen.queryAllByRole('link').filter(l => l.getAttribute('href')?.includes('amsSlot'))
    expect(assignLinks).toHaveLength(0)
    expect(screen.getAllByText('Empty').length).toBe(4)
  })

  it('occupied tray without spool links to assign', () => {
    render_({
      ...basePrinter,
      tray1Occupied: true,
      tray2Occupied: false,
      tray3Occupied: false,
      tray4Occupied: false,
    }, [])
    clickAccordion('1/4 loaded')
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href') === '/spools/select?printerId=printer-1&amsSlot=1')).toBe(true)
  })

  it('shows spool weight % when spool is linked', () => {
    render_(printerWithSpool, [activeSpool])
    clickAccordion('1/4 loaded')
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows correct AMS loaded count', () => {
    render_(printerWithSpool, [activeSpool])
    expect(screen.getByText('1/4 loaded')).toBeInTheDocument()
  })

  it('shows 0/4 loaded when no active spools', () => {
    render_(basePrinter, [])
    expect(screen.getByText('0/4 loaded')).toBeInTheDocument()
  })

  it('AMS accordion is collapsed by default (spool names not visible)', () => {
    render_(printerWithSpool, [activeSpool])
    expect(screen.queryByText('Jade White')).not.toBeInTheDocument()
  })

  it('AMS accordion expands on click and shows spool row', () => {
    render_(printerWithSpool, [activeSpool])
    clickAccordion('1/4 loaded')
    expect(screen.getByText('Jade White')).toBeInTheDocument()
  })

  it('expanded AMS shows 4 empty slots when no spools', () => {
    render_(basePrinter, [])
    clickAccordion('0/4 loaded')
    expect(screen.getAllByText('Empty').length).toBe(4)
  })

  it('expanded AMS spool row links to spool detail page', () => {
    render_(printerWithSpool, [activeSpool])
    clickAccordion('1/4 loaded')
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href') === '/spools/spool-1')).toBe(true)
  })

  it('AMS accordion collapses again on second click', () => {
    render_(printerWithSpool, [activeSpool])
    clickAccordion('1/4 loaded')
    expect(screen.getByText('Jade White')).toBeInTheDocument()
    clickAccordion('1/4 loaded')
    expect(screen.queryByText('Jade White')).not.toBeInTheDocument()
  })

  // ── Non-AMS printers ──────────────────────────────────────────

  it('shows EXTRA accordion when hasAms is false', () => {
    render_({ ...basePrinter, hasAms: false })
    expect(screen.getByText('EXTRA')).toBeInTheDocument()
  })

  it('non-AMS shows none assigned when no spool assigned', () => {
    render_({ ...basePrinter, hasAms: false }, [])
    expect(screen.getByText('none assigned')).toBeInTheDocument()
  })

  it('non-AMS shows "1 loaded" when spool assigned to this printer', () => {
    render_(printerNonAmsWithSpool, [activeSpool])
    expect(screen.getByText('1 loaded')).toBeInTheDocument()
  })

  it('non-AMS spool accordion is collapsed by default', () => {
    render_(printerNonAmsWithSpool, [activeSpool])
    expect(screen.queryByText('Jade White')).not.toBeInTheDocument()
  })

  it('non-AMS accordion expands on click and shows spool row', () => {
    render_(printerNonAmsWithSpool, [activeSpool])
    clickAccordion('1 loaded')
    expect(screen.getByText(/Jade White/)).toBeInTheDocument()
  })

  it('non-AMS accordion shows assign state when expanded and empty', () => {
    render_({ ...basePrinter, hasAms: false }, [])
    clickAccordion('none assigned')
    expect(screen.getByText('No spool loaded')).toBeInTheDocument()
  })

  it('non-AMS MQTT empty extra is not a link', () => {
    render_({ ...basePrinter, hasAms: false, extraSpoolOccupied: false }, [])
    clickAccordion('none assigned')
    const assignLinks = screen.queryAllByRole('link').filter(l => l.getAttribute('href')?.includes('spools/select'))
    expect(assignLinks).toHaveLength(0)
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })

  it('non-AMS MQTT occupied without spool links to assign', () => {
    render_({ ...basePrinter, hasAms: false, extraSpoolOccupied: true }, [])
    clickAccordion('1 loaded')
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href') === '/spools/select?printerId=printer-1')).toBe(true)
  })

  it('non-AMS expanded spool row links to spool detail page', () => {
    render_(printerNonAmsWithSpool, [activeSpool])
    clickAccordion('1 loaded')
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href') === '/spools/spool-1')).toBe(true)
  })

  it('non-AMS spools assigned to a different printer are not shown', () => {
    const otherSpool = { ...activeSpool, id: 'spool-2', printerId: 'printer-99' }
    render_({ ...basePrinter, hasAms: false }, [otherSpool])
    expect(screen.getByText('none assigned')).toBeInTheDocument()
  })

  it('clicking printer name calls onOpenDetail with the printer', () => {
    const onOpenDetail = vi.fn()
    render(<PrinterCard printer={basePrinter} spools={[]} onOpenDetail={onOpenDetail} />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByText('My P1S'))
    expect(onOpenDetail).toHaveBeenCalledWith(basePrinter)
  })

  it('clicking anywhere else on the card also calls onOpenDetail', () => {
    const onOpenDetail = vi.fn()
    render(<PrinterCard printer={basePrinter} spools={[]} onOpenDetail={onOpenDetail} />, { wrapper: MemoryRouter })
    fireEvent.click(screen.getByText('P1S'))
    expect(onOpenDetail).toHaveBeenCalledWith(basePrinter)
  })

  it('clicking the AMS accordion does not call onOpenDetail', () => {
    const onOpenDetail = vi.fn()
    render(<PrinterCard printer={printerWithSpool} spools={[activeSpool]} onOpenDetail={onOpenDetail} />, { wrapper: MemoryRouter })
    clickAccordion('1/4 loaded')
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('clicking an expanded AMS spool link does not call onOpenDetail', () => {
    const onOpenDetail = vi.fn()
    render(<PrinterCard printer={printerWithSpool} spools={[activeSpool]} onOpenDetail={onOpenDetail} />, { wrapper: MemoryRouter })
    clickAccordion('1/4 loaded')
    fireEvent.click(screen.getByText('Jade White'))
    expect(onOpenDetail).not.toHaveBeenCalled()
  })
})
