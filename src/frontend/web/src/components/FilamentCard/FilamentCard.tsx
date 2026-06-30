import { Link, useNavigate } from 'react-router-dom'
import { FilamentIcon } from '@/components/icons'
import MaterialTag from '@/components/MaterialTag'
import { BrandLogo } from '@/components/BrandCard'
import { getMaterialColor } from '@/utils/materialColors'
import type { FilamentProfile } from '@/types/filament'
import { colorNameToHex, parseDualColors } from '@/utils/colorUtils'
import styles from './FilamentCard.module.css'

interface FilamentCardProps {
  filament: FilamentProfile
  onClick?: () => void
  selected?: boolean
}

export default function FilamentCard({ filament, onClick, selected = false }: FilamentCardProps) {
  const navigate = useNavigate()
  const dualColors = filament.colorName ? parseDualColors(filament.colorName) : null
  const resolvedColor = dualColors ? null : (filament.colorHex ?? (filament.colorName ? colorNameToHex(filament.colorName) : null))
  const iconColors = dualColors ?? (resolvedColor === null && (filament.variantColors?.length ?? 0) >= 2 ? filament.variantColors : undefined)
  const iconColor = resolvedColor ?? getMaterialColor(filament.material)

  const brandSlug = encodeURIComponent(filament.brand)
  const colorSlug = encodeURIComponent(filament.colorName ?? filament.filamentName)

  const materialTag = (
    <button
      type="button"
      aria-label={`View ${filament.brand} filaments`}
      onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/filaments/${brandSlug}`) }}
    >
      <MaterialTag material={filament.material} />
    </button>
  )

  const innerContent = (
    <div className={styles.inner}>
      <div className={styles.iconWrap}>
        <FilamentIcon color={iconColor} colors={iconColors} size={56} />
      </div>
      <div className={styles.info}>
        <div className={styles.topRow}>
          <div className={styles.brandRow}>
            <BrandLogo brand={filament.brand} size={16} />
            <p className={styles.brandName}>{filament.brand}</p>
          </div>
          {materialTag}
        </div>
        <p className={styles.filamentName}>{filament.colorName ?? filament.filamentName}</p>
      </div>
      {selected && (
        <div className={styles.checkWrap}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${styles.cardBtn}${selected ? ` ${styles.cardBtnSelected}` : ''}`}
      >
        {innerContent}
      </button>
    )
  }

  return (
    <Link
      to={`/filaments/${brandSlug}/${colorSlug}`}
      state={{ filament }}
      className={styles.card}
    >
      {innerContent}
    </Link>
  )
}
