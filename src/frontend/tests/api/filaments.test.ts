import { describe, it, expect, vi, beforeEach } from 'vitest'
import { filamentsApi } from '@/api/filaments'

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/api/client', () => ({ apiClient: mockApiClient }))

beforeEach(() => vi.clearAllMocks())

describe('filamentsApi', () => {
  describe('getAll', () => {
    it('calls GET /api/filaments', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] })
      await filamentsApi.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/filaments')
    })

    it('returns the filaments array', async () => {
      const filaments = [{ id: '1', brand: 'Bambu' }]
      mockApiClient.get.mockResolvedValue({ data: filaments })
      expect(await filamentsApi.getAll()).toEqual(filaments)
    })
  })

  describe('refresh', () => {
    it('calls POST /api/filaments/refresh', async () => {
      mockApiClient.post.mockResolvedValue({ data: {} })
      await filamentsApi.refresh()
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/filaments/refresh')
    })
  })
})
