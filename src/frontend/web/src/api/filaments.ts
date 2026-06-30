import { apiClient } from './client'
import type { FilamentProfile } from '@/types/filament'

export const filamentsApi = {
  getAll: () =>
    apiClient.get<FilamentProfile[]>('/api/filaments').then(r => r.data),
  refresh: () =>
    apiClient.post('/api/filaments/refresh'),
}
