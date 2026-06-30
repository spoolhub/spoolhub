import { useTranslation } from 'react-i18next'
import type { PrinterStatus } from '@/types/printer'
import styles from './StatusRing.module.css'

interface Props {
  status?: PrinterStatus | null
  size?: number
}

export default function StatusRing({ status, size = 76 }: Props) {
  const { t } = useTranslation()
  const STROKE = size * 0.059
  const radius = (size - STROKE) / 2
  const circ   = 2 * Math.PI * radius

  const state = status?.gcodeState?.toUpperCase() ?? 'IDLE'
  const pct   = status?.progressPercent ?? 0

  const isRunning = state === 'RUNNING'
  const isPause   = state === 'PAUSE'
  const isFailed  = state === 'FAILED'
  const isFinish  = state === 'FINISH'
  const isIdle    = !isRunning && !isPause && !isFailed && !isFinish

  const arcColor   = isRunning ? '#34d399' : isPause ? '#fbbf24' : isFailed ? '#f87171' : isFinish ? '#38bdf8' : '#52525b'
  const dashOffset = isFailed || isFinish ? 0 : isIdle ? circ : circ - (pct / 100) * circ

  const label      = isRunning ? `${pct}%` : isPause ? t('statusRing.pause') : isFailed ? t('statusRing.error') : isFinish ? t('statusRing.done') : t('statusRing.idle')
  const rem        = status?.remainingMinutes ?? 0
  const remLabel   = rem >= 60
    ? `${Math.floor(rem / 60)}h ${rem % 60}m`
    : rem > 0 ? `${rem}m` : null

  const fontSize     = Math.round(size * 0.158)
  const subFontSize  = Math.round(size * 0.118)

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.ringCanvas}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272a" strokeWidth={STROKE} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={arcColor} strokeWidth={STROKE}
          strokeDasharray={circ} strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={styles.ringArc}
        />
      </svg>
      <div className={styles.center}>
        <span style={{ fontSize, color: isIdle ? 'var(--text-secondary)' : arcColor }} className={styles.label}>{label}</span>
        {isRunning && remLabel && (
          <span style={{ fontSize: subFontSize }} className={styles.sub}>{remLabel}</span>
        )}
      </div>
    </div>
  )
}
