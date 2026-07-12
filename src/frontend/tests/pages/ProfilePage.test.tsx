import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ProfilePage from '@/pages/ProfilePage'
import type { UserResponse } from '@/types/user'

vi.mock('@/api/users', () => ({
  usersApi: {
    getMe: vi.fn(),
    updateMe: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('@/api/session', () => ({
  getSessionUser: vi.fn(),
  updateSessionUser: vi.fn(),
}))

import { usersApi } from '@/api/users'
import { getSessionUser, updateSessionUser } from '@/api/session'

const baseUser: UserResponse = {
  id: 'user-1',
  username: 'mira.kovac',
  fullName: 'Mira Kovač',
  createdAt: '2026-01-15T10:00:00Z',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSessionUser).mockReturnValue({
      id: baseUser.id,
      username: baseUser.username,
      fullName: baseUser.fullName,
    })
    vi.mocked(usersApi.getMe).mockResolvedValue(baseUser)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows cached session data immediately without a loading state', async () => {
    vi.mocked(usersApi.getMe).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mira Kovač' })).toBeInTheDocument()
    expect(screen.getByText('@mira.kovac')).toBeInTheDocument()
  })

  it('loads full profile details from the API', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/Member since/)).toBeInTheDocument())
    expect(usersApi.getMe).toHaveBeenCalledTimes(1)
  })

  it('does not stay on loading when remounted with cached session', async () => {
    vi.mocked(usersApi.getMe).mockReturnValue(new Promise(() => {}))
    const first = renderPage()
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument()
    first.unmount()

    renderPage()
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mira Kovač' })).toBeInTheDocument()
  })

  it('shows loading when there is no cached session', () => {
    vi.mocked(getSessionUser).mockReturnValue(null)
    vi.mocked(usersApi.getMe).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/Loading/)).toBeInTheDocument()
  })

  it('saves profile changes and updates the session', async () => {
    const updated: UserResponse = { ...baseUser, fullName: 'Mira K.' }
    vi.mocked(usersApi.updateMe).mockResolvedValue(updated)

    renderPage()
    await waitFor(() => expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Mira K.' } })
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }))

    await waitFor(() => expect(usersApi.updateMe).toHaveBeenCalledWith({ fullName: 'Mira K.' }))
    expect(updateSessionUser).toHaveBeenCalledWith({ fullName: 'Mira K.' })
    expect(screen.getByText(/Profile updated/i)).toBeInTheDocument()
  })

  it('shows an error when new passwords do not match', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByLabelText(/Current password/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/Current password/i), { target: { value: 'oldpass12' } })
    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: 'different1' } })
    fireEvent.click(screen.getByRole('button', { name: /Update password/i }))

    expect(await screen.findByText(/New passwords do not match/i)).toBeInTheDocument()
    expect(usersApi.changePassword).not.toHaveBeenCalled()
  })

  it('updates password when confirmation matches', async () => {
    vi.mocked(usersApi.changePassword).mockResolvedValue(undefined as never)

    renderPage()
    await waitFor(() => expect(screen.getByLabelText(/Current password/i)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/Current password/i), { target: { value: 'oldpass12' } })
    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: /Update password/i }))

    await waitFor(() => expect(usersApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'oldpass12',
      newPassword: 'newpass123',
    }))
    expect(screen.getByText(/Password updated/i)).toBeInTheDocument()
  })
})
