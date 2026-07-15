import { useState, useEffect, useRef, useCallback } from 'react'
import { useConnection } from '@/context/ConnectionContext'
import { usePrinterHub } from '@/hooks/usePrinterHub'
import { printersApi } from '@/api/printers'
import { spoolsApi } from '@/api/spools'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'

async function fetchStatuses(printers: PrinterResponse[]): Promise<Map<string, PrinterStatus>> {
  const results = await Promise.allSettled(
    printers.map(p => printersApi.getStatus(p.id).then(st => ({ id: p.id, st }))),
  )
  const map = new Map<string, PrinterStatus>()
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value.st) map.set(r.value.id, r.value.st)
  })
  return map
}

export interface UsePrinterCardsDataOptions {
  /** Full printer+spool DB refresh interval. 0 = SignalR only. */
  dataPollMs?: number
  /** Spools-only poll (Dashboard). Ignored when dataPollMs > 0. */
  spoolsPollMs?: number
  /** Live MQTT status poll. Default 3s — same as Dashboard. */
  statusPollMs?: number
}

/** Shared live data for printer cards — DB pushes via SignalR + status polling. */
export function usePrinterCardsData(options: UsePrinterCardsDataOptions = {}) {
  const { dataPollMs = 0, spoolsPollMs = 0, statusPollMs = 3_000 } = options
  const { refreshKey } = useConnection()

  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [statuses, setStatuses] = useState<Map<string, PrinterStatus>>(new Map())
  const [loading, setLoading] = useState(true)

  const printersRef = useRef<PrinterResponse[]>([])
  const fetchGen = useRef(0)

  const applyPrinters = useCallback((p: PrinterResponse[]) => {
    printersRef.current = p
    setPrinters(p)
  }, [])

  const refreshPrinterData = useCallback(() => {
    const gen = ++fetchGen.current
    Promise.all([printersApi.getAll(), spoolsApi.getAll()])
      .then(([p, s]) => {
        if (gen !== fetchGen.current) return
        applyPrinters(p)
        setSpools(s)
      })
      .catch(() => {})
  }, [applyPrinters])

  const refreshSpoolsOnly = useCallback((e?: Event) => {
    const deletedId = (e as CustomEvent | undefined)?.detail?.deletedId as string | undefined
    if (deletedId) {
      fetchGen.current++
      setSpools(prev => prev.filter(s => s.id !== deletedId))
      printersApi.getAll().then(applyPrinters).catch(() => {})
      return
    }
    const gen = ++fetchGen.current
    spoolsApi.getAll()
      .then(s => { if (gen === fetchGen.current) setSpools(s) })
      .catch(() => {})
  }, [applyPrinters])

  usePrinterHub(() => { refreshPrinterData() })

  useEffect(() => {
    let cancelled = false
    const gen = ++fetchGen.current
    void Promise.resolve().then(() => { if (!cancelled) setLoading(true) })

    Promise.all([printersApi.getAll(), spoolsApi.getAll()])
      .then(async ([p, s]) => {
        const st = await fetchStatuses(p)
        if (cancelled || gen !== fetchGen.current) return
        applyPrinters(p)
        setSpools(s)
        setStatuses(st)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    const dataTimer = dataPollMs > 0
      ? setInterval(() => { if (!cancelled) refreshPrinterData() }, dataPollMs)
      : null

    const spoolsTimer = dataPollMs === 0 && spoolsPollMs > 0
      ? setInterval(() => { if (!cancelled) refreshSpoolsOnly() }, spoolsPollMs)
      : null

    const statusTimer = setInterval(() => {
      if (cancelled || printersRef.current.length === 0) return
      fetchStatuses(printersRef.current).then(st => {
        if (cancelled) return
        setStatuses(prev => {
          const merged = new Map(prev)
          st.forEach((v, k) => merged.set(k, v))
          return merged
        })
      }).catch(() => {})
    }, statusPollMs)

    window.addEventListener('spools-updated', refreshSpoolsOnly)
    return () => {
      cancelled = true
      if (dataTimer) clearInterval(dataTimer)
      if (spoolsTimer) clearInterval(spoolsTimer)
      clearInterval(statusTimer)
      window.removeEventListener('spools-updated', refreshSpoolsOnly)
    }
  }, [refreshKey, dataPollMs, spoolsPollMs, statusPollMs, refreshPrinterData, refreshSpoolsOnly, applyPrinters])

  return {
    printers,
    spools,
    statuses,
    loading,
    setPrinters,
    setSpools,
    refreshPrinterData,
    applyPrinters,
  }
}
