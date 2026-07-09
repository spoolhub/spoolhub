import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import { SpoolIcon } from '@/components/icons'
import SpoolSearchBar from '@/components/SpoolSearchBar'
import Pagination from '@/components/Pagination'
import type { SpoolResponse } from '@/types/spool'
import styles from './SelectSpoolPage.module.css'

function calcPerPage(): number {
  const cols = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1
  const rows = Math.max(1, Math.floor((window.innerHeight - 240) / (160 + 16)))
  return rows * cols
}

function SpoolSelectCard({ spool, onSelect, assigning }: {
  spool: SpoolResponse
  onSelect: () => void
  assigning: boolean
}) {
  const { t } = useTranslation()
  const pct = Math.min(100, Math.round((spool.currentWeightG / spool.initialWeightG) * 100))
  const isLow = spool.currentWeightG < spool.lowStockThresholdG
  const barColor = isLow || pct < 25 ? '#ef4444' : pct < 50 ? '#eab308' : '#22c55e'
  const colorName = spool.colorName.split(' ').pop()

  return (
    <button onClick={onSelect} disabled={assigning} className={styles.card}>
      <div className={styles.top}>
        <SpoolIcon color={spool.colorHex} size={72} />
        <div className={styles.info}>
          <p className={styles.brand}>{spool.brand}</p>
          <p className={styles.material}>{spool.material} {colorName}</p>
        </div>
      </div>
      <div className={styles.barWrap}>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
      </div>
      <div className={styles.weightRow}>
        <span className={styles.weight}>{Math.round(spool.currentWeightG)}g {t('spools.remaining')}</span>
        <span className={styles.pct} style={{ color: barColor }}>{pct}%</span>
      </div>
    </button>
  )
}

export default function SelectSpoolPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const printerId = searchParams.get('printerId') ?? ''
  const amsSlotParam = searchParams.get('amsSlot')
  const amsSlot = amsSlotParam ? Number(amsSlotParam) : null

  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(calcPerPage)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function handleResize() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const next = calcPerPage()
        setPerPage(prev => { if (prev !== next) setPage(1); return next })
      }, 200)
    }
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    spoolsApi.getAll()
      .then(data => { setSpools(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const available = useMemo(() => spools.filter(s => !s.isActive), [spools])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return available
    return available.filter(s =>
      s.brand.toLowerCase().includes(q) ||
      s.material.toLowerCase().includes(q) ||
      s.colorName.toLowerCase().includes(q)
    )
  }, [available, query])

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const handleSelect = useCallback(async (spool: SpoolResponse) => {
    if (!printerId || assigning) return
    setAssigning(true)
    setError(null)
    try {
      if (amsSlot != null) {
        await printersApi.assignTraySpool(printerId, amsSlot, spool.id)
      } else {
        await printersApi.assignExtraSpool(printerId, spool.id)
      }
      navigate(-1)
    } catch {
      setError(t('selectSpool.assignError'))
      setAssigning(false)
    }
  }, [printerId, amsSlot, assigning, navigate, t])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('selectSpool.back')}
        </button>
        <h1 className={styles.title}>
          {amsSlot != null ? t('selectSpool.titleWithSlot', { slot: amsSlot }) : t('selectSpool.title')}
        </h1>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.toolbar}>
        <SpoolSearchBar value={query} onChange={v => { setQuery(v); setPage(1) }} />
      </div>

      {loading ? (
        <div className={styles.grid}>
          {[...Array(8)].map((_, i) => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>
          {query ? t('selectSpool.noMatch') : t('selectSpool.noAvailable')}
        </p>
      ) : (
        <div className={styles.listWrap}>
          <div className={styles.grid}>
            {paginated.map(spool => (
              <SpoolSelectCard
                key={spool.id}
                spool={spool}
                onSelect={() => handleSelect(spool)}
                assigning={assigning}
              />
            ))}
          </div>
          <Pagination
            total={filtered.length}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={p => { setPerPage(p); setPage(1) }}
            perPageOptions={[...new Set([perPage, 16, 32, 48])].sort((a, b) => a - b)}
            className="mt-auto pt-1"
          />
        </div>
      )}
    </div>
  )
}
