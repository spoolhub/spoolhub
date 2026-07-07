import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { locationsApi } from '@/api/locations'
import { spoolsApi } from '@/api/spools'
import SpoolIcon from '@/components/icons/SpoolIcon'
import type { LocationResponse, LocationType } from '@/types/location'
import type { SpoolResponse } from '@/types/spool'
import styles from './LocationsPage.module.css'

const ORDER_KEY = 'locations-order'

const SHELF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.5h18M3 14.5h18M8 4v5M14 4v5M9 14.5v5M15 14.5v5"/>
  </svg>
)
const DRYBOX_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M8 6V4h8v2"/><path d="M12 14.5c1.5-1.6 1.5-2.8 0-4-1.5 1.2-1.5 2.4 0 4Z"/>
  </svg>
)
const DROPLET_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/></svg>
)

function savedOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') } catch { return [] }
}
function saveOrder(ids: string[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
}

function applyOrder(locations: LocationResponse[], order: string[]): LocationResponse[] {
  if (!order.length) return locations
  const map = new Map(locations.map(l => [l.id, l]))
  const ordered = order.flatMap(id => (map.has(id) ? [map.get(id)!] : []))
  const rest = locations.filter(l => !order.includes(l.id))
  return [...ordered, ...rest]
}

function humBand(h: number): 'dry' | 'ok' | 'high' {
  return h <= 20 ? 'dry' : h <= 35 ? 'ok' : 'high'
}

interface LocationStats {
  list: SpoolResponse[]
  count: number
  totalG: number
  low: number
  materials: string[]
  free: number
  fillPct: number
}

function computeStats(loc: LocationResponse, spools: SpoolResponse[]): LocationStats {
  const list = spools.filter(s => s.stockLocation === loc.name && !s.isArchived)
  const totalG = list.reduce((a, s) => a + s.currentWeightG, 0)
  const low = list.filter(s => s.currentWeightG <= s.lowStockThresholdG).length
  const materials = [...new Set(list.map(s => s.material))]
  const free = Math.max(0, loc.capacity - list.length)
  const fillPct = loc.capacity > 0 ? Math.round((list.length / loc.capacity) * 100) : 0
  return { list, count: list.length, totalG, low, materials, free, fillPct }
}

interface CardProps {
  location: LocationResponse
  stats: LocationStats
  onOpen: (loc: LocationResponse) => void
}

function LocationCard({ location, stats, onOpen }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: location.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const full = stats.fillPct >= 80

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.card}
      onClick={() => onOpen(location)}
    >
      <button className={styles.dragHandle} {...attributes} {...listeners} onClick={e => e.stopPropagation()} aria-label="Drag to reorder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/>
          <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
          <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/>
        </svg>
      </button>

      <div className={styles.bhead}>
        <span className={styles.licon}>{location.type === 'drybox' ? DRYBOX_ICON : SHELF_ICON}</span>
        <div className={styles.bmeta}>
          <div className={styles.bn}>{location.name}</div>
          <div className={styles.bd}>{location.type === 'drybox' ? 'Sealed drybox' : 'Storage shelf'}</div>
        </div>
        <span className={styles.bcount}>{stats.count}/{location.capacity}</span>
      </div>

      <div className={styles.bstats}>
        <div className={styles.bstat}><div className={styles.v}>{(stats.totalG / 1000).toFixed(1)}<small>kg</small></div><div className={styles.l}>Stored</div></div>
        <div className={styles.bstat}><div className={styles.v}>{stats.free}</div><div className={styles.l}>Slots free</div></div>
        <div className={styles.bstat}><div className={styles.v} style={stats.low ? { color: 'oklch(0.62 0.17 30)' } : undefined}>{stats.low}</div><div className={styles.l}>Low stock</div></div>
      </div>

      <div className={styles.caprow}><span>Capacity</span><span className={styles.n}>{stats.fillPct}%</span></div>
      <div className={styles.captrack}><i className={full ? styles.full : ''} style={{ width: `${Math.min(100, stats.fillPct)}%` }}/></div>

      <div className={styles.caprow2}>
        {location.type === 'drybox' && location.humidity != null
          ? <span className={`${styles.humtag} ${styles[humBand(location.humidity)]}`}>{DROPLET_ICON}{location.humidity}% RH</span>
          : <span className={styles.openShelf}>Open shelf</span>}
        <span className={styles.matCount}>{stats.materials.length} material{stats.materials.length === 1 ? '' : 's'}</span>
      </div>

      <div className={styles.bcolors}>
        {stats.list.length
          ? stats.list.slice(0, 6).map(s => <span key={s.id} className={styles.swatch}><SpoolIcon color={s.colorHex} size={30}/></span>)
          : <span className={styles.emptyNote}>Empty</span>}
      </div>
    </div>
  )
}

export default function LocationsPage() {
  const { t } = useTranslation()
  const [locations, setLocations] = useState<LocationResponse[]>([])
  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('custom')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [editing, setEditing] = useState<LocationResponse | null>(null)
  const [form, setForm] = useState<{ name: string; type: LocationType; capacity: number; humidity: number }>({
    name: '', type: 'shelf', capacity: 12, humidity: 30,
  })
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    Promise.all([locationsApi.getAll(), spoolsApi.getAll()])
      .then(([locs, sp]) => {
        setLocations(applyOrder(locs, savedOrder()))
        setSpools(sp)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLocations(prev => {
      const oldIndex = prev.findIndex(l => l.id === active.id)
      const newIndex = prev.findIndex(l => l.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      saveOrder(next.map(l => l.id))
      return next
    })
    // A manual drag always wins over an active sort, so the new position sticks.
    setSortBy('custom')
  }

  const statsById = useMemo(() => {
    const map = new Map<string, LocationStats>()
    locations.forEach(l => map.set(l.id, computeStats(l, spools)))
    return map
  }, [locations, spools])

  const visible = useMemo(() => {
    let list = locations.filter(l => {
      if (query && !l.name.toLowerCase().includes(query.toLowerCase())) return false
      if (activeFilter === 'shelf') return l.type === 'shelf'
      if (activeFilter === 'drybox') return l.type === 'drybox'
      const stats = statsById.get(l.id)
      if (!stats) return true
      if (activeFilter === 'full') return stats.fillPct >= 80
      return true
    })
    list = [...list]
    if (sortBy === 'space') list.sort((a, b) => (statsById.get(b.id)?.free ?? 0) - (statsById.get(a.id)?.free ?? 0))
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'spools') list.sort((a, b) => (statsById.get(b.id)?.count ?? 0) - (statsById.get(a.id)?.count ?? 0))
    return list
  }, [locations, query, activeFilter, sortBy, statsById])

  const totalKg = (spools.reduce((s, sp) => s + sp.currentWeightG, 0) / 1000).toFixed(1)

  function openAddDrawer() {
    setIsNew(true)
    setEditing(null)
    setForm({ name: '', type: 'shelf', capacity: 12, humidity: 30 })
    setNameError('')
    setDeleteConfirm(false)
    setDeleteError('')
    setDrawerOpen(true)
  }

  function openEditDrawer(loc: LocationResponse) {
    setIsNew(false)
    setEditing(loc)
    setForm({ name: loc.name, type: loc.type, capacity: loc.capacity, humidity: loc.humidity ?? 30 })
    setNameError('')
    setDeleteConfirm(false)
    setDeleteError('')
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    setDeleteConfirm(false)
  }

  async function handleSave() {
    const name = form.name.trim()
    if (!name) { setNameError('Give the location a name.'); return }
    if (locations.some(l => l.name.toLowerCase() === name.toLowerCase() && l.id !== editing?.id)) {
      setNameError(`A location named "${name}" already exists.`)
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        const created = await locationsApi.add({
          name, type: form.type, capacity: form.capacity,
          humidity: form.type === 'drybox' ? form.humidity : undefined,
        })
        setLocations(prev => [...prev, created])
      } else if (editing) {
        const updated = await locationsApi.update(editing.id, {
          name, type: form.type, capacity: form.capacity,
          humidity: form.type === 'drybox' ? form.humidity : undefined,
        })
        setLocations(prev => prev.map(l => l.id === updated.id ? updated : l))
        if (updated.name !== editing.name) {
          setSpools(prev => prev.map(s => s.stockLocation === editing.name ? { ...s, stockLocation: updated.name } : s))
        }
      }
      closeDrawer()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    setDeleting(true)
    setDeleteError('')
    try {
      await locationsApi.delete(editing.id)
      setLocations(prev => prev.filter(l => l.id !== editing.id))
      closeDrawer()
    } catch {
      setDeleteError('Move the spools out of this location before deleting it.')
      setDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  const editingStats = editing ? statsById.get(editing.id) : undefined
  const editingCount = editingStats?.count ?? 0

  return (
    <div className={`${styles.page} page`}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('locations.title')}</h1>
          <div className={styles.sub}>{t('locations.subtitle')}</div>
        </div>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          <input placeholder="Search locations…" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <button className={styles.primaryBtn} onClick={openAddDrawer}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          {t('locations.addLocation')}
        </button>
      </header>

      <section className={styles.invbar}>
        <div className={styles.chips}>
          <button className={`${styles.chip} ${activeFilter === 'all' ? styles.on : ''}`} onClick={() => setActiveFilter('all')}>All</button>
          <button className={`${styles.chip} ${activeFilter === 'shelf' ? styles.on : ''}`} onClick={() => setActiveFilter('shelf')}>Shelves</button>
          <button className={`${styles.chip} ${activeFilter === 'drybox' ? styles.on : ''}`} onClick={() => setActiveFilter('drybox')}>Dryboxes</button>
          <button className={`${styles.chip} ${activeFilter === 'full' ? styles.on : ''}`} onClick={() => setActiveFilter('full')}>Near full</button>
        </div>
        <div className={styles.invtools}>
          <select className={styles.sortsel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="custom">Sort: Custom order</option>
            <option value="spools">Sort: Most spools</option>
            <option value="space">Sort: Most space</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>All locations</h2>
          <span className={styles.meta}>{visible.length} location{visible.length === 1 ? '' : 's'}</span>
        </div>
        {loading ? (
          <div className={styles.grid}>
            {[0, 1, 2].map(i => <div key={i} className={styles.skeletonCard} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.empty}>No locations match this filter.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visible.map(l => l.id)} strategy={rectSortingStrategy}>
              <div className={styles.grid}>
                {visible.map(loc => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    stats={statsById.get(loc.id)!}
                    onOpen={openEditDrawer}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
      <div style={{ height: 70 }} />

      {/* EDIT / ADD DRAWER */}
      <div className={`${styles.scrim}${drawerOpen ? ` ${styles.on}` : ''}`} onClick={closeDrawer} />
      <aside className={`${styles.drawer}${drawerOpen ? ` ${styles.on}` : ''}`} aria-hidden={!drawerOpen}>
        <div className={styles.dwtop}>
          <span className={styles.licon}>{form.type === 'drybox' ? DRYBOX_ICON : SHELF_ICON}</span>
          <div className={styles.dwtitle}>
            <h2>{isNew ? 'Add location' : `Edit ${editing?.name ?? ''}`}</h2>
            <p>{form.type === 'drybox' ? 'Sealed drybox' : 'Storage shelf'}</p>
          </div>
          <button className={styles.dwclose} onClick={closeDrawer} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>

        <div className={styles.dwbody}>
          {!isNew && (
            <div className={styles.dstats}>
              <div><div className={styles.v}>{((editingStats?.totalG ?? 0) / 1000).toFixed(1)}<small>kg</small></div><div className={styles.l}>Stored</div></div>
              <div><div className={styles.v}>{editingCount}</div><div className={styles.l}>Spools</div></div>
              <div><div className={styles.v}>{Math.max(0, form.capacity - editingCount)}</div><div className={styles.l}>Slots free</div></div>
            </div>
          )}

          <div className={styles.ff}>
            <label htmlFor="locName">Location name</label>
            <input id="locName" type="text" placeholder="e.g. Shelf A1" value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setNameError('') }} autoFocus />
            {nameError && <span className={styles.fieldError}>{nameError}</span>}
          </div>

          <div className={styles.ff}>
            <label>Type</label>
            <div className={styles.typeseg}>
              <button type="button" className={form.type === 'shelf' ? styles.on : ''} onClick={() => setForm(p => ({ ...p, type: 'shelf' }))}>{SHELF_ICON}Shelf</button>
              <button type="button" className={form.type === 'drybox' ? styles.on : ''} onClick={() => setForm(p => ({ ...p, type: 'drybox' }))}>{DRYBOX_ICON}Drybox</button>
            </div>
          </div>

          <div className={styles.ff2}>
            <div className={styles.ff}>
              <label htmlFor="locCap">Capacity (slots)</label>
              <input id="locCap" type="number" min={1} max={60} step={1} value={form.capacity}
                onChange={e => setForm(p => ({ ...p, capacity: +e.target.value }))} />
            </div>
            {form.type === 'drybox' && (
              <div className={styles.ff}>
                <label htmlFor="locHum">Target humidity (% RH)</label>
                <input id="locHum" type="number" min={0} max={100} step={1} value={form.humidity}
                  onChange={e => setForm(p => ({ ...p, humidity: +e.target.value }))} />
              </div>
            )}
          </div>
          <span className={styles.hint}>
            {isNew ? 'New empty location.' : `${editingCount} spool${editingCount === 1 ? '' : 's'} currently stored here — capacity can't go below this.`}
          </span>
          {deleteError && <span className={styles.fieldError}>{deleteError}</span>}
        </div>

        <div className={styles.dwact}>
          {!isNew && (
            deleteConfirm ? (
              <>
                <button className={`${styles.btn} ${styles.danger}`} onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button className={styles.btn} onClick={() => setDeleteConfirm(false)}>Cancel</button>
              </>
            ) : (
              <>
                <button
                  className={`${styles.btn} ${styles.danger} ${styles.iconOnly}`}
                  onClick={() => setDeleteConfirm(true)}
                  disabled={editingCount > 0}
                  title={editingCount > 0 ? `Move the ${editingCount} spool${editingCount === 1 ? '' : 's'} out first` : 'Delete location'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>
                </button>
                <button className={styles.btn} onClick={closeDrawer}>{t('common.cancel')}</button>
                <button className={`${styles.btn} ${styles.primary}`} onClick={handleSave} disabled={saving}>
                  {saving ? t('common.saving') : 'Save changes'}
                </button>
              </>
            )
          )}
          {isNew && (
            <>
              <button className={styles.btn} onClick={closeDrawer}>{t('common.cancel')}</button>
              <button className={`${styles.btn} ${styles.primary}`} onClick={handleSave} disabled={saving}>
                {saving ? t('common.saving') : 'Add location'}
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
