import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Sidebar from '@/components/Sidebar'

function renderSidebar(isOpen = true, onClose = vi.fn(), initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders the SpoolHub logo', () => {
    renderSidebar()
    expect(document.querySelector('svg[aria-label="SpoolHub"]')).toBeInTheDocument()
  })

  it('logo is a link that navigates to /', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /SpoolHub/ })).toHaveAttribute('href', '/')
  })

  it('calls onClose when logo is clicked', () => {
    const onClose = vi.fn()
    renderSidebar(true, onClose)
    fireEvent.click(screen.getByRole('link', { name: /SpoolHub/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ── Top-level items ────────────────────────────────────────────

  it('renders Dashboard link pointing to /', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/')
  })

  it('renders Scan link pointing to /scan', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /Scan/ })).toHaveAttribute('href', '/scan')
  })

  it('renders Spools link pointing to /spools', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /^Spools/ })).toHaveAttribute('href', '/spools')
  })

  it('renders Printers link pointing to /printers', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /^Printers/ })).toHaveAttribute('href', '/printers')
  })

  it('renders Locations link pointing to /locations', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /^Locations/ })).toHaveAttribute('href', '/locations')
  })

  // ── Sub-items are not rendered ─────────────────────────────────

  it('does not show sub-items when on Home (/)', () => {
    renderSidebar(true, vi.fn(), '/')
    expect(screen.queryByRole('link', { name: /Spool Stock/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Active Spools/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Filament Library/ })).not.toBeInTheDocument()
  })

  it('does not show sub-items when on /scan', () => {
    renderSidebar(true, vi.fn(), '/scan')
    expect(screen.queryByRole('link', { name: /Spool Stock/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Active Spools/ })).not.toBeInTheDocument()
  })

  it('does not show sub-items when on /printers', () => {
    renderSidebar(true, vi.fn(), '/printers')
    expect(screen.queryByRole('link', { name: /Spool Stock/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Active Spools/ })).not.toBeInTheDocument()
  })

  // ── Overlay / close behaviour ──────────────────────────────────

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    renderSidebar(true, onClose)
    fireEvent.click(screen.getByLabelText('Close sidebar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows overlay when open', () => {
    renderSidebar(true)
    expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('hides overlay when closed', () => {
    renderSidebar(false)
    expect(document.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
  })

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn()
    renderSidebar(true, onClose)
    fireEvent.click(document.querySelector('[aria-hidden="true"]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
