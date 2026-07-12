import styles from './SpoolHubLogo.module.css'
import { useId } from 'react'

interface SpoolHubLogoProps {
  height?: number
  className?: string
}

export default function SpoolHubLogo({ height = 40, className }: SpoolHubLogoProps) {
  const width = Math.round(height * 680 / 180)
  const uid = useId().replace(/:/g, '')
  const DEEP = '#15803D'
  const BRIGHT = '#22C55E'

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 680 180"
      role="img"
      aria-label="SpoolHub"
      className={[styles.icon, className].filter(Boolean).join(' ')}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <g id={`spk-${uid}`}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <line
              key={angle}
              x1="0" y1="-52" x2="0" y2="-34"
              stroke={BRIGHT} strokeWidth="2" opacity="0.5"
              transform={angle === 0 ? undefined : `rotate(${angle})`}
            />
          ))}
        </g>
      </defs>

      <circle cx="115" cy="90" r="65" fill="none" stroke={DEEP} strokeWidth="3" />
      <g transform="translate(115,90)">
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
          <circle r="53" fill="none" stroke={BRIGHT} strokeWidth="6" opacity="0.4" />
          <circle r="43" fill="none" stroke={BRIGHT} strokeWidth="6" opacity="0.65" />
          <circle r="33" fill="none" stroke={BRIGHT} strokeWidth="6" opacity="0.9" />
          <use href={`#spk-${uid}`} />
        </g>
        <circle r="17" fill={DEEP} />
        <circle r="9" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
      </g>

      <path d="M 170.2,34.9 A 78,78 0 0,1 170.2,145.1" fill="none" stroke={DEEP} strokeWidth="3.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" values="1;3.5;1" dur="2s" begin="0s" repeatCount="indefinite" />
      </path>
      <path d="M 182.9,22.2 A 96,96 0 0,1 182.9,157.8" fill="none" stroke={DEEP} strokeWidth="2.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0;0.65;0" dur="2s" begin="0.35s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" values="0.5;2.5;0.5" dur="2s" begin="0.35s" repeatCount="indefinite" />
      </path>
      <path d="M 195.6,9.4 A 114,114 0 0,1 195.6,170.6" fill="none" stroke={DEEP} strokeWidth="2" strokeLinecap="round">
        <animate attributeName="opacity" values="0;0.35;0" dur="2s" begin="0.7s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" values="0.5;2;0.5" dur="2s" begin="0.7s" repeatCount="indefinite" />
      </path>

      <text
        x="242" y="90"
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
        fontSize="80"
        fontWeight="500"
        dominantBaseline="middle"
      >
        Spool<tspan fill="#16A34A">Hub</tspan>
      </text>
    </svg>
  )
}
