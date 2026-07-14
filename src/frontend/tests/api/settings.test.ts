import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'

describe('backupApi', () => {
  let backupApi: typeof import('@/api/settings').backupApi
  let mockGet: ReturnType<typeof vi.fn>
  let mockPost: ReturnType<typeof vi.fn>
  let mockPut: ReturnType<typeof vi.fn>
  let mockDelete: ReturnType<typeof vi.fn>
  let mockDownloadBlobFile: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    mockGet = vi.fn()
    mockPost = vi.fn()
    mockPut = vi.fn()
    mockDelete = vi.fn()
    mockDownloadBlobFile = vi.fn().mockResolvedValue(undefined)

    vi.doMock('@/api/client', () => ({
      apiClient: {
        get: mockGet,
        post: mockPost,
        put: mockPut,
        delete: mockDelete,
      },
      downloadBlobFile: mockDownloadBlobFile,
    }))

    backupApi = (await import('@/api/settings')).backupApi
  })

  afterEach(() => {
    vi.doUnmock('@/api/client')
    vi.doUnmock('@/api/settings')
  })

  describe('probeMode', () => {
    it('returns full when backup files endpoint exists', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })
      await expect(backupApi.probeMode()).resolves.toBe('full')
      expect(mockGet).toHaveBeenCalledWith('/api/backup/files')
    })

    it('returns legacy when backup endpoints return 404', async () => {
      const notFound = Object.assign(new Error('not found'), {
        isAxiosError: true,
        response: { status: 404 },
      })
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true)
      mockGet.mockRejectedValueOnce(notFound).mockRejectedValueOnce(notFound)

      await expect(backupApi.probeMode()).resolves.toBe('legacy')
      expect(mockGet).toHaveBeenCalledWith('/api/backup/settings')
    })

    it('treats 401 as full api available', async () => {
      const unauthorized = Object.assign(new Error('unauthorized'), {
        isAxiosError: true,
        response: { status: 401 },
      })
      vi.spyOn(axios, 'isAxiosError').mockReturnValue(true)
      mockGet.mockRejectedValueOnce(unauthorized)

      await expect(backupApi.probeMode()).resolves.toBe('full')
    })
  })

  describe('download', () => {
    it('delegates to downloadBlobFile with file param and size', async () => {
      await backupApi.download('spoolhub_backup_2026.01.01_12.00.00.zip', 4096)
      expect(mockDownloadBlobFile).toHaveBeenCalledWith(
        '/api/backup/download',
        'spoolhub_backup_2026.01.01_12.00.00.zip',
        { file: 'spoolhub_backup_2026.01.01_12.00.00.zip' },
        4096,
      )
    })
  })

  describe('create', () => {
    it('posts to /api/backup with long timeout', async () => {
      mockPost.mockResolvedValue({ data: { name: 'a.zip', size: 1, lastModified: 'now' } })
      await backupApi.create()
      expect(mockPost).toHaveBeenCalledWith('/api/backup', {}, { timeout: 120_000 })
    })
  })
})

describe('logsApi', () => {
  let logsApi: typeof import('@/api/settings').logsApi
  let mockDownloadBlobFile: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    mockDownloadBlobFile = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/api/client', () => ({
      apiClient: {
        get: vi.fn(),
        post: vi.fn(),
      },
      downloadBlobFile: mockDownloadBlobFile,
    }))
    logsApi = (await import('@/api/settings')).logsApi
  })

  afterEach(() => {
    vi.doUnmock('@/api/client')
    vi.doUnmock('@/api/settings')
  })

  it('download uses blob helper instead of navigation', async () => {
    await logsApi.download('spoolhub20260714.txt', 8192)
    expect(mockDownloadBlobFile).toHaveBeenCalledWith(
      '/api/logs/download',
      'spoolhub20260714.txt',
      { file: 'spoolhub20260714.txt' },
      8192,
    )
  })
})
