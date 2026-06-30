import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import type { BrandApiResponse as Brand } from '@/types/brand'
import type { SpoolResponse } from '@/types/spool'
import styles from './BrandsPage.module.css'

interface BrandStats {
  name: string
  domain?: string
  count: number
  total: number
  low: number
  mats: string[]
  colors: { hex: string; color: string }[]
}

export default function BrandsPage() {
  const { t } = useTranslation()
  const [brands, setBrands] = useState<BrandStats[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    Promise.all([
      fetch('/api/brands').then(r => r.json()),
      fetch('/api/spools').then(r => r.json()),
    ]).then(([brandList, spools]: [Brand[], SpoolResponse[]]) => {
      const stats: BrandStats[] = brandList.map(b => {
        const brandSpools = spools.filter(s => s.brand === b.name)
        const total = brandSpools.reduce((sum, s) => sum + (s.currentWeightG ?? 0), 0)
        const low = brandSpools.filter(s => (s.currentWeightG ?? 0) < (s.lowStockThresholdG ?? 100)).length
        const mats = [...new Set(brandSpools.map(s => s.material))].sort()
        const colors = brandSpools.slice(0, 6).map(s => ({ hex: s.colorHex, color: s.colorName }))
        return { name: b.name, domain: b.domain, count: brandSpools.length, total, low, mats, colors }
      })
      setBrands(stats)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const materials = useMemo(() => {
    const set = new Set<string>()
    brands.forEach(b => b.mats.forEach(m => set.add(m)))
    return [...set].sort()
  }, [brands])

  const filtered = useMemo(() => {
    let list = [...brands]
    if (query) list = list.filter(b => b.name.toLowerCase().includes(query.toLowerCase()))
    if (activeFilter !== 'all') {
      if (activeFilter === 'active') list = list.filter(b => b.count > 0)
      else if (activeFilter === 'low') list = list.filter(b => b.low > 0)
      else list = list.filter(b => b.mats.includes(activeFilter))
    }
    if (sortBy === 'recent') list.sort((a, b) => b.count - a.count)
    else if (sortBy === 'remaining') list.sort((a, b) => a.total - b.total)
    else list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [brands, query, activeFilter, sortBy])

  const totalSpools = useMemo(() => brands.reduce((s, b) => s + b.count, 0), [brands])
  const totalKg = useMemo(() => (brands.reduce((s, b) => s + b.total, 0) / 1000).toFixed(1), [brands])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.topbar}>
          <div className={styles.h}><h1>{t('brands.title', 'Brands')}</h1></div>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHead}><h2>All brands</h2></div>
          <div className={styles.brandGrid}>
            {[1,2,3,4].map(i => <div key={i} className={styles.sCard} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('brands.title', 'Brands')}</h1>
          <div className={styles.sub}>{brands.length} brands · {totalSpools} spools · {totalKg} kg filament on hand</div>
        </div>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          <input placeholder="Search brands…" value={query} onChange={e => setQuery(e.target.value)} />
          <span className={styles.k}>⌘K</span>
        </label>
        <button className={styles.iconBtn} title="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0"/></svg>
        </button>
        <button className={styles.primaryBtn} onClick={() => {}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Add Brand
        </button>
      </header>

      <section className={styles.invbar}>
        <div className={styles.chips}>
          <button className={`${styles.chip} ${activeFilter === 'all' ? styles.on : ''}`} onClick={() => setActiveFilter('all')}>All</button>
          {materials.map(m => (
            <button key={m} className={`${styles.chip} ${activeFilter === m ? styles.on : ''}`} onClick={() => setActiveFilter(m)}>{m}</button>
          ))}
          <button className={`${styles.chip} ${activeFilter === 'active' ? styles.on : ''}`} onClick={() => setActiveFilter('active')}>Active</button>
          <button className={`${styles.chip} ${activeFilter === 'low' ? styles.on : ''}`} onClick={() => setActiveFilter('low')}>Low stock</button>
        </div>
        <div className={styles.invtools}>
          <select className={styles.sortsel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="recent">Sort: Most spools</option>
            <option value="remaining">Sort: Least filament</option>
            <option value="name">Sort: Brand A–Z</option>
          </select>
          <div className={styles.seg2}>
            <button className={view === 'grid' ? styles.on : ''} onClick={() => setView('grid')} title="Grid view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            </button>
            <button className={view === 'list' ? styles.on : ''} onClick={() => setView('list')} title="List view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>
            </button>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>All brands</h2>
          <span className={styles.meta}>{brands.length} brands</span>
        </div>
        <div className={`${styles.brandGrid} ${view === 'list' ? styles.list : ''}`}>
          {filtered.length === 0
            ? <div className={styles.empty}>No brands match this filter.</div>
            : filtered.map(b => {
                const fav = b.domain ? `https://www.google.com/s2/favicons?sz=64&domain=${b.domain}` : ''
                return (
                  <Link to={`/spools?brand=${encodeURIComponent(b.name)}`} key={b.name} className={styles.bcard}>
                    <div className={styles.bhead}>
                      <span className={styles.blg}>
                        {fav && <img src={fav} alt="" onError={e => e.currentTarget.style.display='none'} />}
                        <b>{b.name[0]}</b>
                      </span>
                      <div>
                        <div className={styles.bn}>{b.name}</div>
                        <div className={styles.bd}>{b.domain || '—'}</div>
                      </div>
                      <span className={styles.bcount}>{b.count} spools</span>
                    </div>
                    <div className={styles.bstats}>
                      <div className={styles.bstat}>
                        <div className={styles.v}>{(b.total / 1000).toFixed(1)}<small>kg</small></div>
                        <div className={styles.l}>On hand</div>
                      </div>
                      <div className={styles.bstat}>
                        <div className={styles.v}>{b.mats.length}</div>
                        <div className={styles.l}>Materials</div>
                      </div>
                      <div className={styles.bstat}>
                        <div className={styles.v} style={b.low ? { color: 'oklch(0.62 0.17 30)' } : undefined}>{b.low}</div>
                        <div className={styles.l}>Low stock</div>
                      </div>
                    </div>
                    <div className={styles.bmats}>
                      {b.mats.map(m => <span key={m} className={styles.tag}>{m}</span>)}
                    </div>
                    <div className={styles.bcolors}>
                      {b.colors.map((c, i) => (
                        <div key={i} className={styles.colorDot}><SpoolIcon color={c.hex} size={30} /></div>
                      ))}
                    </div>
                  </Link>
                )
              })
          }
        </div>
      </section>

      <div style={{ height: 70 }} />
    </div>
  )
}
