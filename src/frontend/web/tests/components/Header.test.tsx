import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Header from '@/components/Header'

function renderHeader(onOpenSidebar = vi.fn()) {
  return render(
    <MemoryRouter>
      <Header onOpenSidebar={onOpenSidebar} />
    </MemoryRouter>
  )
}

describe('Header', () => {
  it('renders the SpoolHub logo link', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'SpoolHub' })).toBeInTheDocument()
  })

  it('logo links to /', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'SpoolHub' })).toHaveAttribute('href', '/')
  })

  it('renders the language selector', () => {
    renderHeader()
    expect(screen.getByLabelText('Select language')).toBeInTheDocument()
  })

  it('calls onOpenSidebar when hamburger clicked', () => {
    const onOpenSidebar = vi.fn()
    renderHeader(onOpenSidebar)
    fireEvent.click(screen.getByLabelText('Open sidebar'))
    expect(onOpenSidebar).toHaveBeenCalledTimes(1)
  })
})
