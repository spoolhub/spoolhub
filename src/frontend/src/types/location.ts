export type LocationType = 'shelf' | 'drybox'

export interface LocationResponse {
  id: string
  name: string
  type: LocationType
  capacity: number
  humidity: number | null
  createdAt: string
}

export interface AddLocationRequest {
  name: string
  type?: LocationType
  capacity?: number
  humidity?: number
}

export interface UpdateLocationRequest {
  name?: string
  type?: LocationType
  capacity?: number
  humidity?: number
}
