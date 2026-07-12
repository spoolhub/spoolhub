import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { brandsApi } from '@/api/brands'
import { filamentsApi } from '@/api/filaments'
import type { FilamentProfile } from '@/types/filament'
import type { BrandApiResponse, OfdBrandResult } from '@/types/brand'
import styles from '@/pages/AddSpoolPage/AddSpoolPage.module.css'

interface BrandPickerFieldProps {
  value: string
  onChange: (brand: string) => void
  filaments: FilamentProfile[]
  onFilamentsChange: (filaments: FilamentProfile[]) => void
}

export default function BrandPickerField({ value, onChange, filaments, onFilamentsChange }: BrandPickerFieldProps) {
  const [dbBrands, setDbBrands] = useState<BrandApiResponse[]>([])
  const [showAddBrand, setShowAddBrand] = useState(false)
  const [inlineBrandQuery, setInlineBrandQuery] = useState('')
  const [inlineBrandResults, setInlineBrandResults] = useState<OfdBrandResult[]>([])
  const [inlineBrandSearching, setInlineBrandSearching] = useState(false)
  const [inlineBrandError, setInlineBrandError] = useState<string | null>(null)
  const [brandPolling, setBrandPolling] = useState<string | null>(null)
  const [highlightBrand, setHighlightBrand] = useState(false)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inlineAbortRef = useRef<AbortController | null>(null)
  const inlineSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const brandFilamentCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of filaments) {
      counts.set(f.brand, (counts.get(f.brand) ?? 0) + 1)
    }
    return counts
  }, [filaments])

  const filteredBrands = useMemo(
    () => [...new Set(filaments.map(f => f.brand))].sort((a, b) => a.localeCompare(b)),
    [filaments],
  )

  const visibleResults = inlineBrandQuery.trim() ? inlineBrandResults : []

  useEffect(() => {
    brandsApi.getAll().then(setDbBrands).catch(() => {})
  }, [])

  useEffect(() => {
    return () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current) }
  }, [])

  useEffect(() => {
    if (inlineSearchTimerRef.current) clearTimeout(inlineSearchTimerRef.current)
    if (!inlineBrandQuery.trim()) return
    inlineSearchTimerRef.current = setTimeout(async () => {
      inlineAbortRef.current?.abort()
      const ctrl = new AbortController()
      inlineAbortRef.current = ctrl
      setInlineBrandSearching(true)
      setInlineBrandError(null)
      try {
        const res = await brandsApi.searchOfd(inlineBrandQuery.trim(), ctrl.signal)
        setInlineBrandResults(res)
      } catch {
        /* aborted */
      } finally {
        setInlineBrandSearching(false)
      }
    }, 300)
    return () => { if (inlineSearchTimerRef.current) clearTimeout(inlineSearchTimerRef.current) }
  }, [inlineBrandQuery])

  const handleBrandAdded = useCallback((brandName: string) => {
    setShowAddBrand(false)
    setBrandPolling(brandName)
    setInlineBrandQuery('')
    setInlineBrandResults([])
    setHighlightBrand(true)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => setHighlightBrand(false), 1500)
    filamentsApi.refresh().catch(() => {})
    const poll = async () => {
      const updated = await filamentsApi.getAll()
      onFilamentsChange(updated)
      if (updated.filter(f => f.brand === brandName).length > 0) {
        onChange(brandName)
        setBrandPolling(null)
        return
      }
      setTimeout(poll, 2000)
    }
    setTimeout(poll, 2000)
  }, [onChange, onFilamentsChange])

  const selectInlineBrand = useCallback(async (r: OfdBrandResult) => {
    if (dbBrands.some(b => b.ofdSlug === r.slug)) {
      setInlineBrandError('This brand is already in your library.')
      return
    }
    setInlineBrandError(null)
    setInlineBrandSearching(true)
    try {
      await brandsApi.add({ name: r.name, domain: '', ofdSlug: r.slug })
      const updated = await brandsApi.getAll()
      setDbBrands(updated)
      handleBrandAdded(r.name)
    } catch {
      setInlineBrandError('Failed to add brand. Please try again.')
    } finally {
      setInlineBrandSearching(false)
    }
  }, [dbBrands, handleBrandAdded])

  const cancelAddBrand = useCallback(() => {
    setShowAddBrand(false)
    setInlineBrandQuery('')
    setInlineBrandResults([])
    setInlineBrandError(null)
  }, [])

  return (
    <div className={styles.field}>
      <label>Brand</label>
      {!showAddBrand ? (
        <select
          value={value}
          className={highlightBrand ? styles.selectHighlight : undefined}
          disabled={!!brandPolling}
          onChange={e => {
            if (e.target.value === '__add__') {
              setShowAddBrand(true)
              onChange('')
              return
            }
            onChange(e.target.value)
          }}
        >
          <option value="">{brandPolling ? `Syncing ${brandPolling}…` : 'Select brand…'}</option>
          {filteredBrands.map(b => {
            const count = brandFilamentCounts.get(b) ?? 0
            return (
              <option key={b} value={b}>
                {b} ({count} filament{count === 1 ? '' : 's'})
              </option>
            )
          })}
          <option value="__add__" className={styles.addBrandOption}>+ Add brand</option>
        </select>
      ) : (
        <div className={styles.inlineBrandSearch}>
          <input
            type="text"
            className={styles.inlineBrandInput}
            placeholder="Search Open Filament Database…"
            value={inlineBrandQuery}
            onChange={e => {
              setInlineBrandQuery(e.target.value)
              if (!e.target.value) setInlineBrandResults([])
            }}
            autoFocus
          />
          <button type="button" className={styles.inlineBrandClose} onClick={cancelAddBrand} aria-label="Cancel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {inlineBrandSearching && <div className={styles.inlineBrandSpinner} />}
          {visibleResults.length > 0 && (
            <ul className={styles.inlineBrandDropdown}>
              {visibleResults.map(r => {
                const alreadyAdded = dbBrands.some(b => b.ofdSlug === r.slug)
                return (
                  <li key={r.slug}>
                    <button
                      type="button"
                      disabled={alreadyAdded || inlineBrandSearching}
                      onClick={() => void selectInlineBrand(r)}
                      className={styles.inlineBrandResult}
                    >
                      <span>{r.name}</span>
                      <span className={styles.inlineBrandMeta}>
                        {alreadyAdded ? 'Already added' : `${r.materialCount} material${r.materialCount === 1 ? '' : 's'}`}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {inlineBrandError && <p className={styles.inlineBrandError}>{inlineBrandError}</p>}
        </div>
      )}
      {brandPolling && (
        <p className={styles.addBrandPolling}>
          Syncing {brandPolling}
          <span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
        </p>
      )}
    </div>
  )
}
