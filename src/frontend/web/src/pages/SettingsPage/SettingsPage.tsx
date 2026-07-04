import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDesign } from '@/context/DesignContext'
import 'flag-icons/css/flag-icons.min.css'
import { settingsApi } from '@/api/settings'
import {
  DiscordIcon,
  TelegramIcon,
  NtfyIcon,
  WebhookIcon,
} from '@/components/icons'
import styles from './SettingsPage.module.css'

const PROVIDERS = [
  { id: 'discord', label: 'Discord', Icon: DiscordIcon, comingSoon: false },
  { id: 'telegram', label: 'Telegram', Icon: TelegramIcon, comingSoon: true },
  { id: 'ntfy', label: 'ntfy', Icon: NtfyIcon, comingSoon: true },
  { id: 'webhook', label: 'Webhook', Icon: WebhookIcon, comingSoon: true },
]

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { dir, setDir, mode: themeMode, setMode: setThemeMode } = useDesign()
  const [activeTab, setActiveTab] = useState('app')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'none' | 'available' | 'error'>('idle')
  const [latestRelease, setLatestRelease] = useState<{ tag: string; url: string } | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const [openProviders, setOpenProviders] = useState<Set<string>>(new Set())

  // ── filament settings state ──
  const [filamentSyncUrl, setFilamentSyncUrl] = useState('https://openfilament.com/api/filaments')
  const [autoSyncFilaments, setAutoSyncFilaments] = useState(true)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [savedFilamentUrl, setSavedFilamentUrl] = useState('https://openfilament.com/api/filaments')
  const [savedAutoSync, setSavedAutoSync] = useState(true)
  const [filamentSaving, setFilamentSaving] = useState(false)
  const [syncingOfd, setSyncingOfd] = useState(false)
  const [syncOfdDone, setSyncOfdDone] = useState(false)

  const filamentDirty = filamentSyncUrl !== savedFilamentUrl || autoSyncFilaments !== savedAutoSync

  // Reset sync-done indicator when leaving/entering filament tab
  useEffect(() => {
    if (activeTab === 'filament') setSyncOfdDone(false)
  }, [activeTab])

  // ── app settings form state ──
  const [currency, setCurrency] = useState('USD')
  const [lowStockThreshold, setLowStockThreshold] = useState(120)
  const [autoDeduct, setAutoDeduct] = useState(true)
  const [emptyReminder, setEmptyReminder] = useState(true)
  const [logLevel, setLogLevel] = useState('Info')
  const [saving, setSaving] = useState(false)

  // ── alerts state ──
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  const [alertsProvider, setAlertsProvider] = useState('')
  const [discordUrlInput, setDiscordUrlInput] = useState('')
  const [alertSaving, setAlertSaving] = useState(false)
  const [alertOk, setAlertOk] = useState(false)
  const [alertFail, setAlertFail] = useState(false)
  const [connectShake, setConnectShake] = useState(false)
  const [savedDiscordUrl, setSavedDiscordUrl] = useState('')

  const discordConnected = alertsProvider === 'discord' && alertsEnabled && !!discordUrlInput

  const [saved, setSaved] = useState({
    currency: 'USD',
    dir,
    themeMode,
    lowStockThreshold: 120,
    autoDeduct: true,
    emptyReminder: true,
    logLevel: 'Info',
    lang: i18n.language,
  })

  // Load persisted settings on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const app = await settingsApi.getApp()
        if (cancelled || !app) return
        setCurrency(app.currency)
        if (typeof app.defaultLowStockThresholdG === 'number') setLowStockThreshold(app.defaultLowStockThresholdG)
        if (app.language) await i18n.changeLanguage(app.language)
        setSaved({
          currency: app.currency,
          dir,
          themeMode,
          lowStockThreshold: app.defaultLowStockThresholdG ?? 120,
          autoDeduct: true,
          emptyReminder: true,
          logLevel: 'Info',
          lang: app.language || i18n.language,
        })
        try {
          const alerts = await settingsApi.getAlerts()
          if (!cancelled && alerts) {
            setAlertsEnabled(alerts.enabled)
            setAlertsProvider(alerts.provider)
            setDiscordUrlInput(alerts.discordWebhookUrl || '')
            setSavedDiscordUrl(alerts.discordWebhookUrl || '')
          }
        } catch { /* ignore */ }
      } catch { /* ignore */ }
        try {
          const filamentSettings = await settingsApi.getFilaments()
          if (!cancelled && filamentSettings) {
            setFilamentSyncUrl(filamentSettings.ofdSourceUrl)
            setAutoSyncFilaments(filamentSettings.autoSync)
            setLastSynced(filamentSettings.lastSynced)
            setSavedFilamentUrl(filamentSettings.ofdSourceUrl)
            setSavedAutoSync(filamentSettings.autoSync)
            if (filamentSettings.autoSync) {
              settingsApi.syncFilaments().then(r => {
                if (!cancelled) setLastSynced(r.lastSynced)
              }).catch(() => {})
            }
          }
        } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [])

  const dirty =
    currency !== saved.currency ||
    dir !== saved.dir ||
    themeMode !== saved.themeMode ||
    lowStockThreshold !== saved.lowStockThreshold ||
    autoDeduct !== saved.autoDeduct ||
    emptyReminder !== saved.emptyReminder ||
    logLevel !== saved.logLevel ||
    i18n.language !== saved.lang

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await settingsApi.updateApp({
        defaultLowStockThresholdG: lowStockThreshold,
        currency,
        language: i18n.language,
      })
      setSaved({
        currency, dir, themeMode, lowStockThreshold,
        autoDeduct, emptyReminder, logLevel,
        lang: i18n.language,
      })
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Alert / Discord actions ──

  async function saveAlerts(provider: string) {
    if (alertSaving) return
    setAlertSaving(true)
    setAlertOk(false)
    setConnectShake(false)
    // First test the webhook
    let testOk = false
    try {
      const res = await fetch(discordUrlInput.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🧪 Test Alert',
            description: 'Your SpoolHub notification channel is working correctly!',
            color: 0x06b6d4,
            footer: { text: 'SpoolHub' },
            timestamp: new Date().toISOString(),
          }],
        }),
      })
      testOk = res.ok || res.status === 204
    } catch { /* ignore */ }
    if (!testOk) {
      setConnectShake(true)
      setAlertSaving(false)
      return
    }
    // Test passed — save to backend
    try {
      await settingsApi.updateAlerts({
        enabled: true, provider,
        ntfyUrl: null, webhookUrl: null,
        discordWebhookUrl: provider === 'discord' ? discordUrlInput : null,
        notifyLowStock: true, notifySpoolAssigned: true, notifySpoolAdded: true,
        notifySpoolDeleted: true, notifyPrinterDeleted: true,
      })
      setAlertsEnabled(true)
      setAlertsProvider(provider)
      setSavedDiscordUrl(discordUrlInput)
      // Send welcome message (connect success)
      try {
        await fetch(discordUrlInput.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '✅ SpoolHub Connected',
              description: 'Notifications are now set up! SpoolHub will send you alerts here when events occur.',
              color: 0x22C55E,
              thumbnail: { url: 'https://raw.githubusercontent.com/spoolhub/spoolhub/develop/src/frontend/web/public/logo.png' },
              footer: { text: 'SpoolHub' },
              timestamp: new Date().toISOString(),
            }],
          }),
        })
      } catch { /* ignore welcome send failure */ }
    } catch (err) {
      console.error('Failed to save alerts:', err)
      setConnectShake(true)
    } finally {
      setAlertSaving(false)
    }
  }

  async function disconnectDiscord() {
    if (alertSaving) return
    setAlertSaving(true)
    setAlertOk(false)
    try {
      await settingsApi.updateAlerts({
        enabled: false, provider: '',
        ntfyUrl: null, webhookUrl: null, discordWebhookUrl: null,
        notifyLowStock: true, notifySpoolAssigned: true, notifySpoolAdded: true,
        notifySpoolDeleted: true, notifyPrinterDeleted: true,
      })
      setAlertsEnabled(false)
      setAlertsProvider('')
      setDiscordUrlInput('')
      setSavedDiscordUrl('')
    } catch (err) {
      console.error('Failed to disconnect:', err)
    } finally {
      setAlertSaving(false)
    }
  }

  useEffect(() => {
    if (!connectShake) return
    const id = setTimeout(() => setConnectShake(false), 500)
    return () => clearTimeout(id)
  }, [connectShake])

  async function sendTestAlert() {
    if (!discordUrlInput.trim()) return
    setAlertOk(false)
    setAlertFail(false)
    setConnectShake(false)
    try {
      const res = await fetch(discordUrlInput.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '� Test Alert',
            description: 'Your SpoolHub notification channel is working correctly!',
            color: 0x06b6d4,
            footer: { text: 'SpoolHub' },
            timestamp: new Date().toISOString(),
          }],
        }),
      })
      if (res.ok || res.status === 204) {
        setAlertOk(true)
        setSavedDiscordUrl(discordUrlInput)
      } else {
        setAlertFail(true)
      }
    } catch {
      setAlertFail(true)
    }
  }

  useEffect(() => {
    if (!alertFail) return
    const id = setTimeout(() => setAlertFail(false), 3000)
    return () => clearTimeout(id)
  }, [alertFail])

  async function handleFilamentSave() {
    if (filamentSaving) return
    setFilamentSaving(true)
    try {
      await settingsApi.updateFilaments({ autoSync: autoSyncFilaments, ofdSourceUrl: filamentSyncUrl })
      setSavedFilamentUrl(filamentSyncUrl)
      setSavedAutoSync(autoSyncFilaments)
      await settingsApi.syncFilaments()
    } catch { /* ignore */ }
    setFilamentSaving(false)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function checkForUpdates() {
    setUpdateStatus('checking')
    try {
      const res = await fetch('https://api.github.com/repos/spoolhub/spoolhub/releases/latest')
      setLastChecked(new Date())
      if (res.status === 404) { setUpdateStatus('none'); return }
      const data = await res.json()
      setLatestRelease({ tag: data.tag_name, url: data.html_url })
      setUpdateStatus('available')
    } catch {
      setLastChecked(new Date())
      setUpdateStatus('error')
    }
  }

  const LANGS = [
    { code: 'en', flag: 'gb', label: 'English' },
    { code: 'es', flag: 'es', label: 'Español' },
    { code: 'sv', flag: 'se', label: 'Svenska' },
  ]
  const activeLang = LANGS.find(l => l.code === i18n.language) ?? LANGS[0]

  const toggleProvider = (id: string) => {
    setOpenProviders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={`${styles.page} page`}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('settings.title', 'Settings')}</h1>
          <div className={styles.sub}>{t('settings.subtitle', 'Application, updates, filament, logs and backup')}</div>
        </div>
      </header>

      <div className={styles.setlayout}>
        <nav className={styles.setnav} id="setnav">
          <button className={activeTab === 'app' ? styles.on : ''} onClick={() => setActiveTab('app')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M9 3v18"/></svg>
            {t('settings.application', 'Application')}
          </button>
          <button className={activeTab === 'updates' ? styles.on : ''} onClick={() => setActiveTab('updates')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/></svg>
            {t('settings.updates', 'Updates')}
          </button>
          <button className={activeTab === 'notif' ? styles.on : ''} onClick={() => setActiveTab('notif')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0"/></svg>
            {t('settings.notifications', 'Notifications')}
          </button>
          <button className={activeTab === 'filament' ? styles.on : ''} onClick={() => setActiveTab('filament')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></svg>
            {t('settings.filament', 'Filament')}
          </button>
          <button className={activeTab === 'logs' ? styles.on : ''} onClick={() => setActiveTab('logs')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
            {t('settings.logs', 'Logs')}
          </button>
          <button className={activeTab === 'backup' ? styles.on : ''} onClick={() => setActiveTab('backup')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>
            {t('settings.backup', 'Backup')}
          </button>
        </nav>

        <div className={styles.setcontent}>
          {/* APPLICATION */}
          <section className={`${styles.panel} ${styles.setpane} ${activeTab === 'app' ? styles.on : ''}`}>
            <div className={styles.ph}><h2>{t('settings.application', 'Application')}</h2></div>

            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.lowStockThreshold', 'Low stock threshold')}</div>
                <div className={styles.d}>{t('settings.lowStockThresholdDesc', 'Spools below this weight are flagged as running low')}</div>
              </div>
              <div className={styles.numwrap}>
                <input type="number" min={0} step={10} value={lowStockThreshold} onChange={e => setLowStockThreshold(Number(e.target.value) || 0)} />
                <span className={styles.u}>g</span>
              </div>
            </div>

            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.currency', 'Currency')}</div>
                <div className={styles.d}>{t('settings.currencyDesc', 'Used to display spool prices and total inventory value')}</div>
              </div>
              <select className={styles.sortsel} value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="SEK">SEK — Swedish Krona</option>
              </select>
            </div>

            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.language', 'Language')}</div>
                <div className={styles.d}>{t('settings.languageDesc', 'The language used throughout SpoolHub')}</div>
              </div>
              <div ref={langRef} className={styles.langSelect}>
                <button className={`${styles.langBtn}${langOpen ? ` ${styles.langBtnOpen}` : ''}`} onClick={() => setLangOpen(o => !o)}>
                  <span className={`fi fi-${activeLang.flag} ${styles.flagIcon}`} />
                  <span>{activeLang.label}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.langChev}><path d="m6 9 6 6 6-6"/></svg>
                </button>
                {langOpen && (
                  <div className={styles.langDropdown}>
                    {LANGS.map(lang => (
                      <button key={lang.code} className={`${styles.langOpt}${lang.code === activeLang.code ? ` ${styles.langOptActive}` : ''}`} onMouseDown={() => { i18n.changeLanguage(lang.code); localStorage.setItem('app.lang', lang.code); setLangOpen(false) }}>
                        <span className={`fi fi-${lang.flag} ${styles.flagIcon}`} />
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.direction', 'Direction')}</div>
                <div className={styles.d}>{t('settings.directionDesc', 'The overall visual style — Studio (warm, rounded) or Console (cool, technical)')}</div>
              </div>
              <div className={styles.seg3}>
                <button className={dir === 'a' ? styles.on : ''} onClick={() => setDir('a')}>Studio</button>
                <button className={dir === 'b' ? styles.on : ''} onClick={() => setDir('b')}>Console</button>
              </div>
            </div>

            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.theme', 'Theme')}</div>
                <div className={styles.d}>{t('settings.themeDesc', 'Choose your preferred color theme')}</div>
              </div>
              <div className={styles.seg3}>
                <button className={themeMode === 'light' ? styles.on : ''} onClick={() => setThemeMode('light')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>
                  {t('settings.themeLight', 'Light')}
                </button>
                <button className={themeMode === 'dark' ? styles.on : ''} onClick={() => setThemeMode('dark')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"/></svg>
                  {t('settings.themeDark', 'Dark')}
                </button>
              </div>
            </div>

            <div className={styles.setfoot}>
              <button className={`${styles.btn} ${dirty ? styles.btnPrimary : styles.btnSaved}`} onClick={handleSave}>
                {!dirty && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                {dirty ? t('settings.saveChanges', 'Save changes') : t('settings.saved', 'Saved')}
              </button>
            </div>
          </section>

          {/* UPDATES */}
          <section className={`${styles.panel} ${styles.setpane} ${activeTab === 'updates' ? styles.on : ''}`}>
            <div className={styles.ph}><h2>{t('settings.updates', 'Updates')}</h2></div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>
                  {t('settings.currentVersion', 'Current version')} <span className={styles.vbadge}>dev</span>
                  {updateStatus === 'none' && <span className={styles.upok}>{t('settings.upToDate', 'No releases yet')}</span>}
                  {updateStatus === 'available' && latestRelease && (
                    <a className={styles.upnew} href={latestRelease.url} target="_blank" rel="noreferrer">{latestRelease.tag} {t('settings.available', 'available')}</a>
                  )}
                  {updateStatus === 'error' && <span className={styles.uperr}>{t('settings.updateError', 'Could not check')}</span>}
                </div>
                <div className={styles.d}>
                  {lastChecked
                    ? `${t('settings.lastChecked', 'Last checked')} ${lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : t('settings.neverChecked', 'Never checked')}
                </div>
              </div>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={checkForUpdates} disabled={updateStatus === 'checking'}>
                {updateStatus === 'checking' ? t('settings.checking', 'Checking…') : t('settings.checkUpdates', 'Check for updates')}
              </button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.stableRelease', 'Stable release')}</div>
                <div className={styles.d}>{t('settings.stableReleaseDesc', 'Download the latest stable release from GitHub')}</div>
              </div>
              <a className={`${styles.btn} ${styles.btnPrimary}`} href="https://github.com/spoolhub/spoolhub/releases" target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                {t('settings.viewReleases', 'View releases')}
              </a>
            </div>
          </section>

          {/* NOTIFICATIONS */}
          <section className={`${styles.panel} ${styles.setpane} ${activeTab === 'notif' ? styles.on : ''}`}>
            <div className={styles.ph}><h2>{t('settings.notifications', 'Notifications')}</h2></div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.lowStockAlerts', 'Low stock alerts')}</div>
                <div className={styles.d}>{t('settings.lowStockAlertsDesc', 'When a spool drops below your threshold')}</div>
              </div>
              <button className={`${styles.tg} ${styles.on}`} aria-label="toggle"></button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.printFinished', 'Print finished')}</div>
                <div className={styles.d}>{t('settings.printFinishedDesc', 'When a job completes on any printer')}</div>
              </div>
              <button className={`${styles.tg} ${styles.on}`} aria-label="toggle"></button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.printFailed', 'Print failed')}</div>
                <div className={styles.d}>{t('settings.printFailedDesc', 'Spaghetti detection and errors')}</div>
              </div>
              <button className={`${styles.tg} ${styles.on}`} aria-label="toggle"></button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.weeklySummary', 'Weekly summary')}</div>
                <div className={styles.d}>{t('settings.weeklySummaryDesc', 'Filament usage digest every Monday')}</div>
              </div>
              <button className={styles.tg} aria-label="toggle"></button>
            </div>

            <div className={styles.subhdr}>
              <div className={styles.t}>{t('settings.providerLabel', 'Providers')}</div>
              <div className={styles.d}>{t('settings.providersDesc', 'Where alerts are delivered')}</div>
            </div>

            {PROVIDERS.map(pv => (
              <div key={pv.id} className={`${styles.pvritem}${!pv.comingSoon && openProviders.has(pv.id) ? ` ${styles.open}` : ''}`}>
                <div className={`${styles.srow} ${styles.pvrhead}${pv.comingSoon ? ` ${styles.disabled}` : ''}`} onClick={() => { if (!pv.comingSoon) toggleProvider(pv.id) }}>
                  <div className={styles.pvr}><pv.Icon size={20} /></div>
                  <div className={styles.sl}>
                    <div className={styles.t}>{pv.label}</div>
                    <div className={`${styles.d}${pv.id === 'discord' && discordConnected ? ` ${styles.connected}` : ''}`}>
                      {pv.comingSoon
                        ? t('settings.comingSoon', 'Coming soon')
                        : pv.id === 'discord' && discordConnected
                          ? t('settings.connected', 'Connected')
                          : t('settings.notConnected', 'Not connected')}
                    </div>
                  </div>
                  {!pv.comingSoon && (
                    <span className={styles.chev}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </span>
                  )}
                </div>
                {!pv.comingSoon && (
                <div className={styles.pvrcfg}>
                  <div className={styles.cfgfield}>
                    <label>{t('settings.urlLabelWebhook', 'Webhook URL')}</label>
                    <input type="text" value={discordUrlInput} onChange={e => { setDiscordUrlInput(e.target.value); setAlertOk(false); setAlertFail(false) }} disabled={discordConnected} placeholder={t('settings.urlPlaceholderDiscord', 'https://discord.com/api/webhooks/…')} />
                  </div>
                  <div className={styles.cfgbtns}>
                    <button className={`${styles.btn}${alertOk ? ` ${styles.btnSuccess}` : alertFail ? ` ${styles.btnFail}` : ''}`} onClick={sendTestAlert} disabled={alertSaving || !discordUrlInput || (alertOk && discordUrlInput === savedDiscordUrl)}>
                      {alertOk ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      ) : alertFail ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                      ) : null}
                      {alertOk ? t('settings.testSuccess', 'Test alert sent!') : alertFail ? t('settings.testFailed', 'Test failed') : t('settings.sendTest', 'Send test alert')}
                    </button>
                    <button className={`${styles.btn} ${discordConnected ? styles.btnDanger : styles.btnPrimary}${connectShake ? ` ${styles.shake}` : ''}`} onClick={() => discordConnected ? disconnectDiscord() : saveAlerts('discord')} disabled={alertSaving || !discordUrlInput}>
                      {discordConnected ? t('settings.disconnect', 'Disconnect') : t('settings.connect', 'Connect')}
                    </button>
                  </div>
                </div>
              )}
              </div>
            ))}
          </section>

          {/* FILAMENT */}
          <section className={`${styles.panel} ${styles.setpane} ${activeTab === 'filament' ? styles.on : ''}`}>
            <div className={styles.ph}><h2>{t('settings.filament', 'Filament')}</h2></div>

            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.lowStockThresholdAlt', 'Low-stock threshold')}</div>
                <div className={styles.d}>{t('settings.lowStockThresholdAltDesc', 'Warn when a spool drops below this weight')}</div>
              </div>
              <div className={styles.srange}>
                <input type="range" min={50} max={300} step={10} value={lowStockThreshold} onChange={e => setLowStockThreshold(Number(e.target.value))}
                  style={{ background: `linear-gradient(to right, #22c55e ${((lowStockThreshold - 50) / 250) * 100}%, var(--border) ${((lowStockThreshold - 50) / 250) * 100}%)` }} />
                <span className={styles.sval}>{lowStockThreshold} g</span>
              </div>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.autoDeduct', 'Auto-deduct on print')}</div>
                <div className={styles.d}>{t('settings.autoDeductDesc', 'Subtract used filament after each job')}</div>
              </div>
              <button className={`${styles.tg}${autoDeduct ? ` ${styles.on}` : ''}`} onClick={() => setAutoDeduct(v => !v)} aria-label="toggle"></button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.emptyReminder', 'Empty-spool reminder')}</div>
                <div className={styles.d}>{t('settings.emptyReminderDesc', 'Prompt to archive a spool when it hits 0 g')}</div>
              </div>
              <button className={`${styles.tg}${emptyReminder ? ` ${styles.on}` : ''}`} onClick={() => setEmptyReminder(v => !v)} aria-label="toggle"></button>
            </div>

            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>OFD source</div>
                <div className={styles.urlDisplay}>{filamentSyncUrl}</div>
              </div>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>Auto-sync</div>
                <div className={styles.d}>Automatically refresh filament profiles from OFD on startup</div>
              </div>
              <button className={`${styles.tg}${autoSyncFilaments ? ` ${styles.on}` : ''}`} onClick={() => setAutoSyncFilaments(v => !v)} aria-label="toggle"></button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>Last OFD sync</div>
                <div className={styles.d}>
                  {lastSynced
                    ? new Date(lastSynced).toLocaleString()
                    : 'Never synced'}
                </div>
              </div>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={async () => {
                  if (syncingOfd) return
                  setSyncingOfd(true)
                  setSyncOfdDone(false)
                  try {
                    const result = await settingsApi.syncFilaments()
                    setLastSynced(result.lastSynced)
                    setSyncOfdDone(true)
                    setTimeout(() => setSyncOfdDone(false), 3000)
                  } catch { /* ignore */ }
                  setSyncingOfd(false)
                }}
              >
                {syncingOfd ? (
                  <><span className={styles.spin}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/></svg></span> Syncing...</>
                ) : syncOfdDone ? (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg> Synced</>
                ) : (
                  <><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/></svg></span> Sync now</>
                )}
              </button>
            </div>

            <div className={styles.setfoot}>
              <button
                className={`${styles.btn} ${filamentDirty ? styles.btnPrimary : styles.btnSaved}`}
                onClick={handleFilamentSave}
                disabled={filamentSaving}
              >
                {!filamentDirty && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                {filamentSaving ? 'Saving…' : filamentDirty ? 'Save changes' : 'Saved'}
              </button>
            </div>

            </section>

          {/* LOGS */}
          <section className={`${styles.panel} ${styles.setpane} ${activeTab === 'logs' ? styles.on : ''}`}>
            <div className={styles.ph}>
              <h2>{t('settings.logs', 'Logs')}</h2>
              <span className={styles.meta}>debug.log</span>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.logLevel', 'Log level')}</div>
                <div className={styles.d}>{t('settings.logLevelDesc', 'How much detail to record')}</div>
              </div>
              <select className={styles.sortsel} value={logLevel} onChange={e => setLogLevel(e.target.value)}>
                <option>Info</option><option>Warn</option><option>Error</option><option>Debug</option>
              </select>
            </div>
            <div className={styles.logbox}>
              <div><span className={styles.lt}>08:12:04</span> <span className={styles.lo}>INFO</span>  Connected to Bambu Lab Cloud (4 printers)</div>
              <div><span className={styles.lt}>08:12:05</span> <span className={styles.lo}>INFO</span>  Synced 128 spools across 9 brands</div>
              <div><span className={styles.lt}>08:14:22</span> <span className={styles.lt}>DEBUG</span> NFC reader ready on /dev/ttyACM0</div>
              <div><span className={styles.lt}>09:01:48</span> <span className={styles.lt}>DEBUG</span> Job started · X1 Carbon · Voron Stealthburner</div>
              <div><span className={styles.lt}>10:47:13</span> <span className={styles.le}>ERROR</span> Prusa Connect token expired — reconnect required</div>
            </div>
            <div className={styles.rowbtns}>
              <button className={styles.btn}>{t('settings.exportLogs', 'Export logs')}</button>
              <button className={styles.btn}>{t('settings.clearLogs', 'Clear logs')}</button>
            </div>
          </section>

          {/* BACKUP */}
          <section className={`${styles.panel} ${styles.setpane} ${activeTab === 'backup' ? styles.on : ''}`}>
            <div className={styles.ph}><h2>{t('settings.backup', 'Backup')}</h2></div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.lastBackup', 'Last backup')}</div>
                <div className={styles.d}>{t('settings.lastBackupDesc', 'Today at 04:00 · 2.4 MB')}</div>
              </div>
              <button className={`${styles.btn} ${styles.btnPrimary}`}>{t('settings.backUpNow', 'Back up now')}</button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.autoBackups', 'Automatic backups')}</div>
                <div className={styles.d}>{t('settings.autoBackupsDesc', 'Create a backup every night')}</div>
              </div>
              <button className={`${styles.tg} ${styles.on}`} aria-label="toggle"></button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.restoreFrom', 'Restore from file')}</div>
                <div className={styles.d}>{t('settings.restoreFromDesc', 'Replace current data with a backup')}</div>
              </div>
              <button className={styles.btn}>{t('settings.restoreAction', 'Restore…')}</button>
            </div>
            <div className={styles.srow}>
              <div className={styles.sl}>
                <div className={styles.t}>{t('settings.exportJson', 'Export all data')}</div>
                <div className={styles.d}>{t('settings.exportJsonDesc', 'Download spools, brands and history as JSON')}</div>
              </div>
              <button className={styles.btn}>{t('settings.exportAction', 'Export JSON')}</button>
            </div>
          </section>
        </div>
      </div>
      <div style={{ height: 70 }} />
    </div>
  )
}
