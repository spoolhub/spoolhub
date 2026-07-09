import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddSpoolPage from '@/pages/AddSpoolPage'

vi.mock('@/api/spools', () => ({ spoolsApi: { add: vi.fn(), getAll: vi.fn(), assignPrinter: vi.fn() } }))
vi.mock('@/api/spoolProfiles', () => ({ spoolProfilesApi: { getAll: vi.fn() } }))
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
import { spoolProfilesApi } from '@/api/spoolProfiles'
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

const MOCK_PROFILE = {
  id: 'profile-1',
  name: 'Bambu PLA Jade White',
  brand: 'Bambu Lab',
  material: 'PLA',
  colorName: 'Jade White',
  colorHex: '#E8E8E8',
  initialWeightG: 1000,
  spoolWeightG: 250,
  lowStockThresholdG: 120,
  density: 1.24,
  diameterTolerance: 1.75,
  extruderMin: 190,
  extruderMax: 230,
  bedMin: 35,
  bedMax: 60,
  price: 29.99,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  spoolCount: 3,
}

const MOCK_LOCATION = {
  id: 'loc-1',
  name: 'Shelf A1',
  type: 'shelf' as const,
  capacity: 12,
  humidity: null,
  createdAt: '2026-01-01T00:00:00Z',
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

const MOCK_PRINTER_AMS = {
  id: 'printer-1', name: 'X1 Carbon', brand: 'Bambu Lab', model: 'X1C',
  serialNumber: null, ipAddress: '', port: null, protocol: 'lan', hasAms: true,
  createdAt: '2026-01-01T00:00:00Z',
  tray1Spool: { id: 's1', brand: 'Bambu Lab', material: 'PLA', colorName: 'Galaxy Black', colorHex: '#222222' },
  tray2Spool: null, tray3Spool: null, tray4Spool: null, extraSpool: null,
}

const MOCK_PRINTER_NO_AMS = {
  ...MOCK_PRINTER_AMS, id: 'printer-2', name: 'Ender 3', brand: 'Creality', model: 'Ender-3',
  hasAms: false, tray1Spool: null,
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
  // Placement is required before save — pick a storage location
  fireEvent.change(screen.getByDisplayValue('Select location…'), { target: { value: 'Shelf A1' } })
}

function mockDefaults() {
  vi.clearAllMocks()
  agentState = 'ready'
  fireTagScan = null
  vi.mocked(filamentsApi.getAll).mockResolvedValue([MOCK_FILAMENT])
  vi.mocked(spoolProfilesApi.getAll).mockResolvedValue([MOCK_PROFILE])
  vi.mocked(printersApi.getAll).mockResolvedValue([])
  vi.mocked(spoolsApi.getAll).mockResolvedValue([])
  vi.mocked(locationsApi.getAll).mockResolvedValue([MOCK_LOCATION])
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
    await waitFor(() => expect(screen.getByText('Tap a tag to scan')).toBeInTheDocument())
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
    await waitFor(() => expect(screen.getByText('Tap a tag to scan')).toBeInTheDocument())
  })
})

describe('AddSpoolPage — scan step (real reader via agent)', () => {
  beforeEach(mockDefaults)

  it('shows the no-reader help when the agent reports no reader', async () => {
    agentState = 'no-reader'
    renderPage()
    fireEvent.click(screen.getByText('Scan NFC tag'))
    await waitFor(() => expect(screen.getByText(/Agent connected — no reader detected/)).toBeInTheDocument())
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

describe('AddSpoolPage — profiles and catalog', () => {
  beforeEach(mockDefaults)

  it('shows saved profiles by default with a segmented Saved profiles / Catalog control', async () => {
    renderPage('/spools/add/manual')
    await waitFor(() => expect(screen.getByText('Jade White', { selector: 'div' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Saved profiles' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Catalog' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Bambu Lab · PLA', { selector: 'div' })).toBeInTheDocument()
  })

  it('switches to catalog filaments when a material is selected', async () => {
    renderPage('/spools/add/manual')
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
    await waitFor(() => expect(screen.getByDisplayValue('Select material…')).not.toBeDisabled())
    fireEvent.change(screen.getByDisplayValue('Select material…'), { target: { value: 'PLA' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Catalog' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByText('1 filament')).toBeInTheDocument()
    expect(screen.queryByText('Bambu Lab · PLA', { selector: 'div' })).not.toBeInTheDocument()
  })

  it('returns to saved profiles when the Saved profiles segment is clicked', async () => {
    renderPage('/spools/add/manual')
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
    fireEvent.change(screen.getByDisplayValue('Select material…'), { target: { value: 'PLA' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Catalog' })).toHaveAttribute('aria-pressed', 'true'))
    fireEvent.click(screen.getByRole('button', { name: 'Saved profiles' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved profiles' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByText('Bambu Lab · PLA', { selector: 'div' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Select material…')).toHaveValue('')
  })

  it('opens the details form with profile data when a saved profile card is clicked', async () => {
    renderPage('/spools/add/manual')
    await waitFor(() => screen.getByText('Jade White', { selector: 'div' }))
    fireEvent.click(screen.getByText('Jade White', { selector: 'div' }))
    await waitFor(() => screen.getByRole('button', { name: /Add spool/ }))
    expect(screen.getByDisplayValue('190')).toBeInTheDocument()
    expect(screen.getByDisplayValue('230')).toBeInTheDocument()
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

  it('disables Add spool until a storage location or printer is chosen', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
    await waitFor(() => expect(screen.getByDisplayValue('Select material…')).not.toBeDisabled())
    fireEvent.change(screen.getByDisplayValue('Select material…'), { target: { value: 'PLA' } })
    await waitFor(() => screen.getByText('Jade White', { selector: 'div' }))
    fireEvent.click(screen.getByText('Jade White', { selector: 'div' }))
    const addBtn = await screen.findByRole('button', { name: /Add spool/ })
    expect(addBtn).toBeDisabled()
    fireEvent.click(addBtn)
    expect(spoolsApi.add).not.toHaveBeenCalled()
    fireEvent.change(screen.getByDisplayValue('Select location…'), { target: { value: 'Shelf A1' } })
    expect(addBtn).not.toBeDisabled()
  })

  it('requires an AMS slot when the chosen printer has an AMS, and shows occupied slots', async () => {
    vi.mocked(printersApi.getAll).mockResolvedValue([MOCK_PRINTER_AMS, MOCK_PRINTER_NO_AMS])
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByText('Loaded in printer'))
    const addBtn = screen.getByRole('button', { name: /Add spool/ })
    expect(addBtn).toBeDisabled()
    fireEvent.change(screen.getByDisplayValue('Select printer…'), { target: { value: 'printer-1' } })
    await waitFor(() => screen.getByText('Choose AMS slot'))
    // Printer picked but no slot yet — still blocked
    expect(addBtn).toBeDisabled()
    // Slot 1 is occupied and shows its assigned spool; clicking it doesn't select
    fireEvent.click(screen.getByText('Galaxy Black'))
    expect(addBtn).toBeDisabled()
    // Picking a free slot unblocks the save
    fireEvent.click(screen.getAllByText('Empty')[0])
    expect(addBtn).not.toBeDisabled()
  })

  it('does not require a slot for a printer without an AMS', async () => {
    vi.mocked(printersApi.getAll).mockResolvedValue([MOCK_PRINTER_AMS, MOCK_PRINTER_NO_AMS])
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByText('Loaded in printer'))
    fireEvent.change(screen.getByDisplayValue('Select printer…'), { target: { value: 'printer-2' } })
    await waitFor(() => expect(screen.getByRole('button', { name: /Add spool/ })).not.toBeDisabled())
    expect(screen.queryByText('Choose AMS slot')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('warns when a non-AMS printer already has a spool loaded', async () => {
    const loadedPrinter = {
      ...MOCK_PRINTER_NO_AMS,
      extraSpool: { id: 's2', brand: 'Prusament', material: 'PETG', colorName: 'Orange', colorHex: '#ff7700' },
    }
    vi.mocked(printersApi.getAll).mockResolvedValue([loadedPrinter])
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByText('Loaded in printer'))
    fireEvent.change(screen.getByDisplayValue('Select printer…'), { target: { value: 'printer-2' } })
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('already has Orange loaded')
    // Still allowed to save — it's a warning, not a blocker
    expect(screen.getByRole('button', { name: /Add spool/ })).not.toBeDisabled()
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

  it('adds as many spools as the quantity field says', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /Add 10 spools/ }))
    await waitFor(() => expect(spoolsApi.add).toHaveBeenCalledTimes(10))
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

  it('shows the saving spinner, then navigates straight to /spools without a confirmation screen', async () => {
    vi.mocked(spoolsApi.add).mockResolvedValue(createdSpool)
    renderPage('/spools/add/manual')
    await selectFilament()
    fireEvent.click(screen.getByRole('button', { name: /Add spool/ }))
    await waitFor(() => expect(screen.getByText('Adding…')).toBeInTheDocument())
    await waitFor(() => screen.getByText('Spools list'), { timeout: 3000 })
    expect(screen.queryByText('Spool added')).not.toBeInTheDocument()
  })
})
