import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import { locationsApi } from '@/api/locations'
import styles from './AmsConflictModal.module.css'

export type OccupantPreview = {
  id: string
  brand: string
  material: string
  colorName: string
  colorHex: string
}

interface Props {
  printerImgSrc: string
  printerBrand?: string
  printerModel?: string
  traySlot?: number
  occupantSpool: OccupantPreview
  onCancel: () => void
  onConfirm: (stockLocation: string) => void
}

export default function AmsConflictModal({
  printerImgSrc, printerBrand, printerModel, traySlot, occupantSpool, onCancel, onConfirm,
}: Props) {
  const { t } = useTranslation()
  const [locations, setLocations] = useState<string[]>([])
  const [customLocations, setCustomLocations] = useState<string[]>([])
  const [stockLocation, setStockLocation] = useState('')
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [locationError, setLocationError] = useState(false)

  useEffect(() => {
    let cancelled = false
    locationsApi.getAll()
      .then(data => {
        if (!cancelled) setLocations(data.map(l => l.name).sort((a, b) => a.localeCompare(b)))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const allLocations = [
    ...locations,
    ...customLocations.filter(l => !locations.includes(l)),
  ]

  function handleConfirm() {
    const loc = stockLocation.trim()
    if (!loc) {
      setLocationError(true)
      return
    }
    onConfirm(loc)
  }

  function addNewLocation() {
    const loc = newLocation.trim()
    if (!loc) return
    if (!customLocations.includes(loc) && !locations.includes(loc)) {
      setCustomLocations(prev => [...prev, loc])
    }
    setStockLocation(loc)
    setLocationError(false)
    setShowAddLocation(false)
    setNewLocation('')
  }

  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.imgArea}>
          <img
            src={printerImgSrc}
            alt=""
            className={styles.img}
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
          />
        </div>
        <div className={styles.body}>
          {(printerBrand || printerModel) && (
            <p className={styles.printerMeta}>
              {[printerBrand, printerModel].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className={styles.title}>
            {traySlot != null
              ? t('amsConflict.trayInUse', { slot: traySlot })
              : t('amsConflict.printerInUse')}
          </p>
          <p className={styles.subtitle}>
            {traySlot != null
              ? t('amsConflict.trayOccupied')
              : t('amsConflict.printerOccupied')}
          </p>
          <div className={styles.spoolPreview}>
            <SpoolIcon color={occupantSpool.colorHex} size={44} />
            <div className={styles.spoolInfo}>
              <p className={styles.spoolName}>{occupantSpool.colorName}</p>
              <p className={styles.spoolMeta}>{occupantSpool.brand} · {occupantSpool.material}</p>
            </div>
          </div>

          <label className={styles.locationLabel} htmlFor="displaced-stock-location">
            {t('amsConflict.storeWhere')}
          </label>
          <select
            id="displaced-stock-location"
            className={`${styles.locationSelect}${locationError ? ` ${styles.locationSelectError}` : ''}`}
            value={showAddLocation ? '__add_new' : stockLocation}
            onChange={e => {
              if (e.target.value === '__add_new') {
                setShowAddLocation(true)
                setLocationError(false)
              } else {
                setShowAddLocation(false)
                setStockLocation(e.target.value)
                setLocationError(false)
              }
            }}
          >
            <option value="">{t('amsConflict.selectLocation')}</option>
            {allLocations.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
            <option value="__add_new">{t('amsConflict.addNewLocation')}</option>
          </select>
          {showAddLocation && (
            <div className={styles.addWrap}>
              <input
                type="text"
                className={styles.addInput}
                placeholder={t('amsConflict.enterNewLocation')}
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                autoFocus
              />
              <button type="button" className={styles.btnAdd} disabled={!newLocation.trim()} onClick={addNewLocation}>
                {t('common.add')}
              </button>
            </div>
          )}
          {locationError && (
            <p className={styles.locationError}>{t('amsConflict.locationRequired')}</p>
          )}

          <div className={styles.btnRow}>
            <button type="button" onClick={onCancel} className={styles.btnCancel}>
              {t('common.cancel')}
            </button>
            <button type="button" onClick={handleConfirm} className={styles.btnConfirm}>
              {t('amsConflict.reassignTray')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
