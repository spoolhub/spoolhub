import { useCallback, useEffect, useRef, useState } from 'react'

const AGENT_WS        = 'ws://localhost:8765/events'
const AGENT_HTTP      = 'http://localhost:8765'
const SKIP_PROMPT_KEY = 'spoolhub.agent.skipInstallPrompt'

/**
 * The address other devices (phones) should use to reach this app, for URLs
 * written onto NFC tags. Falls back to the current origin, but that's only
 * correct if you're browsing via a LAN-reachable address rather than
 * "localhost" -- set VITE_APP_URL to override for tag-writing purposes.
 */
export function appBaseUrl(): string {
  const configured = import.meta.env.VITE_APP_URL as string | undefined
  return configured?.trim() || window.location.origin
}

/** Writes a URI onto whatever tag is currently on the agent's active reader. */
export async function writeAgentTagUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${AGENT_HTTP}/write-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    return res.ok
  } catch {
    return false
  }
}

export type AgentState =
  | 'checking'
  | 'install-prompt'
  | 'connecting'
  | 'agent-offline'
  | 'no-reader'
  | 'ready'

interface AgentMessage {
  event: 'reader_status' | 'tag_scanned'
  connected?: boolean
  reader?: string
  uid?: string
}

export function useAgentNfc(onTagFound: (uid: string) => void) {
  const [state, setState]           = useState<AgentState>('checking')
  const [readerName, setReaderName] = useState<string | null>(null)

  const wsRef         = useRef<WebSocket | null>(null)
  const onTagFoundRef = useRef(onTagFound)
  const mountedRef    = useRef(true)

  useEffect(() => { onTagFoundRef.current = onTagFound }, [onTagFound])

  const openWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.close()
      wsRef.current = null
    }
    if (!mountedRef.current) return

    setState('connecting')
    const ws = new WebSocket(AGENT_WS)
    wsRef.current = ws

    ws.onopen = async () => {
      if (!mountedRef.current) return
      try {
        const res  = await fetch(`${AGENT_HTTP}/readers`)
        const data = await res.json() as { activeReader?: string; connected?: boolean }
        if (!mountedRef.current) return
        if (data.connected && data.activeReader) {
          setReaderName(data.activeReader)
          setState('ready')
        } else {
          setReaderName(null)
          setState('no-reader')
        }
      } catch {
        if (mountedRef.current) setState('no-reader')
      }
    }

    ws.onmessage = (e: MessageEvent) => {
      if (!mountedRef.current) return
      try {
        const msg: AgentMessage = JSON.parse(e.data as string)
        if (msg.event === 'reader_status') {
          if (msg.connected && msg.reader) {
            setReaderName(msg.reader)
            setState('ready')
          } else {
            setReaderName(null)
            setState('no-reader')
          }
        } else if (msg.event === 'tag_scanned' && msg.uid) {
          onTagFoundRef.current(msg.uid)
        }
      } catch { /* ignore malformed messages */ }
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setState('agent-offline')
      setReaderName(null)
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setState('agent-offline')
      setReaderName(null)
    }
  }, [])

  const checkAgent = useCallback(async () => {
    if (!mountedRef.current) return
    setState('checking')
    try {
      const res = await fetch(`${AGENT_HTTP}/health`, {
        signal: AbortSignal.timeout(2000),
      })
      if (!res.ok) throw new Error('not ok')
      if (mountedRef.current) openWebSocket()
    } catch {
      if (!mountedRef.current) return
      const skip = localStorage.getItem(SKIP_PROMPT_KEY) === 'true'
      setState(skip ? 'agent-offline' : 'install-prompt')
    }
  }, [openWebSocket])

  useEffect(() => {
    mountedRef.current = true
    checkAgent()
    return () => {
      mountedRef.current = false
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.close()
      }
    }
  }, [checkAgent])

  const reload = useCallback(() => {
    checkAgent()
  }, [checkAgent])

  const dismissInstallPrompt = useCallback((skipForever: boolean) => {
    if (skipForever) localStorage.setItem(SKIP_PROMPT_KEY, 'true')
    setState('agent-offline')
  }, [])

  const disconnect = useCallback(async () => {
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.close()
      wsRef.current = null
    }
    try {
      await fetch(`${AGENT_HTTP}/disconnect`, { method: 'POST' })
    } catch { /* agent may already be gone */ }
    setReaderName(null)
    setState('no-reader')
  }, [])

  return { state, readerName, reload, dismissInstallPrompt, disconnect }
}
