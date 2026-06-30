import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
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
import type { LocationResponse } from '@/types/location'
import type { SpoolResponse } from '@/types/spool'
import styles from './LocationsPage.module.css'

const ORDER_KEY = 'locations-order'

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

interface CardProps {
  location: LocationResponse
  spools: SpoolResponse[]
  onDelete: (id: string) => void
}

function LocationCard({ location, spools, onDelete }: CardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: location.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const locationSpools = spools.filter(
    s => s.stockLocation === location.name && !s.isArchived
  )

  return (
    <div ref={setNodeRef} style={style} className={styles.card}>
      <div className={styles.cardHeader}>
        <button className={styles.dragHandle} {...attributes} {...listeners} aria-label={t('locations.dragToReorder')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/>
            <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/>
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/>
            <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
            <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/>
            <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/>
          </svg>
        </button>

        <div className={styles.cardIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>

        <div className={styles.cardMeta}>
          <p className={styles.cardName}>{location.name}</p>
          <p className={styles.cardCount}>
            {locationSpools.length} {locationSpools.length === 1 ? t('locations.spoolSingular') : t('locations.spoolPlural')}
          </p>
        </div>

        <div className={styles.cardActions}>
          {locationSpools.length > 0 && (
            <button
              className={styles.expandBtn}
              onClick={() => setExpanded(e => !e)}
              aria-label={expanded ? t('locations.collapse') : t('locations.expand')}
            >
              <svg
                className={`${styles.chevron}${expanded ? ` ${styles.chevronOpen}` : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          )}
          <button className={styles.deleteBtn} onClick={() => onDelete(location.id)} aria-label={t('common.delete')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {expanded && locationSpools.length > 0 && (
        <div className={styles.spoolList}>
          {locationSpools.map(s => (
            <Link key={s.id} to={`/spools/${s.id}`} className={styles.spoolRow}>
              <SpoolIcon color={s.colorHex} size={28} className={styles.spoolIconImg} />
              <span className={styles.spoolLabel}>
                {s.brand} · {s.material} · {s.colorName}
              </span>
              <span className={styles.spoolWeight}>
                {Math.round(s.currentWeightG)}g / {Math.round(s.initialWeightG)}g
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LocationsPage() {
  const { t } = useTranslation()
  const [locations, setLocations] = useState<LocationResponse[]>([])
  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const created = await locationsApi.add({ name: name.trim() })
      setLocations(prev => [...prev, created])
      setName('')
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await locationsApi.delete(deleteId)
      setLocations(prev => prev.filter(l => l.id !== deleteId))
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{t('locations.title')}</h1>

      {loading ? (
        <div className={styles.grid}>
          {[0, 1, 2].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={locations.map(l => l.id)} strategy={rectSortingStrategy}>
            <div className={styles.grid}>
              {locations.map(loc => (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  spools={spools}
                  onDelete={id => setDeleteId(id)}
                />
              ))}
              <button className={styles.addCard} onClick={() => setShowModal(true)}>
                <svg className={styles.addIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span className={styles.addText}>{t('locations.addLocation')}</span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{t('locations.addLocation')}</h2>
            <form onSubmit={handleAdd}>
              <label className={styles.label}>{t('locations.name')}</label>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('locations.namePlaceholder')}
                autoFocus
                required
              />
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className={styles.saveBtn} disabled={saving || !name.trim()}>
                  {saving ? t('common.saving') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{t('locations.deleteTitle')}</h2>
            <p className={styles.modalBody}>{t('locations.deleteConfirm')}</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteId(null)}>
                {t('common.cancel')}
              </button>
              <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
