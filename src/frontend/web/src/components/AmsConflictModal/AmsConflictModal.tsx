import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import type { SpoolResponse } from '@/types/spool'
import styles from './AmsConflictModal.module.css'

interface Props {
  printerImgSrc: string
  printerBrand?: string
  printerModel?: string
  traySlot?: number
  occupantSpool: SpoolResponse
  onCancel: () => void
  onConfirm: () => void
}

export default function AmsConflictModal({
  printerImgSrc, printerBrand, printerModel, traySlot, occupantSpool, onCancel, onConfirm,
}: Props) {
  const { t } = useTranslation()
  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.imgArea}>
          <img
            src={printerImgSrc}
            alt=""
            className={styles.img}
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
          />
        </div>
        <div className={styles.body}>
          {(printerBrand || printerModel) && (
            <p className={styles.printerMeta}>
              {[printerBrand, printerModel].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className={styles.title}>
            {traySlot != null
              ? t('amsConflict.trayInUse', { slot: traySlot })
              : t('amsConflict.printerInUse')}
          </p>
          <p className={styles.subtitle}>
            {traySlot != null
              ? t('amsConflict.trayOccupied')
              : t('amsConflict.printerOccupied')}
          </p>
          <div className={styles.spoolPreview}>
            <SpoolIcon color={occupantSpool.colorHex} size={44} />
            <div className={styles.spoolInfo}>
              <p className={styles.spoolName}>{occupantSpool.colorName}</p>
              <p className={styles.spoolMeta}>{occupantSpool.brand} · {occupantSpool.material}</p>
            </div>
          </div>
          <div className={styles.btnRow}>
            <button onClick={onCancel} className={styles.btnCancel}>
              {t('common.cancel')}
            </button>
            <button onClick={onConfirm} className={styles.btnConfirm}>
              {t('amsConflict.reassignTray')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
