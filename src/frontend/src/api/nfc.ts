import { apiClient } from './client'
import { normalizeSpool } from './spools'
import type { NfcScanResult } from '@/types/nfc'

export function scanTag(tagUid: string): Promise<NfcScanResult> {
  return apiClient.post<NfcScanResult>('/api/nfc-tags/scan', { tagUid }).then(r => ({
    ...r.data,
    spool: r.data.spool ? normalizeSpool(r.data.spool) : r.data.spool,
  }))
}

export function registerTag(tagUid: string, spoolId: string): Promise<void> {
  return apiClient.post('/api/nfc-tags', { tagUid, spoolId, type: 'NFC' }).then(() => {})
}

export function writeTagUrl(url: string): Promise<void> {
  return apiClient.post('/api/nfc-tags/write-url', { url }).then(() => {})
}
