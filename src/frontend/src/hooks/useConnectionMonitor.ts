import { useEffect, useRef, useState } from 'react'

const HEALTH_URL = `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/health`
const POLL_MS = 3000

export function useConnectionMonitor() {
  const [isOffline, setIsOffline]   = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const polling = useRef(false)
  const timer   = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
    polling.current = false
  }

  function startPolling() {
    if (polling.current) return
    polling.current = true
    setIsOffline(true)
    timer.current = setInterval(async () => {
      try {
        const res = await fetch(HEALTH_URL, { cache: 'no-store' })
        if (res.ok) {
          stopPolling()
          setIsOffline(false)
          setRefreshKey(k => k + 1)   // triggers silent re-fetch in all pages
        }
      } catch {
        // still offline — keep polling
      }
    }, POLL_MS)
  }

  useEffect(() => {
    const handler = () => startPolling()
    window.addEventListener('app-offline', handler)
    return () => {
      window.removeEventListener('app-offline', handler)
      stopPolling()
    }
  }, [])

  return { isOffline, refreshKey }
}
