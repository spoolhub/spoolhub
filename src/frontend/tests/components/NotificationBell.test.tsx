import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotificationBell from '@/components/NotificationBell'
import { NotificationsProvider } from '@/context/NotificationsContext'
import type { Activity } from '@/types/activity'

vi.mock('@/api/activities', () => ({
  activitiesApi: {
    getRecent: vi.fn(),
  },
}))

import { activitiesApi } from '@/api/activities'

const sampleActivity: Activity = {
  id: 'a1',
  eventType: 'SpoolCreated',
  action: 'created',
  resourceType: 'spool',
  resourceName: 'Bambu PLA',
  resourceId: 's1',
  description: null,
  icon: null,
  snapshot: { brand: 'Bambu', colorName: 'Jade White', material: 'PLA', colorHex: '#fff' },
  createdAt: new Date().toISOString(),
}

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationsProvider>
        <NotificationBell />
      </NotificationsProvider>
    </MemoryRouter>,
  )
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(activitiesApi.getRecent).mockResolvedValue({
      activities: [sampleActivity],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
  })

  it('renders the bell button', async () => {
    renderBell()
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument()
    await waitFor(() => expect(activitiesApi.getRecent).toHaveBeenCalled())
  })

  it('shows unread badge for new activities', async () => {
    renderBell()
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
  })

  it('opens the panel with recent activity', async () => {
    renderBell()
    await waitFor(() => expect(activitiesApi.getRecent).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    expect(screen.getByRole('complementary', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByText(/View all activity/i)).toBeInTheDocument()
  })

  it('clears badge after opening notifications', async () => {
    renderBell()
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument())
  })

  it('shows activity details in the panel', async () => {
    renderBell()
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))
    expect(screen.getByText('New spool added')).toBeInTheDocument()
    expect(screen.getByText('Bambu')).toBeInTheDocument()
  })
})
