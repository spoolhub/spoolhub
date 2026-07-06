import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import { SpoolIcon } from '@/components/icons'
import PlusIcon from '@/components/icons/PlusIcon'
import InfoCircleIcon from '@/components/icons/InfoCircleIcon'
import { getPrinterImage } from '@/utils/printerImages'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse, TraySpoolSummary } from '@/types/printer'
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
  onViewDetails?: (spool: SpoolResponse) => void
}

type Step = 'info' | 'assign' | 'done-assigned'

export default function NfcScanModal({ spool, onClose, onViewDetails }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('info')
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
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
  }, [spool.id])

  const selectedPrinter = useMemo(
    () => printers.find(p => p.id === printerId),
    [printers, printerId]
  )

  const traySlotMap = useMemo((): Record<number, TraySpoolSummary | null> => {
    if (!selectedPrinter) return {}
    return {
      1: selectedPrinter.tray1Spool,
      2: selectedPrinter.tray2Spool,
      3: selectedPrinter.tray3Spool,
      4: selectedPrinter.tray4Spool,
    }
  }, [selectedPrinter])

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

  const selectedPrinterName = selectedPrinter?.name
  const canActivate = isLoadedInPrinter ? !!printerId : !!stockLocation

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
            <SpoolIcon color={spool.colorHex} size={96} />
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

          {/* Printer assignment card */}
          {spool.printerName && selectedPrinter && step === 'info' && (
            <div style={{ marginTop: 14 }}>
              <p className={styles.sectionLabel}>Assigned to <span style={{ color: 'var(--color-success)' }}>{spool.printerName}</span></p>
              <div className={styles.amsLayout}>
                <div className={styles.pcardThumb}>
                  <div className={styles.pcardPic}>
                    <img
                      src={getPrinterImage(selectedPrinter.brand, selectedPrinter.model)}
                      alt={spool.printerName}
                      className={styles.pcardImg}
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
                    />
                  </div>
                </div>
                <div className={styles.amsRight}>
                  {selectedPrinter.hasAms ? (
                    <div className={styles.slotPick}>
                      {[1, 2, 3, 4].map(slot => {
                        const occupant = traySlotMap[slot]
                        const isThisSpool = spool.amsSlot === slot
                        const colorHex = isThisSpool ? spool.colorHex : occupant?.colorHex
                        const name = isThisSpool ? spool.colorName : occupant?.colorName ?? t('spoolForm.slotEmpty')
                        return (
                          <div key={slot} className={`${styles.slotTile} ${styles.slotTileView}${isThisSpool ? ` ${styles.slotTileSel}` : ''}${!occupant && !isThisSpool ? ` ${styles.slotTileEmpty}` : ''}`}>
                            <span className={styles.slotNum}>{slot}</span>
                            <span className={styles.slotIc}>
                              {colorHex ? <SpoolIcon color={colorHex} size={22} /> : <PlusIcon className={styles.slotPlus} />}
                            </span>
                            <span className={styles.slotCn}>{name}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className={styles.singleSlot}>
                      <span className={styles.singleSlotIc}><SpoolIcon color={spool.colorHex} size={28} /></span>
                      <div>
                        <p className={styles.singleSlotTitle}>{spool.printerName}</p>
                        <p className={styles.singleSlotDesc}>Direct spool — no AMS</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Assign section ── */}
          {step === 'info' && (
            <div className={styles.askBox} style={spool.printerName ? { borderTop: 'none', paddingTop: 0 } : undefined}>
              {spool.printerName ? (
                <>
                  <div className={styles.askQuestion}>
                    Unassign from {spool.printerName}?
                    <small className={styles.askHint}>Move this spool back to stock or assign to a different printer</small>
                  </div>
                  <div className={styles.askRow}>
                    <button className={styles.btnSecondary} onClick={onClose}>
                      {t('scan.notNow')}
                    </button>
                    <button className={styles.btnPrimary} onClick={() => setStep('assign')}>
                      Unassign
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.askQuestion}>
                    {t('scan.assignSpoolQuestion')}
                    <small className={styles.askHint}>{t('scan.assignSpoolHint')}</small>
                  </div>
                  <div className={styles.askRow}>
                    <button className={styles.btnSecondary} onClick={onClose}>
                      {t('scan.notNow')}
                    </button>
                    <button className={styles.btnPrimary} onClick={() => setStep('assign')}>
                      {ASSIGN_ICON}
                      {t('scan.assign')}
                    </button>
                  </div>
                </>
              )}
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
                <div className={styles.ff}>
                  <label>{t('spoolForm.assignedPrinter')}</label>
                  <select
                    value={printerId ?? ''}
                    onChange={e => { setPrinterId(e.target.value || null); setAmsSlot(null) }}
                  >
                    <option value="">{t('spoolForm.noPrinter')}</option>
                    {printers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.model})</option>)}
                  </select>

                  {selectedPrinter && (
                    <div className={styles.amsLayout}>
                      <div className={styles.pcardThumb}>
                        <div className={styles.pcardPic}>
                          <img
                            src={getPrinterImage(selectedPrinter.brand, selectedPrinter.model)}
                            alt={`${selectedPrinter.brand} ${selectedPrinter.model}`}
                            className={styles.pcardImg}
                            onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
                          />
                        </div>
                      </div>
                      <div className={styles.amsRight}>
                        {selectedPrinter.hasAms ? (
                          <>
                            <p className={styles.slotLabel}>{t('spoolForm.chooseAmsSlot')}</p>
                            <div className={styles.slotPick}>
                              {[1, 2, 3, 4].map(slot => {
                                const occupant = traySlotMap[slot]
                                const isSel = amsSlot === slot
                                const colorHex = isSel ? spool.colorHex : occupant?.colorHex
                                const name = isSel ? spool.colorName : occupant?.colorName ?? t('spoolForm.slotEmpty')
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    className={`${styles.slotTile}${isSel ? ` ${styles.slotTileSel}` : ''}${!occupant && !isSel ? ` ${styles.slotTileEmpty}` : ''}`}
                                    onClick={() => setAmsSlot(isSel ? null : slot)}
                                  >
                                    {isSel && <span className={styles.slotHere}>{t('spoolForm.goesHere')}</span>}
                                    <span className={styles.slotNum}>{slot}</span>
                                    <span className={styles.slotIc}>
                                      {colorHex ? <SpoolIcon color={colorHex} size={22} /> : <PlusIcon className={styles.slotPlus} />}
                                    </span>
                                    <span className={styles.slotCn}>{name}</span>
                                  </button>
                                )
                              })}
                            </div>
                            {amsSlot != null && traySlotMap[amsSlot] && (
                              <div className={styles.slotNote}>
                                <InfoCircleIcon className={styles.slotNoteIcon} />
                                {amsSlot === spool.amsSlot ? 'Already assigned to this slot' : t('spoolForm.slotOccupied')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className={styles.singleSlot}>
                            <span className={styles.singleSlotIc}><SpoolIcon color={spool.colorHex} size={28} /></span>
                            <div>
                              <p className={styles.singleSlotTitle}>{t('spoolForm.directSpool')}</p>
                              <p className={styles.singleSlotDesc}>{t('spoolForm.noAmsSlots')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                <button className={styles.btnPrimary} onClick={handleActivate} disabled={saving || !canActivate}>
                  {saving ? '…' : t('scan.activate')}
                </button>
              </div>
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
            className={styles.btnPrimary}
            onClick={() => { onViewDetails?.(spool); onClose() }}
          >
            {t('scan.viewDetails')}
          </button>
        </div>
      </aside>
    </>,
    document.body
  )
}
