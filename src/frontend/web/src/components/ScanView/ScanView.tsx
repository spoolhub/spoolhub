import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { scanTag } from '@/api/nfc'
import { useNfcHub } from '@/hooks/useNfcHub'
import AndroidScanner from '@/components/scan/AndroidScanner'
import IphoneScanner from '@/components/scan/IphoneScanner'
import DesktopScanner from '@/components/scan/DesktopScanner'
import NfcScanModal from '@/components/NfcScanModal'
import type { SpoolResponse } from '@/types/spool'
import type { NfcScanResult } from '@/types/nfc'
import styles from './ScanView.module.css'

type Platform = 'android' | 'ios' | 'pc'
type Phase = 'idle' | 'processing' | 'error'

function detectPlatform(): Platform {
  if ('NDEFReader' in window) return 'android'
  if (/iPhone|iPad/i.test(navigator.userAgent)) return 'ios'
  return 'pc'
}

interface Props {
  onUnknownTag?: (tagUid: string) => void
}

export default function ScanView({ onUnknownTag }: Props = {}) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const tagUidParam = searchParams.get('tagUid')
  const platform = detectPlatform()

  const [phase, setPhase] = useState<Phase>(() => tagUidParam ? 'processing' : 'idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [foundSpool, setFoundSpool] = useState<SpoolResponse | null>(null)

  const handleSpoolFound = useCallback((spool: SpoolResponse) => {
    if (spool.isActive) { navigate(`/spools/${spool.id}`); return }
    setFoundSpool(spool)
    setPhase('idle')
  }, [navigate])

  const handleScanResult = useCallback((result: NfcScanResult) => {
    if (platform === 'pc') return
    if (result.status === 'found' && result.spool) {
      handleSpoolFound(result.spool)
    } else if (result.status === 'unknown') {
      if (onUnknownTag && result.tagUid) { onUnknownTag(result.tagUid); return }
      setPhase('error')
      setErrorMessage(t('scan.unknownTag'))
    }
  }, [platform, handleSpoolFound, onUnknownTag, t])

  const { isConnected } = useNfcHub(handleScanResult)

  useEffect(() => {
    if (!tagUidParam) return
    scanTag(tagUidParam)
      .then(result => {
        if (result.status === 'unknown') {
          const uid = result.tagUid || tagUidParam
          if (onUnknownTag) {
            onUnknownTag(uid)
          } else {
            navigate(`/spools/add/nfctag?tagUid=${encodeURIComponent(uid)}`, { replace: true })
          }
        } else if (result.spool) {
          handleSpoolFound(result.spool)
        }
      })
      .catch(() => {
        setErrorMessage(t('scan.lookupError'))
        setPhase('error')
      })
  }, [tagUidParam]) // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setPhase('idle')
    setErrorMessage(null)
  }

  return (
    <div className={styles.wrap}>
      {phase === 'processing' && (
        <div className={styles.spinner}>
          <div className={styles.spinnerRing} />
          <p className={styles.spinnerLabel}>{t('scan.lookingUp')}</p>
        </div>
      )}

      {phase === 'error' && (
        <div className={styles.errorBox}>
          <p className={styles.errorMsg}>{errorMessage}</p>
          <button onClick={reset} className={styles.retryBtn}>{t('scan.tryAgain')}</button>
        </div>
      )}

      {phase === 'idle' && (
        <>
          {platform === 'android' && (
            <AndroidScanner isHubConnected={isConnected} onSpoolFound={handleSpoolFound} onUnknownTag={onUnknownTag} />
          )}
          {platform === 'ios' && <IphoneScanner />}
          {platform === 'pc' && (
            <DesktopScanner
              isHubConnected={isConnected}
              onUnknownTag={onUnknownTag}
            />
          )}
        </>
      )}

      {foundSpool && platform !== 'pc' && (
        <NfcScanModal
          spool={foundSpool}
          onClose={() => setFoundSpool(null)}
        />
      )}
    </div>
  )
}
