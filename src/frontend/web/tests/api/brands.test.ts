import { describe, it, expect, vi, beforeEach } from 'vitest'
import { brandsApi } from '@/api/brands'

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/client', () => ({ apiClient: mockApiClient }))

beforeEach(() => vi.clearAllMocks())

describe('brandsApi', () => {
  describe('getAll', () => {
    it('calls GET /api/brands', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] })
      await brandsApi.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/brands')
    })

    it('returns the brands array', async () => {
      const brands = [{ id: '1', name: 'Bambu Lab' }]
      mockApiClient.get.mockResolvedValue({ data: brands })
      expect(await brandsApi.getAll()).toEqual(brands)
    })
  })

  describe('add', () => {
    it('calls POST /api/brands with body', async () => {
      const body = { name: 'Bambu Lab', domain: 'bambulab.com', ofdSlug: 'bambu-lab' }
      mockApiClient.post.mockResolvedValue({ data: { id: '1', ...body } })
      await brandsApi.add(body)
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/brands', body)
    })

    it('returns the created brand', async () => {
      const brand = { id: '1', name: 'Bambu Lab' }
      mockApiClient.post.mockResolvedValue({ data: brand })
      expect(await brandsApi.add({ name: 'Bambu Lab', domain: '', ofdSlug: '' })).toEqual(brand)
    })
  })

  describe('delete', () => {
    it('calls DELETE /api/brands/:id', async () => {
      mockApiClient.delete.mockResolvedValue({})
      await brandsApi.delete('brand-id')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/brands/brand-id')
    })
  })

  describe('searchOfd', () => {
    it('calls GET with encoded query param', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] })
      await brandsApi.searchOfd('Bambu Lab')
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/brands/ofd-search?q=Bambu%20Lab',
        expect.objectContaining({ signal: undefined })
      )
    })

    it('passes AbortSignal when provided', async () => {
      const controller = new AbortController()
      mockApiClient.get.mockResolvedValue({ data: [] })
      await brandsApi.searchOfd('test', controller.signal)
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/brands/ofd-search?q=test',
        expect.objectContaining({ signal: controller.signal })
      )
    })

    it('returns array of search results', async () => {
      const results = [{ name: 'Bambu Lab', slug: 'bambu-lab' }]
      mockApiClient.get.mockResolvedValue({ data: results })
      expect(await brandsApi.searchOfd('Bambu')).toEqual(results)
    })
  })
})
