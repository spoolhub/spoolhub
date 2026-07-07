import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useDesign } from '@/context/DesignContext'
import { authApi } from '@/api/auth'
import { saveSession } from '@/api/session'
import SpoolHubLogo from '@/components/SpoolHubLogo'
import styles from './SignupPage.module.css'

export default function SignupPage() {
  const navigate = useNavigate()
  const { dark, toggleDark } = useDesign()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const auth = await authApi.register({ username, fullName: fullName || undefined, password })
      saveSession(auth)
      navigate('/')
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null
      setError(detail ?? 'Could not create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.themeToggle} aria-label="Toggle theme" onClick={toggleDark}>
        {dark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" /></svg>
        )}
      </button>
      <div className={styles.shell}>
        <div className={styles.toplogo}>
          <SpoolHubLogo size={72} />
        </div>
        <div className={styles.formcol}>
          <h1>Create your account</h1>
          <p className={styles.sub}>Start tracking your filament inventory.</p>
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label>Full name</label>
              <div className={styles.inputwrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>
                <input
                  type="text"
                  placeholder="Mira Kovač"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label>Username</label>
              <div className={styles.inputwrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="11" r="2" /><path d="M6 16c0-1.7 1.3-2.5 3-2.5s3 .8 3 2.5M14 9.5h5M14 13h4" /></svg>
                <input
                  type="text"
                  placeholder="mira.kovac"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className={styles.field}>
              <label>Password</label>
              <div className={styles.inputwrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>
          <div className={styles.foot}>Already have an account? <Link to="/login">Log in</Link></div>
        </div>
      </div>
    </div>
  )
}
