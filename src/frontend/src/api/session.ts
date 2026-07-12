import type { AuthResponse } from '@/types/auth'

const TOKEN_KEY = 'spoolhub-token'
const USER_KEY = 'spoolhub-user'
const EXPIRES_KEY = 'spoolhub-token-expires'

export interface SessionUser {
  id: string
  username: string
  fullName: string | null
}

export function saveSession(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.token)
  localStorage.setItem(EXPIRES_KEY, auth.expiresAt)
  localStorage.setItem(USER_KEY, JSON.stringify({ id: auth.id, username: auth.username, fullName: auth.fullName }))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRES_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  const expiresAt = localStorage.getItem(EXPIRES_KEY)
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    clearSession()
    return false
  }
  return true
}

export function updateSessionUser(patch: Partial<SessionUser>) {
  const current = getSessionUser()
  if (!current) return
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...patch }))
  window.dispatchEvent(new CustomEvent('session-user-updated'))
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}
