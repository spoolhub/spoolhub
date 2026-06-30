import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ActiveSpoolsPage from '@/pages/ActiveSpoolsPage'
import type { SpoolResponse } from '@/types/spool'

vi.mock('@/hooks/useNfcHub', () => ({ useNfcHub: vi.fn() }))

vi.mock('@/api/spools', () => ({
  spoolsApi: {
    getAll: vi.fn(),
  },
}))

import { spoolsApi } from '@/api/spools'

const makeSpool = (overrides: Partial<SpoolResponse> = {}): SpoolResponse => ({
  id: crypto.randomUUID(),
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
  ...overrides,
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/spools/active']}>
      <Routes>
        <Route path="/spools/active" element={<ActiveSpoolsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ActiveSpoolsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton initially', () => {
    vi.mocked(spoolsApi.getAll).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('shows page heading', async () => {
    vi.mocked(spoolsApi.getAll).mockResolvedValue([])
    renderPage()
    await waitFor(() => screen.getByText('Active Spools'))
    expect(screen.getByText('Active Spools')).toBeInTheDocument()
  })

  it('shows search bar', async () => {
    vi.mocked(spoolsApi.getAll).mockResolvedValue([])
    renderPage()
    await waitFor(() => screen.getByPlaceholderText(/search/i))
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('shows filter button', async () => {
    vi.mocked(spoolsApi.getAll).mockResolvedValue([])
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /filter/i }))
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument()
  })

  it('shows empty state when no spools are active', async () => {
    vi.mocked(spoolsApi.getAll).mockResolvedValue([makeSpool({ isActive: false })])
    renderPage()
    await waitFor(() => screen.getByText('No spools are currently active.'))
  })

  it('shows active spools only', async () => {
    const active = makeSpool({ brand: 'ActiveBrand', isActive: true })
    const inactive = makeSpool({ brand: 'InactiveBrand', isActive: false })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([active, inactive])
    renderPage()
    await waitFor(() => screen.getByText('ActiveBrand'))
    expect(screen.getByText('ActiveBrand')).toBeInTheDocument()
    expect(screen.queryByText('InactiveBrand')).not.toBeInTheDocument()
  })

  it('sorts by least remaining weight first', async () => {
    const heavy = makeSpool({ brand: 'Heavy', currentWeightG: 800, isActive: true })
    const light = makeSpool({ brand: 'Light', currentWeightG: 100, isActive: true })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([heavy, light])
    renderPage()
    await waitFor(() => screen.getByText('Light'))
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', `/spools/${light.id}`)
    expect(links[1]).toHaveAttribute('href', `/spools/${heavy.id}`)
  })

  it('filters by search query', async () => {
    const prusa = makeSpool({ brand: 'Prusa', isActive: true })
    const bambu = makeSpool({ brand: 'Bambu', isActive: true })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([prusa, bambu])
    renderPage()
    await waitFor(() => screen.getByText('Prusa'))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'prusa' } })
    await waitFor(() => expect(screen.queryByText('Bambu')).not.toBeInTheDocument())
    expect(screen.getByText('Prusa')).toBeInTheDocument()
  })

  it('shows no-match message when search has no results', async () => {
    const active = makeSpool({ brand: 'Bambu', isActive: true })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([active])
    renderPage()
    await waitFor(() => screen.getByText('Bambu'))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'xyz' } })
    await waitFor(() => screen.getByText('No spools match your search or filters.'))
  })

  it('shows pagination when results exceed per-page limit', async () => {
    const manyActive = Array.from({ length: 20 }, (_, i) =>
      makeSpool({ brand: `Brand${i}`, isActive: true })
    )
    vi.mocked(spoolsApi.getAll).mockResolvedValue(manyActive)
    renderPage()
    await waitFor(() => screen.getByText(/Showing/))
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
  })
})
