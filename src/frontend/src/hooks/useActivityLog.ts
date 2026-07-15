import { useState, useEffect, useCallback } from 'react'
import { activitiesApi } from '@/api/activities'
import { enrichActivities } from '@/utils/enrichActivities'
import type { Activity, ActivityFilters } from '@/types/activity'

const DEFAULT_FILTERS: ActivityFilters = {
  eventType: '',
  action: '',
  timePeriod: '',
  sortBy: '',
}

export function useActivityLog(initialPerPage = 20) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [perPage, setPerPageState]  = useState(initialPerPage)
  const [filters, setFilters]       = useState<ActivityFilters>(DEFAULT_FILTERS)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)

  const fetch = useCallback(() => {
    setLoading(true)
    setError(false)
    activitiesApi
      .get({
        limit:      perPage,
        page,
        eventType:  filters.eventType  || undefined,
        action:     filters.action     || undefined,
        timePeriod: filters.timePeriod || undefined,
        sortBy:     filters.sortBy     || undefined,
      })
      .then(async r => {
        const enriched = await enrichActivities(r.activities)
        setActivities(enriched)
        setTotal(r.total)
        setLoading(false)
      })
      .catch(() => { /* keep loading=true — skeleton stays while offline */ })
  }, [page, perPage, filters])

  useEffect(() => { fetch() }, [fetch]) // eslint-disable-line react-hooks/set-state-in-effect

  const updateFilter = (key: keyof ActivityFilters, value: string) => {
    setPage(1)
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setPage(1)
    setFilters(DEFAULT_FILTERS)
  }

  const setPerPage = useCallback((n: number) => {
    setPerPageState(n)
    setPage(1)
  }, [])

  return {
    activities,
    total,
    page,
    setPage,
    perPage,
    setPerPage,
    filters,
    updateFilter,
    resetFilters,
    loading,
    error,
    refetch: fetch,
  }
}
