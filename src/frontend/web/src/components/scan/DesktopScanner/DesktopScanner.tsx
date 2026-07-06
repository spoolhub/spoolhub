import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { scanTag } from '@/api/nfc'
import ScanDesktop from '../ScanDesktop'
import NfcIcon from '@/components/icons/NfcIcon'
import { SpoolIcon } from '@/components/icons'
import NfcScanModal from '@/components/NfcScanModal'
import type { SpoolResponse } from '@/types/spool'
import styles from './DesktopScanner.module.css'

type ScanPhase = 'polling' | 'looking-up' | 'unknown' | 'error'

interface RecentScan {
  uid: string
  spool: SpoolResponse | null
  scannedAt: Date
}

const RECENT_SCANS_KEY = 'spoolhub.recentScans'
const RECENT_SCANS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 1 week

function loadRecentScans(): RecentScan[] {
  try {
    const raw = sessionStorage.getItem(RECENT_SCANS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ uid: string; spool: SpoolResponse | null; scannedAt: string }>
    const cutoff = Date.now() - RECENT_SCANS_MAX_AGE_MS
    return parsed
      .map(p => ({ uid: p.uid, spool: p.spool, scannedAt: new Date(p.scannedAt) }))
      .filter(s => s.scannedAt.getTime() >= cutoff)
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

  const [scanPhase,   setScanPhase]   = useState<ScanPhase>('polling')
  const [scanError,   setScanError]   = useState<string | null>(null)
  const [recentScans, setRecentScans] = useState<RecentScan[]>(loadRecentScans)
  const [drawerSpool, setDrawerSpool] = useState<SpoolResponse | null>(null)

  useEffect(() => { saveRecentScans(recentScans) }, [recentScans])

  const handleTagFound = useCallback(async (uid: string) => {
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

  function retryScan() { setScanPhase('polling'); setScanError(null) }

  /* ── Recent-scans rail ────────────────────────────────────── */
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

  return (
    <>
      <div className={styles.scanwrap}>
        <ScanDesktop
          onTagFound={handleTagFound}
          isLookingUp={scanPhase === 'looking-up'}
          resultStatus={scanPhase === 'unknown' || scanPhase === 'error' ? scanPhase : null}
          resultErrorMessage={scanError}
          onRetryResult={retryScan}
        />
        {renderRail()}
      </div>

      {drawerSpool && (
        <NfcScanModal spool={drawerSpool} onClose={() => setDrawerSpool(null)} />
      )}
    </>
  )
}
