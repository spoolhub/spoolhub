import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { logsApi, type LogFileInfo } from '@/api/settings'
import { formatFileDate, formatFileSize } from './logUtils'
import styles from './LogsPanel.module.css'

interface LogsPanelProps {
  isActive: boolean
}

export default function LogsPanel({ isActive }: LogsPanelProps) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<LogFileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await logsApi.getFiles()
      setFiles(data)
      setLoaded(true)
    } catch {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isActive) return

    let cancelled = false
    void (async () => {
      try {
        await logsApi.beginViewing()
      } catch {
        // Still list files if the release call fails.
      }
      if (cancelled) return
      if (!loaded) await loadFiles()
    })()

    return () => {
      cancelled = true
      void logsApi.endViewing()
    }
  }, [isActive, loaded, loadFiles])

  useEffect(() => {
    if (!isActive) return
    const timer = window.setInterval(() => { void logsApi.extendViewing() }, 120_000)
    return () => window.clearInterval(timer)
  }, [isActive])

  async function handleDownload(filename: string) {
    setDownloading(filename)
    setDownloadError(null)
    const size = files.find(f => f.name === filename)?.size ?? 0
    try {
      if (isActive) await logsApi.extendViewing()
      await logsApi.download(filename, size)
    } catch {
      setDownloadError(t('settings.logDownloadFailed', 'Could not download log file. Try again in a moment.'))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarText}>
          {t('settings.logFilesDesc', 'Daily rotating log files. The last 7 days are kept. Download a file to share when reporting issues.')}
        </div>
        <button type="button" className={styles.actionBtn} onClick={() => void loadFiles()} disabled={loading}>
          <span className={loading ? styles.spin : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.6-6.4" />
              <path d="M21 4v5h-5" />
            </svg>
          </span>
          {loading ? t('settings.refreshing', 'Refreshing…') : t('settings.refresh', 'Refresh')}
        </button>
      </div>

      {downloadError && (
        <div className={styles.error}>{downloadError}</div>
      )}

      {loading && files.length === 0 ? (
        <div className={styles.empty}>{t('settings.refreshing', 'Refreshing…')}</div>
      ) : files.length === 0 ? (
        <div className={styles.empty}>
          {t('settings.noLogFiles', 'No log files yet. They will appear after the app has been running for a while.')}
        </div>
      ) : (
        <div className={styles.fileList}>
          {files.map(file => (
            <div key={file.name} className={styles.fileRow}>
              <div className={styles.fileMeta}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSub}>
                  {formatFileSize(file.size)} · {formatFileDate(file.lastModified)}
                </span>
              </div>
              <button
                type="button"
                className={`${styles.downloadBtn}${downloading === file.name ? ` ${styles.downloadBtnActive}` : ''}`}
                disabled={downloading === file.name}
                onClick={() => void handleDownload(file.name)}
              >
                <span className={styles.iconWrap} aria-hidden="true">
                  {downloading === file.name && (
                    <span className={styles.spinner}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                      </svg>
                    </span>
                  )}
                  <span className={styles.downloadIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                  </span>
                </span>
                {downloading === file.name
                  ? t('settings.downloadingLog', 'Downloading…')
                  : t('settings.downloadLog', 'Download')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
