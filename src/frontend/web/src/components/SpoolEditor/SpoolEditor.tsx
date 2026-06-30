import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SpoolIcon, PenIcon, LockIcon } from '@/components/icons'
import NfcIcon from '@/components/icons/NfcIcon'
import PlusIcon from '@/components/icons/PlusIcon'
import InfoCircleIcon from '@/components/icons/InfoCircleIcon'
import { locationsApi } from '@/api/locations'
import MaterialTag from '@/components/MaterialTag'
import { getPrinterImage } from '@/utils/printerImages'
import { getCurrencySymbol } from '@/utils/currency'
import type { PrinterResponse } from '@/types/printer'
import styles from './SpoolEditor.module.css'

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

function EditableSpecBox({ label, value, unit, onChange }: {
  label: string
  value: string
  unit?: string
  onChange: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <div className={`${styles.specBox}${editing ? ` ${styles.specBoxEditing}` : ''}`}>
      <div className={styles.specLabelRow}>
        <p className={styles.specLabel}>{label}</p>
        <button type="button" className={styles.specEditBtn} onClick={() => setEditing(e => !e)} title={editing ? 'Lock' : 'Edit'}>
          {editing ? <LockIcon /> : <PenIcon />}
        </button>
      </div>
      {editing
        ? <input type="number" step="1" value={value} onChange={e => onChange(e.target.value)} className={styles.specInput} autoFocus />
        : <p className={styles.specValue}>{value !== '' ? `${value}${unit ? ` ${unit}` : ''}` : '—'}</p>
      }
    </div>
  )
}

function RangeEditableBox({ label, minVal, maxVal, unit, onMinChange, onMaxChange }: {
  label: string
  minVal: string
  maxVal: string
  unit?: string
  onMinChange?: (v: string) => void
  onMaxChange?: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const isEditable = !!onMinChange

  const hasMin = minVal !== ''
  const hasMax = maxVal !== ''
  const rangeText = hasMin && hasMax
    ? `${minVal}–${maxVal}${unit ? ` ${unit}` : ''}`
    : hasMin ? `${minVal}${unit ? ` ${unit}` : ''}`
    : hasMax ? `${maxVal}${unit ? ` ${unit}` : ''}`
    : '—'

  return (
    <div className={`${styles.specBox}${editing ? ` ${styles.specBoxEditing}` : ''}`}>
      <div className={styles.specLabelRow}>
        <p className={styles.specLabel}>{label}</p>
        {isEditable && (
          <button type="button" className={styles.specEditBtn} onClick={() => setEditing(e => !e)} title={editing ? 'Lock' : 'Edit'}>
            {editing ? <LockIcon /> : <PenIcon />}
          </button>
        )}
      </div>
      {isEditable && editing ? (
        <div className={styles.rangeInputRow}>
          <input type="number" step="1" value={minVal} onChange={e => onMinChange!(e.target.value)} className={styles.rangeInput} placeholder="min" autoFocus />
          <span className={styles.rangeSep}>–</span>
          <input type="number" step="1" value={maxVal} onChange={e => onMaxChange!(e.target.value)} className={styles.rangeInput} placeholder="max" />
          {unit && <span className={styles.rangeUnit}>{unit}</span>}
        </div>
      ) : (
        <p className={styles.specValue}>{rangeText}</p>
      )}
    </div>
  )
}

function EditableWeightBox({ label, value, onChange, editing, onToggleEdit, errorText }: {
  label: string
  value: string
  onChange: (v: string) => void
  editing: boolean
  onToggleEdit: () => void
  errorText?: string
}) {
  return (
    <div className={`${styles.box}${editing ? ` ${styles.boxEditing}` : ''}`}>
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
  occupiedSlots, currentSpoolColor, currentSpoolColorName, disabled,
  printerError, printerShakeKey, onPrinterShakeEnd, amsSlotError, onBusyTrayClick,
}: {
  printers: PrinterResponse[]
  printerId: string | null
  onPrinterChange: (v: string | null) => void
  amsSlot: number | null
  onAmsSlotChange: ((v: number | null) => void) | null
  occupiedSlots: Record<number, { colorHex: string; colorName: string; brand: string; material: string }>
  currentSpoolColor?: string
  currentSpoolColorName?: string
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
        <div className={styles.amsLayout}>
          <div className={styles.pcardThumb}>
            <div className={styles.pcardPic}>
              <img
                src={getPrinterImage(selected.brand, selected.model)}
                alt={`${selected.brand} ${selected.model}`}
                className={styles.pcardImg}
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
              />
            </div>
          </div>

          <div className={styles.amsRight}>
            {showAms ? (
              <>
                <p className={`${styles.slotLabel}${amsSlotError ? ` ${styles.slotLabelError}` : ''}`}>
                  {amsSlotError ? t('spoolForm.selectTrayWarning') : t('spoolForm.chooseAmsSlot')}
                </p>
                <div className={`${styles.slotPick}${amsSlotError ? ` ${styles.slotPickError}` : ''}`}>
                  {[1, 2, 3, 4].map(slotNum => {
                    const occupant = occupiedSlots[slotNum]
                    const isSel = amsSlot === slotNum
                    const color = isSel ? currentSpoolColor : occupant?.colorHex
                    const name = isSel
                      ? (currentSpoolColorName ?? '—')
                      : (occupant?.colorName ?? t('spoolForm.slotEmpty'))
                    return (
                      <button
                        key={slotNum}
                        type="button"
                        title={occupant ? `${occupant.colorName} — ${occupant.brand} ${occupant.material}` : t('spoolForm.slotEmpty')}
                        onClick={() => {
                          if (isSel) { onAmsSlotChange!(null); return }
                          if (occupiedSlots[slotNum] && onBusyTrayClick) { onBusyTrayClick(slotNum); return }
                          onAmsSlotChange!(slotNum)
                        }}
                        disabled={disabled}
                        className={`${styles.slotTile}${isSel ? ` ${styles.slotTileSel}` : ''}${!occupant && !isSel ? ` ${styles.slotTileEmpty}` : ''}`}
                      >
                        {isSel && <span className={styles.slotHere}>{t('spoolForm.goesHere')}</span>}
                        <span className={styles.slotNum}>{slotNum}</span>
                        <span className={styles.slotIc}>
                          {color
                            ? <SpoolIcon color={color} size={22} />
                            : <PlusIcon className={styles.slotPlus} />
                          }
                        </span>
                        <span className={styles.slotCn}>{name}</span>
                      </button>
                    )
                  })}
                </div>
                {amsSlot !== null && amsSlot !== undefined && occupiedSlots[amsSlot] && (
                  <div className={styles.slotNote}>
                    <InfoCircleIcon className={styles.slotNoteIcon} />
                    {t('spoolForm.slotOccupied')}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.singleSlot}>
                <span className={styles.singleSlotIc}>
                  <SpoolIcon color={currentSpoolColor ?? '#888'} size={28} />
                </span>
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
  )
}

interface SpoolEditorProps {
  brand: string
  material: string
  colorName: string
  colorHex: string | null
  tagUid?: string

  extruderMin?: number | null
  extruderMax?: number | null
  bedMin?: number | null
  bedMax?: number | null
  density?: number | null
  diameterTolerance?: number | null

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
  weightError: string
  setWeightError: (v: string) => void

  notes: string
  setNotes: (v: string) => void
  stockLocation: string
  setStockLocation: (v: string) => void
  stockLocationOptions?: string[]
  price: string
  setPrice: (v: string) => void
  currency?: string
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
  onCancel?: () => void

  onExtruderMinChange?: (v: string) => void
  onExtruderMaxChange?: (v: string) => void
  onBedMinChange?: (v: string) => void
  onBedMaxChange?: (v: string) => void
  onDensityChange?: (v: string) => void
  onDiameterToleranceChange?: (v: string) => void
}

export default function SpoolEditor({
  brand, material, colorName, colorHex, tagUid,
  extruderMin, extruderMax, bedMin, bedMax, density, diameterTolerance,
  currentWeightG, setCurrentWeightG, currentWeightShake, currentWeightStatus,
  initialWeightG, setInitialWeightG,
  spoolWeightG, setSpoolWeightG,
  lowStockThresholdG, setLowStockThresholdG,
  weightError, setWeightError,
  notes, setNotes,
  stockLocation, setStockLocation, stockLocationOptions = [],
  price, setPrice,
  currency = 'USD',
  isActive, setIsActive,
  printers, printerId, setPrinterId,
  amsSlot, onAmsSlotChange, occupiedSlots, currentSpoolColor,
  printerError, printerShakeKey, onPrinterShakeEnd, amsSlotError, onBusyTrayClick,
  stockLocationError, stockLocationShakeKey, onStockLocationShakeEnd,
  submitting, submitError,
  onSubmit, onCancel,
  onExtruderMinChange, onExtruderMaxChange, onBedMinChange, onBedMaxChange,
  onDensityChange, onDiameterToleranceChange,
}: SpoolEditorProps) {
  const { t } = useTranslation()
  const [editInitial, setEditInitial] = useState(false)
  const [editSpool, setEditSpool] = useState(false)
  const [editLowStock, setEditLowStock] = useState(false)
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

  const isEditMode = onExtruderMinChange !== undefined
  const showPrintPanel = isEditMode || extruderMin != null || extruderMax != null || bedMin != null || bedMax != null
  const showMaterialPanel = isEditMode || density != null || diameterTolerance != null
  const showBottomSection = showPrintPanel || showMaterialPanel

  const cwInputClass = `${styles.boxInput}${
    currentWeightStatus === 'error' ? ` ${styles.boxInputError}` :
    currentWeightStatus === 'valid' ? ` ${styles.boxInputValid}` : ''
  }`

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      <div className={styles.card}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerColorOverlay} style={{ backgroundColor: colorHex ?? undefined }} />
          <div className={styles.headerRow}>
            <SpoolIcon color={colorHex ?? '#888'} size={80} />
            <div className={styles.headerInfo}>
              <div className={styles.headerMeta}>
                <BrandFavicon brand={brand} />
                <span className={styles.headerBrand}>{brand}</span>
              </div>
              <p className={styles.headerTitle}>{colorName}</p>
              {colorHex && <p className={styles.headerHex}>{colorHex}</p>}
            </div>
            <div className={styles.headerBadges}>
              <MaterialTag material={material} />
              {tagUid && (
                <div className={styles.nfcBadge}>
                  <NfcIcon className={styles.nfcIcon} />
                  <span className={styles.nfcBadgeText}>{t('addSpool.nfcTag')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Spool Stats ── */}
        <div className={styles.section}>
          <p className={styles.sectionHeader}>{t('spoolForm.sectionSpoolStats')}</p>
          <div className={styles.mainGrid}>

            {/* Left: 3-col, 2-row grid */}
            <div className={styles.statsArea}>

              {/* Row 1: Current Weight | Price | Active */}
              <div className={`${styles.box} ${styles.boxEditing}${currentWeightShake ? ` ${styles.shake}` : ''}`}>
                <label className={styles.boxLabel}>{t('spoolDetail.currentWeightG')}</label>
                <input
                  type="number"
                  value={currentWeightG}
                  onChange={e => setCurrentWeightG(e.target.value)}
                  className={cwInputClass}
                />
              </div>

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

              {/* Row 2: Initial Weight | Spool Weight | Low Stock */}
              <EditableWeightBox
                label={t('spoolDetail.initialWeightG')}
                value={initialWeightG}
                onChange={v => { setInitialWeightG(v); setWeightError('') }}
                editing={editInitial}
                onToggleEdit={() => setEditInitial(e => !e)}
                errorText={weightError || undefined}
              />
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
            </div>

            {/* Right col: Stock Location (inactive) or Printer (active) */}
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
                  currentSpoolColorName={colorName}
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
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleSaveLoc() }
                          if (e.key === 'Escape') { setAddingLoc(false); setNewLocName('') }
                        }}
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

        {/* ── Print Settings | Material Properties ── */}
        {showBottomSection && (
          <div className={styles.section}>
            <div className={styles.bottomGrid}>

              {showPrintPanel && (
                <div className={styles.bottomPanel}>
                  <p className={styles.sectionHeader}>{t('spoolForm.sectionPrintSettings')}</p>
                  <div className={styles.specGrid2}>
                    <RangeEditableBox
                      label={t('spoolForm.extruderRange')}
                      minVal={extruderMin != null ? String(extruderMin) : ''}
                      maxVal={extruderMax != null ? String(extruderMax) : ''}
                      unit="°C"
                      onMinChange={onExtruderMinChange}
                      onMaxChange={onExtruderMaxChange}
                    />
                    <RangeEditableBox
                      label={t('spoolForm.bedRange')}
                      minVal={bedMin != null ? String(bedMin) : ''}
                      maxVal={bedMax != null ? String(bedMax) : ''}
                      unit="°C"
                      onMinChange={onBedMinChange}
                      onMaxChange={onBedMaxChange}
                    />
                  </div>
                </div>
              )}

              {showPrintPanel && showMaterialPanel && <div className={styles.bottomDivider} />}

              {showMaterialPanel && (
                <div className={styles.bottomPanel}>
                  <p className={styles.sectionHeader}>{t('spoolForm.sectionMaterialProperties')}</p>
                  <div className={styles.specGrid2}>
                    {onDensityChange
                      ? <EditableSpecBox label={t('spoolForm.density')} value={density != null ? String(density) : ''} unit="g/cm³" onChange={onDensityChange} />
                      : <SpecBox label={t('spoolForm.density')} value={density != null ? `${density} g/cm³` : null} />
                    }
                    {onDiameterToleranceChange
                      ? <EditableSpecBox label={t('spoolForm.diameterTolerance')} value={diameterTolerance != null ? String(diameterTolerance) : ''} unit="mm" onChange={onDiameterToleranceChange} />
                      : <SpecBox label={t('spoolForm.diameterTolerance')} value={diameterTolerance != null ? `±${diameterTolerance} mm` : null} />
                    }
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Notes ── */}
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
        {onCancel && (
          <button type="button" onClick={onCancel} className={styles.btnCancel}>{t('common.cancel')}</button>
        )}
        <button type="submit" disabled={submitting} className={styles.btnSave}>
          {submitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}
