const DEEP = '#15803D'
const BRIGHT = '#22C55E'

const WAVES: [string, string, string, string, string, string][] = [
  ['170.2,34.9', '170.2,145.1', '78', '3.5', '1', '0s'],
  ['182.9,22.2', '182.9,157.8', '96', '2.5', '0.65', '0.35s'],
  ['195.6,9.4', '195.6,170.6', '114', '2', '0.35', '0.7s'],
]

const SPOKE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

interface SpoolHubLogoProps {
  size?: number
  iconOnly?: boolean
}

export default function SpoolHubLogo({ size = 72, iconOnly = false }: SpoolHubLogoProps) {
  const h = size
  const w = Math.round(size * (iconOnly ? 215 / 180 : 680 / 180))

  return (
    <svg
      width={w} height={h}
      viewBox={iconOnly ? '47 0 215 180' : '0 0 680 180'}
      role="img" aria-label="SpoolHub" xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <g id="spk-full">
          {SPOKE_ANGLES.map((angle) => (
            <line
              key={angle}
              x1="0" y1="-52" x2="0" y2="-34"
              stroke={BRIGHT} strokeWidth="2" opacity="0.5"
              transform={angle ? `rotate(${angle})` : undefined}
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
          {!iconOnly && <use href="#spk-full" />}
        </g>
        <circle r="17" fill={DEEP} />
        <circle r="9" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
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
      {!iconOnly && (
        <text x="242" y="90" fontFamily="'Hanken Grotesk',system-ui,sans-serif" fontSize="80" fontWeight="700" dominantBaseline="middle">
          <tspan fill="currentColor">Spool</tspan><tspan fill={BRIGHT}>Hub</tspan>
        </text>
      )}
    </svg>
  )
}
