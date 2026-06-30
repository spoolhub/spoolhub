import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import type { NfcScanResult, NfcReaderStatus } from '@/types/nfc'
import type { SpoolResponse } from '@/types/spool'

const HUB_URL = `${import.meta.env.VITE_API_URL}/hubs/nfc`

export function useNfcHub(
  onScanResult: (result: NfcScanResult) => void,
  onSpoolUpdated?: (spool: SpoolResponse) => void,
  onReaderStatus?: (status: NfcReaderStatus) => void,
) {
  const [isConnected, setIsConnected] = useState(false)
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const scanCallbackRef = useRef(onScanResult)
  const spoolCallbackRef = useRef(onSpoolUpdated)
  const readerCallbackRef = useRef(onReaderStatus)

  useEffect(() => { scanCallbackRef.current = onScanResult }, [onScanResult])
  useEffect(() => { spoolCallbackRef.current = onSpoolUpdated }, [onSpoolUpdated])
  useEffect(() => { readerCallbackRef.current = onReaderStatus }, [onReaderStatus])

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build()

    connectionRef.current = connection

    let cancelled = false

    const scanHandler = (result: NfcScanResult) => scanCallbackRef.current(result)
    const spoolHandler = (spool: SpoolResponse) => spoolCallbackRef.current?.(spool)
    const readerHandler = (status: NfcReaderStatus) => readerCallbackRef.current?.(status)

    connection.on('ScanResult', scanHandler)
    connection.on('SpoolUpdated', spoolHandler)
    connection.on('ReaderStatus', readerHandler)

    connection.onreconnecting(() => setIsConnected(false))
    connection.onreconnected(() => setIsConnected(true))
    connection.onclose(() => setIsConnected(false))

    async function startWithRetry() {
      while (!cancelled) {
        try {
          await connection.start()
          if (!cancelled) setIsConnected(true)
          return
        } catch {
          if (cancelled) return
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }
    }

    startWithRetry()

    return () => {
      cancelled = true
      connection.off('ScanResult', scanHandler)
      connection.off('SpoolUpdated', spoolHandler)
      connection.off('ReaderStatus', readerHandler)
      connection.stop()
    }
  }, [])

  function selectReader(name: string) {
    connectionRef.current?.invoke('SelectReader', name).catch(console.error)
  }

  function disconnectReader() {
    connectionRef.current?.invoke('DisconnectReader').catch(console.error)
  }

  return { isConnected, selectReader, disconnectReader }
}
