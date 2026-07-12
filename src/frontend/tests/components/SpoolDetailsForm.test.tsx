import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SpoolDetailsForm from '@/components/SpoolDetailsForm'
import type { FilamentProfile } from '@/types/filament'
import type { PrinterResponse } from '@/types/printer'

const basePrinter: PrinterResponse = {
  id: 'p1', name: 'My X1C', brand: 'Bambu Lab', model: 'X1 Carbon',
  serialNumber: null, ipAddress: '192.168.1.50', port: null,
  protocol: 'mqtt_lan', hasAms: false, createdAt: '2026-01-01T00:00:00Z',
}

const baseFilament: FilamentProfile = {
  brand: 'Bambu Lab',
  filamentName: 'Basic PLA',
  material: 'PLA',
  density: 1.24,
  extruderMin: null,
  extruderMax: null,
  bedMin: null,
  bedMax: null,
  colorHex: '#FFFFFF',
  colorName: 'Jade White',
  diameterTolerance: 0.02,
  discontinued: false,
  dataSheetUrl: null,
  safetySheetUrl: null,
}

const withPrintSettings: FilamentProfile = {
  ...baseFilament,
  extruderMin: 190,
  extruderMax: 220,
  bedMin: 35,
  bedMax: 45,
}

const defaultProps = {
  filament: baseFilament,
  currentWeightG: '1000',
  setCurrentWeightG: vi.fn(),
  initialWeightG: '1000',
  setInitialWeightG: vi.fn(),
  spoolWeightG: '250',
  setSpoolWeightG: vi.fn(),
  lowStockThresholdG: '100',
  setLowStockThresholdG: vi.fn(),
  notes: '',
  setNotes: vi.fn(),
  weightError: '',
  setWeightError: vi.fn(),
  isActive: false,
  setIsActive: vi.fn(),
  submitting: false,
  submitError: null,
  onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
  onCancel: vi.fn(),
}

function renderForm(overrides: Partial<typeof defaultProps> = {}) {
  return render(<SpoolDetailsForm {...defaultProps} {...overrides} />)
}

describe('SpoolDetailsForm', () => {
  it('renders brand name in header', () => {
    renderForm()
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
  })

  it('renders filament color name in header', () => {
    renderForm()
    expect(screen.getByText('Jade White')).toBeInTheDocument()
  })

  it('falls back to filamentName when colorName is null', () => {
    renderForm({ filament: { ...baseFilament, colorName: null } })
    expect(screen.getByText('Basic PLA')).toBeInTheDocument()
  })

  it('renders Spool Stats section heading', () => {
    renderForm()
    expect(screen.getByText('Spool Stats')).toBeInTheDocument()
  })

  it('renders weight input field labels', () => {
    renderForm()
    expect(screen.getByText('Current Weight (g)')).toBeInTheDocument()
    expect(screen.getByText('Initial Weight (g)')).toBeInTheDocument()
    expect(screen.getByText('Spool Weight (g)')).toBeInTheDocument()
    expect(screen.getByText('Low Stock At (g)')).toBeInTheDocument()
  })

  it('initial, spool and low-stock weights are locked behind an edit pen', () => {
    renderForm()
    // read-only values shown by default (current weight stays an editable input)
    expect(screen.getByText('1000 g')).toBeInTheDocument()
    expect(screen.getByText('250 g')).toBeInTheDocument()
    expect(screen.getByText('100 g')).toBeInTheDocument()
    expect(screen.getAllByTitle('Edit')).toHaveLength(3)
  })

  it('clicking the edit pen unlocks a weight field for editing', () => {
    renderForm()
    fireEvent.click(screen.getAllByTitle('Edit')[0])
    expect(screen.queryByText('1000 g')).not.toBeInTheDocument()
    expect(screen.getAllByTitle('Lock')).toHaveLength(1)
  })

  it('hides Print Settings when filament has no temperature data', () => {
    renderForm()
    expect(screen.queryByText('Print Settings')).not.toBeInTheDocument()
  })

  it('shows Print Settings header when filament has temperature data', () => {
    renderForm({ filament: withPrintSettings })
    expect(screen.getByText('Print Settings')).toBeInTheDocument()
  })

  it('Print Settings is collapsed by default — temperatures not visible', () => {
    renderForm({ filament: withPrintSettings })
    expect(screen.queryByText('190 °C')).not.toBeInTheDocument()
    expect(screen.queryByText('220 °C')).not.toBeInTheDocument()
  })

  it('clicking Print Settings header expands it to show temperatures', () => {
    renderForm({ filament: withPrintSettings })
    fireEvent.click(screen.getByText('Print Settings'))
    expect(screen.getByText('190 °C')).toBeInTheDocument()
    expect(screen.getByText('220 °C')).toBeInTheDocument()
    expect(screen.getByText('190–220 °C')).toBeInTheDocument()
  })

  it('renders Material Properties section heading', () => {
    renderForm()
    expect(screen.getByText('Material Properties')).toBeInTheDocument()
  })

  it('Material Properties is collapsed by default — density not visible', () => {
    renderForm()
    expect(screen.queryByText('1.24 g/cm³')).not.toBeInTheDocument()
  })

  it('clicking Material Properties header expands it to show specs', () => {
    renderForm()
    fireEvent.click(screen.getByText('Material Properties'))
    expect(screen.getByText('1.24 g/cm³')).toBeInTheDocument()
    expect(screen.getByText('±0.02 mm')).toBeInTheDocument()
  })

  it('renders Notes section', () => {
    renderForm()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    renderForm({ onCancel })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onSubmit when Save is clicked', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    renderForm({ onSubmit })
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!)
    expect(onSubmit).toHaveBeenCalled()
  })

  it('disables Save button when submitting', () => {
    renderForm({ submitting: true })
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('shows submitError message', () => {
    renderForm({ submitError: 'Failed to save spool. Please try again.' })
    expect(screen.getByText('Failed to save spool. Please try again.')).toBeInTheDocument()
  })

  it('shows weightError under initial weight field', () => {
    renderForm({ weightError: 'Enter a weight greater than 0' })
    expect(screen.getByText('Enter a weight greater than 0')).toBeInTheDocument()
  })

  it('activate toggle shows "Active" label and "Loaded spool" description', () => {
    renderForm()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Loaded spool')).toBeInTheDocument()
  })

  it('shows the NFC tag badge in the header when a tag is present', () => {
    renderForm({ tagUid: '04:A1:B2:C3:D4:E5' })
    expect(screen.getByText('NFC Tag')).toBeInTheDocument()
  })

  it('does not show the NFC tag badge when there is no tag', () => {
    renderForm()
    expect(screen.queryByText('NFC Tag')).not.toBeInTheDocument()
  })

  // Mobile layout: specGrid3 (repeat(3,1fr)) renders only after expanding the section
  it('Print Settings grid renders after expanding the section', () => {
    const { container } = renderForm({ filament: withPrintSettings })
    expect(container.querySelectorAll('[class*="specGrid"]').length).toBe(0)
    fireEvent.click(screen.getByText('Print Settings'))
    expect(container.querySelectorAll('[class*="specGrid"]').length).toBeGreaterThanOrEqual(1)
  })

  it('Material Properties grid renders after expanding the section', () => {
    const { container } = renderForm()
    expect(container.querySelectorAll('[class*="specGrid"]').length).toBe(0)
    fireEvent.click(screen.getByText('Material Properties'))
    expect(container.querySelectorAll('[class*="specGrid"]').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Price section heading', () => {
    renderForm()
    expect(screen.getByText(/Price paid/)).toBeInTheDocument()
  })

  it('renders Price input with placeholder 0.00', () => {
    renderForm()
    const input = screen.getByPlaceholderText('0.00')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'number')
  })

  // Mobile layout (issue #453): printer/toggle span full width, NFC + Active share a row
  it('printer assign section renders when active with a printer list', () => {
    const { container } = renderForm({ printers: [basePrinter], printerId: null, setPrinterId: vi.fn(), isActive: true })
    expect(container.querySelector('[class*="printerBox"]')).toBeTruthy()
  })

  it('active toggle box renders in stats area', () => {
    const { container } = renderForm()
    expect(container.querySelector('[class*="activeBox"]')).toBeTruthy()
  })

  it('shows stock location dropdown when spool is not active', () => {
    renderForm({ printers: [basePrinter], printerId: null, setPrinterId: vi.fn(), isActive: false })
    expect(screen.getByText('Select storage')).toBeInTheDocument()
    expect(screen.queryByText('Assigned Printer')).not.toBeInTheDocument()
  })

  it('shows printer assign section (not stock location) when spool is active', () => {
    renderForm({ printers: [basePrinter], printerId: null, setPrinterId: vi.fn(), isActive: true })
    expect(screen.getByText('Assigned Printer')).toBeInTheDocument()
    expect(screen.queryByText('Select storage')).not.toBeInTheDocument()
  })
})
