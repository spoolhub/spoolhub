import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseDualColors } from '@/utils/colorUtils'

// CSS color names that colorNameToHex must resolve in this test environment.
// The sentinel (#7f3f1f) must be included so the function can detect unresolved names.
const CSS_COLORS: Record<string, string> = {
  '#7f3f1f': '#7f3f1f',
  blue: '#0000ff', green: '#008000', red: '#ff0000',
  pink: '#ffc0cb', orange: '#ffa500', purple: '#800080',
  white: '#ffffff', black: '#000000', yellow: '#ffff00',
  gold: '#ffd700', silver: '#c0c0c0', teal: '#008080',
  cyan: '#00ffff', coral: '#ff7f50',
}

function makeCtx() {
  let fill = ''
  return {
    get fillStyle() { return fill },
    set fillStyle(v: string) {
      const key = v.toLowerCase().trim()
      // Simulate browser: silently ignore unknown values, keep previous
      if (key in CSS_COLORS) fill = CSS_COLORS[key]
    },
  }
}

describe('parseDualColors', () => {
  beforeEach(() => {
    const orig = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag !== 'canvas') return orig(tag)
      const el = orig('canvas') as HTMLCanvasElement
      Object.defineProperty(el, 'getContext', {
        configurable: true,
        value: () => makeCtx(),
      })
      return el
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('returns null for a single color word', () => {
    expect(parseDualColors('Blue')).toBeNull()
  })

  it('returns null for an unrecognized multi-word name', () => {
    expect(parseDualColors('Galaxy Rainbow')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseDualColors('')).toBeNull()
  })

  it('parses Bambu Lab parentheses pattern "Blue Hawaii (Blue-Green)"', () => {
    const result = parseDualColors('Blue Hawaii (Blue-Green)')
    expect(result).toHaveLength(2)
    expect(result![0]).toBe('#0000ff')
    expect(result![1]).toBe('#008000')
  })

  it('parses eSUN plus-separated two colors', () => {
    const result = parseDualColors('Green+Blue')
    expect(result).toHaveLength(2)
    expect(result![0]).toBe('#008000')
    expect(result![1]).toBe('#0000ff')
  })

  it('parses eSUN plus-separated three colors', () => {
    const result = parseDualColors('Blue+Red+Purple')
    expect(result).toHaveLength(3)
  })

  it('parses "Dual Color" prefix', () => {
    const result = parseDualColors('Dual Color Green Pink')
    expect(result).toHaveLength(2)
    expect(result![0]).toBe('#008000')
    expect(result![1]).toBe('#ffc0cb')
  })

  it('parses "Dual Colour" (British spelling) prefix', () => {
    const result = parseDualColors('Dual Colour Blue Red')
    expect(result).toHaveLength(2)
  })

  it('parses space-separated CSS color words', () => {
    const result = parseDualColors('Gold Silver')
    expect(result).toHaveLength(2)
    expect(result![0]).toBe('#ffd700')
    expect(result![1]).toBe('#c0c0c0')
  })

  it('returns null when not all space-separated words are CSS colors', () => {
    expect(parseDualColors('Galaxy Blue')).toBeNull()
  })
})
