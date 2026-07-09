import { describe, it, expect, vi, beforeEach } from 'vitest'
import { printersApi } from '@/api/printers'
import type { RegisterLanPrinterRequest, UpdatePrinterRequest } from '@/types/printer'

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/client', () => ({ apiClient: mockApiClient }))

beforeEach(() => vi.clearAllMocks())

describe('printersApi', () => {
  describe('getAll', () => {
    it('calls GET /api/printers', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] })
      await printersApi.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/printers')
    })

    it('returns the response data', async () => {
      const printers = [{ id: '1', name: 'P1' }]
      mockApiClient.get.mockResolvedValue({ data: printers })
      expect(await printersApi.getAll()).toEqual(printers)
    })
  })

  describe('getById', () => {
    it('calls GET /api/printers/:id', async () => {
      mockApiClient.get.mockResolvedValue({ data: {} })
      await printersApi.getById('abc-123')
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/printers/abc-123')
    })
  })

  describe('getStatus', () => {
    it('calls GET /api/printers/:id/status', async () => {
      mockApiClient.get.mockResolvedValue({ data: null })
      await printersApi.getStatus('abc-123')
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/printers/abc-123/status')
    })

    it('returns null when printer is idle', async () => {
      mockApiClient.get.mockResolvedValue({ data: null })
      expect(await printersApi.getStatus('abc')).toBeNull()
    })
  })

  describe('registerLan', () => {
    it('calls POST /api/printers/register/lan with body', async () => {
      const req: RegisterLanPrinterRequest = { name: 'P1', brand: 'Bambu', model: 'X1', ipAddress: '192.168.1.1', port: 1883, hasAms: false }
      mockApiClient.post.mockResolvedValue({ data: {} })
      await printersApi.registerLan(req)
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/printers/register/lan', req)
    })
  })

  describe('update', () => {
    it('calls PUT /api/printers/:id with request body', async () => {
      mockApiClient.put.mockResolvedValue({ data: {} })
      await printersApi.update('abc-123', { name: 'Updated' } as UpdatePrinterRequest)
      expect(mockApiClient.put).toHaveBeenCalledWith('/api/printers/abc-123', { name: 'Updated' })
    })
  })

  describe('remove', () => {
    it('calls DELETE /api/printers/:id', async () => {
      mockApiClient.delete.mockResolvedValue({})
      await printersApi.remove('abc-123')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/printers/abc-123')
    })
  })

  describe('registerCloud', () => {
    it('calls POST /api/printers/register/cloud', async () => {
      const req = { brand: 'Bambu Lab', email: 'u@x.com', password: 'pass' }
      mockApiClient.post.mockResolvedValue({ data: { requiresVerification: true } })
      await printersApi.registerCloud(req)
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/printers/register/cloud', req)
    })
  })

  describe('verifyCloud', () => {
    it('calls POST /api/printers/cloud/verify', async () => {
      mockApiClient.post.mockResolvedValue({ data: [] })
      await printersApi.verifyCloud({ code: 123456 })
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/printers/cloud/verify', { code: 123456 })
    })
  })
})
