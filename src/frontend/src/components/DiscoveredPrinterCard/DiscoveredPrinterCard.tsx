import { SpoolIcon } from '@/components/icons'
import { getPrinterImage } from '@/utils/printerImages'
import { previewTrayLabel } from '@/utils/spoolTrayMatch'
import type { DiscoveredPrinterMqttPreview, DiscoveredSpoolSlotPreview } from '@/types/printer'
import styles from './DiscoveredPrinterCard.module.css'

const PLUS = (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
)

interface Props {
  name: string
  model: string
  printerBrand?: string
  serialSuffix?: string
  online: boolean
  alreadyAdded?: boolean
  preview?: DiscoveredPrinterMqttPreview | null
  previewLoading?: boolean
  onClick?: () => void
  disabled?: boolean
  trailing?: React.ReactNode
}

function slotCaption(slot: DiscoveredSpoolSlotPreview, printerBrand: string): string {
  return previewTrayLabel(slot, printerBrand)
}

function TraySlot({
  slotIndex,
  slot,
  printerBrand,
  compact = false,
}: {
  slotIndex: number | 'extra'
  slot: DiscoveredSpoolSlotPreview | null
  printerBrand: string
  compact?: boolean
}) {
  const occupied = !!slot?.occupied
  const isExtra = slotIndex === 'extra'
  const className = [
    isExtra ? styles.extraSlot : styles.slot,
    occupied ? styles.slotLoaded : styles.slotEmpty,
    compact && !isExtra ? styles.slotCompact : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={`${styles.slotWrap}${isExtra ? ` ${styles.slotWrapExtra}` : ''}`}>
      <div className={className}>
        {!isExtra && <span className={styles.slotNum}>{slotIndex}</span>}
        {occupied && slot
          ? <SpoolIcon color={slot.colorHex ?? '#888888'} size={isExtra ? 22 : 18} />
          : <span className={styles.emptyIcon}>{PLUS}</span>}
        {occupied && slot && (
          <span className={styles.slotCaption}>{slotCaption(slot, printerBrand)}</span>
        )}
      </div>
    </div>
  )
}

function SpoolDock({
  preview,
  previewLoading,
  printerBrand,
  amsSlots,
  extra,
  loadedCount,
}: {
  preview?: DiscoveredPrinterMqttPreview | null
  previewLoading?: boolean
  printerBrand: string
  amsSlots: (DiscoveredSpoolSlotPreview | null)[]
  extra: DiscoveredSpoolSlotPreview | null
  loadedCount: number
}) {
  if (previewLoading) {
    return <div className={styles.previewLoading}>Reading spools from printer…</div>
  }
  if (!preview) return null

  if (preview.hasAms) {
    return (
      <div className={styles.dock}>
        <div className={styles.dockLabel}>
          <span className={styles.dockTag}>AMS</span>
          <span className={styles.dockCount}>{loadedCount}/4</span>
        </div>
        <div className={styles.slotRow}>
          {amsSlots.map((slot, i) => (
            <TraySlot key={i} slotIndex={i + 1} slot={slot} printerBrand={printerBrand} compact />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dock}>
      <div className={styles.dockLabel}>
        <span className={styles.dockTag}>EXTRA</span>
        <span className={styles.dockCount}>{extra?.occupied ? '1' : '0'}</span>
      </div>
      <TraySlot slotIndex="extra" slot={extra} printerBrand={printerBrand} />
    </div>
  )
}

export default function DiscoveredPrinterCard({
  name,
  model,
  printerBrand = 'Bambu Lab',
  serialSuffix,
  online,
  alreadyAdded = false,
  preview,
  previewLoading = false,
  onClick,
  disabled = false,
  trailing,
}: Props) {
  const imgSrc = getPrinterImage(printerBrand, model)
  const Tag = onClick ? 'button' : 'div'

  const amsSlots = preview?.hasAms
    ? Array.from({ length: 4 }, (_, i) => preview.trays.find(t => t.slot === i + 1) ?? null)
    : []

  const extra = !preview?.hasAms ? preview?.extraTray ?? null : null
  const loadedCount = preview?.hasAms
    ? amsSlots.filter(s => s?.occupied).length
    : (extra?.occupied ? 1 : 0)

  const showDock = previewLoading || preview

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`${styles.card}${alreadyAdded ? ` ${styles.added}` : ''}${disabled ? ` ${styles.disabled}` : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className={`${styles.layout}${showDock ? ` ${styles.layoutWithDock}` : ''}`}>
        <div className={styles.photo}>
          <img className={styles.pimg} src={imgSrc} alt={model} onError={e => { e.currentTarget.style.display = 'none' }} />
          {online && <span className={styles.connDot} aria-hidden />}
        </div>

        <div className={styles.content}>
          <div className={styles.titleRow}>
            <div className={styles.info}>
              <div className={styles.name}>{name}</div>
              <div className={styles.metaRow}>
                <span className={styles.meta}>{model}{serialSuffix ? ` · ${serialSuffix}` : ''}</span>
                <span className={`${styles.status} ${online ? styles.statusOnline : styles.statusOffline}`}>
                  <i />{online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            {trailing && <div className={styles.trailing}>{trailing}</div>}
          </div>

          {showDock && (
            <SpoolDock
              preview={preview}
              previewLoading={previewLoading}
              printerBrand={printerBrand}
              amsSlots={amsSlots}
              extra={extra}
              loadedCount={loadedCount}
            />
          )}
        </div>
      </div>
    </Tag>
  )
}
