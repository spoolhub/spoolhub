import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Header from '@/components/Header'
import { SidebarProvider } from '@/context/SidebarContext'
import { NotificationsProvider } from '@/context/NotificationsContext'

vi.mock('@/api/activities', () => ({
  activitiesApi: {
    getRecent: vi.fn().mockResolvedValue({
      activities: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
  },
}))

function renderHeader(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <NotificationsProvider>
        <SidebarProvider>
          <Header />
        </SidebarProvider>
      </NotificationsProvider>
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
    expect(screen.getAllByRole('button', { name: /Notifications/i })).toHaveLength(2)
  })

  it('hides the notification bell on the activity page', () => {
    renderHeader(['/activity'])
    expect(screen.queryByRole('button', { name: /Notifications/i })).not.toBeInTheDocument()
  })

  it('hides the notification bell on the scan page', () => {
    renderHeader(['/scan'])
    expect(screen.queryByRole('button', { name: /Notifications/i })).not.toBeInTheDocument()
  })
})