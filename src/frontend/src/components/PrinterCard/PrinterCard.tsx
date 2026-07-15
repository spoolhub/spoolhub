import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getPrinterImage } from '@/utils/printerImages'
import { getPrinterStatusClass, getPrinterStatusLabel, isMqttPrinter, isPrinterOnline } from '@/utils/printerStatus'
import { countLoadedAmsTrays, countPendingAmsTrays, isExtraTrayClickable, isExtraTrayEmptyMqtt, isExtraTrayLoaded, isExtraTrayPendingLoad, isTrayClickable, isTrayEmptyMqtt, isTrayLoaded, isTrayPendingLoad, trayRemainPercent } from '@/utils/printerAms'
import { SpoolIcon } from '@/components/icons'
import type { PrinterResponse, PrinterStatus, TraySpoolSummary } from '@/types/printer'
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
  const { t } = useTranslation()
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
  const traySummaries: (TraySpoolSummary | null)[] = printer.hasAms
    ? [printer.tray1Spool, printer.tray2Spool, printer.tray3Spool, printer.tray4Spool]
    : []

  const findSpool = (summary: TraySpoolSummary | null) =>
    summary ? (spools.find(s => s.id === summary.id) ?? null) : null

  const loadedCount = countLoadedAmsTrays(trayOccupied, traySummaries)
  const reservedCount = countPendingAmsTrays(trayOccupied, traySummaries)

  const singleSpool = !printer.hasAms ? findSpool(printer.extraSpool) : null
  const extraReserved = isExtraTrayPendingLoad(printer.extraSpoolOccupied, printer.extraSpool)

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
            <span className={styles.spoolCount}>
              {reservedCount > 0
                ? t('printerCard.amsLoadedWithReserved', { loaded: loadedCount, reserved: reservedCount })
                : t('printerCard.amsLoaded', { count: loadedCount })}
            </span>
            <div className={styles.iconRow}>
              {traySummaries.map((summary, i) => {
                const pending = isTrayPendingLoad(trayOccupied[i], summary)
                const loaded = isTrayLoaded(trayOccupied[i], summary)
                const spool = findSpool(summary)
                const chipClass = `${styles.iconChip}${pending ? ` ${styles.iconChipPending}` : ''}`
                return (
                  <span key={i} className={chipClass}>
                    {summary && (pending || loaded)
                      ? (
                        <Link to={`/spools/${summary.id}`} onClick={spool ? openSpool(spool) : undefined}>
                          <SpoolIcon color={summary.colorHex} size={18} />
                        </Link>
                      )
                      : loaded
                        ? <span className={styles.loadedDot} />
                        : <span className={styles.emptyDot}>{PLUS}</span>}
                  </span>
                )
              })}
            </div>
          </div>
          <Chevron open={expanded} />
        </button>

        {expanded && (
          <div className={styles.ams}>
            {traySummaries.map((summary, i) => {
              const selectTo = `/spools/select?printerId=${printer.id}&amsSlot=${i + 1}`
              const spool = findSpool(summary)
              const pending = isTrayPendingLoad(trayOccupied[i], summary)
              const loaded = isTrayLoaded(trayOccupied[i], summary)
              const empty = isTrayEmptyMqtt(trayOccupied[i]) && !pending
              const clickable = isTrayClickable(trayOccupied[i], summary)
              const pct = trayRemainPercent(spool)
              const barCol = pct != null && pct > 30 ? 'var(--accent)' : pct != null && pct > 10 ? 'oklch(0.65 0.17 30)' : '#ef4444'
              const trayClass = `${styles.tray}${loaded || pending ? '' : ` ${styles.empty}`}${empty ? ` ${styles.trayDisabled}` : ''}${pending ? ` ${styles.trayPending}` : ''}`

              const inner = (
                <>
                  <span className={styles.slotn}>{i + 1}</span>
                  <div className={styles.ti}>
                    {summary ? <SpoolIcon color={summary.colorHex} size={24} /> : loaded ? <span className={styles.loadedDot} /> : PLUS}
                  </div>
                  <span className={styles.tn}>
                    {pending
                      ? t('printerCard.reserved')
                      : summary
                        ? summary.colorName
                        : loaded
                          ? t('printerDetail.loaded')
                          : t('printerDetail.empty')}
                  </span>
                  {spool && pct != null && !pending && (
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
                  to={summary ? `/spools/${summary.id}` : selectTo}
                  className={trayClass}
                  onClick={spool ? openSpool(spool) : undefined}
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
    const extraLoaded = isExtraTrayLoaded(printer.extraSpoolOccupied, printer.extraSpool)
    const extraEmpty = isExtraTrayEmptyMqtt(printer.extraSpoolOccupied) && !extraReserved
    const extraClickable = isExtraTrayClickable(printer.extraSpoolOccupied, printer.extraSpool)
    const loadedCount = extraLoaded ? 1 : 0
    const pct = trayRemainPercent(singleSpool)
    const barColor = pct != null && pct > 30 ? 'var(--accent)' : pct != null && pct > 10 ? 'oklch(0.65 0.17 30)' : '#ef4444'
    const selectTo = `/spools/select?printerId=${printer.id}`
    const trayClass = `${styles.tray}${extraLoaded || extraReserved ? '' : ` ${styles.empty}`}${extraEmpty ? ` ${styles.trayDisabled}` : ''}${extraReserved ? ` ${styles.trayPending}` : ''} ${styles.single}`

    const inner = (
      <>
        <div className={styles.ti}>
          {(singleSpool ?? printer.extraSpool)
            ? <SpoolIcon color={(singleSpool ?? printer.extraSpool)!.colorHex} size={28} />
            : extraLoaded ? <span className={styles.loadedDot} /> : PLUS}
        </div>
        <span className={styles.tn}>
          {extraReserved && printer.extraSpool
            ? t('printerCard.reserved')
            : singleSpool
              ? `${singleSpool.colorName} · ${singleSpool.material}`
              : extraEmpty
                ? t('printerDetail.empty')
                : extraLoaded
                  ? t('printerDetail.loaded')
                  : t('printerCard.noSpoolLoaded')}
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
            <span className={styles.spoolCount}>
              {extraReserved
                ? t('printerCard.oneReserved')
                : loadedCount > 0
                  ? t('printerCard.extraLoaded')
                  : t('printerCard.noneAssigned')}
            </span>
            <div className={styles.iconRow}>
              {printer.extraSpool && (extraLoaded || extraReserved)
                ? (
                  <span className={`${styles.iconChip}${extraReserved ? ` ${styles.iconChipPending}` : ''}`}>
                    <SpoolIcon color={printer.extraSpool.colorHex} size={18} />
                  </span>
                )
                : extraLoaded
                  ? <span className={styles.iconChip}><span className={styles.loadedDot} /></span>
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
                  to={(singleSpool ?? printer.extraSpool) ? `/spools/${(singleSpool ?? printer.extraSpool)!.id}` : selectTo}
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
