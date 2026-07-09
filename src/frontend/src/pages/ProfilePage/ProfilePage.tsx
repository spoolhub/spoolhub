import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { usersApi } from '@/api/users'
import { getSessionUser, updateSessionUser } from '@/api/session'
import type { UserResponse } from '@/types/user'
import styles from './ProfilePage.module.css'

function userInitials(fullName: string | null, username: string): string {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

function formatMemberSince(value: string): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function userFromSession(): UserResponse | null {
  const session = getSessionUser()
  if (!session) return null
  return {
    id: session.id,
    username: session.username,
    fullName: session.fullName,
    createdAt: '',
  }
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<UserResponse | null>(userFromSession)
  const [loading, setLoading] = useState(() => getSessionUser() === null)
  const [fullName, setFullName] = useState(() => getSessionUser()?.fullName ?? '')
  const [savedFullName, setSavedFullName] = useState(() => getSessionUser()?.fullName ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await usersApi.getMe()
        if (cancelled) return
        setUser(data)
        setFullName(data.fullName ?? '')
        setSavedFullName(data.fullName ?? '')
        setProfileError(null)
      } catch {
        if (cancelled) return
        if (!getSessionUser()) setProfileError(t('profile.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const profileDirty = fullName !== savedFullName
  const displayName = useMemo(
    () => user?.fullName?.trim() || user?.username || '',
    [user],
  )

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profileDirty || profileSaving) return
    setProfileSaving(true)
    setProfileError(null)
    setProfileMessage(null)
    try {
      const updated = await usersApi.updateMe({ fullName: fullName.trim() || null })
      setUser(updated)
      setFullName(updated.fullName ?? '')
      setSavedFullName(updated.fullName ?? '')
      updateSessionUser({ fullName: updated.fullName })
      setProfileMessage(t('profile.profileUpdated'))
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null
      setProfileError(typeof detail === 'string' ? detail : t('profile.saveError'))
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordSaving) return
    setPasswordError(null)
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'))
      return
    }

    setPasswordSaving(true)
    try {
      await usersApi.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage(t('profile.passwordUpdated'))
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null
      setPasswordError(typeof detail === 'string' ? detail : t('profile.saveError'))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className={`${styles.page} page`}>
      <header className={styles.topbar}>
        <div className={styles.h}>
          <h1>{t('profile.title')}</h1>
          <div className={styles.sub}>{t('profile.subtitle')}</div>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>{t('common.loading', 'Loading…')}</div>
      ) : user ? (
        <div className={styles.layout}>
          <section className={styles.hero}>
            <div className={styles.avatar}>{userInitials(user.fullName, user.username)}</div>
            <div className={styles.heroMeta}>
              <h2 className={styles.heroName}>{displayName}</h2>
              <div className={styles.heroUser}>@{user.username}</div>
              {user.createdAt && (
                <div className={styles.heroSince}>
                  {t('profile.memberSince')} {formatMemberSince(user.createdAt)}
                </div>
              )}
            </div>
          </section>

          <form className={styles.panel} onSubmit={handleSaveProfile}>
            <h2>{t('profile.accountDetails')}</h2>
            <div className={styles.field}>
              <label htmlFor="profileFullName">{t('profile.fullName')}</label>
              <input
                id="profileFullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={t('profile.fullNamePlaceholder')}
              />
              <span className={styles.hint}>{t('profile.fullNameDesc')}</span>
            </div>
            <div className={styles.field}>
              <label htmlFor="profileUsername">{t('profile.username')}</label>
              <input id="profileUsername" type="text" value={user.username} disabled />
              <span className={styles.hint}>{t('profile.usernameDesc')}</span>
            </div>
            {profileError && <div className={styles.error}>{profileError}</div>}
            {profileMessage && <div className={styles.success}>{profileMessage}</div>}
            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={!profileDirty || profileSaving}>
                {profileSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>

          <form className={styles.panel} onSubmit={handleChangePassword}>
            <h2>{t('profile.changePassword')}</h2>
            <p className={styles.hint}>{t('profile.changePasswordDesc')}</p>
            <div className={styles.field}>
              <label htmlFor="currentPassword">{t('profile.currentPassword')}</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="newPassword">{t('profile.newPassword')}</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="confirmPassword">{t('profile.confirmPassword')}</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            {passwordError && <div className={styles.error}>{passwordError}</div>}
            {passwordMessage && <div className={styles.success}>{passwordMessage}</div>}
            <div className={styles.actions}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="submit"
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordSaving ? t('common.saving') : t('profile.updatePassword')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
