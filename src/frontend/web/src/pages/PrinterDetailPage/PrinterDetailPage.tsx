import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { printersApi } from '@/api/printers'
import { spoolsApi } from '@/api/spools'
import { printJobsApi } from '@/api/printJobs'
import { getPrinterImage } from '@/utils/printerImages'
import { SpoolIcon } from '@/components/icons'
import { BrandLogo } from '@/components/BrandCard'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'
import type { PrintJobResponse } from '@/types/printJob'
import styles from './PrinterDetailPage.module.css'

type Translate = (key: string, options?: { count: number }) => string

// Relative calendar day: Today / Yesterday / weekday (within the past week) / exact date
function dayLabel(iso: string, t: Translate, locale: string): string {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((todayStart - dayStart) / 86_400_000)
  if (diffDays <= 0) return t('common.today')
  if (diffDays === 1) return t('common.yesterday')
  if (diffDays <= 6) { const w = d.toLocaleDateString(locale, { weekday: 'long' }); return w.charAt(0).toUpperCase() + w.slice(1) }
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Relative time: "X min/hrs ago" within 24h, otherwise the exact 24h clock time
function relativeTime(iso: string, t: Translate, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 86_400_000) {
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 1) return t('common.justNow')
    if (mins < 60) return t('common.minutesAgo', { count: mins })
    return t('common.hoursAgo', { count: Math.floor(diffMs / 3_600_000) })
  }
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
}

function weightPct(s: SpoolResponse) {
  return s.initialWeightG > 0 ? Math.min(100, Math.round((s.currentWeightG / s.initialWeightG) * 100)) : 0
}

function barColor(hex: string, pct: number) {
  if (pct <= 10) return '#ef4444'
  if (pct <= 30) return '#f59e0b'
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.15 ? '#22d3ee' : hex
}

const PlusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="5" y1="1" x2="5" y2="9" /><line x1="1" y1="5" x2="9" y2="5" />
  </svg>
)

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.chevronIcon}${open ? ` ${styles.chevronOpen}` : ''}`}
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function PrinterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [printer, setPrinter]           = useState<PrinterResponse | null>(null)
  const [spools, setSpools]             = useState<SpoolResponse[]>([])
  const [jobs, setJobs]                 = useState<PrintJobResponse[]>([])
  const [liveStatus, setLiveStatus]     = useState<PrinterStatus | null>(null)
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)

  const [slotOpen, setSlotOpen]         = useState(true)
  const [historyOpen, setHistoryOpen]   = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const [assigning, setAssigning]     = useState(false)

  type LocationPrompt =
    | { spool: SpoolResponse; kind: 'tray'; slot: 1 | 2 | 3 | 4 }
    | { spool: SpoolResponse; kind: 'extra' }

  const [locationPrompt, setLocationPrompt] = useState<LocationPrompt | null>(null)
  const [locationInput, setLocationInput]   = useState('')

  async function handleAssignTray(slot: 1 | 2 | 3 | 4, spoolId: string | null) {
    if (!id) return
    setAssigning(true)
    try {
      const updated = await printersApi.assignTraySpool(id, slot, spoolId)
      setPrinter(updated)
    } finally {
      setAssigning(false)
    }
  }

  async function handleAssignExtra(spoolId: string | null) {
    if (!id) return
    setAssigning(true)
    try {
      const updated = await printersApi.assignExtraSpool(id, spoolId)
      setPrinter(updated)
    } finally {
      setAssigning(false)
    }
  }

  async function confirmUnassign() {
    if (!locationPrompt || !id) return
    const { spool: promptSpool } = locationPrompt
    const loc = locationInput.trim()
    setLocationPrompt(null)
    setLocationInput('')
    if (locationPrompt.kind === 'tray') {
      await handleAssignTray(locationPrompt.slot, null)
    } else {
      await handleAssignExtra(null)
    }
    if (loc) {
      await spoolsApi.update(promptSpool.id, { stockLocation: loc })
    }
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await printersApi.remove(id)
      navigate('/printers')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      printersApi.getById(id),
      spoolsApi.getAll().catch(() => [] as SpoolResponse[]),
      printJobsApi.getByPrinter(id).catch(() => [] as PrintJobResponse[]),
    ])
      .then(([p, s, j]) => { if (!cancelled) { setPrinter(p); setSpools(s); setJobs(j); setLoading(false) } })
      .catch((err: { response?: { status?: number } }) => {
        if (!cancelled) {
          if (err?.response?.status === 404) setNotFound(true)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const poll = () => printersApi.getStatus(id).then(s => { if (!cancelled && s) setLiveStatus(s) }).catch(() => {})
    poll()
    const timer = setInterval(poll, 3000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const timer = setInterval(() => {
      printersApi.getById(id).then(p => { if (!cancelled) setPrinter(p) }).catch(() => {})
    }, 15000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const timer = setInterval(() => {
      printJobsApi.getByPrinter(id).then(j => { if (!cancelled) setJobs(j) }).catch(() => {})
    }, 10_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [id])

  if (loading) {
    return (
      <div className={styles.wrap} data-testid="loading-skeleton">
        <div className={styles.skeletonBack} />
        <div className={styles.skeletonCard} />
      </div>
    )
  }

  if (notFound || !printer) {
    return (
      <div className={styles.notFound}>
        <p className={styles.notFoundText}>{t('printerDetail.notFound')}</p>
      </div>
    )
  }

  const imgSrc = getPrinterImage(printer.brand, printer.model)
  const traySpoolIds = [printer.tray1Spool?.id, printer.tray2Spool?.id, printer.tray3Spool?.id, printer.tray4Spool?.id]
  const amsSlots: (SpoolResponse | null)[] = printer.hasAms
    ? traySpoolIds.map(sid => sid ? (spools.find(s => s.id === sid) ?? null) : null)
    : []
  const singleSpool = !printer.hasAms
    ? (printer.extraSpool ? (spools.find(s => s.id === printer.extraSpool!.id) ?? null) : null)
    : null
  const loadedCount = amsSlots.filter(Boolean).length

  const connectionError = liveStatus?.connectionError ?? null
  const gcodeState = connectionError ? 'IDLE' : (liveStatus?.gcodeState ?? 'IDLE')
  const isActive   = !connectionError && gcodeState !== 'IDLE'

  const stateMeta: Record<string, { label: string; bar: string; textColor: string }> = {
    RUNNING: { label: t('printerDetail.stateRunning'),  bar: '#22c55e', textColor: '#86efac' },
    PAUSE:   { label: t('printerDetail.statePaused'),   bar: '#eab308', textColor: '#fde047' },
    FINISH:  { label: t('printerDetail.stateFinished'), bar: '#38bdf8', textColor: '#38bdf8' },
    FAILED:  { label: t('printerDetail.stateFailed'),   bar: '#ef4444', textColor: '#f87171' },
    IDLE:    { label: t('printerDetail.stateIdle'),     bar: '#6b7280', textColor: 'var(--text-secondary)' },
  }
  const meta = stateMeta[gcodeState] ?? stateMeta.IDLE

  return (
    <div className={styles.wrap}>

      {/* ── Connection error banner ── */}
      {connectionError && (
        <div className={styles.errorBanner}>
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className={styles.errorTitle}>{t('printerDetail.connectionFailed')}</p>
            <p className={styles.errorMsg}>{connectionError}</p>
          </div>
        </div>
      )}

      {/* ── Printer card ── */}
      <div className={styles.printerCard}>

        <div className={styles.printerTop}>

          {/* Image */}
          <div className={styles.printerImgWrap}>
            <img
              src={imgSrc}
              alt={`${printer.brand} ${printer.model}`}
              className={styles.printerImg}
              onError={e => { (e.currentTarget as HTMLImageElement).src = '/printers/generic.svg' }}
            />
            <div className={styles.printerImgFade} />
          </div>

          {/* Info */}
          <div className={styles.printerInfo}>
            <button
              onClick={() => setConfirmDelete(true)}
              className={styles.deleteBtn}
              title={t('printerDetail.deletePrinter')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>

            <div className={styles.brandRow}>
              <BrandLogo brand={printer.brand} size={16} />
              <span className={styles.brandLabel}>{printer.brand}</span>
            </div>

            <div>
              <h1 className={styles.printerName}>{printer.name}</h1>
              <p className={styles.printerModel}>{printer.model}</p>
            </div>

            <span className={styles.stateLabel} style={{ color: meta.textColor }}>
              {meta.label}
            </span>

            {isActive && (
              <div className={styles.printBlock}>
                {liveStatus?.subtaskName && (
                  <p className={styles.subtaskName}>{liveStatus.subtaskName}</p>
                )}
                <div className={styles.progressRow}>
                  <div className={styles.progressTop}>
                    <span className={styles.progressPct} style={{ color: meta.bar }}>
                      {liveStatus?.progressPercent ?? 0}%
                    </span>
                    {(liveStatus?.remainingMinutes ?? 0) > 0 && (
                      <span className={styles.progressTime}>
                        {liveStatus!.remainingMinutes >= 60
                          ? t('printerDetail.hoursLeft', { hours: Math.floor(liveStatus!.remainingMinutes / 60), mins: liveStatus!.remainingMinutes % 60 })
                          : t('printerDetail.minutesLeft', { count: liveStatus!.remainingMinutes })}
                      </span>
                    )}
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${Math.max(2, liveStatus?.progressPercent ?? 0)}%`, backgroundColor: meta.bar }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.divider} />

        {/* Details */}
        <div className={styles.detailsSection}>
          <p className={styles.detailSectionLabel}>{t('printerDetail.sectionDetails')}</p>
          <DetailRow
            label={t('printerDetail.labelIpAddress')}
            value={printer.ipAddress === 'us.mqtt.bambulab.com' ? 'Bambu Cloud' : printer.ipAddress}
          />
          <DetailRow label={t('printerDetail.labelSerialNumber')} value={printer.serialNumber} />
          <DetailRow label={t('printerDetail.labelAdded')}        value={new Date(printer.createdAt).toLocaleDateString()} />
          <DetailRow label={t('printerDetail.labelLayer')}        value={liveStatus && liveStatus.layerNum > 0 ? `${liveStatus.layerNum} / ${liveStatus.totalLayerNum}` : null} />
          <DetailRow label={t('printerDetail.labelNozzle')}       value={liveStatus && liveStatus.nozzleTempC > 0 ? `${liveStatus.nozzleTempC}°C` : null} />
          <DetailRow label={t('printerDetail.labelBed')}          value={liveStatus && liveStatus.bedTempC > 0 ? `${liveStatus.bedTempC}°C` : null} />
        </div>

        {/* ── AMS / Spool accordion ── */}
        {printer.hasAms ? (
          <>
            <button
              onClick={() => { setSlotOpen(o => { if (!o) setHistoryOpen(false); return !o }) }}
              className={styles.accordionBtn}
            >
              <div className={styles.accordionLeft}>
                <span className={styles.sectionLabelAms}>AMS</span>
                <span className={styles.accordionMeta}>{t('printerCard.amsLoaded', { count: loadedCount })}</span>
                <div className={styles.accordionSlots}>
                  {amsSlots.map((slot, i) => (
                    <div key={i} className={styles.accordionSlot} title={slot ? `${slot.colorName} · ${slot.material}` : t('printerDetail.empty')}>
                      {slot
                        ? <SpoolIcon color={slot.colorHex} className="w-full h-full" />
                        : <div className={styles.accordionSlotEmpty} />
                      }
                    </div>
                  ))}
                </div>
              </div>
              <ChevronIcon open={slotOpen} />
            </button>
            {slotOpen && (
              <div className={styles.slotContent}>
                {amsSlots.map((slot, i) => {
                  const slotNum = (i + 1) as 1 | 2 | 3 | 4
                  return slot ? (
                    <div key={i} className={styles.slotRow}>
                      <span className={styles.slotNum}>{slotNum}</span>
                      <Link to={`/spools/${slot.id}`} className={styles.slotSpoolLink}>
                        <div className={styles.slotRowInner}>
                          <div className={styles.slotIcon}><SpoolIcon color={slot.colorHex} className="w-full h-full" /></div>
                          <span className={styles.slotName}>{slot.colorName}</span>
                          <span className={styles.slotMaterial}>{slot.material}</span>
                          <span className={styles.slotPct} style={{ color: barColor(slot.colorHex, weightPct(slot)) }}>{weightPct(slot)}%</span>
                        </div>
                        <div className={styles.slotBar}>
                          <div className={styles.slotBarFill} style={{ width: `${Math.max(3, weightPct(slot))}%`, backgroundColor: barColor(slot.colorHex, weightPct(slot)) }} />
                        </div>
                      </Link>
                      <button className={styles.slotUnassignBtn} onClick={() => { setLocationPrompt({ spool: slot, kind: 'tray', slot: slotNum }); setLocationInput('') }} disabled={assigning} aria-label={t('printerDetail.unassignSpool')}>
                        ×
                      </button>
                    </div>
                  ) : (
                    <div key={i} className={styles.slotRow}>
                      <span className={styles.slotNum}>{slotNum}</span>
                      <Link
                        to={`/spools/select?printerId=${id}&amsSlot=${slotNum}`}
                        className={styles.slotEmptyLink}
                      >
                        <div className={styles.slotEmptyDot}>
                          <div className={styles.slotEmptyIcon}><PlusIcon /></div>
                        </div>
                        <span className={styles.slotEmptyLabel}>{t('printerCard.noSpoolLoaded')}</span>
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => { setSlotOpen(o => { if (!o) setHistoryOpen(false); return !o }) }}
              className={styles.accordionBtn}
            >
              <div className={styles.accordionLeft}>
                <span className={styles.sectionLabelSpool}>{t('printerDetail.sectionSpool')}</span>
                <span className={styles.accordionMeta}>
                  {singleSpool ? t('printerDetail.spoolLoaded', { count: 1 }) : t('printerDetail.noneLoaded')}
                </span>
                {singleSpool && (
                  <div className={styles.accordionSlot}><SpoolIcon color={singleSpool.colorHex} className="w-full h-full" /></div>
                )}
              </div>
              <ChevronIcon open={slotOpen} />
            </button>
            {slotOpen && (
              <div className={styles.slotSingle}>
                {singleSpool ? (
                  <div className={styles.slotRow}>
                    <Link to={`/spools/${singleSpool.id}`} className={styles.slotSpoolLink}>
                      <div className={styles.slotRowInner}>
                        <div className={styles.slotIcon}><SpoolIcon color={singleSpool.colorHex} className="w-full h-full" /></div>
                        <span className={styles.slotName}>{singleSpool.colorName}</span>
                        <span className={styles.slotMaterial}>{singleSpool.material}</span>
                        <span className={styles.slotPct} style={{ color: barColor(singleSpool.colorHex, weightPct(singleSpool)) }}>{weightPct(singleSpool)}%</span>
                      </div>
                      <div className={styles.slotBar}>
                        <div className={styles.slotBarFill} style={{ width: `${Math.max(3, weightPct(singleSpool))}%`, backgroundColor: barColor(singleSpool.colorHex, weightPct(singleSpool)) }} />
                      </div>
                    </Link>
                    <button className={styles.slotUnassignBtn} onClick={() => { setLocationPrompt({ spool: singleSpool, kind: 'extra' }); setLocationInput('') }} disabled={assigning} aria-label={t('printerDetail.unassignSpool')}>
                      ×
                    </button>
                  </div>
                ) : (
                  <Link
                    to={`/spools/select?printerId=${id}`}
                    className={styles.slotEmptyLink}
                  >
                    <div className={styles.slotEmptyDot}>
                      <div className={styles.slotEmptyIcon}><PlusIcon /></div>
                    </div>
                    <span className={styles.slotEmptyLabel}>{t('printerCard.noSpoolLoaded')}</span>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        <div className={styles.divider} />

        {/* ── Print History ── */}
        <button
          onClick={() => { setHistoryOpen(o => { if (!o) setSlotOpen(false); return !o }) }}
          className={styles.accordionBtn}
        >
          <div className={styles.accordionLeft}>
            <span className={styles.sectionLabelHistory}>{t('spoolDetail.sectionPrintHistory')}</span>
            <span className={styles.accordionMeta}>{t('printerDetail.jobs', { count: jobs.length })}</span>
          </div>
          <ChevronIcon open={historyOpen} />
        </button>

        {historyOpen && (
          <div className={styles.slotContent}>
            {jobs.length === 0 ? (
              <p className={styles.historyEmpty}>{t('printerDetail.noJobs')}</p>
            ) : (
              <div className={styles.historyList}>
                {jobs.map(job => {
                  const statusClass =
                    job.status === 'finished'  ? styles.statusFinished  :
                    job.status === 'failed'    ? styles.statusFailed    :
                    job.status === 'cancelled' ? styles.statusCancelled : styles.statusRunning
                  const statusLabel =
                    job.status === 'finished'  ? t('printerDetail.statusFinished')  :
                    job.status === 'failed'    ? t('printerDetail.statusFailed')    :
                    job.status === 'cancelled' ? t('printerDetail.statusCancelled') : t('printerDetail.statusRunning')

                  const durationMs = job.finishedAt
                    ? new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()
                    : null
                  const durationLabel = durationMs != null
                    ? durationMs < 3_600_000
                      ? `${Math.round(durationMs / 60_000)}m`
                      : `${Math.floor(durationMs / 3_600_000)}h ${Math.round((durationMs % 3_600_000) / 60_000)}m`
                    : t('printerDetail.ongoing')

                  const fmt = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, {
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  })
                  const anchorIso = job.finishedAt ?? job.startedAt

                  const isMultiColor = (job.filaments?.length ?? 0) > 1

                  type Pill = { spoolId: string | null; colorHex: string | null; label: string; grams: number }
                  const pills: Pill[] = isMultiColor
                    ? (job.filaments ?? []).map(f => ({
                        spoolId: f.spoolId, colorHex: f.colorHex,
                        label: f.colorName ?? '—', grams: f.gramsUsed,
                      }))
                    : [{
                        spoolId: job.spoolId, colorHex: job.spoolColorHex,
                        label: [job.spoolMaterial, job.spoolColorName].filter(Boolean).join(' · ') || '—',
                        grams: job.gramsUsed,
                      }]

                  return (
                    <div key={job.id} className={styles.historyItem}>
                      <div className={styles.historyHeader}>
                        <p className={styles.historyName}>
                          {job.printFileName ?? <span className={styles.historyNameSkeleton} />}
                        </p>
                        <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
                      </div>

                      <div className={styles.historyRow2}>
                        <div className={styles.filamentPills}>
                          {pills.map((pill, i) => {
                            const content = (
                              <>
                                <SpoolIcon color={pill.colorHex ?? '#888'} className="w-4 h-4 flex-shrink-0" />
                                <span className={styles.pillLabel}>{pill.label}</span>
                                <span className={styles.pillGrams}>{pill.grams.toFixed(1)}g</span>
                              </>
                            )
                            return pill.spoolId ? (
                              <Link key={i} to={`/spools/${pill.spoolId}`} className={styles.pill}>{content}</Link>
                            ) : (
                              <div key={i} className={styles.pill}>{content}</div>
                            )
                          })}
                        </div>
                        <span className={styles.historyDate}>{dayLabel(anchorIso, t, i18n.language)}</span>
                      </div>

                      <div className={styles.historyMeta}>
                        <span>{fmt(job.startedAt)}{job.finishedAt ? ` → ${fmt(job.finishedAt)}` : ''}</span>
                        <span className={styles.historyDot}>·</span>
                        <span>{durationLabel}</span>
                        <span className={styles.historyTime}>{relativeTime(anchorIso, t, i18n.language)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Unassign location prompt ── */}
      {locationPrompt && (
        <div className={styles.locationModal} onClick={() => setLocationPrompt(null)}>
          <div className={styles.locationPanel} onClick={e => e.stopPropagation()}>
            <p className={styles.locationTitle}>{t('printerDetail.locationPromptTitle')}</p>
            <div className={styles.locationSpoolRow}>
              <span className={styles.locationSpoolDot} style={{ backgroundColor: locationPrompt.spool.colorHex }} />
              <span className={styles.locationSpoolName}>
                {locationPrompt.spool.colorName} · {locationPrompt.spool.material}
              </span>
            </div>
            <p className={styles.locationDesc}>{t('printerDetail.locationPromptBody')}</p>
            <input
              type="text"
              value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmUnassign() }}
              placeholder={t('spoolForm.stockLocationPlaceholder')}
              className={styles.locationInput}
              autoFocus
            />
            <div className={styles.locationActions}>
              <button className={styles.locationBtnCancel} onClick={() => setLocationPrompt(null)}>{t('common.cancel')}</button>
              <button className={styles.locationBtnConfirm} onClick={confirmUnassign} disabled={assigning}>{t('printerDetail.locationConfirmBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div className={styles.deleteModal} onClick={() => !deleting && setConfirmDelete(false)}>
          <div className={styles.deletePanel} onClick={e => e.stopPropagation()}>
            <div className={styles.deleteHeader}>
              <div className={styles.deleteIconWrap}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </div>
              <div>
                <p className={styles.deleteTitle}>{t('printerDetail.deletePrinter')}</p>
                <p className={styles.deleteSubtitle}>{printer.name}</p>
              </div>
            </div>
            <p className={styles.deleteConfirmText}>{t('printerDetail.deleteConfirm')}</p>
            <div className={styles.deleteActions}>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className={styles.deleteBtnCancel}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={styles.deleteBtnConfirm}
              >
                {deleting ? t('common.deleting') : t('printerDetail.deleteConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
