export interface PrintJobFilamentResponse {
  id: string
  spoolId: string | null
  colorName: string | null
  colorHex: string | null
  material: string | null
  gramsUsed: number
  slotIndex: number
}

export interface PrintJobResponse {
  id: string
  printerId: string
  printerName: string | null
  spoolId: string | null
  spoolBrand: string | null
  spoolColorName: string | null
  spoolColorHex: string | null
  spoolMaterial: string | null
  printFileName: string | null
  taskId: string | null
  status: 'running' | 'paused' | 'finished' | 'failed' | 'cancelled' | 'unknown'
  gramsUsed: number
  filamentDeducted: boolean
  startedAt: string
  finishedAt: string | null
  estimatedFinishTime: number | null
  source: string
  notes: string | null
  filaments: PrintJobFilamentResponse[]
}

export interface PrintJobPagedResponse {
  total: number
  page: number
  limit: number
  jobs: PrintJobResponse[]
}
