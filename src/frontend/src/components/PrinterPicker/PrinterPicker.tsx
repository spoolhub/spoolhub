import { useTranslation } from 'react-i18next'
import type { PrinterResponse } from '@/types/printer'
import styles from './PrinterPicker.module.css'

interface TrayOccupant {
  colorHex: string
  colorName: string
  brand: string
  material: string
}

interface Props {
  printers: PrinterResponse[]
  value: string | null
  onChange: (printerId: string | null) => void
  amsSlot?: number | null
  onAmsSlotChange?: (slot: number | null) => void
  occupiedSlots?: Record<number, TrayOccupant>
  currentSpoolColor?: string
  onBusyTrayClick?: (slot: number) => void
  disabled?: boolean
  error?: boolean
  amsSlotError?: boolean
  shakeKey?: number
  onShakeEnd?: () => void
}

export default function PrinterPicker({
  printers, value, onChange, amsSlot, onAmsSlotChange,
  occupiedSlots = {}, currentSpoolColor, onBusyTrayClick,
  disabled = false, error = false, amsSlotError = false, shakeKey, onShakeEnd,
}: Props) {
  const { t } = useTranslation()
  const selectedPrinter = printers.find(p => p.id === value)
  const showAms = selectedPrinter?.hasAms && onAmsSlotChange !== undefined

  return (
    <div
      key={shakeKey}
      className={`${styles.wrap}${error ? ` ${styles.wrapError} ${styles.shake}` : ''}`}
      onAnimationEnd={onShakeEnd}
    >
      <label className={`${styles.label}${error ? ` ${styles.labelError}` : ''}`}>
        {error ? t('spoolForm.assignPrinterWarning') : t('spoolForm.assignedPrinter')}
      </label>

      <select
        value={value ?? ''}
        onChange={e => {
          const v = e.target.value || null
          onChange(v)
          if (!v) onAmsSlotChange?.(null)
        }}
        disabled={disabled}
        className={`${styles.select}${error ? ` ${styles.selectError}` : ''}`}
      >
        <option value="">{t('spoolForm.noPrinter')}</option>
        {printers.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.brand} {p.model}
          </option>
        ))}
      </select>

      {showAms && (
        <div className={styles.amsSection}>
          <p className={`${styles.amsLabel}${amsSlotError ? ` ${styles.amsLabelError}` : ''}`}>
            {amsSlotError ? t('spoolForm.selectTrayWarning') : t('spoolForm.amsTray')}
          </p>
          <div className={`${styles.amsTray}${amsSlotError ? ` ${styles.amsTrayError}` : ''}`}>
            {[1, 2, 3, 4].map(slot => {
              const occupant = occupiedSlots[slot]
              const isSelected = amsSlot === slot
              const bgColor = isSelected ? currentSpoolColor : occupant?.colorHex
              const hasColor = !!bgColor
              return (
                <button
                  key={slot}
                  type="button"
                  title={
                    isSelected ? 'This spool' :
                    occupant ? `${occupant.colorName} — ${occupant.brand} ${occupant.material}` :
                    `Tray ${slot} — empty`
                  }
                  onClick={() => {
                    if (isSelected) { onAmsSlotChange(null); return }
                    if (occupant && onBusyTrayClick) { onBusyTrayClick(slot); return }
                    onAmsSlotChange(slot)
                  }}
                  disabled={disabled}
                  style={hasColor ? { backgroundColor: bgColor } : undefined}
                  className={`${styles.amsBtn}${isSelected ? ` ${styles.amsBtnSelected}` : hasColor ? ` ${styles.amsBtnOccupied}` : ` ${styles.amsBtnEmpty}`}`}
                >
                  <span className={hasColor ? styles.amsBtnLabelColored : undefined}>
                    {slot}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
