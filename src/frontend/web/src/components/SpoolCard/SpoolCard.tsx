import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import PrinterIcon from '@/components/icons/PrinterIcon'
import type { SpoolResponse } from '@/types/spool'
import styles from './SpoolCard.module.css'

interface SpoolCardProps {
  spool: SpoolResponse
  onClick?: (spool: SpoolResponse) => void
}

export default function SpoolCard({ spool, onClick }: SpoolCardProps) {
  const { t } = useTranslation()
  const pct = Math.min(100, Math.round((spool.currentWeightG / spool.initialWeightG) * 100))
  const isLow = spool.currentWeightG < spool.lowStockThresholdG

  const lastUsed = spool.lastScannedAt
    ? new Date(spool.lastScannedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : t('spools.never', 'never')

  const barColor = isLow || pct < 25 ? '#ef4444' : pct < 50 ? '#eab308' : '#22c55e'
  const pctClass = isLow || pct < 25 ? styles.pctLow : pct < 50 ? styles.pctMedium : styles.pctGood

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      onClick(spool)
    }
  }

  return (
    <Link to={`/spools/${spool.id}`} className={styles.card} onClick={handleClick}>
      <div className={styles.top}>
        <div className={styles.iconWrap}>
          <SpoolIcon color={spool.colorHex} size={72} />
          {spool.hasNfcTag && (
            <span className={styles.nfcBadge} aria-label={t('spools.nfcTagLinked')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="7" x2="5" y2="17" />
                <path d="M8 9.5a4 4 0 0 1 0 5" />
                <path d="M11 8a7 7 0 0 1 0 8" />
                <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
              </svg>
            </span>
          )}
        </div>
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <div className={styles.minW0}>
              <p className={styles.colorName}>{spool.colorName}</p>
              <p className={styles.brand}>{spool.brand}</p>
            </div>
            <div className={styles.rightCol}>
              {spool.isActive && <span className={styles.badgeActive}>{t('spools.active')}</span>}
              <span className={styles.materialBadge}>{spool.material}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.weightRow}>
        <p className={styles.weightLabel}>
          <span className={styles.weightValue}>{Math.round(spool.currentWeightG)}g</span>
          <span className={styles.weightSep}> / </span>
          <span className={styles.weightInitial}>{Math.round(spool.initialWeightG)}g</span>
        </p>
        <p className={`${styles.pct} ${pctClass}`}>
          {(isLow || pct < 25) && (
            <svg width="13" height="13" className={styles.iconFlexShrink} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          {pct}%
        </p>
      </div>

      <div className={styles.barWrap}>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}66` }} />
        </div>
      </div>

      <div className={styles.meta}>
        {spool.printerName ? (
          <span className={styles.metaItem}>
            <PrinterIcon className={styles.printerIcon} />
            <span className={styles.locationText}>{spool.printerName}{spool.amsSlot ? ` • Slot ${spool.amsSlot}` : ''}</span>
          </span>
        ) : spool.stockLocation ? (
          <span className={styles.metaItem}>
            <svg width="12" height="12" className={styles.iconFlexShrink} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className={styles.locationText}>{spool.stockLocation}</span>
          </span>
        ) : (
          <span className={styles.metaItem} />
        )}
        <span className={styles.metaItem}>
          <svg width="12" height="12" className={styles.iconFlexShrink} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {lastUsed}
        </span>
      </div>
    </Link>
  )
}
