import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolProfilesApi } from '@/api/spoolProfiles'
import type { SpoolProfileResponse } from '@/types/spoolProfile'
import SpoolProfileCard from '@/components/SpoolProfileCard'
import SpoolProfileEditor from '@/components/SpoolProfileEditor'
import styles from './SpoolProfilePage.module.css'

export default function SpoolProfilePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState<SpoolProfileResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState<SpoolProfileResponse | null>(null)

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await spoolProfilesApi.getAll()
      setProfiles(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetch() {
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
    fetch()
    return () => { cancelled = true }
  }, [])

  async function handleDelete(profile: SpoolProfileResponse) {
    try {
      await spoolProfilesApi.delete(profile.id)
      loadProfiles()
    } catch {
      // ignore
    }
  }

  function handleEdit(profile: SpoolProfileResponse) {
    setEditingProfile(profile)
  }

  function handleSaved() {
    setEditingProfile(null)
    loadProfiles()
  }

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
        <button
          className={styles.addBtn}
          onClick={() => navigate('/spool-profiles/new')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('spoolProfile.addProfile')}
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>{t('spoolProfile.empty')}</p>
          <button
            className={styles.emptyBtn}
            onClick={() => navigate('/spool-profiles/new')}
          >
            {t('spoolProfile.addFirst')}
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {profiles.map(profile => (
            <SpoolProfileCard
              key={profile.id}
              profile={profile}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {editingProfile && (
        <SpoolProfileEditor
          profile={editingProfile}
          onSaved={handleSaved}
          onCancel={() => setEditingProfile(null)}
        />
      )}
    </div>
  )
}
