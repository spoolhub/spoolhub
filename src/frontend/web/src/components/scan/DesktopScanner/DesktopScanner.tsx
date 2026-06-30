import { useState, useCallback, useEffect, useRef } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { scanTag } from '@/api/nfc'
import { useAgentNfc } from '@/hooks/useAgentNfc'
import ScanResult from '../ScanResult'
import UsbOffIcon from '@/components/icons/UsbOffIcon'
import NfcIcon from '@/components/icons/NfcIcon'
import ReloadIcon from '@/components/icons/ReloadIcon'
import InfoCircleIcon from '@/components/icons/InfoCircleIcon'

import type { SpoolResponse } from '@/types/spool'
import styles from './DesktopScanner.module.css'

const SUPPORTED_READERS = ['ACR122U', 'SCL3711', 'OmniKey', 'Feitian', 'NXP', 'SpringCard', 'Bit4ID']
const AGENT_RELEASES_URL = 'https://github.com/Coding252/spoolhub/releases/latest'

type DownloadPhase = 'idle' | 'waiting' | 'error'
type ScanPhase     = 'polling' | 'looking-up' | 'unknown' | 'error'

interface LastTag { uid: string; scannedAt: Date }

const STORAGE_KEY = 'spoolhub.lastTag'

function loadLastTag(): LastTag | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { uid: string; scannedAt: string }
    return { uid: parsed.uid, scannedAt: new Date(parsed.scannedAt) }
  } catch { return null }
}

function saveLastTag(tag: LastTag) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ uid: tag.uid, scannedAt: tag.scannedAt.toISOString() }))
}

function useRelativeTime(date: Date | null, t: TFunction): string {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!date) return
    const d = date
    function update() {
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHr = Math.floor(diffMin / 60)
      const diffDays = Math.floor(diffHr / 24)

      if (diffSec < 60) setLabel(t('scan.timeJustNow'))
      else if (diffMin < 60) setLabel(t('scan.timeMinAgo', { count: diffMin }))
      else if (diffHr < 24) setLabel(t('scan.timeHoursAgo', { count: diffHr }))
      else if (diffDays === 1) setLabel(t('scan.timeYesterday'))
      else if (diffDays < 7) {
        const dayName = d.toLocaleDateString('en', { weekday: 'short' })
        setLabel(t('scan.timeDayName', { day: dayName }))
      } else {
        const dateStr = d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
        setLabel(t('scan.timeDate', { date: dateStr }))
      }
    }
    update()
    const id = setInterval(update, 15_000)
    return () => clearInterval(id)
  }, [date, t])
  return label
}

function NfcPulse() {
  return (
    <div className={styles.nfcWrap}>
      <div className={styles.pingRing1} />
      <div className={styles.pingRing2} />
      <div className={styles.pingRing3} />
      <div className={styles.nfcCircle}>
        <NfcIcon className={styles.nfcIcon} />
      </div>
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

interface Props {
  isHubConnected: boolean
  onSpoolFound: (spool: SpoolResponse) => void
  onUnknownTag?: (tagUid: string) => void
}

export default function DesktopScanner({ onSpoolFound, onUnknownTag }: Props) {
  const { t } = useTranslation()
  const [scanPhase, setScanPhase] = useState<ScanPhase>('polling')
  const [scanError, setScanError] = useState<string | null>(null)
  const [dlPhase, setDlPhase] = useState<DownloadPhase>('idle')
  const [lastTag, setLastTag] = useState<LastTag | null>(loadLastTag)
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTagTime                   = useRelativeTime(lastTag?.scannedAt ?? null, t)

  const handleTagFound = useCallback(async (uid: string) => {
    const tag = { uid, scannedAt: new Date() }
    setLastTag(tag)
    saveLastTag(tag)
    setScanPhase('looking-up')
    try {
      const result = await scanTag(uid)
      if (result.status === 'unknown') {
        if (onUnknownTag) onUnknownTag(uid)
        else setScanPhase('unknown')
      } else if (result.spool) {
        setScanPhase('polling')
        onSpoolFound(result.spool)
      }
    } catch {
      setScanError(t('scan.errorLookup'))
      setScanPhase('error')
    }
  }, [onSpoolFound, onUnknownTag, t])

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

  // ── Reader connected ────────────────────────────────────────────────────
  if (state === 'ready') {
    const showResult = scanPhase === 'unknown' || scanPhase === 'error'
    const isLookingUp = scanPhase === 'looking-up'

    return (
      <div className={styles.card}>

        {/* Dark NFC section */}
        <div className={styles.nfcSection}>
          {!showResult ? (
            <>
              <div className={styles.statusRow}>
                <span className={styles.statusDot} />
                <span className={styles.statusText}>{t('scan.readerConnectedStatus')}</span>
              </div>
              <NfcPulse />
              <div className={styles.waitingArea}>
                <p className={styles.waitingTitle}>
                  {isLookingUp ? t('scan.lookingUp') : t('scan.waitingForTag')}
                </p>
                <p className={styles.waitingSubtitle}>{t('scan.holdSpool25cm')}</p>
              </div>
            </>
          ) : (
            <div className={styles.fullWidth}>
              <ScanResult
                status={scanPhase as 'unknown' | 'error'}
                errorMessage={scanError}
                onRetry={retryScan}
              />
            </div>
          )}
        </div>

        {/* Device info / supported tags */}
        <div className={styles.deviceRow}>
          <InfoCircleIcon className={styles.deviceInfoIcon} />
          <div className={styles.deviceInfoBody}>
            <p className={styles.deviceName}>{t('scan.deviceInfo', { name: readerName ?? '—' })}</p>
            <p className={styles.deviceTags}>{t('scan.supportedTagsDesc')}</p>
          </div>
        </div>

        {/* Disconnect */}
        <button className={styles.btnDisconnect} onClick={disconnect}>
          <UsbOffIcon className={styles.disconnectIcon} />
          {t('scan.disconnect')}
        </button>

        {/* Last tag read */}
        {lastTag && (
          <div className={styles.lastTagSection}>
            <p className={styles.lastTagLabel}>{t('scan.lastTagRead')}</p>
            <p className={styles.lastTagValue}>{lastTag.uid} &bull; {lastTagTime}</p>
          </div>
        )}

      </div>
    )
  }

  // ── Install prompt ──────────────────────────────────────────────────────
  if (state === 'install-prompt') {
    return (
      <div className={styles.card}>
        <div className={styles.wrap}>
          <div className={styles.readerCircle}>
            <UsbOffIcon className={styles.readerIcon} />
          </div>
          <div className={styles.installDialog}>
            <p className={styles.installTitle}>{t('scan.agentRequired')}</p>
            <p className={styles.installDesc}>{t('scan.agentRequiredDesc')}</p>

            {dlPhase === 'idle' && (
              <>
                <div className={styles.installActions}>
                  <button onClick={handleDownload} className={styles.btnDownload}>
                    {t('scan.downloadAgent')}
                  </button>
                  <button onClick={() => dismissInstallPrompt(false)} className={styles.btnCancel}>
                    {t('scan.cancel')}
                  </button>
                </div>
              </>
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
                <button onClick={handleDownload} className={styles.btnDownload}>{t('scan.retry')}</button>
              </div>
            )}
          </div>
          <SupportedReaders />
        </div>
      </div>
    )
  }

  // ── Checking / connecting / offline / no-reader ─────────────────────────
  const isSpinning  = state === 'checking' || state === 'connecting'
  const noticeTitle = state === 'no-reader'    ? t('scan.agentNoReader')
                    : state === 'agent-offline' ? t('scan.agentOffline')
                    :                             t('scan.agentConnecting')
  const tips = state === 'agent-offline'
    ? [t('scan.agentTip1'), t('scan.agentTip2')]
    : [t('scan.tip1'), t('scan.tip2'), t('scan.tip3')]

  return (
    <div className={styles.card}>
      <div className={styles.wrap}>
        <div className={styles.readerCircle}>
          <UsbOffIcon className={styles.readerIcon} />
        </div>
        <h1 className={styles.title}>{t('scan.usbNfcReader')}</h1>
        <div className={styles.notice}>
          {isSpinning ? (
            <div className={styles.searchingRow}>
              <div className={styles.spinner} />
              <p className={styles.noticeTitle}>{noticeTitle}</p>
            </div>
          ) : (
            <>
              <p className={styles.noticeTitle}>{noticeTitle}</p>
              <div className={styles.noticeButtons}>
                <button onClick={reload} className={styles.btnReload}>
                  <ReloadIcon className={styles.reloadIcon} />
                  {t('scan.reload')}
                </button>
              </div>
              <ul className={styles.tipList}>
                {tips.map(tip => <li key={tip}>{tip}</li>)}
              </ul>
            </>
          )}
        </div>
        <SupportedReaders />
      </div>
    </div>
  )
}
