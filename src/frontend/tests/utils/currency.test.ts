import { describe, it, expect } from 'vitest'
import { getCurrencySymbol, formatCurrency } from '@/utils/currency'

describe('getCurrencySymbol', () => {
  it('returns Kr for SEK', () => {
    expect(getCurrencySymbol('SEK')).toBe('Kr')
  })

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$')
  })

  it('returns the code when unknown', () => {
    expect(getCurrencySymbol('NOK')).toBe('NOK')
  })
})

describe('formatCurrency', () => {
  it('formats SEK as Swedish style with comma and Kr suffix', () => {
    expect(formatCurrency(2, 'SEK')).toBe('2,00 Kr')
    expect(formatCurrency(29.99, 'SEK')).toBe('29,99 Kr')
  })

  it('formats USD with symbol prefix and dot decimal', () => {
    expect(formatCurrency(2, 'USD')).toBe('$2.00')
    expect(formatCurrency(29.99, 'USD')).toBe('$29.99')
  })

  it('formats EUR with symbol prefix', () => {
    expect(formatCurrency(10.5, 'EUR')).toBe('€10.50')
  })
})
