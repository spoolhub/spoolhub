import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilamentFilterDropdown from '@/components/FilamentFilterDropdown'
import { DEFAULT_FILAMENT_FILTERS } from '@/types/filamentFilters'
import type { FilamentFilters } from '@/types/filamentFilters'

const materials = ['PLA', 'PETG', 'ABS']
const colors = [{ hex: '#FFFFFF', name: 'White' }, { hex: '#000000', name: 'Black' }]

function renderDropdown(filters: FilamentFilters = DEFAULT_FILAMENT_FILTERS, onChange = vi.fn()) {
  return { onChange, ...render(
    <FilamentFilterDropdown
      allMaterials={materials}
      allColors={colors}
      filters={filters}
      onChange={onChange}
    />
  )}
}

describe('FilamentFilterDropdown', () => {
  it('renders the filter button', () => {
    renderDropdown()
    expect(screen.getByLabelText('Filter filaments')).toBeInTheDocument()
  })

  it('dropdown is closed by default', () => {
    renderDropdown()
    expect(screen.queryByText('Filters')).not.toBeInTheDocument()
  })

  it('opens on button click', () => {
    renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter filaments'))
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('shows material pills when open', () => {
    renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter filaments'))
    expect(screen.getByText('PLA')).toBeInTheDocument()
    expect(screen.getByText('PETG')).toBeInTheDocument()
    expect(screen.getByText('ABS')).toBeInTheDocument()
  })

  it('shows color swatches when open', () => {
    renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter filaments'))
    expect(screen.getByLabelText('White')).toBeInTheDocument()
    expect(screen.getByLabelText('Black')).toBeInTheDocument()
  })

  it('shows hide discontinued checkbox when open', () => {
    renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter filaments'))
    expect(screen.getByLabelText('Hide discontinued')).toBeInTheDocument()
  })

  it('calls onChange with selected material', () => {
    const { onChange } = renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter filaments'))
    fireEvent.click(screen.getByText('PLA'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ materials: ['PLA'] }))
  })

  it('calls onChange when hide discontinued is toggled', () => {
    const { onChange } = renderDropdown()
    fireEvent.click(screen.getByLabelText('Filter filaments'))
    fireEvent.click(screen.getByLabelText('Hide discontinued'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hideDiscontinued: true }))
  })

  it('shows active count badge when filters applied', () => {
    renderDropdown({ ...DEFAULT_FILAMENT_FILTERS, materials: ['PLA', 'PETG'] })
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows Clear all button when filters active', () => {
    renderDropdown({ ...DEFAULT_FILAMENT_FILTERS, materials: ['PLA'] })
    fireEvent.click(screen.getByLabelText('Filter filaments'))
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('clear all resets filters', () => {
    const { onChange } = renderDropdown({ ...DEFAULT_FILAMENT_FILTERS, materials: ['PLA'] })
    fireEvent.click(screen.getByLabelText('Filter filaments'))
    fireEvent.click(screen.getByText('Clear all'))
    expect(onChange).toHaveBeenCalledWith(DEFAULT_FILAMENT_FILTERS)
  })
})
