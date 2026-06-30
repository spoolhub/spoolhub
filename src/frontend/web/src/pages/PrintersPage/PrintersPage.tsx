import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { printersApi } from '@/api/printers'
import { spoolsApi } from '@/api/spools'
import PrinterCard from '@/components/PrinterCard'
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

  return (
    <div className={styles.wrap}>

      <h1 className={styles.title}>{t('printers.title')}</h1>

      {loading ? (
        <div className={styles.grid} data-testid="loading-skeleton">
          {[0, 1, 2].map(i => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {printers.map(p => (
            <PrinterCard key={p.id} printer={p} spools={spools} status={statuses.get(p.id)} />
          ))}
          <Link to="/printers/addprinter" className={styles.addCard}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className={styles.addText}>{t('printers.addPrinter')}</span>
          </Link>
        </div>
      )}

    </div>
  )
}
