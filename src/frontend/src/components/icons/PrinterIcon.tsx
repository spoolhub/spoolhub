import styles from './PrinterIcon.module.css'
interface PrinterIconProps {
  className?: string
  stroke?: string
}

export default function PrinterIcon({ className = 'w-6 h-6', stroke = 'currentColor' }: PrinterIconProps) {
  return (
    <svg className={[styles.icon, className].filter(Boolean).join(' ')} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Frame posts */}
      <line x1="4" y1="3" x2="4" y2="19" />
      <line x1="20" y1="3" x2="20" y2="19" />
      {/* Top crossbar */}
      <path d="M4 3h16" />
      {/* X-axis rail */}
      <line x1="4" y1="9" x2="20" y2="9" />
      {/* Print head body */}
      <rect x="9.5" y="6.5" width="5" height="4" rx="0.75" />
      {/* Nozzle */}
      <path d="M11.5 10.5 L12 13 L12.5 10.5" strokeWidth="1.5" />
      {/* Build plate */}
      <rect x="3" y="19" width="18" height="2" rx="0.75" />
      {/* Printed object */}
      <rect x="8.5" y="14.5" width="7" height="4" rx="0.5" />
    </svg>
  )
}
