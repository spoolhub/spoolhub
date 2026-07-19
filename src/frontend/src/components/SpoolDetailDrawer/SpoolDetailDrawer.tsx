import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import PlusIcon from '@/components/icons/PlusIcon'
import InfoCircleIcon from '@/components/icons/InfoCircleIcon'
import { getPrinterImage } from '@/utils/printerImages'
import {
  selectTrayHintLabel,
  spoolMismatchesTrayReport,
  trayContextForSlot,
} from '@/utils/selectSpoolFilter'
import { isTrayEmptyMqtt } from '@/utils/printerAms'
import { getSlotOccupant } from '@/utils/slotOccupant'
import { spoolsApi } from '@/api/spools'
import { printJobsApi } from '@/api/printJobs'
import { locationsApi } from '@/api/locations'
import { settingsApi } from '@/api/settings'
import { getCurrencySymbol, formatCurrency } from '@/utils/currency'
import type { SpoolResponse, UpdateSpoolRequest } from '@/types/spool'
import type { PrinterResponse, TraySpoolSummary } from '@/types/printer'
import type { PrintJobResponse } from '@/types/printJob'

type EditForm = Partial<SpoolResponse> & { isLoadedInPrinter?: boolean }
import styles from './SpoolDetailDrawer.module.css'

const MATNAME: Record<string, string> = {
  PLA: 'Polylactic Acid', ABS: 'Acrylonitrile Butadiene Styrene', PETG: 'Polyethylene Terephthalate Glycol',
  TPU: 'Thermoplastic Polyurethane', Nylon: 'Nylon', PC: 'Polycarbonate', ASA: 'Acrylonitrile Styrene Acrylate',
  HIPS: 'High Impact Polystyrene', PVA: 'Polyvinyl Alcohol', PP: 'Polypropylene', PEI: 'Polyetherimide',
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr); const now = new Date()
  const diffH = Math.floor((now.getTime() - date.getTime()) / 3600000)
  const diffD = Math.floor(diffH / 24)
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (diffH < 24) return `${diffH} hrs ago`
  if (diffD === 1) return `Yesterday ${time}`
  if (diffD < 7) return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`
  return date.toLocaleDateString('en-GB')
}

interface Props {
  spool: SpoolResponse
  printers: PrinterResponse[]
  onClose: () => void
  onUpdated?: (s: SpoolResponse) => void
  onDeleted?: (id: string, wasActive: boolean) => void
}

export default function SpoolDetailDrawer({ spool, printers, onClose, onUpdated, onDeleted }: Props) {
  const { t } = useTranslation()
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({})
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [customLocations, setCustomLocations] = useState<string[]>([])
  const [dbLocations, setDbLocations] = useState<string[]>([])
  const [pendingDelete, setPendingDelete] = useState(false)
  const [printJobs, setPrintJobs] = useState<PrintJobResponse[]>([])
  const [showMismatchConfirm, setShowMismatchConfirm] = useState(false)
  const [displacedStockLocation, setDisplacedStockLocation] = useState('')
  const [displacedLocationError, setDisplacedLocationError] = useState(false)
  const [displacedLocationShakeKey, setDisplacedLocationShakeKey] = useState(0)
  const [showAddDisplacedLocation, setShowAddDisplacedLocation] = useState(false)
  const [newDisplacedLocation, setNewDisplacedLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [currency, setCurrency] = useState('USD')

  const editPrinter = useMemo(
    () => printers.find(p => p.id === editForm.printerId),
    [printers, editForm.printerId],
  )

  const trayMismatch = useMemo(() => {
    if (!editMode || !editForm.isLoadedInPrinter || !editPrinter) return null
    const slot = editPrinter.hasAms ? (editForm.amsSlot ?? null) : null
    if (editPrinter.hasAms && slot == null) return null
    const { trayHint, traySpool } = trayContextForSlot(editPrinter, slot)
    if (!spoolMismatchesTrayReport(spool, trayHint)) return null
    return {
      reportedLabel: selectTrayHintLabel(trayHint!, editPrinter.brand, [spool], traySpool),
    }
  }, [editMode, editForm.isLoadedInPrinter, editForm.amsSlot, editPrinter, spool])

  const isAssigningToEmptySlot = useMemo(() => {
    if (!editMode || !editForm.isLoadedInPrinter || !editPrinter?.hasAms || editForm.amsSlot == null) return false
    const occupied = editForm.amsSlot === 1 ? editPrinter.tray1Occupied
      : editForm.amsSlot === 2 ? editPrinter.tray2Occupied
      : editForm.amsSlot === 3 ? editPrinter.tray3Occupied
      : editPrinter.tray4Occupied
    const assignee = editForm.amsSlot === 1 ? editPrinter.tray1Spool
      : editForm.amsSlot === 2 ? editPrinter.tray2Spool
      : editForm.amsSlot === 3 ? editPrinter.tray3Spool
      : editPrinter.tray4Spool
    return isTrayEmptyMqtt(occupied) && !assignee
  }, [editMode, editForm.isLoadedInPrinter, editForm.amsSlot, editPrinter])

  const displacedOccupant = useMemo(() => {
    if (!editMode || !editForm.isLoadedInPrinter || !editPrinter) return null
    const slot = editPrinter.hasAms ? (editForm.amsSlot ?? null) : null
    if (editPrinter.hasAms && slot == null) return null
    return getSlotOccupant(editPrinter, slot, spool.id)
  }, [editMode, editForm.isLoadedInPrinter, editForm.amsSlot, editPrinter, spool.id])

  useEffect(() => {
    setShowMismatchConfirm(false)
    setDisplacedStockLocation('')
    setDisplacedLocationError(false)
    setShowAddDisplacedLocation(false)
    setNewDisplacedLocation('')
  }, [editForm.isLoadedInPrinter, editForm.printerId, editForm.amsSlot])

  useEffect(() => {
    locationsApi.getAll()
      .then(data => setDbLocations(data.map(l => l.name).sort((a, b) => a.localeCompare(b))))
      .catch(() => {})
    settingsApi.getApp()
      .then(s => { if (s.currency) setCurrency(s.currency) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    printJobsApi.getBySpool(spool.id)
      .then(jobs => {
        if (!cancelled) {
          setPrintJobs(
            jobs
              .filter(j => j.status === 'finished' && j.gramsUsed > 0)
              .sort((a, b) => new Date(b.finishedAt ?? b.startedAt).getTime() - new Date(a.finishedAt ?? a.startedAt).getTime())
              .slice(0, 5)
          )
        }
      })
      .catch(() => { if (!cancelled) setPrintJobs([]) })
    return () => { cancelled = true }
  }, [spool.id])

  const startEdit = (s: SpoolResponse) => {
    setEditForm({ ...s, isLoadedInPrinter: !!s.printerId, printerId: s.printerId ?? null, amsSlot: s.amsSlot ?? null })
    if (s.stockLocation && !dbLocations.includes(s.stockLocation)) {
      setCustomLocations(prev => prev.includes(s.stockLocation!) ? prev : [...prev, s.stockLocation!])
    }
    setShowMismatchConfirm(false)
    setDisplacedStockLocation('')
    setDisplacedLocationError(false)
    setShowAddDisplacedLocation(false)
    setNewDisplacedLocation('')
    setEditMode(true)
  }

  const executeSave = async () => {
    const s = spool
    if (!editForm) return
    setSaving(true)
    try {
      const body: UpdateSpoolRequest = {}
      if (editForm.currentWeightG != null) body.currentWeightG = Number(editForm.currentWeightG)
      if (editForm.initialWeightG != null) body.initialWeightG = Number(editForm.initialWeightG)
      if (editForm.spoolWeightG != null) body.spoolWeightG = Number(editForm.spoolWeightG)
      if (editForm.lowStockThresholdG != null) body.lowStockThresholdG = Number(editForm.lowStockThresholdG)
      if (editForm.price != null) body.price = Number(editForm.price)
      if (editForm.density != null) body.density = Number(editForm.density)
      if (!editForm.isLoadedInPrinter) body.stockLocation = editForm.stockLocation ?? ''
      await spoolsApi.update(s.id, body)
      // Non-AMS printers hold the spool as extraSpool (no slot); only AMS printers take a tray slot
      const targetPrinter = printers.find(p => p.id === editForm.printerId)
      const updated = editForm.isLoadedInPrinter
        ? await spoolsApi.assignPrinter(s.id, {
            printerId: editForm.printerId ?? null,
            amsSlot: targetPrinter?.hasAms ? (editForm.amsSlot ?? 1) : null,
            displacedStockLocation: displacedStockLocation.trim() || undefined,
          })
        : await spoolsApi.assignPrinter(s.id, { printerId: null, amsSlot: null })
      onUpdated?.(updated)
      setShowMismatchConfirm(false)
      setDisplacedStockLocation('')
      setDisplacedLocationError(false)
      setEditForm({})
      setEditMode(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleSave = async () => {
    if (displacedOccupant && !displacedStockLocation.trim()) {
      setDisplacedLocationError(true)
      setDisplacedLocationShakeKey(k => k + 1)
      return
    }
    if (trayMismatch && !showMismatchConfirm) {
      setShowMismatchConfirm(true)
      return
    }
    await executeSave()
  }

  const cancelEdit = () => {
    setShowMismatchConfirm(false)
    setDisplacedStockLocation('')
    setDisplacedLocationError(false)
    setShowAddDisplacedLocation(false)
    setNewDisplacedLocation('')
    setEditMode(false)
  }

  const handleDelete = async () => {
    const s = spool
    try {
      await spoolsApi.delete(s.id)
      onDeleted?.(s.id, s.isActive)
      onClose()
    } catch { /* ignore */ }
  }

  return (
    <>
      <div className={`${styles.scrim} ${styles.scrimOn}`} onClick={() => { onClose(); setEditMode(false); setPendingDelete(false) }} />
      <aside className={`${styles.drawer} ${styles.drawerOn}`}>
        {editMode ? renderEdit() : renderDetail()}
      </aside>
    </>
  )

  function renderOccupantAlert(alertMessage: string) {
    if (!displacedOccupant) return null
    return (
      <div className={styles.occupantAlert} role="alert">
        <div className={styles.occupantAlertHead}>
          <InfoCircleIcon className={styles.slotNoteIcon} />
          <span>{alertMessage}</span>
        </div>
        <div className={styles.occupantPreview}>
          <SpoolIcon color={displacedOccupant.colorHex} size={36} />
          <div>
            <p className={styles.occupantLabel}>{t('spoolForm.currentlyLoaded')}</p>
            <p className={styles.occupantName}>{displacedOccupant.colorName}</p>
            <p className={styles.occupantMeta}>{displacedOccupant.brand} · {displacedOccupant.material}</p>
          </div>
        </div>
        <div
          key={displacedLocationShakeKey}
          className={`${styles.ff}${displacedLocationError ? ` ${styles.locationFieldError} ${styles.shake}` : ''}`}
          style={{ margin: 0 }}
          onAnimationEnd={() => setDisplacedLocationError(false)}
        >
          <label>{t('amsConflict.storeWhere')}</label>
          <select
            className={displacedLocationError ? styles.locationErrorSelect : undefined}
            value={showAddDisplacedLocation ? '__add_new' : displacedStockLocation}
            onChange={e => {
              if (e.target.value === '__add_new') {
                setShowAddDisplacedLocation(true)
                setDisplacedLocationError(false)
              } else {
                setShowAddDisplacedLocation(false)
                setDisplacedStockLocation(e.target.value)
                setDisplacedLocationError(false)
              }
            }}
          >
            <option value="">{t('amsConflict.selectLocation')}</option>
            {dbLocations.map(l => <option key={l} value={l}>{l}</option>)}
            {customLocations.filter(l => !dbLocations.includes(l)).map(l => <option key={l} value={l}>{l}</option>)}
            <option value="__add_new">{t('amsConflict.addNewLocation')}</option>
          </select>
          {showAddDisplacedLocation && (
            <div className={styles.addWrap}>
              <input
                type="text"
                placeholder={t('amsConflict.enterNewLocation')}
                value={newDisplacedLocation}
                onChange={e => setNewDisplacedLocation(e.target.value)}
                autoFocus
              />
              <button type="button" className={styles.btnCancel} onClick={() => { setShowAddDisplacedLocation(false); setNewDisplacedLocation('') }}>x</button>
            </div>
          )}
          {showAddDisplacedLocation && (
            <button
              type="button"
              className={styles.btnAdd}
              disabled={!newDisplacedLocation.trim()}
              onClick={() => {
                const loc = newDisplacedLocation.trim()
                if (!loc) return
                if (!customLocations.includes(loc) && !dbLocations.includes(loc)) {
                  setCustomLocations(prev => [...prev, loc])
                }
                setDisplacedStockLocation(loc)
                setDisplacedLocationError(false)
                setShowAddDisplacedLocation(false)
                setNewDisplacedLocation('')
              }}
            >
              Add &quot;{newDisplacedLocation.trim()}&quot;
            </button>
          )}
          {displacedLocationError && (
            <p className={styles.occupantHint}>{t('amsConflict.locationRequired')}</p>
          )}
        </div>
      </div>
    )
  }

  function renderDetail() {
    const s = spool
    const pct = s.initialWeightG > 0 ? Math.round((s.currentWeightG / s.initialWeightG) * 100) : 0
    const low = s.currentWeightG <= 120
    const nozzle = s.extruderMin != null && s.extruderMax != null ? `${s.extruderMin}–${s.extruderMax}°C` : '—'
    const bed = s.bedMin != null && s.bedMax != null ? `${s.bedMin}–${s.bedMax}°C` : '—'
    return (
      <>
        <div className={styles.dwSticky}>
          <div className={styles.dwtop}>
            <h2>Spool details</h2>
            <button className={styles.dwclose} onClick={() => { onClose(); setEditMode(false) }} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>
          <div className={styles.dwhero}>
            <div className={styles.dwdisc}><SpoolIcon color={s.colorHex} size={96} /></div>
            <div className={styles.dwid}>
              <div className={styles.dwtext}>
                <div className={styles.c}>{s.colorName}</div>
                <div className={styles.b}>{s.brand}</div>
              </div>
              <div className={styles.tags}>
                <span className={styles.tag}>{s.material}</span>
              </div>
            </div>
          </div>
          <div className={styles.dwbar}>
            <div className={styles.meta}>
              <span className={styles.g}>{s.currentWeightG} g <small>/ {s.initialWeightG} g</small></span>
              <span className={styles.pct}>{pct}%</span>
            </div>
            <div className={styles.track}><i className={low ? styles.low : ''} style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        <div className={styles.dwgrid}>
          <div className={styles.dwstat}><div className={styles.k}>Est. length left</div><div className={styles.v}>{Math.round(s.currentWeightG / 2.98)} m</div></div>
          <div className={styles.dwstat}><div className={styles.k}>Spool value</div><div className={styles.v}>{s.price != null ? formatCurrency(s.price, currency) : '—'}</div></div>
          <div className={styles.dwstat}><div className={styles.k}>Low stock</div><div className={styles.v}>{s.lowStockThresholdG} g</div></div>
          <div className={styles.dwstat}><div className={styles.k}>Spool weight</div><div className={styles.v}>{s.spoolWeightG ?? 200} g</div></div>
        </div>
        <div className={styles.dwsec}>
          <h3>Specifications</h3>
          <div className={styles.dwline}><span className={styles.lk}>Material</span><span className={styles.lv}>{s.material} <span style={{ color: 'var(--faint)', fontWeight: 400 }}>· {MATNAME[s.material] || ''}</span></span></div>
          <div className={styles.dwline}><span className={styles.lk}>Color</span><span className={styles.lv}><span className={styles.chipdot}><i style={{ background: s.colorHex }} />{s.colorName}</span></span></div>
          <div className={styles.dwline}><span className={styles.lk}>Diameter</span><span className={styles.lv}>{s.diameterTolerance ?? '1.75'} mm</span></div>
          <div className={styles.dwline}><span className={styles.lk}>Nozzle temp</span><span className={styles.lv}>{nozzle}</span></div>
          <div className={styles.dwline}><span className={styles.lk}>Bed temp</span><span className={styles.lv}>{bed}</span></div>
        </div>
        <div className={styles.dwsec}>
          <h3>{s.printerName ? 'Loaded in' : 'Location'}</h3>
          {s.printerName ? (() => {
            const printer = printers.find(p => p.name === s.printerName || p.id === s.printerId)
            const traySlotMap: Record<number, TraySpoolSummary | null> = { 1: printer?.tray1Spool ?? null, 2: printer?.tray2Spool ?? null, 3: printer?.tray3Spool ?? null, 4: printer?.tray4Spool ?? null }
            return (
              <div className={styles.amsLayout}>
                <div className={styles.pcardThumb}>
                  <div className={styles.pcardPic}>
                    <img
                      src={getPrinterImage(printer?.brand ?? '', printer?.model ?? '')}
                      alt={s.printerName}
                      className={styles.pcardImg}
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
                    />
                  </div>
                </div>
                <div className={styles.amsRight}>
                  {printer?.hasAms ? (
                    <div className={styles.slotPick}>
                      {[1, 2, 3, 4].map(slot => {
                        const occupant = traySlotMap[slot]
                        const isThisSpool = s.amsSlot === slot
                        const colorHex = isThisSpool ? s.colorHex : occupant?.colorHex
                        const name = isThisSpool ? s.colorName : occupant?.colorName ?? 'Empty'
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
                      <span className={styles.singleSlotIc}><SpoolIcon color={s.colorHex} size={28} /></span>
                      <div>
                        <p className={styles.singleSlotTitle}>{s.printerName}</p>
                        <p className={styles.singleSlotDesc}>Direct spool — no AMS</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })() : (
            <div className={styles.dwline}><span className={styles.lk}>Stored at</span><span className={styles.lv}>{s.stockLocation ?? 'Unassigned'}</span></div>
          )}
        </div>
        <div className={styles.dwsec}>
          <h3>Inventory</h3>
          <div className={styles.dwline}><span className={styles.lk}>Last scanned</span><span className={styles.lv}>{formatRelativeTime(s.lastScannedAt)}</span></div>
          <div className={styles.dwline}><span className={styles.lk}>Tag ID</span><span className={styles.lv}>{s.nfcTagUid ?? '—'}</span></div>
        </div>
        <div className={styles.dwsec}>
          <h3>{t('home.recentActivity')}</h3>
          <div className={styles.dwts}>
            {s.printerName && (
              <div className={styles.ev}>
                <div className={styles.dot} />
                <div className={styles.et}>
                  <div className={styles.a}>
                    {t('spoolDetail.loadedOn', { printer: s.printerName })}
                    {s.amsSlot ? ` · ${t('spoolDetail.slot', { slot: s.amsSlot })}` : ''}
                  </div>
                  <div className={styles.b}>{formatRelativeTime(s.lastScannedAt)}</div>
                </div>
              </div>
            )}
            {printJobs.map(job => (
              <div key={job.id} className={styles.ev}>
                <div className={styles.dot} />
                <div className={styles.et}>
                  <div className={styles.a}>
                    {t('spoolDetail.usedOnPrinter', {
                      grams: Math.round(job.gramsUsed),
                      printer: job.printerName ?? t('spoolDetail.unknownPrinter'),
                    })}
                  </div>
                  <div className={styles.b}>{formatRelativeTime(job.finishedAt ?? job.startedAt)}</div>
                </div>
              </div>
            ))}
            <div className={styles.ev}>
              <div className={styles.dot} />
              <div className={styles.et}>
                <div className={styles.a}>{t('spoolDetail.addedToInventory')}</div>
                <div className={styles.b}>{new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.dwact}>
          {pendingDelete ? (
            <>
              <button className={`${styles.btn} ${styles.danger}`} onClick={handleDelete} id="dwconfirm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Confirm
              </button>
              <button className={styles.btn} onClick={() => setPendingDelete(false)} id="dwcancel">Cancel</button>
            </>
          ) : (
            <>
              <button className={styles.btn} onClick={() => startEdit(spool)} id="dwedit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>Edit
              </button>
              <button className={`${styles.btn} ${styles.danger}`} onClick={() => setPendingDelete(true)} id="dwdelete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 4v6m4-6v6M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z"/></svg>Delete
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  function renderEdit() {
    const f = editForm
    const pct = f.initialWeightG && f.currentWeightG != null ? Math.round((f.currentWeightG / f.initialWeightG) * 100) : 0
    const low = (f.currentWeightG ?? 0) <= 120
    return (
      <>
        <div className={styles.dwtop}>
          <button className={styles.dwclose} onClick={() => setEditMode(false)} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2>Edit spool</h2>
          <button className={styles.dwclose} onClick={() => { onClose(); setEditMode(false) }} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div className={styles.dwhero}>
          <div className={styles.dwdisc}><SpoolIcon color={f.colorHex ?? '#888'} size={80} /></div>
          <div className={styles.dwid}>
            <div className={styles.dwtext}>
              <div className={styles.c}>{f.colorName}</div>
              <div className={styles.b}>{f.brand}</div>
            </div>
            <div className={styles.tags}>
              <span className={styles.tag}>{f.material}</span>
            </div>
          </div>
        </div>
        <div className={styles.dwform}>
          <div className={styles.fsec}>Remaining weight</div>
          <div className={styles.dwbar} style={{ padding: '0 0 4px' }}>
            <div className={styles.meta}>
              <span className={styles.g}>{f.currentWeightG ?? 0} g <small>/ {f.initialWeightG ?? 0} g</small></span>
              <span className={styles.pct}>{pct}%</span>
            </div>
            <div className={styles.track}><i className={low ? styles.low : ''} style={{ width: `${pct}%` }} /></div>
          </div>
          <div className={styles.ff2}>
            <div className={styles.ff}><label>Current (g)</label><input type="number" value={f.currentWeightG ?? 0} onChange={e => setEditForm(p => ({ ...p, currentWeightG: +e.target.value }))} /></div>
            <div className={styles.ff}><label>Spool total (g)</label><input type="number" value={f.initialWeightG ?? 0} onChange={e => setEditForm(p => ({ ...p, initialWeightG: +e.target.value }))} /></div>
          </div>
          <div className={styles.ff2}>
            <div className={styles.ff}><label>Spool weight (g)</label><input type="number" value={f.spoolWeightG ?? 0} onChange={e => setEditForm(p => ({ ...p, spoolWeightG: +e.target.value }))} /></div>
            <div className={styles.ff}><label>Low stock (g)</label><input type="number" value={f.lowStockThresholdG ?? 0} onChange={e => setEditForm(p => ({ ...p, lowStockThresholdG: +e.target.value }))} /></div>
          </div>
          <div className={styles.ff2}>
            <div className={styles.ff}><label>Spool value ({getCurrencySymbol(currency)})</label><input type="number" step="0.01" value={f.price ?? ''} onChange={e => setEditForm(p => ({ ...p, price: e.target.value === '' ? null : +e.target.value }))} /></div>
            <div className={styles.ff}><label>Density (g/cm³)</label><input type="number" step="0.01" value={f.density ?? 1.24} onChange={e => setEditForm(p => ({ ...p, density: +e.target.value }))} /></div>
          </div>
          <div className={styles.placementSection}>
            <div className={styles.fsec}>Placement</div>
            <div className={styles.placementToggle}>
              <button className={!f.isLoadedInPrinter ? styles.placementBtn + ' ' + styles.placementBtnOn : styles.placementBtn} onClick={() => setEditForm(p => ({ ...p, isLoadedInPrinter: false, printerId: null, amsSlot: null }))}>In stock</button>
              <button className={f.isLoadedInPrinter ? styles.placementBtn + ' ' + styles.placementBtnOn : styles.placementBtn} onClick={() => setEditForm(p => ({ ...p, isLoadedInPrinter: true, amsSlot: null }))}>Loaded in printer</button>
            </div>
            {f.isLoadedInPrinter && (<>
              <div className={styles.ff}><label>Printer</label>
                <select value={f.printerId ?? ''} onChange={e => setEditForm(p => ({ ...p, printerId: e.target.value || null }))}>
                  <option value="">Select printer</option>
                  {printers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.model})</option>)}
                </select>
              </div>
              {f.printerId && (() => {
                const printer = printers.find(p => p.id === f.printerId)
                if (!printer) return null
                const traySlotMap: Record<number, TraySpoolSummary | null> = { 1: printer.tray1Spool, 2: printer.tray2Spool, 3: printer.tray3Spool, 4: printer.tray4Spool }
                return (
                  <div className={styles.amsLayout}>
                    <div className={styles.pcardThumb}><div className={styles.pcardPic}><img src={getPrinterImage(printer.brand, printer.model)} alt={`${printer.brand} ${printer.model}`} className={styles.pcardImg} onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }} /></div></div>
                    <div className={styles.amsRight}>
                      {printer.hasAms ? (<>
                        <p className={styles.slotLabel}>{t('spoolForm.chooseAmsSlot')}</p>
                        <div className={styles.slotPick}>
                          {[1, 2, 3, 4].map(slot => {
                            const rawOccupant = traySlotMap[slot]
                            // Moving this spool to another slot → show its current slot as vacated/empty
                            const isVacating = !!rawOccupant && rawOccupant.id === spool.id
                              && f.amsSlot != null && f.amsSlot !== slot
                            const occupant = isVacating ? null : rawOccupant
                            const isSel = f.amsSlot === slot
                            const isOtherOccupant = !!occupant && occupant.id !== spool.id
                            const mqttOccupied = slot === 1 ? printer.tray1Occupied
                              : slot === 2 ? printer.tray2Occupied
                              : slot === 3 ? printer.tray3Occupied
                              : printer.tray4Occupied
                            const isEmptyReported = !isSel && !occupant && isTrayEmptyMqtt(mqttOccupied)
                            // Selected slot always shows this spool; other occupant is in the alert below
                            const colorHex = isSel ? spool.colorHex : occupant?.colorHex
                            const name = isSel
                              ? spool.colorName
                              : (occupant?.colorName ?? t('spoolForm.slotEmpty'))
                            return (
                              <button
                                key={slot}
                                type="button"
                                title={isOtherOccupant ? `${occupant!.colorName} — ${occupant!.brand} ${occupant!.material}` : undefined}
                                className={`${styles.slotTile}${isSel && !isAssigningToEmptySlot ? ' ' + styles.slotTileSel : ''}${!occupant && !isSel ? ' ' + styles.slotTileEmpty : ''}${isOtherOccupant && !isSel ? ' ' + styles.slotTileBusy : ''}${isEmptyReported ? ' ' + styles.slotTileEmptyReport : ''}${isSel && trayMismatch ? ' ' + styles.slotTileMismatch : ''}${isSel && isAssigningToEmptySlot ? ' ' + styles.slotTileReserve : ''}`}
                                onClick={() => setEditForm(p => ({ ...p, amsSlot: isSel ? null : slot }))}
                              >
                                {isSel && <span className={styles.slotHere}>{t('spoolForm.goesHere')}</span>}
                                <span className={styles.slotNum}>{slot}</span>
                                <span className={styles.slotIc}>{colorHex ? <SpoolIcon color={colorHex} size={22} /> : <PlusIcon className={styles.slotPlus} />}</span>
                                <span className={styles.slotCn}>{name}</span>
                              </button>
                            )
                          })}
                        </div>
                        {renderOccupantAlert(t('spoolForm.slotOccupiedAlert'))}
                        {f.amsSlot != null && traySlotMap[f.amsSlot]?.id === spool.id && (
                          <div className={styles.slotNote}>
                            <InfoCircleIcon className={styles.slotNoteIcon} />
                            Already assigned to this slot
                          </div>
                        )}
                        {isAssigningToEmptySlot && (
                          <div className={styles.slotNote}>
                            <InfoCircleIcon className={styles.slotNoteIcon} />
                            {t('scan.assignToEmptySlotHint')}
                          </div>
                        )}
                        {trayMismatch && (
                          <div className={`${styles.slotNote} ${styles.slotNoteWarn}`}>
                            <InfoCircleIcon className={styles.slotNoteIcon} />
                            {t('scan.trayReportMismatch', { filament: trayMismatch.reportedLabel })}
                          </div>
                        )}
                      </>) : (
                        <>
                          {!displacedOccupant && (
                            <div className={styles.singleSlot}>
                              <span className={styles.singleSlotIc}>
                                <SpoolIcon color={spool.colorHex ?? '#888'} size={28} />
                              </span>
                              <div>
                                <p className={styles.singleSlotTitle}>{t('spoolForm.directSpool')}</p>
                                <p className={styles.singleSlotDesc}>{t('spoolForm.noAmsSlots')}</p>
                              </div>
                            </div>
                          )}
                          {renderOccupantAlert(t('spoolForm.printerOccupiedAlert'))}
                        </>
                      )}
                      {trayMismatch && !printer.hasAms && (
                        <div className={`${styles.slotNote} ${styles.slotNoteWarn}`}>
                          <InfoCircleIcon className={styles.slotNoteIcon} />
                          {t('scan.trayReportMismatch', { filament: trayMismatch.reportedLabel })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </>)}
            {!f.isLoadedInPrinter && (
              <div className={styles.ff}><label>Storage location</label>
                <select value={f.stockLocation ?? ''} onChange={e => { if (e.target.value === '__add_new') setShowAddLocation(true); else setEditForm(p => ({ ...p, stockLocation: e.target.value || null })) }}>
                  <option value="">Select location</option>
                  {dbLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  {customLocations.filter(l => !dbLocations.includes(l)).map(l => <option key={l} value={l}>{l}</option>)}
                  <option value="__add_new">+ Add new location</option>
                </select>
                {showAddLocation && (<div className={styles.addWrap}><input type="text" placeholder="Enter new location..." value={newLocation} onChange={e => setNewLocation(e.target.value)} autoFocus /><button type="button" className={styles.btnCancel} onClick={() => { setShowAddLocation(false); setNewLocation('') }}>x</button></div>)}
                {showAddLocation && (<button type="button" className={styles.btnAdd} disabled={!newLocation.trim()} onClick={() => { if (newLocation.trim()) { if (!customLocations.includes(newLocation.trim())) setCustomLocations(prev => [...prev, newLocation.trim()]); setEditForm(p => ({ ...p, stockLocation: newLocation.trim() })); setShowAddLocation(false); setNewLocation('') } }}>Add &quot;{newLocation.trim()}&quot;</button>)}
              </div>
            )}
          </div>
        </div>
        <div className={styles.dwact}>
          {showMismatchConfirm && trayMismatch ? (
            <>
              <div className={styles.askBox}>
                <p className={styles.askQuestion}>
                  {t('scan.trayReportMismatchConfirm', { filament: trayMismatch.reportedLabel })}
                </p>
              </div>
              <button className={styles.btn} onClick={() => setShowMismatchConfirm(false)} disabled={saving}>
                {t('common.cancel')}
              </button>
              <button className={`${styles.btn} ${styles.primary}`} onClick={() => void executeSave()} disabled={saving}>
                {saving ? '…' : t('scan.assignAnyway')}
              </button>
            </>
          ) : (
            <>
              <button className={styles.btn} onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button className={`${styles.btn} ${styles.primary}`} onClick={() => void handleSave()} disabled={saving}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                {saving ? '…' : 'Save changes'}
              </button>
            </>
          )}
        </div>
      </>
    )
  }
}