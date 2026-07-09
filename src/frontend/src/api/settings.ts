import { apiClient } from './client'

export interface LogFileInfo {
  name: string
  size: number
  lastModified: string
}

export interface AlertSettings {
  enabled: boolean
  provider: string
  ntfyUrl: string | null
  webhookUrl: string | null
  discordWebhookUrl: string | null
  notifyLowStock: boolean
  notifySpoolAssigned: boolean
  notifySpoolAdded: boolean
  notifySpoolDeleted: boolean
  notifyPrinterDeleted: boolean
}

export interface FilamentSettings {
  autoSync: boolean
  ofdSourceUrl: string
  lastSynced: string | null
}

export interface AppDefaults {
  defaultLowStockThresholdG: number
  currency: string
  language: string
}

export const settingsApi = {
  getAlerts: () =>
    apiClient.get<AlertSettings>('/api/settings/alerts').then(r => r.data),

  updateAlerts: (data: AlertSettings) =>
    apiClient.put<AlertSettings>('/api/settings/alerts', data).then(r => r.data),

  testAlert: () =>
    apiClient.post<{ success: boolean; message: string }>('/api/settings/alerts/test').then(r => r.data),

  getFilaments: () =>
    apiClient.get<FilamentSettings>('/api/settings/filaments').then(r => r.data),

  updateFilaments: (data: Pick<FilamentSettings, 'autoSync' | 'ofdSourceUrl'>) =>
    apiClient.put<FilamentSettings>('/api/settings/filaments', data).then(r => r.data),

  syncFilaments: () =>
    apiClient.post<{ lastSynced: string | null }>('/api/settings/filaments/sync').then(r => r.data),

  getApp: () =>
    apiClient.get<AppDefaults>('/api/settings/app').then(r => r.data),

  updateApp: (data: AppDefaults) =>
    apiClient.put<AppDefaults>('/api/settings/app', data).then(r => r.data),
}

export const logsApi = {
  getFiles: () =>
    apiClient.get<LogFileInfo[]>('/api/logs/files').then(r => r.data),

  downloadUrl: (filename: string) =>
    `${import.meta.env.VITE_API_URL}/api/logs/files/${encodeURIComponent(filename)}`,
}

export const versionApi = {
  getVersion: () =>
    apiClient.get<{ version: string }>('/api/settings/version').then(r => r.data),
}

export const backupApi = {
  exportUrl: () => `${import.meta.env.VITE_API_URL}/api/backup/export`,

  import: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<{ message: string }>('/api/backup/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
