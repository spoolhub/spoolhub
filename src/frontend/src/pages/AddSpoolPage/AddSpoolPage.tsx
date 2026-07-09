/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { spoolsApi } from '@/api/spools'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import { printersApi } from '@/api/printers'
import { filamentsApi } from '@/api/filaments'
import { locationsApi } from '@/api/locations'
import { registerTag, scanTag } from '@/api/nfc'
import ScanDesktop from '@/components/scan/ScanDesktop'
import { getPrinterImage } from '@/utils/printerImages'
import { getMaterialDefaults } from '@/utils/materialDefaults'
import type { FilamentProfile } from '@/types/filament'
import type { SpoolProfileResponse } from '@/types/spoolProfile'
import type { PrinterResponse } from '@/types/printer'
import styles from './AddSpoolPage.module.css'

type AddStep = 'choose' | 'scan' | 'pick' | 'details'
type Mode = 'nfc' | 'manual'
type PlaceType = 'stock' | 'printer'

type PickView = 'profiles' | 'catalog'

interface AddState {
  step: AddStep
  mode: Mode
  tagUid?: string
  brand: string
  material: string
  colorName: string
  filament: FilamentProfile | null
  cur: string
  init: string
  qty: number
  value: string
  emptyw: string
  lowstock: string
  place: PlaceType
  printer: string
  slot: number | null
  loc: string
  openPrinter: boolean
  matUnlocked: boolean
  nozMin: string
  nozMax: string
  bedMin: string
  bedMax: string
  dia: string
  density: string
}

// ───── 3/4 perspective spool icon ─────
function isNearBlack(hex: string) {
  if (!hex.startsWith('#') || hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return r < 50 && g < 50 && b < 50
}

function spoolIcon(color: string, size: number, key: string | number): string {
  const uid = 's_' + key
  const BCX = 82, FCX = 132, CY = 100, FRX = 22, FRY = 66, BRY = 58, BRX = 18, Rflange = 66, sx = FRX / Rflange
  const TOP = CY - BRY, BOT = CY + BRY
  const light = isNearBlack(color)
  const backFlange = light ? '#e4e4e7' : '#16161a'
  const frontFlange = light ? '#f0f0f2' : '#17171b'
  const frontStroke = light ? '#a1a1aa' : '#0c0c0e'
  const hubStart = light ? '#d1d5db' : '#3a3a40'
  const hubEnd = light ? '#e5e7eb' : '#141417'
  const center = light ? '#71717a' : '#0a0a0c'
  let coils = ''
  for (let x = BCX + 6; x <= FCX - 2; x += 4) {
    coils += `<path d="M${x} ${TOP} A${BRX} ${BRY} 0 0 0 ${x} ${BOT}" fill="none" stroke="rgba(0,0,0,.13)" stroke-width="1"/>`
  }
  const n = 9, step = Math.PI * 2 / n, gap = step * 0.40, Ri = 26, Ro = 60
  let windows = ''
  for (let i = 0; i < n; i++) {
    const a1 = i * step + gap / 2, a2 = (i + 1) * step - gap / 2
    const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2)
    windows += `<path d="M${(Ro * c1).toFixed(1)} ${(Ro * s1).toFixed(1)} A${Ro} ${Ro} 0 0 1 ${(Ro * c2).toFixed(1)} ${(Ro * s2).toFixed(1)} L${(Ri * c2).toFixed(1)} ${(Ri * s2).toFixed(1)} A${Ri} ${Ri} 0 0 0 ${(Ri * c1).toFixed(1)} ${(Ri * s1).toFixed(1)} Z" fill="${color}"/>`
  }
  const body = `M${BCX} ${TOP} L${FCX} ${TOP} A${BRX} ${BRY} 0 0 1 ${FCX} ${BOT} L${BCX} ${BOT} A${BRX} ${BRY} 0 0 1 ${BCX} ${TOP} Z`
  const w = Math.round(size * 102 / 144)
  return `<svg width="${w}" height="${size}" viewBox="56 28 102 144" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="${uid}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="45%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".22"/></linearGradient>
      <radialGradient id="${uid}h" cx="42%" cy="34%" r="75%"><stop offset="0" stop-color="${hubStart}"/><stop offset="100%" stop-color="${hubEnd}"/></radialGradient>
    </defs>
    <ellipse cx="${BCX}" cy="${CY}" rx="${FRX}" ry="${FRY}" fill="${backFlange}"/>
    <path d="${body}" fill="${color}"/>
    ${coils}
    <path d="${body}" fill="url(#${uid}b)"/>
    <g transform="translate(${FCX},${CY}) scale(${sx.toFixed(3)},1)">
      <ellipse cx="0" cy="0" rx="${Rflange}" ry="${Rflange}" fill="${frontFlange}"/>
      ${windows}
      <ellipse cx="0" cy="0" rx="${Rflange}" ry="${Rflange}" fill="none" stroke="${frontStroke}" stroke-width="2"/>
      <ellipse cx="0" cy="0" rx="26" ry="26" fill="url(#${uid}h)"/>
      <ellipse cx="0" cy="0" rx="11" ry="11" fill="${center}"/>
    </g>
  </svg>`
}

// ───── NFC icon SVG ─────
const NFC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8a13 13 0 0 1 0 8M9 6a17 17 0 0 1 0 12M13 9.5a6 6 0 0 1 0 5"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>'
const PEN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
const PLUS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
const BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'

// ───── NFC scan step (real reader via SpoolHub Agent) ─────
interface ScanStepProps {
  onBack: () => void
  onClose: () => void
  onTagFound: (tagUid: string) => void
}

function ScanStep({ onBack, onClose, onTagFound }: ScanStepProps) {
  return (
    <>
      <div className={styles.cardHeader}>
        <button className={styles.closeBtn} onClick={onBack} aria-label="Back" dangerouslySetInnerHTML={{ __html: BACK_SVG }} />
        <div className={styles.cardHeaderTitle}>
          <h2>Scan NFC tag</h2>
          <div className={styles.sub}>Hold the spool's NFC tag against your reader</div>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close" dangerouslySetInnerHTML={{ __html: CLOSE_SVG }} />
      </div>
      <div className={styles.cardBody}>
        <ScanDesktop onTagFound={onTagFound} />
      </div>
    </>
  )
}

export default function AddSpoolPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

  const isNfc = pathname === '/spools/add/nfctag'
  const isManual = pathname === '/spools/add/manual'
  const tagUidParam = isNfc ? (searchParams.get('tagUid') ?? '') : ''

  const [filaments, setFilaments] = useState<FilamentProfile[]>([])
  const [profiles, setProfiles] = useState<SpoolProfileResponse[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [pickView, setPickView] = useState<PickView>('profiles')
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [locationNames, setLocationNames] = useState<string[]>([])

  const [state, setState] = useState<AddState>(() => ({
    step: (isNfc || searchParams.get('mode') === 'nfc') ? 'scan' : (isManual ? 'pick' : 'choose'),
    mode: (isNfc || searchParams.get('mode') === 'nfc') ? 'nfc' : 'manual',
    tagUid: isNfc ? tagUidParam : undefined,
    brand: '', material: '', colorName: '', filament: null,
    cur: '1000', init: '1000', qty: 1,
    value: '29.99', emptyw: '250', lowstock: '120',
    place: 'stock', printer: '', slot: null, loc: '',
    openPrinter: false, matUnlocked: false,
    nozMin: '200', nozMax: '220', bedMin: '50', bedMax: '60',
    dia: '1.75', density: '1.24',
  }))
  const [saving, setSaving] = useState(false)

  const curWeight = Math.max(0, +state.cur || 0)
  const initWeight = Math.max(1, +state.init || 1)
  const pct = Math.min(100, Math.round(curWeight / initWeight * 100))
  const low = curWeight <= (+state.lowstock || 120)
  const selectedPrinter = state.place === 'printer' ? printers.find(p => p.id === state.printer) : undefined
  const placementValid = state.place === 'stock'
    ? !!state.loc
    : !!selectedPrinter && (!selectedPrinter.hasAms || state.slot !== null)

  // Load data
  useEffect(() => {
    filamentsApi.getAll().then(setFilaments).catch(() => {})
    spoolProfilesApi.getAll().then(setProfiles).catch(() => {}).finally(() => setProfilesLoading(false))
    printersApi.getAll().then(setPrinters).catch(() => {})
    locationsApi.getAll().then(data => setLocationNames(data.map(l => l.name).sort((a, b) => a.localeCompare(b)))).catch(() => {})
  }, [])

  const showSavedProfiles = useCallback(() => {
    setPickView('profiles')
    setState(s => ({ ...s, material: '', colorName: '', filament: null }))
  }, [])

  const showCatalog = useCallback(() => {
    setPickView('catalog')
  }, [])

  const close = useCallback(() => {
    navigate(isNfc ? '/scan' : isManual ? '/spools/add' : '/spools')
  }, [navigate, isNfc, isManual])

  const goToChoose = useCallback(() => {
    setState(s => ({ ...s, step: 'choose' }))
  }, [])

  const goToScan = useCallback(() => {
    setState(s => ({ ...s, step: 'scan' }))
  }, [])

  const selectFilament = useCallback((f: FilamentProfile) => {
    const def = getMaterialDefaults(f.material)
    setState(s => ({
      ...s,
      filament: f,
      brand: f.brand,
      material: f.material,
      colorName: f.colorName ?? '',
      step: 'details',
      cur: s.cur || '1000',
      init: s.init || '1000',
      nozMin: String(def?.extruderMin ?? 200),
      nozMax: String(def?.extruderMax ?? 220),
      bedMin: String(def?.bedMin ?? 50),
      bedMax: String(def?.bedMax ?? 60),
      dia: String(f.diameterTolerance ?? '1.75'),
      density: String(f.density ?? 1.24),
    }))
  }, [])

  const selectProfile = useCallback((profile: SpoolProfileResponse) => {
    const filament: FilamentProfile = {
      brand: profile.brand,
      filamentName: profile.name,
      material: profile.material,
      density: profile.density,
      extruderMin: profile.extruderMin,
      extruderMax: profile.extruderMax,
      bedMin: profile.bedMin,
      bedMax: profile.bedMax,
      colorHex: profile.colorHex,
      colorName: profile.colorName,
      diameterTolerance: profile.diameterTolerance,
      discontinued: false,
      dataSheetUrl: null,
      safetySheetUrl: null,
    }
    setState(s => ({
      ...s,
      filament,
      brand: profile.brand,
      material: profile.material,
      colorName: profile.colorName,
      step: 'details',
      cur: String(profile.initialWeightG),
      init: String(profile.initialWeightG),
      emptyw: String(profile.spoolWeightG),
      lowstock: String(profile.lowStockThresholdG),
      value: profile.price != null ? String(profile.price) : s.value,
      nozMin: profile.extruderMin != null ? String(profile.extruderMin) : s.nozMin,
      nozMax: profile.extruderMax != null ? String(profile.extruderMax) : s.nozMax,
      bedMin: profile.bedMin != null ? String(profile.bedMin) : s.bedMin,
      bedMax: profile.bedMax != null ? String(profile.bedMax) : s.bedMax,
      dia: profile.diameterTolerance != null ? String(profile.diameterTolerance) : s.dia,
      density: profile.density != null ? String(profile.density) : s.density,
    }))
  }, [])

  const handleTagFound = useCallback(async (tagUid: string) => {
    try {
      const result = await scanTag(tagUid)
      if (result.status === 'found' && result.spool) {
        navigate(`/spools/${result.spool.id}`)
        return
      }
    } catch { /* lookup failed — treat as a new tag */ }
    setPickView('profiles')
    setState(s => ({
      ...s,
      step: 'pick',
      mode: 'nfc',
      tagUid,
      brand: '',
      material: '',
      colorName: '',
      filament: null,
    }))
  }, [navigate])

  // Tag UID arriving via URL (e.g. phone scan) — same lookup as a live reader scan
  useEffect(() => {
    if (!tagUidParam) return
    const toPick = () => setState(s => ({
      ...s, step: 'pick', mode: 'nfc', tagUid: tagUidParam,
      brand: '', material: '', colorName: '', filament: null,
    }))
    scanTag(tagUidParam).then(result => {
      if (result.status === 'found' && result.spool) {
        navigate(`/spools/${result.spool.id}`, { replace: true })
      } else {
        toPick()
      }
    }).catch(toPick)
  }, [tagUidParam])

  const handleSubmit = useCallback(async () => {
    const f = state.filament
    if (!f || !state.brand || !state.material || !placementValid || saving) return

    setSaving(true)
    // Keep the button spinner visible even when the API responds instantly
    const minSpin = new Promise(resolve => setTimeout(resolve, 800))
    try {
      const hex = f.colorHex || '#888'
      const spoolData = {
        brand: state.brand,
        material: state.material,
        colorName: state.colorName || f.colorName || 'Unknown',
        colorHex: hex,
        initialWeightG: initWeight,
        currentWeightG: curWeight,
        spoolWeightG: +state.emptyw || 250,
        lowStockThresholdG: +state.lowstock || 120,
        density: +state.density || 1.24,
        diameterTolerance: +state.dia || 1.75,
        extruderMin: +state.nozMin || undefined,
        extruderMax: +state.nozMax || undefined,
        bedMin: +state.bedMin || undefined,
        bedMax: +state.bedMax || undefined,
        price: +state.value || undefined,
        stockLocation: state.place === 'stock' ? state.loc : undefined,
        tagUid: state.mode === 'nfc' && state.tagUid ? state.tagUid : undefined,
      }

      // Manual mode can add several identical spools at once; NFC always adds one
      const count = state.mode === 'manual' ? Math.max(1, Math.min(99, state.qty || 1)) : 1
      const first = await spoolsApi.add(spoolData)
      for (let i = 1; i < count; i++) {
        await spoolsApi.add(spoolData)
      }

      // Only one spool can occupy the printer/slot — the rest stay in stock
      if (state.place === 'printer' && state.printer) {
        await spoolsApi.assignPrinter(first.id, {
          printerId: state.printer,
          amsSlot: state.slot ?? undefined,
        })
      }

      if (state.mode === 'nfc' && state.tagUid?.trim()) {
        await registerTag(state.tagUid.trim(), first.id)
      }

      window.dispatchEvent(new CustomEvent('spools-updated'))
      await minSpin
      navigate('/spools')
    } catch (err) {
      console.error('Failed to add spool', err)
      setSaving(false)
    }
  }, [state, saving, placementValid, navigate])

  const backFromPick = useCallback(() => {
    if (state.mode === 'nfc') {
      goToScan()
    } else if (isNfc || isManual) {
      // Dedicated route — the choose step lives at /spools/add
      navigate('/spools/add')
    } else {
      goToChoose()
    }
  }, [state.mode, isNfc, isManual, navigate, goToScan, goToChoose])

  // ───── RENDER ─────
  const renderChoose = () => (
    <>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderTitle}>
          <h2>Add spool</h2>
          <div className={styles.sub}>How do you want to add this spool?</div>
        </div>
        <button className={styles.closeBtn} onClick={close} aria-label="Close" dangerouslySetInnerHTML={{ __html: CLOSE_SVG }} />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.chooseGrid}>
          <button className={styles.choiceCard} onClick={() => { setState(s => ({ ...s, step: 'scan', mode: 'nfc' })) }}>
            <span className={styles.choiceBadge}><i></i>Recommended</span>
            <span className={styles.choiceIcon} dangerouslySetInnerHTML={{ __html: NFC_SVG }} />
            <span className={styles.choiceTitle}>Scan NFC tag</span>
            <span className={styles.choiceDesc}>Tap the spool's NFC tag — details autofill and the tag is written to your library.</span>
          </button>
          <button className={styles.choiceCard} onClick={() => { setPickView('profiles'); setState(s => ({ ...s, step: 'pick', mode: 'manual', brand: '', material: '', colorName: '' })) }}>
            <span className={styles.choiceIcon} dangerouslySetInnerHTML={{ __html: PEN_SVG }} />
            <span className={styles.choiceTitle}>Enter manually</span>
            <span className={styles.choiceDesc}>Pick the filament and type in the spool details yourself. No NFC tag is written.</span>
          </button>
        </div>
      </div>
    </>
  )

  const renderPick = () => {
    const filteredBrands = [...new Set(filaments.map(f => f.brand))]
    const filteredMats = state.brand
      ? [...new Set(filaments.filter(f => f.brand === state.brand).map(f => f.material))]
      : []
    const filteredColors = state.brand && state.material
      ? [...new Set(filaments.filter(f => f.brand === state.brand && f.material === state.material).map(f => f.colorName ?? ''))]
      : []
    const matched = state.brand && state.material
      ? filaments.filter(f =>
          f.brand === state.brand &&
          f.material === state.material &&
          (!state.colorName || f.colorName === state.colorName)
        )
      : []

    return (
      <>
        <div className={styles.cardHeader}>
          <button className={styles.closeBtn} onClick={backFromPick} aria-label="Back" dangerouslySetInnerHTML={{ __html: BACK_SVG }} />
          <div className={styles.cardHeaderTitle}>
            <h2>Add spool</h2>
            <div className={styles.sub}>
              {state.mode === 'nfc'
                ? (state.filament ? 'NFC tag detected — confirm the filament below' : 'New NFC tag — set up the filament below')
                : 'Pick the filament, then enter spool details'}
            </div>
            {state.mode === 'nfc' && (
              <span className={styles.nfcBadge}><i></i>{state.filament ? 'NFC tag' : 'New tag'} · will be written</span>
            )}
          </div>
          <button className={styles.closeBtn} onClick={close} aria-label="Close" dangerouslySetInnerHTML={{ __html: CLOSE_SVG }} />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.detailPanel}>
            <div className={styles.sectionLabel}>Filament</div>
            <div className={styles.pickGrid3}>
              <div className={styles.field}>
                <label>Brand</label>
                <select value={state.brand} onChange={e => {
                  setState(s => ({ ...s, brand: e.target.value, material: '', colorName: '', filament: null }))
                  setPickView('profiles')
                }}>
                  <option value="">Select brand…</option>
                  {filteredBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Material</label>
                <select value={state.material} disabled={!state.brand} onChange={e => {
                  const material = e.target.value
                  setState(s => ({ ...s, material, colorName: '', filament: null }))
                  if (material) setPickView('catalog')
                  else setPickView('profiles')
                }}>
                  <option value="">{state.brand ? 'Select material…' : '—'}</option>
                  {filteredMats.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Color <span style={{ color: 'var(--faint)', fontWeight: 400 }}>(optional)</span></label>
                <select value={state.colorName} disabled={!state.material} onChange={e => setState(s => ({ ...s, colorName: e.target.value }))}>
                  <option value="">{state.material ? 'All colors' : '—'}</option>
                  {filteredColors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.segGroup}>
              <button
                type="button"
                className={pickView === 'profiles' ? styles.on : ''}
                aria-pressed={pickView === 'profiles'}
                onClick={showSavedProfiles}
              >
                Saved profiles
              </button>
              <button
                type="button"
                className={pickView === 'catalog' ? styles.on : ''}
                aria-pressed={pickView === 'catalog'}
                onClick={showCatalog}
              >
                Catalog
              </button>
            </div>

            {pickView === 'profiles' ? (
              <>
                <div className={styles.sectionLabel}>Spool profiles</div>
                {profilesLoading ? (
                  <div className={styles.filaGrid}>
                    {[1, 2, 3, 4].map(i => <div key={i} className={styles.filaSkeleton} />)}
                  </div>
                ) : profiles.length > 0 ? (
                  <div className={styles.filaGrid}>
                    {profiles.map((p, i) => (
                      <button key={p.id} type="button" className={styles.filaCard} onClick={() => selectProfile(p)}>
                        <div className={styles.filaDisc} dangerouslySetInnerHTML={{ __html: spoolIcon(p.colorHex || '#888', 40, 'prof' + i) }} />
                        <div className={styles.filaMeta}>
                          <div className={styles.filaName}>{p.colorName || p.name}</div>
                          <div className={styles.filaBrand}>{p.brand} · {p.material}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>No saved profiles yet — switch to Catalog and pick a brand & material.</div>
                )}
              </>
            ) : (
              <>
                <div className={styles.sectionLabel}>
                  {state.material ? `${matched.length} filament${matched.length === 1 ? '' : 's'}` : 'Catalog filaments'}
                </div>
                {state.brand && state.material ? (
                  matched.length > 0 ? (
                    <div className={styles.filaGrid}>
                      {matched.map((f, i) => (
                        <button key={i} className={styles.filaCard} onClick={() => selectFilament(f)}>
                          <div className={styles.filaDisc} dangerouslySetInnerHTML={{ __html: spoolIcon(f.colorHex || '#888', 40, 'p' + i) }} />
                          <div className={styles.filaMeta}>
                            <div className={styles.filaName}>{f.colorName || f.filamentName}</div>
                            <div className={styles.filaBrand}>{f.material}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>No catalog match — pick a different material.</div>
                  )
                ) : (
                  <div className={styles.emptyState}>Select a brand and material above to browse filaments.</div>
                )}
              </>
            )}
          </div>
        </div>
      </>
    )
  }

  const renderDetails = () => {
    const f = state.filament
    if (!f) return null

    return (
      <>
        <div className={styles.cardBody}>
          <div className={styles.detailPanel}>
            <div className={styles.selectedCard}>
              <div className={styles.selectedDisc} dangerouslySetInnerHTML={{ __html: spoolIcon(f.colorHex || '#888', 56, 'sel') }} />
              <div className={styles.selectedInfo}>
                <div className="b" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.01em' }}>{f.brand}</div>
                <div className="c" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{f.colorName || f.filamentName}</div>
                <div className={styles.tags}><span className={styles.tag}>{f.material}</span></div>
              </div>
              <button className={`${styles.changeBtn} ${styles.changeBtnIcon}`} onClick={() => setState(s => ({ ...s, step: state.mode === 'nfc' ? 'scan' : 'pick' }))} title="Change filament" dangerouslySetInnerHTML={{ __html: CLOSE_SVG }} />
            </div>

            <div className={styles.sectionLabel}>Weight</div>
            <div className={styles.wbar}>
              <div className={styles.wbarMeta}>
                <span className={styles.wbarGrams} id="as_wlabel">{curWeight} g <small>/ {initWeight} g</small></span>
                <span className={styles.wbarPct} id="as_wpct">{pct}%</span>
              </div>
              <div className={styles.wbarTrack}><i className={low ? 'low' : ''} style={{ width: pct + '%' }}></i></div>
            </div>

            <div className={state.mode === 'manual' ? styles.pickGrid3 : styles.pickGrid2}>
              <div className={styles.field}>
                <label>Current (g)</label>
                <input type="number" value={state.cur} min="0"
                  onChange={e => setState(s => ({ ...s, cur: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Spool total (g)</label>
                <input type="number" value={state.init} min="1"
                  onChange={e => setState(s => ({ ...s, init: e.target.value }))} />
              </div>
              {state.mode === 'manual' && (
                <div className={styles.field}>
                  <label>Quantity</label>
                  <div className={styles.qtyStepper}>
                    <button type="button" aria-label="Decrease"
                      onClick={() => setState(s => ({ ...s, qty: Math.max(1, (s.qty || 1) - 1) }))}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" width="16" height="16"><path d="M5 12h14"/></svg>
                    </button>
                    <input type="number" min="1" max="99" value={state.qty}
                      onChange={e => setState(s => ({ ...s, qty: Math.max(1, Math.min(99, Math.round(+e.target.value || 1))) }))} />
                    <button type="button" aria-label="Increase"
                      onClick={() => setState(s => ({ ...s, qty: Math.min(99, (s.qty || 1) + 1) }))}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.sectionLabel}>Inventory</div>
            <div className={styles.pickGrid3}>
              <div className={styles.field}>
                <label>Spool value ($)</label>
                <input type="number" value={state.value} min="0" step="0.01"
                  onChange={e => setState(s => ({ ...s, value: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Empty spool weight (g)</label>
                <input type="number" value={state.emptyw} min="0" step="5"
                  onChange={e => setState(s => ({ ...s, emptyw: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Low stock (g)</label>
                <input type="number" value={state.lowstock} min="0" step="10"
                  onChange={e => setState(s => ({ ...s, lowstock: e.target.value }))} />
              </div>
            </div>

            <div className={styles.collapsible} data-open={state.openPrinter}>
              <div className={styles.collapsibleHeader} onClick={() => setState(s => ({ ...s, openPrinter: !s.openPrinter }))} role="button" tabIndex={0}>
                <span>Printer settings &amp; Material properties</span>
                <span className={styles.collapsibleTools}>
                  <button type="button" className={`${styles.editBtn}${state.matUnlocked ? ` ${styles['on']}` : ''}`}
                    onClick={e => { e.stopPropagation(); setState(s => ({ ...s, matUnlocked: !s.matUnlocked })) }}
                    title="Edit settings">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <svg className={styles.collapsibleChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
              <div className={styles.collapsibleBody}>
                <div className={styles.pickGrid2}>
                  <div>
                    <div className={styles.pickGrid2} style={{ gap: 12 }}>
                      <div className={styles.field}>
                        <label>Nozzle temp (°C)</label>
                        <div className={styles.rangeRow}>
                          <input type="number" value={state.nozMin} min="150" max="350" step="5" disabled={!state.matUnlocked}
                            onChange={e => setState(s => ({ ...s, nozMin: e.target.value }))} />
                          <span>–</span>
                          <input type="number" value={state.nozMax} min="150" max="350" step="5" disabled={!state.matUnlocked}
                            onChange={e => setState(s => ({ ...s, nozMax: e.target.value }))} />
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label>Bed temp (°C)</label>
                        <div className={styles.rangeRow}>
                          <input type="number" value={state.bedMin} min="0" max="120" step="5" disabled={!state.matUnlocked}
                            onChange={e => setState(s => ({ ...s, bedMin: e.target.value }))} />
                          <span>–</span>
                          <input type="number" value={state.bedMax} min="0" max="120" step="5" disabled={!state.matUnlocked}
                            onChange={e => setState(s => ({ ...s, bedMax: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.subColBorder}>
                    <div className={styles.pickGrid2} style={{ gap: 12 }}>
                      <div className={styles.field}>
                        <label>Diameter (mm)</label>
                        <select value={state.dia} disabled={!state.matUnlocked}
                          onChange={e => setState(s => ({ ...s, dia: e.target.value }))}>
                          <option value="1.75">1.75</option>
                          <option value="2.85">2.85</option>
                          <option value="3.00">3.00</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label>Density (g/cm³)</label>
                        <input type="number" value={state.density} min="0.5" max="3" step="0.01" disabled={!state.matUnlocked}
                          onChange={e => setState(s => ({ ...s, density: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.sectionLabel}>Placement</div>
            <div className={styles.segGroup}>
              <button className={state.place === 'stock' ? styles.on : ''} data-t="stock"
                onClick={() => setState(s => ({ ...s, place: 'stock' }))}>In stock</button>
              <button className={state.place === 'printer' ? styles.on : ''} data-t="printer"
                onClick={() => setState(s => ({ ...s, place: 'printer' }))}>Loaded in printer</button>
            </div>

            {state.place === 'stock' && (
              <div className={styles.field}>
                <label>Storage location</label>
                <select value={state.loc} onChange={e => setState(s => ({ ...s, loc: e.target.value }))}>
                  <option value="">Select location…</option>
                  {locationNames.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            )}

            {state.place === 'printer' && (
              <>
                <div className={styles.field}>
                  <label>Printer</label>
                  <select value={state.printer} onChange={e => setState(s => ({ ...s, printer: e.target.value, slot: null }))}>
                    <option value="">Select printer…</option>
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>{p.name || p.model || p.id}</option>
                    ))}
                  </select>
                </div>
                {state.printer && (
                  <div style={{ marginTop: 14 }}>
                    {(() => {
                      const printer = printers.find(p => p.id === state.printer)
                      if (!printer) return null
                      return (
                        <div className={styles.amsLayout}>
                          <div className={styles.printerThumb}>
                            <img src={getPrinterImage(printer.brand, printer.model)} alt={printer.name} onError={e => { (e.target as HTMLElement).remove() }} />
                          </div>
                          <div className={styles.amsRight}>
                            {printer.hasAms ? (
                              <>
                                <div className={styles.slotLabel}>Choose AMS slot</div>
                                <div className={styles.slotPick}>
                                  {[printer.tray1Spool, printer.tray2Spool, printer.tray3Spool, printer.tray4Spool].map((tray, i) => {
                                    const n = i + 1
                                    const sel = n === state.slot
                                    if (tray) {
                                      return (
                                        <div key={i} className={`${styles.slotTile} ${styles.taken}`} title={`${tray.brand} · ${tray.colorName}`}>
                                          <span className={styles.slotNum}>{n}</span>
                                          <span className={styles.slotSpool} dangerouslySetInnerHTML={{ __html: spoolIcon(tray.colorHex || '#888', 26, 'slot' + n) }} />
                                          <span className={styles.slotName}>{tray.colorName || tray.brand}</span>
                                        </div>
                                      )
                                    }
                                    return (
                                      <div key={i} className={`${styles.slotTile} ${styles.empty}${sel ? ` ${styles['on']}` : ''}`}
                                        onClick={() => setState(s => ({ ...s, slot: n }))}>
                                        {sel && <span className={styles.slotHere}>Goes here</span>}
                                        <span className={styles.slotNum}>{n}</span>
                                        <div className={styles.slotIcon} dangerouslySetInnerHTML={{ __html: PLUS_SVG }} />
                                        <span className={styles.slotName}>Empty</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </>
                            ) : printer.extraSpool ? (
                              <div className={styles.loadedAlert} role="alert">
                                <span className={styles.slotSpool} dangerouslySetInnerHTML={{ __html: spoolIcon(printer.extraSpool.colorHex || '#888', 20, 'extra') }} />
                                This printer already has {printer.extraSpool.colorName || printer.extraSpool.brand} loaded — it will be replaced.
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </>
            )}

            <div className={styles.detailActions}>
              <button className={`${styles.btn} ${styles['back']}`} onClick={() => setState(s => ({ ...s, step: state.mode === 'nfc' ? 'scan' : 'pick' }))}>
                <span dangerouslySetInnerHTML={{ __html: BACK_SVG }} /> Back
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSubmit} disabled={saving || !placementValid}
                title={placementValid ? undefined
                  : selectedPrinter?.hasAms ? 'Choose an AMS slot first'
                  : 'Choose a storage location or printer first'}>
                {saving
                  ? <span className={styles.btnSpinner} />
                  : <span dangerouslySetInnerHTML={{ __html: PLUS_SVG }} />}
                {saving ? 'Adding…' : (state.mode === 'manual' && state.qty > 1 ? `Add ${state.qty} spools` : 'Add spool')}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Render inline in the page space, not as overlay, when at /spools/add.
  // The page will be wrapped in a full-viewport container by the route.
  const content = (() => {
    switch (state.step) {
      case 'choose': return isNfc || isManual ? null : renderChoose()
      case 'scan': return (
        <ScanStep
          onBack={isNfc || isManual ? close : goToChoose}
          onClose={close}
          onTagFound={handleTagFound}
        />
      )
      case 'pick': return renderPick()
      case 'details': return renderDetails()
      default: return null
    }
  })()

  return (
    <div className={styles.wrap || ''} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.card || ''} style={{ border: 0, borderRadius: 0, flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {content || (state.step === 'choose' ? renderChoose() : null)}
      </div>
    </div>
  )
}