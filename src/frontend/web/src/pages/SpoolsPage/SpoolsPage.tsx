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
  if (s.printerName) return s.amsSlot ? `${s.printerName} · AMS slot ${s.amsSlot}` : s.printerName
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
  const [view, setView] = useState<'grid' | 'list'>(() => (localStorage.getItem('spoolhub-view') as 'grid' | 'list') || 'grid')
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

  useEffect(() => {
    localStorage.setItem('spoolhub-view', view)
  }, [view])

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
        </label>
        <Link to="/spools/add" className={styles.primaryBtn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Add Spool
        </Link>
      </header>

      <section className={styles.invbar}>
        <div className={styles.chips}>
          <button className={`${styles.chip} ${activeFilter === 'all' ? styles.on : ''}`} onClick={() => updateFilter('all')}>All</button>
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>
            </button>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>All spools</h2>
        </div>
        {view === 'list' ? (
          <div className={styles.listWrap}>
            <table className={styles.stbl}>
              <thead>
                <tr>
                  <th></th>
                  <th>Color name</th>
                  <th>Brand</th>
                  <th>Material</th>
                  <th>Current w</th>
                  <th>Net w</th>
                  <th>Price</th>
                  <th>Location</th>
                  <th>Last used</th>
                  <th>Nozzle min/max</th>
                  <th>Bed min/max</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1,2,3,4].map(i => (
                      <tr key={i}>
                        <td colSpan={12}><div className={styles.listSkeleton} /></td>
                      </tr>
                    ))
                  : filtered.length === 0
                    ? (
                      <tr>
                        <td colSpan={12} className={styles.empty}>No spools match this filter.</td>
                      </tr>
                    )
                    : paginated.map(s => {
                        const nozzleRange = `${(s.extruderMin ?? 0)}–${(s.extruderMax ?? 0)}°C`
                        const bedRange = `${(s.bedMin ?? 0)}–${(s.bedMax ?? 0)}°C`
                        const status = s.isActive ? `In ${locationLabel(s)}` : 'Not active'

                        return (
                          <tr key={s.id} onClick={() => setSelected(s)}>
                            <td className={styles.stblIc}>
                              <SpoolIcon color={s.colorHex} size={30} />
                              {s.hasNfcTag && (<span className={styles.stblNfcBadge}><NfcBadge label="NFC tag linked" /></span>)}
                            </td>
                            <td className={styles.stblCname}>{s.colorName}</td>
                            <td className={styles.stblBrand}>{s.brand}</td>
                            <td className={styles.stblMat}>{s.material}</td>
                            <td className={styles.stblCur}>
                              {s.currentWeightG}g
                            </td>
                            <td>{s.initialWeightG}g</td>
                            <td>{s.price !== null ? `${s.price.toFixed(2)} SEK` : '-'}</td>
                            <td className={styles.stblLoc}>{locationLabel(s)}</td>
                            <td className={styles.stblUsed}>{formatRelativeTime(s.lastScannedAt)}</td>
                            <td className={styles.stblTemp}>{nozzleRange}</td>
                            <td className={styles.stblTemp}>{bedRange}</td>
                            <td className={s.isActive ? styles.stblStatusOn : styles.stblStatus}>{status}</td>
                          </tr>
                        )
                      })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.spoolGrid}>
            {loading
              ? [1,2,3,4].map(i => <div key={i} className={styles.skeleton} />)
              : filtered.length === 0
                ? <div className={styles.empty}>No spools match this filter.</div>
                : paginated.map(s => {
                    const pct = s.initialWeightG > 0 ? Math.round(s.currentWeightG / s.initialWeightG * 100) : 0
                    const isLow = s.currentWeightG <= 120
                    return (
                      <div key={s.id} className={styles.gridCard} onClick={() => setSelected(s)}>
                        {s.isActive && <span className={styles.activeDotGrid}><i></i>ACTIVE</span>}
                        <div className={styles.row}>
                          <div className={styles.disc}>
                            <SpoolIcon color={s.colorHex} size={54} />
                            {s.hasNfcTag && <span className={styles.nfcBadgeIcon}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="8" height="8"><path d="M5 8a13 13 0 0 1 0 8M9 6a17 17 0 0 1 0 12M15 6a17 17 0 0 1 0 12M19 8a13 13 0 0 1 0 8"/></svg></span>}
                          </div>
                          <div className={styles.id}>
                            <div className={styles.cname}>{s.colorName}</div>
                            <div className={styles.brand}>{s.brand}</div>
                            <div className={styles.tags}>
                              <span className={styles.tag}>{s.material}</span>
                            </div>
                          </div>
                        </div>
                        <div className={styles.bar}>
                          <div className={styles.barMeta}><span className={styles.barG}>{s.currentWeightG}g <small>/ {s.initialWeightG}g</small></span><span className={styles.barPct}>{pct}%</span></div>
                          <div className={styles.track}><i className={isLow ? styles.trackLow : ''} style={{ width: `${pct}%` }}></i></div>
                        </div>
                        <div className={styles.foot}>
                          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{locationLabel(s)}</span>
                          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>{formatRelativeTime(s.lastScannedAt)}</span>
                        </div>
                      </div>
                    )
                  })
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