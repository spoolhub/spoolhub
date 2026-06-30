import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import { locationsApi } from '@/api/locations'
import MaterialTag from '@/components/MaterialTag'
import { getPrinterImage } from '@/utils/printerImages'
import { getCurrencySymbol } from '@/utils/currency'
import type { FilamentProfile } from '@/types/filament'
import type { PrinterResponse } from '@/types/printer'
import styles from './SpoolDetailsForm.module.css'

const BRAND_DOMAINS: Record<string, string> = {
  'Bambu Lab': 'bambulab.com', 'eSUN 3D': 'esun3d.com', 'Prusament': 'prusament.com',
  'Polymaker': 'polymaker.com', 'Hatchbox': 'hatchbox3d.com', 'SUNLU': 'sunlu.com',
  'Creality': 'creality.com', 'ELEGOO': 'elegoo.com', 'Overture': 'overture3d.com',
  'PolyLite': 'polymaker.com', 'colorFabb': 'colorfabb.com', 'Fillamentum': 'fillamentum.com',
  'Fiberlogy': 'fiberlogy.com', 'extrudr': 'extrudr.com', 'Das Filament': 'dasfilament.de',
  'Protopasta': 'proto-pasta.com', 'MatterHackers': 'matterhackers.com',
  'NinjaTek': 'ninjatek.com', 'Atomic Filament': 'atomicfilament.com',
  'Inland': 'microcenter.com', 'JAYO': 'jayofilament.com', 'TINMORRY': 'tinmorry.com',
  'AzureFilm': 'azurefilm.hr', 'Spectrum': 'spectrumfilaments.com',
  'Devil Design': 'devildesign.pl', 'Anycubic': 'anycubic.com',
}

function BrandFavicon({ brand }: { brand: string }) {
  const [error, setError] = useState(false)
  const domain = BRAND_DOMAINS[brand]
  if (domain && !error) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
        alt={brand}
        className={styles.brandLogo}
        onError={() => setError(true)}
      />
    )
  }
  return <span className={styles.brandFallback}>{brand[0]}</span>
}

function SpecBox({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className={styles.specBox}>
      <p className={styles.specLabel}>{label}</p>
      <p className={styles.specValue}>{value}</p>
    </div>
  )
}

const PenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

// Weight field that is read-only until the user clicks the edit pen (prevents accidental edits of prefilled defaults).
function EditableWeightBox({ label, value, onChange, editing, onToggleEdit, errorText }: {
  label: string
  value: string
  onChange: (v: string) => void
  editing: boolean
  onToggleEdit: () => void
  errorText?: string
}) {
  return (
    <div className={styles.box}>
      <div className={styles.boxLabelRow}>
        <span className={styles.editLabel}>{label}</span>
        <button type="button" className={styles.boxEditBtn} onClick={onToggleEdit} title={editing ? 'Lock' : 'Edit'}>
          {editing ? <LockIcon /> : <PenIcon />}
        </button>
      </div>
      {editing
        ? <input type="number" value={value} onChange={e => onChange(e.target.value)} className={styles.boxInput} autoFocus />
        : <p className={styles.boxReadonly}>{value !== '' ? `${value} g` : '—'}</p>
      }
      {errorText && <p className={styles.boxError}>{errorText}</p>}
    </div>
  )
}

function PrinterAssignSection({
  printers, printerId, onPrinterChange, amsSlot, onAmsSlotChange,
  occupiedSlots, currentSpoolColor, disabled,
  printerError, printerShakeKey, onPrinterShakeEnd, amsSlotError, onBusyTrayClick,
}: {
  printers: PrinterResponse[]
  printerId: string | null
  onPrinterChange: (v: string | null) => void
  amsSlot: number | null
  onAmsSlotChange: ((v: number | null) => void) | null
  occupiedSlots: Record<number, { colorHex: string; colorName: string; brand: string; material: string }>
  currentSpoolColor?: string
  disabled: boolean
  printerError?: boolean
  printerShakeKey?: number
  onPrinterShakeEnd?: () => void
  amsSlotError?: boolean
  onBusyTrayClick?: (slot: number) => void
}) {
  const { t } = useTranslation()
  const selected = printers.find(p => p.id === printerId)
  const showAms = selected?.hasAms && onAmsSlotChange !== null

  return (
    <div
      key={printerShakeKey}
      className={`${styles.printerBox}${printerError ? ` ${styles.printerBoxError} ${styles.shake}` : ''}`}
      onAnimationEnd={onPrinterShakeEnd}
    >
      <label className={`${styles.printerLabel}${printerError ? ` ${styles.printerLabelError}` : ''}`}>
        {printerError ? t('spoolForm.assignPrinterWarning') : t('spoolForm.assignedPrinter')}
      </label>
      <select
        value={printerId ?? ''}
        onChange={e => onPrinterChange(e.target.value || null)}
        disabled={disabled}
        className={`${styles.printerSelect}${printerError ? ` ${styles.printerSelectError}` : ''}`}
      >
        <option value="">{t('spoolForm.noPrinter')}</option>
        {printers.map(p => <option key={p.id} value={p.id}>{p.name} · {p.brand} {p.model}</option>)}
      </select>

      {selected && (
        <div className={styles.printerDetail}>
          <div className={styles.printerImg}>
            <img
              src={getPrinterImage(selected.brand, selected.model)}
              alt={`${selected.brand} ${selected.model}`}
              className={styles.printerImgSrc}
              onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
            />
          </div>
          <div className={styles.printerMeta}>
            <p className={styles.printerName}>{selected.name}</p>
            <p className={styles.printerBrandLabel}>{selected.brand}</p>
            {showAms ? (
              <>
                <p className={`${styles.amsLabel}${amsSlotError ? ` ${styles.amsLabelError}` : ''}`}>
                  {amsSlotError ? t('spoolForm.selectTrayWarning') : t('spoolForm.amsTray')}
                </p>
                <div className={`${styles.amsTray}${amsSlotError ? ` ${styles.amsSlotError}` : ''}`}>
                  {[1, 2, 3, 4].map(slotNum => {
                    const occupant = occupiedSlots[slotNum]
                    const isSel = amsSlot === slotNum
                    const color = isSel ? currentSpoolColor : occupant?.colorHex
                    return (
                      <button
                        key={slotNum}
                        type="button"
                        title={isSel ? 'This spool' : occupant ? `${occupant.colorName} — ${occupant.brand} ${occupant.material}` : `Tray ${slotNum} — empty`}
                        onClick={() => {
                          if (isSel) { onAmsSlotChange!(null); return }
                          if (occupiedSlots[slotNum] && onBusyTrayClick) { onBusyTrayClick(slotNum); return }
                          onAmsSlotChange!(slotNum)
                        }}
                        disabled={disabled}
                        style={color ? { backgroundColor: color } : undefined}
                        className={`${styles.amsBtn}${isSel ? ` ${styles.amsBtnSelected}` : ''}`}
                      >
                        <span className={color ? styles.trayText : undefined}>
                          {slotNum}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <span className={styles.directSpool}>{t('spoolForm.directSpool')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  filament: FilamentProfile
  tagUid?: string
  tagUidLocked?: boolean
  currentWeightG: string
  setCurrentWeightG: (v: string) => void
  currentWeightShake?: boolean
  currentWeightStatus?: 'neutral' | 'error' | 'valid'
  initialWeightG: string
  setInitialWeightG: (v: string) => void
  spoolWeightG: string
  setSpoolWeightG: (v: string) => void
  lowStockThresholdG: string
  setLowStockThresholdG: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  stockLocation: string
  setStockLocation: (v: string) => void
  stockLocationOptions?: string[]
  price: string
  setPrice: (v: string) => void
  currency?: string
  weightError: string
  setWeightError: (v: string) => void
  isActive: boolean
  setIsActive: (v: boolean) => void
  printers?: PrinterResponse[]
  printerId?: string | null
  setPrinterId?: (v: string | null) => void
  amsSlot?: number | null
  onAmsSlotChange?: (v: number | null) => void
  occupiedSlots?: Record<number, { colorHex: string; colorName: string; brand: string; material: string }>
  currentSpoolColor?: string
  printerError?: boolean
  printerShakeKey?: number
  onPrinterShakeEnd?: () => void
  amsSlotError?: boolean
  onBusyTrayClick?: (slot: number) => void
  stockLocationError?: boolean
  stockLocationShakeKey?: number
  onStockLocationShakeEnd?: () => void
  submitting: boolean
  submitError: string | null
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export default function SpoolDetailsForm({
  filament: f,
  tagUid,
  currentWeightG, setCurrentWeightG, currentWeightShake, currentWeightStatus,
  initialWeightG, setInitialWeightG,
  spoolWeightG, setSpoolWeightG,
  lowStockThresholdG, setLowStockThresholdG,
  notes, setNotes,
  stockLocation, setStockLocation, stockLocationOptions = [],
  price, setPrice,
  currency = 'USD',
  weightError, setWeightError,
  isActive, setIsActive,
  printers, printerId, setPrinterId,
  amsSlot, onAmsSlotChange, occupiedSlots, currentSpoolColor,
  printerError, printerShakeKey, onPrinterShakeEnd, amsSlotError, onBusyTrayClick,
  stockLocationError, stockLocationShakeKey, onStockLocationShakeEnd,
  submitting, submitError,
  onSubmit, onCancel,
}: Props) {
  const { t } = useTranslation()
  const [editInitial, setEditInitial] = useState(false)
  const [editSpool, setEditSpool] = useState(false)
  const [editLowStock, setEditLowStock] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [addingLoc, setAddingLoc] = useState(false)
  const [newLocName, setNewLocName] = useState('')
  const [savingLoc, setSavingLoc] = useState(false)
  const [extraLocations, setExtraLocations] = useState<string[]>([])
  const newLocInputRef = useRef<HTMLInputElement>(null)

  const allLocOptions = [...new Set([...stockLocationOptions, ...extraLocations])]

  async function handleSaveLoc() {
    const name = newLocName.trim()
    if (!name || savingLoc) return
    setSavingLoc(true)
    try {
      await locationsApi.add({ name })
      setExtraLocations(prev => [...prev, name])
      setStockLocation(name)
      setAddingLoc(false)
      setNewLocName('')
    } finally {
      setSavingLoc(false)
    }
  }
  const hasPrintSettings = f.extruderMin != null || f.extruderMax != null || f.bedMin != null || f.bedMax != null

  const cwInputClass = `${styles.boxInput}${
    currentWeightStatus === 'error' ? ` ${styles.boxInputError}` :
    currentWeightStatus === 'valid' ? ` ${styles.boxInputValid}` : ''
  }`

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      <div className={styles.card}>

        {/* Filament header */}
        <div className={styles.header}>
          <div className={styles.headerColorOverlay} style={{ backgroundColor: f.colorHex ?? undefined }} />
          <div className={styles.headerRow}>
            <SpoolIcon color={f.colorHex ?? '#888'} size={100} />
            <div className={styles.headerInfo}>
              <div className={styles.headerMeta}>
                <BrandFavicon brand={f.brand} />
                <span className={styles.headerBrand}>{f.brand}</span>
              </div>
              <p className={styles.headerTitle}>{f.colorName ?? f.filamentName}</p>
              <div className={styles.headerSub}>
                <p className={styles.headerHex}>{f.colorHex}</p>
              </div>
            </div>
            <div className={styles.headerBadges}>
              <MaterialTag material={f.material} />
              {tagUid && (
                <div className={styles.nfcBadge}>
                  <svg width="14" height="14" className={styles.nfcIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="7" x2="5" y2="17" />
                    <path d="M8 9.5a4 4 0 0 1 0 5" />
                    <path d="M11 8a7 7 0 0 1 0 8" />
                    <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
                  </svg>
                  <span className={styles.nfcBadgeText}>{t('addSpool.nfcTag')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats + Price — 3-column desktop layout */}
        <div className={styles.section}>
          <p className={styles.sectionHeader}>{t('spoolForm.sectionSpoolStats')}</p>
          <div className={styles.mainGrid}>

            {/* Left: 3-col inner grid — row heights independent of printer */}
            <div className={styles.statsArea}>
              {/* Row 1 */}
              <div className={`${styles.box}${currentWeightShake ? ` ${styles.shake}` : ''}`}>
                <label className={styles.boxLabel}>{t('spoolDetail.currentWeightG')}</label>
                <input
                  type="number"
                  value={currentWeightG}
                  onChange={e => setCurrentWeightG(e.target.value)}
                  className={cwInputClass}
                />
              </div>
              <EditableWeightBox
                label={t('spoolDetail.initialWeightG')}
                value={initialWeightG}
                onChange={v => { setInitialWeightG(v); setWeightError('') }}
                editing={editInitial}
                onToggleEdit={() => setEditInitial(e => !e)}
                errorText={weightError || undefined}
              />
              <div className={`${styles.activeBox}${isActive ? ` ${styles.activeBoxOn}` : ''}`}>
                <p className={styles.toggleLabel}>{t('spoolForm.active')}</p>
                <div className={styles.activeRow}>
                  <p className={styles.toggleSub}>{t('spoolForm.loadedSpool')}</p>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`${styles.toggle}${isActive ? ` ${styles.toggleOn}` : ''}`}
                  >
                    <span className={`${styles.toggleThumb}${isActive ? ` ${styles.toggleThumbOn}` : ''}`} />
                  </button>
                </div>
              </div>

              {/* Row 2 */}
              <EditableWeightBox
                label={t('spoolDetail.spoolWeightG')}
                value={spoolWeightG}
                onChange={setSpoolWeightG}
                editing={editSpool}
                onToggleEdit={() => setEditSpool(e => !e)}
              />
              <EditableWeightBox
                label={t('spoolDetail.lowStockAtG')}
                value={lowStockThresholdG}
                onChange={setLowStockThresholdG}
                editing={editLowStock}
                onToggleEdit={() => setEditLowStock(e => !e)}
              />
              <div className={styles.priceBox}>
                <label className={styles.boxLabel}>{t('spoolForm.price')} ({getCurrencySymbol(currency)})</label>
                <div className={styles.boxInputWrap}>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    className={styles.boxInput}
                  />
                  <span className={styles.boxUnit}>{getCurrencySymbol(currency)}</span>
                </div>
              </div>

            </div>

            {/* Right: Printer when active, Stock Location when inactive */}
            <div className={styles.rightColWrap}>
              {setPrinterId && isActive ? (
                <PrinterAssignSection
                  printers={printers ?? []}
                  printerId={printerId ?? null}
                  onPrinterChange={v => { setPrinterId(v); if (!v) onAmsSlotChange?.(null) }}
                  amsSlot={amsSlot ?? null}
                  onAmsSlotChange={onAmsSlotChange ?? null}
                  occupiedSlots={occupiedSlots ?? {}}
                  currentSpoolColor={currentSpoolColor}
                  disabled={submitting}
                  printerError={printerError}
                  printerShakeKey={printerShakeKey}
                  onPrinterShakeEnd={onPrinterShakeEnd}
                  amsSlotError={amsSlotError}
                  onBusyTrayClick={onBusyTrayClick}
                />
              ) : !isActive ? (
                <div
                  key={stockLocationShakeKey}
                  className={`${styles.printerBox}${stockLocationError ? ` ${styles.printerBoxError} ${styles.shake}` : ''}`}
                  onAnimationEnd={onStockLocationShakeEnd}
                >
                  <label className={`${styles.printerLabel}${stockLocationError ? ` ${styles.printerLabelError}` : ''}`}>
                    {stockLocationError ? t('spoolForm.stockLocationRequired') : t('spoolForm.stockLocation')}
                  </label>
                  {addingLoc ? (
                    <div className={styles.newLocRow}>
                      <input
                        ref={newLocInputRef}
                        type="text"
                        value={newLocName}
                        onChange={e => setNewLocName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveLoc() } if (e.key === 'Escape') { setAddingLoc(false); setNewLocName('') } }}
                        placeholder={t('locations.namePlaceholder')}
                        className={styles.newLocInput}
                        autoFocus
                      />
                      <button type="button" className={styles.newLocSave} onClick={handleSaveLoc} disabled={savingLoc || !newLocName.trim()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button type="button" className={styles.newLocCancel} onClick={() => { setAddingLoc(false); setNewLocName('') }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ) : (
                    <select
                      value={stockLocation}
                      onChange={e => {
                        if (e.target.value === '__new__') { setAddingLoc(true); setNewLocName('') }
                        else setStockLocation(e.target.value)
                      }}
                      className={`${styles.printerSelect}${stockLocationError ? ` ${styles.printerSelectError}` : ''}`}
                    >
                      <option value="">{t('spoolForm.selectStorage')}</option>
                      {allLocOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      <option value="__new__">＋ {t('locations.addLocation')}</option>
                    </select>
                  )}
                </div>
              ) : null}
            </div>

          </div>
        </div>

        {/* Print Settings — collapsible */}
        {hasPrintSettings && (
          <div className={styles.section}>
            <button type="button" className={styles.sectionToggleRow} onClick={() => setPrintOpen(o => !o)}>
              <p className={styles.sectionHeader}>{t('spoolForm.sectionPrintSettings')}</p>
              <svg className={`${styles.chevron}${printOpen ? ` ${styles.chevronOpen}` : ''}`}
                width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {printOpen && (
              <div className={styles.specGrid3}>
                <SpecBox label={t('spoolForm.extruderMin')} value={f.extruderMin != null ? `${f.extruderMin} °C` : null} />
                <SpecBox label={t('spoolForm.extruderMax')} value={f.extruderMax != null ? `${f.extruderMax} °C` : null} />
                <SpecBox label={t('spoolForm.extruderRange')} value={f.extruderMin != null && f.extruderMax != null ? `${f.extruderMin}–${f.extruderMax} °C` : null} />
                <SpecBox label={t('spoolForm.bedMin')} value={f.bedMin != null ? `${f.bedMin} °C` : null} />
                <SpecBox label={t('spoolForm.bedMax')} value={f.bedMax != null ? `${f.bedMax} °C` : null} />
                <SpecBox label={t('spoolForm.bedRange')} value={f.bedMin != null && f.bedMax != null ? `${f.bedMin}–${f.bedMax} °C` : null} />
              </div>
            )}
          </div>
        )}

        {/* Material Properties — collapsible */}
        <div className={styles.section}>
          <button type="button" className={styles.sectionToggleRow} onClick={() => setMaterialOpen(o => !o)}>
            <p className={styles.sectionHeader}>{t('spoolForm.sectionMaterialProperties')}</p>
            <svg className={`${styles.chevron}${materialOpen ? ` ${styles.chevronOpen}` : ''}`}
              width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {materialOpen && (
            <div className={styles.specGrid3}>
              <SpecBox label={t('spoolForm.material')} value={f.material} />
              <SpecBox label={t('spoolForm.density')} value={f.density != null ? `${f.density} g/cm³` : null} />
              <SpecBox label={t('spoolForm.diameterTolerance')} value={f.diameterTolerance != null ? `±${f.diameterTolerance} mm` : null} />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className={styles.section}>
          <p className={styles.sectionHeader}>{t('spoolForm.sectionNotes')}</p>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('common.notesPlaceholder')}
            className={styles.textarea}
          />
        </div>

      </div>

      {submitError && <p className={styles.submitError}>{submitError}</p>}

      <div className={styles.footerRow}>
        <button type="button" onClick={onCancel} className={styles.btnCancel}>{t('common.cancel')}</button>
        <button type="submit" disabled={submitting} className={styles.btnSave}>
          {submitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}
