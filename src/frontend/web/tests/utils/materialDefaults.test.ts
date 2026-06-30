import { describe, it, expect } from 'vitest'
import { getMaterialDefaults } from '@/utils/materialDefaults'

describe('getMaterialDefaults', () => {
  it('returns correct defaults for PLA', () => {
    const d = getMaterialDefaults('PLA')
    expect(d).toEqual({ extruderMin: 190, extruderMax: 230, bedMin: 35, bedMax: 60 })
  })

  it('returns correct defaults for PETG', () => {
    const d = getMaterialDefaults('PETG')
    expect(d).toEqual({ extruderMin: 220, extruderMax: 250, bedMin: 70, bedMax: 85 })
  })

  it('returns correct defaults for ABS', () => {
    const d = getMaterialDefaults('ABS')
    expect(d).toEqual({ extruderMin: 230, extruderMax: 260, bedMin: 85, bedMax: 110 })
  })

  it('is case-insensitive (pla → PLA defaults)', () => {
    expect(getMaterialDefaults('pla')).toEqual(getMaterialDefaults('PLA'))
  })

  it('is case-insensitive (Petg → PETG defaults)', () => {
    expect(getMaterialDefaults('Petg')).toEqual(getMaterialDefaults('PETG'))
  })

  it('matches PLA-CF via prefix (PLA)', () => {
    const d = getMaterialDefaults('PLA-CF')
    expect(d).toEqual(getMaterialDefaults('PLA'))
  })

  it('matches PLA+ via prefix (PLA)', () => {
    expect(getMaterialDefaults('PLA+')).toEqual(getMaterialDefaults('PLA'))
  })

  it('matches PETG-CF via prefix (PETG, not PLA)', () => {
    expect(getMaterialDefaults('PETG-CF')).toEqual(getMaterialDefaults('PETG'))
  })

  it('matches TPU-95A via prefix (TPU)', () => {
    expect(getMaterialDefaults('TPU-95A')).toEqual(getMaterialDefaults('TPU'))
  })

  it('matches PA-CF via prefix (PA)', () => {
    expect(getMaterialDefaults('PA-CF')).toEqual(getMaterialDefaults('PA'))
  })

  it('returns null for an unknown material', () => {
    expect(getMaterialDefaults('UNKNOWN')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(getMaterialDefaults('')).toBeNull()
  })

  it('longer prefix wins over shorter when both match (PETG beats PA for PETG-CF)', () => {
    const result = getMaterialDefaults('PETG-CF')
    expect(result?.extruderMin).toBe(220)
  })
})
