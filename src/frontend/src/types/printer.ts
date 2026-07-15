export interface TraySpoolSummary {
  id: string
  brand: string
  material: string
  colorName: string
  colorHex: string
}

export interface TrayMqttHint {
  material: string | null
  colorName: string | null
  colorHex: string | null
  brand: string | null
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
  /** MQTT AMS remain % per tray (-1 = empty, 0–100 = loaded, null = not reported yet) */
  tray1RemainPct: number | null
  tray2RemainPct: number | null
  tray3RemainPct: number | null
  tray4RemainPct: number | null
  tray1Occupied: boolean
  tray2Occupied: boolean
  tray3Occupied: boolean
  tray4Occupied: boolean
  /** MQTT vt_tray occupied (null = not reported yet, manual assign still valid) */
  extraSpoolOccupied: boolean | null
  extraSpoolRemainPct: number | null
  /** MQTT-reported filament on occupied trays (for manual assign matching) */
  tray1Mqtt: TrayMqttHint | null
  tray2Mqtt: TrayMqttHint | null
  tray3Mqtt: TrayMqttHint | null
  tray4Mqtt: TrayMqttHint | null
  extraMqtt: TrayMqttHint | null
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

export interface DiscoveredSpoolSlotPreview {
  slot: number
  occupied: boolean
  remainPct: number | null
  material: string | null
  colorHex: string | null
  colorName: string | null
  brand: string | null
  isBambuFilament: boolean
}

export interface DiscoveredPrinterMqttPreview {
  hasAms: boolean
  trays: DiscoveredSpoolSlotPreview[]
  extraTray: DiscoveredSpoolSlotPreview | null
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
