import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePrinterCardsData } from '@/hooks/usePrinterCardsData'
import { useNfcHub } from '@/hooks/useNfcHub'
import { printersApi } from '@/api/printers'
import PrinterCard from '@/components/PrinterCard'
import { getPrinterStatusClass } from '@/utils/printerStatus'
import SpoolDetailDrawer from '@/components/SpoolDetailDrawer'
import PrinterDrawer from '@/components/PrinterDrawer'
import AddPrinterModal from './AddPrinterModal'
import NotificationBell from '@/components/NotificationBell'
import type { PrinterResponse } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'
import styles from './PrintersPage.module.css'

export default function PrintersPage() {
  const { t } = useTranslation()
  const {
    printers,
    spools,
    statuses,
    loading,
    setPrinters,
    setSpools,
    refreshPrinterData,
    applyPrinters,
  } = usePrinterCardsData({ dataPollMs: 30_000 })
  const [query, setQuery]         = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSpool, setSelectedSpool] = useState<SpoolResponse | null>(null)
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null)

  const handleSpoolUpdated = useCallback((updated: SpoolResponse) => {
    setSpools(prev => prev.map(s => s.id === updated.id ? updated : s))
    setSelectedSpool(prev => prev && prev.id === updated.id ? updated : prev)
    printersApi.getAll().then(applyPrinters).catch(() => {})
  }, [setSpools, applyPrinters])
  useNfcHub(() => {}, handleSpoolUpdated)

  const handleAddPrinter = useCallback(() => setShowAddModal(true), [])
  const handleAddPrinterClose = useCallback(() => setShowAddModal(false), [])

  const handlePrinterAdded = useCallback(() => {
    setShowAddModal(false)
    refreshPrinterData()
  }, [refreshPrinterData])

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
  }, [setPrinters])

  const handleTrayAssigned = useCallback(() => {
    refreshPrinterData()
  }, [refreshPrinterData])

  const handleSpoolDeleted = useCallback((id: string, wasActive: boolean) => {
    setSpools(prev => prev.filter(s => s.id !== id))
    if (wasActive) refreshPrinterData()
  }, [setSpools, refreshPrinterData])

  const filtered = useMemo(() => {
    return printers.filter(p => {
      if (query) {
        const hay = `${p.brand} ${p.name} ${p.model}`.toLowerCase()
        if (!hay.includes(query.toLowerCase())) return false
      }
      if (activeFilter === 'ams') return p.hasAms
      if (activeFilter === 'all') return true
      if (activeFilter === 'idle') {
        const cls = getPrinterStatusClass(statuses.get(p.id), p.protocol)
        return cls === 'idle' || cls === 'online'
      }
      return getPrinterStatusClass(statuses.get(p.id), p.protocol) === activeFilter
    })
  }, [printers, query, activeFilter, statuses])

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
        <NotificationBell variant="bordered" />
        <button className={styles.primaryBtn} onClick={handleAddPrinter}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          {t('printers.addPrinter')}
        </button>
      </header>

      <section className={styles.invbar}>
        <div className={styles.chips}>
          <button className={`${styles.chip} ${activeFilter === 'all' ? styles.on : ''}`} onClick={() => setActiveFilter('all')}>All</button>
          <button className={`${styles.chip} ${activeFilter === 'printing' ? styles.on : ''}`} onClick={() => setActiveFilter('printing')}>Printing</button>
          <button className={`${styles.chip} ${activeFilter === 'idle' ? styles.on : ''}`} onClick={() => setActiveFilter('idle')}>Online</button>
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
