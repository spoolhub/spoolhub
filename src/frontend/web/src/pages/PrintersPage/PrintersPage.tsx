import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { printersApi } from '@/api/printers'
import { spoolsApi } from '@/api/spools'
import PrinterCard from '@/components/PrinterCard'
import { getPrinterStatusClass } from '@/utils/printerStatus'
import SpoolDetailDrawer from '@/components/SpoolDetailDrawer'
import PrinterDrawer from '@/components/PrinterDrawer'
import AddPrinterModal from './AddPrinterModal'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'
import styles from './PrintersPage.module.css'

async function fetchStatuses(printers: PrinterResponse[]): Promise<Map<string, PrinterStatus>> {
  const results = await Promise.allSettled(
    printers.map(p => printersApi.getStatus(p.id).then(st => ({ id: p.id, st })))
  )
  const map = new Map<string, PrinterStatus>()
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value.st) map.set(r.value.id, r.value.st)
  })
  return map
}

export default function PrintersPage() {
  const { t } = useTranslation()
  const { refreshKey } = useConnection()
  const [printers, setPrinters]   = useState<PrinterResponse[]>([])
  const [spools, setSpools]       = useState<SpoolResponse[]>([])
  const [statuses, setStatuses]   = useState<Map<string, PrinterStatus>>(new Map())
  const [loading, setLoading]     = useState(true)
  const [query, setQuery]         = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSpool, setSelectedSpool] = useState<SpoolResponse | null>(null)
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null)
  const printersRef               = useRef<PrinterResponse[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect

    Promise.all([printersApi.getAll(), spoolsApi.getAll()])
      .then(async ([p, s]) => {
        const st = await fetchStatuses(p)
        if (!cancelled) { printersRef.current = p; setPrinters(p); setSpools(s); setStatuses(st); setLoading(false) }
      })
      .catch(() => { /* keep loading=true — skeleton stays while offline */ })

    const dataTimer = setInterval(() => {
      Promise.all([printersApi.getAll(), spoolsApi.getAll()])
        .then(([p, s]) => {
          if (!cancelled) { printersRef.current = p; setPrinters(p); setSpools(s) }
        })
        .catch(() => {})
    }, 30_000)

    const statusTimer = setInterval(() => {
      if (printersRef.current.length === 0) return
      fetchStatuses(printersRef.current).then(st => {
        if (!cancelled) setStatuses(prev => {
          const merged = new Map(prev)
          st.forEach((v, k) => merged.set(k, v))
          return merged
        })
      }).catch(() => {})
    }, 3_000)

    return () => { cancelled = true; clearInterval(dataTimer); clearInterval(statusTimer) }
  }, [refreshKey])

  // Printer cards look up live spool data (color, weight) from `spools` — refresh
  // immediately when a spool changes elsewhere instead of waiting for the next poll.
  useEffect(() => {
    function handleSpoolsUpdated(e: Event) {
      const deletedId = (e as CustomEvent).detail?.deletedId as string | undefined
      if (deletedId) {
        setSpools(prev => prev.filter(s => s.id !== deletedId))
        return
      }
      spoolsApi.getAll().then(setSpools).catch(() => {})
    }
    window.addEventListener('spools-updated', handleSpoolsUpdated)
    return () => window.removeEventListener('spools-updated', handleSpoolsUpdated)
  }, [])

  const handleAddPrinter = useCallback(() => setShowAddModal(true), [])
  const handleAddPrinterClose = useCallback(() => setShowAddModal(false), [])

  const handlePrinterAdded = useCallback(() => {
    setShowAddModal(false)
    // Trigger a re-fetch by toggling the refresh key
    printersApi.getAll().then(p => {
      printersRef.current = p
      setPrinters(p)
    }).catch(() => {})
  }, [])

  const handleSpoolClick = useCallback((spool: SpoolResponse) => {
    setSelectedPrinterId(null)
    setSelectedSpool(spool)
  }, [])

  const handleSpoolClose = useCallback(() => {
    setSelectedSpool(null)
  }, [])

  const handleOpenDetail = useCallback((printer: PrinterResponse) => {
    setSelectedPrinterId(printer.id)
  }, [])

  const handleDetailClose = useCallback(() => {
    setSelectedPrinterId(null)
  }, [])

  const handlePrinterDisconnected = useCallback((id: string) => {
      setPrinters(prev => prev.filter(p => p.id !== id))
    }, [])

    const handleTrayAssigned = useCallback(() => {
      printersApi.getAll().then(p => {
        printersRef.current = p
        setPrinters(p)
      }).catch(() => {})
    }, [])

  const handleSpoolUpdated = useCallback((updated: SpoolResponse) => {
    setSpools(prev => prev.map(s => s.id === updated.id ? updated : s))
  }, [])

  const handleSpoolDeleted = useCallback((id: string, wasActive: boolean) => {
    setSpools(prev => prev.filter(s => s.id !== id))
    // If the deleted spool was assigned to a printer, we need to refresh printers too
    if (wasActive) {
      printersApi.getAll().then(p => {
        printersRef.current = p
        setPrinters(p)
      }).catch(() => {})
    }
  }, [])

  const filtered = useMemo(() => {
    return printers.filter(p => {
      if (query) {
        const hay = `${p.brand} ${p.name} ${p.model}`.toLowerCase()
        if (!hay.includes(query.toLowerCase())) return false
      }
      if (activeFilter === 'ams') return p.hasAms
      if (activeFilter === 'all') return true
      return getPrinterStatusClass(statuses.get(p.id)) === activeFilter
    })
  }, [printers, query, activeFilter, statuses])

  const onlineCount = printers.filter(p => getPrinterStatusClass(statuses.get(p.id)) !== 'offline').length
  const printingCount = printers.filter(p => getPrinterStatusClass(statuses.get(p.id)) === 'printing').length

  return (
    <>
    <div className={`${styles.page} page`}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('printers.title')}</h1>
          <div className={styles.sub}>{t('printers.subtitle')}</div>
        </div>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          <input placeholder="Search printers…" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <button className={styles.primaryBtn} onClick={handleAddPrinter}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          {t('printers.addPrinter')}
        </button>
      </header>

      <section className={styles.invbar}>
        <div className={styles.chips}>
          <button className={`${styles.chip} ${activeFilter === 'all' ? styles.on : ''}`} onClick={() => setActiveFilter('all')}>All</button>
          <button className={`${styles.chip} ${activeFilter === 'printing' ? styles.on : ''}`} onClick={() => setActiveFilter('printing')}>Printing</button>
          <button className={`${styles.chip} ${activeFilter === 'idle' ? styles.on : ''}`} onClick={() => setActiveFilter('idle')}>Idle</button>
          <button className={`${styles.chip} ${activeFilter === 'offline' ? styles.on : ''}`} onClick={() => setActiveFilter('offline')}>Offline</button>
          <button className={`${styles.chip} ${activeFilter === 'ams' ? styles.on : ''}`} onClick={() => setActiveFilter('ams')}>AMS</button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>All printers</h2>
          <span className={styles.meta}>{filtered.length} of {printers.length}</span>
        </div>
        {loading ? (
          <div className={styles.grid} data-testid="loading-skeleton">
            {[0, 1, 2].map(i => <div key={i} className={styles.skeletonCard} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>{printers.length === 0 ? 'No printers yet — add one to get started.' : 'No printers match this filter.'}</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(p => (
              <PrinterCard key={p.id} printer={p} spools={spools} status={statuses.get(p.id)} onSpoolClick={handleSpoolClick} onOpenDetail={handleOpenDetail} />
            ))}
          </div>
        )}
      </section>
      <div style={{ height: 70 }} />
    </div>

    {showAddModal && (
      <AddPrinterModal onClose={handleAddPrinterClose} onAdded={handlePrinterAdded} />
    )}

    {selectedSpool && (
      <SpoolDetailDrawer
        spool={selectedSpool}
        printers={printers}
        onClose={handleSpoolClose}
        onUpdated={handleSpoolUpdated}
        onDeleted={handleSpoolDeleted}
      />
    )}

    {selectedPrinterId && (() => {
      const selectedPrinter = printers.find(p => p.id === selectedPrinterId)
      return selectedPrinter ? (
        <PrinterDrawer
          printer={selectedPrinter}
          spools={spools}
          status={statuses.get(selectedPrinterId)}
          onClose={handleDetailClose}
          onSpoolClick={handleSpoolClick}
          onDisconnected={handlePrinterDisconnected}
          onTrayAssigned={handleTrayAssigned}
        />
      ) : null
    })()}
    </>
  )
}
