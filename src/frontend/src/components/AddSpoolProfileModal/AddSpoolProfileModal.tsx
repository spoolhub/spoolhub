import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { filamentsApi } from '@/api/filaments'
import { brandsApi } from '@/api/brands'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import FilamentCard from '@/components/FilamentCard'
import { SpoolIcon } from '@/components/icons'
import { getMaterialDefaults } from '@/utils/materialDefaults'
import type { FilamentProfile } from '@/types/filament'
import type { BrandApiResponse, OfdBrandResult } from '@/types/brand'
import type { SpoolProfileResponse } from '@/types/spoolProfile'
import styles from './AddSpoolProfileModal.module.css'

function ColorSelect({ colors, value, onChange, disabled = false }: {
  colors: FilamentProfile[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = colors.find(f => f.colorName === value)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div ref={ref} className={styles.colorSelectWrap}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        className={`${styles.colorTrigger}${disabled ? ` ${styles.colorTriggerDisabled}` : ''}`}
      >
        {selected?.colorHex
          ? <span className={styles.colorDot} style={{ backgroundColor: selected.colorHex }} />
          : <span className={styles.colorDotEmpty} />}
        <span className={`${styles.colorTriggerLabel}${!selected ? ` ${styles.colorTriggerPlaceholder}` : ''}`}>
          {selected ? selected.colorName : t('addSpool.selectColor')}
        </span>
        <svg className={styles.colorTriggerChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className={styles.colorDropdown}>
          {colors.map(f => (
            <button key={f.colorName} type="button" onClick={() => { onChange(f.colorName ?? ''); setOpen(false) }} className={styles.colorOption}>
              {f.colorHex
                ? <span className={styles.colorDot} style={{ backgroundColor: f.colorHex }} />
                : <span className={styles.colorDotEmpty} />}
              <span className={styles.colorOptionLabel}>{f.colorName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  onClose: () => void
  onAdded: (profile: SpoolProfileResponse) => void
}

export default function AddSpoolProfileModal({ onClose, onAdded }: Props) {
  const { t } = useTranslation()

  const [filaments, setFilaments] = useState<FilamentProfile[]>([])
  const [ofdBrand, setOfdBrand] = useState('')
  const [ofdMaterial, setOfdMaterial] = useState('')
  const [ofdColor, setOfdColor] = useState('')
  const [selectedFilament, setSelectedFilament] = useState<FilamentProfile | null>(null)
  const [dbBrands, setDbBrands] = useState<BrandApiResponse[]>([])
  const [inlineBrandQuery, setInlineBrandQuery] = useState('')
  const [inlineBrandResults, setInlineBrandResults] = useState<OfdBrandResult[]>([])
  const [inlineBrandSearching, setInlineBrandSearching] = useState(false)
  const [inlineBrandError, setInlineBrandError] = useState<string | null>(null)
  const [showAddBrand, setShowAddBrand] = useState(false)
  const [brandPolling, setBrandPolling] = useState<string | null>(null)
  const [highlightBrand, setHighlightBrand] = useState(false)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inlineAbortRef = useRef<AbortController | null>(null)
  const inlineSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [initialWeightG, setInitialWeightG] = useState('1000')
  const [spoolWeightG, setSpoolWeightG] = useState('250')
  const [lowStockThresholdG, setLowStockThresholdG] = useState('100')
  const [extruderMin, setExtruderMin] = useState('')
  const [extruderMax, setExtruderMax] = useState('')
  const [bedMin, setBedMin] = useState('')
  const [bedMax, setBedMax] = useState('')
  const [density, setDensity] = useState('')
  const [diameterTolerance, setDiameterTolerance] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    filamentsApi.getAll().then(setFilaments).catch(() => {})
    brandsApi.getAll().then(setDbBrands).catch(() => {})
  }, [])

  useEffect(() => {
    return () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current) }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
        // aborted
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
      setFilaments(updated)
      if (updated.filter(f => f.brand === brandName).length > 0) {
        setOfdBrand(brandName); setOfdMaterial(''); setOfdColor(''); setBrandPolling(null)
        return
      }
      setTimeout(poll, 2000)
    }
    setTimeout(poll, 2000)
  }, [])

  const selectInlineBrand = useCallback(async (r: OfdBrandResult) => {
    if (dbBrands.some(b => b.ofdSlug === r.slug)) { setInlineBrandError(t('addBrand.duplicateError')); return }
    setInlineBrandError(null); setInlineBrandSearching(true)
    try {
      await brandsApi.add({ name: r.name, domain: '', ofdSlug: r.slug })
      const updated = await brandsApi.getAll()
      setDbBrands(updated)
      handleBrandAdded(r.name)
    } catch {
      setInlineBrandError(t('addBrand.addError'))
    } finally {
      setInlineBrandSearching(false)
    }
  }, [dbBrands, handleBrandAdded, t])

  const ofdBrands    = useMemo(() => [...new Set(filaments.map(f => f.brand))].sort(), [filaments])
  const ofdMaterials = useMemo(() => [...new Set(filaments.filter(f => f.brand === ofdBrand).map(f => f.material))].sort(), [filaments, ofdBrand])
  const ofdColors    = useMemo(() => filaments.filter(f => f.brand === ofdBrand && f.material === ofdMaterial && f.colorName), [filaments, ofdBrand, ofdMaterial])
  const filteredFilaments = useMemo(() => {
    if (!ofdBrand || !ofdMaterial) return []
    return filaments.filter(f => f.brand === ofdBrand && f.material === ofdMaterial && (!ofdColor || f.colorName === ofdColor))
  }, [filaments, ofdBrand, ofdMaterial, ofdColor])

  function pickFilament(f: FilamentProfile) {
    const d = getMaterialDefaults(f.material)
    setExtruderMin(f.extruderMin != null ? String(f.extruderMin) : (d ? String(d.extruderMin) : ''))
    setExtruderMax(f.extruderMax != null ? String(f.extruderMax) : (d ? String(d.extruderMax) : ''))
    setBedMin(f.bedMin != null ? String(f.bedMin) : (d ? String(d.bedMin) : ''))
    setBedMax(f.bedMax != null ? String(f.bedMax) : (d ? String(d.bedMax) : ''))
    setDensity(f.density != null ? String(f.density) : '')
    setDiameterTolerance(f.diameterTolerance != null ? String(f.diameterTolerance) : '')
    setSubmitError(null)
    setSelectedFilament(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFilament) return
    setSubmitting(true); setSubmitError(null)
    try {
      const created = await spoolProfilesApi.add({
        name: `${selectedFilament.brand} ${selectedFilament.material}${selectedFilament.colorName ? ' ' + selectedFilament.colorName : ''}`,
        brand: selectedFilament.brand,
        material: selectedFilament.material,
        colorName: selectedFilament.colorName ?? '',
        colorHex: selectedFilament.colorHex ?? '#ffffff',
        initialWeightG: parseFloat(initialWeightG) || 1000,
        spoolWeightG: parseFloat(spoolWeightG) || 250,
        lowStockThresholdG: parseFloat(lowStockThresholdG) || 100,
        density: density ? parseFloat(density) : null,
        diameterTolerance: diameterTolerance ? parseFloat(diameterTolerance) : null,
        extruderMin: extruderMin ? parseInt(extruderMin) : null,
        extruderMax: extruderMax ? parseInt(extruderMax) : null,
        bedMin: bedMin ? parseInt(bedMin) : null,
        bedMax: bedMax ? parseInt(bedMax) : null,
        price: null,
      })
      onAdded(created)
      onClose()
    } catch {
      setSubmitError(t('spoolProfile.errorSave'))
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <button type="button" className={styles.backBtn} onClick={selectedFilament ? () => setSelectedFilament(null) : onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            {selectedFilament ? t('common.back') : t('common.cancel')}
          </button>
          <h2 className={styles.panelTitle}>{t('spoolProfile.addProfile')}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {selectedFilament ? (
            <form onSubmit={handleSubmit} className={styles.wrap}>
              <div className={styles.card}>
                <div className={styles.header}>
                  <div className={styles.headerColorOverlay} style={{ backgroundColor: selectedFilament.colorHex ?? '#888' }} />
                  <div className={styles.headerRow}>
                    <SpoolIcon color={selectedFilament.colorHex || '#888'} size={80} />
                    <div className={styles.headerInfo}>
                      <span className={styles.headerBrand}>{selectedFilament.brand}</span>
                      <p className={styles.headerTitle}>{selectedFilament.colorName}</p>
                      <p className={styles.headerMaterial}>{selectedFilament.material}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <p className={styles.sectionLabel}>{t('spoolForm.sectionSpoolStats')}</p>
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.label}>{t('spoolForm.initialWeight')}</label>
                      <input type="number" className={styles.input} value={initialWeightG} onChange={e => setInitialWeightG(e.target.value)} min="0" />
                    </div>
                    <div>
                      <label className={styles.label}>{t('spoolForm.spoolWeight')}</label>
                      <input type="number" className={styles.input} value={spoolWeightG} onChange={e => setSpoolWeightG(e.target.value)} min="0" />
                    </div>
                    <div>
                      <label className={styles.label}>{t('spoolForm.lowStockThreshold')}</label>
                      <input type="number" className={styles.input} value={lowStockThresholdG} onChange={e => setLowStockThresholdG(e.target.value)} min="0" />
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <p className={styles.sectionLabel}>{t('spoolForm.sectionPrintSettings')}</p>
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.label}>{t('spoolForm.extruderTemp')}</label>
                      <div className={styles.rangeRow}>
                        <input type="number" className={styles.input} value={extruderMin} onChange={e => setExtruderMin(e.target.value)} placeholder={t('spoolForm.min')} />
                        <span className={styles.rangeSep}>{t('spoolForm.to')}</span>
                        <input type="number" className={styles.input} value={extruderMax} onChange={e => setExtruderMax(e.target.value)} placeholder={t('spoolForm.max')} />
                      </div>
                    </div>
                    <div>
                      <label className={styles.label}>{t('spoolForm.bedTemp')}</label>
                      <div className={styles.rangeRow}>
                        <input type="number" className={styles.input} value={bedMin} onChange={e => setBedMin(e.target.value)} placeholder={t('spoolForm.min')} />
                        <span className={styles.rangeSep}>{t('spoolForm.to')}</span>
                        <input type="number" className={styles.input} value={bedMax} onChange={e => setBedMax(e.target.value)} placeholder={t('spoolForm.max')} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <p className={styles.sectionLabel}>{t('spoolForm.sectionMaterialProperties')}</p>
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.label}>{t('spoolForm.density')}</label>
                      <input type="number" className={styles.input} value={density} onChange={e => setDensity(e.target.value)} step="0.01" />
                    </div>
                    <div>
                      <label className={styles.label}>{t('spoolForm.diameterTolerance')}</label>
                      <input type="number" className={styles.input} value={diameterTolerance} onChange={e => setDiameterTolerance(e.target.value)} step="0.001" />
                    </div>
                  </div>
                </div>

                {submitError && <p className={styles.submitError}>{submitError}</p>}

                <div className={styles.formActions}>
                  <button type="button" className={styles.btnSecondary} onClick={() => setSelectedFilament(null)}>{t('common.cancel')}</button>
                  <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                    {submitting ? t('spoolProfile.saving') : t('spoolProfile.save')}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className={styles.wrap}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h1 className={styles.title}>{t('spoolProfile.addProfile')}</h1>
                  <p className={styles.subtitle}>{t('spoolProfile.newSubtitle')}</p>
                </div>

                <div className={styles.filterGrid}>
                  <div>
                    <label className={styles.label}>{t('filters.brand')}</label>
                    {!showAddBrand ? (
                      <select
                        value={ofdBrand}
                        onChange={e => {
                          if (e.target.value === '__add__') { setShowAddBrand(true); setOfdBrand(''); return }
                          setOfdBrand(e.target.value); setOfdMaterial(''); setOfdColor('')
                        }}
                        className={`${styles.select}${highlightBrand ? ` ${styles.selectHighlight}` : ''}`}
                      >
                        <option value="">{t('addSpool.selectBrand')}</option>
                        {ofdBrands.map(b => <option key={b} value={b}>{b}</option>)}
                        <option value="__add__" className={styles.addBrandOption}>+ {t('filaments.addBrand')}</option>
                      </select>
                    ) : (
                      <div className={styles.inlineBrandSearch}>
                        <input
                          type="text" className={styles.inlineBrandInput}
                          placeholder={t('addBrand.searchLabel')} value={inlineBrandQuery}
                          onChange={e => { setInlineBrandQuery(e.target.value); if (!e.target.value) setInlineBrandResults([]) }}
                          autoFocus
                        />
                        <button type="button" className={styles.inlineBrandClose}
                          onClick={() => { setShowAddBrand(false); setInlineBrandQuery(''); setInlineBrandResults([]) }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                        {inlineBrandSearching && <div className={styles.inlineBrandSpinner} />}
                        {inlineBrandResults.length > 0 && (
                          <ul className={styles.inlineBrandDropdown}>
                            {inlineBrandResults.map(r => (
                              <li key={r.slug}>
                                <button type="button" onClick={() => selectInlineBrand(r)} className={styles.inlineBrandResult}>
                                  <span>{r.name}</span>
                                  <span className={styles.inlineBrandMeta}>{t('addBrand.materialCount', { count: r.materialCount })}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {inlineBrandError && <p className={styles.inlineBrandError}>{inlineBrandError}</p>}
                      </div>
                    )}
                    {brandPolling && (
                      <p className={styles.addBrandPolling}>
                        {t('addBrand.adding')} {brandPolling}<span className={styles.dots}><span>.</span><span>.</span><span>.</span></span>
                      </p>
                    )}
                  </div>

                  <div className={ofdBrand ? styles.filterEnabled : styles.filterDisabled}>
                    <label className={styles.label}>{t('spoolForm.material')}</label>
                    <select value={ofdMaterial} onChange={e => { setOfdMaterial(e.target.value); setOfdColor('') }} disabled={!ofdBrand} className={styles.select}>
                      <option value="">{t('addSpool.selectMaterial')}</option>
                      {ofdMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className={ofdMaterial ? styles.filterEnabled : styles.filterDisabled}>
                    <label className={styles.label}>{t('filters.color')}</label>
                    <ColorSelect colors={ofdColors} value={ofdColor} onChange={setOfdColor} disabled={!ofdMaterial} />
                  </div>

                  {ofdBrand && ofdMaterial && (
                    <p className={styles.filterCount}>{t('addSpool.filamentsCount', { count: filteredFilaments.length, material: ofdMaterial })}</p>
                  )}
                </div>
              </div>

              {ofdBrand && ofdMaterial && (
                <div className={styles.filamentScroll}>
                  <div className={styles.filamentGrid}>
                    {filteredFilaments.map((f, i) => (
                      <FilamentCard key={i} filament={f} onClick={() => pickFilament(f)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
