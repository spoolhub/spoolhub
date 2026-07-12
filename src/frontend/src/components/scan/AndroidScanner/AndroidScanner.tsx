import { useState, useRef, useEffect } from 'react'
import { scanTag } from '@/api/nfc'
import { useTranslation } from 'react-i18next'
import ScanResult from '../ScanResult'
import type { SpoolResponse } from '@/types/spool'
import styles from './AndroidScanner.module.css'

type ScanState =
  | 'idle'
  | 'scanning'
  | 'unknown'
  | 'error'
  | 'write-ready'
  | 'writing'
  | 'written'

interface Props {
  isHubConnected: boolean
  onSpoolFound: (spool: SpoolResponse, tagUid?: string) => void
  onUnknownTag?: (tagUid: string) => void
}

function NfcIcon({ active }: { active: boolean }) {
  return (
    <div className={styles.nfcWrap}>
      {active && (
        <>
          <div className={styles.pingRing1} />
          <div className={styles.pingRing2} />
          <div className={styles.pingRing3} />
        </>
      )}
      <div className={`${styles.nfcCircle}${active ? ` ${styles.nfcCircleActive}` : ''}`}>
        <svg
          width="64" height="64"
          className={active ? styles.nfcIconActive : styles.nfcIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="7" x2="5" y2="17" />
          <path d="M8 9.5a4 4 0 0 1 0 5" />
          <path d="M11 8a7 7 0 0 1 0 8" />
          <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
        </svg>
      </div>
    </div>
  )
}

export default function AndroidScanner({ isHubConnected, onSpoolFound, onUnknownTag }: Props) {
  const { t } = useTranslation()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  function cancel() {
    abortRef.current?.abort()
    abortRef.current = null
    setScanState('idle')
    setErrorMessage(null)
  }

  async function startScan() {
    setScanState('scanning')
    setErrorMessage(null)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const reader = new NDEFReader()
      await reader.scan({ signal: abort.signal })

      reader.addEventListener('error', () => {
        if (abort.signal.aborted) return
        setErrorMessage(t('scan.errorReadTag'))
        setScanState('error')
      })

      reader.addEventListener('reading', async (event: NDEFReadingEvent) => {
        if (abort.signal.aborted) return
        abort.abort()

        const tagUid = event.serialNumber
        try {
          const result = await scanTag(tagUid)
          if (result.status === 'unknown') {
            if (onUnknownTag) { onUnknownTag(tagUid); return }
            setScanState('unknown')
          } else if (result.spool) {
            setScanState('idle')
            onSpoolFound(result.spool, tagUid)
          }
        } catch {
          setErrorMessage(t('scan.errorLookup'))
          setScanState('error')
        }
      })
    } catch (err) {
      if (abort.signal.aborted) return
      const msg = err instanceof Error && err.name === 'NotAllowedError'
        ? t('scan.errorNotAllowed')
        : t('scan.errorNotAvailable')
      setErrorMessage(msg)
      setScanState('error')
    }
  }

  async function startRegister() {
    setScanState('write-ready')
    setErrorMessage(null)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const ndef = new NDEFReader()

      ndef.addEventListener('reading', async (event: NDEFReadingEvent) => {
        if (abort.signal.aborted) return
        setScanState('writing')

        const tagUid = event.serialNumber
        const url = `${window.location.origin}/scan?tagUid=${encodeURIComponent(tagUid)}`

        try {
          await ndef.write(
            { records: [{ recordType: 'url', data: url }] },
            { overwrite: true, signal: abort.signal }
          )
          abort.abort()
          setScanState('written')
        } catch {
          if (abort.signal.aborted) return
          setErrorMessage(t('scan.errorWriteTag'))
          setScanState('error')
        }
      })

      await ndef.scan({ signal: abort.signal })
    } catch (err) {
      if (abort.signal.aborted) return
      const msg = err instanceof Error && err.name === 'NotAllowedError'
        ? t('scan.errorNotAllowed')
        : t('scan.errorNotAvailable')
      setErrorMessage(msg)
      setScanState('error')
    }
  }

  const isActive = scanState === 'scanning' || scanState === 'write-ready' || scanState === 'writing'
  const showResult = scanState === 'unknown' || scanState === 'error'

  return (
    <div className={styles.wrap}>
      {scanState !== 'written' && !showResult && (
        <div className={styles.heading}>
          <NfcIcon active={isActive} />
          <div>
            <h1 className={styles.title}>
              {scanState === 'write-ready' || scanState === 'writing'
                ? t('scan.registerNewTag')
                : t('scan.scanNfcTag')}
            </h1>
            <p className={styles.subtitle}>
              {scanState === 'writing'
                ? t('scan.writingUrl')
                : scanState === 'write-ready'
                ? t('scan.holdPhoneBlank')
                : scanState === 'scanning'
                ? t('scan.holdPhoneNear')
                : t('scan.tapDescription')}
            </p>
          </div>
        </div>
      )}

      {scanState === 'written' && (
        <div className={styles.successWrap}>
          <div className={styles.successIcon}>
            <svg width="40" height="40" className={styles.successCheckIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>{t('scan.tagRegistered')}</h1>
            <p className={styles.subtitle}>{t('scan.tagRegisteredDesc')}</p>
          </div>
        </div>
      )}

      {showResult && (
        <div className={styles.fullWidth}>
          <ScanResult status={scanState as 'unknown' | 'error'} errorMessage={errorMessage} onRetry={cancel} />
        </div>
      )}

      {scanState === 'idle' && (
        <div className={styles.btnGroup}>
          <button onClick={startScan} className={styles.btnPrimary}>{t('scan.startScanning')}</button>
          <button onClick={startRegister} className={styles.btnSecondary}>{t('scan.newTag')}</button>
        </div>
      )}

      {(scanState === 'scanning' || scanState === 'write-ready') && (
        <button onClick={cancel} className={styles.btnSecondary}>{t('common.cancel')}</button>
      )}

      {scanState === 'written' && (
        <div className={styles.btnGroup}>
          <button onClick={startScan} className={styles.btnPrimary}>{t('scan.startScanning')}</button>
          <button onClick={startRegister} className={styles.btnSecondary}>{t('scan.registerAnother')}</button>
        </div>
      )}

      {!isHubConnected && <p className={styles.disconnected}>{t('scan.liveDisconnected')}</p>}
    </div>
  )
}
