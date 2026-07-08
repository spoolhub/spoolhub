import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
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
      {/* Color header band */}
      <div className={styles.colorBand}>
        <div className={styles.colorBandBg} style={{ backgroundColor: spool.colorHex }} />
        <div className={styles.colorBandGrad} />
        <span className={styles.spoolIconWrap}>
          <SpoolIcon color={spool.colorHex} size={64} />
        </span>
        <div className={styles.bandInfo}>
          <div className={styles.bandTop}>
            <p className={styles.bandColor}>{spool.colorName}</p>
            <div className={styles.badges}>
              {spool.isActive && <span className={styles.badgeActive}>{t('spools.active')}</span>}
              {spool.hasNfcTag && (
                <svg aria-label={t('spools.nfcTagLinked')} width="16" height="16" className={styles.nfcIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="7" x2="5" y2="17" />
                  <path d="M8 9.5a4 4 0 0 1 0 5" />
                  <path d="M11 8a7 7 0 0 1 0 8" />
                  <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
                </svg>
              )}
              <span className={styles.matChip}>{spool.material}</span>
            </div>
          </div>
          <p className={styles.bandBrand}>{spool.brand}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.barWrap}>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}66` }} />
        </div>
      </div>

      {/* Weight row */}
      <div className={styles.weightRow}>
        <p className={styles.weightLabel}>
          <span className={styles.weightValue}>{Math.round(spool.currentWeightG)}g</span>
          <span className={styles.weightInitial}>/{Math.round(spool.initialWeightG)}g</span>{' '}
          {t('spools.remaining')}
        </p>
        <p className={`${styles.pct} ${pctClass}`}>
          {(isLow || pct < 25) && (
            <svg width="14" height="14" className={styles.iconFlexShrink} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
          {pct}%
        </p>
      </div>

      {/* Meta row */}
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <svg width="12" height="12" className={styles.iconFlexShrink} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {new Date(spool.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {spool.printerName ? (
          <span className={styles.metaItem}>
            <svg width="12" height="12" className={styles.iconFlexShrink} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V3h12v6"/><path d="M6 9H2v10h4"/><path d="M18 9h4v10h-4"/><path d="M6 14h12v5H6z"/><path d="M9 17h6"/><circle cx="12" cy="5" r="1"/>
            </svg>
            <span className={styles.locationText}>{spool.printerName}{spool.amsSlot ? ` • Slot ${spool.amsSlot}` : ''}</span>
          </span>
        ) : spool.stockLocation ? (
          <span className={styles.metaItem}>
            <svg width="10" height="10" className={styles.iconFlexShrink} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className={styles.locationText}>{spool.stockLocation}</span>
          </span>
        ) : null}
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
