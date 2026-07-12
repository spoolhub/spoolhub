import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { apiClient } from '@/api/client'
import { SpoolIcon } from '@/components/icons'
import MaterialTag from '@/components/MaterialTag'
import type { SpoolResponse } from '@/types/spool'
import styles from './SpoolScanPopup.module.css'

const BRAND_DOMAINS: Record<string, string> = {
  'Bambu Lab': 'bambulab.com', 'eSUN 3D': 'esun3d.com', 'Prusament': 'prusament.com',
  'Polymaker': 'polymaker.com', 'Hatchbox': 'hatchbox3d.com', 'SUNLU': 'sunlu.com',
  'Creality': 'creality.com', 'ELEGOO': 'elegoo.com', 'Overture': 'overture3d.com',
  'PolyLite': 'polymaker.com', 'colorFabb': 'colorfabb.com', 'Fillamentum': 'fillamentum.com',
  'Fiberlogy': 'fiberlogy.com', 'extrudr': 'extrudr.com', 'Das Filament': 'dasfilament.de',
  'Protopasta': 'proto-pasta.com', 'MatterHackers': 'matterhackers.com',
  'NinjaTek': 'ninjatek.com', 'Atomic Filament': 'atomicfilament.com',
  'Inland': 'microcenter.com', 'JAYO': 'jayofilament.com', 'TINMORRY': 'tinmorry.com',
  'AzureFilm': 'azurefilm.hr', 'Spectrum': 'spectrumfilaments.com',
  'Devil Design': 'devildesign.pl', 'Anycubic': 'anycubic.com',
}

function BrandFavicon({ brand }: { brand: string }) {
  const [error, setError] = useState(false)
  const domain = BRAND_DOMAINS[brand]
  if (domain && !error) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
        alt={brand}
        className={styles.brandLogo}
        onError={() => setError(true)}
      />
    )
  }
  return <span className={styles.brandFallback}>{brand[0]}</span>
}

interface Props {
  spool: SpoolResponse
  onClose: () => void
}

export default function SpoolScanPopup({ spool, onClose }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [current, setCurrent] = useState<SpoolResponse>(spool)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    apiClient.get<SpoolResponse>(`/api/spools/getbyid/${spool.id}`)
      .then(r => setCurrent(r.data))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [spool.id])

  const totalG = Math.max(1, current.initialWeightG)
  const remainingG = Math.max(0, current.currentWeightG)
  const pct = Math.round((remainingG / totalG) * 100)
  const barColor = pct > 30 ? '#22c55e' : pct > 15 ? '#eab308' : '#ef4444'

  async function handleActivate() {
    setLoading(true)
    setApiError(null)
    try {
      await spoolsApi.activate(current.id)
      window.dispatchEvent(new CustomEvent('spools-updated'))
      onClose()
      navigate(`/spools/${current.id}`)
    } catch {
      setApiError(t('scan.activateError'))
      setLoading(false)
    }
  }

  async function handleDeactivate() {
    setLoading(true)
    setApiError(null)
    try {
      await spoolsApi.deactivate(current.id)
      window.dispatchEvent(new CustomEvent('spools-updated'))
      onClose()
      navigate(`/spools/${current.id}`)
    } catch {
      setApiError(t('scan.deactivateError'))
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.closeRow}>
          <button onClick={onClose} className={styles.closeBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.header}>
          <SpoolIcon color={current.colorHex || '#94a3b8'} size={64} />
          <div className={styles.headerInfo}>
            <div className={styles.brandRow}>
              <div className={styles.brandLeft}>
                <BrandFavicon brand={current.brand} />
                <p className={styles.brandName}>{current.brand}</p>
              </div>
              <MaterialTag material={current.material} />
            </div>
            <h2 className={styles.colorName}>{current.colorName}</h2>
            <p className={styles.colorHex}>{current.colorHex}</p>
          </div>
        </div>

        <div className={styles.progressWrap}>
          <div className={styles.progressRow}>
            <span>{remainingG}g / {totalG}g</span>
            <span>{pct}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.actions}>
          {apiError && <p className={styles.errorMsg}>{apiError}</p>}
          {fetching ? (
            <div className={styles.spinnerWrap}><div className={styles.spinnerRing} /></div>
          ) : current.isActive ? (
            <>
              <p className={styles.statusMsg}>{t('scan.alreadyActive')}</p>
              <button onClick={handleDeactivate} disabled={loading} className={styles.btnDanger}>
                {loading ? t('scan.deactivating') : t('scan.deactivate')}
              </button>
            </>
          ) : (
            <>
              <p className={styles.statusMsg}>{t('scan.notActive')}</p>
              <button onClick={handleActivate} disabled={loading} className={styles.btnPrimary}>
                {loading ? t('scan.activating') : t('scan.activate')}
              </button>
            </>
          )}
          <button onClick={() => navigate(`/spools/${current.id}`)} className={styles.btnSecondary}>
            {t('scan.viewDetails')}
          </button>
        </div>
      </div>
    </div>
  )
}
