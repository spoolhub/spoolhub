import type { SpoolResponse } from '@/types/spool'

type NfcSpoolFields = Pick<SpoolResponse, 'nfcTagUid' | 'hasNfcTag'> & {
  nfcTagUids?: string[]
}

export function getNfcTagUids(spool: NfcSpoolFields): string[] {
  if (spool.nfcTagUids && spool.nfcTagUids.length > 0) return spool.nfcTagUids
  if (spool.nfcTagUid) return [spool.nfcTagUid]
  return []
}

export function hasDualNfcTags(spool: NfcSpoolFields): boolean {
  return getNfcTagUids(spool).length >= 2
}

export function nfcSideLabel(index: number): string {
  return `Side ${String.fromCharCode(65 + index)}`
}
