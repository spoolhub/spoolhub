import { describe, it, expect } from 'vitest'
import { formatBackupSize, formatBackupTime } from '@/pages/SettingsPage/backupUtils'

describe('formatBackupSize', () => {
  it('formats bytes', () => {
    expect(formatBackupSize(512)).toBe('512 B')
  })

  it('formats kibibytes', () => {
    expect(formatBackupSize(2048)).toBe('2.0 KiB')
  })

  it('formats mebibytes', () => {
    expect(formatBackupSize(5 * 1024 * 1024)).toBe('5.0 MiB')
  })
})

describe('formatBackupTime', () => {
  it('returns Today for same calendar day', () => {
    const now = new Date()
    expect(formatBackupTime(now.toISOString())).toBe('Today')
  })

  it('returns Yesterday for prior calendar day', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(formatBackupTime(yesterday.toISOString())).toBe('Yesterday')
  })

  it('returns formatted date for older backups', () => {
    expect(formatBackupTime('2020-01-15T12:00:00.000Z')).toMatch(/Jan/)
  })
})
