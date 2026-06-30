export interface FilamentProfile {
  brand: string
  filamentName: string
  material: string
  density: number | null
  extruderMin: number | null
  extruderMax: number | null
  bedMin: number | null
  bedMax: number | null
  colorHex: string | null
  colorName: string | null
  variantColors?: string[]
  diameterTolerance: number | null
  discontinued: boolean
  dataSheetUrl: string | null
  safetySheetUrl: string | null
}
