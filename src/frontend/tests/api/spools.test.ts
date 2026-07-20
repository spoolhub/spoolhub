import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Uses vi.resetModules() + vi.doMock pattern to get a fresh cache each test
describe('spoolsApi', () => {
  let spoolsApi: typeof import('@/api/spools').spoolsApi
  let mockGet: ReturnType<typeof vi.fn>
  let mockPost: ReturnType<typeof vi.fn>
  let mockPut: ReturnType<typeof vi.fn>
  let mockPatch: ReturnType<typeof vi.fn>
  let mockDelete: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    mockGet = vi.fn()
    mockPost = vi.fn()
    mockPut = vi.fn()
    mockPatch = vi.fn()
    mockDelete = vi.fn()
    vi.doMock('@/api/client', () => ({
      apiClient: {
        get: mockGet,
        post: mockPost,
        put: mockPut,
        patch: mockPatch,
        delete: mockDelete,
      },
    }))
    spoolsApi = (await import('@/api/spools')).spoolsApi
  })

  afterEach(() => vi.doUnmock('@/api/client'))

  const mockSpool = (id = 'spool-1') => ({
    id, brand: 'Bambu', material: 'PLA', colorName: 'White', colorHex: '#FFFFFF',
    initialWeightG: 1000, currentWeightG: 800, isActive: false, isArchived: false,
    spoolWeightG: 200, lowStockThresholdG: 100,
    createdAt: new Date().toISOString(), lastScannedAt: null, notes: null,
    density: null, extruderMin: null, extruderMax: null, bedMin: null, bedMax: null,
    hasNfcTag: false, nfcTagUid: null, nfcTagUids: [], printerId: null, printerName: null, amsSlot: null,
  })

  describe('getAll', () => {
    it('calls GET /api/spools on first fetch', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await spoolsApi.getAll()
      expect(mockGet).toHaveBeenCalledWith('/api/spools')
    })

    it('returns array of spools', async () => {
      const spools = [mockSpool(), mockSpool('spool-2')]
      mockGet.mockResolvedValue({ data: spools })
      expect(await spoolsApi.getAll()).toEqual(spools)
    })

    it('returns cached data on second call within TTL', async () => {
      const spools = [mockSpool()]
      mockGet.mockResolvedValue({ data: spools })
      await spoolsApi.getAll()
      await spoolsApi.getAll()
      expect(mockGet).toHaveBeenCalledTimes(1)
    })

    it('refetches after cache is invalidated by add()', async () => {
      mockGet.mockResolvedValue({ data: [] })
      mockPost.mockResolvedValue({ data: mockSpool() })
      await spoolsApi.getAll()
      await spoolsApi.add({ brand: 'Bambu', material: 'PLA', colorName: 'White', colorHex: '#FFF', initialWeightG: 1000, currentWeightG: 1000 })
      await spoolsApi.getAll()
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })

  describe('getById', () => {
    it('hits network when cache is empty', async () => {
      mockGet.mockResolvedValue({ data: mockSpool() })
      await spoolsApi.getById('spool-1')
      expect(mockGet).toHaveBeenCalledWith('/api/spools/spool-1')
    })

    it('returns spool from cache when available', async () => {
      const spool = mockSpool('cached-spool')
      mockGet.mockResolvedValue({ data: [spool] })
      await spoolsApi.getAll()
      mockGet.mockClear()
      const result = await spoolsApi.getById('cached-spool')
      expect(mockGet).not.toHaveBeenCalled()
      expect(result).toEqual(spool)
    })
  })

  describe('add', () => {
    it('calls POST /api/spools with body', async () => {
      const req = { brand: 'Bambu', material: 'PLA', colorName: 'White', colorHex: '#FFF', initialWeightG: 1000, currentWeightG: 1000 }
      mockPost.mockResolvedValue({ data: mockSpool() })
      await spoolsApi.add(req)
      expect(mockPost).toHaveBeenCalledWith('/api/spools', req)
    })

    it('returns the created spool', async () => {
      const spool = mockSpool('new-spool')
      mockPost.mockResolvedValue({ data: spool })
      expect(await spoolsApi.add({ brand: 'Bambu', material: 'PLA', colorName: 'W', colorHex: '#FFF', initialWeightG: 1000, currentWeightG: 1000 })).toEqual(spool)
    })
  })

  describe('update', () => {
    it('calls PUT /api/spools/:id', async () => {
      mockPut.mockResolvedValue({ data: mockSpool() })
      await spoolsApi.update('spool-1', { colorName: 'Black' })
      expect(mockPut).toHaveBeenCalledWith('/api/spools/spool-1', { colorName: 'Black' })
    })
  })

  describe('activate', () => {
    it('calls PATCH /api/spools/activate/:id', async () => {
      mockPatch.mockResolvedValue({ data: mockSpool() })
      await spoolsApi.activate('spool-1')
      expect(mockPatch).toHaveBeenCalledWith('/api/spools/activate/spool-1')
    })
  })

  describe('deactivate', () => {
    it('calls PATCH /api/spools/deactivate/:id', async () => {
      mockPatch.mockResolvedValue({ data: mockSpool() })
      await spoolsApi.deactivate('spool-1')
      expect(mockPatch).toHaveBeenCalledWith('/api/spools/deactivate/spool-1')
    })
  })

  describe('delete', () => {
    it('calls DELETE /api/spools/:id', async () => {
      mockDelete.mockResolvedValue({})
      await spoolsApi.delete('spool-1')
      expect(mockDelete).toHaveBeenCalledWith('/api/spools/spool-1')
    })
  })

  describe('assignPrinter', () => {
    it('calls PATCH /api/spools/:id/assign-printer with body', async () => {
      mockPatch.mockResolvedValue({ data: mockSpool() })
      await spoolsApi.assignPrinter('spool-1', { printerId: 'printer-1', amsSlot: 2 })
      expect(mockPatch).toHaveBeenCalledWith('/api/spools/spool-1/assign-printer', {
        printerId: 'printer-1',
        amsSlot: 2,
      })
    })

    it('includes displacedStockLocation when provided', async () => {
      mockPatch.mockResolvedValue({ data: mockSpool() })
      await spoolsApi.assignPrinter('spool-1', {
        printerId: 'printer-1',
        amsSlot: 4,
        displacedStockLocation: 'Shelf B',
      })
      expect(mockPatch).toHaveBeenCalledWith('/api/spools/spool-1/assign-printer', {
        printerId: 'printer-1',
        amsSlot: 4,
        displacedStockLocation: 'Shelf B',
      })
    })
  })
})
