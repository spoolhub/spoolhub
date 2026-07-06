import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ScanView from '@/components/ScanView'
import styles from './ScanPage.module.css'

export default function ScanPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('scan.pageTitle')}</h1>
          <div className={styles.sub}>{t('scan.pageSubtitle')}</div>
        </div>
      </header>

      <ScanView onUnknownTag={uid => navigate(`/spools/add/nfctag?tagUid=${uid}`)} />
    </div>
  )
}
