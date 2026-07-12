import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import SpoolCard from '@/components/SpoolCard'
import type { SpoolResponse } from '@/types/spool'
import styles from './UnassignedTagPanel.module.css'

interface Props {
  tagUid: string
  onAssign: (spoolId: string) => void
  onCreateNew: () => void
}

export default function UnassignedTagPanel({ tagUid, onAssign, onCreateNew }: Props) {
  const { t } = useTranslation()
  const [spools, setSpools] = useState<SpoolResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    spoolsApi.getAll()
      .then(data => {
        const unassigned = data.filter(s => !s.hasNfcTag && !s.isArchived)
        setSpools(unassigned)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="7" x2="5" y2="17" />
            <path d="M8 9.5a4 4 0 0 1 0 5" />
            <path d="M11 8a7 7 0 0 1 0 8" />
            <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
          </svg>
        </div>
        <div>
          <p className={styles.title}>{t('addSpool.unassignTagTitle')}</p>
          <p className={styles.uid}>{t('addSpool.unassignTagUid', { uid: tagUid })}</p>
        </div>
      </div>

      <p className={styles.desc}>{t('addSpool.unassignTagDesc')}</p>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      ) : spools.length === 0 ? (
        <p className={styles.empty}>{t('addSpool.unassignTagNoSpools')}</p>
      ) : (
        <div className={styles.spoolList}>
          {spools.map(spool => (
            <div key={spool.id} className={styles.spoolCardWrap} onClick={() => onAssign(spool.id)}>
              <SpoolCard spool={spool} />
            </div>
          ))}
        </div>
      )}

      <div className={styles.divider} />

      <button className={styles.createBtn} onClick={onCreateNew}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('addSpool.unassignTagCreateNew')}
      </button>
    </div>
  )
}
