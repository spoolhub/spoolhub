import { useState, useEffect, type MouseEvent } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { printersApi } from '@/api/printers'
import { printJobsApi } from '@/api/printJobs'
import { getPrinterImage } from '@/utils/printerImages'
import { getPrinterStatusClass, getPrinterStatusLabel } from '@/utils/printerStatus'
import { SpoolIcon } from '@/components/icons'
import { BrandLogo } from '@/components/BrandCard'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'
import type { PrintJobResponse } from '@/types/printJob'
import styles from './PrinterDrawer.module.css'

const PLUS = (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
)
const NOZZLE_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7,2H17V7H19V13H16.5L13,17H11L7.5,13H5V7H7V2M10,22H2V20H10A1,1 0 0,0 11,19V18H13V19A3,3 0 0,1 10,22M7,9V11H8.5L12,15L15.5,11H17V9H15V4H9V9H7Z"/>
  </svg>
)
const BED_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="4" rx="1"/>
    <path d="M6 8c.5-1 1.5-1 2 0s1.5 1 2 0M14 8c.5-1 1.5-1 2 0s1.5 1 2 0"/>
    <path d="M4.5 18.5h15"/>
  </svg>
)

function jobDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return isToday ? `Today, ${time}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function jobDuration(job: PrintJobResponse) {
  if (!job.finishedAt) return '—'
  const ms = new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()
  return ms < 3_600_000 ? `${Math.round(ms / 60_000)}m` : `${Math.floor(ms / 3_600_000)}h ${Math.round((ms % 3_600_000) / 60_000)}m`
}

function jobRowClass(job: PrintJobResponse) {
  if (job.status === 'finished') return styles.done
  if (job.status === 'failed') return styles.failed
  if (job.status === 'running' || job.status === 'paused') return styles.printing
  return ''
}

interface Props {
  printer: PrinterResponse
  spools: SpoolResponse[]
  status?: PrinterStatus | null
  onClose: () => void
  onSpoolClick?: (spool: SpoolResponse) => void
  onDisconnected?: (id: string) => void
  onTrayAssigned?: () => void
}

export default function PrinterDrawer({ printer, spools, status, onClose, onSpoolClick, onDisconnected, onTrayAssigned }: Props) {
  const { t } = useTranslation()
  const [jobs, setJobs] = useState<PrintJobResponse[]>([])
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [assigningSlot, setAssigningSlot] = useState<number | null>(null)
  const [assigningExtra, setAssigningExtra] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    printJobsApi.getByPrinter(printer.id).then(j => { if (!cancelled) setJobs(j) }).catch(() => {})
    return () => { cancelled = true }
  }, [printer.id])

  useBodyScrollLock()

  const imgSrc = getPrinterImage(printer.brand, printer.model)
  const stLabel = getPrinterStatusLabel(status)
  const stClass = getPrinterStatusClass(status)
  const isRunning = status?.gcodeState?.toUpperCase() === 'RUNNING'
  const isPaused = status?.gcodeState?.toUpperCase() === 'PAUSE'
  const isActive = isRunning || isPaused
  const progressPct = status?.progressPercent ?? 0

  const eta = status && status.remainingMinutes > 0
    ? new Date(new Date(status.updatedAt).getTime() + status.remainingMinutes * 60_000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null

  const traySpoolIds = [printer.tray1Spool?.id, printer.tray2Spool?.id, printer.tray3Spool?.id, printer.tray4Spool?.id]
  const amsSlots: (SpoolResponse | null)[] = printer.hasAms
    ? traySpoolIds.map(sid => sid ? (spools.find(s => s.id === sid) ?? null) : null)
    : []
  const singleSpool = !printer.hasAms
    ? (printer.extraSpool ? (spools.find(s => s.id === printer.extraSpool!.id) ?? null) : null)
    : null
  const loadedCount = amsSlots.filter(Boolean).length

  const openSpool = (s: SpoolResponse) => (e: MouseEvent) => {
    if (onSpoolClick) { e.preventDefault(); e.stopPropagation(); onSpoolClick(s) }
  }

  const traySpoolIdsSet = new Set(traySpoolIds.filter(Boolean))
  const availableSpools = spools.filter(s => !traySpoolIdsSet.has(s.id))

  const handleAssignSlot = (slot: number) => {
    setAssigningSlot(slot)
    setAssigningExtra(false)
  }

  const handleAssignExtra = () => {
    setAssigningExtra(true)
    setAssigningSlot(null)
  }

  const handleSelectSpoolForSlot = async (slot: number, spoolId: string) => {
    setAssigningId(spoolId)
    try {
      await printersApi.assignTraySpool(printer.id, slot + 1, spoolId)
      setAssigningSlot(null)
      onTrayAssigned?.()
    } finally {
      setAssigningId(null)
    }
  }

  const handleSelectSpoolForExtra = async (spoolId: string) => {
    setAssigningId(spoolId)
    try {
      await printersApi.assignExtraSpool(printer.id, spoolId)
      setAssigningExtra(false)
      onTrayAssigned?.()
    } finally {
      setAssigningId(null)
    }
  }

  const showPicker = assigningSlot !== null || assigningExtra

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await printersApi.remove(printer.id)
      onDisconnected?.(printer.id)
      onClose()
    } finally {
      setDisconnecting(false)
      setConfirmDisconnect(false)
    }
  }

  return (
    <>
      <div className={`${styles.scrim} ${styles.scrimOn}`} onClick={onClose} />
      <aside className={`${styles.drawer} ${styles.drawerOn}`}>
        <div className={styles.pdfixed}>
          <div className={styles.pdtop}>
            <h2>{showPicker ? t('printerDetail.selectSpool') : t('printerDetail.title')}</h2>
            <button className={styles.pdclose} onClick={() => {
              if (showPicker) { setAssigningSlot(null); setAssigningExtra(false) }
              else onClose()
            }} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </div>

          {!showPicker && (
            <>
              <div className={styles.pdheroband}>
                <div className={styles.pdhero}>
                  {imgSrc && <img className={styles.pimg} src={imgSrc} alt={printer.model} onError={e => { e.currentTarget.remove() }} />}
                </div>
                <div className={styles.pdherotext}>
                  <div className={styles.pdbrandrow}><BrandLogo brand={printer.brand} size={14} />{printer.brand}</div>
                  <div className={styles.pdname}>{printer.name}</div>
                  <div className={styles.pdmodel}>{printer.model}</div>
                  <div className={styles.pdstatusrow}>
                    <span className={`${styles.pstatus} ${styles[stClass]}`}><i></i>{stLabel}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.pdbody}>
          {showPicker ? (
            <div className={styles.pickerDrawer}>
              {assigningId ? (
                <div className={styles.pickerLoading}>{t('common.loading')}…</div>
              ) : availableSpools.length === 0 ? (
                <div className={styles.pickerEmpty}>{t('printerDetail.noSpoolsAvailable')}</div>
              ) : (
                <div className={styles.pickerList}>
                  {availableSpools.map(s => {
                    const handlePick = assigningSlot !== null
                      ? () => handleSelectSpoolForSlot(assigningSlot, s.id)
                      : () => handleSelectSpoolForExtra(s.id)
                    return (
                      <button key={s.id} className={styles.pickerItem} onClick={handlePick}>
                        <SpoolIcon color={s.colorHex} size={22} />
                        <div className={styles.pickerItemInfo}>
                          <div className={styles.pickerItemName}>{s.colorName}</div>
                          <div className={styles.pickerItemMeta}>{s.brand} · {s.material} · {s.currentWeightG}g</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <div className={styles.pdsec}>{t('printerDetail.sectionCurrentJob')}</div>
                {isActive ? (
                  <div className={styles.pdjob}>
                    <div className={styles.jname}>{status?.subtaskName ?? t('printerDetail.unnamed')}</div>
                    <div className={styles.pprogtrack}><div className={`${styles.pprogfill}${isPaused ? ` ${styles.pprogfillPaused}` : ''}`} style={{ width: `${progressPct}%` }} /></div>
                    <div className={styles.jmeta}>
                      {status && status.totalLayerNum > 0 && <span>{t('printerDetail.labelLayer')} <b>{status.layerNum}/{status.totalLayerNum}</b></span>}
                      {eta && <span>ETA <b>{eta}</b></span>}
                      <span><b>{progressPct}%</b></span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.pdnone}>{t('printerDetail.noActiveJob')}</div>
                )}
              </div>

              <div>
                <div className={styles.pdsec}>{t('printerDetail.sectionDetails')}</div>
                <div className={styles.pdgrid}>
                  <div className={styles.pdtemp}>
                    <span className={styles.ic}>{NOZZLE_ICON}</span>
                    <div><div className={styles.v}>{status && status.nozzleTempC > 0 ? `${status.nozzleTempC}°C` : '—'}</div><div className={styles.l}>{t('printerDetail.labelNozzle')}</div></div>
                  </div>
                  <div className={styles.pdtemp}>
                    <span className={styles.ic}>{BED_ICON}</span>
                    <div><div className={styles.v}>{status && status.bedTempC > 0 ? `${status.bedTempC}°C` : '—'}</div><div className={styles.l}>{t('printerDetail.labelBed')}</div></div>
                  </div>
                  {printer.serialNumber && (
                    <div className={styles.pdinfo}>
                      <span className={styles.pdinfoLabel}>{t('printerDetail.labelSerialNumber')}</span>
                      <span className={styles.pdinfoValue}>{printer.serialNumber}</span>
                    </div>
                  )}
                  <div className={styles.pdinfo}>
                    <span className={styles.pdinfoLabel}>{t('printerDetail.labelIpAddress')}</span>
                    <span className={styles.pdinfoValue}>{printer.ipAddress}{printer.port ? `:${printer.port}` : ''}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className={styles.pdsec}>
                  {printer.hasAms ? `AMS · ${t('printerCard.amsLoaded', { count: loadedCount })}` : t('printerDetail.sectionSpool')}
                </div>
                {printer.hasAms ? (
                  <div className={styles.ams}>
                    {amsSlots.map((slot, i) => (
                      <div key={i}>
                        {slot ? (
                          <Link to={`/spools/${slot.id}`} className={styles.tray} onClick={openSpool(slot)}>
                            <span className={styles.slotn}>{i + 1}</span>
                            <div className={styles.ti}><SpoolIcon color={slot.colorHex} size={20} /></div>
                            <span className={styles.tn}>{slot.colorName}</span>
                          </Link>
                        ) : (
                          <button className={`${styles.tray} ${styles.empty} ${styles.trayBtn}`} onClick={() => handleAssignSlot(i)}>
                            <span className={styles.slotn}>{i + 1}</span>
                            <div className={styles.ti}>{PLUS}</div>
                            <span className={styles.tn}>{t('printerDetail.empty')}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {singleSpool ? (
                      <Link to={`/spools/${singleSpool.id}`} className={`${styles.tray} ${styles.single}`} onClick={openSpool(singleSpool)}>
                        <div className={styles.ti}><SpoolIcon color={singleSpool.colorHex} size={24} /></div>
                        <span className={styles.tn}>{singleSpool.colorName} &middot; {singleSpool.material}</span>
                      </Link>
                    ) : (
                      <button className={`${styles.tray} ${styles.empty} ${styles.single} ${styles.trayBtn}`} onClick={handleAssignExtra}>
                        <div className={styles.ti}>{PLUS}</div>
                        <span className={styles.tn}>{t('printerDetail.noSpoolLoaded')}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className={styles.pdsec}>{t('printerDetail.sectionRecentJobs')}</div>
                {jobs.length === 0 ? (
                  <div className={styles.pdnone}>{t('printerDetail.noJobs')}</div>
                ) : (
                  <>
                    <div className={styles.pdjoblist}>
                      {jobs.slice(0, 10).map(job => (
                        <div key={job.id} className={`${styles.pdjobrow} ${jobRowClass(job)}`}>
                          <i></i>
                          <div className={styles.jrMain}>
                            <div className={styles.jrName}>{job.printFileName ?? t('printerDetail.unnamed')}</div>
                            <div className={styles.jrSub}><span>{jobDate(job.finishedAt ?? job.startedAt)}</span><span>{jobDuration(job)}</span></div>
                            {job.filaments.length > 0 && (
                              <div className={styles.jrFilaments}>
                                {job.filaments.map(f => (
                                  <span key={f.id} className={styles.jrFil}>
                                    <SpoolIcon color={f.colorHex ?? '#888'} size={10} />
                                    <span>{f.gramsUsed.toFixed(0)}g{f.slotIndex >= 0 ? ` (S${f.slotIndex + 1})` : ''}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={styles.jrUsed}>{job.gramsUsed.toFixed(1)} g</span>
                        </div>
                      ))}
                    </div>
                    <Link className={styles.pdhistlink} to="/print-history">{t('printerDetail.viewAllHistory')}</Link>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.pdact}>
          {confirmDisconnect ? (
            <>
              <button className={styles.btn} onClick={() => setConfirmDisconnect(false)} disabled={disconnecting}>{t('common.cancel')}</button>
              <button className={`${styles.btn} ${styles.danger}`} onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? t('common.deleting') : t('printerDetail.disconnectConfirmBtn')}
              </button>
            </>
          ) : (
            <button className={`${styles.btn} ${styles.danger}`} onClick={() => setConfirmDisconnect(true)}>
              {t('printerDetail.disconnectPrinter')}
            </button>
          )}
        </div>
      </aside>
    </>
  )
}