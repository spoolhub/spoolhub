import { describe, expect, it } from 'vitest'
import { compareVersions, getReleaseBadge } from './updatesUtils'

describe('getReleaseBadge', () => {
  it('marks the installed release as current', () => {
    expect(getReleaseBadge('1.1.0', '1.1.0', '1.1.0', false)).toBe('current')
  })

  it('marks older releases as previously installed', () => {
    expect(getReleaseBadge('1.0.0', '1.1.0', '1.1.0', false)).toBe('previous')
  })

  it('does not mark the latest release as new when already installed', () => {
    expect(getReleaseBadge('1.1.0', '1.1.0', '1.1.0', false)).toBe('current')
    expect(getReleaseBadge('1.1.0', '1.1.0', '1.1.0', true)).toBe('current')
  })

  it('marks only the latest GitHub release as new when an update is available', () => {
    expect(getReleaseBadge('1.2.0', '1.1.0', '1.2.0', true)).toBe('new')
    expect(getReleaseBadge('1.1.0', '1.1.0', '1.2.0', true)).toBe('current')
    expect(getReleaseBadge('1.0.0', '1.1.0', '1.2.0', true)).toBe('previous')
  })
})

describe('compareVersions', () => {
  it('orders semver releases', () => {
    expect(compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0)
    expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0)
    expect(compareVersions('1.1.0', '1.1.0')).toBe(0)
  })
})
