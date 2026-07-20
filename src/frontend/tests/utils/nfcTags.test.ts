import { describe, it, expect } from 'vitest'
import { getNfcTagUids, hasDualNfcTags, nfcSideLabel } from '@/utils/nfcTags'

describe('nfcTags utils', () => {
  it('prefers nfcTagUids when present', () => {
    expect(getNfcTagUids({
      hasNfcTag: true,
      nfcTagUid: 'OLD',
      nfcTagUids: ['A', 'B'],
    })).toEqual(['A', 'B'])
  })

  it('falls back to nfcTagUid for older payloads', () => {
    expect(getNfcTagUids({
      hasNfcTag: true,
      nfcTagUid: 'ONLY',
      nfcTagUids: [],
    })).toEqual(['ONLY'])
  })

  it('handles missing nfcTagUids from API responses', () => {
    expect(getNfcTagUids({
      hasNfcTag: true,
      nfcTagUid: 'ONLY',
    })).toEqual(['ONLY'])
  })

  it('detects dual tags', () => {
    expect(hasDualNfcTags({
      hasNfcTag: true,
      nfcTagUid: 'A',
      nfcTagUids: ['A', 'B'],
    })).toBe(true)
  })

  it('labels sides A and B', () => {
    expect(nfcSideLabel(0)).toBe('Side A')
    expect(nfcSideLabel(1)).toBe('Side B')
  })
})
