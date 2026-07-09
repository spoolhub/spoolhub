import { apiClient } from './client'
import type { LocationResponse, AddLocationRequest, UpdateLocationRequest } from '@/types/location'

export const locationsApi = {
  getAll: () =>
    apiClient.get<LocationResponse[]>('/api/locations').then(r => r.data),

  add: (body: AddLocationRequest) =>
    apiClient.post<LocationResponse>('/api/locations', body).then(r => r.data),

  update: (id: string, body: UpdateLocationRequest) =>
    apiClient.put<LocationResponse>(`/api/locations/${id}`, body).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/locations/${id}`),
}
