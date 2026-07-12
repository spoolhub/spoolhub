export interface TraySpoolSummary {
  id: string
  brand: string
  material: string
  colorName: string
  colorHex: string
}

export interface PrinterResponse {
  id: string
  name: string
  brand: string
  model: string
  serialNumber: string | null
  ipAddress: string
  port: number | null
  protocol: string
  hasAms: boolean
  createdAt: string
  tray1Spool: TraySpoolSummary | null
  tray2Spool: TraySpoolSummary | null
  tray3Spool: TraySpoolSummary | null
  tray4Spool: TraySpoolSummary | null
  extraSpool: TraySpoolSummary | null
}

export interface UpdatePrinterRequest {
  name?: string | null
  brand?: string | null
  model?: string | null
  ipAddress?: string | null
  port?: number | null
  hasAms?: boolean | null
}

export interface RegisterLanPrinterRequest {
  name: string
  brand: string
  model: string
  ipAddress: string
  port?: number | null
  serialNumber?: string | null
  hasAms?: boolean
  accessCode?: string | null
}

export interface CloudDiscoveredPrinter {
  serialNumber: string
  name: string
  model: string
  online: boolean
  alreadyAdded: boolean
}

export interface CloudLoginResult {
  requiresVerification: boolean
  message: string | null
  availablePrinters: CloudDiscoveredPrinter[] | null
}

export interface LanDiscoveredPrinter {
  serialNumber: string
  ipAddress: string
  name: string
  model: string
  accessCode: string | null
}

export interface PrinterStatus {
  gcodeState: string
  progressPercent: number
  remainingMinutes: number
  subtaskName: string | null
  layerNum: number
  totalLayerNum: number
  nozzleTempC: number
  bedTempC: number
  updatedAt: string
  connectionError?: string | null
}
