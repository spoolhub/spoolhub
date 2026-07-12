import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BrandPickerField from '@/components/BrandPickerField'
import type { FilamentProfile } from '@/types/filament'

vi.mock('@/api/brands', () => ({
  brandsApi: {
    getAll: vi.fn(),
    searchOfd: vi.fn(),
    add: vi.fn(),
  },
}))

vi.mock('@/api/filaments', () => ({
  filamentsApi: {
    getAll: vi.fn(),
    refresh: vi.fn(),
  },
}))

import { brandsApi } from '@/api/brands'
import { filamentsApi } from '@/api/filaments'

const MOCK_FILAMENT: FilamentProfile = {
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

function renderPicker(props: Partial<Parameters<typeof BrandPickerField>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn()
  const onFilamentsChange = props.onFilamentsChange ?? vi.fn()
  return {
    onChange,
    onFilamentsChange,
    ...render(
      <BrandPickerField
        value={props.value ?? ''}
        onChange={onChange}
        filaments={props.filaments ?? [MOCK_FILAMENT]}
        onFilamentsChange={onFilamentsChange}
      />,
    ),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(brandsApi.getAll).mockResolvedValue([])
  vi.mocked(brandsApi.searchOfd).mockResolvedValue([])
  vi.mocked(brandsApi.add).mockResolvedValue({
    id: 'brand-1',
    name: 'eSUN',
    domain: '',
    ofdSlug: 'esun',
    createdAt: '2026-01-01T00:00:00Z',
  })
  vi.mocked(filamentsApi.refresh).mockResolvedValue(undefined)
  vi.mocked(filamentsApi.getAll).mockResolvedValue([MOCK_FILAMENT])
})

describe('BrandPickerField', () => {
  it('lists synced brands with filament counts and an add-brand option', () => {
    renderPicker()
    expect(screen.getByRole('option', { name: 'Bambu Lab (1 filament)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '+ Add brand' })).toBeInTheDocument()
  })

  it('calls onChange when an existing brand is selected', () => {
    const { onChange } = renderPicker()
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: 'Bambu Lab' } })
    expect(onChange).toHaveBeenCalledWith('Bambu Lab')
  })

  it('opens OFD search when add brand is chosen', () => {
    renderPicker()
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: '__add__' } })
    expect(screen.getByPlaceholderText('Search Open Filament Database…')).toBeInTheDocument()
  })

  it('shows OFD search results with material counts', async () => {
    vi.mocked(brandsApi.searchOfd).mockResolvedValue([
      { name: 'eSUN', slug: 'esun', materialCount: 42 },
    ])
    renderPicker()
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: '__add__' } })
    fireEvent.change(screen.getByPlaceholderText('Search Open Filament Database…'), { target: { value: 'esun' } })
    await waitFor(() => expect(brandsApi.searchOfd).toHaveBeenCalledWith('esun', expect.any(AbortSignal)))
    expect(screen.getByRole('button', { name: /42 materials/ })).toBeInTheDocument()
  })

  it('adds and syncs a brand, then selects it when filaments arrive', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(brandsApi.searchOfd).mockResolvedValue([
      { name: 'eSUN', slug: 'esun', materialCount: 42 },
    ])
    vi.mocked(filamentsApi.getAll).mockResolvedValue([
      MOCK_FILAMENT,
      { ...MOCK_FILAMENT, brand: 'eSUN', filamentName: 'PLA+', colorName: 'Blue' },
    ])
    const { onChange, onFilamentsChange } = renderPicker()

    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: '__add__' } })
    fireEvent.change(screen.getByPlaceholderText('Search Open Filament Database…'), { target: { value: 'esun' } })
    await waitFor(() => screen.getByRole('button', { name: /42 materials/ }))
    fireEvent.click(screen.getByRole('button', { name: /42 materials/ }))

    await waitFor(() => expect(brandsApi.add).toHaveBeenCalledWith({ name: 'eSUN', domain: '', ofdSlug: 'esun' }))
    expect(filamentsApi.refresh).toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(2500) })
    await waitFor(() => expect(onFilamentsChange).toHaveBeenCalled())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('eSUN'))
    vi.useRealTimers()
  })

  it('shows already-added for duplicate OFD brands', async () => {
    vi.mocked(brandsApi.getAll).mockResolvedValue([
      { id: 'b1', name: 'eSUN', domain: '', ofdSlug: 'esun', createdAt: '2026-01-01T00:00:00Z' },
    ])
    vi.mocked(brandsApi.searchOfd).mockResolvedValue([
      { name: 'eSUN', slug: 'esun', materialCount: 42 },
    ])
    renderPicker()
    fireEvent.change(screen.getByDisplayValue('Select brand…'), { target: { value: '__add__' } })
    fireEvent.change(screen.getByPlaceholderText('Search Open Filament Database…'), { target: { value: 'esun' } })
    await waitFor(() => screen.getByText('Already added'))
    expect(screen.getByRole('button', { name: /Already added/ })).toBeDisabled()
  })
})
