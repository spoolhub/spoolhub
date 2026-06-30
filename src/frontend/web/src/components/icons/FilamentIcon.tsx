interface FilamentIconProps {
  color: string
  colors?: string[]
  size?: number
}

export default function FilamentIcon({ color, colors, size = 68 }: FilamentIconProps) {
  const multiColor = colors && colors.length >= 2
  const uid = (multiColor ? colors.join('') : color).replace(/[^a-zA-Z0-9]/g, '')

  const gradientStops = multiColor
    ? colors.map((c, i, arr) => ({
        color: c,
        offset: `${(i / (arr.length - 1)) * 100}%`,
      }))
    : null

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        {gradientStops && (
          <linearGradient id={`g-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {gradientStops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        )}

        <radialGradient id={`l-${uid}`} cx="36%" cy="28%" r="64%">
          <stop offset="0%"  stopColor="white" stopOpacity="0.55" />
          <stop offset="50%" stopColor="white" stopOpacity="0.0" />
          <stop offset="100%" stopColor="white" stopOpacity="0.0" />
        </radialGradient>

        <clipPath id={`c-${uid}`}>
          <circle cx="60" cy="60" r="50" />
        </clipPath>
      </defs>

      <circle cx="60" cy="60" r="50" fill={gradientStops ? `url(#g-${uid})` : color} />

      <g clipPath={`url(#c-${uid})`} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="3" strokeLinecap="round">
        <path d="M 8 92  C 22 68, 52 55, 58 22" />
        <path d="M 26 108 C 42 82, 72 68, 80 36" />
        <path d="M 48 114 C 62 90, 90 76, 100 48" />
        <path d="M -4 62  C 12 40, 40 28, 48 6" />
      </g>

      <circle cx="60" cy="60" r="50" fill={`url(#l-${uid})`} />
    </svg>
  )
}
