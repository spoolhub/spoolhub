import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Header from '@/components/Header'
import { SidebarProvider } from '@/context/SidebarContext'

function renderHeader() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <Header />
      </SidebarProvider>
    </MemoryRouter>
  )
}

describe('Header', () => {
  it('renders the hamburger menu button', () => {
    renderHeader()
    expect(screen.getByTitle('Menu')).toBeInTheDocument()
  })

  it('renders the SpoolHub brand name', () => {
    renderHeader()
    expect(screen.getByText(/Spool/)).toBeInTheDocument()
    expect(screen.getByText(/Hub/)).toBeInTheDocument()
  })

  it('renders the search bar (desktop)', () => {
    renderHeader()
    expect(screen.getByPlaceholderText('Search spools, brands, colors…')).toBeInTheDocument()
  })

  it('links the brand logo to the dashboard', () => {
    renderHeader()
    expect(screen.getByTitle('Dashboard')).toHaveAttribute('href', '/')
  })

  it('renders the notification bell (mobile + desktop)', () => {
    renderHeader()
    expect(screen.getAllByTitle('Notifications')).toHaveLength(2)
  })
})