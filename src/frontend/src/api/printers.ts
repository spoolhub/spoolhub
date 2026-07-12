import { apiClient } from './client'
import type { PrinterResponse, PrinterStatus, RegisterLanPrinterRequest, UpdatePrinterRequest, CloudLoginResult, LanDiscoveredPrinter, CloudDiscoveredPrinter } from '@/types/printer'

export const printersApi = {
  getAll: () =>
    apiClient.get<PrinterResponse[]>('/api/printers').then(r => r.data),

  getById: (id: string) =>
    apiClient.get<PrinterResponse>(`/api/printers/${id}`).then(r => r.data),

  getStatus: (id: string) =>
    apiClient.get<PrinterStatus | null>(`/api/printers/${id}/status`).then(r => r.data),

  discoverLan: () =>
    apiClient.get<LanDiscoveredPrinter[]>('/api/printers/discover/lan').then(r => r.data),

  registerLan: (req: RegisterLanPrinterRequest) =>
    apiClient.post<PrinterResponse>('/api/printers/register/lan', req).then(r => r.data),

  registerCloud: (req: { brand: string; email: string; password: string }) =>
    apiClient.post<CloudLoginResult>('/api/printers/register/cloud', req).then(r => r.data),

  verifyCloud: (req: { code: string }) =>
    apiClient.post<CloudDiscoveredPrinter[]>('/api/printers/cloud/verify', req).then(r => r.data),

  selectCloud: (serials: string[]) =>
    apiClient.post<PrinterResponse[]>('/api/printers/cloud/select', { serials }).then(r => r.data),

  update: (id: string, req: UpdatePrinterRequest) =>
    apiClient.put<PrinterResponse>(`/api/printers/${id}`, req).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/api/printers/${id}`),

  mockStatus: (id: string, req: {
    gcodeState: string; progressPercent: number; remainingMinutes: number
    subtaskName: string | null; layerNum: number; totalLayerNum: number
    nozzleTempC: number; bedTempC: number
  }) => apiClient.post(`/api/printers/${id}/status/mock`, req),

  assignTraySpool: (id: string, slot: number, spoolId: string | null) =>
    apiClient.put<PrinterResponse>(`/api/printers/${id}/trays/${slot}`, { spoolId }).then(r => r.data),

  assignExtraSpool: (id: string, spoolId: string | null) =>
    apiClient.put<PrinterResponse>(`/api/printers/${id}/extra-spool`, { spoolId }).then(r => r.data),
}
