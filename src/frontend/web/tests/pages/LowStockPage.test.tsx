import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LowStockPage from '@/pages/LowStockPage'
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
  ...overrides,
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/spools/low']}>
      <Routes>
        <Route path="/spools/low" element={<LowStockPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('LowStockPage', () => {
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
    await waitFor(() => screen.getByText('Low Stock'))
    expect(screen.getByText('Low Stock')).toBeInTheDocument()
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

  it('shows empty state when no spools are low', async () => {
    vi.mocked(spoolsApi.getAll).mockResolvedValue([makeSpool()])
    renderPage()
    await waitFor(() => screen.getByText('No spools are running low.'))
  })

  it('shows low stock spools only', async () => {
    const lowSpool = makeSpool({ brand: 'LowBrand', currentWeightG: 50, lowStockThresholdG: 100 })
    const okSpool = makeSpool({ brand: 'OkBrand', currentWeightG: 750, lowStockThresholdG: 100 })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([lowSpool, okSpool])
    renderPage()
    await waitFor(() => screen.getByText('LowBrand'))
    expect(screen.getByText('LowBrand')).toBeInTheDocument()
    expect(screen.queryByText('OkBrand')).not.toBeInTheDocument()
  })

  it('shows low stock spool on the page', async () => {
    const lowSpool = makeSpool({ brand: 'LowSpool', currentWeightG: 50, lowStockThresholdG: 100 })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([lowSpool])
    renderPage()
    await waitFor(() => screen.getByText('LowSpool'))
    expect(screen.getByText('LowSpool')).toBeInTheDocument()
  })

  it('sorts most critical first (lowest remaining % first)', async () => {
    const critical = makeSpool({ brand: 'Critical', currentWeightG: 10, initialWeightG: 1000, lowStockThresholdG: 100 })
    const low = makeSpool({ brand: 'Low', currentWeightG: 80, initialWeightG: 1000, lowStockThresholdG: 100 })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([low, critical])
    renderPage()
    await waitFor(() => screen.getByText('Critical'))
    const cards = screen.getAllByRole('link')
    expect(cards[0]).toHaveAttribute('href', `/spools/${critical.id}`)
    expect(cards[1]).toHaveAttribute('href', `/spools/${low.id}`)
  })

  it('filters by search query', async () => {
    const prusa = makeSpool({ brand: 'Prusa', currentWeightG: 50, lowStockThresholdG: 100 })
    const bambu = makeSpool({ brand: 'Bambu', currentWeightG: 50, lowStockThresholdG: 100 })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([prusa, bambu])
    renderPage()
    await waitFor(() => screen.getByText('Prusa'))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'prusa' } })
    await waitFor(() => expect(screen.queryByText('Bambu')).not.toBeInTheDocument())
    expect(screen.getByText('Prusa')).toBeInTheDocument()
  })

  it('shows no-match message when search has no results', async () => {
    const lowSpool = makeSpool({ brand: 'Bambu', currentWeightG: 50, lowStockThresholdG: 100 })
    vi.mocked(spoolsApi.getAll).mockResolvedValue([lowSpool])
    renderPage()
    await waitFor(() => screen.getByText('Bambu'))
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'xyz' } })
    await waitFor(() => screen.getByText('No spools match your search or filters.'))
  })

  it('shows pagination when results exceed per-page limit', async () => {
    const manyLow = Array.from({ length: 20 }, (_, i) =>
      makeSpool({ brand: `Brand${i}`, currentWeightG: 50, lowStockThresholdG: 100 })
    )
    vi.mocked(spoolsApi.getAll).mockResolvedValue(manyLow)
    renderPage()
    await waitFor(() => screen.getByText(/Showing/))
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
  })
})
