/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import type { SpoolProfileResponse, AddSpoolProfileRequest } from '@/types/spoolProfile'
import styles from './AddSpoolProfileModal.module.css'

interface Props {
  profile: SpoolProfileResponse | null
  onClose: () => void
  onSaved: () => void
}

export default function AddSpoolProfileModal({ profile, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [material, setMaterial] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorHex, setColorHex] = useState('#ffffff')
  const [initialWeightG, setInitialWeightG] = useState('1000')
  const [spoolWeightG, setSpoolWeightG] = useState('200')
  const [lowStockThresholdG, setLowStockThresholdG] = useState('100')
  const [density, setDensity] = useState('')
  const [diameterTolerance, setDiameterTolerance] = useState('')
  const [extruderMin, setExtruderMin] = useState('')
  const [extruderMax, setExtruderMax] = useState('')
  const [bedMin, setBedMin] = useState('')
  const [bedMax, setBedMax] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setBrand(profile.brand)
      setMaterial(profile.material)
      setColorName(profile.colorName)
      setColorHex(profile.colorHex)
      setInitialWeightG(String(profile.initialWeightG))
      setSpoolWeightG(String(profile.spoolWeightG))
      setLowStockThresholdG(String(profile.lowStockThresholdG))
      setDensity(profile.density != null ? String(profile.density) : '')
      setDiameterTolerance(profile.diameterTolerance != null ? String(profile.diameterTolerance) : '')
      setExtruderMin(profile.extruderMin != null ? String(profile.extruderMin) : '')
      setExtruderMax(profile.extruderMax != null ? String(profile.extruderMax) : '')
      setBedMin(profile.bedMin != null ? String(profile.bedMin) : '')
      setBedMax(profile.bedMax != null ? String(profile.bedMax) : '')
      setPrice(profile.price != null ? String(profile.price) : '')
    }
    nameRef.current?.focus()
  }, [profile])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !brand.trim() || !material.trim()) {
      setError(t('spoolProfile.errorRequired'))
      return
    }
    setSaving(true)
    setError(null)
    const body: AddSpoolProfileRequest = {
      name: name.trim(),
      brand: brand.trim(),
      material: material.trim(),
      colorName: colorName.trim() || brand.trim(),
      colorHex,
      initialWeightG: parseFloat(initialWeightG) || 1000,
      spoolWeightG: parseFloat(spoolWeightG) || 200,
      lowStockThresholdG: parseFloat(lowStockThresholdG) || 100,
      density: density ? parseFloat(density) : null,
      diameterTolerance: diameterTolerance ? parseFloat(diameterTolerance) : null,
      extruderMin: extruderMin ? parseInt(extruderMin) : null,
      extruderMax: extruderMax ? parseInt(extruderMax) : null,
      bedMin: bedMin ? parseInt(bedMin) : null,
      bedMax: bedMax ? parseInt(bedMax) : null,
      price: price ? parseFloat(price) : null,
    }
    try {
      if (profile) {
        await spoolProfilesApi.update(profile.id, body)
      } else {
        await spoolProfilesApi.add(body)
      }
      onSaved()
    } catch {
      setError(t('spoolProfile.errorSave'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {profile ? t('spoolProfile.editProfile') : t('spoolProfile.addProfile')}
          </h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolProfile.nameLabel')}</label>
              <input ref={nameRef} type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder={t('spoolProfile.namePlaceholder')} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('filters.brand')}</label>
              <input type="text" value={brand} onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Bambu Lab" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.material')}</label>
              <input type="text" value={material} onChange={e => setMaterial(e.target.value)}
                placeholder="e.g. PLA" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.color')}</label>
              <div className={styles.colorRow}>
                <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)}
                  className={styles.colorPicker} />
                <input type="text" value={colorName} onChange={e => setColorName(e.target.value)}
                  placeholder="e.g. Jade White" className={styles.input} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.initialWeight')}</label>
              <input type="number" value={initialWeightG} onChange={e => setInitialWeightG(e.target.value)}
                className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.spoolWeight')}</label>
              <input type="number" value={spoolWeightG} onChange={e => setSpoolWeightG(e.target.value)}
                className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.lowStockThreshold')}</label>
              <input type="number" value={lowStockThresholdG} onChange={e => setLowStockThresholdG(e.target.value)}
                className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.density')}</label>
              <input type="number" step="0.01" value={density} onChange={e => setDensity(e.target.value)}
                className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.diameterTolerance')}</label>
              <input type="number" step="0.01" value={diameterTolerance} onChange={e => setDiameterTolerance(e.target.value)}
                className={styles.input} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.extruderTemp')}</label>
              <div className={styles.rangeRow}>
                <input type="number" value={extruderMin} onChange={e => setExtruderMin(e.target.value)}
                  placeholder={t('spoolForm.min')} className={styles.input} />
                <span>{t('spoolForm.to')}</span>
                <input type="number" value={extruderMax} onChange={e => setExtruderMax(e.target.value)}
                  placeholder={t('spoolForm.max')} className={styles.input} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.bedTemp')}</label>
              <div className={styles.rangeRow}>
                <input type="number" value={bedMin} onChange={e => setBedMin(e.target.value)}
                  placeholder={t('spoolForm.min')} className={styles.input} />
                <span>{t('spoolForm.to')}</span>
                <input type="number" value={bedMax} onChange={e => setBedMax(e.target.value)}
                  placeholder={t('spoolForm.max')} className={styles.input} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('spoolForm.price')}</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                className={styles.input} />
            </div>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnCancel}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className={styles.btnSubmit}>
              {saving ? t('spoolProfile.saving') : profile ? t('spoolProfile.update') : t('spoolProfile.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
