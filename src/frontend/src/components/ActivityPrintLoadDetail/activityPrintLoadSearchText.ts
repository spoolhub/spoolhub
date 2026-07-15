import type { ActivitySnapshot } from '@/types/activity'

export function activityPrintLoadSearchText(snap: ActivitySnapshot | null | undefined): string {
  const loaded = snap?.loadedSpools ?? []
  if (loaded.length > 0) {
    return loaded.flatMap(s => [s.brand, s.colorName, s.material]).filter(Boolean).join(' ')
  }
  return [snap?.brand, snap?.colorName, snap?.material].filter(Boolean).join(' ')
}
