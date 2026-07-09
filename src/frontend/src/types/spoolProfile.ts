export interface SpoolProfileResponse {
  id: string
  name: string
  brand: string
  material: string
  colorName: string
  colorHex: string
  initialWeightG: number
  spoolWeightG: number
  lowStockThresholdG: number
  density: number | null
  diameterTolerance: number | null
  extruderMin: number | null
  extruderMax: number | null
  bedMin: number | null
  bedMax: number | null
  price: number | null
  createdAt: string
  updatedAt: string
  spoolCount: number
}

export interface AddSpoolProfileRequest {
  name: string
  brand: string
  material: string
  colorName: string
  colorHex: string
  initialWeightG: number
  spoolWeightG: number
  lowStockThresholdG: number
  density: number | null
  diameterTolerance: number | null
  extruderMin: number | null
  extruderMax: number | null
  bedMin: number | null
  bedMax: number | null
  price: number | null
}
