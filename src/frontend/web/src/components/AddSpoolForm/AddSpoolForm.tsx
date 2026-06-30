/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import { settingsApi } from '@/api/settings'
import { locationsApi } from '@/api/locations'
import { registerTag } from '@/api/nfc'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import type { SpoolResponse } from '@/types/spool'
import type { SpoolProfileResponse } from '@/types/spoolProfile'
import { filamentsApi } from '@/api/filaments'
import { brandsApi } from '@/api/brands'
import FilamentCard from '@/components/FilamentCard'
import SpoolEditor from '@/components/SpoolEditor/SpoolEditor'
import AmsConflictModal from '@/components/AmsConflictModal/AmsConflictModal'
import { getPrinterImage } from '@/utils/printerImages'
import { getMaterialDefaults } from '@/utils/materialDefaults'
import type { FilamentProfile } from '@/types/filament'
import type { PrinterResponse } from '@/types/printer'
import type { BrandApiResponse, OfdBrandResult } from '@/types/brand'
import styles from './AddSpoolForm.module.css'

interface Props {
  tagUid?: string
  tagUidLocked?: boolean
  onFilamentSectionVisible?: (visible: boolean) => void
  onSpoolEditorVisible?: (visible: boolean) => void
}

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
          : <span className={styles.colorDotEmpty} />
        }
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
            <button
              key={f.colorName}
              type="button"
              onClick={() => { onChange(f.colorName ?? ''); setOpen(false) }}
              className={styles.colorOption}
            >
              {f.colorHex
                ? <span className={styles.colorDot} style={{ backgroundColor: f.colorHex }} />
                : <span className={styles.colorDotEmpty} />
              }
              <span className={styles.colorOptionLabel}>{f.colorName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AddSpoolForm({ tagUid, onFilamentSectionVisible, onSpoolEditorVisible }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [filaments, setFilaments] = useState<FilamentProfile[]>([])
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [allSpools, setAllSpools] = useState<SpoolResponse[]>([])
  const [locationNames, setLocationNames] = useState<string[]>([])
  const [profiles, setProfiles] = useState<SpoolProfileResponse[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const profilesRef = useRef<SpoolProfileResponse[]>([])

  useEffect(() => {
    spoolProfilesApi.getAll().then(data => {
      setProfiles(data)
      profilesRef.current = data
    }).catch(() => {})
  }, [])

  const [ofdBrand, setOfdBrand] = useState('')
  const [ofdMaterial, setOfdMaterial] = useState('')
  const [ofdColor, setOfdColor] = useState('')
  const [selectedFilament, setSelectedFilament] = useState<FilamentProfile | null>(null)

  useEffect(() => {
    if (onFilamentSectionVisible) {
      onFilamentSectionVisible(!!ofdBrand && !!ofdMaterial)
    }
  }, [ofdBrand, ofdMaterial, onFilamentSectionVisible])

  const [currentWeightG, setCurrentWeightG] = useState('')
  const [initialWeightG, setInitialWeightG] = useState('')
  const [spoolWeightG, setSpoolWeightG] = useState('')
  const [lowStockThresholdG, setLowStockThresholdG] = useState('')
  const [notes, setNotes] = useState('')
  const [stockLocation, setStockLocation] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [printerId, setPrinterId] = useState<string | null>(null)
  const [amsSlot, setAmsSlot] = useState<number | null>(null)
  const [weightError, setWeightError] = useState('')
  const [currentWeightShake, setCurrentWeightShake] = useState(false)
  const [currentWeightStatus, setCurrentWeightStatus] = useState<'neutral' | 'error' | 'valid'>('neutral')
  const [printerError, setPrinterError] = useState(false)
  const [printerShakeKey, setPrinterShakeKey] = useState(0)
  const [amsSlotError, setAmsSlotError] = useState(false)
  const [stockLocationError, setStockLocationError] = useState(false)
  const [stockLocationShakeKey, setStockLocationShakeKey] = useState(0)
  const [conflictSpool, setConflictSpool] = useState<SpoolResponse | null>(null)
  const [spoolToEvict, setSpoolToEvict] = useState<SpoolResponse | null>(null)
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [diameterTolerance, setDiameterTolerance] = useState<string>('')
  const [density, setDensity] = useState<string>('')
  const [extruderMin, setExtruderMin] = useState<string>('')
  const [extruderMax, setExtruderMax] = useState<string>('')
  const [bedMin, setBedMin] = useState<string>('')
  const [bedMax, setBedMax] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [addedSpool, setAddedSpool] = useState<{ brand: string; colorName: string } | null>(null)
  const [showAddBrandModal, setShowAddBrandModal] = useState(false)
  const [brandPolling, setBrandPolling] = useState<string | null>(null)
  const [dbBrands, setDbBrands] = useState<BrandApiResponse[]>([])
  const [inlineBrandQuery, setInlineBrandQuery] = useState('')
  const [inlineBrandResults, setInlineBrandResults] = useState<OfdBrandResult[]>([])
  const [inlineBrandSearching, setInlineBrandSearching] = useState(false)
  const [inlineBrandError, setInlineBrandError] = useState<string | null>(null)
  const [highlightBrand, setHighlightBrand] = useState(false)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inlineAbortRef = useRef<AbortController | null>(null)
  const inlineSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleProfileSelect = useCallback((profileId: string) => {
    setSelectedProfileId(profileId)
    if (!profileId) return
    const list = profilesRef.current
    const profile = list.find(p => p.id === profileId)
    if (!profile) return
    setOfdBrand(profile.brand)
    setOfdMaterial(profile.material)
    setOfdColor(profile.colorName)
    setCurrentWeightG(String(profile.initialWeightG))
    setInitialWeightG(String(profile.initialWeightG))
    setSpoolWeightG(String(profile.spoolWeightG))
    setLowStockThresholdG(String(profile.lowStockThresholdG))
    setNotes('')
    setStockLocation('')
    setPrice(profile.price != null ? String(profile.price) : '')
    setDensity(profile.density != null ? String(profile.density) : '')
    setDiameterTolerance(profile.diameterTolerance != null ? String(profile.diameterTolerance) : '')
    setExtruderMin(profile.extruderMin != null ? String(profile.extruderMin) : '')
    setExtruderMax(profile.extruderMax != null ? String(profile.extruderMax) : '')
    setBedMin(profile.bedMin != null ? String(profile.bedMin) : '')
    setBedMax(profile.bedMax != null ? String(profile.bedMax) : '')
    setIsActive(false)
    setWeightError('')
    setCurrentWeightStatus('neutral')
    setPrinterId(null)
    setAmsSlot(null)
    setPrinterError(false)
    setAmsSlotError(false)
    setConflictSpool(null)
    setSpoolToEvict(null)
    setSubmitError(null)
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
        // aborted or network error — ignore
      } finally {
        setInlineBrandSearching(false)
      }
    }, 300)
    return () => { if (inlineSearchTimerRef.current) clearTimeout(inlineSearchTimerRef.current) }
  }, [inlineBrandQuery])

  useEffect(() => {
    return () => { if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current) }
  }, [])

  const allSpoolsRef = useRef<SpoolResponse[]>([])
  const printersRef = useRef<PrinterResponse[]>([])

  useEffect(() => {
    filamentsApi.getAll().then(setFilaments).catch(() => {})
    printersApi.getAll().then(data => { setPrinters(data); printersRef.current = data }).catch(() => {})
    spoolsApi.getAll().then(data => { setAllSpools(data); allSpoolsRef.current = data }).catch(() => {})
    settingsApi.getApp().then(s => { if (s.currency) setCurrency(s.currency) }).catch(() => {})
    locationsApi.getAll().then(locs => setLocationNames(locs.map(l => l.name))).catch(() => {})
    brandsApi.getAll().then(setDbBrands).catch(() => {})
  }, [])

  const handleBrandAdded = useCallback((brandName: string) => {
    setShowAddBrandModal(false)
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
      const brandFilaments = updated.filter(f => f.brand === brandName)
      if (brandFilaments.length > 0) {
        setOfdBrand(brandName)
        setOfdMaterial('')
        setOfdColor('')
        setBrandPolling(null)
        return
      }
      if (brandPolling) setTimeout(poll, 2000)
    }
    setTimeout(poll, 2000)
  }, [brandPolling])

  const selectInlineBrand = useCallback(async (r: OfdBrandResult) => {
    if (dbBrands.some(b => b.ofdSlug === r.slug)) {
      setInlineBrandError(t('addBrand.duplicateError'))
      return
    }
    setInlineBrandError(null)
    setInlineBrandSearching(true)
    try {
      await brandsApi.add({ name: r.name, domain: '', ofdSlug: r.slug })
      const updatedBrands = await brandsApi.getAll()
      setDbBrands(updatedBrands)
      handleBrandAdded(r.name)
    } catch {
      setInlineBrandError(t('addBrand.addError'))
    } finally {
      setInlineBrandSearching(false)
    }
  }, [dbBrands, handleBrandAdded, t])

  const checkNonAmsConflict = useCallback((pid: string) => {
    const printer = printersRef.current.find(p => p.id === pid)
    if (!printer || printer.hasAms) return
    const occupant = allSpoolsRef.current.find(s => s.printerId === pid)
    if (occupant) setConflictSpool(occupant)
  }, [])

  const ofdBrands    = useMemo(() => [...new Set(filaments.map(f => f.brand))].sort(), [filaments])
  const ofdMaterials = useMemo(() => [...new Set(filaments.filter(f => f.brand === ofdBrand).map(f => f.material))].sort(), [filaments, ofdBrand])
  const ofdColors    = useMemo(() => filaments.filter(f => f.brand === ofdBrand && f.material === ofdMaterial && f.colorName), [filaments, ofdBrand, ofdMaterial])

  const occupiedSlots = useMemo(() => {
    if (!printerId) return {}
    const result: Record<number, { colorHex: string; colorName: string; brand: string; material: string }> = {}
    for (const s of allSpools) {
      if (s.printerId === printerId && s.amsSlot != null)
        result[s.amsSlot] = { colorHex: s.colorHex, colorName: s.colorName, brand: s.brand, material: s.material }
    }
    return result
  }, [allSpools, printerId])

  const filteredFilaments = useMemo(() => {
    if (!ofdBrand || !ofdMaterial) return []
    return filaments.filter(f =>
      f.brand === ofdBrand && f.material === ofdMaterial && (!ofdColor || f.colorName === ofdColor)
    )
  }, [filaments, ofdBrand, ofdMaterial, ofdColor])

  function pickFilament(f: FilamentProfile) {
    setSelectedFilament(f)
    onSpoolEditorVisible?.(true)
    setCurrentWeightG('1000')
    setInitialWeightG('1000')
    setSpoolWeightG('250')
    setLowStockThresholdG('100')
    setNotes('')
    setStockLocation('')
    setPrice('')
    setDiameterTolerance(f.diameterTolerance != null ? String(f.diameterTolerance) : '')
    setDensity(f.density != null ? String(f.density) : '')
    const matDefaults = getMaterialDefaults(f.material)
    setExtruderMin(f.extruderMin != null ? String(f.extruderMin) : (matDefaults ? String(matDefaults.extruderMin) : ''))
    setExtruderMax(f.extruderMax != null ? String(f.extruderMax) : (matDefaults ? String(matDefaults.extruderMax) : ''))
    setBedMin(f.bedMin != null ? String(f.bedMin) : (matDefaults ? String(matDefaults.bedMin) : ''))
    setBedMax(f.bedMax != null ? String(f.bedMax) : (matDefaults ? String(matDefaults.bedMax) : ''))
    setIsActive(false)
    setWeightError('')
    setCurrentWeightStatus('neutral')
    setPrinterId(null)
    setAmsSlot(null)
    setPrinterError(false)
    setAmsSlotError(false)
    setConflictSpool(null)
    setSpoolToEvict(null)
    setSubmitError(null)
  }

  function handleCurrentWeightChange(v: string) {
    setCurrentWeightG(v)
    if (currentWeightStatus === 'neutral') return
    const cw = parseFloat(v), iw = parseFloat(initialWeightG)
    setCurrentWeightStatus(!isNaN(cw) && !isNaN(iw) && cw <= iw ? 'valid' : 'error')
  }

  function handleBusyTrayClick(slot: number) {
    const occupant = allSpools.find(s => s.printerId === printerId && s.amsSlot === slot)
    if (occupant) setConflictSpool(occupant)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFilament) return

    const w = parseFloat(initialWeightG)
    if (!initialWeightG || isNaN(w) || w <= 0) { setWeightError(t('addSpool.weightError')); return }

    const cw = currentWeightG ? parseFloat(currentWeightG) : w
    if (cw > w) {
      setCurrentWeightStatus('error')
      setCurrentWeightShake(true)
      setTimeout(() => setCurrentWeightShake(false), 500)
      return
    }

    setWeightError('')

    if (!isActive && !stockLocation.trim()) { setStockLocationError(true); setStockLocationShakeKey(k => k + 1); return }

    if (isActive && !printerId) { setPrinterError(true); setPrinterShakeKey(k => k + 1); return }

    const selectedPrinter = printers.find(p => p.id === printerId)
    if (isActive && selectedPrinter?.hasAms && amsSlot == null) { setAmsSlotError(true); return }

    setPrinterError(false)
    setAmsSlotError(false)
    setSubmitting(true)
    setSubmitError(null)

    try {
      if (spoolToEvict) await spoolsApi.deactivate(spoolToEvict.id)
      const cwFinal = currentWeightG ? parseFloat(currentWeightG) : w
      let created = await spoolsApi.add({
        brand: selectedFilament.brand,
        material: selectedFilament.material,
        colorName: selectedFilament.colorName ?? '',
        colorHex: selectedFilament.colorHex ?? '#ffffff',
        initialWeightG: w,
        currentWeightG: cwFinal,
        spoolWeightG: spoolWeightG ? parseFloat(spoolWeightG) : undefined,
        lowStockThresholdG: lowStockThresholdG ? parseFloat(lowStockThresholdG) : undefined,
        isActive,
        notes: notes.trim() || undefined,
        density: density ? parseFloat(density) : undefined,
        diameterTolerance: diameterTolerance ? parseFloat(diameterTolerance) : undefined,
        extruderMin: extruderMin ? parseInt(extruderMin) : undefined,
        extruderMax: extruderMax ? parseInt(extruderMax) : undefined,
        bedMin: bedMin ? parseInt(bedMin) : undefined,
        bedMax: bedMax ? parseInt(bedMax) : undefined,
        tagUid: tagUid?.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        stockLocation: stockLocation.trim() || undefined,
      })
      if (printerId) {
        created = await spoolsApi.assignPrinter(created.id, { printerId, amsSlot })
      }
      if (tagUid?.trim()) await registerTag(tagUid.trim(), created.id)
      window.dispatchEvent(new CustomEvent('spools-updated'))
      if (tagUid?.trim()) {
        navigate('/spools')
      } else {
        onSpoolEditorVisible?.(false)
        setAddedSpool({ brand: selectedFilament.brand, colorName: selectedFilament.colorName ?? '' })
      }
    } catch {
      setSubmitError(t('addSpool.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (addedSpool) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h1 className={styles.title}>{t('addSpool.successTitle')}</h1>
              <p className={styles.subtitle}>{addedSpool.brand} · {addedSpool.colorName}</p>
            </div>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className={styles.successBtns}>
            <button
              type="button"
              className={styles.btnAddAnother}
              onClick={() => {
                setAddedSpool(null)
                setSelectedFilament(null)
              }}
            >
              {t('addSpool.addAnother')}
            </button>
            <button
              type="button"
              className={styles.btnDone}
              onClick={() => navigate('/spools')}
            >
              {t('addSpool.viewSpools')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (selectedFilament) {
    const conflictPrinter = printers.find(p => p.id === printerId)
    return (
      <>
        <SpoolEditor
          brand={selectedFilament.brand}
          material={selectedFilament.material}
          colorName={selectedFilament.colorName ?? selectedFilament.filamentName}
          colorHex={selectedFilament.colorHex}
          tagUid={tagUid}
          extruderMin={extruderMin ? parseInt(extruderMin) : selectedFilament.extruderMin}
          extruderMax={extruderMax ? parseInt(extruderMax) : selectedFilament.extruderMax}
          bedMin={bedMin ? parseInt(bedMin) : selectedFilament.bedMin}
          bedMax={bedMax ? parseInt(bedMax) : selectedFilament.bedMax}
          density={density ? parseFloat(density) : selectedFilament.density}
          diameterTolerance={diameterTolerance ? parseFloat(diameterTolerance) : selectedFilament.diameterTolerance}
          onExtruderMinChange={setExtruderMin}
          onExtruderMaxChange={setExtruderMax}
          onBedMinChange={setBedMin}
          onBedMaxChange={setBedMax}
          onDensityChange={setDensity}
          onDiameterToleranceChange={setDiameterTolerance}
          currentWeightG={currentWeightG} setCurrentWeightG={handleCurrentWeightChange}
          currentWeightShake={currentWeightShake}
          currentWeightStatus={currentWeightStatus}
          initialWeightG={initialWeightG} setInitialWeightG={setInitialWeightG}
          spoolWeightG={spoolWeightG} setSpoolWeightG={setSpoolWeightG}
          lowStockThresholdG={lowStockThresholdG} setLowStockThresholdG={setLowStockThresholdG}
          notes={notes} setNotes={setNotes}
          stockLocation={stockLocation} setStockLocation={v => { setStockLocation(v); setStockLocationError(false) }}
          stockLocationError={stockLocationError}
          stockLocationShakeKey={stockLocationShakeKey}
          onStockLocationShakeEnd={() => setStockLocationError(false)}
          stockLocationOptions={[...new Set([...locationNames, ...allSpools.map(s => s.stockLocation).filter(Boolean) as string[]])]}
          price={price} setPrice={setPrice}
          currency={currency}
          isActive={isActive} setIsActive={v => { setIsActive(v); if (!v) { setPrinterError(false); setAmsSlotError(false) } }}
          printers={printers} printerId={printerId}
          setPrinterId={v => {
            setPrinterId(v)
            setPrinterError(false)
            if (!v) { setAmsSlot(null); setAmsSlotError(false) } else { checkNonAmsConflict(v) }
          }}
          amsSlot={amsSlot} onAmsSlotChange={v => { setAmsSlot(v); if (v != null) setAmsSlotError(false) }}
          occupiedSlots={occupiedSlots}
          currentSpoolColor={selectedFilament.colorHex ?? '#888'}
          printerError={printerError}
          printerShakeKey={printerShakeKey}
          onPrinterShakeEnd={() => setPrinterError(false)}
          amsSlotError={amsSlotError}
          onBusyTrayClick={handleBusyTrayClick}
          weightError={weightError} setWeightError={setWeightError}
          submitting={submitting}
          submitError={submitError}
          onSubmit={handleSubmit}
          onCancel={() => { setSelectedFilament(null); onSpoolEditorVisible?.(false) }}
        />
        {conflictSpool && (
          <AmsConflictModal
            printerImgSrc={conflictPrinter ? getPrinterImage(conflictPrinter.brand, conflictPrinter.model) : '/printers/generic.svg'}
            printerBrand={conflictPrinter?.brand}
            printerModel={conflictPrinter?.model}
            traySlot={conflictSpool.amsSlot ?? undefined}
            occupantSpool={conflictSpool}
            onCancel={() => {
              if (conflictSpool.amsSlot == null) setPrinterId(null)
              setConflictSpool(null)
            }}
            onConfirm={() => {
              setSpoolToEvict(conflictSpool)
              if (conflictSpool.amsSlot != null) { setAmsSlot(conflictSpool.amsSlot); setAmsSlotError(false) }
              setConflictSpool(null)
            }}
          />
        )}
      </>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h1 className={styles.title}>{t('addSpool.title')}</h1>
            <p className={styles.subtitle}>{t('addSpool.subtitle')}</p>
          </div>
          {tagUid && (
            <div className={styles.nfcBadge}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="7" x2="5" y2="17" />
                <path d="M8 9.5a4 4 0 0 1 0 5" />
                <path d="M11 8a7 7 0 0 1 0 8" />
                <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
              </svg>
              <span className={styles.nfcBadgeText}>{t('addSpool.nfcTag')}</span>
            </div>
          )}
        </div>

        <div className={styles.profileSelect}>
          <label className={styles.label}>{t('spoolProfile.selectProfile')}</label>
          <select
            value={selectedProfileId}
            onChange={e => handleProfileSelect(e.target.value)}
            className={styles.select}
          >
            <option value="">{t('spoolProfile.custom')}</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.brand} {p.material} {p.colorName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGrid}>
          <div>
            <label className={styles.label}>{t('filters.brand')}</label>
            {!showAddBrandModal ? (
              <select
                value={ofdBrand}
                onChange={e => {
                  if (e.target.value === '__add__') { setShowAddBrandModal(true); setOfdBrand(''); return }
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
                  type="text"
                  className={styles.inlineBrandInput}
                  placeholder={t('addBrand.searchLabel')}
                  value={inlineBrandQuery}
                  onChange={e => { setInlineBrandQuery(e.target.value); if (!e.target.value) setInlineBrandResults([]) }}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.inlineBrandClose}
                  onClick={() => { setShowAddBrandModal(false); setInlineBrandQuery(''); setInlineBrandResults([]) }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {inlineBrandSearching && <div className={styles.inlineBrandSpinner} />}
                {inlineBrandResults.length > 0 && (
                  <ul className={styles.inlineBrandDropdown}>
                    {inlineBrandResults.map(r => (
                      <li key={r.slug}>
                        <button
                          type="button"
                          onClick={() => selectInlineBrand(r)}
                          className={styles.inlineBrandResult}
                        >
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
            <select
              value={ofdMaterial}
              onChange={e => { setOfdMaterial(e.target.value); setOfdColor('') }}
              disabled={!ofdBrand}
              className={styles.select}
            >
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
  )
}
