import { apiClient } from './client'
import type { SpoolResponse, AddSpoolRequest, UpdateSpoolRequest, AssignPrinterRequest, SpoolMonthlyStats } from '@/types/spool'

let cache: { data: SpoolResponse[]; ts: number } | null = null
const CACHE_TTL = 30_000

export function invalidateSpoolsCache() { cache = null }
function invalidate() { cache = null }

export const spoolsApi = {
  getAll: () => {
    if (cache && Date.now() - cache.ts < CACHE_TTL)
      return Promise.resolve(cache.data)
    return apiClient.get<SpoolResponse[]>('/api/spools')
      .then(r => { cache = { data: r.data, ts: Date.now() }; return r.data })
  },

  getById: (id: string) => {
    const cached = cache && Date.now() - cache.ts < CACHE_TTL
      ? cache.data.find(s => s.id === id)
      : null
    if (cached) return Promise.resolve(cached)
    return apiClient.get<SpoolResponse>(`/api/spools/${id}`).then(r => r.data)
  },

  add: (body: AddSpoolRequest) =>
    apiClient.post<SpoolResponse>('/api/spools', body)
      .then(r => { invalidate(); return r.data }),

  update: (id: string, body: UpdateSpoolRequest) =>
    apiClient.put<SpoolResponse>(`/api/spools/${id}`, body)
      .then(r => { invalidate(); return r.data }),

  activate: (id: string) =>
    apiClient.patch<SpoolResponse>(`/api/spools/activate/${id}`)
      .then(r => { invalidate(); return r.data }),

  deactivate: (id: string) =>
    apiClient.patch<SpoolResponse>(`/api/spools/deactivate/${id}`)
      .then(r => { invalidate(); return r.data }),

  delete: (id: string) =>
    apiClient.delete(`/api/spools/${id}`)
      .then(r => { invalidate(); return r }),

  assignPrinter: (id: string, body: AssignPrinterRequest) =>
    apiClient.patch<SpoolResponse>(`/api/spools/${id}/assign-printer`, body)
      .then(r => { invalidate(); return r.data }),

  getMonthlyStats: () =>
    apiClient.get<SpoolMonthlyStats>('/api/spools/monthly-stats').then(r => r.data),
}
