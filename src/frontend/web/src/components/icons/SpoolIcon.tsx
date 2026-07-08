import { useState, useEffect } from 'react'

interface SpoolIconProps {
  color: string
  size?: number
  showBackground?: boolean
  className?: string
}

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

function isNearWhite(hex: string) {
  if (!hex.startsWith('#') || hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r > 210 && g > 210 && b > 210
}

function isNearBlack(hex: string) {
  if (!hex.startsWith('#') || hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r < 50 && g < 50 && b < 50
}

const DARK_F = {
  backFlange: '#16161a',
  frontFlange: '#17171b',
  frontStroke: '#0c0c0e',
  hub: '#3a3a40',
  hubInner: '#141417',
  center: '#0a0a0c',
}

const LIGHT_F = {
  backFlange: '#e4e4e7',
  frontFlange: '#f0f0f2',
  frontStroke: '#a1a1aa',
  hub: '#d1d5db',
  hubInner: '#e5e7eb',
  center: '#71717a',
}

export default function SpoolIcon({ color = "#888", size = 52, showBackground = false, className }: SpoolIconProps) {
  const isDark = useIsDark()
  const uid = "sp" + String(color).replace(/[^a-zA-Z0-9]/g, "")

  const FL = (isDark && !isNearWhite(color)) || (!isDark && isNearBlack(color)) ? LIGHT_F : DARK_F

  const BCX = 82, FCX = 132, CY = 100;     // back & front flange centers (short body)
  const FRX = 22, FRY = 66;                // flange ellipse radii (thin rx = head-on tilt)
  const BRY = 58, BRX = 18;                // filament body cross-section
  const Rflange = 66, sx = FRX / Rflange;  // circle→ellipse squash for the front face
  const TOP = CY - BRY, BOT = CY + BRY;

  // wound-filament striations
  const coils: number[] = [];
  for (let x = BCX + 6; x <= FCX - 2; x += 4) coils.push(x);

  // front-flange "windows" showing the filament between the spokes
  const n = 9, step = (Math.PI * 2) / n, gap = step * 0.4, Ri = 26, Ro = 60;
  const windows: string[] = [];
  for (let i = 0; i < n; i++) {
    const a1 = i * step + gap / 2, a2 = (i + 1) * step - gap / 2;
    const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
    windows.push(
      `M${(Ro * c1).toFixed(1)} ${(Ro * s1).toFixed(1)} ` +
      `A${Ro} ${Ro} 0 0 1 ${(Ro * c2).toFixed(1)} ${(Ro * s2).toFixed(1)} ` +
      `L${(Ri * c2).toFixed(1)} ${(Ri * s2).toFixed(1)} ` +
      `A${Ri} ${Ri} 0 0 0 ${(Ri * c1).toFixed(1)} ${(Ri * s1).toFixed(1)} Z`
    );
  }

  const body = `M${BCX} ${TOP} L${FCX} ${TOP} A${BRX} ${BRY} 0 0 1 ${FCX} ${BOT} L${BCX} ${BOT} A${BRX} ${BRY} 0 0 1 ${BCX} ${TOP} Z`;

  return (
    <svg
      width={className ? "100%" : Math.round((size * 102) / 144)}
      height={className ? "100%" : size}
      viewBox="56 28 102 144"
      className={className}
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.30" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={`${uid}h`} cx="42%" cy="34%" r="75%">
          <stop offset="0" stopColor={FL.hub} />
          <stop offset="100%" stopColor={FL.hubInner} />
        </radialGradient>
      </defs>

      {showBackground && <rect x="56" y="28" width="102" height="144" rx="20" fill="#f0f0f2" />}

      {/* back flange — always dark so it reads as a visible wheel regardless of filament color */}
      <ellipse cx={BCX} cy={CY} rx={FRX} ry={FRY} fill={DARK_F.backFlange} />

      {/* wound filament cylinder */}
      <path d={body} fill={color} />
      {coils.map((x) => (
        <path key={x} d={`M${x} ${TOP} A${BRX} ${BRY} 0 0 0 ${x} ${BOT}`} fill="none" stroke="rgba(0,0,0,.13)" strokeWidth="1" />
      ))}
      <path d={body} fill={`url(#${uid}b)`} />

      {/* front flange with spoke windows */}
      <g transform={`translate(${FCX},${CY}) scale(${sx.toFixed(3)},1)`}>
        <ellipse cx="0" cy="0" rx={Rflange} ry={Rflange} fill={FL.frontFlange} />
        {windows.map((d, i) => <path key={i} d={d} fill={color} />)}
        <ellipse cx="0" cy="0" rx={Rflange} ry={Rflange} fill="none" stroke={FL.frontStroke} strokeWidth="2" />
        <ellipse cx="0" cy="0" rx="26" ry="26" fill={`url(#${uid}h)`} />
        <ellipse cx="0" cy="0" rx="11" ry="11" fill={FL.center} />
      </g>
    </svg>
  );
}