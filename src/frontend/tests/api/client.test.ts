import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('downloadBlobFile', () => {
  let downloadBlobFile: typeof import('@/api/client').downloadBlobFile
  let mockGet: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    mockGet = vi.fn()

    vi.doMock('@/api/session', () => ({
      getToken: () => 'test-jwt',
    }))
    vi.doMock('axios', async () => {
      const actual = await vi.importActual<typeof import('axios')>('axios')
      return {
        ...actual,
        default: {
          ...actual.default,
          create: () => ({
            get: mockGet,
            interceptors: {
              request: { use: vi.fn() },
              response: { use: vi.fn() },
            },
            defaults: { baseURL: '' },
          }),
        },
      }
    })

    const blob = new Blob(['zip-bytes'], { type: 'application/octet-stream' })
    mockGet.mockResolvedValue({ data: blob })

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadBlobFile = (await import('@/api/client')).downloadBlobFile
  })

  afterEach(() => {
    vi.doUnmock('@/api/session')
    vi.doUnmock('axios')
    vi.restoreAllMocks()
  })

  it('fetches blob via api client and saves with anchor click', async () => {
    await downloadBlobFile('/api/backup/download', 'backup.zip', { file: 'backup.zip' }, 1024)

    expect(mockGet).toHaveBeenCalledWith('/api/backup/download', {
      params: { file: 'backup.zip' },
      responseType: 'blob',
      skipOfflineEvent: true,
      timeout: 30_000,
    })
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })
})
