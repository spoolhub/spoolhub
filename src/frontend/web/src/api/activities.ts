import { apiClient } from './client'
import type { ActivitiesResponse } from '@/types/activity'

interface GetParams {
  limit?: number
  page?: number
  eventType?: string
  action?: string
  timePeriod?: string
  sortBy?: string
}

function parseSnapshots(data: ActivitiesResponse): ActivitiesResponse {
  data.activities = data.activities.map(a => ({
    ...a,
    snapshot: typeof a.snapshot === 'string'
      ? (() => { try { return JSON.parse(a.snapshot as unknown as string) } catch { return null } })()
      : a.snapshot ?? null,
  }))
  return data
}

export const activitiesApi = {
  getRecent: (limit = 20) =>
    apiClient
      .get<ActivitiesResponse>(`/api/activities?limit=${limit}`)
      .then(r => parseSnapshots(r.data)),

  get: (params: GetParams = {}) => {
    const { limit = 20, page = 1, eventType, action, timePeriod, sortBy } = params
    const qs = new URLSearchParams({ limit: String(limit), page: String(page) })
    if (eventType)  qs.set('eventType', eventType)
    if (action)     qs.set('action', action)
    if (timePeriod) qs.set('timePeriod', timePeriod)
    if (sortBy)     qs.set('sortBy', sortBy)
    return apiClient.get<ActivitiesResponse>(`/api/activities?${qs}`).then(r => parseSnapshots(r.data))
  },

  clearAll: () => apiClient.delete('/api/activities'),
}
