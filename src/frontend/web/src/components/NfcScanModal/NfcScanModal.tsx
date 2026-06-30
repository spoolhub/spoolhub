import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { spoolsApi } from '@/api/spools'
import { printersApi } from '@/api/printers'
import { printJobsApi } from '@/api/printJobs'
import { SpoolIcon } from '@/components/icons'
import MaterialTag from '@/components/MaterialTag'
import { BrandLogo } from '@/components/BrandCard'
import PrinterPicker from '@/components/PrinterPicker'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse } from '@/types/printer'
import type { PrintJobResponse } from '@/types/printJob'
import styles from './NfcScanModal.module.css'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)   return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  === 1) return 'Yesterday'
  if (days  < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Props {
  spool: SpoolResponse
  onClose: () => void
}

export default function NfcScanModal({ spool, onClose }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [step, setStep] = useState<'info' | 'assign'>('info')
  const [printers, setPrinters] = useState<PrinterResponse[]>([])
  const [allSpools, setAllSpools] = useState<SpoolResponse[]>([])
  const [printerId, setPrinterId] = useState<string | null>(spool.printerId)
  const [amsSlot, setAmsSlot] = useState<number | null>(spool.amsSlot)
  const [saving, setSaving] = useState(false)
  const [recentJobs, setRecentJobs] = useState<PrintJobResponse[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)

  useEffect(() => {
    printersApi.getAll().then(setPrinters).catch(() => {})
    spoolsApi.getAll().then(setAllSpools).catch(() => {})
    printJobsApi.getBySpool(spool.id)
      .then(jobs => setRecentJobs(jobs.slice(0, 3)))
      .catch(() => {})
      .finally(() => setJobsLoading(false))
  }, [spool.id])

  const occupiedSlots = useMemo(() => {
    if (!printerId) return {}
    const result: Record<number, { colorHex: string; colorName: string; brand: string; material: string }> = {}
    for (const s of allSpools) {
      if (s.printerId === printerId && s.amsSlot != null && s.id !== spool.id) {
        result[s.amsSlot] = { colorHex: s.colorHex, colorName: s.colorName, brand: s.brand, material: s.material }
      }
    }
    return result
  }, [allSpools, printerId, spool.id])

  function goToDetails() {
    navigate(`/spools/${spool.id}`)
    onClose()
  }

  async function handleActivate() {
    setSaving(true)
    try {
      await spoolsApi.activate(spool.id)
      if (printerId) await spoolsApi.assignPrinter(spool.id, { printerId, amsSlot })
      window.dispatchEvent(new CustomEvent('spools-updated'))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const pct = Math.min(100, Math.round((spool.currentWeightG / spool.initialWeightG) * 100))

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.headerCard}>
          <div className={styles.spoolHead}>
            <div className={styles.spoolIconWrap}>
              <SpoolIcon color={spool.colorHex} size={64} />
            </div>
            <div className={styles.spoolInfo}>
              <div className={styles.spoolBrandRow}>
                <BrandLogo brand={spool.brand} size={13} />
                <span className={styles.spoolBrand}>{spool.brand}</span>
              </div>
              <p className={styles.spoolName}>{spool.colorName}</p>
              <div className={styles.spoolTagRow}>
                <span className={styles.spoolHex}>{spool.colorHex}</span>
                <MaterialTag material={spool.material} />
              </div>
              <div className={styles.barWrap}>
                <div className={styles.barHeader}>
                  <span>{Math.round(spool.currentWeightG)}g / {Math.round(spool.initialWeightG)}g</span>
                  <span className={styles.barPct}>{pct}%</span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {step === 'info' && (jobsLoading || recentJobs.length > 0) && (
          <div className={styles.recentSection}>
            <p className={styles.recentLabel}>Recent prints</p>
            {jobsLoading ? (
              <div className={styles.skeletonList}>
                {[0, 1].map(i => <div key={i} className={styles.skeletonRow} />)}
              </div>
            ) : (
              <div className={styles.jobList}>
                {recentJobs.map(job => (
                  <div key={job.id} className={styles.jobRow}>
                    <div className={styles.jobLeft}>
                      <span className={styles.jobName}>{job.printFileName ?? 'Unnamed print'}</span>
                      {job.printerName && <span className={styles.jobPrinter}>{job.printerName}</span>}
                    </div>
                    <div className={styles.jobRight}>
                      {job.gramsUsed > 0 && (
                        <span className={styles.jobGrams}>−{job.gramsUsed.toFixed(1)}g</span>
                      )}
                      <span className={styles.jobTime}>{timeAgo(job.startedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.footer}>
          {step === 'info' && (
            <div className={styles.btnRow}>
              <button onClick={goToDetails} className={styles.btnSecondary}>
                {t('scan.details')}
              </button>
              <button onClick={() => setStep('assign')} className={styles.btnPrimary}>
                {t('scan.activateSpool')}
              </button>
            </div>
          )}

          {step === 'assign' && (
            <div className={styles.assignWrap}>
              <PrinterPicker
                printers={printers}
                value={printerId}
                onChange={v => { setPrinterId(v); if (!v) setAmsSlot(null) }}
                amsSlot={amsSlot}
                onAmsSlotChange={setAmsSlot}
                occupiedSlots={occupiedSlots}
                currentSpoolColor={spool.colorHex}
              />
              <div className={styles.btnRow}>
                <button onClick={() => setStep('info')} className={styles.btnSecondary}>
                  {t('scan.back')}
                </button>
                <button onClick={handleActivate} disabled={saving} className={styles.btnPrimary}>
                  {saving ? '…' : t('scan.activate')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
