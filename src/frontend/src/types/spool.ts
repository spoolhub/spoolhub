export interface SpoolResponse {
  id: string
  brand: string
  material: string
  colorName: string
  colorHex: string
  initialWeightG: number
  currentWeightG: number
  spoolWeightG: number
  lowStockThresholdG: number
  isActive: boolean
  isArchived: boolean
  createdAt: string
  lastScannedAt: string | null
  notes: string | null
  density: number | null
  diameterTolerance: number | null
  extruderMin: number | null
  extruderMax: number | null
  bedMin: number | null
  bedMax: number | null
  hasNfcTag: boolean
  nfcTagUid: string | null
  nfcTagUids?: string[]
  printerId: string | null
  printerName: string | null
  amsSlot: number | null
  price: number | null
  stockLocation: string | null
}

export interface UpdateSpoolRequest {
  brand?: string
  material?: string
  colorName?: string
  colorHex?: string
  currentWeightG?: number
  initialWeightG?: number
  spoolWeightG?: number
  lowStockThresholdG?: number
  notes?: string
  isActive?: boolean
  price?: number | null
  stockLocation?: string
  density?: number
  diameterTolerance?: number
  extruderMin?: number
  extruderMax?: number
  bedMin?: number
  bedMax?: number
}

export interface AddSpoolRequest {
  brand: string
  material: string
  colorName: string
  colorHex: string
  initialWeightG: number
  currentWeightG: number
  spoolWeightG?: number
  lowStockThresholdG?: number
  isActive?: boolean
  notes?: string
  density?: number
  diameterTolerance?: number
  extruderMin?: number
  extruderMax?: number
  bedMin?: number
  bedMax?: number
  tagUid?: string
  price?: number
  stockLocation?: string
}

export interface AssignPrinterRequest {
  printerId: string | null
  amsSlot?: number | null
  /** Storage location for the spool currently in the target slot (if any). */
  displacedStockLocation?: string | null
}

export interface SpoolMonthlyStats {
  added: number
  removed: number
}
