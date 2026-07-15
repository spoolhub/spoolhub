import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { getToken } from '@/api/session'

const HUB_URL = `${import.meta.env.VITE_API_URL}/hubs/printer`

export interface PrinterUpdatedEvent {
  printerId: string
  spoolsChanged?: boolean
}

type PrinterUpdatedHandler = (event: PrinterUpdatedEvent) => void

const subscribers = new Set<PrinterUpdatedHandler>()
let connection: signalR.HubConnection | null = null
let startPromise: Promise<void> | null = null

function dispatchPrinterUpdated(event: PrinterUpdatedEvent) {
  subscribers.forEach(fn => fn(event))
  window.dispatchEvent(new CustomEvent('printer-updated', { detail: event }))
}

function ensureConnection(): signalR.HubConnection {
  if (connection) return connection

  connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, { accessTokenFactory: () => getToken() ?? '' })
    .withAutomaticReconnect()
    .build()

  connection.on('PrinterUpdated', (event: PrinterUpdatedEvent) => dispatchPrinterUpdated(event))

  return connection
}

async function startConnection(): Promise<void> {
  const conn = ensureConnection()
  if (conn.state === signalR.HubConnectionState.Connected) return
  if (startPromise) return startPromise

  startPromise = (async () => {
    while (conn.state !== signalR.HubConnectionState.Connected) {
      try {
        await conn.start()
        return
      } catch {
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  })().finally(() => { startPromise = null })

  return startPromise
}

/** One shared SignalR connection — all pages get DB printer updates immediately. */
export function usePrinterHub(onPrinterUpdated: PrinterUpdatedHandler) {
  const callbackRef = useRef(onPrinterUpdated)

  useEffect(() => { callbackRef.current = onPrinterUpdated }, [onPrinterUpdated])

  useEffect(() => {
    const handler: PrinterUpdatedHandler = event => callbackRef.current(event)
    subscribers.add(handler)
    void startConnection()

    return () => { subscribers.delete(handler) }
  }, [])
}
