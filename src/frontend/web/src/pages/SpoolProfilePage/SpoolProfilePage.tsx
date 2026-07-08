import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import type { SpoolProfileResponse } from '@/types/spoolProfile'
import { SpoolIcon } from '@/components/icons'
import SpoolProfileCard from '@/components/SpoolProfileCard'
import SpoolProfileDrawer from '@/components/SpoolProfileDrawer'
import styles from './SpoolProfilePage.module.css'

export default function SpoolProfilePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState<SpoolProfileResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<SpoolProfileResponse | null>(null)
  const [sortBy, setSortBy] = useState('name')
  const [view, setView] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('spoolhub-profile-view') as 'grid' | 'list') || 'grid'
  )

  useEffect(() => { localStorage.setItem('spoolhub-profile-view', view) }, [view])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await spoolProfilesApi.getAll()
        if (!cancelled) setProfiles(data)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const sorted = useMemo(() => {
    const list = [...profiles]
    if (sortBy === 'brand') list.sort((a, b) => a.brand.localeCompare(b.brand) || a.colorName.localeCompare(b.colorName))
    else if (sortBy === 'material') list.sort((a, b) => a.material.localeCompare(b.material) || a.colorName.localeCompare(b.colorName))
    else list.sort((a, b) => a.colorName.localeCompare(b.colorName))
    return list
  }, [profiles, sortBy])

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loadingSkeleton} />
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('spoolProfile.pageTitle')}</h1>
          <p className={styles.subtitle}>{t('spoolProfile.subtitle')}</p>
        </div>
        <button className={styles.addBtn} onClick={() => navigate('/spool-profiles/new')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('spoolProfile.addProfile')}
        </button>
      </div>

      <div className={styles.toolbar}>
        <span className={styles.count}>{profiles.length} {t('spoolProfile.pageTitle', 'profiles')}</span>
        <div className={styles.toolbarRight}>
          <select className={styles.sortsel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">Sort: Color A–Z</option>
            <option value="brand">Sort: Brand A–Z</option>
            <option value="material">Sort: Material</option>
          </select>
          <div className={styles.seg2}>
            <button className={view === 'grid' ? styles.on : ''} onClick={() => setView('grid')} title="Grid view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            </button>
            <button className={view === 'list' ? styles.on : ''} onClick={() => setView('list')} title="List view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>
            </button>
          </div>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>{t('spoolProfile.empty')}</p>
          <button className={styles.emptyBtn} onClick={() => navigate('/spool-profiles/new')}>
            {t('spoolProfile.addFirst')}
          </button>
        </div>
      ) : view === 'list' ? (
        <div className={styles.listWrap}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th></th>
                <th>Color</th>
                <th>Brand</th>
                <th>Material</th>
                <th>Extruder</th>
                <th>Bed</th>
                <th>Initial</th>
                <th>Spools</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} onClick={() => setSelectedProfile(p)}>
                  <td><span className={styles.tblIc}><SpoolIcon color={p.colorHex} size={28} /></span></td>
                  <td className={styles.tblColor}>
                    <span className={styles.tblDot} style={{ background: p.colorHex }} />
                    {p.colorName}
                  </td>
                  <td>{p.brand}</td>
                  <td><span className={styles.tblMat}>{p.material}</span></td>
                  <td>{p.extruderMin != null && p.extruderMax != null ? `${p.extruderMin}–${p.extruderMax}°C` : '—'}</td>
                  <td>{p.bedMin != null && p.bedMax != null ? `${p.bedMin}–${p.bedMax}°C` : '—'}</td>
                  <td>{p.initialWeightG}g</td>
                  <td>{p.spoolCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.grid}>
          {sorted.map(profile => (
            <SpoolProfileCard
              key={profile.id}
              profile={profile}
              onClick={setSelectedProfile}
            />
          ))}
        </div>
      )}

      {selectedProfile && (
        <SpoolProfileDrawer
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onUpdated={updated => {
            setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p))
            setSelectedProfile(updated)
          }}
          onDeleted={id => {
            setProfiles(prev => prev.filter(p => p.id !== id))
            setSelectedProfile(null)
          }}
        />
      )}
    </div>
  )
}
