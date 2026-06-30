import { useTranslation } from 'react-i18next'
import styles from './ScanResult.module.css'

type ResultStatus = 'unknown' | 'error'

interface Props {
  status: ResultStatus
  errorMessage?: string | null
  onRetry?: () => void
}

export default function ScanResult({ status, errorMessage, onRetry }: Props) {
  const { t } = useTranslation()
  if (status === 'unknown') {
    return (
      <div className={styles.unknown}>
        <div className={styles.row}>
          <div className={`${styles.iconWrap} ${styles.iconWrapWarning}`}>
            <svg width="14" height="14" className={styles.warnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className={styles.unknownMsg}>{t('scan.unknownTagRedirecting')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.error}>
      <div className={styles.rowTop}>
        <div className={`${styles.iconWrap} ${styles.iconWrapError}`}>
          <svg width="14" height="14" className={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <div className={styles.body}>
          <p className={styles.errorTitle}>{t('scan.scanFailed')}</p>
          {errorMessage && <p className={styles.errorDetail}>{errorMessage}</p>}
          {onRetry && (
            <button onClick={onRetry} className={styles.retryBtn}>{t('scan.tryAgain')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
