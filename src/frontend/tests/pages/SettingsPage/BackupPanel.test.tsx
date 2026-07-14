import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BackupPanel from '@/pages/SettingsPage/BackupPanel'

vi.mock('@/api/settings', () => ({
  backupApi: {
    probeMode: vi.fn(),
    getFiles: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    create: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    restoreUpload: vi.fn(),
    exportLegacy: vi.fn(),
  },
}))

import { backupApi } from '@/api/settings'

const mockSettings = {
  autoBackupEnabled: true,
  frequency: 'weekly' as const,
  retentionCount: 8,
  lastBackup: null,
  nextBackup: null,
}

const mockFiles = [
  {
    name: 'spoolhub_backup_2026.07.14_10.00.00.zip',
    size: 4096,
    lastModified: new Date().toISOString(),
  },
]

describe('BackupPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(backupApi.probeMode).mockResolvedValue('full')
    vi.mocked(backupApi.getFiles).mockResolvedValue(mockFiles)
    vi.mocked(backupApi.getSettings).mockResolvedValue(mockSettings)
  })

  it('lists backups and shows only delete in row actions', async () => {
    render(<BackupPanel isActive />)

    await waitFor(() => {
      expect(screen.getByText('spoolhub_backup_2026.07.14_10.00.00.zip')).toBeInTheDocument()
    })

    expect(screen.getByTitle('Delete backup')).toBeInTheDocument()
    expect(screen.queryByTitle('Restore backup')).not.toBeInTheDocument()
  })

  it('creates backup without showing saved message', async () => {
    const user = userEvent.setup()
    vi.mocked(backupApi.create).mockResolvedValue(mockFiles[0])

    render(<BackupPanel isActive />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Backup Now' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Backup Now' }))

    await waitFor(() => {
      expect(backupApi.create).toHaveBeenCalled()
    })
    expect(screen.queryByText('Backup saved.')).not.toBeInTheDocument()
  })

  it('keeps top restore backup button', async () => {
    render(<BackupPanel isActive />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Restore backup' })).toBeInTheDocument()
    })
  })
})
