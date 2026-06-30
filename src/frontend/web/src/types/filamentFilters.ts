export interface FilamentFilters {
  materials: string[]
  colors: string[]
  hideDiscontinued: boolean
}

export const DEFAULT_FILAMENT_FILTERS: FilamentFilters = {
  materials: [],
  colors: [],
  hideDiscontinued: false,
}
