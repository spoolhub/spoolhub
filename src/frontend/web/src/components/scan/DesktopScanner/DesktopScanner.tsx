import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { scanTag } from '@/api/nfc'
import { writeAgentTagUrl, appBaseUrl } from '@/hooks/useAgentNfc'
import ScanDesktop from '../ScanDesktop'
import NfcIcon from '@/components/icons/NfcIcon'
import { SpoolIcon } from '@/components/icons'
import NfcScanModal from '@/components/NfcScanModal'
import SpoolDetailDrawer from '@/components/SpoolDetailDrawer'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse } from '@/types/printer'
import styles from './DesktopScanner.module.css'

const S = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const ICONS = {
  trash: <svg {...S}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
  plus: <svg {...S} strokeWidth={2.2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
}

type ScanPhase = 'polling' | 'looking-up' | 'unknown' | 'error'

interface RecentScan {
  uid: string
  spool: SpoolResponse | null
  scannedAt: Date
  /** True when this uid previously resolved to a spool that's since been
   *  unlinked or deleted -- distinct from a tag that was never registered. */
  deleted?: boolean
}

const RECENT_SCANS_KEY = 'spoolhub.recentScans'
const RECENT_SCANS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 1 week

function loadRecentScans(): RecentScan[] {
  try {
    const raw = sessionStorage.getItem(RECENT_SCANS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{ uid: string; spool: SpoolResponse | null; scannedAt: string; deleted?: boolean }>
    const cutoff = Date.now() - RECENT_SCANS_MAX_AGE_MS
    return parsed
      .map(p => ({ uid: p.uid, spool: p.spool, scannedAt: new Date(p.scannedAt), deleted: p.deleted }))
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

function RecentItem({ scan, onClick, onRemove, t }: { scan: RecentScan; onClick: () => void; onRemove: () => void; t: TFunction }) {
  const [label, setLabel] = useState(() => formatRelativeTime(scan.scannedAt, t))
  useEffect(() => {
    const id = setInterval(() => setLabel(formatRelativeTime(scan.scannedAt, t)), 15_000)
    return () => clearInterval(id)
  }, [scan.scannedAt, t])

  const clickable = !scan.deleted

  return (
    <div
      className={`${styles.recentItem}${clickable ? '' : ` ${styles.recentItemStatic}`}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e => e.key === 'Enter' && onClick()) : undefined}
    >
      <div className={styles.recentIcon}>
        {scan.spool
          ? <SpoolIcon color={scan.spool.colorHex} size={36} />
          : scan.deleted
            ? <span className={styles.recentDeletedIcon}>{ICONS.trash}</span>
            : <span className={styles.recentUnknownIcon}>{ICONS.plus}</span>}
      </div>
      <div className={styles.recentInfo}>
        <div className={styles.recentName}>
          {scan.spool ? `${scan.spool.brand} · ${scan.spool.colorName}` : scan.deleted ? t('scan.tagDeleted') : t('scan.unknownTag')}
        </div>
        <div className={styles.recentUidRow}>
          <NfcIcon className={styles.recentUidIcon} />
          <span className={styles.recentUid}>{scan.spool?.nfcTagUid ?? scan.uid}</span>
        </div>
      </div>
      <div className={styles.recentTime}>{label}</div>
      <button
        className={styles.recentRemove}
        onClick={e => { e.stopPropagation(); onRemove() }}
        title={t('scan.removeScan')}
        aria-label={t('scan.removeScan')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16" /><path d="M10 11v6M14 11v6" />
          <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
          <path d="M9 7V4h6v3" />
        </svg>
      </button>
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
  const [, setSearchParams] = useSearchParams()

  const [scanPhase,   setScanPhase]   = useState<ScanPhase>('polling')
  const [scanError,   setScanError]   = useState<string | null>(null)
  const [recentScans, setRecentScans] = useState<RecentScan[]>(loadRecentScans)
  const [drawerSpool, setDrawerSpool] = useState<SpoolResponse | null>(null)
  const [detailSpool, setDetailSpool] = useState<SpoolResponse | null>(null)
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  useEffect(() => { saveRecentScans(recentScans) }, [recentScans])

  useEffect(() => {
    if (!detailSpool) return
    fetch('/api/printers').then(r => r.json()).then(setPrinters).catch(() => {})
  }, [detailSpool])

  const handleTagFound = useCallback(async (uid: string) => {
    setScanPhase('looking-up')
    try {
      const result = await scanTag(uid)
      writeAgentTagUrl(`${appBaseUrl()}/scan?tagUid=${uid}`)
      if (result.status === 'unknown') {
        setRecentScans(prev => [{ uid, spool: null, scannedAt: new Date() }, ...prev].slice(0, 20))
        setSearchParams({ tagUid: uid }, { replace: true })
        if (onUnknownTag) onUnknownTag(uid)
        else setScanPhase('unknown')
      } else if (result.spool) {
        const spool = result.spool
        setRecentScans(prev => [{ uid, spool, scannedAt: new Date() }, ...prev].slice(0, 20))
        setScanPhase('polling')
        setDrawerSpool(spool)
      }
    } catch {
      setScanError(t('scan.errorLookup'))
      setScanPhase('error')
    }
  }, [onUnknownTag, t, setSearchParams])

  function retryScan() { setScanPhase('polling'); setScanError(null); setSearchParams({}, { replace: true }) }

  function handleRemoveScan(uid: string) {
    setRecentScans(prev => prev.filter(s => s.uid !== uid))
  }

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
                onRemove={() => handleRemoveScan(scan.uid)}
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
        <NfcScanModal
          spool={drawerSpool}
          onClose={() => { setDrawerSpool(null); setSearchParams({}, { replace: true }) }}
          onViewDetails={s => { setDrawerSpool(null); setDetailSpool(s); setSearchParams({}, { replace: true }) }}
        />
      )}
      {detailSpool && (
        <SpoolDetailDrawer
          spool={detailSpool}
          printers={printers}
          onClose={() => setDetailSpool(null)}
        />
      )}
    </>
  )
}
