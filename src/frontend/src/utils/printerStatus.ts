import type { PrinterStatus } from '@/types/printer'

export type PrinterStatusClass = 'printing' | 'paused' | 'online' | 'idle' | 'offline'

export function isMqttPrinter(protocol: string): boolean {
  return protocol === 'mqtt_lan' || protocol === 'mqtt_cloud'
}

export function isPrinterOnline(status: PrinterStatus | null | undefined, protocol: string): boolean {
  if (!isMqttPrinter(protocol)) return true
  return status != null && !status.connectionError
}

export function isPrinterOffline(status: PrinterStatus | null | undefined, protocol: string): boolean {
  return isMqttPrinter(protocol) && !isPrinterOnline(status, protocol)
}

export function getPrinterStatusClass(
  status?: PrinterStatus | null,
  protocol = '',
): PrinterStatusClass {
  const state = status?.gcodeState?.toUpperCase()
  if (state === 'RUNNING') return 'printing'
  if (state === 'PAUSE') return 'paused'
  if (isPrinterOffline(status, protocol)) return 'offline'
  if (isMqttPrinter(protocol) && isPrinterOnline(status, protocol)) return 'online'
  return 'idle'
}

export function getPrinterStatusLabel(
  status?: PrinterStatus | null,
  protocol = '',
): string {
  const state = status?.gcodeState?.toUpperCase()
  if (state === 'RUNNING') return 'Printing'
  if (state === 'PAUSE') return 'Paused'
  if (isPrinterOffline(status, protocol)) return 'Offline'
  if (isMqttPrinter(protocol) && isPrinterOnline(status, protocol)) return 'Online'
  return 'Idle'
}
