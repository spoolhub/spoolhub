import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { spoolsApi } from '@/api/spools'
import { useNfcHub } from '@/hooks/useNfcHub'
import SpoolCard from '@/components/SpoolCard'
import SpoolSearchBar from '@/components/SpoolSearchBar'
import SpoolFilterDropdown from '@/components/SpoolFilterDropdown'
import Pagination from '@/components/Pagination'
import { DEFAULT_FILTERS } from '@/types/spoolFilters'
import { groupSimilarColors } from '@/utils/colorUtils'
import type { SpoolFilters } from '@/types/spoolFilters'
import type { SpoolResponse } from '@/types/spool'
import styles from './LowStockPage.module.css'

function calcPerPage(cardHeight: number, cols: number, overhead = 180): number {
  const rows = Math.max(1, Math.floor((window.innerHeight - overhead) / (cardHeight + 16)))
  return rows * cols
}

export default function LowStockPage() {
  const { t } = useTranslation()
  const { refreshKey } = useConnection()
  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SpoolFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(() => calcPerPage(160, 4))

  useEffect(() => {
    function handleResize() { setPerPage(calcPerPage(160, 4)); setPage(1) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    spoolsApi
      .getAll()
      .then(data => {
        if (!cancelled) { setSpools(data); setLoading(false) }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [refreshKey])

  const handleSpoolUpdated = useCallback((updated: SpoolResponse) => {
    setSpools(prev => prev.map(s => s.id === updated.id ? updated : s))
  }, [])

  useNfcHub(() => {}, handleSpoolUpdated)

  const lowStock = useMemo(
    () => spools.filter(s => s.currentWeightG < s.lowStockThresholdG),
    [spools]
  )

  const allMaterials = useMemo(() => [...new Set(lowStock.map(s => s.material))].sort(), [lowStock])
  const allBrands    = useMemo(() => [...new Set(lowStock.map(s => s.brand))].sort(), [lowStock])
  const allColors    = useMemo(() => {
    const seen = new Map<string, string>()
    lowStock.forEach(s => { if (!seen.has(s.colorHex)) seen.set(s.colorHex, s.colorName) })
    const unique = [...seen.entries()].map(([hex, name]) => ({ hex, name })).sort((a, b) => a.name.localeCompare(b.name))
    return groupSimilarColors(unique)
  }, [lowStock])

  const q = query.toLowerCase()
  const filtered = useMemo(() => {
    return [...lowStock]
      .filter(s => {
        if (q && !s.brand.toLowerCase().includes(q) && !s.material.toLowerCase().includes(q) && !s.colorName.toLowerCase().includes(q)) return false
        if (filters.materials.length > 0 && !filters.materials.includes(s.material)) return false
        if (filters.brands.length > 0 && !filters.brands.includes(s.brand)) return false
        if (filters.colors.length > 0 && !filters.colors.includes(s.colorHex)) return false
        if (filters.activeOnly && !s.isActive) return false
        if (filters.neverScanned && s.lastScannedAt !== null) return false
        return true
      })
      .sort((a, b) => (a.currentWeightG / a.initialWeightG) - (b.currentWeightG / b.initialWeightG))
  }, [lowStock, q, filters])

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  function handleQueryChange(v: string) { setQuery(v); setPage(1) }
  function handleFiltersChange(f: SpoolFilters) { setFilters(f); setPage(1) }

  if (loading) {
    return (
      <div className={styles.wrap} data-testid="loading-skeleton">
        <div className={styles.heading}>
          <h1 className={styles.title}>{t('lowStock.title')}</h1>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.skeletonSearch} />
          <div className={styles.skeletonFilter} />
        </div>
        <div className={styles.grid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headingLoaded}>
        <h1 className={styles.title}>{t('lowStock.title')}</h1>
      </div>

      <div className={styles.toolbar}>
        <SpoolSearchBar value={query} onChange={handleQueryChange} />
        <SpoolFilterDropdown
          allMaterials={allMaterials}
          allBrands={allBrands}
          allColors={allColors}
          filters={filters}
          onChange={handleFiltersChange}
        />
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {query || Object.values(filters).some(v => (Array.isArray(v) ? v.length > 0 : v))
            ? t('spools.noMatch')
            : t('lowStock.noLow')}
        </p>
      ) : (
        <div className={styles.listWrap}>
          <div className={styles.grid}>
            {paginated.map(spool => (
              <SpoolCard key={spool.id} spool={spool} />
            ))}
          </div>
          <Pagination
            total={filtered.length}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={p => { setPerPage(p); setPage(1) }}
            perPageOptions={[...new Set([perPage, 16, 32, 48, 96])].sort((a, b) => a - b)}
            className="mt-auto"
          />
        </div>
      )}
    </div>
  )
}
