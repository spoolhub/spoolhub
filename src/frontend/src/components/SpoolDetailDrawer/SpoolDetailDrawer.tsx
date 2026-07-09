import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import PlusIcon from '@/components/icons/PlusIcon'
import InfoCircleIcon from '@/components/icons/InfoCircleIcon'
import { getPrinterImage } from '@/utils/printerImages'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse, TraySpoolSummary } from '@/types/printer'

type EditForm = Partial<SpoolResponse> & { isLoadedInPrinter?: boolean }
import styles from './SpoolDetailDrawer.module.css'

const MATNAME: Record<string, string> = {
  PLA: 'Polylactic Acid', ABS: 'Acrylonitrile Butadiene Styrene', PETG: 'Polyethylene Terephthalate Glycol',
  TPU: 'Thermoplastic Polyurethane', Nylon: 'Nylon', PC: 'Polycarbonate', ASA: 'Acrylonitrile Styrene Acrylate',
  HIPS: 'High Impact Polystyrene', PVA: 'Polyvinyl Alcohol', PP: 'Polypropylene', PEI: 'Polyetherimide',
}

const BASE_LOCATIONS = ['Shelf A1', 'Shelf A2', 'Shelf B1', 'Shelf B2', 'Drybox 1', 'Drybox 2']

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
  const [pendingDelete, setPendingDelete] = useState(false)

  const startEdit = (s: SpoolResponse) => {
    setEditForm({ ...s, isLoadedInPrinter: !!s.printerId, printerId: s.printerId ?? null, amsSlot: s.amsSlot ?? null })
    if (s.stockLocation && !BASE_LOCATIONS.includes(s.stockLocation)) {
      setCustomLocations(prev => prev.includes(s.stockLocation!) ? prev : [...prev, s.stockLocation!])
    }
    setEditMode(true)
  }

  const saveEdit = async () => {
    const s = spool
    if (!editForm) return
    try {
      const body: Record<string, unknown> = {}
      if (editForm.currentWeightG != null) body.currentWeightG = Number(editForm.currentWeightG)
      if (editForm.initialWeightG != null) body.initialWeightG = Number(editForm.initialWeightG)
      if (editForm.spoolWeightG != null) body.spoolWeightG = Number(editForm.spoolWeightG)
      if (editForm.lowStockThresholdG != null) body.lowStockThresholdG = Number(editForm.lowStockThresholdG)
      if (editForm.price != null) body.price = Number(editForm.price)
      if (editForm.density != null) body.density = Number(editForm.density)
      if (!editForm.isLoadedInPrinter) body.stockLocation = editForm.stockLocation ?? ''
      await fetch(`/api/spools/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const assignRes = editForm.isLoadedInPrinter
        ? await fetch(`/api/spools/${s.id}/assign-printer`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ printerId: editForm.printerId, amsSlot: editForm.amsSlot ?? 1 }) })
        : await fetch(`/api/spools/${s.id}/assign-printer`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ printerId: null, amsSlot: null }) })
      const updated: SpoolResponse = await assignRes.json()
      onUpdated?.(updated)
      setEditForm({})
      setEditMode(false)
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    const s = spool
    try {
      await fetch(`/api/spools/${s.id}`, { method: 'DELETE' })
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
            <div className={styles.dwheroColorBg} style={{ backgroundColor: s.colorHex }} />
            <div className={styles.dwheroColorGrad} />
            <div className={styles.dwdisc}><SpoolIcon color={s.colorHex} size={96} /></div>
            <div className={styles.dwid}>
              <div className={styles.dwtext}>
                <div className={styles.c}>{s.colorName}</div>
                <div className={styles.b}>{s.brand}</div>
              </div>
              <div className={styles.tags}>
                {s.isActive && <span className={styles.tag} style={{ background: 'oklch(0.6 0.13 150/.15)', color: 'oklch(0.5 0.12 150)' }}>ACTIVE</span>}
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
          <div className={styles.dwstat}><div className={styles.k}>Spool value</div><div className={styles.v}>${((s.initialWeightG / 1000) * (s.material === 'TPU' ? 32 : s.material === 'ABS' ? 22 : 24)).toFixed(2)}</div></div>
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
          <div className={styles.dwline}><span className={styles.lk}>Status</span><span className={styles.lv} style={{ color: s.isActive ? 'oklch(0.55 0.13 150)' : low ? 'oklch(0.62 0.16 30)' : 'var(--text-primary)' }}>{s.isActive ? 'Loaded' : low ? 'Low - reorder soon' : 'In stock'}</span></div>
        </div>
        <div className={styles.dwsec}>
          <h3>Inventory</h3>
          <div className={styles.dwline}><span className={styles.lk}>Last scanned</span><span className={styles.lv}>{formatRelativeTime(s.lastScannedAt)}</span></div>
          <div className={styles.dwline}><span className={styles.lk}>Tag ID</span><span className={styles.lv}>{s.nfcTagUid ?? '—'}</span></div>
        </div>
        <div className={styles.dwsec}>
          <h3>Recent activity</h3>
          <div className={styles.dwts}>
            <div className={styles.ev}><div className={styles.dot}></div><div className={styles.et}><div className={styles.a}>{s.isActive ? 'Loaded into printer' : 'Stored in stock'}</div><div className={styles.b}>{formatRelativeTime(s.lastScannedAt)}</div></div></div>
            <div className={styles.ev}><div className={styles.dot}></div><div className={styles.et}><div className={styles.a}>Used {Math.max(0, s.initialWeightG - s.currentWeightG)} g · Filament tracked</div><div className={styles.b}>Last logged</div></div></div>
            <div className={styles.ev}><div className={styles.dot}></div><div className={styles.et}><div className={styles.a}>Added to inventory</div><div className={styles.b}>{new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div></div>
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
          <div className={styles.dwheroColorBg} style={{ backgroundColor: f.colorHex ?? '#888' }} />
          <div className={styles.dwheroColorGrad} />
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
            <div className={styles.ff}><label>Spool value ($)</label><input type="number" step="0.01" value={f.price ?? 0} onChange={e => setEditForm(p => ({ ...p, price: e.target.value === '' ? null : +e.target.value }))} /></div>
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
                            const occupant = traySlotMap[slot]; const isSel = f.amsSlot === slot
                            const colorHex = isSel ? spool.colorHex : occupant?.colorHex
                            const name = isSel ? spool.colorName : occupant?.colorName ?? t('spoolForm.slotEmpty')
                            return (
                              <button key={slot} type="button" className={`${styles.slotTile}${isSel ? ' ' + styles.slotTileSel : ''}${!occupant && !isSel ? ' ' + styles.slotTileEmpty : ''}`} onClick={() => setEditForm(p => ({ ...p, amsSlot: isSel ? null : slot }))}>
                                {isSel && <span className={styles.slotHere}>{t('spoolForm.goesHere')}</span>}
                                <span className={styles.slotNum}>{slot}</span>
                                <span className={styles.slotIc}>{colorHex ? <SpoolIcon color={colorHex} size={22} /> : <PlusIcon className={styles.slotPlus} />}</span>
                                <span className={styles.slotCn}>{name}</span>
                              </button>
                            )
                          })}
                        </div>
                        {f.amsSlot != null && traySlotMap[f.amsSlot] && (<div className={styles.slotNote}><InfoCircleIcon className={styles.slotNoteIcon} />{t('spoolForm.slotOccupied')}</div>)}
                      </>) : (
                        <div className={styles.singleSlot}>
                          <span className={styles.singleSlotIc}><SpoolIcon color={spool.colorHex ?? '#888'} size={28} /></span>
                          <div><p className={styles.singleSlotTitle}>{t('spoolForm.directSpool')}</p><p className={styles.singleSlotDesc}>{t('spoolForm.noAmsSlots')}</p></div>
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
                  {BASE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  {customLocations.map(l => <option key={l} value={l}>{l}</option>)}
                  <option value="__add_new">+ Add new location</option>
                </select>
                {showAddLocation && (<div className={styles.addWrap}><input type="text" placeholder="Enter new location..." value={newLocation} onChange={e => setNewLocation(e.target.value)} autoFocus /><button type="button" className={styles.btnCancel} onClick={() => { setShowAddLocation(false); setNewLocation('') }}>x</button></div>)}
                {showAddLocation && (<button type="button" className={styles.btnAdd} disabled={!newLocation.trim()} onClick={() => { if (newLocation.trim()) { if (!customLocations.includes(newLocation.trim())) setCustomLocations(prev => [...prev, newLocation.trim()]); setEditForm(p => ({ ...p, stockLocation: newLocation.trim() })); setShowAddLocation(false); setNewLocation('') } }}>Add &quot;{newLocation.trim()}&quot;</button>)}
              </div>
            )}
          </div>
        </div>
        <div className={styles.dwact}>
          <button className={styles.btn} onClick={() => setEditMode(false)}>Cancel</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={saveEdit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>Save changes
          </button>
        </div>
      </>
    )
  }
}