import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import type { SpoolProfileResponse, AddSpoolProfileRequest } from '@/types/spoolProfile'
import styles from './SpoolProfileDrawer.module.css'

interface Props {
  profile: SpoolProfileResponse
  onClose: () => void
  onUpdated?: (p: SpoolProfileResponse) => void
  onDeleted?: (id: string) => void
}

export default function SpoolProfileDrawer({ profile, onClose, onUpdated, onDeleted }: Props) {
  const { t } = useTranslation()
  const [editMode, setEditMode] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)

  // Edit form state
  const [extruderMin, setExtruderMin] = useState('')
  const [extruderMax, setExtruderMax] = useState('')
  const [bedMin, setBedMin] = useState('')
  const [bedMax, setBedMax] = useState('')
  const [initialWeightG, setInitialWeightG] = useState('')
  const [spoolWeightG, setSpoolWeightG] = useState('')
  const [density, setDensity] = useState('')
  const [diameterTolerance, setDiameterTolerance] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { if (editMode) setEditMode(false); else onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editMode, onClose])

  function startEdit() {
    setExtruderMin(profile.extruderMin != null ? String(profile.extruderMin) : '')
    setExtruderMax(profile.extruderMax != null ? String(profile.extruderMax) : '')
    setBedMin(profile.bedMin != null ? String(profile.bedMin) : '')
    setBedMax(profile.bedMax != null ? String(profile.bedMax) : '')
    setInitialWeightG(String(profile.initialWeightG))
    setSpoolWeightG(String(profile.spoolWeightG))
    setDensity(profile.density != null ? String(profile.density) : '')
    setDiameterTolerance(profile.diameterTolerance != null ? String(profile.diameterTolerance) : '')
    setEditMode(true)
  }

  async function saveEdit() {
    setSaving(true)
    const body: AddSpoolProfileRequest = {
      name: profile.name,
      brand: profile.brand,
      material: profile.material,
      colorName: profile.colorName,
      colorHex: profile.colorHex,
      initialWeightG: parseFloat(initialWeightG) || 1000,
      spoolWeightG: parseFloat(spoolWeightG) || 250,
      lowStockThresholdG: profile.lowStockThresholdG,
      density: density ? parseFloat(density) : null,
      diameterTolerance: diameterTolerance ? parseFloat(diameterTolerance) : null,
      extruderMin: extruderMin ? parseInt(extruderMin) : null,
      extruderMax: extruderMax ? parseInt(extruderMax) : null,
      bedMin: bedMin ? parseInt(bedMin) : null,
      bedMax: bedMax ? parseInt(bedMax) : null,
      price: profile.price,
    }
    try {
      const updated = await spoolProfilesApi.update(profile.id, body)
      onUpdated?.(updated)
      setEditMode(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    try {
      await spoolProfilesApi.delete(profile.id)
      onDeleted?.(profile.id)
      onClose()
    } catch { /* ignore */ }
  }

  const color = profile.colorHex || '#888'
  const hasExtruder = profile.extruderMin != null && profile.extruderMax != null
  const hasBed = profile.bedMin != null && profile.bedMax != null

  return (
    <>
      <div className={`${styles.scrim} ${styles.scrimOn}`} onClick={() => { if (editMode) setEditMode(false); else onClose() }} />
      <aside className={`${styles.drawer} ${styles.drawerOn}`}>
        {editMode ? renderEdit() : renderDetail()}
      </aside>
    </>
  )

  function renderDetail() {
    return (
      <>
        <div className={styles.dwSticky}>
          <div className={styles.dwtop}>
            <h2>{t('spoolProfile.pageTitle', 'Spool Profile')}</h2>
            <button className={styles.dwclose} onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>
          <div className={styles.dwhero}>
            <div className={styles.dwheroColorBg} style={{ backgroundColor: color }} />
            <div className={styles.dwheroColorGrad} />
            <div className={styles.dwdisc}><SpoolIcon color={color} size={96} /></div>
            <div className={styles.dwid}>
              <div className={styles.dwtext}>
                <div className={styles.c}>{profile.colorName}</div>
                <div className={styles.b}>{profile.brand}</div>
              </div>
              <div className={styles.tags}>
                <span className={styles.tag}>{profile.material}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.dwgrid}>
          <div className={styles.dwstat}>
            <div className={styles.k}>Extruder</div>
            <div className={styles.v}>{hasExtruder ? `${profile.extruderMin}–${profile.extruderMax}°C` : '—'}</div>
          </div>
          <div className={styles.dwstat}>
            <div className={styles.k}>Bed</div>
            <div className={styles.v}>{hasBed ? `${profile.bedMin}–${profile.bedMax}°C` : '—'}</div>
          </div>
          <div className={styles.dwstat}>
            <div className={styles.k}>Initial weight</div>
            <div className={styles.v}>{profile.initialWeightG} g</div>
          </div>
          <div className={styles.dwstat}>
            <div className={styles.k}>Spool weight</div>
            <div className={styles.v}>{profile.spoolWeightG > 0 ? `${profile.spoolWeightG} g` : '—'}</div>
          </div>
        </div>

        <div className={styles.dwsec}>
          <h3>{t('spoolProfile.materialProps', 'Material properties')}</h3>
          <div className={styles.dwline}><span className={styles.lk}>Density</span><span className={styles.lv}>{profile.density != null ? `${profile.density} g/cm³` : '—'}</span></div>
          <div className={styles.dwline}><span className={styles.lk}>Diameter tolerance</span><span className={styles.lv}>{profile.diameterTolerance != null ? `±${profile.diameterTolerance} mm` : '—'}</span></div>
          {profile.price != null && (
            <div className={styles.dwline}><span className={styles.lk}>Price</span><span className={styles.lv}>{profile.price}</span></div>
          )}
        </div>

        <div className={styles.dwsec}>
          <h3>Info</h3>
          <div className={styles.dwline}><span className={styles.lk}>Created</span><span className={styles.lv}>{new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
          <div className={styles.dwline}><span className={styles.lk}>Updated</span><span className={styles.lv}>{new Date(profile.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
        </div>

        <div className={styles.dwact}>
          {pendingDelete ? (
            <>
              <button className={`${styles.btn} ${styles.danger}`} onClick={handleDelete}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                Confirm delete
              </button>
              <button className={styles.btn} onClick={() => setPendingDelete(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className={styles.btn} onClick={startEdit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Edit
              </button>
              <button className={`${styles.btn} ${styles.danger}`} onClick={() => setPendingDelete(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 4v6m4-6v6M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z"/></svg>
                Delete
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  function renderEdit() {
    return (
      <>
        <div className={styles.dwtop}>
          <button className={styles.dwclose} onClick={() => setEditMode(false)} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2>Edit profile</h2>
          <button className={styles.dwclose} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div className={styles.dwhero}>
          <div className={styles.dwheroColorBg} style={{ backgroundColor: color }} />
          <div className={styles.dwheroColorGrad} />
          <div className={styles.dwdisc}><SpoolIcon color={color} size={80} /></div>
          <div className={styles.dwid}>
            <div className={styles.c}>{profile.colorName}</div>
            <div className={styles.b}>{profile.brand}</div>
            <div className={styles.tags}><span className={styles.tag}>{profile.material}</span></div>
          </div>
        </div>

        <div className={styles.dwform}>
          <div className={styles.fsec}>{t('spoolProfile.printSettings', 'Print settings')}</div>
          <div className={styles.ff2}>
            <div className={styles.ff}>
              <label>{t('spoolProfile.extruder', 'Extruder')} min (°C)</label>
              <input type="number" value={extruderMin} onChange={e => setExtruderMin(e.target.value)} placeholder="e.g. 210" />
            </div>
            <div className={styles.ff}>
              <label>{t('spoolProfile.extruder', 'Extruder')} max (°C)</label>
              <input type="number" value={extruderMax} onChange={e => setExtruderMax(e.target.value)} placeholder="e.g. 230" />
            </div>
          </div>
          <div className={styles.ff2}>
            <div className={styles.ff}>
              <label>{t('spoolProfile.bed', 'Bed')} min (°C)</label>
              <input type="number" value={bedMin} onChange={e => setBedMin(e.target.value)} placeholder="e.g. 50" />
            </div>
            <div className={styles.ff}>
              <label>{t('spoolProfile.bed', 'Bed')} max (°C)</label>
              <input type="number" value={bedMax} onChange={e => setBedMax(e.target.value)} placeholder="e.g. 70" />
            </div>
          </div>

          <div className={styles.fsec}>{t('spoolProfile.materialProps', 'Material properties')}</div>
          <div className={styles.ff2}>
            <div className={styles.ff}>
              <label>{t('spoolProfile.initialW', 'Initial weight')} (g)</label>
              <input type="number" value={initialWeightG} onChange={e => setInitialWeightG(e.target.value)} min="0" />
            </div>
            <div className={styles.ff}>
              <label>{t('spoolProfile.spoolW', 'Spool weight')} (g)</label>
              <input type="number" value={spoolWeightG} onChange={e => setSpoolWeightG(e.target.value)} min="0" />
            </div>
          </div>
          <div className={styles.ff2}>
            <div className={styles.ff}>
              <label>{t('spoolProfile.density', 'Density')} (g/cm³)</label>
              <input type="number" step="0.01" value={density} onChange={e => setDensity(e.target.value)} />
            </div>
            <div className={styles.ff}>
              <label>Diameter tolerance (mm)</label>
              <input type="number" step="0.001" value={diameterTolerance} onChange={e => setDiameterTolerance(e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.dwact}>
          <button className={styles.btn} onClick={() => setEditMode(false)}>Cancel</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={saveEdit} disabled={saving}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </>
    )
  }
}
