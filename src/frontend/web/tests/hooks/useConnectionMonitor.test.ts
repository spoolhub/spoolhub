import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConnectionMonitor } from '@/hooks/useConnectionMonitor'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useConnectionMonitor', () => {
  it('starts as online (isOffline: false)', () => {
    const { result } = renderHook(() => useConnectionMonitor())
    expect(result.current.isOffline).toBe(false)
  })

  it('sets isOffline to true when app-offline event fires', async () => {
    const { result } = renderHook(() => useConnectionMonitor())

    await act(async () => {
      window.dispatchEvent(new CustomEvent('app-offline'))
    })

    expect(result.current.isOffline).toBe(true)
  })

  it('starts polling health endpoint after app-offline event', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() => useConnectionMonitor())

    act(() => {
      window.dispatchEvent(new CustomEvent('app-offline'))
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({ cache: 'no-store' })
    )
  })

  it('does not start polling if app-offline is not fired', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    renderHook(() => useConnectionMonitor())

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useConnectionMonitor())

    act(() => {
      window.dispatchEvent(new CustomEvent('app-offline'))
    })

    expect(() => unmount()).not.toThrow()
  })
})
