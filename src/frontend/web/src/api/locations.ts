import { apiClient } from './client'
import type { LocationResponse } from '@/types/location'

export const locationsApi = {
  getAll: () =>
    apiClient.get<LocationResponse[]>('/api/locations').then(r => r.data),

  add: (body: { name: string }) =>
    apiClient.post<LocationResponse>('/api/locations', body).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/locations/${id}`),
}
