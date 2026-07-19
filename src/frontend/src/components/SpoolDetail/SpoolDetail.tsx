import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import { settingsApi } from '@/api/settings'
import { locationsApi } from '@/api/locations'
import { SpoolIcon } from '@/components/icons'
import NfcIcon from '@/components/icons/NfcIcon'
import MaterialTag from '@/components/MaterialTag'
import { BrandLogo } from '@/components/BrandCard'
import { getPrinterImage } from '@/utils/printerImages'
import { formatCurrency } from '@/utils/currency'
import AmsConflictModal from '@/components/AmsConflictModal/AmsConflictModal'
import PrintHistoryList from '@/components/PrintHistory/PrintHistoryList'
import SpoolEditor from '@/components/SpoolEditor/SpoolEditor'
import type { SpoolResponse, UpdateSpoolRequest } from '@/types/spool'
import type { PrintJobResponse } from '@/types/printJob'
import type { PrinterResponse } from '@/types/printer'
import styles from './SpoolDetail.module.css'

// ── small helpers ──────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between py-2 border-b last:border-0 ${styles.infoRow}`}>
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text-primary)] text-right">{value}</span>
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function fmt(date: string | null, neverStr: string) {
  if (!date) return neverStr
  return new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(date: string) {
  return new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── main component ─────────────────────────────────────────────────────────────

interface SpoolDetailProps {
  spool: SpoolResponse
  jobs: PrintJobResponse[]
  onUpdate: (updated: SpoolResponse) => void
  onDelete: () => void
}

export default function SpoolDetail({ spool, jobs, onUpdate, onDelete }: SpoolDetailProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<UpdateSpoolRequest>({})
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null)
  const [selectedAmsSlot, setSelectedAmsSlot] = useState<number | null>(null)
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [allSpools, setAllSpools] = useState<SpoolResponse[]>([])
  const [conflictSpool, setConflictSpool] = useState<SpoolResponse | null>(null)
  const [displacedStockLocation, setDisplacedStockLocation] = useState<string | null>(null)
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)
  const [printerError, setPrinterError] = useState(false)
  const [printerShakeKey, setPrinterShakeKey] = useState(0)
  const [stockLocationError, setStockLocationError] = useState(false)
  const [stockLocationShakeKey, setStockLocationShakeKey] = useState(0)
  const [currency, setCurrency] = useState('USD')
  const [locations, setLocations] = useState<string[]>([])

  useEffect(() => {
    printersApi.getAll().then(setPrinters).catch(() => {})
    spoolsApi.getAll().then(setAllSpools).catch(() => {})
    settingsApi.getApp().then(s => { if (s.currency) setCurrency(s.currency) }).catch(() => {})
    locationsApi.getAll().then(locs => setLocations(locs.map(l => l.name))).catch(() => {})
  }, [])

  // Edit form: occupied by OTHER spools (to show warnings on tray picker)
  const trayOccupants = useMemo(() => {
    if (!selectedPrinterId) return {}
    const result: Record<number, { colorHex: string; colorName: string; brand: string; material: string }> = {}
    for (const s of allSpools) {
      if (s.printerId === selectedPrinterId && s.amsSlot != null && s.id !== spool.id) {
        result[s.amsSlot] = { colorHex: s.colorHex, colorName: s.colorName, brand: s.brand, material: s.material }
      }
    }
    return result
  }, [allSpools, selectedPrinterId, spool.id])

  // Read view: all spools in each tray of the assigned printer (including this spool)
  const printerTrayMap = useMemo(() => {
    if (!spool.printerId) return {} as Record<number, SpoolResponse>
    const map: Record<number, SpoolResponse> = {}
    for (const s of allSpools) {
      if (s.printerId === spool.printerId && s.amsSlot != null) {
        map[s.amsSlot] = s
      }
    }
    return map
  }, [allSpools, spool.printerId])

  function startEdit() {
    setForm({
      currentWeightG: spool.currentWeightG,
      initialWeightG: spool.initialWeightG,
      spoolWeightG: spool.spoolWeightG,
      lowStockThresholdG: spool.lowStockThresholdG,
      notes: spool.notes ?? '',
      stockLocation: spool.stockLocation ?? '',
      price: spool.price ?? undefined,
      isActive: spool.isActive,
      density: spool.density ?? undefined,
      diameterTolerance: spool.diameterTolerance ?? undefined,
      extruderMin: spool.extruderMin ?? undefined,
      extruderMax: spool.extruderMax ?? undefined,
      bedMin: spool.bedMin ?? undefined,
      bedMax: spool.bedMax ?? undefined,
    })
    setSelectedPrinterId(spool.printerId)
    setSelectedAmsSlot(spool.amsSlot)
    setEditing(true)
    setConfirmDelete(false)
  }

  function cancelEdit() {
    setEditing(false)
    setForm({})
    setSelectedPrinterId(null)
    setSelectedAmsSlot(null)
    setPrinterError(false)
    setStockLocationError(false)
    setDeactivateConfirm(false)
    setConflictSpool(null)
    setDisplacedStockLocation(null)
  }

  function handleBusyTrayClick(slot: number) {
    const occupant = allSpools.find(
      s => s.printerId === selectedPrinterId && s.amsSlot === slot && s.id !== spool.id
    )
    if (occupant) setConflictSpool(occupant)
  }

  async function doSave(stockLocationOverride?: string) {
    setSaving(true)
    try {
      const { isActive: newIsActive, ...otherFields } = form
      const deactivating = newIsActive === false && spool.isActive
      let updated: SpoolResponse = spool

      // Route isActive through dedicated endpoints
      if (newIsActive === true && !spool.isActive) {
        updated = await spoolsApi.activate(spool.id)
      } else if (deactivating) {
        updated = await spoolsApi.deactivate(spool.id)
      }

      // Only call update() when editable fields actually differ from original
      const notesBefore    = (spool.notes ?? '').trim()
      const notesAfter     = (otherFields.notes ?? '').trim()
      const locationBefore = (spool.stockLocation ?? '').trim()
      const locationAfter  = stockLocationOverride !== undefined
        ? stockLocationOverride.trim()
        : (otherFields.stockLocation ?? '').trim()
      const priceBefore = spool.price ?? null
      const priceAfter = otherFields.price ?? null
      const hasChanges =
        Math.abs((otherFields.currentWeightG  ?? spool.currentWeightG)  - spool.currentWeightG)  > 0.01 ||
        Math.abs((otherFields.initialWeightG  ?? spool.initialWeightG)  - spool.initialWeightG)  > 0.01 ||
        Math.abs((otherFields.spoolWeightG    ?? spool.spoolWeightG)    - spool.spoolWeightG)    > 0.01 ||
        Math.abs((otherFields.lowStockThresholdG ?? spool.lowStockThresholdG) - spool.lowStockThresholdG) > 0.01 ||
        notesAfter !== notesBefore ||
        locationAfter !== locationBefore ||
        priceAfter !== priceBefore ||
        (otherFields.extruderMin ?? spool.extruderMin ?? 0) !== (spool.extruderMin ?? 0) ||
        (otherFields.extruderMax ?? spool.extruderMax ?? 0) !== (spool.extruderMax ?? 0) ||
        (otherFields.bedMin   ?? spool.bedMin   ?? 0) !== (spool.bedMin   ?? 0) ||
        (otherFields.bedMax   ?? spool.bedMax   ?? 0) !== (spool.bedMax   ?? 0) ||
        (otherFields.density           ?? spool.density           ?? 0) !== (spool.density           ?? 0) ||
        (otherFields.diameterTolerance ?? spool.diameterTolerance ?? 0) !== (spool.diameterTolerance ?? 0)

      if (hasChanges) {
        const payload = { ...otherFields, notes: notesAfter || undefined, stockLocation: locationAfter || undefined, price: priceAfter }
        updated = await spoolsApi.update(spool.id, payload)
      }

      // Assign printer if changed and not deactivating (backend clears it on deactivate)
      if (!deactivating && (selectedPrinterId !== spool.printerId || selectedAmsSlot !== spool.amsSlot)) {
        updated = await spoolsApi.assignPrinter(spool.id, {
          printerId: selectedPrinterId,
          amsSlot: selectedAmsSlot,
          displacedStockLocation: displacedStockLocation || undefined,
        })
      }

      onUpdate(updated)
      setEditing(false)
      setConflictSpool(null)
      setDisplacedStockLocation(null)
      window.dispatchEvent(new CustomEvent('spools-updated'))
      navigate(-1)
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (form.isActive && !selectedPrinterId) {
      setPrinterError(true)
      setPrinterShakeKey(k => k + 1)
      return
    }
    if (spool.isActive && !form.isActive && !form.stockLocation?.trim()) {
      setStockLocationError(true)
      setStockLocationShakeKey(k => k + 1)
      return
    }
    if (form.isActive && selectedPrinterId && !displacedStockLocation) {
      const targetPrinter = printers.find(p => p.id === selectedPrinterId)
      if (targetPrinter) {
        const slot = targetPrinter.hasAms ? selectedAmsSlot : null
        if (!targetPrinter.hasAms || slot != null) {
          const occupant = allSpools.find(s => {
            if (s.id === spool.id || s.printerId !== selectedPrinterId) return false
            if (slot == null) return s.amsSlot == null
            return s.amsSlot === slot
          })
          if (occupant) {
            setConflictSpool(occupant)
            return
          }
        }
      }
    }
    await doSave()
  }


  async function handleDelete() {
    setDeleting(true)
    try {
      await spoolsApi.delete(spool.id)
      window.dispatchEvent(new CustomEvent('spools-updated', { detail: { deletedId: spool.id } }))
      onDelete()
    } finally {
      setDeleting(false)
    }
  }


  const hasPrintSettings = spool.extruderMin != null || spool.extruderMax != null || spool.bedMin != null || spool.bedMax != null

  // Pre-compute for both modals
  const selectedPrinterObj = printers.find(p => p.id === selectedPrinterId) ?? null
  const selectedPrinterImg = selectedPrinterObj
    ? getPrinterImage(selectedPrinterObj.brand, selectedPrinterObj.model)
    : '/printers/generic.svg'

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-4">

      {/* ── Single card: header + all sections ─────────────────────────────── */}
      {!editing && (
        <div className={`border divide-y divide-[var(--border-subtle)] ${styles.viewCard}`}>

          {/* Header */}
          <div className={`p-5 ${styles.colorHeader}`}>
            <div className={styles.colorHeaderOverlay} style={{ backgroundColor: spool.colorHex ?? undefined }} />
            <div className={styles.viewHeaderRow}>
              <SpoolIcon color={spool.colorHex} size={56} className={styles.viewHeaderIcon} />
              <div className={styles.viewHeaderInfo}>
                <div className={styles.viewHeaderMeta}>
                  <BrandLogo brand={spool.brand} size={14} />
                  <span className={styles.viewHeaderBrand}>{spool.brand}</span>
                </div>
                <p className={styles.viewHeaderTitle}>{spool.colorName}</p>
                {spool.colorHex && <p className={styles.viewHeaderHex}>{spool.colorHex}</p>}
              </div>
              <div className={styles.viewHeaderBadges}>
                <MaterialTag material={spool.material} />
                {spool.printerId && <span className={styles.viewStatusBadge}>{t('spoolDetail.statusActive')}</span>}
                {spool.isArchived && <span className={styles.viewStatusBadge}>{t('spoolDetail.statusArchived')}</span>}
                {spool.hasNfcTag && (
                  <span className={styles.viewNfcBadge}>
                    <NfcIcon className={styles.viewNfcIcon} />
                    {t('addSpool.nfcTag')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Row 1: Weight (left) | Price + Printer stacked (right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
            <div className="p-5">
              <SectionTitle>{t('spoolDetail.sectionWeight')}</SectionTitle>
              <InfoRow label={t('spoolDetail.labelCurrent')} value={`${Math.round(spool.currentWeightG)} g`} />
              <InfoRow label={t('spoolDetail.labelInitial')} value={`${Math.round(spool.initialWeightG)} g`} />
              <InfoRow label={t('spoolDetail.labelSpoolTare')} value={`${Math.round(spool.spoolWeightG)} g`} />
              <InfoRow label={t('spoolDetail.labelLowStockAt')} value={`${Math.round(spool.lowStockThresholdG)} g`} />
            </div>

            {/* Right col: Price on top, Printer below */}
            <div>
              <div className={`p-5 border-b ${styles.priceBorder}`}>
                <SectionTitle>{t('spoolForm.sectionPrice')}</SectionTitle>
                {spool.price != null
                  ? <p className={`text-sm font-semibold ${styles.priceValue}`}>{formatCurrency(spool.price, currency)}</p>
                  : <p className={`text-sm italic ${styles.secondary}`}>{t('spoolDetail.noPrice')}</p>
                }
              </div>
              <div className="p-5">
              {(() => {
                const printer = printers.find(p => p.id === spool.printerId)
                if (!spool.printerId || !printer) return (
                  <>
                    <SectionTitle>{t('spoolDetail.sectionStockLocation')}</SectionTitle>
                    {spool.stockLocation ? (
                      <div className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.locationIcon}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className={`text-sm font-semibold ${styles.secondary}`}>{spool.stockLocation}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--text-secondary)] italic">{t('spoolDetail.noLocation')}</p>
                    )}
                  </>
                )
                const imgSrc = getPrinterImage(printer.brand, printer.model)
                return (
                  <>
                    <SectionTitle>{t('spoolDetail.sectionPrinter')}</SectionTitle>
                    <Link
                      to={`/printers/${printer.id}`}
                      className={`flex items-center gap-3 -m-2 p-2 rounded-xl no-underline transition-colors ${styles.printerLink}`}
                    >
                      <div className={`flex-shrink-0 w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden ${styles.printerImgWrap}`}>
                        <img
                          src={imgSrc}
                          alt={`${printer.brand} ${printer.model}`}
                          className="w-full h-full object-contain p-1.5"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--text-secondary)]">{printer.brand}</p>
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{printer.name}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{printer.model}</p>
                        {printer.hasAms && (
                          <div className="flex items-center gap-1.5 mt-2">
                            {[1, 2, 3, 4].map(t => {
                              const occupant = printerTrayMap[t]
                              const isCurrent = t === spool.amsSlot
                              return (
                                <div
                                  key={t}
                                  title={occupant ? `${occupant.colorName} — ${occupant.brand} ${occupant.material}` : `Tray ${t} — empty`}
                                  className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                                    occupant
                                      ? isCurrent ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-white dark:ring-offset-[#21262d]' : ''
                                      : 'border-2 border-dashed border-[var(--border)] text-[var(--text-secondary)]'
                                  }`}
                                  style={occupant ? { backgroundColor: occupant.colorHex } : undefined}
                                >
                                  <span className={occupant ? styles.trayText : undefined}>
                                    {t}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </Link>
                  </>
                )
              })()}
              </div> {/* /printer */}
            </div> {/* /right col */}
          </div>

          {/* Row 2: Usage | Material | Print Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
            <div className="p-5">
              <SectionTitle>{t('spoolDetail.sectionUsage')}</SectionTitle>
              <InfoRow label={t('spoolDetail.labelAdded')} value={fmtDate(spool.createdAt)} />
              <InfoRow label={t('spoolDetail.labelLastUsed')} value={fmt(spool.lastScannedAt, t('spools.never'))} />
              {spool.nfcTagUid && <InfoRow label={t('spoolDetail.labelNfcTag')} value={<span className="font-mono">{spool.nfcTagUid}</span>} />}
            </div>

            <div className="p-5">
              <SectionTitle>{t('spoolDetail.sectionMaterial')}</SectionTitle>
              <InfoRow label={t('spoolDetail.labelType')} value={spool.material} />
              {spool.density != null && <InfoRow label={t('spoolDetail.labelDensity')} value={`${spool.density} g/cm³`} />}
              {spool.diameterTolerance != null && <InfoRow label={t('spoolForm.diameterTolerance')} value={`±${spool.diameterTolerance} mm`} />}
            </div>

            <div className="p-5">
              <SectionTitle>{t('spoolDetail.sectionPrintSettings')}</SectionTitle>
              {hasPrintSettings ? (
                <div className="space-y-2">
                  {(spool.extruderMin != null || spool.extruderMax != null) && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-0.5">{t('spoolForm.extruderRange')}</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {spool.extruderMin ?? '?'}–{spool.extruderMax ?? '?'} °C
                      </p>
                    </div>
                  )}
                  {(spool.bedMin != null || spool.bedMax != null) && (
                    <div>
                      <p className="text-xs text-[var(--text-secondary)] mb-0.5">{t('spoolForm.bedRange')}</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {spool.bedMin ?? '?'}–{spool.bedMax ?? '?'} °C
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">{t('common.notSet')}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="p-5">
            <SectionTitle>{t('spoolDetail.sectionNotes')}</SectionTitle>
            {spool.notes
              ? <p className={`text-sm ${styles.secondary}`}>{spool.notes}</p>
              : <p className={`text-sm italic ${styles.secondary}`}>{t('spoolDetail.noNotes')}</p>
            }
          </div>

          {/* Print History accordion */}
          <div>
            <button
              onClick={() => setHistoryOpen(o => !o)}
              className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${styles.historyBtn}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">{t('spoolDetail.sectionPrintHistory')}</span>
                <span className="text-xs text-[var(--text-secondary)] font-mono">{t('spoolDetail.jobs', { count: jobs.length })}</span>
              </div>
              <ChevronIcon open={historyOpen} />
            </button>
            {historyOpen && (
              <div className={`border-t ${styles.historyContent}`}>
                <PrintHistoryList jobs={jobs} />
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── EDIT MODE — SpoolEditor ─────────────────────────────────────────── */}
      {editing && (
        <SpoolEditor
          brand={spool.brand}
          material={spool.material}
          colorName={spool.colorName}
          colorHex={spool.colorHex}
          tagUid={spool.nfcTagUid ?? undefined}
          extruderMin={form.extruderMin ?? spool.extruderMin}
          extruderMax={form.extruderMax ?? spool.extruderMax}
          bedMin={form.bedMin ?? spool.bedMin}
          bedMax={form.bedMax ?? spool.bedMax}
          density={form.density ?? spool.density}
          diameterTolerance={form.diameterTolerance ?? spool.diameterTolerance}
          currentWeightG={String(form.currentWeightG ?? spool.currentWeightG)}
          setCurrentWeightG={v => setForm(f => ({ ...f, currentWeightG: parseFloat(v) || 0 }))}
          initialWeightG={String(form.initialWeightG ?? spool.initialWeightG)}
          setInitialWeightG={v => setForm(f => ({ ...f, initialWeightG: parseFloat(v) || 0 }))}
          spoolWeightG={String(form.spoolWeightG ?? spool.spoolWeightG)}
          setSpoolWeightG={v => setForm(f => ({ ...f, spoolWeightG: parseFloat(v) || 0 }))}
          lowStockThresholdG={String(form.lowStockThresholdG ?? spool.lowStockThresholdG)}
          setLowStockThresholdG={v => setForm(f => ({ ...f, lowStockThresholdG: parseFloat(v) || 0 }))}
          weightError=""
          setWeightError={() => {}}
          notes={form.notes ?? ''}
          setNotes={v => setForm(f => ({ ...f, notes: v }))}
          stockLocation={form.stockLocation ?? ''}
          setStockLocation={v => setForm(f => ({ ...f, stockLocation: v }))}
          stockLocationOptions={locations}
          price={String(form.price ?? '')}
          setPrice={v => setForm(f => ({ ...f, price: v ? parseFloat(v) : undefined }))}
          currency={currency}
          isActive={form.isActive ?? spool.isActive}
          setIsActive={v => {
            if (!v && spool.isActive && (form.isActive ?? spool.isActive)) {
              setDeactivateConfirm(true)
              return
            }
            setForm(f => ({ ...f, isActive: v }))
          }}
          printers={printers}
          printerId={selectedPrinterId}
          setPrinterId={v => {
            setSelectedPrinterId(v)
            if (v) setPrinterError(false)
            if (!v) setSelectedAmsSlot(null)
            setConflictSpool(null)
          }}
          amsSlot={selectedAmsSlot}
          onAmsSlotChange={slot => { setSelectedAmsSlot(slot); if (!slot) setConflictSpool(null) }}
          occupiedSlots={trayOccupants}
          currentSpoolColor={spool.colorHex}
          printerError={printerError}
          printerShakeKey={printerShakeKey}
          onPrinterShakeEnd={() => setPrinterError(false)}
          onBusyTrayClick={handleBusyTrayClick}
          stockLocationError={stockLocationError}
          stockLocationShakeKey={stockLocationShakeKey}
          onStockLocationShakeEnd={() => setStockLocationError(false)}
          submitting={saving}
          submitError={null}
          onSubmit={e => { e.preventDefault(); handleSave() }}
          onCancel={cancelEdit}
          onExtruderMinChange={v => setForm(f => ({ ...f, extruderMin: parseInt(v) || undefined }))}
          onExtruderMaxChange={v => setForm(f => ({ ...f, extruderMax: parseInt(v) || undefined }))}
          onBedMinChange={v => setForm(f => ({ ...f, bedMin: parseInt(v) || undefined }))}
          onBedMaxChange={v => setForm(f => ({ ...f, bedMax: parseInt(v) || undefined }))}
          onDensityChange={v => setForm(f => ({ ...f, density: parseFloat(v) || undefined }))}
          onDiameterToleranceChange={v => setForm(f => ({ ...f, diameterTolerance: parseFloat(v) || undefined }))}
        />
      )}

      {/* ── Bottom action bar ───────────────────────────────────────────────── */}
      {!editing && !confirmDelete && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={startEdit}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-sm font-semibold text-white transition-colors"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors"
          >
            {t('common.delete')}
          </button>
        </div>
      )}
      {confirmDelete && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setConfirmDelete(false)} className="w-full py-3 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white disabled:opacity-50 transition-colors">
            {deleting ? t('common.deleting') : t('spoolDetail.confirmDelete')}
          </button>
        </div>
      )}

    </div>

    {/* ── AMS conflict modal ── */}
    {conflictSpool && (
      <AmsConflictModal
        printerImgSrc={selectedPrinterImg}
        printerBrand={selectedPrinterObj?.brand}
        printerModel={selectedPrinterObj?.model}
        traySlot={conflictSpool.amsSlot ?? undefined}
        occupantSpool={conflictSpool}
        onCancel={() => {
          if (conflictSpool.amsSlot == null) setSelectedPrinterId(null)
          setConflictSpool(null)
        }}
        onConfirm={(loc) => {
          setDisplacedStockLocation(loc)
          if (conflictSpool.amsSlot != null) setSelectedAmsSlot(conflictSpool.amsSlot)
          setConflictSpool(null)
        }}
      />
    )}

    {/* ── Deactivate + unassign confirmation modal ── */}
    {deactivateConfirm && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeactivateConfirm(false)}>
        <div className={`rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden ${styles.modal}`} onClick={e => e.stopPropagation()}>
          <div className={`flex items-center justify-center p-6 border-b ${styles.modalHeader}`}>
            <img src={selectedPrinterImg} alt="" className="w-32 h-32 object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }} />
          </div>
          <div className="p-5">
            {selectedPrinterObj && (
              <p className="text-xs text-[var(--text-secondary)] mb-0.5">{selectedPrinterObj.brand} · {selectedPrinterObj.model}</p>
            )}
            <p className="text-base font-semibold text-[var(--text-primary)] mb-1">{t('spoolDetail.deactivateTitle')}</p>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {selectedAmsSlot != null
                ? t('spoolDetail.deactivateBodyWithTray', { slot: selectedAmsSlot })
                : t('spoolDetail.deactivateBody')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeactivateConfirm(false)} className="py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">{t('common.cancel')}</button>
              <button
                onClick={() => { setDeactivateConfirm(false); setForm(f => ({ ...f, isActive: false })) }}
                className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors"
              >
                {saving ? t('common.saving') : t('spoolDetail.deactivate')}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  )
}
