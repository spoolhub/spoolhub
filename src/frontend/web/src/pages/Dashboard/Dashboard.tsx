import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import styles from './Dashboard.module.css'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { spoolsApi } from '@/api/spools'
import { filamentsApi } from '@/api/filaments'
import { printersApi } from '@/api/printers'
import { useNfcHub } from '@/hooks/useNfcHub'
import { MetricCard } from '@/components/MetricCard/MetricCard'
import Header from '@/components/Header'

import PrinterCard from '@/components/PrinterCard'
import RecentActivity from '@/components/RecentActivity'
import SpoolDetailDrawer from '@/components/SpoolDetailDrawer'
import PrinterDrawer from '@/components/PrinterDrawer'
import { printJobsApi } from '@/api/printJobs'
import LowStockSpools from '@/components/LowStockSpools'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'

export default function Dashboard() {
  const { t } = useTranslation()
  const { refreshKey } = useConnection()
  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [detailSpool, setDetailSpool] = useState<SpoolResponse | null>(null)
  const [detailPrinterId, setDetailPrinterId] = useState<string | null>(null)
  const [, setFilamentLibraryCount] = useState(0)
  const [, setFilamentBrands] = useState(0)
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [statuses, setStatuses] = useState<Map<string, PrinterStatus>>(new Map())
  const [loading, setLoading] = useState(true)
  const [weeklyUsedKg, setWeeklyUsedKg] = useState<number | null>(null)
  const [activityLimit] = useState(5)

  const fetchGen = useRef(0)
  const printersRef = useRef<PrinterResponse[]>([])

  const refreshSpools = useCallback((e?: Event) => {
    const deletedId = (e as CustomEvent | undefined)?.detail?.deletedId as string | undefined
    if (deletedId) {
      fetchGen.current++
      setSpools(prev => prev.filter(s => s.id !== deletedId))
      return
    }
    const gen = ++fetchGen.current
    spoolsApi.getAll().then(s => { if (gen === fetchGen.current) setSpools(s) }).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    const gen = ++fetchGen.current
    void Promise.resolve().then(() => { if (!cancelled) setLoading(true) })
    Promise.all([
      spoolsApi.getAll(),
      filamentsApi.getAll(),
      printersApi.getAll().catch(() => [] as PrinterResponse[]),
    ]).then(async ([s, f, p]) => {
      if (cancelled || gen !== fetchGen.current) return
      setSpools(s)
      setFilamentLibraryCount(f.length)
      setFilamentBrands(new Set(f.map(fil => fil.brand)).size)
      printersRef.current = p
      setPrinters(p)
      const stMap = new Map<string, PrinterStatus>()
      await Promise.allSettled(p.map(pr => printersApi.getStatus(pr.id).then(st => { if (st) stMap.set(pr.id, st) })))
      if (!cancelled && gen !== fetchGen.current) setStatuses(stMap)
    }).then(() => { if (!cancelled) setLoading(false) }).catch(() => {})

    printJobsApi.getWeeklyUsage(7).then(u => { if (!cancelled) setWeeklyUsedKg(u.totalGrams / 1000) }).catch(() => {})

    const dataTimer = setInterval(() => {
      if (cancelled) return
      const pollGen = ++fetchGen.current
      Promise.all([spoolsApi.getAll(), filamentsApi.getAll()]).then(([s, f]) => {
        if (cancelled || pollGen !== fetchGen.current) return
        setSpools(s)
        setFilamentLibraryCount(f.length)
      }).catch(() => {})
    }, 60_000)

    const statusTimer = setInterval(() => {
      if (cancelled || printersRef.current.length === 0) return
      Promise.allSettled(
        printersRef.current.map(pr => printersApi.getStatus(pr.id).then(st => ({ id: pr.id, st })))
      ).then(results => {
        if (cancelled) return
        setStatuses(prev => {
          const merged = new Map(prev)
          results.forEach(r => { if (r.status === 'fulfilled' && r.value.st) merged.set(r.value.id, r.value.st) })
          return merged
        })
      }).catch(() => {})
    }, 3_000)

    window.addEventListener('spools-updated', refreshSpools)
    return () => {
      cancelled = true
      clearInterval(dataTimer)
      clearInterval(statusTimer)
      window.removeEventListener('spools-updated', refreshSpools)
    }
  }, [refreshSpools, refreshKey])

  const handleTrayAssigned = useCallback(() => {
    printersApi.getAll().then(p => {
      printersRef.current = p
      setPrinters(p)
    }).catch(() => {})
  }, [])

  const handleSpoolUpdated = useCallback((updated: SpoolResponse) => {
    fetchGen.current++
    setSpools(prev => {
      const mapped = prev.map(s => s.id === updated.id ? updated : s)
      if (!mapped.some(s => s.id === updated.id)) { refreshSpools(); return prev }
      return mapped
    })
  }, [refreshSpools])
  useNfcHub(() => {}, handleSpoolUpdated)

  const lowStockCount = spools.filter(s => s.currentWeightG < s.lowStockThresholdG).length
  const onlineCount = printers.filter(pr => !statuses.get(pr.id)?.connectionError).length
  const totalWeightKg = (spools.reduce((sum, s) => sum + s.currentWeightG, 0) / 1000).toFixed(1)
  const printingCount = printers.filter(pr => statuses.get(pr.id)?.gcodeState?.toUpperCase() === 'RUNNING').length
  // Derived delta strings
  // Critical = spools at/below 10% remaining
  const lowCriticalCount = spools.filter(s => s.initialWeightG > 0 && (s.currentWeightG / s.initialWeightG) <= 0.1).length
  const printerUnits = printingCount > 0 ? `${printingCount} printing now` : 'Idle'

  return (
    <>
      <Header />
      <div className={`${styles.page} page`}>
      {/* ════ PAGE TITLE ROW — Dashboard · search · bell · Add Spool (desktop) ════ */}
      <div className={styles.titleRow}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input placeholder="Search spools, brands, colors…" />
          <span className={styles.k}>⌘K</span>
        </label>
        <button className={styles.iconBtn} title="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0" />
          </svg>
        </button>
        <Link to="/spools/add" className={styles.addBtn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
          Add Spool
        </Link>
      </div>
      
      <section className={styles.metrics}>
        <MetricCard
          label={t('home.totalSpools')}
          value={Math.round(spools.length)}
          to="/spools"
          loading={loading}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></svg>}
          trend={{ text: `+${spools.length}`, muted: t('dashboard.thisMonth'), variant: 'positive' }}
        />
        <MetricCard
          label="Filament On Stock"
          value={parseFloat(totalWeightKg)}
          suffix={<span>kg</span>}
          to="/spools/active"
          loading={loading}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 7c3 0 3 10 6 10s3-10 6-10 3 10 6 10" /></svg>}
          trend={weeklyUsedKg != null && weeklyUsedKg > 0
            ? { text: `−${weeklyUsedKg.toFixed(1)}kg`, muted: 'Used', variant: 'warning' }
            : { text: '−0.0kg', muted: 'Used', variant: 'neutral' }
          }
        />
        <MetricCard
          label={t('home.lowStock')}
          value={lowStockCount}
          to="/spools/low"
          loading={loading}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
          trend={(
            lowStockCount > 0
              ? { text: `${lowCriticalCount} critical`, muted: t('home.needRestocking'), variant: 'warning' }
              : { text: t('home.allGood'), variant: 'neutral' }
          )}
        />
        <MetricCard
          label="Printers Online"
          value={onlineCount}
          suffix={<span>/{printers.length}</span>}
          to="/printers"
          loading={loading}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="3" x2="4" y2="19" /><line x1="20" y1="3" x2="20" y2="19" /><path d="M4 3h16" /><line x1="4" y1="9" x2="20" y2="9" /><rect x="9.5" y="6.5" width="5" height="4" rx="0.75" /><path d="M11.5 10.5 L12 13 L12.5 10.5" strokeWidth="1.3" /><rect x="3" y="19" width="18" height="2" rx="0.75" /><rect x="8.5" y="14.5" width="7" height="4" rx="0.5" /></svg>}
          trend={{ text: printerUnits, variant: 'neutral' }}
        />
      </section>

      {/* ════ PRINTERS PANEL ════ */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Printers</h2>
          <span className={styles.meta}>{onlineCount} / {printers.length} online</span>
        </div>
        <div className={styles.printerGrid}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)
            : printers.length === 0
              ? (
                <div className={styles.emptyPanel}>
                  <p>{t('home.noPrinters')}</p>
                  <Link to="/printers" className={styles.link}>{t('home.addPrinter')}</Link>
                </div>
              )
              : printers.map(p => (
                <PrinterCard key={p.id} printer={p} spools={spools} status={statuses.get(p.id)} onSpoolClick={(s) => setDetailSpool(s)} onOpenDetail={(pr) => setDetailPrinterId(pr.id)} />
              ))
          }
        </div>
      </section>

      {/* ════ BOTTOM ROW ════ */}
      <div className={styles.botrow}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>{t('home.lowStock')}</h2>
            <span className={styles.meta}>reorder soon</span>
          </div>
          <LowStockSpools spools={spools.filter(s => s.currentWeightG < s.lowStockThresholdG)} loading={loading} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>{t('home.recentActivity')}</h2>
            <Link to="/activity" className={styles.viewAll}>{t('common.viewAll')}</Link>
          </div>
          <RecentActivity limit={activityLimit} />
        </section>
      </div>

      <div style={{ height: 70 }} />
      {detailSpool && (
        <SpoolDetailDrawer
          spool={detailSpool}
          printers={printers}
          onClose={() => setDetailSpool(null)}
          onUpdated={(updated) => {
            setDetailSpool(updated)
            setSpools(prev => prev.map(s => s.id === updated.id ? updated : s))
          }}
          onDeleted={(id) => {
            setSpools(prev => prev.filter(s => s.id !== id))
          }}
        />
      )}

      {detailPrinterId && (() => {
        const detailPrinter = printers.find(p => p.id === detailPrinterId)
        return detailPrinter ? (
          <PrinterDrawer
            printer={detailPrinter}
            spools={spools}
            status={statuses.get(detailPrinterId)}
            onClose={() => setDetailPrinterId(null)}
            onSpoolClick={(s) => { setDetailPrinterId(null); setDetailSpool(s) }}
            onDisconnected={(id) => setPrinters(prev => prev.filter(p => p.id !== id))}
            onTrayAssigned={handleTrayAssigned}
          />
        ) : null
      })()}
    </div>
    </>
  )
}