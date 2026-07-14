import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { backupApi, type BackupFileInfo, type BackupFrequency, type BackupSettings } from '@/api/settings'
import { formatBackupSize, formatBackupTime } from './backupUtils'
import styles from './BackupPanel.module.css'
import pageStyles from './SettingsPage.module.css'

interface BackupPanelProps {
  isActive: boolean
}

const DEFAULT_SETTINGS: BackupSettings = {
  autoBackupEnabled: true,
  frequency: 'weekly',
  retentionCount: 8,
  lastBackup: null,
  nextBackup: null,
}

function backupErrorMessage(error: unknown, t: (key: string, fallback: string) => string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return t('settings.backupAuthFailed', 'Session expired. Sign in again and retry.')
    }
  }
  return t('settings.backupLoadFailed', 'Could not load backups. Try again in a moment.')
}

function createBackupErrorMessage(error: unknown, t: (key: string, fallback: string) => string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return t('settings.backupAuthFailed', 'Session expired. Sign in again and retry.')
    }
    const serverMessage = typeof error.response?.data === 'string' ? error.response.data.trim() : ''
    if (serverMessage) return serverMessage
    if (error.response?.status === 503) {
      return t('settings.backupCreateFailed', 'Could not create backup. Try again in a moment.')
    }
  }
  return t('settings.backupCreateFailed', 'Could not create backup. Try again in a moment.')
}

export default function BackupPanel({ isActive }: BackupPanelProps) {
  const { t } = useTranslation()
  const restoreInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<BackupFileInfo[]>([])
  const [settings, setSettings] = useState<BackupSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [legacyApi, setLegacyApi] = useState(false)

  const loadPanel = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const mode = await backupApi.probeMode()
      setLegacyApi(mode === 'legacy')

      if (mode === 'legacy') {
        setFiles([])
        setSettings(DEFAULT_SETTINGS)
        return
      }

      const [fileData, settingsData] = await Promise.all([
        backupApi.getFiles(),
        backupApi.getSettings().catch(() => DEFAULT_SETTINGS),
      ])
      setFiles(fileData)
      setSettings(settingsData)
    } catch (err) {
      setFiles([])
      setError(backupErrorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!isActive) return

    let cancelled = false
    void (async () => {
      if (cancelled) return
      await loadPanel()
    })()

    return () => {
      cancelled = true
    }
  }, [isActive, loadPanel])

  async function persistSettings(next: BackupSettings) {
    setSavingSettings(true)
    setError(null)
    try {
      const saved = await backupApi.updateSettings({
        autoBackupEnabled: next.autoBackupEnabled,
        frequency: next.frequency,
        retentionCount: next.retentionCount,
      })
      setSettings(saved)
    } catch {
      setError(t('settings.backupSettingsFailed', 'Could not save backup settings.'))
      void loadPanel()
    } finally {
      setSavingSettings(false)
    }
  }

  function handleToggleAutoBackup() {
    const next = { ...settings, autoBackupEnabled: !settings.autoBackupEnabled }
    setSettings(next)
    void persistSettings(next)
  }

  function handleFrequencyChange(frequency: BackupFrequency) {
    const next = { ...settings, frequency }
    setSettings(next)
    void persistSettings(next)
  }

  async function handleCreateBackup() {
    setCreating(true)
    setError(null)
    try {
      const mode = await backupApi.probeMode()
      setLegacyApi(mode === 'legacy')

      if (mode === 'legacy') {
        await backupApi.exportLegacy()
        return
      }

      const created = await backupApi.create()
      setFiles(prev => [created, ...prev.filter(f => f.name !== created.name)])
      const refreshed = await backupApi.getSettings().catch(() => settings)
      setSettings(refreshed)
    } catch (err) {
      setError(createBackupErrorMessage(err, t))
    } finally {
      setCreating(false)
    }
  }

  async function handleDownload(filename: string) {
    const size = files.find(f => f.name === filename)?.size ?? 0
    setError(null)
    try {
      await backupApi.download(filename, size)
    } catch {
      setError(t('settings.backupDownloadFailed', 'Could not download backup. Try again in a moment.'))
    }
  }

  async function handleRestoreUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const confirmed = window.confirm(
      t('settings.restoreConfirmShort', 'Restore this backup? All current data will be replaced.'),
    )
    if (!confirmed) return

    setRestoring(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await backupApi.restoreUpload(file)
      setSuccess(result.message)
    } catch {
      setError(t('settings.restoreFailed', 'Restore failed. The file may be invalid or incompatible.'))
    } finally {
      setRestoring(false)
    }
  }

  async function handleDelete(filename: string) {
    const confirmed = window.confirm(
      t('settings.deleteBackupConfirm', 'Delete this backup file? This cannot be undone.'),
    )
    if (!confirmed) return

    setDeleting(filename)
    setError(null)
    try {
      await backupApi.delete(filename)
      setFiles(prev => prev.filter(f => f.name !== filename))
    } catch {
      setError(t('settings.backupDeleteFailed', 'Could not delete backup. Try again in a moment.'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${pageStyles.btn} ${pageStyles.btnPrimary}`}
          onClick={() => void handleCreateBackup()}
          disabled={creating || loading}
        >
          <span className={creating ? styles.spin : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6M12 18v-6M9 15h6" />
            </svg>
          </span>
          {creating ? t('settings.preparing', 'Preparing…') : t('settings.backupNow', 'Backup Now')}
        </button>

        <button
          type="button"
          className={`${pageStyles.btn} ${pageStyles.btnPrimary}`}
          onClick={() => restoreInputRef.current?.click()}
          disabled={restoring || loading}
        >
          <span className={restoring ? styles.spin : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </span>
          {restoring ? t('settings.restoring', 'Restoring…') : t('settings.restoreBackup', 'Restore Backup')}
        </button>
      </div>

      <div className={styles.scheduleBar}>
        <div className={styles.scheduleLeft}>
          <div>
            <div className={styles.scheduleLabel}>{t('settings.autoBackups', 'Automatic backups')}</div>
            <div className={styles.scheduleDesc}>
              {t('settings.autoBackupsDesc', 'Create a zip backup of your database on a schedule.')}
            </div>
          </div>
          {settings.autoBackupEnabled && (
            <div className={styles.frequencySeg}>
              <button
                type="button"
                className={settings.frequency === 'weekly' ? styles.frequencyOn : ''}
                onClick={() => handleFrequencyChange('weekly')}
                disabled={savingSettings || loading}
              >
                {t('settings.backupWeekly', 'Weekly')}
              </button>
              <button
                type="button"
                className={settings.frequency === 'daily' ? styles.frequencyOn : ''}
                onClick={() => handleFrequencyChange('daily')}
                disabled={savingSettings || loading}
              >
                {t('settings.backupDaily', 'Daily')}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`${pageStyles.tg}${settings.autoBackupEnabled ? ` ${pageStyles.on}` : ''}`}
          onClick={handleToggleAutoBackup}
          disabled={savingSettings || loading}
          aria-label={t('settings.autoBackups', 'Automatic backups')}
          aria-pressed={settings.autoBackupEnabled}
        />
      </div>

      {legacyApi && (
        <div className={styles.notice}>
          {t('settings.backupLegacyMode', 'Download-only mode — rebuild the backend for on-server backups.')}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {loading && files.length === 0 ? null : files.length === 0 ? (
        <div className={styles.empty}>{t('settings.noBackupFilesShort', 'Nothing here yet.')}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('settings.backupColName', 'Name')}</th>
                <th className={styles.sizeCol}>{t('settings.backupColSize', 'Size')}</th>
                <th className={styles.timeCol}>{t('settings.backupColTime', 'Time')}</th>
                <th className={styles.actionsCol} aria-label={t('settings.backupColActions', 'Actions')} />
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.name}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.rowIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                      </span>
                      <button
                        type="button"
                        className={styles.nameLink}
                        onClick={() => void handleDownload(file.name)}
                      >
                        {file.name}
                      </button>
                    </div>
                  </td>
                  <td className={styles.sizeCell}>{formatBackupSize(file.size)}</td>
                  <td className={styles.timeCell}>{formatBackupTime(file.lastModified)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        title={t('settings.deleteBackup', 'Delete')}
                        disabled={deleting === file.name}
                        onClick={() => void handleDelete(file.name)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <input
        ref={restoreInputRef}
        type="file"
        accept=".zip,.db,application/zip"
        className={styles.hiddenInput}
        onChange={event => void handleRestoreUpload(event)}
      />
    </div>
  )
}
