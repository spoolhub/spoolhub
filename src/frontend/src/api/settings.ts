import axios from 'axios'
import { apiClient, downloadBlobFile } from './client'

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
    try {
      await downloadBlobFile('/api/logs/download', filename, { file: filename }, sizeBytes)
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

export interface BackupFileInfo {
  name: string
  size: number
  lastModified: string
}

export type BackupFrequency = 'daily' | 'weekly'

export interface BackupSettings {
  autoBackupEnabled: boolean
  frequency: BackupFrequency
  retentionCount: number
  lastBackup: string | null
  nextBackup: string | null
}

export type BackupApiMode = 'full' | 'legacy'

async function backupRouteExists(path: string): Promise<boolean> {
  try {
    await apiClient.get(path)
    return true
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error
    const status = error.response?.status
    if (status === 404) return false
    // 401/403/405 still mean the route is registered on the server.
    if (status === 401 || status === 403 || status === 405) return true
    throw error
  }
}

export const backupApi = {
  /** Detect whether the new on-server backup API is available. */
  probeMode: async (): Promise<BackupApiMode> => {
    const hasFullApi =
      (await backupRouteExists('/api/backup/files'))
      || (await backupRouteExists('/api/backup/settings'))
    return hasFullApi ? 'full' : 'legacy'
  },

  getSettings: () =>
    apiClient.get<BackupSettings>('/api/backup/settings').then(r => r.data),

  updateSettings: (data: Pick<BackupSettings, 'autoBackupEnabled' | 'frequency' | 'retentionCount'>) =>
    apiClient.put<BackupSettings>('/api/backup/settings', data).then(r => r.data),

  getFiles: () =>
    apiClient.get<BackupFileInfo[]>('/api/backup/files').then(r => r.data),

  create: () =>
    apiClient.post<BackupFileInfo>('/api/backup', {}, { timeout: 120_000 }).then(r => r.data),

  /** One-off zip download for backends without POST /api/backup (legacy export route). */
  exportLegacy: async () => {
    const filename = `spoolhub_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`
    await downloadBlobFile('/api/backup/export', filename)
    return filename
  },

  restoreUpload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<{ message: string }>('/api/backup/restore', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  restoreExisting: (filename: string) =>
    apiClient.post<{ message: string }>('/api/backup/restore', null, {
      params: { backup: filename },
    }).then(r => r.data),

  delete: (filename: string) =>
    apiClient.delete('/api/backup', { params: { file: filename } }),

  download: async (filename: string, sizeBytes = 0) => {
    try {
      await downloadBlobFile('/api/backup/download', filename, { file: filename }, sizeBytes)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        const message = (await error.response.data.text()).trim()
        throw new Error(message || 'Download failed', { cause: error })
      }
      throw error
    }
  },
}
