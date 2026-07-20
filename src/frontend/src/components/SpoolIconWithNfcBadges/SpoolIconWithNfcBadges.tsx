import { SpoolIcon } from '@/components/icons'
import NfcIcon from '@/components/icons/NfcIcon'
import { getNfcTagUids, hasDualNfcTags } from '@/utils/nfcTags'
import type { SpoolResponse } from '@/types/spool'
import styles from './SpoolIconWithNfcBadges.module.css'

function badgeSizeForSpool(size: number, badgeSize: 'xs' | 'sm' | 'md' | 'auto'): 'xs' | 'sm' | 'md' {
  if (badgeSize !== 'auto') return badgeSize
  if (size <= 42) return 'xs'
  if (size <= 56) return 'sm'
  return 'md'
}

interface Props {
  color: string
  size: number
  spool: Pick<SpoolResponse, 'hasNfcTag' | 'nfcTagUid' | 'nfcTagUids'>
  badgeClassName?: string
  badgeSize?: 'xs' | 'sm' | 'md' | 'auto'
  linkedLabel?: string
}

export default function SpoolIconWithNfcBadges({
  color,
  size,
  spool,
  badgeClassName,
  badgeSize = 'auto',
  linkedLabel = 'NFC tag linked',
}: Props) {
  const tagUids = getNfcTagUids(spool)
  const dual = hasDualNfcTags(spool)
  const resolvedBadgeSize = badgeSizeForSpool(size, badgeSize)
  const badgeClass = [
    styles.badge,
    resolvedBadgeSize === 'xs' ? styles.badgeXs : '',
    resolvedBadgeSize === 'sm' ? styles.badgeSm : '',
    badgeClassName,
  ].filter(Boolean).join(' ')

  return (
    <div className={styles.wrap}>
      <SpoolIcon color={color} size={size} />
      {tagUids.length > 0 && (
        <>
          {dual && (
            <span className={`${badgeClass} ${styles.badgeLeft}`} aria-label={linkedLabel}>
              <NfcIcon className={styles.badgeIcon} />
            </span>
          )}
          <span className={`${badgeClass} ${styles.badgeRight}`} aria-label={linkedLabel}>
            <NfcIcon className={styles.badgeIcon} />
          </span>
        </>
      )}
    </div>
  )
}
