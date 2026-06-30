import type { SpoolResponse } from './spool'

export interface NfcScanResult {
  status: 'found' | 'unknown'
  tagUid: string
  spool: SpoolResponse | null
  message: string | null
}

export interface AddNfcTagRequest {
  tagUid: string
  spoolId: string
}

export interface NfcReaderStatus {
  connected: boolean
  name: string | null
  availableReaders: string[]
}
