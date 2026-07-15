import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { usePrinterHub, type PrinterUpdatedEvent } from '@/hooks/usePrinterHub'

const handlers: Record<string, (event: unknown) => void> = {}

vi.mock('@/api/session', () => ({
  getToken: () => 'test-token',
}))

vi.mock('@microsoft/signalr', () => {
  const connection = {
    state: 'Disconnected',
    start: vi.fn(async () => { connection.state = 'Connected' }),
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers[event] = handler
    }),
    off: vi.fn(),
    stop: vi.fn(),
  }

  class HubConnectionBuilder {
    withUrl() { return this }
    withAutomaticReconnect() { return this }
    build() { return connection }
  }

  return {
    HubConnectionBuilder,
    HubConnectionState: { Connected: 'Connected' },
  }
})

function Probe({ onUpdate }: { onUpdate: (event: PrinterUpdatedEvent) => void }) {
  usePrinterHub(onUpdate)
  return null
}

describe('usePrinterHub', () => {
  it('notifies subscribers and dispatches printer-updated event', async () => {
    const onUpdate = vi.fn()
    const listener = vi.fn()
    window.addEventListener('printer-updated', listener)
    render(<Probe onUpdate={onUpdate} />)
    await waitFor(() => expect(handlers.PrinterUpdated).toBeTypeOf('function'))

    const event = { printerId: 'p1', spoolsChanged: true }
    handlers.PrinterUpdated(event)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(event)
      expect(listener).toHaveBeenCalled()
    })
    window.removeEventListener('printer-updated', listener)
  })
})
