import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { filamentsApi } from '@/api/filaments'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import { getMaterialDefaults } from '@/utils/materialDefaults'
import type { FilamentProfile } from '@/types/filament'
import styles from '@/pages/AddSpoolPage/AddSpoolPage.module.css'

const BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
const PLUS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'

function spoolSvg(color: string, size: number, key: string): string {
  const uid = 'sp_' + key
  const BCX = 82, FCX = 132, CY = 100, FRX = 22, FRY = 66, BRY = 58, BRX = 18, Rflange = 66, sx = FRX / Rflange
  const TOP = CY - BRY, BOT = CY + BRY
  let coils = ''
  for (let x = BCX + 6; x <= FCX - 2; x += 4) coils += `<path d="M${x} ${TOP} A${BRX} ${BRY} 0 0 0 ${x} ${BOT}" fill="none" stroke="rgba(0,0,0,.13)" stroke-width="1"/>`
  const n = 9, step = Math.PI * 2 / n, gap = step * 0.40, Ri = 26, Ro = 60
  let windows = ''
  for (let i = 0; i < n; i++) {
    const a1 = i * step + gap / 2, a2 = (i + 1) * step - gap / 2
    const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2)
    windows += `<path d="M${(Ro*c1).toFixed(1)} ${(Ro*s1).toFixed(1)} A${Ro} ${Ro} 0 0 1 ${(Ro*c2).toFixed(1)} ${(Ro*s2).toFixed(1)} L${(Ri*c2).toFixed(1)} ${(Ri*s2).toFixed(1)} A${Ri} ${Ri} 0 0 0 ${(Ri*c1).toFixed(1)} ${(Ri*s1).toFixed(1)} Z" fill="${color}"/>`
  }
  const body = `M${BCX} ${TOP} L${FCX} ${TOP} A${BRX} ${BRY} 0 0 1 ${FCX} ${BOT} L${BCX} ${BOT} A${BRX} ${BRY} 0 0 1 ${BCX} ${TOP} Z`
  const w = Math.round(size * 102 / 144)
  return `<svg width="${w}" height="${size}" viewBox="56 28 102 144" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="${uid}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="45%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".22"/></linearGradient><radialGradient id="${uid}h" cx="42%" cy="34%" r="75%"><stop offset="0" stop-color="#3a3a40"/><stop offset="100%" stop-color="#141417"/></radialGradient></defs><ellipse cx="${BCX}" cy="${CY}" rx="${FRX}" ry="${FRY}" fill="#16161a"/><path d="${body}" fill="${color}"/>${coils}<path d="${body}" fill="url(#${uid}b)"/><g transform="translate(${FCX},${CY}) scale(${sx.toFixed(3)},1)"><ellipse cx="0" cy="0" rx="${Rflange}" ry="${Rflange}" fill="#17171b"/>${windows}<ellipse cx="0" cy="0" rx="${Rflange}" ry="${Rflange}" fill="none" stroke="#0c0c0e" stroke-width="2"/><ellipse cx="0" cy="0" rx="26" ry="26" fill="url(#${uid}h)"/><ellipse cx="0" cy="0" rx="11" ry="11" fill="#0a0a0c"/></g></svg>`
}

type Step = 'pick' | 'details'

export default function AddSpoolProfilePage() {
  const navigate = useNavigate()

  const [filaments, setFilaments] = useState<FilamentProfile[]>([])
  const [brand, setBrand] = useState('')
  const [material, setMaterial] = useState('')
  const [colorName, setColorName] = useState('')
  const [selectedFilament, setSelectedFilament] = useState<FilamentProfile | null>(null)
  const [step, setStep] = useState<Step>('pick')

  const [initialWeightG, setInitialWeightG] = useState('1000')
  const [spoolWeightG, setSpoolWeightG] = useState('250')
  const [lowStockG, setLowStockG] = useState('120')
  const [extruderMin, setExtruderMin] = useState('')
  const [extruderMax, setExtruderMax] = useState('')
  const [bedMin, setBedMin] = useState('')
  const [bedMax, setBedMax] = useState('')
  const [density, setDensity] = useState('')
  const [diameterTolerance, setDiameterTolerance] = useState('')
  const [openAdvanced, setOpenAdvanced] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    filamentsApi.getAll().then(setFilaments).catch(() => {})
  }, [])

  const close = useCallback(() => navigate('/spools'), [navigate])

  const filteredBrands = [...new Set(filaments.map(f => f.brand))]
  const filteredMats = brand ? [...new Set(filaments.filter(f => f.brand === brand).map(f => f.material))] : []
  const filteredColors = brand && material ? [...new Set(filaments.filter(f => f.brand === brand && f.material === material).map(f => f.colorName ?? ''))] : []
  const matched = brand && material
    ? filaments.filter(f => f.brand === brand && f.material === material && (!colorName || f.colorName === colorName))
    : []

  function pickFilament(f: FilamentProfile) {
    const d = getMaterialDefaults(f.material)
    setExtruderMin(f.extruderMin != null ? String(f.extruderMin) : (d ? String(d.extruderMin) : ''))
    setExtruderMax(f.extruderMax != null ? String(f.extruderMax) : (d ? String(d.extruderMax) : ''))
    setBedMin(f.bedMin != null ? String(f.bedMin) : (d ? String(d.bedMin) : ''))
    setBedMax(f.bedMax != null ? String(f.bedMax) : (d ? String(d.bedMax) : ''))
    setDensity(f.density != null ? String(f.density) : '')
    setDiameterTolerance(f.diameterTolerance != null ? String(f.diameterTolerance) : '')
    setSelectedFilament(f)
    setStep('details')
  }

  async function handleSave() {
    if (!selectedFilament || saving) return
    setSaving(true)
    try {
      await spoolProfilesApi.add({
        name: `${selectedFilament.brand} ${selectedFilament.material}${selectedFilament.colorName ? ' ' + selectedFilament.colorName : ''}`,
        brand: selectedFilament.brand,
        material: selectedFilament.material,
        colorName: selectedFilament.colorName ?? '',
        colorHex: selectedFilament.colorHex ?? '#ffffff',
        initialWeightG: parseFloat(initialWeightG) || 1000,
        spoolWeightG: parseFloat(spoolWeightG) || 250,
        lowStockThresholdG: parseFloat(lowStockG) || 120,
        density: density ? parseFloat(density) : null,
        diameterTolerance: diameterTolerance ? parseFloat(diameterTolerance) : null,
        extruderMin: extruderMin ? parseInt(extruderMin) : null,
        extruderMax: extruderMax ? parseInt(extruderMax) : null,
        bedMin: bedMin ? parseInt(bedMin) : null,
        bedMax: bedMax ? parseInt(bedMax) : null,
        price: null,
      })
      navigate('/spools')
    } catch {
      setSaving(false)
    }
  }

  const renderPick = () => (
    <>
      <div className={styles.cardHeader}>
        <button className={styles.closeBtn} onClick={close} aria-label="Back" dangerouslySetInnerHTML={{ __html: BACK_SVG }} />
        <div className={styles.cardHeaderTitle}>
          <h2>Add spool profile</h2>
          <div className={styles.sub}>Pick the filament for this profile</div>
        </div>
        <button className={styles.closeBtn} onClick={close} aria-label="Close" dangerouslySetInnerHTML={{ __html: CLOSE_SVG }} />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.detailPanel}>
          <div className={styles.sectionLabel}>Filament</div>
          <div className={styles.pickGrid3}>
            <div className={styles.field}>
              <label>Brand</label>
              <select value={brand} onChange={e => { setBrand(e.target.value); setMaterial(''); setColorName('') }}>
                <option value="">Select brand…</option>
                {filteredBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Material</label>
              <select value={material} disabled={!brand} onChange={e => { setMaterial(e.target.value); setColorName('') }}>
                <option value="">{brand ? 'Select material…' : '—'}</option>
                {filteredMats.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Color <span style={{ color: 'var(--faint)', fontWeight: 400 }}>(optional)</span></label>
              <select value={colorName} disabled={!material} onChange={e => setColorName(e.target.value)}>
                <option value="">{material ? 'All colors' : '—'}</option>
                {filteredColors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.sectionLabel}>
            {brand && material ? `${matched.length} filament${matched.length === 1 ? '' : 's'}` : 'Choose brand & material to see filaments'}
          </div>
          {brand && material ? (
            matched.length > 0 ? (
              <div className={styles.filaGrid}>
                {matched.map((f, i) => (
                  <button key={i} className={styles.filaCard} onClick={() => pickFilament(f)}>
                    <div className={styles.filaDisc} dangerouslySetInnerHTML={{ __html: spoolSvg(f.colorHex || '#888', 40, 'p' + i) }} />
                    <div className={styles.filaMeta}>
                      <div className={styles.filaName}>{f.colorName || f.filamentName}</div>
                      <div className={styles.filaBrand}>{f.material}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>No catalog match — try a different material.</div>
            )
          ) : (
            <div className={styles.emptyState}>Select a brand and material above.</div>
          )}
        </div>
      </div>
    </>
  )

  const renderDetails = () => {
    const f = selectedFilament!
    return (
      <>
        <div className={styles.cardHeader}>
          <button className={styles.closeBtn} onClick={() => setStep('pick')} aria-label="Back" dangerouslySetInnerHTML={{ __html: BACK_SVG }} />
          <div className={styles.cardHeaderTitle}>
            <h2>Add spool profile</h2>
            <div className={styles.sub}>Set the defaults for this filament profile</div>
          </div>
          <button className={styles.closeBtn} onClick={close} aria-label="Close" dangerouslySetInnerHTML={{ __html: CLOSE_SVG }} />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.detailPanel}>
            <div className={styles.selectedCard}>
              <div className={styles.selectedDisc} dangerouslySetInnerHTML={{ __html: spoolSvg(f.colorHex || '#888', 56, 'sel') }} />
              <div className={styles.selectedInfo}>
                <div className="b" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.01em' }}>{f.brand}</div>
                <div className="c" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{f.colorName || f.filamentName}</div>
                <div className={styles.tags}><span className={styles.tag}>{f.material}</span></div>
              </div>
              <button className={`${styles.changeBtn} ${styles.changeBtnIcon}`} onClick={() => setStep('pick')} title="Change filament" dangerouslySetInnerHTML={{ __html: CLOSE_SVG }} />
            </div>

            <div className={styles.sectionLabel}>Spool stats</div>
            <div className={styles.pickGrid3}>
              <div className={styles.field}>
                <label>Initial weight (g)</label>
                <input type="number" value={initialWeightG} min="0" onChange={e => setInitialWeightG(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Empty spool weight (g)</label>
                <input type="number" value={spoolWeightG} min="0" onChange={e => setSpoolWeightG(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Low stock threshold (g)</label>
                <input type="number" value={lowStockG} min="0" onChange={e => setLowStockG(e.target.value)} />
              </div>
            </div>

            <div className={styles.collapsible} data-open={openAdvanced}>
              <div className={styles.collapsibleHeader} onClick={() => setOpenAdvanced(o => !o)} role="button" tabIndex={0}>
                <span>Print settings &amp; Material properties</span>
                <span className={styles.collapsibleTools}>
                  <button type="button" className={`${styles.editBtn}${unlocked ? ` ${styles.on}` : ''}`}
                    onClick={e => { e.stopPropagation(); setUnlocked(u => !u) }} title="Edit settings">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <svg className={styles.collapsibleChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
              <div className={styles.collapsibleBody}>
                <div className={styles.pickGrid2}>
                  <div>
                    <div className={styles.pickGrid2} style={{ gap: 12 }}>
                      <div className={styles.field}>
                        <label>Nozzle temp (°C)</label>
                        <div className={styles.rangeRow}>
                          <input type="number" value={extruderMin} disabled={!unlocked} onChange={e => setExtruderMin(e.target.value)} />
                          <span>–</span>
                          <input type="number" value={extruderMax} disabled={!unlocked} onChange={e => setExtruderMax(e.target.value)} />
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label>Bed temp (°C)</label>
                        <div className={styles.rangeRow}>
                          <input type="number" value={bedMin} disabled={!unlocked} onChange={e => setBedMin(e.target.value)} />
                          <span>–</span>
                          <input type="number" value={bedMax} disabled={!unlocked} onChange={e => setBedMax(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.subColBorder}>
                    <div className={styles.pickGrid2} style={{ gap: 12 }}>
                      <div className={styles.field}>
                        <label>Diameter (mm)</label>
                        <select value={diameterTolerance} disabled={!unlocked} onChange={e => setDiameterTolerance(e.target.value)}>
                          <option value="1.75">1.75</option>
                          <option value="2.85">2.85</option>
                          <option value="3.00">3.00</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label>Density (g/cm³)</label>
                        <input type="number" value={density} step="0.01" disabled={!unlocked} onChange={e => setDensity(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.detailActions}>
              <button className={`${styles.btn} ${styles.back}`} onClick={() => setStep('pick')}
                dangerouslySetInnerHTML={{ __html: BACK_SVG + ' Back' }} />
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
                {saving
                  ? <span className={styles.btnSpinner} />
                  : <span dangerouslySetInnerHTML={{ __html: PLUS_SVG }} />}
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.card} style={{ border: 0, borderRadius: 0, flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {step === 'pick' ? renderPick() : renderDetails()}
      </div>
    </div>
  )
}
