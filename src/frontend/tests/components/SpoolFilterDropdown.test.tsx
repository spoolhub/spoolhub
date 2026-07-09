import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SpoolFilterDropdown from '@/components/SpoolFilterDropdown'
import { DEFAULT_FILTERS } from '@/types/spoolFilters'
import type { SpoolFilters } from '@/types/spoolFilters'

const materials = ['PLA', 'PETG', 'ABS']
const brands = ['Bambu Lab', 'Polymaker']
const colors = [{ hex: '#FFFFFF', name: 'Jade White' }, { hex: '#1A1A2E', name: 'Galaxy Black' }]

function renderDropdown(filters: SpoolFilters = DEFAULT_FILTERS, onChange = vi.fn()) {
  return render(
    <SpoolFilterDropdown
      allMaterials={materials}
      allBrands={brands}
      allColors={colors}
      filters={filters}
      onChange={onChange}
    />
  )
}

describe('SpoolFilterDropdown', () => {
  it('renders the filter button', () => {
    renderDropdown()
    expect(screen.getByLabelText('Filter spools')).toBeInTheDocument()
  })

  it('dropdown is closed by default', () => {
    renderDropdown()
    expect(screen.queryByText('Filters')).not.toBeInTheDocument()
  })

  it('opens on button click', () => {
    renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter spools'))
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('shows material pills when open', () => {
    renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter spools'))
    expect(screen.getByText('PLA')).toBeInTheDocument()
    expect(screen.getByText('PETG')).toBeInTheDocument()
    expect(screen.getByText('ABS')).toBeInTheDocument()
  })

  it('calls onChange when material pill clicked', () => {
    const onChange = vi.fn()
    renderDropdown(DEFAULT_FILTERS, onChange)
    fireEvent.click(screen.getByLabelText('Filter spools'))
    fireEvent.click(screen.getByText('PLA'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ materials: ['PLA'] }))
  })

  it('calls onChange when Active only checked', () => {
    const onChange = vi.fn()
    renderDropdown(DEFAULT_FILTERS, onChange)
    fireEvent.click(screen.getByLabelText('Filter spools'))
    fireEvent.click(screen.getByLabelText('Active only'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ activeOnly: true }))
  })

  it('calls onChange when Low stock only checked', () => {
    const onChange = vi.fn()
    renderDropdown(DEFAULT_FILTERS, onChange)
    fireEvent.click(screen.getByLabelText('Filter spools'))
    fireEvent.click(screen.getByLabelText('Low stock only'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lowStockOnly: true }))
  })

  it('shows active filter count badge', () => {
    const filters = { ...DEFAULT_FILTERS, materials: ['PLA'], activeOnly: true }
    renderDropdown(filters)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows Clear all when filters are active', () => {
    const filters = { ...DEFAULT_FILTERS, activeOnly: true }
    renderDropdown(filters)
    fireEvent.click(screen.getByLabelText('Filter spools'))
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('shows color swatches when open', () => {
    renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter spools'))
    expect(screen.getByLabelText('Jade White')).toBeInTheDocument()
    expect(screen.getByLabelText('Galaxy Black')).toBeInTheDocument()
  })

  it('calls onChange when color swatch clicked', () => {
    const onChange = vi.fn()
    renderDropdown(DEFAULT_FILTERS, onChange)
    fireEvent.click(screen.getByLabelText('Filter spools'))
    fireEvent.click(screen.getByLabelText('Jade White'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ colors: ['#FFFFFF'] }))
  })

  it('calls onChange with DEFAULT_FILTERS when Clear all clicked', () => {
    const onChange = vi.fn()
    const filters = { ...DEFAULT_FILTERS, activeOnly: true }
    renderDropdown(filters, onChange)
    fireEvent.click(screen.getByLabelText('Filter spools'))
    fireEvent.click(screen.getByText('Clear all'))
    expect(onChange).toHaveBeenCalledWith(DEFAULT_FILTERS)
  })
})
