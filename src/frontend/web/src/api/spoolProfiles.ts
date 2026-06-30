import { apiClient } from './client'
import type { SpoolProfileResponse, AddSpoolProfileRequest } from '@/types/spoolProfile'

export const spoolProfilesApi = {
  getAll: () =>
    apiClient.get<SpoolProfileResponse[]>('/api/spool-profiles').then(r => r.data),

  getById: (id: string) =>
    apiClient.get<SpoolProfileResponse>(`/api/spool-profiles/${id}`).then(r => r.data),

  add: (body: AddSpoolProfileRequest) =>
    apiClient.post<SpoolProfileResponse>('/api/spool-profiles', body).then(r => r.data),

  update: (id: string, body: AddSpoolProfileRequest) =>
    apiClient.put<SpoolProfileResponse>(`/api/spool-profiles/${id}`, body).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/spool-profiles/${id}`),
}
