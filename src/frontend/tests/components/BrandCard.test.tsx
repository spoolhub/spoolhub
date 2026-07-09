import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BrandCard, { BrandLogo } from '@/components/BrandCard'
import type { BrandInfo } from '@/components/BrandCard'

const brand: BrandInfo = {
  id: 'brand-123',
  name: 'Bambu Lab',
  domain: 'bambulab.com',
  ofdSlug: 'bambu_lab',
  filamentCount: 42,
  spoolCount: 3,
  materials: ['PLA', 'PETG', 'ABS'],
  inStockMaterials: ['PLA'],
}

function renderCard(b: BrandInfo = brand, onSelect = vi.fn(), onSelectMaterial = vi.fn(), onDelete = vi.fn()) {
  return { onSelect, onSelectMaterial, onDelete, ...render(<BrandCard brand={b} onSelect={onSelect} onSelectMaterial={onSelectMaterial} onDelete={onDelete} />) }
}

describe('BrandCard', () => {
  // ── Content ───────────────────────────────────────────────────

  it('renders brand name', () => {
    renderCard()
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
  })

  it('renders brand logo img when domain is known', () => {
    renderCard()
    expect(screen.getByRole('img', { name: 'Bambu Lab' })).toHaveAttribute(
      'src', expect.stringContaining('bambulab.com')
    )
  })

  it('shows in-stock count when spoolCount > 0', () => {
    renderCard()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('in stock')).toBeInTheDocument()
  })

  it('hides in-stock section when spoolCount is 0', () => {
    renderCard({ ...brand, spoolCount: 0, inStockMaterials: [] })
    const el = screen.getByText('in stock').closest('div')
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders all material pills', () => {
    renderCard()
    expect(screen.getByText('PLA')).toBeInTheDocument()
    expect(screen.getByText('PETG')).toBeInTheDocument()
    expect(screen.getByText('ABS')).toBeInTheDocument()
  })

  it('renders all materials without truncation', () => {
    renderCard({ ...brand, materials: ['PLA', 'PETG', 'ABS', 'TPU', 'Nylon'] })
    expect(screen.getByText('TPU')).toBeInTheDocument()
    expect(screen.getByText('Nylon')).toBeInTheDocument()
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  // ── Select ────────────────────────────────────────────────────

  it('calls onSelect when brand button clicked', () => {
    const { onSelect } = renderCard()
    fireEvent.click(screen.getByText('Bambu Lab'))
    expect(onSelect).toHaveBeenCalledWith('Bambu Lab')
  })

  it('calls onSelectMaterial with brand and material when a material tag is clicked', () => {
    const { onSelectMaterial } = renderCard()
    fireEvent.click(screen.getByText('PLA'))
    expect(onSelectMaterial).toHaveBeenCalledWith('Bambu Lab', 'PLA')
  })

  // ── Delete confirmation ───────────────────────────────────────

  it('disables delete button when brand has spools in stock', () => {
    renderCard()
    expect(screen.getByLabelText('Remove all spools before deleting')).toBeDisabled()
  })

  it('shows delete confirmation when trash button clicked (no stock)', () => {
    renderCard({ ...brand, spoolCount: 0, inStockMaterials: [] })
    fireEvent.click(screen.getByLabelText('Delete Bambu Lab'))
    expect(screen.getAllByText('Delete').length).toBeGreaterThan(0)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onDelete when confirmed', () => {
    const { onDelete } = renderCard({ ...brand, spoolCount: 0, inStockMaterials: [] })
    fireEvent.click(screen.getByLabelText('Delete Bambu Lab'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith('brand-123')
  })

  it('dismisses confirmation when Cancel clicked', () => {
    renderCard({ ...brand, spoolCount: 0, inStockMaterials: [] })
    fireEvent.click(screen.getByLabelText('Delete Bambu Lab'))
    expect(screen.getAllByText('Delete').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })
})

describe('BrandLogo', () => {
  it('renders img for known brand', () => {
    render(<BrandLogo brand="Bambu Lab" size={32} />)
    expect(screen.getByRole('img', { name: 'Bambu Lab' })).toHaveAttribute(
      'src', expect.stringContaining('bambulab.com')
    )
  })

  it('renders fallback letter for unknown brand', () => {
    render(<BrandLogo brand="Unknown Brand" size={32} />)
    expect(screen.getByText('U')).toBeInTheDocument()
  })
})
