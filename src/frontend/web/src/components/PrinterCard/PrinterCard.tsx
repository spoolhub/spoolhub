import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { getPrinterImage } from '@/utils/printerImages'
import { getPrinterStatusClass, getPrinterStatusLabel } from '@/utils/printerStatus'
import { SpoolIcon } from '@/components/icons'
import type { PrinterResponse, PrinterStatus } from '@/types/printer'
import type { SpoolResponse } from '@/types/spool'
import styles from './PrinterCard.module.css'

const PLUS = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
)

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.chevron}${open ? ` ${styles.chevronOpen}` : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function BrandFavicon({ brand }: { brand: string }) {
  const domainMap: Record<string, string> = { 'Bambu Lab': 'bambulab.com', Prusa: 'prusa3d.com' }
  const domain = domainMap[brand] ?? ''
  if (!domain) {
    return (
      <span className={`${styles.blogo} ${styles.fb}`}>
        <b>{brand[0]}</b>
      </span>
    )
  }
  return (
    <span className={styles.blogo}>
      <img
        src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
        alt=""
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement?.classList.add(styles.fb) }}
      />
      <b>{brand[0]}</b>
    </span>
  )
}

export default function PrinterCard({ printer, spools, status, onSpoolClick, onOpenDetail }: { printer: PrinterResponse; spools: SpoolResponse[]; status?: PrinterStatus | null; onSpoolClick?: (spool: SpoolResponse) => void; onOpenDetail?: (printer: PrinterResponse) => void }) {
  const [expanded, setExpanded] = useState(false)
  const imgSrc = getPrinterImage(printer.brand, printer.model)

  const openSpool = (s: SpoolResponse) => (e: MouseEvent) => {
    if (onSpoolClick) { e.preventDefault(); e.stopPropagation(); onSpoolClick(s) }
  }

  const stLabel = getPrinterStatusLabel(status)
  const stClass = getPrinterStatusClass(status)
  const isRunning = status?.gcodeState?.toUpperCase() === 'RUNNING'
  const isPaused = status?.gcodeState?.toUpperCase() === 'PAUSE'
  const progressPct = status?.progressPercent ?? 0

  // Resolve tray spools
  const traySpoolIds = [printer.tray1Spool?.id, printer.tray2Spool?.id, printer.tray3Spool?.id, printer.tray4Spool?.id]
  const amsSlots: (SpoolResponse | null)[] = printer.hasAms
    ? traySpoolIds.map(sid => sid ? (spools.find(s => s.id === sid) ?? null) : null)
    : []

  const singleSpool = !printer.hasAms
    ? (printer.extraSpool ? (spools.find(s => s.id === printer.extraSpool!.id) ?? null) : null)
    : null
  const loadedCount = amsSlots.filter(Boolean).length

  let body: React.ReactNode

  if (printer.hasAms) {
    body = (
      <>
        {/* Compact: AMS tag + count + chevron */}
        <button
          type="button"
          className={styles.spoolToggle}
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
        >
          <div className={styles.spoolInfo}>
            <span className={styles.amstag}>AMS</span>
            <span className={styles.spoolCount}>{loadedCount} of 4 loaded</span>
            <div className={styles.iconRow}>
              {amsSlots.map((slot, i) => (
                <span key={i} className={styles.iconChip}>
                  {slot ? <Link to={`/spools/${slot.id}`} onClick={openSpool(slot)}><SpoolIcon color={slot.colorHex} size={18} /></Link> : <span className={styles.emptyDot}>{PLUS}</span>}
                </span>
              ))}
            </div>
          </div>
          <Chevron open={expanded} />
        </button>

        {/* Expanded tray grid */}
        {expanded && (
          <div className={styles.ams}>
            {amsSlots.map((slot, i) => {
              const selectTo = `/spools/select?printerId=${printer.id}&amsSlot=${i + 1}`
              return (
                <Link
                  key={i}
                  to={slot ? `/spools/${slot.id}` : selectTo}
                  className={slot ? styles.tray : `${styles.tray} ${styles.empty}`}
                  onClick={slot ? openSpool(slot) : undefined}
                >
                  <span className={styles.slotn}>{i + 1}</span>
                  <div className={styles.ti}>
                    {slot ? <SpoolIcon color={slot.colorHex} size={24} /> : PLUS}
                  </div>
                  <span className={styles.tn}>{slot ? slot.colorName : 'Empty'}</span>
                  {slot && (() => {
                    const pct = slot.initialWeightG > 0 ? Math.round((slot.currentWeightG / slot.initialWeightG) * 100) : 0
                    const col = pct > 30 ? 'var(--accent)' : pct > 10 ? 'oklch(0.65 0.17 30)' : '#ef4444'
                    return (
                      <span className={styles.trayBar}>
                        <span className={styles.spoolBar}>
                          <span className={styles.spoolBarFill} style={{ width: `${pct}%`, backgroundColor: col }} />
                        </span>
                        <span className={styles.spoolBarPct}>{pct}%</span>
                      </span>
                    )
                  })()}
                </Link>
              )
            })}
          </div>
        )}
      </>
    )
  } else {
    // EXTRA: same expand/collapse pattern as AMS
    const extraCount = singleSpool ? 1 : 0
    const pct = singleSpool?.initialWeightG ? Math.round((singleSpool.currentWeightG / singleSpool.initialWeightG) * 100) : 0
    const barColor = pct > 30 ? 'var(--accent)' : pct > 10 ? 'oklch(0.65 0.17 30)' : '#ef4444'
    const selectTo = `/spools/select?printerId=${printer.id}`
    body = (
      <>
        {/* Compact: EXTRA tag + count + icon + chevron */}
        <button type="button" className={styles.spoolToggle} onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
          <div className={styles.spoolInfo}>
            <span className={styles.amstag}>EXTRA</span>
            <span className={styles.spoolCount}>{extraCount} assigned</span>
            <div className={styles.iconRow}>
              {singleSpool
                ? <span className={styles.iconChip}><SpoolIcon color={singleSpool.colorHex} size={18} /></span>
                : <span className={styles.emptyDot}>{PLUS}</span>}
            </div>
          </div>
          <Chevron open={expanded} />
        </button>

        {/* Expanded tray */}
        {expanded && (
          <div className={styles.ams}>
            {singleSpool
              ? (
                <Link to={`/spools/${singleSpool.id}`} className={`${styles.tray} ${styles.single}`} onClick={openSpool(singleSpool)}>
                  <div className={styles.ti}><SpoolIcon color={singleSpool.colorHex} size={28} /></div>
                  <span className={styles.tn}>{singleSpool.colorName} &middot; {singleSpool.material}</span>
                  <span className={styles.trayBar}>
                    <span className={styles.spoolBar}>
                      <span className={styles.spoolBarFill} style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </span>
                    <span className={styles.spoolBarPct}>{pct}%</span>
                  </span>
                </Link>
              )
              : (
                <Link to={selectTo} className={`${styles.tray} ${styles.empty} ${styles.single}`}>
                  <div className={styles.ti}>{PLUS}</div>
                  <span className={styles.tn}>No spool &mdash; assign one</span>
                </Link>
              )}
          </div>
        )}
      </>
    )
  }

  return (
    <div className={styles.card} onClick={() => onOpenDetail?.(printer)}>
      <div className={styles.phead}>
        <div className={styles.pphoto}>
          {imgSrc && <img className={styles.pimg} src={imgSrc} alt={printer.model} onError={e => { e.currentTarget.remove() }} />}
        </div>
        <div className={styles.pinfo}>
          <div className={styles.brandrow}>
            <BrandFavicon brand={printer.brand} />
            {printer.brand}
          </div>
          <div className={styles.pname}>{printer.name}</div>
          <div className={styles.pmodel}>{printer.model}</div>
          <span className={`${styles.pstatus} ${styles[stClass]}`}><i></i>{stLabel}</span>
        </div>
      </div>
      <div className={`${styles.pprog}${(isRunning || isPaused) ? '' : ` ${styles.pprogHidden}`}`}>
        <div className={styles.pprogtrack}>
          <div className={`${styles.pprogfill}${isPaused ? ` ${styles.pprogfillPaused}` : ''}`} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={styles.pprogmeta}>
          <span>{isPaused ? 'Paused' : (status?.subtaskName || 'Printing')}</span>
          <span className={`${styles.pprogmetaPct}${isPaused ? ` ${styles.pprogmetaPctPaused}` : ''}`}>{progressPct}%</span>
        </div>
      </div>
      <div className={styles.bodyWrap} onClick={e => e.stopPropagation()}>
        {body}
      </div>
    </div>
  )
}
