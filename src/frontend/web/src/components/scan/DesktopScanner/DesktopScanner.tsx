import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { scanTag } from '@/api/nfc'
import { useAgentNfc } from '@/hooks/useAgentNfc'
import ScanResult from '../ScanResult'
import UsbOffIcon from '@/components/icons/UsbOffIcon'
import NfcIcon from '@/components/icons/NfcIcon'
import ReloadIcon from '@/components/icons/ReloadIcon'
import { SpoolIcon } from '@/components/icons'
import NfcScanModal from '@/components/NfcScanModal'
import type { SpoolResponse } from '@/types/spool'
import styles from './DesktopScanner.module.css'

const SUPPORTED_READERS = ['ACR122U', 'SCL3711', 'OmniKey', 'Feitian', 'NXP', 'SpringCard', 'Bit4ID']
const TAG_TYPES = ['NTAG213', 'NTAG215', 'NTAG216', 'Mifare Classic']
const AGENT_RELEASES_URL = 'https://github.com/Coding252/spoolhub/releases/latest'

type DownloadPhase = 'idle' | 'waiting' | 'error'
type ScanPhase     = 'polling' | 'looking-up' | 'unknown' | 'error'

interface RecentScan {
  uid: string
  spool: SpoolResponse | null
  scannedAt: Date
}

const RECENT_SCANS_KEY = 'spoolhub.recentScans'

function loadRecentScans(): RecentScan[] {
  try {
    const raw = sessionStorage.getItem(RECENT_SCANS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ uid: string; spool: SpoolResponse | null; scannedAt: string }>
    return parsed.map(p => ({ uid: p.uid, spool: p.spool, scannedAt: new Date(p.scannedAt) }))
  } catch {
    return []
  }
}

function saveRecentScans(scans: RecentScan[]) {
  try {
    sessionStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(scans))
  } catch { /* storage unavailable (private browsing, quota, etc.) */ }
}

function formatRelativeTime(date: Date, t: TFunction): string {
  const diffMs   = Date.now() - date.getTime()
  const diffSec  = Math.floor(diffMs / 1_000)
  const diffMin  = Math.floor(diffSec / 60)
  const diffHr   = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)
  if (diffSec < 60)   return t('scan.timeJustNow')
  if (diffMin < 60)   return t('scan.timeMinAgo',   { count: diffMin })
  if (diffHr  < 24)   return t('scan.timeHoursAgo', { count: diffHr })
  if (diffDays === 1) return t('scan.timeYesterday')
  if (diffDays < 7)   return t('scan.timeDayName',  { day: date.toLocaleDateString('en', { weekday: 'short' }) })
  return t('scan.timeDate', { date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }) })
}

/* ── Sub-components ───────────────────────────────────────── */

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

function RecentItem({ scan, onClick, t }: { scan: RecentScan; onClick: () => void; t: TFunction }) {
  const [label, setLabel] = useState(() => formatRelativeTime(scan.scannedAt, t))
  useEffect(() => {
    const id = setInterval(() => setLabel(formatRelativeTime(scan.scannedAt, t)), 15_000)
    return () => clearInterval(id)
  }, [scan.scannedAt, t])

  return (
    <div
      className={styles.recentItem}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className={styles.recentIcon}>
        {scan.spool
          ? <SpoolIcon color={scan.spool.colorHex} size={36} />
          : <NfcIcon className={styles.recentUnknownIcon} />}
      </div>
      <div className={styles.recentInfo}>
        <div className={styles.recentName}>
          {scan.spool ? `${scan.spool.brand} · ${scan.spool.colorName}` : t('scan.unknownTag')}
        </div>
        <div className={styles.recentUidRow}>
          <NfcIcon className={styles.recentUidIcon} />
          <span className={styles.recentUid}>{scan.spool?.nfcTagUid ?? scan.uid}</span>
        </div>
      </div>
      <div className={styles.recentTime}>{label}</div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */

interface Props {
  isHubConnected: boolean
  onUnknownTag?: (tagUid: string) => void
}

export default function DesktopScanner({ onUnknownTag }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [scanPhase,      setScanPhase]      = useState<ScanPhase>('polling')
  const [scanError,      setScanError]      = useState<string | null>(null)
  const [dlPhase,        setDlPhase]        = useState<DownloadPhase>('idle')
  const [recentScans,    setRecentScans]    = useState<RecentScan[]>(loadRecentScans)
  const [drawerSpool,    setDrawerSpool]    = useState<SpoolResponse | null>(null)
  const [showHelp,       setShowHelp]       = useState(false)
  const [showManual,     setShowManual]     = useState(false)
  const [manualUid,      setManualUid]      = useState('')

  useEffect(() => { saveRecentScans(recentScans) }, [recentScans])

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleTagFound = useCallback(async (uid: string) => {
    setShowHelp(false)
    setScanPhase('looking-up')
    try {
      const result = await scanTag(uid)
      if (result.status === 'unknown') {
        setRecentScans(prev => [{ uid, spool: null, scannedAt: new Date() }, ...prev].slice(0, 20))
        if (onUnknownTag) onUnknownTag(uid)
        else setScanPhase('unknown')
      } else if (result.spool) {
        setScanPhase('polling')
        setRecentScans(prev => [{ uid, spool: result.spool!, scannedAt: new Date() }, ...prev].slice(0, 20))
        if (result.spool.isActive) {
          navigate(`/spools/${result.spool.id}`)
        } else {
          setDrawerSpool(result.spool)
        }
      }
    } catch {
      setScanError(t('scan.errorLookup'))
      setScanPhase('error')
    }
  }, [navigate, onUnknownTag, t])

  const { state, readerName, reload, dismissInstallPrompt, disconnect } = useAgentNfc(handleTagFound)

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

  function retryScan() { setScanPhase('polling'); setScanError(null) }

  function handleManualScan() {
    const uid = manualUid.trim()
    if (!uid) return
    setManualUid('')
    setShowManual(false)
    handleTagFound(uid)
  }

  /* ── Shared recent-scans rail ───────────────────────────── */
  function renderRail() {
    return (
      <aside className={styles.rail}>
        <div className={styles.railHead}>
          <h2 className={styles.railTitle}>{t('scan.recentScans')}</h2>
          {recentScans.length > 0 && (
            <span className={styles.railCount}>{recentScans.length}</span>
          )}
        </div>
        <div className={styles.recentList}>
          {recentScans.length === 0 ? (
            <div className={styles.railEmpty}>{t('scan.noScansYet')}</div>
          ) : (
            recentScans.map((scan, i) => (
              <RecentItem
                key={i}
                scan={scan}
                onClick={() => {
                  if (scan.spool) setDrawerSpool(scan.spool)
                  else navigate(`/spools/add/nfctag?tagUid=${encodeURIComponent(scan.uid)}`)
                }}
                t={t}
              />
            ))
          )}
        </div>
      </aside>
    )
  }

  /* ── Stage content (varies by state) ───────────────────── */
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
    if (state === 'ready' && (scanPhase === 'unknown' || scanPhase === 'error')) {
      return (
        <div className={`${styles.stageBody} ${styles.fullWidth}`}>
          <ScanResult
            status={scanPhase as 'unknown' | 'error'}
            errorMessage={scanError}
            onRetry={retryScan}
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
      const isLookingUp = scanPhase === 'looking-up'
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

  /* ── Two-column grid layout ─────────────────────────────── */
  return (
    <>
      <div className={styles.scanwrap}>
        {/* Left: scan stage */}
        <section className={styles.scanstage}>
          {renderStage()}
        </section>

        {/* Right: recent scans rail */}
        {renderRail()}
      </div>

      {drawerSpool && (
        <NfcScanModal spool={drawerSpool} onClose={() => setDrawerSpool(null)} />
      )}
    </>
  )
}
