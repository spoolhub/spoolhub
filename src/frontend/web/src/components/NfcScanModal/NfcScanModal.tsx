import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import { SpoolIcon } from '@/components/icons'
import PrinterPicker from '@/components/PrinterPicker'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse } from '@/types/printer'
import styles from './NfcScanModal.module.css'

const BASE_LOCATIONS = ['Shelf A1', 'Shelf A2', 'Shelf B1', 'Shelf B2', 'Drybox 1', 'Drybox 2']

const NFC_UID_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="4" y="3" width="16" height="18" rx="3" />
    <path d="M9.2 9.2a4 4 0 0 1 0 5.6" />
    <path d="M12.2 6.8a7.5 7.5 0 0 1 0 10.4" />
    <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const ASSIGN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
    width="16" height="16">
    <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" />
  </svg>
)

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
    <path d="M5 13l4 4L19 7" />
  </svg>
)

const CLOSE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

interface Props {
  spool: SpoolResponse
  onClose: () => void
}

type Step = 'info' | 'assign' | 'done-inventory' | 'done-assigned'

export default function NfcScanModal({ spool, onClose }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('info')
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [allSpools, setAllSpools] = useState<SpoolResponse[]>([])
  const [printerId, setPrinterId] = useState<string | null>(spool.printerId)
  const [amsSlot, setAmsSlot] = useState<number | null>(spool.amsSlot)
  const [isLoadedInPrinter, setIsLoadedInPrinter] = useState(!!spool.printerId)
  const [stockLocation, setStockLocation] = useState<string | null>(spool.stockLocation)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [customLocations, setCustomLocations] = useState<string[]>(
    spool.stockLocation && !BASE_LOCATIONS.includes(spool.stockLocation) ? [spool.stockLocation] : []
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    printersApi.getAll().then(setPrinters).catch(() => {})
    spoolsApi.getAll().then(setAllSpools).catch(() => {})
  }, [spool.id])

  const occupiedSlots = useMemo(() => {
    if (!printerId) return {}
    const result: Record<number, { colorHex: string; colorName: string; brand: string; material: string }> = {}
    for (const s of allSpools) {
      if (s.printerId === printerId && s.amsSlot != null && s.id !== spool.id) {
        result[s.amsSlot] = { colorHex: s.colorHex, colorName: s.colorName, brand: s.brand, material: s.material }
      }
    }
    return result
  }, [allSpools, printerId, spool.id])

  async function handleActivate() {
    setSaving(true)
    try {
      await spoolsApi.activate(spool.id)
      if (isLoadedInPrinter && printerId) {
        await spoolsApi.assignPrinter(spool.id, { printerId, amsSlot })
      } else {
        await spoolsApi.assignPrinter(spool.id, { printerId: null, amsSlot: null })
        await spoolsApi.update(spool.id, { stockLocation: stockLocation ?? '' })
      }
      window.dispatchEvent(new CustomEvent('spools-updated'))
      setStep('done-assigned')
    } finally {
      setSaving(false)
    }
  }

  const pct = Math.min(100, Math.round((spool.currentWeightG / spool.initialWeightG) * 100))
  const isLow = spool.currentWeightG <= spool.lowStockThresholdG

  const selectedPrinterName = printers.find(p => p.id === printerId)?.name

  return createPortal(
    <>
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.drawer} aria-label={t('scan.spoolScanned')}>

        {/* ── Header ── */}
        <div className={styles.drawerTop}>
          <h2 className={styles.drawerTitle}>{t('scan.spoolScanned')}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            {CLOSE_ICON}
          </button>
        </div>

        {/* ── Hero band ── */}
        <div className={styles.heroBand}>
          <div className={styles.heroIcon}>
            <SpoolIcon color={spool.colorHex} size={72} />
          </div>
          <div className={styles.heroText}>
            <div className={styles.heroBrand}>{spool.brand}</div>
            <div className={styles.heroName}>{spool.colorName}</div>
            <div className={styles.heroTags}>
              <span className={styles.heroTag}>{spool.material}</span>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className={styles.drawerBody}>

          {/* UID card */}
          {spool.nfcTagUid && (
            <div className={styles.uidCard}>
              <span className={styles.uidIcon}>{NFC_UID_ICON}</span>
              <div>
                <div className={styles.uidValue}>{spool.nfcTagUid}</div>
                <div className={styles.uidLabel}>Tag UID</div>
              </div>
            </div>
          )}

          {/* Filament bar */}
          <div>
            <p className={styles.sectionLabel}>{t('scan.remainingFilament')}</p>
            <div className={styles.barMeta}>
              <span className={styles.barGrams}>
                {Math.round(spool.currentWeightG)}g{' '}
                <small>/ {Math.round(spool.initialWeightG)}g</small>
              </span>
              <span className={styles.barPct}>{pct}%</span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={`${styles.barFill}${isLow ? ` ${styles.barFillLow}` : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* ── Assign section ── */}
          {step === 'info' && (
            <div className={styles.askBox}>
              <div className={styles.askQuestion}>
                {t('scan.assignSpoolQuestion')}
                <small className={styles.askHint}>{t('scan.assignSpoolHint')}</small>
              </div>
              <div className={styles.askRow}>
                <button className={styles.btnSecondary} onClick={() => setStep('done-inventory')}>
                  {t('scan.notNow')}
                </button>
                <button className={styles.btnPrimary} onClick={() => setStep('assign')}>
                  {ASSIGN_ICON}
                  {t('scan.assign')}
                </button>
              </div>
            </div>
          )}

          {step === 'assign' && (
            <div className={styles.askBox}>
              <p className={styles.askQuestion}>{t('scan.assignToAPrinter')}</p>

              <div className={styles.placementToggle}>
                <button
                  type="button"
                  className={!isLoadedInPrinter ? `${styles.placementBtn} ${styles.placementBtnOn}` : styles.placementBtn}
                  onClick={() => { setIsLoadedInPrinter(false); setPrinterId(null); setAmsSlot(null) }}
                >
                  {t('scan.inStock')}
                </button>
                <button
                  type="button"
                  className={isLoadedInPrinter ? `${styles.placementBtn} ${styles.placementBtnOn}` : styles.placementBtn}
                  onClick={() => setIsLoadedInPrinter(true)}
                >
                  {t('scan.loadedInPrinter')}
                </button>
              </div>

              {isLoadedInPrinter ? (
                <PrinterPicker
                  printers={printers}
                  value={printerId}
                  onChange={v => { setPrinterId(v); if (!v) setAmsSlot(null) }}
                  amsSlot={amsSlot}
                  onAmsSlotChange={setAmsSlot}
                  occupiedSlots={occupiedSlots}
                  currentSpoolColor={spool.colorHex}
                />
              ) : (
                <div className={styles.ff}>
                  <label>{t('scan.storageLocation')}</label>
                  <select
                    value={stockLocation ?? ''}
                    onChange={e => {
                      if (e.target.value === '__add_new') setShowAddLocation(true)
                      else setStockLocation(e.target.value || null)
                    }}
                  >
                    <option value="">{t('scan.selectLocation')}</option>
                    {BASE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    {customLocations.map(l => <option key={l} value={l}>{l}</option>)}
                    <option value="__add_new">{t('scan.addNewLocation')}</option>
                  </select>
                  {showAddLocation && (
                    <div className={styles.addWrap}>
                      <input
                        type="text"
                        placeholder={t('scan.enterNewLocation')}
                        value={newLocation}
                        onChange={e => setNewLocation(e.target.value)}
                        autoFocus
                      />
                      <button type="button" className={styles.btnCancel} onClick={() => { setShowAddLocation(false); setNewLocation('') }}>×</button>
                    </div>
                  )}
                  {showAddLocation && (
                    <button
                      type="button"
                      className={styles.btnAdd}
                      disabled={!newLocation.trim()}
                      onClick={() => {
                        const loc = newLocation.trim()
                        if (!loc) return
                        if (!customLocations.includes(loc)) setCustomLocations(prev => [...prev, loc])
                        setStockLocation(loc)
                        setShowAddLocation(false)
                        setNewLocation('')
                      }}
                    >
                      {t('common.add')} &quot;{newLocation.trim()}&quot;
                    </button>
                  )}
                </div>
              )}

              <div className={styles.askRow}>
                <button className={styles.btnSecondary} onClick={() => setStep('info')}>
                  {t('scan.back')}
                </button>
                <button className={styles.btnPrimary} onClick={handleActivate} disabled={saving}>
                  {saving ? '…' : t('scan.activate')}
                </button>
              </div>
            </div>
          )}

          {step === 'done-inventory' && (
            <div className={styles.assigned}>
              {CHECK_ICON}
              {t('scan.keptInInventory')}
            </div>
          )}

          {step === 'done-assigned' && (
            <div className={styles.assigned}>
              {CHECK_ICON}
              {selectedPrinterName
                ? `${t('scan.assignedConfirm')} · ${selectedPrinterName}${amsSlot != null ? ` · AMS ${amsSlot}` : ''}`
                : t('scan.assignedConfirm')}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.drawerFoot}>
          <button
            className={styles.btnDetails}
            onClick={() => { navigate(`/spools/${spool.id}`); onClose() }}
          >
            {t('scan.viewDetails')}
          </button>
        </div>
      </aside>
    </>,
    document.body
  )
}
