import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import styles from './MetricCard.module.css'

function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)
  const seenRealValue = useRef(false)

  useEffect(() => {
    const from = prevRef.current
    if (from === target) return
    prevRef.current = target
    if (!seenRealValue.current) {
      seenRealValue.current = true
      setDisplay(target)
      return
    }
    const startTime = performance.now()
    let raf: number
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (target - from) * eased))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return display
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

const UpArrow = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M7 14l5-5 5 5" /></svg>
)
const DownArrow = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M7 10l5 5 5-5" /></svg>
)

export function MetricCard({
  label, value, suffix, trend, to, toState, loading, icon,
}: {
  label: string
  value: number | string
  suffix?: React.ReactNode
  trend?: { text: string; muted?: string; variant: 'positive' | 'neutral' | 'warning' | 'error' }
  to?: string
  toState?: Record<string, unknown>
  loading: boolean
  icon: React.ReactNode
}) {
  const numericValue = typeof value === 'number' ? value : 0
  const displayed = useAnimatedNumber(loading ? 0 : numericValue)
  const displayStr = typeof value === 'number' ? formatNumber(displayed) : String(value)

  const inner = (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <div className={styles.iconWrap}>{icon}</div>
      </div>
      {loading ? (
        <div className={styles.skeleton} />
      ) : (
        <span className={styles.value}>
          {displayStr}
          {suffix && <small>{suffix}</small>}
        </span>
      )}
      {trend && !loading && (
        <span className={styles[trend.variant]}>
          {trend.variant === 'positive' && <UpArrow />}
          {trend.variant === 'warning' && <DownArrow />}
          {trend.text}
          {trend.muted && <span className={styles.muted}>{trend.muted}</span>}
        </span>
      )}
    </div>
  )

  if (to) {
    return <Link to={to} state={toState} className={styles.link}>{inner}</Link>
  }
  return inner
}
