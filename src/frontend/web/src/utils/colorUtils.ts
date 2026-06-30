import type { ColorOption } from '@/types/spoolFilters'

// Resolves a color name to hex using the browser's CSS color parser.
// Tries the full name first, then just the last word (e.g. "Matte Black" → "black").
export function colorNameToHex(name: string): string | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const sentinel = '#7f3f1f'
  const candidates = [...new Set([name.trim(), name.trim().split(/\s+/).pop() ?? ''])]
  for (const candidate of candidates) {
    if (!candidate) continue
    ctx.fillStyle = sentinel
    ctx.fillStyle = candidate
    const resolved = ctx.fillStyle
    if (resolved !== sentinel) return resolved
    if (candidate.toLowerCase().replace(/\s/g, '') === sentinel) return resolved
  }
  return null
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '').padEnd(6, '0')
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

// Parses dual/multi-color names into hex arrays.
// Handles Bambu Lab style: "Blue Hawaii (Blue-Green)" → ["#0000ff", "#008000"]
// Handles eSUN + style:    "Green+Blue" / "Blue+Red+Purple" → resolved hexes
// Handles eSUN space style: "Blue Orange Green" (all words are valid CSS colors)
export function parseDualColors(colorName: string): string[] | null {
  // Bambu Lab: extract colors from parentheses "(Blue-Green)"
  const parenMatch = colorName.match(/\(([^)]+)\)/)
  if (parenMatch) {
    const parts = parenMatch[1].split('-').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const hexes = parts.map(c => colorNameToHex(c)).filter(Boolean) as string[]
      if (hexes.length >= 2) return hexes
    }
  }

  // eSUN "+" separated: "Green+Blue", "Blue+Red+Purple"
  if (colorName.includes('+')) {
    const parts = colorName.split('+').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const hexes = parts.map(c => colorNameToHex(c)).filter(Boolean) as string[]
      if (hexes.length >= 2) return hexes
    }
  }

  // "Dual Color Green Pink" / "Dual Colour Blue Red" — strip prefix, parse remainder
  const dualPrefix = colorName.match(/^dual\s+colou?r\s+(.+)$/i)
  if (dualPrefix) {
    const parts = dualPrefix[1].trim().split(/\s+/)
    const hexes = parts.map(c => colorNameToHex(c)).filter(Boolean) as string[]
    if (hexes.length >= 2) return hexes
  }

  // eSUN space separated: "Blue Orange Green", "Gold Silver Copper"
  // Only when every word individually resolves to a CSS color
  const spaceWords = colorName.trim().split(/\s+/)
  if (spaceWords.length >= 2) {
    const hexes = spaceWords.map(c => colorNameToHex(c)).filter(Boolean) as string[]
    if (hexes.length === spaceWords.length) return hexes
  }

  return null
}

export function groupSimilarColors(colors: ColorOption[], threshold = 60): ColorOption[] {
  const groups: ColorOption[] = []
  for (const color of colors) {
    const alreadyCovered = groups.some(g => colorDistance(g.hex, color.hex) < threshold)
    if (!alreadyCovered) groups.push(color)
  }
  return groups
}
