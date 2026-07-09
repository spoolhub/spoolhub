import { apiClient } from './client'
import type { PrintJobResponse, PrintJobPagedResponse } from '@/types/printJob'

export interface PrintJobFilters {
  page?: number
  limit?: number
  status?: string
  printerId?: string
  spoolId?: string
  search?: string
  sortBy?: string
}

export const printJobsApi = {
  getByPrinter: (printerId: string) =>
    apiClient.get<PrintJobResponse[]>(`/api/printers/${printerId}/jobs`).then(r => r.data),
  getBySpool: (spoolId: string) =>
    apiClient.get<PrintJobResponse[]>(`/api/spools/${spoolId}/jobs`).then(r => r.data),
  getRecent: (limit = 5) =>
    apiClient.get<PrintJobResponse[]>(`/api/print-jobs/recent?limit=${limit}`).then(r => r.data),
  getAll: (filters: PrintJobFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.page)      params.set('page',      String(filters.page))
    if (filters.limit)     params.set('limit',     String(filters.limit))
    if (filters.status)    params.set('status',    filters.status)
    if (filters.printerId) params.set('printerId', filters.printerId)
    if (filters.spoolId)   params.set('spoolId',   filters.spoolId)
    if (filters.search)    params.set('search',    filters.search)
    if (filters.sortBy)    params.set('sortBy',    filters.sortBy)
    return apiClient.get<PrintJobPagedResponse>(`/api/print-jobs?${params}`).then(r => r.data)
  },
  getById: (id: string) =>
    apiClient.get<PrintJobResponse>(`/api/print-jobs/${id}`).then(r => r.data),
  getWeeklyUsage: (days = 7) => {
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    return apiClient.get<{ totalGrams: number }>(`/api/print-jobs/usage?since=${encodeURIComponent(since)}`).then(r => r.data)
  },
}
