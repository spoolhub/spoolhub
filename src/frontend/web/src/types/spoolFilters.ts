export type StockLevel = 'full' | 'good' | 'low' | 'critical'

export interface ColorOption {
  hex: string
  name: string
}

export interface SpoolFilters {
  materials: string[]
  brands: string[]
  stockLevels: StockLevel[]
  colors: string[]
  activeOnly: boolean
  lowStockOnly: boolean
  archivedOnly: boolean
  neverScanned: boolean
}

export const DEFAULT_FILTERS: SpoolFilters = {
  materials: [],
  brands: [],
  stockLevels: [],
  colors: [],
  activeOnly: false,
  lowStockOnly: false,
  archivedOnly: false,
  neverScanned: false,
}
