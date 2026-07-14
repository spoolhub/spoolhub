import axios from 'axios'
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

  beginViewing: () =>
    apiClient.post('/api/logs/viewing/start', null, { skipOfflineEvent: true }),

  endViewing: () =>
    apiClient.post('/api/logs/viewing/stop', null, { skipOfflineEvent: true }),

  extendViewing: () =>
    apiClient.post('/api/logs/viewing/extend', null, { skipOfflineEvent: true }),

  download: async (filename: string, sizeBytes = 0) => {
    const timeoutMs = Math.max(30_000, Math.ceil(sizeBytes / 200_000) * 1000)
    try {
      const response = await apiClient.get<Blob>(
        '/api/logs/download',
        {
          params: { file: filename },
          responseType: 'blob',
          skipOfflineEvent: true,
          timeout: timeoutMs,
        },
      )
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        const message = (await error.response.data.text()).trim()
        throw new Error(message || 'Download failed', { cause: error })
      }
      throw error
    }
  },
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
