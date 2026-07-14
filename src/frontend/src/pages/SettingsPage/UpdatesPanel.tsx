import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { versionApi } from '@/api/settings'
import {
  compareVersions,
  formatReleaseDate,
  getReleaseBadge,
  normalizeVersion,
  parseReleaseBody,
  type GitHubRelease,
} from './updatesUtils'
import styles from './UpdatesPanel.module.css'

const RELEASES_URL = 'https://api.github.com/repos/spoolhub/spoolhub/releases?per_page=8'

interface ReleaseSummary {
  tag: string
  publishedAt: string
  url: string
  sections: ReturnType<typeof parseReleaseBody>
}

interface UpdatesPanelProps {
  isActive: boolean
}

function toReleaseSummary(release: GitHubRelease): ReleaseSummary {
  return {
    tag: release.tag_name,
    publishedAt: release.published_at,
    url: release.html_url,
    sections: parseReleaseBody(release.body),
  }
}

function renderChangelogItem(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|#\d+)/g)
  return parts.map((part, index) => {
    const mdLink = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (mdLink) {
      return (
        <a key={index} href={mdLink[2]} target="_blank" rel="noreferrer">
          {mdLink[1]}
        </a>
      )
    }
    const issue = part.match(/^#(\d+)$/)
    if (issue) {
      return (
        <a
          key={index}
          href={`https://github.com/spoolhub/spoolhub/issues/${issue[1]}`}
          target="_blank"
          rel="noreferrer"
        >
          #{issue[1]}
        </a>
      )
    }
    return <span key={index}>{part}</span>
  })
}

export default function UpdatesPanel({ isActive }: UpdatesPanelProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [releases, setReleases] = useState<ReleaseSummary[]>([])
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const loadUpdates = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [versionRes, releasesRes] = await Promise.all([
        versionApi.getVersion().catch(() => ({ version: '0.0.0' })),
        fetch(RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' } }),
      ])

      setCurrentVersion(versionRes.version)
      setLastChecked(new Date())

      if (!releasesRes.ok) {
        setReleases([])
        setError(true)
        return
      }

      const data = (await releasesRes.json()) as GitHubRelease[]
      setReleases(Array.isArray(data) ? data.map(toReleaseSummary) : [])
    } catch {
      setError(true)
      setLastChecked(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isActive || lastChecked) return

    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      await loadUpdates()
    })()

    return () => { cancelled = true }
  }, [isActive, lastChecked, loadUpdates])

  const latestVersion = releases[0] ? normalizeVersion(releases[0].tag) : null
  const installedVersion = currentVersion ? normalizeVersion(currentVersion) : null

  const updateAvailable = useMemo(() => {
    if (!installedVersion || !latestVersion) return false
    return compareVersions(latestVersion, installedVersion) > 0
  }, [installedVersion, latestVersion])

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <span>
          {installedVersion
            ? `${t('settings.currentVersion', 'Current version')}: ${installedVersion}`
            : t('settings.currentVersion', 'Current version')}
          {lastChecked
            ? ` · ${t('settings.lastCheckedAt', 'Last checked {{time}}', {
                time: lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              })}`
            : ''}
        </span>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => void loadUpdates()}
          disabled={loading}
        >
          <span className={loading ? styles.spin : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.6-6.4" />
              <path d="M21 4v5h-5" />
            </svg>
          </span>
          {loading ? t('settings.checkingUpdates', 'Checking for updates…') : t('settings.refresh', 'Refresh')}
        </button>
      </div>

      {error && (
        <div className={styles.empty}>
          {t('settings.releasesLoadError', 'Could not load release information.')}
        </div>
      )}

      {loading && releases.length === 0 && !error && (
        <div className={styles.loading}>{t('settings.checkingUpdates', 'Checking for updates…')}</div>
      )}

      {!loading && !error && releases.length === 0 && installedVersion && (
        <div className={styles.list}>
          <article className={styles.release}>
            <div className={styles.releaseHead}>
              <span className={styles.version}>{installedVersion}</span>
              <span className={`${styles.badge} ${styles.badgeCurrent}`}>
                {t('settings.badgeInstalled', 'Currently Installed')}
              </span>
            </div>
            <div className={styles.empty} style={{ padding: '0', textAlign: 'left' }}>
              {t('settings.devBuildNoReleases', 'Development build — check GitHub for upcoming releases.')}
            </div>
          </article>
        </div>
      )}

      {!loading && !error && releases.length === 0 && !installedVersion && (
        <div className={styles.empty}>
          {t('settings.noReleasesYet', 'No releases published yet')}
          <a className={styles.githubLink} href="https://github.com/spoolhub/spoolhub/releases" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            {t('settings.viewOnGitHub', 'View on GitHub')}
          </a>
        </div>
      )}

      {releases.length > 0 && (
        <div className={styles.list}>
          {releases.map(release => {
            const version = normalizeVersion(release.tag)
            const badge = installedVersion
              ? getReleaseBadge(version, installedVersion, latestVersion, updateAvailable)
              : null

            return (
              <article key={release.tag} className={styles.release}>
                <div className={styles.releaseHead}>
                  <span className={styles.version}>{version}</span>
                  <span className={styles.sep}>—</span>
                  <span className={styles.date}>{formatReleaseDate(release.publishedAt)}</span>
                  {badge === 'current' && (
                    <span className={`${styles.badge} ${styles.badgeCurrent}`}>
                      {t('settings.badgeInstalled', 'Currently Installed')}
                    </span>
                  )}
                  {badge === 'previous' && (
                    <span className={`${styles.badge} ${styles.badgePrevious}`}>
                      {t('settings.labelPreviouslyInstalled', 'Previously Installed')}
                    </span>
                  )}
                  {badge === 'new' && (
                    <span className={`${styles.badge} ${styles.badgeNew}`}>
                      {t('settings.badgeNewVersion', 'New Version')}
                    </span>
                  )}
                </div>

                {release.sections.length > 0 ? (
                  <div className={styles.changelog}>
                    {release.sections.map(section => (
                      <div key={`${release.tag}-${section.title}`}>
                        <div className={styles.sectionTitle}>{section.title}</div>
                        <ul className={styles.items}>
                          {section.items.map((item, index) => (
                            <li key={index}>{renderChangelogItem(item)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <a className={styles.githubLink} href={release.url} target="_blank" rel="noreferrer">
                    {t('settings.viewRelease', 'View release')}
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
