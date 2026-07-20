import { getNfcTagUids, nfcSideLabel } from '@/utils/nfcTags'
import type { SpoolResponse } from '@/types/spool'
import styles from './NfcTagUidList.module.css'

interface ListProps {
  spool: Pick<SpoolResponse, 'nfcTagUids' | 'nfcTagUid' | 'hasNfcTag'>
  scannedTagUid?: string | null
}

export default function NfcTagUidList({ spool, scannedTagUid }: ListProps) {
  const tagUids = getNfcTagUids(spool)

  if (tagUids.length === 0) {
    return <span className={styles.empty}>—</span>
  }

  if (tagUids.length === 1) {
    return <span className={styles.mono}>{tagUids[0]}</span>
  }

  return (
    <div className={styles.list}>
      {tagUids.map((uid, index) => (
        <div
          key={uid}
          className={`${styles.chip} ${scannedTagUid && uid === scannedTagUid ? styles.chipScanned : ''}`}
        >
          <span className={styles.side}>{nfcSideLabel(index)}</span>
          <span className={styles.uid}>{uid}</span>
        </div>
      ))}
    </div>
  )
}

export function NfcTagUidRows({
  spool,
  labelClassName,
  valueClassName,
  rowClassName,
  singleLabel = 'Tag ID',
}: ListProps & {
  labelClassName: string
  valueClassName: string
  rowClassName: string
}) {
  const tagUids = getNfcTagUids(spool)

  if (tagUids.length === 0) {
    return (
      <div className={rowClassName}>
        <span className={labelClassName}>{singleLabel}</span>
        <span className={valueClassName}>—</span>
      </div>
    )
  }

  if (tagUids.length === 1) {
    return (
      <div className={rowClassName}>
        <span className={labelClassName}>{singleLabel}</span>
        <span className={valueClassName}>{tagUids[0]}</span>
      </div>
    )
  }

  return (
    <>
      {tagUids.map((uid, index) => (
        <div key={uid} className={rowClassName}>
          <span className={labelClassName}>{nfcSideLabel(index)}</span>
          <span className={valueClassName}>{uid}</span>
        </div>
      ))}
    </>
  )
}
