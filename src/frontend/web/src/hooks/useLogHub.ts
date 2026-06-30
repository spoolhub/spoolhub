import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { apiClient } from '@/api/client'

export interface LogEntry {
  timestamp: string
  level: string
  category: string
  message: string
}

const HUB_URL = `${import.meta.env.VITE_API_URL}/hubs/logs`
const MAX_ENTRIES = 500

export function useLogHub() {
  const [entries, setEntries]       = useState<LogEntry[]>([])
  const [connected, setConnected]   = useState(false)
  const connectionRef               = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build()

    connectionRef.current = connection
    let cancelled = false

    const handler = (entry: LogEntry) => {
      setEntries(prev => {
        const next = [...prev, entry]
        return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next
      })
    }

    connection.on('LogEntry', handler)
    connection.onreconnecting(() => setConnected(false))
    connection.onreconnected(() => setConnected(true))
    connection.onclose(() => setConnected(false))

    async function start() {
      while (!cancelled) {
        try {
          await connection.start()
          if (cancelled) return
          setConnected(true)
          // load history after connecting
          const res = await apiClient.get<LogEntry[]>('/api/logs?limit=200')
          if (!cancelled) setEntries(res.data)
          return
        } catch {
          if (cancelled) return
          await new Promise(r => setTimeout(r, 5000))
        }
      }
    }

    start()

    return () => {
      cancelled = true
      connection.off('LogEntry', handler)
      connection.stop()
    }
  }, [])

  function clear() { setEntries([]) }

  return { entries, connected, clear }
}
