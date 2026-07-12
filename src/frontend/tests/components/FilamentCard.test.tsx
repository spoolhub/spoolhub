import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import FilamentCard from '@/components/FilamentCard'
import type { FilamentProfile } from '@/types/filament'

const base: FilamentProfile = {
  brand: 'Bambu Lab',
  filamentName: 'Basic PLA',
  material: 'PLA',
  density: 1.24,
  extruderMin: 190,
  extruderMax: 220,
  bedMin: 35,
  bedMax: 45,
  colorHex: '#FFFFFF',
  colorName: 'Jade White',
  diameterTolerance: 0.02,
  discontinued: false,
  dataSheetUrl: null,
  safetySheetUrl: null,
}

function render_(f: FilamentProfile) {
  return render(<FilamentCard filament={f} />, { wrapper: MemoryRouter })
}

describe('FilamentCard', () => {
  it('renders brand name', () => {
    render_(base)
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
  })

  it('renders material badge', () => {
    render_(base)
    expect(screen.getByText('PLA')).toBeInTheDocument()
  })

  it('renders color name when present', () => {
    render_(base)
    expect(screen.getByText('Jade White')).toBeInTheDocument()
  })

  it('renders filament name when color name is null', () => {
    render_({ ...base, colorName: null })
    expect(screen.getByText('Basic PLA')).toBeInTheDocument()
  })

  it('does not render temperature or density data', () => {
    render_(base)
    expect(screen.queryByText(/Extruder/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Bed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Density/i)).not.toBeInTheDocument()
  })

  it('links to /filaments/:brand/:colorName', () => {
    render_(base)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `/filaments/${encodeURIComponent(base.brand)}/${encodeURIComponent(base.colorName!)}`
    )
  })

  it('links using filamentName when colorName is null', () => {
    render_({ ...base, colorName: null })
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `/filaments/${encodeURIComponent(base.brand)}/${encodeURIComponent(base.filamentName)}`
    )
  })

  it('material tag button navigates to brand filaments page', () => {
    render_(base)
    expect(screen.getByLabelText(`View ${base.brand} filaments`)).toBeInTheDocument()
  })
})
