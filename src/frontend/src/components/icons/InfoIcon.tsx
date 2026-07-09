import styles from './InfoIcon.module.css'
interface InfoIconProps {
  className?: string
}

export default function InfoIcon({ className }: InfoIconProps) {
  return (
    <svg className={[styles.icon, className].filter(Boolean).join(' ')} aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" />
      <line x1="12" y1="12" x2="12" y2="16" />
    </svg>
  )
}
