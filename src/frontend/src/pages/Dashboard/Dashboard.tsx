import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import styles from './Dashboard.module.css'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import { settingsApi } from '@/api/settings'
import { useNfcHub } from '@/hooks/useNfcHub'
import { usePrinterCardsData } from '@/hooks/usePrinterCardsData'
import { MetricCard } from '@/components/MetricCard/MetricCard'
import NotificationBell from '@/components/NotificationBell'

import PrinterCard from '@/components/PrinterCard'
import RecentActivity from '@/components/RecentActivity'
import SpoolDetailDrawer from '@/components/SpoolDetailDrawer'
import PrinterDrawer from '@/components/PrinterDrawer'
import { printJobsApi } from '@/api/printJobs'
import LowStockSpools from '@/components/LowStockSpools'
import type { SpoolResponse } from '@/types/spool'

export default function Dashboard() {
  const { t } = useTranslation()
  const {
    printers,
    spools,
    statuses,
    loading,
    setPrinters,
    setSpools,
    applyPrinters,
  } = usePrinterCardsData({ spoolsPollMs: 60_000 })
  const [detailSpool, setDetailSpool] = useState<SpoolResponse | null>(null)
  const [detailPrinterId, setDetailPrinterId] = useState<string | null>(null)
  const [weeklyUsedKg, setWeeklyUsedKg] = useState<number | null>(null)
  const [activityLimit] = useState(5)
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    settingsApi.getApp().catch(() => ({ currency: 'USD' }))
      .then(app => setCurrency((app as { currency: string }).currency))
    printJobsApi.getWeeklyUsage(7).then(u => setWeeklyUsedKg(u.totalGrams / 1000)).catch(() => {})
  }, [])

  const handleTrayAssigned = useCallback(() => {
    printersApi.getAll().then(applyPrinters).catch(() => {})
  }, [applyPrinters])

  const handleSpoolUpdated = useCallback((updated: SpoolResponse) => {
    setSpools(prev => {
      const mapped = prev.map(s => s.id === updated.id ? updated : s)
      if (!mapped.some(s => s.id === updated.id)) {
        spoolsApi.getAll().then(setSpools).catch(() => {})
        return prev
      }
      return mapped
    })
  }, [setSpools])
  useNfcHub(() => {}, handleSpoolUpdated)

  const lowStockCount = spools.filter(s => s.currentWeightG < s.lowStockThresholdG).length
  const onlineCount = printers.filter(pr => !statuses.get(pr.id)?.connectionError).length
  const totalWeightKg = (spools.reduce((sum, s) => sum + s.currentWeightG, 0) / 1000).toFixed(1)
  // Critical = spools at/below 10% remaining
  const lowCriticalCount = spools.filter(s => s.initialWeightG > 0 && (s.currentWeightG / s.initialWeightG) <= 0.1).length
  const totalValue = spools.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const totalValueStr = totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <>
      <div className={`${styles.page} page`}>
        {/* ════ PAGE TITLE ROW — Dashboard · search · bell · Add Spool (desktop) ════ */}
        <div className={styles.titleRow}>
          <div className={styles.h}>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <div className={styles.pageSub}>{t('dashboard.subtitle')}</div>
          </div>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input placeholder="Search spools, brands, colors…" />
          </label>
          <NotificationBell variant="bordered" />
          <Link to="/spools/add" className={styles.addBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            Add Spool
          </Link>
        </div>

        {/* ════ METRICS ════ */}
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
            to="/spools"
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
            to="/spools"
            toState={{ filter: 'low' }}
            loading={loading}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
            trend={(
              lowStockCount > 0
                ? { text: `${lowCriticalCount} critical`, muted: t('home.needRestocking'), variant: 'warning' }
                : { text: t('home.allGood'), variant: 'neutral' }
            )}
          />
          <MetricCard
            label="Total Value"
            value={totalValueStr}
            suffix={<span>{currency}</span>}
            to="/spools"
            loading={loading}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
            trend={{ text: `${spools.filter(s => s.price != null).length} priced spools`, variant: 'neutral' }}
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
            <RecentActivity limit={activityLimit} spools={spools} />
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