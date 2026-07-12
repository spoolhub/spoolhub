import { useId } from 'react'
import styles from './SpoolHubLogo.module.css'

const DEEP = '#15803D'
const BRIGHT = '#22C55E'

const WAVES: [string, string, string, string, string, string][] = [
  ['170.2,34.9', '170.2,145.1', '78', '3.5', '1', '0s'],
  ['182.9,22.2', '182.9,157.8', '96', '2.5', '0.65', '0.35s'],
  ['195.6,9.4', '195.6,170.6', '114', '2', '0.35', '0.7s'],
]

const SPOKE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

export type SpoolHubLogoVariant = 'full' | 'icon' | 'stacked' | 'tile' | 'mono'

interface SpoolHubLogoProps {
  size?: number
  /** @deprecated use variant="icon" instead */
  iconOnly?: boolean
  variant?: SpoolHubLogoVariant
  /** single-color override, used by the "mono" variant (e.g. for dark/light reversed treatments) */
  color?: string
  animated?: boolean
  /** widens the "icon" variant's crop to include the pulsing broadcast waves */
  waves?: boolean
  className?: string
}

function SpoolIcon({
  size,
  uid,
  color,
  animated = true,
  waves = false,
}: {
  size: number
  uid: string
  color?: string
  animated?: boolean
  waves?: boolean
}) {
  const ring = color || BRIGHT
  const rim = color || DEEP
  const hub = color || DEEP
  const spoke = color || BRIGHT
  const hole = color ? color : 'white'
  const waveColor = color || DEEP
  // no explicit color → wheel (rim, hub, spokes) follows the theme (black in light, white in dark)
  const wheelClass = color ? undefined : styles.wheel
  const wheelFillClass = color ? undefined : styles.wheelFill
  const holeClass = color ? undefined : styles.hole

  return (
    <svg
      width={waves ? Math.round(size * 215 / 180) : size} height={size}
      viewBox={waves ? '47 0 215 180' : '47 22 136 136'}
      role="img" aria-label="SpoolHub" xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <g id={`spk-${uid}`}>
          {SPOKE_ANGLES.map((angle) => (
            <line
              key={angle}
              x1="0" y1="-52" x2="0" y2="-34"
              stroke={spoke} strokeWidth="2" opacity="0.5"
              className={wheelClass}
              transform={angle ? `rotate(${angle})` : undefined}
            />
          ))}
        </g>
      </defs>
      <circle cx="115" cy="90" r="65" fill="none" stroke={rim} strokeWidth="3" className={wheelClass} />
      <g transform="translate(115,90)">
        <g>
          {animated && (
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
          )}
          <circle r="53" fill="none" stroke={ring} strokeWidth="6" opacity="0.4" />
          <circle r="43" fill="none" stroke={ring} strokeWidth="6" opacity="0.65" />
          <circle r="33" fill="none" stroke={ring} strokeWidth="6" opacity="0.9" />
          <use href={`#spk-${uid}`} />
        </g>
        <circle r="17" fill={hub} className={wheelFillClass} />
        <circle r="9" fill="none" stroke={hole} strokeWidth="2" opacity="0.6" className={holeClass} />
      </g>
      {waves && WAVES.map(([from, to, r, strokeWidth, maxOpacity, begin]) => (
        <path
          key={from}
          d={`M ${from} A ${r},${r} 0 0,1 ${to}`}
          fill="none" stroke={waveColor} strokeWidth={strokeWidth} strokeLinecap="round"
        >
          {animated && (
            <>
              <animate attributeName="opacity" values={`0;${maxOpacity};0`} dur="2s" begin={begin} repeatCount="indefinite" />
              <animate attributeName="stroke-width" values={`0.5;${strokeWidth};0.5`} dur="2s" begin={begin} repeatCount="indefinite" />
            </>
          )}
        </path>
      ))}
    </svg>
  )
}

function FullLogo({ size, uid, animated = true }: { size: number; uid: string; animated?: boolean }) {
  const w = Math.round(size * 680 / 180)
  return (
    <svg
      width={w} height={size}
      viewBox="0 0 680 180"
      role="img" aria-label="SpoolHub" xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <g id={`spk-${uid}`}>
          {SPOKE_ANGLES.map((angle) => (
            <line
              key={angle}
              x1="0" y1="-52" x2="0" y2="-34"
              stroke={BRIGHT} strokeWidth="2" opacity="0.5"
              className={styles.wheel}
              transform={angle ? `rotate(${angle})` : undefined}
            />
          ))}
        </g>
      </defs>
      <circle cx="115" cy="90" r="65" fill="none" stroke={DEEP} strokeWidth="3" className={styles.wheel} />
      <g transform="translate(115,90)">
        <g>
          {animated && (
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
          )}
          <circle r="53" fill="none" stroke={BRIGHT} strokeWidth="6" opacity="0.4" />
          <circle r="43" fill="none" stroke={BRIGHT} strokeWidth="6" opacity="0.65" />
          <circle r="33" fill="none" stroke={BRIGHT} strokeWidth="6" opacity="0.9" />
          <use href={`#spk-${uid}`} />
        </g>
        <circle r="17" fill={DEEP} className={styles.wheelFill} />
        <circle r="9" fill="none" stroke="white" strokeWidth="2" opacity="0.6" className={styles.hole} />
      </g>
      {WAVES.map(([from, to, r, strokeWidth, maxOpacity, begin]) => (
        <path
          key={from}
          d={`M ${from} A ${r},${r} 0 0,1 ${to}`}
          fill="none" stroke={DEEP} strokeWidth={strokeWidth} strokeLinecap="round"
        >
          <animate attributeName="opacity" values={`0;${maxOpacity};0`} dur="2s" begin={begin} repeatCount="indefinite" />
          <animate attributeName="stroke-width" values={`0.5;${strokeWidth};0.5`} dur="2s" begin={begin} repeatCount="indefinite" />
        </path>
      ))}
      <text x="242" y="118" fontFamily="'Hanken Grotesk',system-ui,sans-serif" fontSize="80" fontWeight="700">
        <tspan fill="currentColor">Spool</tspan><tspan fill={BRIGHT}>Hub</tspan>
      </text>
    </svg>
  )
}

export default function SpoolHubLogo({
  size = 72,
  iconOnly = false,
  variant,
  color,
  animated = true,
  waves = false,
  className,
}: SpoolHubLogoProps) {
  const uid = useId().replace(/:/g, '')
  const resolvedVariant: SpoolHubLogoVariant = variant ?? (iconOnly ? 'icon' : 'full')

  switch (resolvedVariant) {
    case 'icon':
      return (
        <span className={className}>
          <SpoolIcon size={size} uid={uid} animated={animated} waves={waves} />
        </span>
      )

    case 'mono':
      return (
        <span className={className}>
          <SpoolIcon size={size} uid={uid} color={color || DEEP} animated={animated} />
        </span>
      )

    case 'tile': {
      const iconSize = Math.round(size * 0.6)
      return (
        <span
          className={`${styles.tile} ${className || ''}`}
          style={{ width: size, height: size }}
        >
          <SpoolIcon size={iconSize} uid={uid} color={color || 'white'} animated={animated} />
        </span>
      )
    }

    case 'stacked':
      return (
        <span className={`${styles.stacked} ${className || ''}`}>
          <SpoolIcon size={size} uid={uid} animated={animated} />
          <span className={styles.wordmark} style={{ fontSize: size * 0.4 }}>
            Spool<span style={{ color: BRIGHT }}>Hub</span>
          </span>
        </span>
      )

    case 'full':
    default:
      return (
        <span className={className}>
          <FullLogo size={size} uid={uid} animated={animated} />
        </span>
      )
  }
}
