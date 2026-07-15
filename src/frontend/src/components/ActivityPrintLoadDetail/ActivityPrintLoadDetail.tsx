import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import type { ActivitySnapshot, LoadedSpoolSnapshot } from '@/types/activity'
import styles from '@/components/ActivityCard/ActivityCard.module.css'

interface Props {
  snap: ActivitySnapshot | null | undefined
  accentColor: string
  accentBg: string
  leadingSep?: boolean
}

function activeLoadedSpool(loaded: LoadedSpoolSnapshot[]): LoadedSpoolSnapshot | undefined {
  return loaded.find(s => s.isActive) ?? loaded[0]
}

function uniqueMaterials(loaded: LoadedSpoolSnapshot[]): string[] {
  return [...new Set(loaded.map(s => s.material).filter(Boolean) as string[])]
}

export default function ActivityPrintLoadDetail({ snap, accentColor, accentBg, leadingSep = true }: Props) {
  const { t } = useTranslation()
  const loaded = snap?.loadedSpools ?? []
  const hasAms = snap?.hasAms === true || loaded.length > 1
  const sep = leadingSep ? <span className={styles.flatSep}>·</span> : null

  if (hasAms && loaded.length > 0) {
    return (
      <>
        {sep}
        <span className={styles.flatDesc}>{t('activityCard.loadedWith')}</span>
        <span className={styles.amsIcons}>
          {loaded.map(s => (
            <SpoolIcon key={s.slot} color={s.colorHex ?? '#9ca3af'} size={16} />
          ))}
        </span>
        {uniqueMaterials(loaded).map(mat => (
          <span key={mat} className={styles.flatMat} style={{ color: accentColor, background: accentBg }}>{mat}</span>
        ))}
      </>
    )
  }

  const spool = loaded.length > 0
    ? activeLoadedSpool(loaded)
    : snap?.brand || snap?.colorHex
      ? {
          slot: 0,
          brand: snap.brand,
          colorName: snap.colorName,
          colorHex: snap.colorHex,
          material: snap.material,
          weight: snap.weight,
          isActive: true,
        } satisfies LoadedSpoolSnapshot
      : undefined

  if (!spool?.brand && !spool?.colorHex) return null

  return (
    <>
      {sep}
      <span className={styles.flatDesc}>{t('activityCard.loadedWith')}</span>
      {spool.colorHex && <SpoolIcon color={spool.colorHex} size={16} />}
      {spool.brand && <span className={styles.flatName}>{spool.brand}</span>}
      {spool.colorName && <span className={styles.flatColorName}>{spool.colorName}</span>}
      {spool.material && (
        <span className={styles.flatMat} style={{ color: accentColor, background: accentBg }}>{spool.material}</span>
      )}
      {spool.weight != null && spool.weight > 0 && (
        <>
          <span className={styles.flatSep}>·</span>
          <span className={styles.flatWeight}>{spool.weight}g left</span>
        </>
      )}
    </>
  )
}

export function activityPrintLoadSearchText(snap: ActivitySnapshot | null | undefined): string {
  const loaded = snap?.loadedSpools ?? []
  if (loaded.length > 0) {
    return loaded.flatMap(s => [s.brand, s.colorName, s.material]).filter(Boolean).join(' ')
  }
  return [snap?.brand, snap?.colorName, snap?.material].filter(Boolean).join(' ')
}
