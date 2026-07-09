import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scanTag, registerTag, writeTagUrl } from '@/api/nfc'

const mockApiClient = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('@/api/client', () => ({ apiClient: mockApiClient }))

beforeEach(() => vi.clearAllMocks())

describe('nfc api', () => {
  describe('scanTag', () => {
    it('calls POST /api/nfc-tags/scan with tagUid', async () => {
      mockApiClient.post.mockResolvedValue({ data: { status: 'found', tagUid: 'ABC123' } })
      await scanTag('ABC123')
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/nfc-tags/scan', { tagUid: 'ABC123' })
    })

    it('returns the scan result', async () => {
      const result = { status: 'unknown', tagUid: 'XYZ', spool: null, message: null }
      mockApiClient.post.mockResolvedValue({ data: result })
      expect(await scanTag('XYZ')).toEqual(result)
    })
  })

  describe('registerTag', () => {
    it('calls POST /api/nfc-tags with tagUid, spoolId and type NFC', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} })
      await registerTag('TAG001', 'spool-1')
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/nfc-tags', {
        tagUid: 'TAG001',
        spoolId: 'spool-1',
        type: 'NFC',
      })
    })
  })

  describe('writeTagUrl', () => {
    it('calls POST /api/nfc-tags/write-url with url', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} })
      await writeTagUrl('http://localhost/scan?tagUid=ABC')
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/nfc-tags/write-url', {
        url: 'http://localhost/scan?tagUid=ABC',
      })
    })
  })
})
