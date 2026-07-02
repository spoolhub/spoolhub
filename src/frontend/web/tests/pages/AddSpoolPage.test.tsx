import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddSpoolPage from '@/pages/AddSpoolPage'

vi.mock('@/api/spools', () => ({ spoolsApi: { add: vi.fn(), getAll: vi.fn(), assignPrinter: vi.fn() } }))
vi.mock('@/api/nfc', () => ({ scanTag: vi.fn(), registerTag: vi.fn() }))
vi.mock('@/api/filaments', () => ({ filamentsApi: { getAll: vi.fn() } }))
vi.mock('@/api/printers', () => ({ printersApi: { getAll: vi.fn() } }))
vi.mock('@/api/locations', () => ({ locationsApi: { getAll: vi.fn(), add: vi.fn() } }))

// Mock the SpoolHub Agent hook: expose the tag callback so tests can fire scans,
// and let each test control the reader state.
let agentState = 'ready'
let fireTagScan: ((uid: string) => void) | null = null
vi.mock('@/hooks/useAgentNfc', () => ({
  useAgentNfc: (onTagFound: (uid: string) => void) => {
    fireTagScan = onTagFound
    return {
      state: agentState,
      readerName: 'ACS ACR122U',
      reload: vi.fn(),
      dismissInstallPrompt: vi.fn(),
      disconnect: vi.fn(),
    }
  },
}))

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
  printerId: null,
  printerName: null,
  amsSlot: null,
  price: null,
  stockLocation: null,
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

// From the pick step: choose brand + material, then click the filament card
async function selectFilament() {
  await waitFor(() => screen.getByText('Select brand…'))
  fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
  await waitFor(() => expect(screen.getByDisplayValue('Select material…')).not.toBeDisabled())
  fireEvent.change(screen.getByDisplayValue('Select material…'), { target: { value: 'PLA' } })
  await waitFor(() => screen.getByText('Jade White', { selector: 'div' }))
  fireEvent.click(screen.getByText('Jade White', { selector: 'div' }))
  await waitFor(() => screen.getByRole('button', { name: /Add spool/ }))
}

function mockDefaults() {
  vi.clearAllMocks()
  agentState = 'ready'
  fireTagScan = null
  vi.mocked(filamentsApi.getAll).mockResolvedValue([MOCK_FILAMENT])
  vi.mocked(printersApi.getAll).mockResolvedValue([])
  vi.mocked(spoolsApi.getAll).mockResolvedValue([])
  vi.mocked(locationsApi.getAll).mockResolvedValue([])
  vi.mocked(scanTag).mockResolvedValue({ status: 'unknown', tagUid: '', spool: null, message: null })
}

describe('AddSpoolPage — choose step', () => {
  beforeEach(mockDefaults)

  it('shows the NFC and manual choice cards', () => {
    renderPage()
    expect(screen.getByText('Scan NFC tag')).toBeInTheDocument()
    expect(screen.getByText('Enter manually')).toBeInTheDocument()
  })

  it('shows the scan step listening on the reader when NFC is chosen', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Scan NFC tag'))
    await waitFor(() => expect(screen.getByText('Listening for tag…')).toBeInTheDocument())
  })

  it('shows the filament pick step when manual is chosen', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Enter manually'))
    await waitFor(() => expect(screen.getByText('Select brand…')).toBeInTheDocument())
  })

  it('returns to the choose step when back is clicked in the manual pick step', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Enter manually'))
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByText('Enter manually')).toBeInTheDocument())
  })

  it('returns to the scan step when back is clicked in the NFC pick step', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Scan NFC tag'))
    await waitFor(() => expect(fireTagScan).not.toBeNull())
    await act(async () => { fireTagScan!('04:AA:BB:CC') })
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByText('Listening for tag…')).toBeInTheDocument())
  })
})

describe('AddSpoolPage — scan step (real reader via agent)', () => {
  beforeEach(mockDefaults)

  it('shows the no-reader help when the agent reports no reader', async () => {
    agentState = 'no-reader'
    renderPage()
    fireEvent.click(screen.getByText('Scan NFC tag'))
    await waitFor(() => expect(screen.getByText('No NFC reader detected')).toBeInTheDocument())
  })

  it('looks up a scanned tag and moves to pick for an unknown tag', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Scan NFC tag'))
    await waitFor(() => expect(fireTagScan).not.toBeNull())
    await act(async () => { fireTagScan!('04:AA:BB:CC') })
    await waitFor(() => expect(scanTag).toHaveBeenCalledWith('04:AA:BB:CC'))
    expect(screen.getByText(/will be written/)).toBeInTheDocument()
  })

  it('navigates to the spool when the scanned tag is already registered', async () => {
    vi.mocked(scanTag).mockResolvedValue({ status: 'found', tagUid: '04:AA:BB:CC', spool: createdSpool, message: null })
    renderPage()
    fireEvent.click(screen.getByText('Scan NFC tag'))
    await waitFor(() => expect(fireTagScan).not.toBeNull())
    await act(async () => { fireTagScan!('04:AA:BB:CC') })
    await waitFor(() => screen.getByText('Spool detail'))
  })

  it('moves to pick with the NFC badge when tagUid arrives via URL', async () => {
    renderPage('/spools/add/nfctag?tagUid=04:AA:BB:CC')
    await waitFor(() => expect(scanTag).toHaveBeenCalledWith('04:AA:BB:CC'))
    await waitFor(() => expect(screen.getByText(/will be written/)).toBeInTheDocument())
  })
})

describe('AddSpoolPage — form', () => {
  beforeEach(mockDefaults)

  it('shows filament cards after selecting brand and material', async () => {
    renderPage('/spools/add/manual')
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
    await waitFor(() => expect(screen.getByDisplayValue('Select material…')).not.toBeDisabled())
    fireEvent.change(screen.getByDisplayValue('Select material…'), { target: { value: 'PLA' } })
    await waitFor(() => screen.getByText('Jade White', { selector: 'div' }))
    expect(screen.getByText('Jade White', { selector: 'div' })).toBeInTheDocument()
  })

  it('shows the details form after clicking a filament card', async () => {
    renderPage('/spools/add/manual')
    await selectFilament()
    expect(screen.getByRole('button', { name: /Add spool/ })).toBeInTheDocument()
  })

  it('calls spoolsApi.add with correct data on submit', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Add spool/ }))
    await waitFor(() => expect(spoolsApi.add).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'Bambu Lab',
      material: 'PLA',
      colorName: 'Jade White',
      initialWeightG: 1000,
    })))
  })

  it('does not call registerTag in manual mode', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Add spool/ }))
    await waitFor(() => expect(spoolsApi.add).toHaveBeenCalled())
    expect(registerTag).not.toHaveBeenCalled()
  })

  it('registers the scanned tag against the created spool', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    vi.mocked(registerTag).mockResolvedValue(undefined)
    renderPage()
    fireEvent.click(screen.getByText('Scan NFC tag'))
    await waitFor(() => expect(fireTagScan).not.toBeNull())
    await act(async () => { fireTagScan!('04:AA:BB:CC') })
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Add spool/ }))
    await waitFor(() => expect(registerTag).toHaveBeenCalledWith('04:AA:BB:CC', 'spool-999'))
  })

  it('navigates straight to /spools after saving, without a confirmation screen', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Add spool/ }))
    await waitFor(() => screen.getByText('Spools list'))
    expect(screen.queryByText('Spool added')).not.toBeInTheDocument()
  })
})
