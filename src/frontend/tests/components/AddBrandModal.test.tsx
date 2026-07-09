import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddBrandModal from '@/components/AddBrandModal'
import * as brandsModule from '@/api/brands'

vi.mock('@/api/brands', () => ({
  brandsApi: {
    searchOfd: vi.fn(),
    add: vi.fn(),
  },
}))

const mockBrandsApi = brandsModule.brandsApi as {
  searchOfd: ReturnType<typeof vi.fn>
  add: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockBrandsApi.searchOfd.mockResolvedValue([])
  mockBrandsApi.add.mockResolvedValue({
    id: 'new-id',
    name: 'Bambu Lab',
    domain: 'bambulab.com',
    ofdSlug: 'bambu_lab',
    createdAt: new Date().toISOString(),
  })
})

function renderModal(onClose = vi.fn(), onAdded = vi.fn(), existingSlugs = new Set<string>()) {
  return { onClose, onAdded, ...render(<AddBrandModal existingSlugs={existingSlugs} onClose={onClose} onAdded={onAdded} />) }
}

describe('AddBrandModal', () => {
  it('renders the modal title', () => {
    renderModal()
    expect(screen.getByRole('heading', { name: 'Add Brand' })).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when X button is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: '' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('Add Brand button is disabled when no brand is selected', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Add Brand' })).toBeDisabled()
  })

  it('shows search results when query is typed', async () => {
    mockBrandsApi.searchOfd.mockResolvedValue([
      { name: 'Bambu Lab', slug: 'bambu_lab', materialCount: 5 },
    ])
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('e.g. Bambu Lab'), { target: { value: 'bambu' } })
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument(), { timeout: 1000 })
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('5 materials')).toBeInTheDocument()
  })

  it('enables Add Brand button after selecting a result', async () => {
    mockBrandsApi.searchOfd.mockResolvedValue([
      { name: 'Bambu Lab', slug: 'bambu_lab', materialCount: 5 },
    ])
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('e.g. Bambu Lab'), { target: { value: 'bambu' } })
    await waitFor(() => screen.getByRole('listbox'))
    fireEvent.click(screen.getByText('Bambu Lab'))
    expect(screen.getByRole('button', { name: 'Add Brand' })).not.toBeDisabled()
  })

  it('calls brandsApi.add with correct data on submit', async () => {
    mockBrandsApi.searchOfd.mockResolvedValue([
      { name: 'Bambu Lab', slug: 'bambu_lab', materialCount: 5 },
    ])
    const { onAdded, onClose } = renderModal()
    fireEvent.change(screen.getByPlaceholderText('e.g. Bambu Lab'), { target: { value: 'bambu' } })
    await waitFor(() => screen.getByRole('listbox'))
    fireEvent.click(screen.getByText('Bambu Lab'))
    fireEvent.click(screen.getByRole('button', { name: 'Add Brand' }))
    await waitFor(() => expect(mockBrandsApi.add).toHaveBeenCalledWith({
      name: 'Bambu Lab',
      domain: expect.any(String),
      ofdSlug: 'bambu_lab',
    }))
    expect(onAdded).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('marks already-added brands in results and keeps Add Brand disabled', async () => {
    mockBrandsApi.searchOfd.mockResolvedValue([
      { name: 'Bambu Lab', slug: 'bambu_lab', materialCount: 5 },
    ])
    renderModal(vi.fn(), vi.fn(), new Set(['bambu_lab']))
    fireEvent.change(screen.getByPlaceholderText('e.g. Bambu Lab'), { target: { value: 'bambu' } })
    await waitFor(() => screen.getByRole('listbox'))
    expect(screen.getByText('Already added')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Brand' })).toBeDisabled()
  })

  it('shows error when no brand selected and form submitted', async () => {
    renderModal()
    // Directly submit the form without selecting a brand
    const submitBtn = screen.getByRole('button', { name: 'Add Brand' })
    // Button is disabled so we simulate form submit via the form element
    const form = submitBtn.closest('form')!
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
