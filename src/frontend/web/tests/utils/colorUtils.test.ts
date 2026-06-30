import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseDualColors, groupSimilarColors } from '@/utils/colorUtils'

// Mock canvas context to simulate browser CSS color normalization
function makeMockCtx() {
  const colorMap: Record<string, string> = {
    red: '#ff0000', blue: '#0000ff', black: '#000000', white: '#ffffff',
    green: '#008000', purple: '#800080', orange: '#ffa500', pink: '#ffc0cb',
    cyan: '#00ffff', yellow: '#ffff00', gold: '#ffd700', silver: '#c0c0c0',
  }
  let _fillStyle = '#7f3f1f'
  return {
    get fillStyle() { return _fillStyle },
    set fillStyle(v: string) {
      const normalized = colorMap[v.toLowerCase().trim()]
      _fillStyle = normalized ?? '#7f3f1f'
    },
  }
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(makeMockCtx() as unknown as RenderingContext)
})

describe('parseDualColors', () => {
  it('parses Bambu Lab parenthesis format "(Blue-Green)"', () => {
    const result = parseDualColors('Blue Hawaii (Blue-Green)')
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
  })

  it('parses eSUN plus format "Green+Blue"', () => {
    const result = parseDualColors('Green+Blue')
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0]).toBe('#008000')
    expect(result![1]).toBe('#0000ff')
  })

  it('parses triple plus format "Blue+Red+Purple"', () => {
    const result = parseDualColors('Blue+Red+Purple')
    expect(result).not.toBeNull()
    expect(result!.length).toBeGreaterThanOrEqual(2)
  })

  it('parses "Dual Color Blue Red" prefix format', () => {
    const result = parseDualColors('Dual Color Blue Red')
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
  })

  it('parses "Dual Colour Blue Red" alternate spelling', () => {
    const result = parseDualColors('Dual Colour Blue Red')
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
  })

  it('returns null for a single solid color name', () => {
    expect(parseDualColors('Red')).toBeNull()
  })

  it('returns null for a name that does not resolve to colors', () => {
    expect(parseDualColors('Galactic Nebula Premium')).toBeNull()
  })
})

describe('groupSimilarColors', () => {
  const makeColor = (hex: string) => ({ hex, label: hex })

  it('keeps colors that are far apart', () => {
    const colors = [makeColor('#ff0000'), makeColor('#0000ff')]
    expect(groupSimilarColors(colors)).toHaveLength(2)
  })

  it('deduplicates identical colors', () => {
    const colors = [makeColor('#ff0000'), makeColor('#ff0000')]
    expect(groupSimilarColors(colors)).toHaveLength(1)
  })

  it('groups very similar colors within threshold', () => {
    // Two reds that are very close
    const colors = [makeColor('#ff0000'), makeColor('#fe0000')]
    expect(groupSimilarColors(colors, 60)).toHaveLength(1)
  })

  it('keeps colors beyond threshold as separate entries', () => {
    const colors = [makeColor('#000000'), makeColor('#ffffff')]
    expect(groupSimilarColors(colors, 60)).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(groupSimilarColors([])).toEqual([])
  })
})
