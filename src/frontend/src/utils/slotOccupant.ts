import type { PrinterResponse, TraySpoolSummary } from '@/types/printer'

/** Spool already assigned to the target tray (1–4) or extra slot (null). */
export function getSlotOccupant(
  printer: PrinterResponse,
  amsSlot: number | null,
  excludeSpoolId?: string,
): TraySpoolSummary | null {
  const occupant = amsSlot == null
    ? printer.extraSpool
    : amsSlot === 1 ? printer.tray1Spool
    : amsSlot === 2 ? printer.tray2Spool
    : amsSlot === 3 ? printer.tray3Spool
    : amsSlot === 4 ? printer.tray4Spool
    : null
  if (!occupant || occupant.id === excludeSpoolId) return null
  return occupant
}
