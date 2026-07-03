import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { printersApi } from '@/api/printers'
import type { PrinterResponse, LanDiscoveredPrinter, CloudDiscoveredPrinter } from '@/types/printer'
import styles from './AddPrinterModal.module.css'

interface Props {
  onClose: () => void
  onAdded: (printer: PrinterResponse) => void
}

/* ── Icon components (handoff exact SVG) ── */
const BAMBU_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="3" x2="4" y2="19"/><line x1="20" y1="3" x2="20" y2="19"/><path d="M4 3h16"/>
    <line x1="4" y1="9" x2="20" y2="9"/><rect x="9.5" y="6.5" width="5" height="4" rx="0.75"/>
    <rect x="3" y="19" width="18" height="2" rx="0.75"/><rect x="8.5" y="14.5" width="7" height="4" rx="0.5"/>
  </svg>
)

const KLIPPER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 12h8M8 15h5"/>
  </svg>
)

const LAN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>
  </svg>
)

const CLOUD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6-1.6A4.5 4.5 0 0 0 7 18Z"/>
  </svg>
)

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
  </svg>
)

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7"/>
  </svg>
)

const BACK_ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
)

const CLOSE_X = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12M18 6L6 18"/>
  </svg>
)

type Step = 'choose' | 'connect' | 'lan_scan' | 'lan_form' | 'login' | 'verify' | 'cloud_select' | 'connecting' | 'success'

export default function AddPrinterModal({ onClose, onAdded }: Props) {
  const { t } = useTranslation()

  const [step, setStep]                     = useState<Step>('choose')
  const [error, setError]                   = useState<string | null>(null)

  /* LAN state */
  const [scanning, setScanning]             = useState(false)
  const [scanDone, setScanDone]             = useState(false)
  const [discovered, setDiscovered]         = useState<LanDiscoveredPrinter[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<LanDiscoveredPrinter | null>(null)
  const [codeDigits, setCodeDigits]         = useState<string[]>(Array(8).fill(''))
  const codeRefs                            = useRef<(HTMLInputElement | null)[]>([])

  /* Cloud state */
  const [email, setEmail]                   = useState('')
  const [password, setPassword]             = useState('')
  const [otpDigits, setOtpDigits]           = useState<string[]>(Array(6).fill(''))
  const otpRefs                             = useRef<(HTMLInputElement | null)[]>([])
  const [cloudPrinters, setCloudPrinters]   = useState<CloudDiscoveredPrinter[]>([])
  const [addingSerial, setAddingSerial]     = useState<string | null>(null)
  const [connectMsg, setConnectMsg]         = useState('')
  const [submitting, setSubmitting]         = useState(false)
  const [countdown, setCountdown]           = useState(300)

  /* ---- Effects ---- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (step !== 'verify') return
    const id = setInterval(() => setCountdown(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [step])

  /* ---- Navigation ---- */
  function goBack() {
    setError(null)
    switch (step) {
      case 'choose':    onClose(); break
      case 'connect':   setStep('choose'); break
      case 'lan_scan':  setStep('connect'); break
      case 'lan_form':  setStep('lan_scan'); break
      case 'login':     setStep('connect'); break
      case 'verify':    setStep('login'); break
      case 'cloud_select': setStep('verify'); break
    }
  }

  const canGoBack = step !== 'choose' && step !== 'connecting' && step !== 'success'

  /* ---- Brand picker ---- */
  function pickBambu() { setStep('connect') }

  /* ---- Connection picker ---- */
  function pickLan() {
    setError(null)
    setDiscovered([])
    setScanDone(false)
    setStep('lan_scan')
    startScan()
  }

  function pickCloud() {
    setError(null)
    setStep('login')
  }

  /* ---- LAN scan ---- */
  async function startScan() {
    setScanning(true)
    setScanDone(false)
    setDiscovered([])
    try {
      const results = await printersApi.discoverLan()
      setDiscovered(results)
    } catch {
      setDiscovered([])
    } finally {
      setScanning(false)
      setScanDone(true)
    }
  }

  function selectDiscovered(p: LanDiscoveredPrinter) {
    setSelectedPrinter(p)
    const next = Array(8).fill('')
    ;(p.accessCode ?? '').split('').forEach((c, i) => { if (i < 8) next[i] = c })
    setCodeDigits(next)
    setStep('lan_form')
  }

  /* ---- LAN code input ---- */
  function handleCodeChange(i: number, val: string) {
    const d = val.slice(-1)
    const next = [...codeDigits]
    next[i] = d
    setCodeDigits(next)
    if (d && i < 7) codeRefs.current[i + 1]?.focus()
  }

  function handleCodeKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !codeDigits[i] && i > 0) {
      codeRefs.current[i - 1]?.focus()
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\s/g, '').slice(0, 8)
    const next = Array(8).fill('')
    pasted.split('').forEach((c, i) => { next[i] = c })
    setCodeDigits(next)
    codeRefs.current[Math.min(pasted.length, 7)]?.focus()
  }

  async function submitLan() {
    setError(null)
    setConnectMsg(t('addPrinter.connectingLan'))
    setStep('connecting')
    const p = selectedPrinter!
    try {
      const printer = await printersApi.registerLan({
        name:         p.name.includes(p.ipAddress) ? `Bambu ${p.model}` : p.name,
        brand:        'Bambu Lab',
        model:        p.model,
        ipAddress:    p.ipAddress,
        serialNumber: p.serialNumber || null,
        accessCode:   codeDigits.join('').trim() || null,
      })
      onAdded(printer)
      setStep('success')
    } catch {
      setError(t('addPrinter.addError'))
      setStep('lan_form')
    }
  }

  /* ---- Cloud login ---- */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await printersApi.registerCloud({ brand: 'Bambu Lab', email, password })
      if (result.requiresVerification) {
        setCountdown(300)
        setOtpDigits(Array(6).fill(''))
        setStep('verify')
      } else if (result.availablePrinters && result.availablePrinters.length > 0) {
        setCloudPrinters(result.availablePrinters)
        setStep('cloud_select')
      } else {
        setStep('choose')
      }
    } catch {
      setError(t('addPrinter.signInError'))
    } finally {
      setSubmitting(false)
    }
  }

  /* ---- OTP ---- */
  function handleOtpChange(i: number, val: string) {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...otpDigits]
    next[i] = d
    setOtpDigits(next)
    if (d && i < 5) otpRefs.current[i + 1]?.focus()
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = Array(6).fill('')
    pasted.split('').forEach((c, i) => { next[i] = c })
    setOtpDigits(next)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const printers = await printersApi.verifyCloud({ code: otpDigits.join('') })
      if (printers.length > 0) {
        setCloudPrinters(printers)
        setStep('cloud_select')
      } else {
        setStep('choose')
      }
    } catch {
      setError(t('addPrinter.verifyError'))
    } finally {
      setSubmitting(false)
    }
  }

  /* ---- Cloud printer selection ---- */
  async function handleCloudSelect(serial: string) {
    setAddingSerial(serial)
    setError(null)
    setConnectMsg(t('addPrinter.connectingCloud'))
    setStep('connecting')
    try {
      const printers = await printersApi.selectCloud([serial])
      if (printers.length > 0) onAdded(printers[0])
      setStep('success')
    } catch {
      setError(t('addPrinter.addError'))
      setAddingSerial(null)
      setStep('cloud_select')
    }
  }

  const nav = (title: string, sub: string | undefined, body: React.ReactNode, foot?: React.ReactNode) => (
    <>
      <div className={styles.nav}>
        {canGoBack ? (
          <button className={styles.back} onClick={goBack}>{BACK_ARROW}{t('addPrinter.backChooseBrand')}</button>
        ) : <span />}
        <button className={styles.close} onClick={onClose} aria-label="Close">{CLOSE_X}</button>
      </div>
      <div className={styles.body}>
        <div className={styles.heading}>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        {body}
      </div>
      {foot && <div className={styles.foot}>{foot}</div>}
    </>
  )

  /* ── Render steps ── */

  function renderBrandPick() {
    const brands = [
      { name: 'Bambu Lab', icon: BAMBU_ICON, available: true,  desc: 'Connect over LAN or Bambu Cloud. Supports AMS tray sync.' },
      { name: 'Klipper',   icon: KLIPPER_ICON, available: false, desc: 'Moonraker-based printers. Support is on the way.' },
    ]
    return nav(
      t('addPrinter.stepTitleBrand'),
      t('addPrinter.stepSubtitleBrand'),
      <div className={styles.choose}>
        {brands.map(b => (
          <button
            key={b.name}
            className={`${styles.choice} ${!b.available ? styles.choiceDisabled : ''}`}
            onClick={() => b.available && pickBambu()}
            disabled={!b.available}
          >
            {!b.available && <span className={`${styles.cBadge} ${styles.cBadgeSoon}`}>Soon</span>}
            <div className={`${styles.choiceIcon} ${!b.available ? styles.choiceDisabled : ''}`}>{b.icon}</div>
            <div className={styles.choiceTitle}>{b.name}</div>
            <div className={styles.choiceDesc}>{b.desc}</div>
          </button>
        ))}
      </div>
    )
  }

  function renderConnect() {
    return nav(
      'Connect Bambu Lab',
      'How should SpoolHub reach this printer?',
      <div className={styles.choose}>
        <button className={styles.choice} onClick={pickLan}>
          <div className={styles.choiceIcon}>{LAN_ICON}</div>
          <div className={styles.choiceTitle}>LAN</div>
          <div className={styles.choiceDesc}>Local network connection using the printer's IP and access code.</div>
        </button>
        <button className={styles.choice} onClick={pickCloud}>
          <div className={styles.choiceIcon}>{CLOUD_ICON}</div>
          <div className={styles.choiceTitle}>Cloud</div>
          <div className={styles.choiceDesc}>Sign in with your Bambu account to sync from anywhere.</div>
        </button>
      </div>
    )
  }

  function renderLanScan() {
    return nav(
      'Connect via LAN',
      scanning ? 'Searching your network for Bambu Lab printers' : scanDone && discovered.length > 0 ? 'Printers found on your network' : 'No printers found',
      <div className={styles.formCard}>
        {scanning && (
          <div className={styles.lanScan}>
            <div className={styles.lanSpin} />
            <div className={styles.lanScanTxt}>Scanning local network&hellip;</div>
          </div>
        )}
        {scanDone && discovered.length > 0 && (
          <div style={{ padding: 10 }}>
            {discovered.map((p) => (
              <button key={p.serialNumber} className={styles.lanResult} onClick={() => selectDiscovered(p)}>
                <div className={styles.choiceIcon} style={{ width: 38, height: 38, borderRadius: 9 }}>{BAMBU_ICON}</div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div className={styles.lanResultCt} style={{ fontSize: 14.5 }}>{p.name}</div>
                  <div className={styles.lanResultCd} style={{ marginTop: 1 }}>{p.ipAddress}</div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--faint)', flex: 'none' }}><path d="M9 6l6 6-6 6"/></svg>
              </button>
            ))}
            <button className={styles.lanResult} onClick={startScan} style={{ color: 'var(--muted)' }}>
              <div className={styles.choiceIcon} style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--surface-alt)', color: 'var(--faint)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v6h6M20 20v-6h-6"/><path d="M4 10a8 8 0 0 1 14.6-4.6M20 14a8 8 0 0 1-14.6 4.6"/></svg>
              </div>
              <div style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 600 }}>Scan again</div>
            </button>
          </div>
        )}
        {scanDone && discovered.length === 0 && (
          <div className={styles.emptyNote}>No printers found. Make sure your printer is on and connected to the same network.</div>
        )}
      </div>
    )
  }

  function renderLanForm() {
    const p = selectedPrinter!
    return nav(
      'Connect via LAN',
      `Enter the access code shown on ${p.name}'s screen`,
      <div className={styles.formCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className={styles.choiceIcon} style={{ width: 38, height: 38, borderRadius: 9 }}>{BAMBU_ICON}</div>
          <div>
            <div style={{ fontSize: 14.5, lineHeight: 1.4, fontWeight: 700, letterSpacing: '-.01em', fontFamily: 'var(--font-display)' }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>{p.ipAddress}</div>
          </div>
        </div>
        <div className={styles.codeWrap}>
          <div className={styles.codeGrid}>
            {codeDigits.map((d, i) => (
              <input
                key={i}
                ref={el => { codeRefs.current[i] = el }}
                className={styles.codeDigit}
                type="text" maxLength={1} autoComplete="one-time-code"
                value={d}
                onChange={e => handleCodeChange(i, e.target.value)}
                onKeyDown={e => handleCodeKeyDown(i, e)}
                onPaste={i === 0 ? handleCodePaste : undefined}
                autoFocus={i === 0}
              />
            ))}
          </div>
          <div className={styles.codeHint}>Shown on the printer's touchscreen under <b>Settings &rsaquo; Network</b></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className={`${styles.btn} ${styles.back}`} onClick={goBack}>Back</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ flex: 1, justifyContent: 'center' }} onClick={submitLan}>Connect Printer</button>
        </div>
        {error && <div className={styles.error} style={{ marginTop: 12 }}>{error}</div>}
      </div>
    )
  }

  function renderLogin() {
    return nav(
      'Connect via Cloud',
      'Sign in with your Bambu Lab account',
      <div className={styles.formCard}>
        <div className={styles.field}>
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </div>
        <div className={styles.field} style={{ marginTop: 4 }}>
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className={`${styles.btn} ${styles.back}`} onClick={goBack}>Back</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ flex: 1, justifyContent: 'center' }} onClick={handleLogin} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
        {error && <div className={styles.error} style={{ marginTop: 8 }}>{error}</div>}
      </div>
    )
  }

  function renderVerify() {
    const mins = Math.floor(countdown / 60)
    const secs = countdown % 60
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`
    return nav(
      t('addPrinter.verifyTitle'),
      `Verify the code that sends to ${email}`,
      <div className={styles.formCard}>
        <div className={styles.otpWrap}>
          <div className={styles.otpIcon}>{LOCK_ICON}</div>
          <div className={styles.otp}>
            {otpDigits.map((d, i) => (
              <input
                key={i}
                ref={el => { otpRefs.current[i] = el }}
                className={styles.otpInput}
                type="text" inputMode="numeric" maxLength={1} autoComplete="one-time-code"
                value={d}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                onPaste={i === 0 ? handleOtpPaste : undefined}
                autoFocus={i === 0}
              />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-num)', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{timeStr}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className={`${styles.btn} ${styles.back}`} onClick={goBack}>Back</button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={handleVerify}
            disabled={submitting || otpDigits.join('').length < 6 || countdown === 0}
          >
            {submitting ? 'Verifying\u2026' : 'Verify & Connect'}
          </button>
        </div>
        {error && <div className={styles.error} style={{ marginTop: 8 }}>{error}</div>}
      </div>
    )
  }

  function renderCloudSelect() {
    return nav(
      'Add Printer',
      'Select printers to add',
      cloudPrinters.length === 0 ? (
        <div className={styles.emptyNote}>No printers found on this account.</div>
      ) : (
        <div className={styles.cloudList}>
          {cloudPrinters.map(p => {
            const isAdding = addingSerial === p.serialNumber
            if (p.alreadyAdded) {
              return (
                <div key={p.serialNumber} className={styles.cloudPrinter} style={{ cursor: 'default', opacity: 0.6 }}>
                  <div className={styles.choiceIcon} style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--surface)', color: 'var(--faint)' }}>{CLOUD_ICON}</div>
                  <div className={styles.cloudPrinterInfo}>
                    <div className={styles.cloudPrinterName} style={{ color: 'var(--muted)' }}>{p.name}</div>
                    <div className={styles.cloudPrinterModel}>{p.model}</div>
                    <div className={styles.cloudPrinterSerial}>{p.serialNumber.slice(-6)}</div>
                  </div>
                  <span className={styles.badgeAdded}>Added</span>
                </div>
              )
            }
            return (
              <button key={p.serialNumber} className={styles.cloudPrinter} onClick={() => handleCloudSelect(p.serialNumber)} disabled={addingSerial !== null}>
                <div className={styles.choiceIcon} style={{ width: 38, height: 38, borderRadius: 9 }}>{isAdding ? <div className={styles.lanSpin} style={{ width: 22, height: 22, borderWidth: 2 }} /> : CLOUD_ICON}</div>
                <div className={styles.cloudPrinterInfo}>
                  <div className={styles.cloudPrinterName}>{p.name}</div>
                  <div className={styles.cloudPrinterModel}>{p.model}</div>
                  <div className={styles.cloudPrinterSerial}>{p.serialNumber.slice(-6)}</div>
                </div>
                <span className={p.online ? styles.badgeOnline : styles.badgeOffline}>{p.online ? 'Online' : 'Offline'}</span>
              </button>
            )
          })}
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )
    )
  }

  function renderConnecting() {
    return nav(
      'Add Printer',
      undefined,
      <div className={styles.formCard}>
        <div className={styles.lanScan}>
          <div className={styles.lanSpin} />
          <div className={styles.lanScanTxt}>{connectMsg}</div>
        </div>
      </div>
    )
  }

  function renderSuccess() {
    return nav(
      'Add Printer',
      undefined,
      <div className={styles.formCard}>
        <div className={styles.success}>
          <div className={styles.ck}>{CHECK_ICON}</div>
          <h2>Printer connected</h2>
          <p>Your Bambu Lab printer is now linked to SpoolHub.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnWide}`} onClick={onClose} style={{ marginTop: 8 }}>Done</button>
      </div>
    )
  }

  function renderStep() {
    switch (step) {
      case 'choose':       return renderBrandPick()
      case 'connect':      return renderConnect()
      case 'lan_scan':     return renderLanScan()
      case 'lan_form':     return renderLanForm()
      case 'login':        return renderLogin()
      case 'verify':       return renderVerify()
      case 'cloud_select': return renderCloudSelect()
      case 'connecting':   return renderConnecting()
      case 'success':      return renderSuccess()
    }
  }

  return (
    <>
      <div className={`${styles.scrim} ${styles.scrimOn}`} onClick={onClose} />
      <div className={`${styles.modal} ${styles.modalOn}`}>
        <div className={styles.card}>
          {renderStep()}
        </div>
      </div>
    </>
  )
}