import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BRAND_DOMAINS from './brandDomains'
import styles from './BrandCard.module.css'

export function BrandLogo({ brand, domain: domainProp, size = 36 }: { brand: string; domain?: string; size?: number }) {
  const [error, setError] = useState(false)
  const domain = BRAND_DOMAINS[brand] ?? domainProp
  if (domain && !error) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
        alt={brand}
        style={{ width: size, height: size }}
        className={styles.logo}
        onError={() => setError(true)}
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={styles.logoFallback}
    >
      {brand[0]}
    </div>
  )
}

export interface BrandInfo {
  id: string
  name: string
  domain: string
  ofdSlug: string
  filamentCount: number
  spoolCount: number
  materials: string[]
  inStockMaterials: string[]
}

interface BrandCardProps {
  brand: BrandInfo
  isLoading?: boolean
  onSelect: (brand: string) => void
  onSelectMaterial: (brand: string, material: string) => void
  onDelete: (id: string) => void
}

export default function BrandCard({ brand, isLoading = false, onSelect, onSelectMaterial, onDelete }: BrandCardProps) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className={styles.confirmCard}>
        <p className={styles.confirmText}>
          {t('brandCard.deleteConfirm', { name: brand.name })}
        </p>
        <div className={styles.confirmBtns}>
          <button
            onClick={() => { onDelete(brand.id); setConfirming(false) }}
            className={styles.confirmDelete}
          >
            {t('common.delete')}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className={styles.confirmCancel}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.gradient} />

      <div className={styles.topRow}>
        <button onClick={() => onSelect(brand.name)} className={styles.logoBtn}>
          <div className={styles.logoWrap}>
            {isLoading
              ? <div className={styles.logoSkeleton} />
              : <BrandLogo brand={brand.name} domain={brand.domain} size={44} />
            }
          </div>
          <div className={styles.nameWrap}>
            <p className={styles.brandName}>{brand.name}</p>
            {isLoading
              ? <div className={styles.countSkeleton} />
              : <p className={styles.brandCount}>{brand.filamentCount} {t('brandCard.filaments')}</p>
            }
          </div>
        </button>

        <div className={styles.rightCol}>
          <button
            onClick={() => { if (brand.spoolCount === 0) setConfirming(true) }}
            aria-label={brand.spoolCount > 0 ? 'Remove all spools before deleting' : `Delete ${brand.name}`}
            title={brand.spoolCount > 0 ? 'Remove all spools before deleting this brand' : undefined}
            disabled={brand.spoolCount > 0}
            className={`${styles.deleteBtn}${brand.spoolCount > 0 ? ` ${styles.deleteBtnDisabled}` : ` ${styles.deleteBtnEnabled}`}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
          <div
            aria-hidden={brand.spoolCount === 0}
            className={brand.spoolCount === 0 ? styles.hidden : undefined}
          >
            <p className={styles.spoolCount}>{brand.spoolCount}</p>
            <p className={styles.spoolCountLabel}>{t('brandCard.inStock')}</p>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {isLoading ? (
        <div className={styles.materialsSkeleton}>
          {([styles.skeletonPillLg, styles.skeletonPillSm, styles.skeletonPillMd]).map((widthClass, i) => (
            <div key={i} className={`${styles.materialSkeletonPill} ${widthClass}`} />
          ))}
        </div>
      ) : (
        <div className={styles.materials}>
          {brand.materials.map(m => {
            const inStock = brand.inStockMaterials.includes(m)
            return (
              <button
                key={m}
                type="button"
                onClick={() => onSelectMaterial(brand.name, m)}
                className={`${styles.pill}${inStock ? ` ${styles.pillActive}` : ` ${styles.pillInactive}`}`}
              >
                {m}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
