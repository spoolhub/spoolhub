import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { NfcScanResult } from '@/types/nfc'
import type { SpoolResponse } from '@/types/spool'

// ── hoisted mocks ────────────────────────────────────────────────────────────
const mockNavigate = vi.hoisted(() => vi.fn())
const mockSearchParams = vi.hoisted(() => new URLSearchParams())
const mockScanTag = vi.hoisted(() => vi.fn<[string], Promise<NfcScanResult>>())

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}))

vi.mock('@/api/nfc', () => ({ scanTag: mockScanTag }))

vi.mock('@/hooks/useNfcHub', () => ({
  useNfcHub: () => ({ isConnected: false }),
}))

vi.mock('@/components/scan/AndroidScanner', () => ({
  default: () => React.createElement('div', { 'data-testid': 'android-scanner' }),
}))
vi.mock('@/components/scan/IphoneScanner', () => ({
  default: () => React.createElement('div', { 'data-testid': 'iphone-scanner' }),
}))
vi.mock('@/components/scan/DesktopScanner', () => ({
  default: () => React.createElement('div', { 'data-testid': 'desktop-scanner' }),
}))
vi.mock('@/components/NfcScanModal', () => ({
  default: ({ spool, onClose }: { spool: SpoolResponse; onClose: () => void }) =>
    React.createElement('div', { 'data-testid': 'nfc-scan-modal', onClick: onClose }, spool.id),
}))

// ── helpers ───────────────────────────────────────────────────────────────────

function makeSpool(overrides: Partial<SpoolResponse> = {}): SpoolResponse {
  return {
    id: 'spool-1', brand: 'Bambu', material: 'PLA', colorName: 'White', colorHex: '#FFFFFF',
    initialWeightG: 1000, currentWeightG: 800, spoolWeightG: 200,
    lowStockThresholdG: 100, isActive: false, isArchived: false,
    createdAt: new Date().toISOString(), lastScannedAt: null, notes: null,
    density: null, extruderMin: null, extruderMax: null, bedMin: null, bedMax: null,
    hasNfcTag: false, nfcTagUid: null, printerId: null, printerName: null, amsSlot: null,
    ...overrides,
  }
}

import ScanView from '@/components/ScanView/ScanView'

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ScanView — tagUid URL param handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.delete('tagUid')
  })

  it('calls onUnknownTag when tag is not registered', async () => {
    mockSearchParams.set('tagUid', 'ABC123')
    mockScanTag.mockResolvedValue({ status: 'unknown', tagUid: 'ABC123', spool: null, message: null })
    const onUnknownTag = vi.fn()

    render(React.createElement(ScanView, { onUnknownTag }))

    await waitFor(() => {
      expect(onUnknownTag).toHaveBeenCalledWith('ABC123')
    })
  })

  it('navigates to /spools/add/nfctag when unknown and no onUnknownTag callback', async () => {
    mockSearchParams.set('tagUid', 'ABC123')
    mockScanTag.mockResolvedValue({ status: 'unknown', tagUid: 'ABC123', spool: null, message: null })

    render(React.createElement(ScanView))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/spools/add/nfctag?tagUid=ABC123',
        { replace: true }
      )
    })
  })

  it('navigates to spool detail when tag is found and spool is active', async () => {
    mockSearchParams.set('tagUid', 'ABC123')
    const spool = makeSpool({ id: 'spool-active', isActive: true })
    mockScanTag.mockResolvedValue({ status: 'found', tagUid: 'ABC123', spool, message: null })

    render(React.createElement(ScanView))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/spools/spool-active')
    })
  })

  it('shows NfcScanModal when tag is found and spool is inactive', async () => {
    mockSearchParams.set('tagUid', 'DEF456')
    const spool = makeSpool({ id: 'spool-inactive', isActive: false })
    mockScanTag.mockResolvedValue({ status: 'found', tagUid: 'DEF456', spool, message: null })

    const { getByTestId } = render(React.createElement(ScanView))

    await waitFor(() => {
      expect(getByTestId('nfc-scan-modal')).toBeInTheDocument()
    })
  })

  it('shows error message when scan request fails', async () => {
    mockSearchParams.set('tagUid', 'FAIL')
    mockScanTag.mockRejectedValue(new Error('network error'))

    const { getByText } = render(React.createElement(ScanView))

    await waitFor(() => {
      expect(getByText(/could not look up this tag/i)).toBeInTheDocument()
    })
  })
})
