import { apiClient } from './client'
import type { NfcScanResult } from '@/types/nfc'

export interface AddNfcTagRequest {
  tagUid: string
  spoolId: string
  type: string
}

export const nfcTagsApi = {
  add: (body: AddNfcTagRequest) =>
    apiClient.post('/api/nfc-tags', body).then(r => r.data),

  scan: (body: { tagUid: string }): Promise<NfcScanResult> =>
    apiClient.post('/api/nfc-tags/scan', body).then(r => r.data),

  lookup: (tagUid: string): Promise<{ spoolId: string } | null> =>
    apiClient.get('/api/nfc-tags/lookup', { params: { tagUid } })
      .then(r => r.data)
      .catch(() => null),
}
