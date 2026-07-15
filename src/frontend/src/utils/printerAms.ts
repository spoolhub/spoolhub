import type { SpoolResponse } from '@/types/spool'

export type TrayAssignee = { id: string } | null

/** Spool assigned in DB but MQTT reports tray physically empty (scan-before-load). */
export function isTrayPendingLoad(
  occupied: boolean | undefined,
  assigned: TrayAssignee,
): boolean {
  return occupied === false && assigned != null
}

/** MQTT reports tray physically empty (tray_exist_bits). */
export function isTrayEmptyMqtt(occupied: boolean | undefined): boolean {
  return occupied === false
}

/** Tray has filament in AMS (occupied bit or legacy spool link before first MQTT). */
export function isTrayLoaded(
  occupied: boolean | undefined,
  assigned: TrayAssignee,
): boolean {
  if (occupied != null) return occupied
  return assigned != null
}

/** Empty MQTT slots are not interactive unless a spool is assigned and waiting to load. */
export function isTrayClickable(occupied: boolean | undefined, assigned: TrayAssignee): boolean {
  if (isTrayPendingLoad(occupied, assigned)) return true
  if (isTrayEmptyMqtt(occupied)) return false
  if (occupied === true) return true
  return assigned != null
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
  assigned: Array<TrayAssignee>,
): number {
  return occupied.filter((occ, i) => isTrayLoaded(occ, assigned[i] ?? null)).length
}

export function countPendingAmsTrays(
  occupied: Array<boolean | undefined>,
  assigned: Array<TrayAssignee>,
): number {
  return occupied.filter((occ, i) => isTrayPendingLoad(occ, assigned[i] ?? null)).length
}

/** Extra spool: null occupied = not MQTT-synced yet (manual assign still valid). */
export function isExtraTrayEmptyMqtt(occupied: boolean | null | undefined): boolean {
  return occupied === false
}

export function isExtraTrayLoaded(
  occupied: boolean | null | undefined,
  assigned: TrayAssignee,
): boolean {
  if (occupied != null) return isTrayLoaded(occupied, assigned)
  return assigned != null
}

export function isExtraTrayPendingLoad(
  occupied: boolean | null | undefined,
  assigned: TrayAssignee,
): boolean {
  return occupied === false && assigned != null
}

export function isExtraTrayClickable(
  occupied: boolean | null | undefined,
  assigned: TrayAssignee,
): boolean {
  if (isExtraTrayPendingLoad(occupied, assigned)) return true
  if (occupied == null) return true
  return isTrayClickable(occupied, assigned)
}
