import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { activitiesApi } from '@/api/activities'
import { useConnection } from '@/context/ConnectionContext'
import { enrichActivities, type SpoolCache } from '@/utils/enrichActivities'
import { ActivityFeed } from '@/components/ActivityFeed'
import type { SpoolResponse } from '@/types/spool'
import styles from './RecentActivity.module.css'

export default function RecentActivity({ limit = 5, spools }: { limit?: number; spools?: SpoolResponse[] }) {
  const { t } = useTranslation()
  const [activities, setActivities] = useState<Awaited<ReturnType<typeof activitiesApi.getRecent>>['activities']>([])
  const [loading, setLoading] = useState(true)
  const { refreshKey } = useConnection()

  const spoolCache: SpoolCache | undefined = spools
    ? new Map(spools.map(s => [s.id, {
        brand: s.brand, colorName: s.colorName, colorHex: s.colorHex,
        material: s.material, stockLocation: s.stockLocation ?? undefined,
      }]))
    : undefined

  useEffect(() => {
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    activitiesApi.getRecent(20)
      .then(r => enrichActivities(r.activities, spoolCache))
      .then(enriched => { setActivities(enriched); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setInterval(() => {
      activitiesApi.getRecent(20)
        .then(r => enrichActivities(r.activities, spoolCache))
        .then(enriched => setActivities(enriched))
        .catch(() => {})
    }, 10_000)
    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.wrap}>
      <ActivityFeed
        activities={activities.slice(0, limit)}
        variant="compact"
        loading={loading}
        emptyMessage={t('recentActivity.noActivity')}
      />
    </div>
  )
}
