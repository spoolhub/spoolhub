import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddSpoolProfilePage from '@/pages/AddSpoolProfilePage'
import { withNotificationsProvider } from '../utils/withNotificationsProvider'

vi.mock('@/api/filaments', () => ({ filamentsApi: { getAll: vi.fn(), refresh: vi.fn() } }))
vi.mock('@/api/brands', () => ({ brandsApi: { getAll: vi.fn(), searchOfd: vi.fn(), add: vi.fn() } }))
vi.mock('@/api/spoolProfiles', () => ({ spoolProfilesApi: { add: vi.fn() } }))

import { filamentsApi } from '@/api/filaments'
import { brandsApi } from '@/api/brands'

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

function renderPage() {
  return render(
    withNotificationsProvider(
      <MemoryRouter initialEntries={['/spool-profiles/new']}>
        <AddSpoolProfilePage />
      </MemoryRouter>,
    ),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(filamentsApi.getAll).mockResolvedValue([MOCK_FILAMENT])
  vi.mocked(filamentsApi.refresh).mockResolvedValue(undefined)
  vi.mocked(brandsApi.getAll).mockResolvedValue([])
  vi.mocked(brandsApi.searchOfd).mockResolvedValue([])
})

describe('AddSpoolProfilePage — brand picker', () => {
  it('shows the shared brand picker with filament counts', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Select brand…'))
    expect(screen.getByRole('option', { name: 'Bambu Lab (1 filament)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '+ Add brand' })).toBeInTheDocument()
  })

  it('opens OFD search from the add-brand option', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: '__add__' } })
    expect(screen.getByPlaceholderText('Search Open Filament Database…')).toBeInTheDocument()
  })

  it('enables material select after choosing a brand', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Select brand…'))
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
    await waitFor(() => expect(screen.getByDisplayValue('Select material…')).not.toBeDisabled())
    fireEvent.change(screen.getByDisplayValue('Select material…'), { target: { value: 'PLA' } })
    await waitFor(() => screen.getByText('Jade White', { selector: 'div' }))
  })
})
