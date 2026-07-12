import type { PrinterStatus } from '@/types/printer'

export type PrinterStatusClass = 'printing' | 'paused' | 'idle' | 'offline'

export function getPrinterStatusClass(status?: PrinterStatus | null): PrinterStatusClass {
  const state = status?.gcodeState?.toUpperCase()
  if (state === 'RUNNING') return 'printing'
  if (state === 'PAUSE') return 'paused'
  if (status?.connectionError) return 'offline'
  return 'idle'
}

export function getPrinterStatusLabel(status?: PrinterStatus | null): string {
  const state = status?.gcodeState?.toUpperCase()
  if (state === 'RUNNING') return 'Printing'
  if (state === 'PAUSE') return 'Paused'
  if (status?.connectionError) return 'Offline'
  return 'Idle'
}
