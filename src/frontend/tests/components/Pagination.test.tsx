import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Pagination from '@/components/Pagination'

function renderPagination(overrides = {}) {
  const props = { total: 100, page: 1, perPage: 30, onPageChange: vi.fn(), onPerPageChange: vi.fn(), ...overrides }
  return { ...render(<Pagination {...props} />), ...props }
}

describe('Pagination', () => {
  it('renders showing text', () => {
    renderPagination()
    expect(screen.getByText('Showing 1–30 of 100 spools')).toBeInTheDocument()
  })

  it('renders correct range on page 2', () => {
    renderPagination({ page: 2 })
    expect(screen.getByText('Showing 31–60 of 100 spools')).toBeInTheDocument()
  })

  it('renders per page selector', () => {
    renderPagination()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('calls onPageChange when next clicked', () => {
    const onPageChange = vi.fn()
    renderPagination({ onPageChange })
    fireEvent.click(screen.getByLabelText('Next page'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange when prev clicked', () => {
    const onPageChange = vi.fn()
    renderPagination({ page: 3, onPageChange })
    fireEvent.click(screen.getByLabelText('Previous page'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables prev on first page', () => {
    renderPagination({ page: 1 })
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
  })

  it('disables next on last page', () => {
    renderPagination({ page: 4, total: 100, perPage: 30 })
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('calls onPerPageChange when selector changes', () => {
    const onPerPageChange = vi.fn()
    renderPagination({ onPerPageChange })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '12' } })
    expect(onPerPageChange).toHaveBeenCalledWith(12)
  })

  it('renders nothing when total is 0', () => {
    const { container } = render(<Pagination total={0} page={1} perPage={30} onPageChange={vi.fn()} onPerPageChange={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when all items fit on one page', () => {
    const { container } = render(<Pagination total={5} page={1} perPage={30} onPageChange={vi.fn()} onPerPageChange={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  // ── Bug fixes ──────────────────────────────────────────────────

  it('clamps page: calls onPageChange with last valid page when page exceeds totalPages', () => {
    const onPageChange = vi.fn()
    // page=5, total=15, perPage=10 → totalPages=2, should clamp to 2
    renderPagination({ total: 15, page: 5, perPage: 10, onPageChange })
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('does not call onPageChange when changing per-page (parent owns the page reset)', () => {
    const onPageChange = vi.fn()
    renderPagination({ onPageChange })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '12' } })
    expect(onPageChange).not.toHaveBeenCalled()
  })
})
