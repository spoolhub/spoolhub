export interface LoadedSpoolSnapshot {
  slot: number
  brand?: string
  colorName?: string
  colorHex?: string
  material?: string
  weight?: number
  isActive?: boolean
}

export interface ActivitySnapshot {
  material?: string
  colorHex?: string
  weight?: number
  brand?: string
  colorName?: string
  stockLocation?: string
  estimatedMins?: number
  printJobId?: string
  printFileName?: string
  gramsUsed?: number
  printerName?: string
  hasAms?: boolean
  loadedSpools?: LoadedSpoolSnapshot[]
}

export interface Activity {
  id: string
  eventType: string
  action: string
  resourceType: string
  resourceName: string
  resourceId: string | null
  description: string | null
  icon: string | null
  snapshot: ActivitySnapshot | null
  createdAt: string
}

export interface ActivitiesResponse {
  activities: Activity[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ActivityFilters {
  eventType: string
  action: string
  timePeriod: string
  sortBy: string
}
