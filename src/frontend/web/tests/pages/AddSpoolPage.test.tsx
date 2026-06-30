import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddSpoolPage from '@/pages/AddSpoolPage'

vi.mock('@/api/spools', () => ({ spoolsApi: { add: vi.fn(), getAll: vi.fn() } }))
vi.mock('@/api/nfc', () => ({ scanTag: vi.fn(), registerTag: vi.fn() }))
vi.mock('@/api/filaments', () => ({ filamentsApi: { getAll: vi.fn() } }))
vi.mock('@/api/printers', () => ({ printersApi: { getAll: vi.fn() } }))
vi.mock('@/api/locations', () => ({ locationsApi: { getAll: vi.fn(), add: vi.fn() } }))
vi.mock('@/components/ScanView', () => ({ default: () => <div data-testid="scan-view" /> }))

import { spoolsApi } from '@/api/spools'
import { scanTag, registerTag } from '@/api/nfc'
import { filamentsApi } from '@/api/filaments'
import { printersApi } from '@/api/printers'
import { locationsApi } from '@/api/locations'

const MOCK_FILAMENT = {
  brand: 'Bambu Lab',
  filamentName: 'PLA Basic',
  material: 'PLA',
  colorName: 'Jade White',
  colorHex: '#E8E8E8',
  density: 1.24,
  extruderMin: 190,
  extruderMax: 230,
  bedMin: 35,
  bedMax: 60,
  variantColors: null,
  diameterTolerance: null,
  discontinued: false,
  dataSheetUrl: null,
  safetySheetUrl: null,
}

const createdSpool = {
  id: 'spool-999',
  brand: 'Bambu Lab',
  material: 'PLA',
  colorName: 'Jade White',
  colorHex: '#E8E8E8',
  initialWeightG: 1000,
  currentWeightG: 1000,
  spoolWeightG: 200,
  lowStockThresholdG: 100,
  isActive: false,
  isArchived: false,
  createdAt: '2026-01-01T00:00:00Z',
  lastScannedAt: null,
  notes: null,
  density: 1.24,
  extruderMin: 190,
  extruderMax: 230,
  bedMin: 35,
  bedMax: 60,
  hasNfcTag: false,
  nfcTagUid: null,
}

// Include all routes that AddSpoolPage navigates between
function renderPage(path = '/spools/add') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/spools/add" element={<AddSpoolPage />} />
        <Route path="/spools/add/manual" element={<AddSpoolPage />} />
        <Route path="/spools/add/nfctag" element={<AddSpoolPage />} />
        <Route path="/spools/:id" element={<div>Spool detail</div>} />
        <Route path="/spools" element={<div>Spools list</div>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// Navigate from the filament selection form to SpoolDetailsForm and pick a stock location
async function selectFilament() {
  await waitFor(() => screen.getByRole('option', { name: 'Bambu Lab' }))
  fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
  await waitFor(() => expect(screen.getByDisplayValue('Select material…')).not.toBeDisabled())
  fireEvent.change(screen.getByDisplayValue('Select material…'), { target: { value: 'PLA' } })
  await waitFor(() => screen.getByText('Jade White'))
  fireEvent.click(screen.getByText('Jade White'))
  await waitFor(() => screen.getByRole('button', { name: /Save/i }))
  // Select a stock location to satisfy validation
  await waitFor(() => screen.getByDisplayValue('Select storage'))
  fireEvent.change(screen.getByDisplayValue('Select storage'), { target: { value: 'Shelf A' } })
}

describe('AddSpoolPage — mode picker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(filamentsApi.getAll).mockResolvedValue([MOCK_FILAMENT])
    vi.mocked(printersApi.getAll).mockResolvedValue([])
    vi.mocked(spoolsApi.getAll).mockResolvedValue([])
    vi.mocked(locationsApi.getAll).mockResolvedValue([])
    vi.mocked(scanTag).mockResolvedValue({ status: 'unknown', tagUid: '', spool: null, message: null })
  })

  it('shows NFC and Manual buttons', () => {
    renderPage()
    // jsdom userAgent is detected as 'desktop' → NFC_LABEL is 'USB NFC Reader'
    expect(screen.getByText('USB NFC Reader')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })

  it('switches to NFC view when NFC button is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByText('USB NFC Reader'))
    // Mode picker buttons are gone; ScanView mock is rendered
    expect(screen.queryByText('Manual')).not.toBeInTheDocument()
    expect(screen.getByTestId('scan-view')).toBeInTheDocument()
  })

  it('shows the filament selection form when Manual is clicked', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Manual'))
    await waitFor(() => expect(screen.getByText('Add Spool')).toBeInTheDocument())
  })
})

describe('AddSpoolPage — form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(filamentsApi.getAll).mockResolvedValue([MOCK_FILAMENT])
    vi.mocked(printersApi.getAll).mockResolvedValue([])
    vi.mocked(spoolsApi.getAll).mockResolvedValue([])
    vi.mocked(locationsApi.getAll).mockResolvedValue([{ id: 'loc1', name: 'Shelf A' }])
    vi.mocked(scanTag).mockResolvedValue({ status: 'unknown', tagUid: '04:AA:BB:CC', spool: null, message: null })
  })

  it('renders brand dropdown after loading', async () => {
    renderPage('/spools/add/manual')
    await waitFor(() => expect(screen.getByText('Select brand…')).toBeInTheDocument())
  })

  it('shows NFC tag badge when tagUid is in query', async () => {
    renderPage('/spools/add/nfctag?tagUid=04:AA:BB:CC')
    await waitFor(() => expect(screen.getByText('NFC Tag')).toBeInTheDocument())
  })

  it('does not show NFC tag badge in manual mode', async () => {
    renderPage('/spools/add/manual')
    await waitFor(() => screen.getByText('Select brand…'))
    expect(screen.queryByText('NFC Tag')).not.toBeInTheDocument()
  })

  it('shows filament cards after selecting brand and material', async () => {
    renderPage('/spools/add/manual')
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
    await waitFor(() => expect(screen.getByDisplayValue('Select material…')).not.toBeDisabled())
    fireEvent.change(screen.getByDisplayValue('Select material…'), { target: { value: 'PLA' } })
    await waitFor(() => screen.getByText('Jade White'))
    expect(screen.getByText('Jade White')).toBeInTheDocument()
  })

  it('shows details form after clicking a filament card', async () => {
    renderPage('/spools/add/manual')
    await selectFilament()
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
  })

  it('calls spoolsApi.add with correct data on submit', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => expect(spoolsApi.add).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'Bambu Lab',
      material: 'PLA',
      colorName: 'Jade White',
      initialWeightG: 1000,
    })))
  })

  it('does not call registerTag when no tagUid', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => expect(spoolsApi.add).toHaveBeenCalled())
    expect(registerTag).not.toHaveBeenCalled()
  })

  it('calls registerTag when tagUid is present', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    vi.mocked(registerTag).mockResolvedValue(undefined)
    renderPage('/spools/add/nfctag?tagUid=04:AA:BB:CC')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => expect(registerTag).toHaveBeenCalledWith('04:AA:BB:CC', 'spool-999'))
  })

  it('navigates to /spools after successful submission', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => screen.getByText('View Spools'))
    fireEvent.click(screen.getByText('View Spools'))
    await waitFor(() => screen.getByText('Spools list'))
  })

  it('shows server error when submission fails', async () => {
    vi.mocked(spoolsApi.add).mockRejectedValue(new Error('fail'))
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => screen.getByText('Failed to save spool. Please try again.'))
  })
})

const MOCK_SPOOL_NO_NFC = {
  id: 'spool-no-nfc',
  brand: 'Bambu Lab',
  material: 'PLA',
  colorName: 'Jade White',
  colorHex: '#E8E8E8',
  initialWeightG: 1000,
  currentWeightG: 800,
  spoolWeightG: 200,
  lowStockThresholdG: 100,
  isActive: false,
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
  stockLocation: null,
  printerId: null,
  printerName: null,
  amsSlot: null,
  price: null,
}

describe('AddSpoolPage — NFC unassigned suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(filamentsApi.getAll).mockResolvedValue([MOCK_FILAMENT])
    vi.mocked(printersApi.getAll).mockResolvedValue([])
    vi.mocked(locationsApi.getAll).mockResolvedValue([])
    vi.mocked(scanTag).mockResolvedValue({ status: 'unknown', tagUid: '04:AA:BB:CC', spool: null, message: null })
  })

  it('shows unassigned spool cards immediately without filling the form', async () => {
    vi.mocked(spoolsApi.getAll).mockResolvedValue([MOCK_SPOOL_NO_NFC])
    renderPage('/spools/add/nfctag?tagUid=04:AA:BB:CC')
    await waitFor(() => expect(screen.getByText('Unassigned NFC Tag')).toBeInTheDocument())
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
  })

  it('does not show suggestion section when all spools already have NFC tags', async () => {
    vi.mocked(spoolsApi.getAll).mockResolvedValue([{ ...MOCK_SPOOL_NO_NFC, hasNfcTag: true }])
    renderPage('/spools/add/nfctag?tagUid=04:AA:BB:CC')
    await waitFor(() => screen.getByText('NFC Tag'))
    expect(screen.queryByText('Unassigned NFC Tag')).not.toBeInTheDocument()
  })

  it('calls registerTag and navigates to spool on card click', async () => {
    vi.mocked(spoolsApi.getAll).mockResolvedValue([MOCK_SPOOL_NO_NFC])
    vi.mocked(registerTag).mockResolvedValue(undefined)
    renderPage('/spools/add/nfctag?tagUid=04:AA:BB:CC')
    await waitFor(() => screen.getByText('Bambu Lab'))
    fireEvent.click(screen.getByText('Bambu Lab'))
    await waitFor(() => expect(registerTag).toHaveBeenCalledWith('04:AA:BB:CC', 'spool-no-nfc'))
    await waitFor(() => screen.getByText('Spool detail'))
  })
})
