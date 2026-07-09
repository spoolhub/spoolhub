import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Sidebar from '@/components/Sidebar'

vi.mock('@/api/session', () => ({
  clearSession: vi.fn(),
  getSessionUser: vi.fn(() => ({
    id: 'user-1',
    username: 'mira.kovac',
    fullName: 'Mira Kovač',
  })),
}))

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

  it('renders profile link pointing to /profile', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /Mira Kovač/i })).toHaveAttribute('href', '/profile')
    expect(screen.getByText('@mira.kovac')).toBeInTheDocument()
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

  it('shows overlay when open', () => {
    renderSidebar(true)
    const overlay = document.querySelector('[aria-hidden="true"]')
    expect(overlay).toBeInTheDocument()
    expect(overlay!.className).toMatch(/overlayOpen/)
  })

  it('hides overlay when closed', () => {
    renderSidebar(false)
    // overlay stays mounted (iOS Safari repaint workaround) but is inert
    const overlay = document.querySelector('[aria-hidden="true"]')
    expect(overlay!.className).not.toMatch(/overlayOpen/)
  })

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn()
    renderSidebar(true, onClose)
    fireEvent.click(document.querySelector('[aria-hidden="true"]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
