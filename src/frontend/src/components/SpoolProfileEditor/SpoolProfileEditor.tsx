import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import type { SpoolProfileResponse, AddSpoolProfileRequest } from '@/types/spoolProfile'
import styles from './SpoolProfileEditor.module.css'

interface SpoolProfileEditorProps {
  profile: SpoolProfileResponse
  onSaved: () => void
  onCancel: () => void
}

export default function SpoolProfileEditor({ profile, onSaved, onCancel }: SpoolProfileEditorProps) {
  const { t } = useTranslation()
  const [extruderMin, setExtruderMin] = useState(profile.extruderMin != null ? String(profile.extruderMin) : '')
  const [extruderMax, setExtruderMax] = useState(profile.extruderMax != null ? String(profile.extruderMax) : '')
  const [bedMin, setBedMin] = useState(profile.bedMin != null ? String(profile.bedMin) : '')
  const [bedMax, setBedMax] = useState(profile.bedMax != null ? String(profile.bedMax) : '')
  const [initialWeightG, setInitialWeightG] = useState(String(profile.initialWeightG))
  const [spoolWeightG, setSpoolWeightG] = useState(String(profile.spoolWeightG))
  const [density, setDensity] = useState(profile.density != null ? String(profile.density) : '')
  const [diameterTolerance, setDiameterTolerance] = useState(profile.diameterTolerance != null ? String(profile.diameterTolerance) : '')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSubmitError(null)
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
      price: null,
    }
    try {
      await spoolProfilesApi.update(profile.id, body)
      onSaved()
    } catch {
      setSubmitError(t('spoolProfile.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.card}>
          {/* Header — same style as SpoolEditor */}
          <div className={styles.header}>
            <div className={styles.headerColorOverlay} style={{ backgroundColor: profile.colorHex }} />
            <div className={styles.headerRow}>
              <SpoolIcon color={profile.colorHex || '#888'} size={80} />
              <div className={styles.headerInfo}>
                <div className={styles.headerBrandRow}>
                  <span className={styles.headerBrand}>{profile.brand}</span>
                </div>
                <p className={styles.headerTitle}>{profile.colorName}</p>
                <p className={styles.headerMaterial}>{profile.material}</p>
              </div>
            </div>
            <button type="button" className={styles.closeBtn} onClick={onCancel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Print Settings | Material */}
          <div className={styles.splitSection}>
            <div className={styles.sectionCol}>
              <p className={styles.sectionLabel}>{t('spoolProfile.printSettings')}</p>
              <div className={styles.editTable}>
                <div className={styles.editRow}>
                  <div className={styles.editCell}>
                    <label className={styles.editLabel}>{t('spoolProfile.extruder')}</label>
                    <div className={styles.rangeRow}>
                      <input type="number" className={styles.editInput} value={extruderMin} onChange={e => setExtruderMin(e.target.value)} placeholder={t('spoolForm.min')} />
                      <span className={styles.rangeSep}>–</span>
                      <input type="number" className={styles.editInput} value={extruderMax} onChange={e => setExtruderMax(e.target.value)} placeholder={t('spoolForm.max')} />
                    </div>
                  </div>
                </div>
                <div className={styles.editRow}>
                  <div className={styles.editCell}>
                    <label className={styles.editLabel}>{t('spoolProfile.bed')}</label>
                    <div className={styles.rangeRow}>
                      <input type="number" className={styles.editInput} value={bedMin} onChange={e => setBedMin(e.target.value)} placeholder={t('spoolForm.min')} />
                      <span className={styles.rangeSep}>–</span>
                      <input type="number" className={styles.editInput} value={bedMax} onChange={e => setBedMax(e.target.value)} placeholder={t('spoolForm.max')} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.sectionCol}>
              <p className={styles.sectionLabel}>{t('spoolProfile.materialProps')}</p>
              <div className={styles.matTable}>
                <div className={styles.matRow}>
                  <div className={styles.editCell}>
                    <label className={styles.editLabel}>{t('spoolProfile.initialW')}</label>
                    <input type="number" className={styles.editInput} value={initialWeightG} onChange={e => setInitialWeightG(e.target.value)} min="0" />
                  </div>
                  <div className={styles.editCell}>
                    <label className={styles.editLabel}>{t('spoolProfile.spoolW')}</label>
                    <input type="number" className={styles.editInput} value={spoolWeightG} onChange={e => setSpoolWeightG(e.target.value)} min="0" />
                  </div>
                  <div className={styles.editCell}>
                    <label className={styles.editLabel}>{t('spoolForm.density')}</label>
                    <input type="number" step="0.01" className={styles.editInput} value={density} onChange={e => setDensity(e.target.value)} />
                  </div>
                </div>
                <div className={styles.matRow}>
                  <div className={styles.editCell}>
                    <label className={styles.editLabel}>{t('spoolForm.diameterTolerance')}</label>
                    <input type="number" step="0.001" className={styles.editInput} value={diameterTolerance} onChange={e => setDiameterTolerance(e.target.value)} />
                  </div>
                  <div className={styles.editCell}></div>
                  <div className={styles.editCell}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}

        <div className={styles.footerRow}>
          <button type="button" className={styles.btnCancel} onClick={onCancel}>{t('common.cancel')}</button>
          <button type="submit" className={styles.btnSave} disabled={saving}>
            {saving ? t('spoolProfile.saving') : t('spoolProfile.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
