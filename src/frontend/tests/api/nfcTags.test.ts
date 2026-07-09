import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nfcTagsApi } from '@/api/nfcTags'

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/api/client', () => ({ apiClient: mockApiClient }))

beforeEach(() => vi.clearAllMocks())

describe('nfcTagsApi', () => {
  describe('add', () => {
    it('calls POST /api/nfc-tags', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} })
      await nfcTagsApi.add({ tagUid: 'UID1', spoolId: 'spool-1', type: 'NFC' })
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/nfc-tags', {
        tagUid: 'UID1',
        spoolId: 'spool-1',
        type: 'NFC',
      })
    })
  })

  describe('scan', () => {
    it('calls POST /api/nfc-tags/scan', async () => {
      const result = { status: 'found', tagUid: 'UID1', spool: null, message: null }
      mockApiClient.post.mockResolvedValue({ data: result })
      await nfcTagsApi.scan({ tagUid: 'UID1' })
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/nfc-tags/scan', { tagUid: 'UID1' })
    })
  })

  describe('lookup', () => {
    it('calls GET /api/nfc-tags/lookup with tagUid param', async () => {
      mockApiClient.get.mockResolvedValue({ data: { spoolId: 'spool-1' } })
      await nfcTagsApi.lookup('UID1')
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/nfc-tags/lookup', {
        params: { tagUid: 'UID1' },
      })
    })

    it('returns null when lookup fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Not Found'))
      const result = await nfcTagsApi.lookup('UNKNOWN')
      expect(result).toBeNull()
    })

    it('returns spoolId when found', async () => {
      mockApiClient.get.mockResolvedValue({ data: { spoolId: 'spool-42' } })
      expect(await nfcTagsApi.lookup('UID1')).toEqual({ spoolId: 'spool-42' })
    })
  })
})
