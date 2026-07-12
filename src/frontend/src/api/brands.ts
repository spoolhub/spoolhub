import { apiClient } from './client'
import type { BrandApiResponse, OfdBrandResult } from '@/types/brand'

export const brandsApi = {
  getAll: () =>
    apiClient.get<BrandApiResponse[]>('/api/brands').then(r => r.data),

  add: (body: { name: string; domain: string; ofdSlug: string }) =>
    apiClient.post<BrandApiResponse>('/api/brands', body).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/brands/${id}`),

  searchOfd: (q: string, signal?: AbortSignal) =>
    apiClient
      .get<OfdBrandResult[]>(`/api/brands/ofd-search?q=${encodeURIComponent(q)}`, { signal })
      .then(r => r.data),
}
