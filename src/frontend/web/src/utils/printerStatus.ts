import type { PrinterStatus } from '@/types/printer'

export type PrinterStatusClass = 'printing' | 'idle' | 'offline'

export function getPrinterStatusClass(status?: PrinterStatus | null): PrinterStatusClass {
  if (status?.gcodeState?.toUpperCase() === 'RUNNING') return 'printing'
  if (status?.connectionError) return 'offline'
  return 'idle'
}

export function getPrinterStatusLabel(status?: PrinterStatus | null): string {
  if (!status || status.gcodeState?.toUpperCase() !== 'FAILED') {
    return status?.gcodeState?.toUpperCase() === 'RUNNING' ? 'Printing' : 'Idle'
  }
  return 'Offline'
}
