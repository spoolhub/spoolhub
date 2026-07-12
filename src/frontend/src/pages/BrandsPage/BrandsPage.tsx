import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import AddBrandModal from '@/components/AddBrandModal'
import SpoolDetailDrawer from '@/components/SpoolDetailDrawer'
import { settingsApi } from '@/api/settings'
import { brandsApi } from '@/api/brands'
import { spoolsApi } from '@/api/spools'
import { filamentsApi } from '@/api/filaments'
import { printersApi } from '@/api/printers'
import type { BrandApiResponse as Brand } from '@/types/brand'
import type { SpoolResponse } from '@/types/spool'
import type { FilamentProfile } from '@/types/filament'
import type { PrinterResponse } from '@/types/printer'
import NotificationBell from '@/components/NotificationBell'
import styles from './BrandsPage.module.css'

interface BrandStats {
  id: string
  name: string
  domain?: string
  count: number
  total: number
  low: number
  mats: string[]
  ofdbMats: string[]
  filamentCount: number
  spools: SpoolResponse[]
}

export default function BrandsPage() {
  const { t } = useTranslation()
  const [brands, setBrands] = useState<BrandStats[]>([])
  const [brandSlugs, setBrandSlugs] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState<BrandStats | null>(null)
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [selectedSpool, setSelectedSpool] = useState<SpoolResponse | null>(null)

  const refresh = useCallback(() => {
    return Promise.all([
      brandsApi.getAll(),
      spoolsApi.getAll(),
      filamentsApi.getAll(),
      printersApi.getAll(),
    ]).then(([brandList, spools, filaments, printerList]: [Brand[], SpoolResponse[], FilamentProfile[], PrinterResponse[]]) => {
      const stats: BrandStats[] = brandList.map(b => {
        const brandSpools = spools.filter(s => s.brand === b.name)
        const total = brandSpools.reduce((sum, s) => sum + (s.currentWeightG ?? 0), 0)
        const low = brandSpools.filter(s => (s.currentWeightG ?? 0) < (s.lowStockThresholdG ?? 100)).length
        const mats = [...new Set(brandSpools.map(s => s.material))].sort()
        const brandFilaments = filaments.filter(f => f.brand === b.name)
        const ofdbMats = [...new Set(brandFilaments.map(f => f.material))].sort()
        const filamentCount = brandFilaments.length
        return { id: b.id, name: b.name, domain: b.domain, count: brandSpools.length, total, low, mats, ofdbMats, filamentCount, spools: brandSpools.slice(0, 6) }
      })
      setBrands(stats)
      setBrandSlugs(new Set(brandList.map(b => b.ofdSlug)))
      setPrinters(printerList)
    })
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const handleBrandAdded = useCallback(() => {
    refresh().then(() => {
      settingsApi.getFilaments().then(s => {
        if (s.autoSync) settingsApi.syncFilaments().catch(() => {})
      }).catch(() => {})
    }).catch(() => {})
  }, [refresh])

  const handleBrandDeleted = useCallback(() => {
    refresh().catch(() => {})
  }, [refresh])

  const filtered = useMemo(() => {
    let list = [...brands]
    if (query) list = list.filter(b => b.name.toLowerCase().includes(query.toLowerCase()))
    if (sortBy === 'recent') list.sort((a, b) => b.count - a.count)
    else if (sortBy === 'remaining') list.sort((a, b) => a.total - b.total)
    else list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [brands, query, sortBy])

  if (loading) {
    return (
      <div className={`${styles.page} page`}>
        <div className={styles.topbar}>
          <div className={styles.h}><h1>{t('brands.title', 'Brands')}</h1></div>
          <NotificationBell variant="bordered" />
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
    <div className={`${styles.page} page`}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('brands.title', 'Brands')}</h1>
          <div className={styles.sub}>{t('brands.subtitle')}</div>
        </div>
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></svg>
          <input placeholder="Search brands…" value={query} onChange={e => setQuery(e.target.value)} />
          <span className={styles.k}>⌘K</span>
        </label>
        <NotificationBell variant="bordered" />
        <button className={styles.primaryBtn} onClick={() => setShowAddModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14"/></svg>
          Add Brand
        </button>
      </header>

      <section className={styles.invbar}>
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
                const cardContent = (
                  <>
                    <div className={styles.bhead}>
                      <span className={`${styles.blg}${fav ? '' : ` ${styles.fb}`}`}>
                        {fav && (
                          <img
                            src={fav}
                            alt=""
                            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add(styles.fb) }}
                          />
                        )}
                        <b>{b.name[0]}</b>
                      </span>
                      <div>
                        <div className={styles.bn}>{b.name}</div>
                        <div className={styles.bd}>{b.domain || '—'}</div>
                      </div>
                      <span className={styles.bcount}>{b.count} spools</span>
                    </div>

                    <div className={styles.bsection}>
                      <div className={styles.bsechead}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></svg>
                        Your inventory
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
                      {b.spools.length > 0 ? (
                        <div className={styles.bcolors}>
                          {b.spools.map(s => (
                            <button
                              key={s.id}
                              className={styles.colorBtn}
                              onClick={e => { e.stopPropagation(); setSelectedSpool(s) }}
                              title={`${s.colorName} (${s.material})`}
                            >
                              <SpoolIcon color={s.colorHex} size={30} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.noSpools}>No spools logged yet</div>
                      )}
                    </div>

                    {b.ofdbMats.length > 0 && (
                      <div className={styles.bsection}>
                        <div className={styles.bsechead}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                          Filaments
                          <span className={styles.n}>{b.filamentCount} filaments</span>
                        </div>
                        <div className={styles.bmats}>
                          {b.ofdbMats.map(m => (
                            <span key={m} className={`${styles.tag}${b.mats.includes(m) ? '' : ` ${styles.ofdb}`}`}>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
                return b.count === 0 ? (
                  <button
                    type="button"
                    key={b.name}
                    className={`${styles.bcard} ${styles.bcardBtn}`}
                    onClick={() => setEditingBrand(b)}
                  >
                    {cardContent}
                  </button>
                ) : (
                  <div key={b.name} className={styles.bcard}>
                    {cardContent}
                  </div>
                )
              })
          }
        </div>
      </section>

      <div style={{ height: 70 }} />

      {showAddModal && (
        <AddBrandModal
          existingSlugs={brandSlugs}
          onClose={() => setShowAddModal(false)}
          onAdded={handleBrandAdded}
        />
      )}

      {editingBrand && (
        <AddBrandModal
          existingSlugs={brandSlugs}
          brand={{ id: editingBrand.id, name: editingBrand.name, domain: editingBrand.domain ?? '' }}
          onClose={() => setEditingBrand(null)}
          onAdded={handleBrandAdded}
          onDeleted={() => { setEditingBrand(null); handleBrandDeleted() }}
        />
      )}

      {selectedSpool && (
        <SpoolDetailDrawer
          spool={selectedSpool}
          printers={printers}
          onClose={() => setSelectedSpool(null)}
          onUpdated={updated => {
            setBrands(prev => prev.map(b => ({
              ...b,
              spools: b.spools.map(s => s.id === updated.id ? updated : s),
            })))
            setSelectedSpool(updated)
          }}
          onDeleted={() => {
            setSelectedSpool(null)
            refresh().catch(() => {})
          }}
        />
      )}
    </div>
  )
}