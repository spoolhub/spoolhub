import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { getPrinterImage } from '@/utils/printerImages'
import { getPrinterStatusClass, getPrinterStatusLabel, isMqttPrinter, isPrinterOnline } from '@/utils/printerStatus'
import { countLoadedAmsTrays, isExtraTrayClickable, isExtraTrayEmptyMqtt, isExtraTrayLoaded, isTrayClickable, isTrayEmptyMqtt, isTrayLoaded, trayRemainPercent } from '@/utils/printerAms'
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

  const stLabel = getPrinterStatusLabel(status, printer.protocol)
  const stClass = getPrinterStatusClass(status, printer.protocol)
  const showConnDot = isMqttPrinter(printer.protocol)
  const connOnline = isPrinterOnline(status ?? null, printer.protocol)
  const isRunning = status?.gcodeState?.toUpperCase() === 'RUNNING'
  const isPaused = status?.gcodeState?.toUpperCase() === 'PAUSE'
  const progressPct = status?.progressPercent ?? 0

  const trayOccupied = [printer.tray1Occupied, printer.tray2Occupied, printer.tray3Occupied, printer.tray4Occupied]
  const traySpoolIds = [printer.tray1Spool?.id, printer.tray2Spool?.id, printer.tray3Spool?.id, printer.tray4Spool?.id]
  const amsSlots: (SpoolResponse | null)[] = printer.hasAms
    ? traySpoolIds.map(sid => sid ? (spools.find(s => s.id === sid) ?? null) : null)
    : []

  const singleSpool = !printer.hasAms
    ? (printer.extraSpool ? (spools.find(s => s.id === printer.extraSpool!.id) ?? null) : null)
    : null
  const loadedCount = countLoadedAmsTrays(trayOccupied, amsSlots)

  let body: React.ReactNode

  if (printer.hasAms) {
    body = (
      <>
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
                  {isTrayLoaded(trayOccupied[i], slot)
                    ? (slot
                        ? <Link to={`/spools/${slot.id}`} onClick={openSpool(slot)}><SpoolIcon color={slot.colorHex} size={18} /></Link>
                        : <span className={styles.loadedDot} />)
                    : <span className={styles.emptyDot}>{PLUS}</span>}
                </span>
              ))}
            </div>
          </div>
          <Chevron open={expanded} />
        </button>

        {expanded && (
          <div className={styles.ams}>
            {amsSlots.map((slot, i) => {
              const selectTo = `/spools/select?printerId=${printer.id}&amsSlot=${i + 1}`
              const loaded = isTrayLoaded(trayOccupied[i], slot)
              const empty = isTrayEmptyMqtt(trayOccupied[i])
              const clickable = isTrayClickable(trayOccupied[i], slot)
              const pct = trayRemainPercent(slot)
              const barCol = pct != null && pct > 30 ? 'var(--accent)' : pct != null && pct > 10 ? 'oklch(0.65 0.17 30)' : '#ef4444'
              const trayClass = `${styles.tray}${loaded ? '' : ` ${styles.empty}`}${empty ? ` ${styles.trayDisabled}` : ''}`

              const inner = (
                <>
                  <span className={styles.slotn}>{i + 1}</span>
                  <div className={styles.ti}>
                    {slot ? <SpoolIcon color={slot.colorHex} size={24} /> : loaded ? <span className={styles.loadedDot} /> : PLUS}
                  </div>
                  <span className={styles.tn}>{slot ? slot.colorName : loaded ? 'Assign spool' : 'Empty'}</span>
                  {slot && pct != null && (
                    <span className={styles.trayBar}>
                      <span className={styles.spoolBar}>
                        <span className={styles.spoolBarFill} style={{ width: `${pct}%`, backgroundColor: barCol }} />
                      </span>
                      <span className={styles.spoolBarPct}>{pct}%</span>
                    </span>
                  )}
                </>
              )

              if (!clickable) {
                return <div key={i} className={trayClass}>{inner}</div>
              }

              return (
                <Link
                  key={i}
                  to={slot ? `/spools/${slot.id}` : selectTo}
                  className={trayClass}
                  onClick={slot ? openSpool(slot) : undefined}
                >
                  {inner}
                </Link>
              )
            })}
          </div>
        )}
      </>
    )
  } else {
    const extraLoaded = isExtraTrayLoaded(printer.extraSpoolOccupied, singleSpool)
    const extraEmpty = isExtraTrayEmptyMqtt(printer.extraSpoolOccupied)
    const extraClickable = isExtraTrayClickable(printer.extraSpoolOccupied, singleSpool)
    const loadedCount = extraLoaded ? 1 : 0
    const pct = trayRemainPercent(singleSpool)
    const barColor = pct != null && pct > 30 ? 'var(--accent)' : pct != null && pct > 10 ? 'oklch(0.65 0.17 30)' : '#ef4444'
    const selectTo = `/spools/select?printerId=${printer.id}`
    const trayClass = `${styles.tray}${extraLoaded ? '' : ` ${styles.empty}`}${extraEmpty ? ` ${styles.trayDisabled}` : ''} ${styles.single}`

    const inner = (
      <>
        <div className={styles.ti}>
          {singleSpool
            ? <SpoolIcon color={singleSpool.colorHex} size={28} />
            : extraLoaded ? <span className={styles.loadedDot} /> : PLUS}
        </div>
        <span className={styles.tn}>
          {singleSpool
            ? `${singleSpool.colorName} · ${singleSpool.material}`
            : extraEmpty
              ? 'Empty'
              : extraLoaded
                ? 'Assign spool'
                : 'No spool — assign one'}
        </span>
        {singleSpool && pct != null && (
          <span className={styles.trayBar}>
            <span className={styles.spoolBar}>
              <span className={styles.spoolBarFill} style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </span>
            <span className={styles.spoolBarPct}>{pct}%</span>
          </span>
        )}
      </>
    )

    body = (
      <>
        <button type="button" className={styles.spoolToggle} onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
          <div className={styles.spoolInfo}>
            <span className={styles.amstag}>EXTRA</span>
            <span className={styles.spoolCount}>{loadedCount} loaded</span>
            <div className={styles.iconRow}>
              {extraLoaded
                ? (singleSpool
                    ? <span className={styles.iconChip}><SpoolIcon color={singleSpool.colorHex} size={18} /></span>
                    : <span className={styles.iconChip}><span className={styles.loadedDot} /></span>)
                : <span className={styles.emptyDot}>{PLUS}</span>}
            </div>
          </div>
          <Chevron open={expanded} />
        </button>

        {expanded && (
          <div className={styles.ams}>
            {extraClickable
              ? (
                <Link
                  to={singleSpool ? `/spools/${singleSpool.id}` : selectTo}
                  className={trayClass}
                  onClick={singleSpool ? openSpool(singleSpool) : undefined}
                >
                  {inner}
                </Link>
              )
              : <div className={trayClass}>{inner}</div>}
          </div>
        )}
      </>
    )
  }

  return (
    <div className={styles.card} onClick={() => onOpenDetail?.(printer)}>
      <div className={styles.phead}>
        <div className={styles.pphoto}>
          {showConnDot && (
            <span
              className={`${styles.connDot} ${connOnline ? styles.connOnline : styles.connOffline}`}
              title={connOnline ? 'Online' : 'Offline'}
              aria-hidden
            />
          )}
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
