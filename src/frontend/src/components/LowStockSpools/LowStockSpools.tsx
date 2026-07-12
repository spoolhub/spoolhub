import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SpoolResponse } from '@/types/spool'
import { SpoolIcon } from '@/components/icons'
import styles from './LowStockSpools.module.css'

interface Props {
  spools: SpoolResponse[]
  loading?: boolean
}

export default function LowStockSpools({ spools, loading }: Props) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className={styles.list}>
        {[0, 1, 2].map(i => (
          <div key={i} className={styles.skeletonRow}>
            <div className={styles.skeletonIcon} />
            <div className={styles.skeletonContent}>
              <div className={`${styles.skeletonLine} ${styles.short}`} />
            </div>
            <div className={styles.skeletonBadge} />
          </div>
        ))}
      </div>
    )
  }

  if (spools.length === 0) {
    return (
      <div className={styles.empty}>
        <svg className={styles.emptyIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className={styles.emptyText}>{t('lowStock.noLow')}</span>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {spools.map(s => (
        <Link key={s.id} to={`/spools/${s.id}`} className={styles.row}>
          <div className={styles.mini}>
            <SpoolIcon color={s.colorHex ?? '#6b7280'} size={36} />
          </div>
          <div className={styles.text}>
            <div className={styles.brand}>{s.brand}</div>
            <div className={styles.detail}>{s.colorName}</div>
          </div>
          <div className={styles.amt}>{s.currentWeightG}g</div>
        </Link>
      ))}
    </div>
  )
}
