import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAgentNfc } from '@/hooks/useAgentNfc'
import ScanResult from '../ScanResult'
import UsbOffIcon from '@/components/icons/UsbOffIcon'
import NfcIcon from '@/components/icons/NfcIcon'
import ReloadIcon from '@/components/icons/ReloadIcon'
import styles from './ScanDesktop.module.css'

const SUPPORTED_READERS = ['ACR122U', 'SCL3711', 'OmniKey', 'Feitian', 'NXP', 'SpringCard', 'Bit4ID']
const TAG_TYPES = ['NTAG213', 'NTAG215', 'NTAG216', 'Mifare Classic']
const AGENT_RELEASES_URL = 'https://github.com/Coding252/spoolhub/releases/latest'

type DownloadPhase = 'idle' | 'waiting' | 'error'

function NfcPulse({ scanning }: { scanning: boolean }) {
  return (
    <div className={`${styles.nfc} ${scanning ? styles.nfcScanning : ''}`}>
      <span className={styles.ring} />
      <span className={styles.ring} />
      <span className={styles.ring} />
      <NfcIcon className={styles.nfcIcon} />
    </div>
  )
}

function SupportedReaders() {
  const { t } = useTranslation()
  return (
    <div className={styles.supportedWrap}>
      <p className={styles.supportedLabel}>{t('scan.supportedReaders')}</p>
      <div className={styles.readerGrid}>
        {SUPPORTED_READERS.map(name => (
          <div key={name} className={styles.readerChip}>
            <span className={styles.chipName}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export interface ScanDesktopProps {
  /** Called whenever a tag UID resolves — from a real reader scan or manual entry. */
  onTagFound: (uid: string) => void
  /** True while the caller is looking up the last found UID (e.g. awaiting a spool lookup). */
  isLookingUp?: boolean
  /** Set to show the ScanResult overlay instead of the idle scanning UI. */
  resultStatus?: 'unknown' | 'error' | null
  resultErrorMessage?: string | null
  onRetryResult?: () => void
}

/**
 * Self-contained "connect a USB NFC reader and scan a tag" card.
 * Renders every connection stage (install agent / no reader / agent offline /
 * connecting / connected-and-ready) driven by useAgentNfc. Shared between the
 * Scan Tag page and the Add Spool NFC step so both present the same design.
 */
export default function ScanDesktop({
  onTagFound,
  isLookingUp = false,
  resultStatus = null,
  resultErrorMessage = null,
  onRetryResult,
}: ScanDesktopProps) {
  const { t } = useTranslation()
  const [dlPhase, setDlPhase] = useState<DownloadPhase>('idle')
  const [showHelp, setShowHelp] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualUid, setManualUid] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleFound = useCallback((uid: string) => {
    setShowHelp(false)
    onTagFound(uid)
  }, [onTagFound])

  const { state, readerName, reload, dismissInstallPrompt, disconnect } = useAgentNfc(handleFound)

  useEffect(() => {
    if (state === 'ready' || state === 'no-reader') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [state])
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleDownload = useCallback(() => {
    window.open(AGENT_RELEASES_URL, '_blank', 'noopener,noreferrer')
    setDlPhase('waiting')
    pollRef.current = setInterval(() => reload(), 2000)
  }, [reload])

  function handleManualScan() {
    const uid = manualUid.trim()
    if (!uid) return
    setManualUid('')
    setShowManual(false)
    handleFound(uid)
  }

  function renderStage() {
    /* Install prompt */
    if (state === 'install-prompt') {
      return (
        <div className={styles.stageBody}>
          <div className={`${styles.nfc} ${styles.nfcError}`}>
            <UsbOffIcon className={styles.nfcIcon} />
          </div>
          <div className={styles.installDialog}>
            <p className={styles.installTitle}>{t('scan.agentRequired')}</p>
            <p className={styles.installDesc}>{t('scan.agentRequiredDesc')}</p>
            {dlPhase === 'idle' && (
              <div className={styles.installActions}>
                <button onClick={handleDownload} className={`${styles.btn} ${styles.btnAccent}`}>{t('scan.downloadAgent')}</button>
                <button onClick={() => dismissInstallPrompt(false)} className={styles.btn}>{t('scan.cancel')}</button>
              </div>
            )}
            {dlPhase === 'waiting' && (
              <div className={styles.searchingRow}>
                <div className={styles.spinner} />
                <p className={styles.noticeTitle}>{t('scan.waitingForAgent')}</p>
              </div>
            )}
            {dlPhase === 'error' && (
              <div className={styles.installActions}>
                <p className={styles.dlError}>{t('scan.downloadFailed')}</p>
                <button onClick={handleDownload} className={`${styles.btn} ${styles.btnAccent}`}>{t('scan.retry')}</button>
              </div>
            )}
          </div>
        </div>
      )
    }

    /* Ready — scan result */
    if (state === 'ready' && resultStatus) {
      return (
        <div className={`${styles.stageBody} ${styles.fullWidth}`}>
          <ScanResult
            status={resultStatus}
            errorMessage={resultErrorMessage}
            onRetry={onRetryResult}
          />
        </div>
      )
    }

    /* Ready — troubleshoot help view */
    if (state === 'ready' && showHelp) {
      return (
        <div className={styles.stageBody}>
          <div className={`${styles.nfc} ${styles.nfcError}`}>
            <UsbOffIcon className={styles.nfcIcon} />
          </div>
          <div className={styles.noreader}>
            <p className={styles.nrTitle}>{t('scan.nrTitle')}</p>
            <p className={styles.nrDesc}>{t('scan.nrDesc')}</p>
            <ol className={styles.nrList}>
              <li>{t('scan.nrStep1')}</li>
              <li>{t('scan.nrStep2')}</li>
              <li>{t('scan.nrStep3')}</li>
            </ol>
            <div className={styles.nrBtns}>
              <button className={styles.btn} onClick={() => { setShowHelp(false); setShowManual(true) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="16" height="16">
                  <rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>
                </svg>
                {t('scan.enterIdManually')}
              </button>
              <button className={`${styles.btn} ${styles.btnAccent}`} onClick={() => { setShowHelp(false); reload() }}>
                <ReloadIcon className={styles.reloadIcon} />
                {t('scan.reload')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    /* Ready — scanning / looking-up */
    if (state === 'ready') {
      return (
        <>
          <div className={styles.stageHeader}>
            <span className={styles.statusDot} />
            <span className={styles.statusText}>{t('scan.readerConnectedStatus')}</span>
          </div>

          <div className={styles.stageBody}>
            <NfcPulse scanning />
            <div className={styles.scanhint}>
              <p className={styles.scanhintTitle}>
                {isLookingUp ? t('scan.lookingUp') : t('scan.tapToScan')}
              </p>
              <p className={styles.scanhintDesc}>{t('scan.scanHintDesc')}</p>

              {!isLookingUp && (
                <>
                  {showManual && (
                    <div className={styles.manualEntry}>
                      <input
                        className={styles.manualInput}
                        value={manualUid}
                        onChange={e => setManualUid(e.target.value)}
                        placeholder={t('scan.manualUidPlaceholder')}
                        onKeyDown={e => e.key === 'Enter' && handleManualScan()}
                        autoFocus
                      />
                      <div className={styles.manualBtns}>
                        <button className={styles.btnCancel}
                          onClick={() => { setShowManual(false); setManualUid('') }}>
                          {t('scan.cancel')}
                        </button>
                        <button className={`${styles.btn} ${styles.btnAccent}`} onClick={handleManualScan}>
                          {t('scan.scanUid')}
                        </button>
                      </div>
                    </div>
                  )}
                  {!showManual && (
                    <button className={styles.scanTrouble} onClick={() => setShowHelp(true)}>
                      {t('scan.readerNotWorking')}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={styles.footerRow}>
            <div className={styles.footerDevice}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={styles.deviceInfoIcon}>
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
              <span className={styles.deviceLabel}>{t('scan.deviceLabel')}</span>
              <span className={styles.deviceName}>{readerName ?? '—'}</span>
            </div>
            <button className={styles.btnDisconnect} onClick={disconnect}>
              <UsbOffIcon className={styles.disconnectIcon} />
              {t('scan.disconnect')}
            </button>
          </div>

          <div className={styles.stageTagTypes}>
            <p className={styles.tagTypesLabel}>{t('scan.readingTagTypes')}</p>
            <div className={styles.readerGrid}>
              {TAG_TYPES.map(name => (
                <div key={name} className={styles.readerChip}>
                  <span className={styles.chipName}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )
    }

    /* No reader */
    if (state === 'no-reader') {
      return (
        <div className={styles.stageBody}>
          <div className={`${styles.nfc} ${styles.nfcError}`}>
            <UsbOffIcon className={styles.nfcIcon} />
          </div>
          <div className={styles.noreader}>
            <p className={styles.nrTitle}>{t('scan.agentNoReader')}</p>
            <p className={styles.nrDesc}>{t('scan.nrDesc')}</p>
            <ol className={styles.nrList}>
              <li>{t('scan.nrStep1')}</li>
              <li>{t('scan.nrStep2')}</li>
              <li>{t('scan.nrStep3')}</li>
            </ol>
            <div className={styles.nrBtns}>
              <button className={styles.btn} onClick={() => setShowManual(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="16" height="16">
                  <rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>
                </svg>
                {t('scan.enterIdManually')}
              </button>
              <button className={`${styles.btn} ${styles.btnAccent}`} onClick={() => reload()}>
                <ReloadIcon className={styles.reloadIcon} />
                {t('scan.reload')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    /* Agent offline */
    if (state === 'agent-offline') {
      return (
        <div className={styles.stageBody}>
          <div className={`${styles.nfc} ${styles.nfcError}`}>
            <UsbOffIcon className={styles.nfcIcon} />
          </div>
          <div className={styles.noreader}>
            <p className={styles.nrTitle}>{t('scan.agentOffline')}</p>
            <p className={styles.nrDesc}>{t('scan.nrDesc')}</p>
            <ol className={styles.nrList}>
              <li>{t('scan.nrStep1')}</li>
              <li>{t('scan.nrStep2')}</li>
              <li>{t('scan.nrStep3')}</li>
            </ol>
            <div className={styles.nrBtns}>
              <button className={`${styles.btn} ${styles.btnAccent}`} onClick={() => reload()}>
                <ReloadIcon className={styles.reloadIcon} />
                {t('scan.reload')}
              </button>
            </div>
          </div>
          <SupportedReaders />
        </div>
      )
    }

    /* Checking / connecting — NFC icon + spinning ring */
    return (
      <div className={styles.stageBody}>
        <div className={styles.connectWrap}>
          <div className={styles.connectRing} />
          <div className={styles.nfc}>
            <NfcIcon className={styles.nfcIcon} />
          </div>
        </div>
        <div className={styles.scanhint}>
          <p className={styles.scanhintTitle}>{t('scan.agentConnecting')}</p>
        </div>
      </div>
    )
  }

  return (
    <section className={styles.scanstage}>
      {renderStage()}
    </section>
  )
}
