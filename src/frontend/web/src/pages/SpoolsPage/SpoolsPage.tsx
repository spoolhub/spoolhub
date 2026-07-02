import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import SpoolDetailDrawer from '@/components/SpoolDetailDrawer'
import Pagination from '@/components/Pagination'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse } from '@/types/printer'
import styles from './SpoolsPage.module.css'

function NfcBadge({ label }: { label: string }) {
  return (
    <svg aria-label={label} width="14" height="14" className={styles.nfcIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="7" x2="5" y2="17" />
      <path d="M8 9.5a4 4 0 0 1 0 5" />
      <path d="M11 8a7 7 0 0 1 0 8" />
      <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
    </svg>
  )
}

const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - date.getTime()) / 3600000)
  const diffDays = Math.floor(diffHours / 24)
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (diffHours < 24) return `${diffHours} hrs ago`
  if (diffDays === 1) return `Yesterday ${time}`
  if (diffDays < 7) return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`
  return date.toLocaleDateString('en-GB').replace(/\//g, '/')
}

const locationLabel = (s: SpoolResponse): string => {
  if (s.printerName) return s.amsSlot ? `${s.printerName} · Slot ${s.amsSlot}` : s.printerName
  if (s.stockLocation) return s.stockLocation
  return 'Unassigned'
}

export default function SpoolsPage() {
  const { t } = useTranslation()
  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selected, setSelected] = useState<SpoolResponse | null>(null)
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    fetch('/api/spools').then(r => r.json()).then((data: SpoolResponse[]) => {
      setSpools(data)
      setLoading(false)
    }).catch(() => setLoading(false))
    fetch('/api/printers').then(r => r.json()).then((data: PrinterResponse[]) => {
      setPrinters(data)
    }).catch(() => {})
  }, [])

  const materials = useMemo(() => [...new Set(spools.map(s => s.material))].filter(Boolean).sort(), [spools])

  const filtered = useMemo(() => {
    let list = [...spools]
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(s => `${s.brand} ${s.colorName} ${s.material}`.toLowerCase().includes(q))
    }
    if (activeFilter === 'active') list = list.filter(s => s.isActive)
    else if (activeFilter === 'low') list = list.filter(s => s.currentWeightG <= 120)
    else if (activeFilter !== 'all') list = list.filter(s => s.material === activeFilter)
    if (sortBy === 'remaining') list.sort((a, b) => a.currentWeightG - b.currentWeightG)
    else if (sortBy === 'name') list.sort((a, b) => a.brand.localeCompare(b.brand) || a.colorName.localeCompare(b.colorName))
    return list
  }, [spools, query, activeFilter, sortBy])

  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage])

  function updateQuery(v: string) { setQuery(v); setPage(1) }
  function updateFilter(v: string) { setActiveFilter(v); setPage(1) }
  function updateSort(v: string) { setSortBy(v); setPage(1) }
  function updateView(v: 'grid' | 'list') { setView(v); setPage(1) }

  const totalKg = (spools.reduce((s, sp) => s + sp.currentWeightG, 0) / 1000).toFixed(1)
  const brands = new Set(spools.map(s => s.brand))

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('spools.title', 'Spools')}</h1>
          <div className={styles.sub}>{spools.length} spools · {totalKg} kg filament on hand · {brands.size} brands</div>
        </div>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          <input placeholder="Search spools, brands, colors…" value={query} onChange={e => updateQuery(e.target.value)} />
          <span className={styles.k}>⌘K</span>
        </label>
        <Link to="/spools/add" className={styles.primaryBtn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Add Spool
        </Link>
      </header>

      <section className={styles.invbar}>
        <div className={styles.chips}>
          <button className={`${styles.chip} ${activeFilter === 'all' ? styles.on : ''}`} onClick={() => updateFilter('all')}>All</button>
          {materials.map(m => (
            <button key={m} className={`${styles.chip} ${activeFilter === m ? styles.on : ''}`} onClick={() => updateFilter(m)}>{m}</button>
          ))}
          <button className={`${styles.chip} ${activeFilter === 'active' ? styles.on : ''}`} onClick={() => updateFilter('active')}>Active</button>
          <button className={`${styles.chip} ${activeFilter === 'low' ? styles.on : ''}`} onClick={() => updateFilter('low')}>Low stock</button>
        </div>
        <div className={styles.invtools}>
          <select className={styles.sortsel} value={sortBy} onChange={e => updateSort(e.target.value)}>
            <option value="recent">Sort: Recently scanned</option>
            <option value="remaining">Sort: Remaining ↑</option>
            <option value="name">Sort: Brand A–Z</option>
          </select>
          <div className={styles.seg2}>
            <button className={view === 'grid' ? styles.on : ''} onClick={() => updateView('grid')} title="Grid view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            </button>
            <button className={view === 'list' ? styles.on : ''} onClick={() => updateView('list')} title="List view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>
            </button>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>All spools</h2>
          <span className={styles.meta}>{filtered.length} items</span>
        </div>
        {view === 'list' ? (
          <div className={styles.listWrap}>
            {loading
              ? [1,2,3,4].map(i => <div key={i} className={styles.listSkeleton} />)
              : filtered.length === 0
                ? <div className={styles.empty}>No spools match this filter.</div>
                : paginated.map(s => {
                  const pct = s.initialWeightG > 0 ? Math.round(s.currentWeightG / s.initialWeightG * 100) : 0
                  const isLow = s.currentWeightG <= 120
                  return (
                    <div key={s.id} className={styles.listRow} onClick={() => setSelected(s)}>
                      <div className={styles.listIcon}><SpoolIcon color={s.colorHex} size={40} /></div>
                      <div className={styles.listId}>
                        <span className={styles.brand}>{s.brand}</span>
                        <span className={styles.cname}>{s.colorName}</span>
                        <span className={styles.tag}>{s.material}</span>
                        {s.hasNfcTag && <NfcBadge label="NFC tag linked" />}
                      </div>
                      <div className={styles.listMeta}>
                        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></svg>{locationLabel(s)}</span>
                        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>{formatRelativeTime(s.lastScannedAt)}</span>
                      </div>
                      <div className={styles.listBarWrap}>
                        <div className={styles.listTrack}><i className={isLow ? styles.low : ''} style={{ width: `${pct}%` }} /></div>
                      </div>
                      <div className={styles.listStats}>
                        <span className={styles.listG}>{s.currentWeightG}g</span>
                        <span className={`${styles.listPct}${isLow ? ` ${styles.low}` : ''}`}>{pct}%</span>
                      </div>
                      <div className={styles.listActive}>
                        {s.isActive && <><i></i>ACTIVE</>}
                      </div>
                    </div>
                  )
                })
            }
          </div>
        ) : (
          <div className={styles.spoolGrid}>
            {loading
              ? [1,2,3,4].map(i => <div key={i} className={styles.skeleton} />)
              : filtered.length === 0
                ? <div className={styles.empty}>No spools match this filter.</div>
                : paginated.map(s => (
                  <div key={s.id} className={styles.spool} onClick={() => setSelected(s)}>
                    <div className={styles.badges}>
                      {s.hasNfcTag && <NfcBadge label="NFC tag linked" />}
                      {s.isActive && <span className={styles.activeDot}><i></i>ACTIVE</span>}
                    </div>
                    <div className={styles.row}>
                      <div className={styles.disc}><SpoolIcon color={s.colorHex} size={54} /></div>
                      <div className={styles.id}>
                        <div className={styles.brand}>{s.brand}</div>
                        <div className={styles.cname}>{s.colorName}</div>
                        <div className={styles.tags}><span className={styles.tag}>{s.material}</span></div>
                      </div>
                    </div>
                    <div className={styles.bar}>
                      <div className={styles.metaRow}>
                        <span className={styles.g}>{s.currentWeightG}g <small>/ {s.initialWeightG}g</small></span>
                        <span className={styles.pct}>{s.initialWeightG > 0 ? Math.round(s.currentWeightG / s.initialWeightG * 100) : 0}%</span>
                      </div>
                      <div className={styles.track}><i className={s.currentWeightG <= 120 ? styles.low : ''} style={{ width: `${s.initialWeightG > 0 ? Math.round(s.currentWeightG / s.initialWeightG * 100) : 0}%` }} /></div>
                    </div>
                    <div className={styles.foot}>
                      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></svg>{locationLabel(s)}</span>
                      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>{formatRelativeTime(s.lastScannedAt)}</span>
                    </div>
                  </div>
                ))
            }
          </div>
        )}
        <Pagination
          total={filtered.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={p => { setPerPage(p); setPage(1) }}
          itemLabel="spools"
          className={styles.pagination}
        />
      </section>
      <div style={{ height: 70 }} />

      {selected && (
        <SpoolDetailDrawer
          spool={selected}
          printers={printers}
          onClose={() => setSelected(null)}
          onUpdated={updated => {
            setSpools(prev => prev.map(s => s.id === updated.id ? updated : s))
            setSelected(updated)
          }}
          onDeleted={id => {
            setSpools(prev => prev.filter(s => s.id !== id))
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}
