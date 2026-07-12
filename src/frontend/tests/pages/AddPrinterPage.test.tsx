import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddPrinterPage from '@/pages/AddPrinterPage/AddPrinterPage'
import { withNotificationsProvider } from '../utils/withNotificationsProvider'

vi.mock('@/api/printers', () => ({
  printersApi: {
    registerCloud: vi.fn(),
    verifyCloud:   vi.fn(),
    registerLan:   vi.fn(),
  },
}))

import { printersApi } from '@/api/printers'

function renderPage() {
  return render(
    withNotificationsProvider(
      <MemoryRouter initialEntries={['/printers/addprinter']}>
        <Routes>
          <Route path="/printers/addprinter" element={<AddPrinterPage />} />
          <Route path="/printers" element={<div>Printers list</div>} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}

/** Helper: brand → connection type step */
function goToConnection() {
  fireEvent.click(screen.getByText('Bambu Lab'))
}

/** Helper: brand → connection → cloud login step */
function goToLogin() {
  goToConnection()
  fireEvent.click(screen.getByText('Bambu Cloud'))
}

describe('AddPrinterPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Brand picker ─────────────────────────────────────────────
  it('shows Add Printer heading on brand picker', () => {
    renderPage()
    expect(screen.getByText('Add Printer')).toBeInTheDocument()
  })

  it('shows 2 brand cards', () => {
    renderPage()
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
    expect(screen.getByText('Klipper')).toBeInTheDocument()
  })

  it('shows Soon badge on Klipper brand', () => {
    renderPage()
    const soonBadges = screen.getAllByText('Soon')
    expect(soonBadges).toHaveLength(1)
  })

  it('brand picker has no back button, only a close link to printers', () => {
    renderPage()
    expect(screen.queryByText('Printers')).not.toBeInTheDocument()
    const close = screen.getByLabelText('Cancel')
    expect(close).toHaveAttribute('href', '/printers')
  })

  // ── Bambu Lab → connection step ───────────────────────────────
  it('clicking Bambu Lab shows connection type step', () => {
    renderPage()
    goToConnection()
    expect(screen.getByText('Connection Type')).toBeInTheDocument()
    expect(screen.getByText('LAN / Local')).toBeInTheDocument()
    expect(screen.getByText('Bambu Cloud')).toBeInTheDocument()
  })

  it('back from connection returns to brand picker', () => {
    renderPage()
    goToConnection()
    fireEvent.click(screen.getByText('Choose Brand'))
    expect(screen.getByText('Add Printer')).toBeInTheDocument()
    expect(screen.getByText('Bambu Lab')).toBeInTheDocument()
  })

  // ── Bambu LAN form ────────────────────────────────────────────
  it('clicking LAN shows IP and serial number fields', () => {
    renderPage()
    goToConnection()
    fireEvent.click(screen.getByText('LAN / Local'))
    // discoverLan not mocked → throws synchronously → scanDone=true immediately
    fireEvent.click(screen.getByText('Enter manually'))
    expect(screen.getByPlaceholderText('192.168.1.100')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('01S00C123456789')).toBeInTheDocument()
  })

  it('back from LAN form returns to connection step', () => {
    renderPage()
    goToConnection()
    fireEvent.click(screen.getByText('LAN / Local'))
    fireEvent.click(screen.getByText('Connection Type'))
    expect(screen.getByText('LAN / Local')).toBeInTheDocument()
    expect(screen.getByText('Bambu Cloud')).toBeInTheDocument()
  })

  it('submitting LAN form calls registerLan and shows success screen', async () => {
    vi.mocked(printersApi.registerLan).mockResolvedValue({} as never)
    renderPage()
    goToConnection()
    fireEvent.click(screen.getByText('LAN / Local'))
    // discoverLan not mocked → throws synchronously → scanDone=true immediately
    fireEvent.click(screen.getByText('Enter manually'))
    fireEvent.change(screen.getByPlaceholderText('192.168.1.100'), { target: { value: '192.168.1.50' } })
    fireEvent.change(screen.getByPlaceholderText('01S00C123456789'), { target: { value: '01S00C000001' } })
    fireEvent.click(screen.getByRole('button', { name: /add printer/i }))
    await waitFor(() => expect(screen.getByText('Printer connected')).toBeInTheDocument())
    expect(printersApi.registerLan).toHaveBeenCalledWith(expect.objectContaining({
      ipAddress:    '192.168.1.50',
      serialNumber: '01S00C000001',
      brand:        'Bambu Lab',
    }))
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    await waitFor(() => expect(screen.getByText('Printers list')).toBeInTheDocument())
  })

  // ── Bambu Cloud login step ────────────────────────────────────
  it('clicking Bambu Cloud shows login form', () => {
    renderPage()
    goToLogin()
    expect(screen.getByText('Bambu Lab Account')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('back from login returns to connection step', () => {
    renderPage()
    goToLogin()
    fireEvent.click(screen.getByText('Connection Type'))
    expect(screen.getByText('LAN / Local')).toBeInTheDocument()
    expect(screen.getByText('Bambu Cloud')).toBeInTheDocument()
  })

  // ── Login → verify step ───────────────────────────────────────
  it('shows verify step when login returns requiresVerification=true', async () => {
    vi.mocked(printersApi.registerCloud).mockResolvedValue({
      requiresVerification: true,
      message: 'A verification code was sent to your email',
      savedPrinters: null,
    })
    renderPage()
    goToLogin()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText("Verify it's you")).toBeInTheDocument())
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('navigates to /printers when login returns requiresVerification=false', async () => {
    vi.mocked(printersApi.registerCloud).mockResolvedValue({
      requiresVerification: false,
      message: null,
      savedPrinters: [],
    })
    renderPage()
    goToLogin()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText('Printers list')).toBeInTheDocument())
  })

  it('shows error when login fails', async () => {
    vi.mocked(printersApi.registerCloud).mockRejectedValue(new Error('401'))
    renderPage()
    goToLogin()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'bad@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpassword' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText(/sign in failed/i)).toBeInTheDocument())
  })

  it('shows inline error and does not submit when email is malformed', async () => {
    renderPage()
    goToLogin()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@b' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText(/valid email address/i)).toBeInTheDocument())
    expect(printersApi.registerCloud).not.toHaveBeenCalled()
  })

  it('shows inline error and does not submit when password is too short', async () => {
    renderPage()
    goToLogin()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument())
    expect(printersApi.registerCloud).not.toHaveBeenCalled()
  })

  // ── Verify step ───────────────────────────────────────────────
  it('submitting verify code navigates to /printers on success', async () => {
    vi.mocked(printersApi.registerCloud).mockResolvedValue({
      requiresVerification: true,
      message: 'code sent',
      savedPrinters: null,
    })
    vi.mocked(printersApi.verifyCloud).mockResolvedValue([])
    renderPage()
    goToLogin()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => screen.getByText("Verify it's you"))
    const boxes = screen.getAllByRole('textbox')
    '123456'.split('').forEach((d, i) => fireEvent.change(boxes[i], { target: { value: d } }))
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => expect(screen.getByText('Printers list')).toBeInTheDocument())
  })

  it('shows error when verify code is wrong', async () => {
    vi.mocked(printersApi.registerCloud).mockResolvedValue({
      requiresVerification: true,
      message: 'code sent',
      savedPrinters: null,
    })
    vi.mocked(printersApi.verifyCloud).mockRejectedValue(new Error('400'))
    renderPage()
    goToLogin()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => screen.getByText("Verify it's you"))
    const boxes = screen.getAllByRole('textbox')
    '999999'.split('').forEach((d, i) => fireEvent.change(boxes[i], { target: { value: d } }))
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => expect(screen.getByText(/invalid code/i)).toBeInTheDocument())
  })

  it('back from verify returns to login step', async () => {
    vi.mocked(printersApi.registerCloud).mockResolvedValue({
      requiresVerification: true,
      message: 'code sent',
      savedPrinters: null,
    })
    renderPage()
    goToLogin()
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => screen.getByText("Verify it's you"))
    fireEvent.click(screen.getByText('Click to go back'))
    expect(screen.getByText('Bambu Lab Account')).toBeInTheDocument()
  })
})
