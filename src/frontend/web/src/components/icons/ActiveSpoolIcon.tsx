interface ActiveSpoolIconProps {
  className?: string
  stroke?: string
}

export default function ActiveSpoolIcon({ className = 'w-6 h-6', stroke = 'currentColor' }: ActiveSpoolIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Outer spool ring */}
      <circle cx="12" cy="12" r="9" />
      {/* Inner hub */}
      <circle cx="12" cy="12" r="3.5" />
      {/* Spokes */}
      <line x1="12" y1="3" x2="12" y2="8.5" />
      <line x1="12" y1="15.5" x2="12" y2="21" />
      <line x1="3" y1="12" x2="8.5" y2="12" />
      <line x1="15.5" y1="12" x2="21" y2="12" />
      {/* Play triangle — signals active/running */}
      <polygon
        points="10.5,10.5 10.5,13.5 13.5,12"
        fill={stroke}
        stroke="none"
      />
    </svg>
  )
}
