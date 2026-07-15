import type { SpoolResponse } from '@/types/spool'

/** MQTT reports tray physically empty (tray_exist_bits). */
export function isTrayEmptyMqtt(occupied: boolean | undefined): boolean {
  return occupied === false
}

/** Tray has filament in AMS (occupied bit or legacy spool link before first MQTT). */
export function isTrayLoaded(
  occupied: boolean | undefined,
  spool: SpoolResponse | null,
): boolean {
  if (occupied != null) return occupied
  return spool != null
}

/** Empty MQTT slots are not interactive; loaded trays are (assign or spool detail). */
export function isTrayClickable(occupied: boolean | undefined, spool: SpoolResponse | null): boolean {
  if (isTrayEmptyMqtt(occupied)) return false
  if (occupied === true) return true
  return spool != null
}

/** % bar from spool weight (MQTT syncs into currentWeightG for RFID spools). */
export function trayRemainPercent(spool: SpoolResponse | null): number | null {
  if (spool && spool.initialWeightG > 0) {
    return Math.round((spool.currentWeightG / spool.initialWeightG) * 100)
  }
  return null
}

export function countLoadedAmsTrays(
  occupied: Array<boolean | undefined>,
  spools: Array<SpoolResponse | null>,
): number {
  return occupied.filter((occ, i) => isTrayLoaded(occ, spools[i] ?? null)).length
}

/** Extra spool: null occupied = not MQTT-synced yet (manual assign still valid). */
export function isExtraTrayEmptyMqtt(occupied: boolean | null | undefined): boolean {
  return occupied === false
}

export function isExtraTrayLoaded(
  occupied: boolean | null | undefined,
  spool: SpoolResponse | null,
): boolean {
  if (occupied != null) return isTrayLoaded(occupied, spool)
  return spool != null
}

export function isExtraTrayClickable(
  occupied: boolean | null | undefined,
  spool: SpoolResponse | null,
): boolean {
  if (occupied == null) return true
  return isTrayClickable(occupied, spool)
}
