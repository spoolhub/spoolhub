import { SpoolIcon } from '@/components/icons'
import { getNfcTagUids, hasDualNfcTags } from '@/utils/nfcTags'
import type { SpoolResponse } from '@/types/spool'
import styles from './SpoolIconWithNfcBadges.module.css'

const NFC_BADGE_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="7" x2="5" y2="17" />
    <path d="M8 9.5a4 4 0 0 1 0 5" />
    <path d="M11 8a7 7 0 0 1 0 8" />
    <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
  </svg>
)

interface Props {
  color: string
  size: number
  spool: Pick<SpoolResponse, 'hasNfcTag' | 'nfcTagUid' | 'nfcTagUids'>
  badgeClassName?: string
  badgeSize?: 'sm' | 'md'
  linkedLabel?: string
}

export default function SpoolIconWithNfcBadges({
  color,
  size,
  spool,
  badgeClassName,
  badgeSize = 'md',
  linkedLabel = 'NFC tag linked',
}: Props) {
  const tagUids = getNfcTagUids(spool)
  const dual = hasDualNfcTags(spool)
  const badgeClass = [
    styles.badge,
    badgeSize === 'sm' ? styles.badgeSm : '',
    badgeClassName,
  ].filter(Boolean).join(' ')

  return (
    <div className={styles.wrap}>
      <SpoolIcon color={color} size={size} />
      {tagUids.length > 0 && (
        <>
          {dual && (
            <span className={`${badgeClass} ${styles.badgeLeft}`} aria-label={linkedLabel}>
              {NFC_BADGE_ICON}
            </span>
          )}
          <span className={`${badgeClass} ${styles.badgeRight}`} aria-label={linkedLabel}>
            {NFC_BADGE_ICON}
          </span>
        </>
      )}
    </div>
  )
}
