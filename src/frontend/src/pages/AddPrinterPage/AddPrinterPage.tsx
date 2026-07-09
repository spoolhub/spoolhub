import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { printersApi } from '@/api/printers'
import type { LanDiscoveredPrinter, CloudDiscoveredPrinter } from '@/types/printer'
import styles from './AddPrinterPage.module.css'

const BAMBU_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="3" x2="4" y2="19"/><line x1="20" y1="3" x2="20" y2="19"/><path d="M4 3h16"/><line x1="4" y1="9" x2="20" y2="9"/>
    <rect x="9.5" y="6.5" width="5" height="4" rx="0.75"/><rect x="3" y="19" width="18" height="2" rx="0.75"/><rect x="8.5" y="14.5" width="7" height="4" rx="0.5"/>
  </svg>
)
const KLIPPER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 12h8M8 15h5"/>
  </svg>
)

const BRANDS = [
  { name: 'Bambu Lab', icon: BAMBU_ICON,   available: true,  description: 'Connect over LAN or Bambu Cloud. Supports AMS tray sync.', domain: 'bambulab.com' },
  { name: 'Klipper',   icon: KLIPPER_ICON, available: false, description: 'Moonraker-based printers. Support is on the way.', domain: '' },
]

type Step = 'brand' | 'connection' | 'login' | 'verify' | 'cloud_select' | 'lan_scan' | 'lan_form' | 'form' | 'connecting' | 'success'

export default function AddPrinterPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [step, setStep]             = useState<Step>('brand')
  const [brand, setBrand]           = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [digits, setDigits]         = useState<string[]>(Array(6).fill(''))
  const digitRefs                   = useRef<(HTMLInputElement | null)[]>([])

  const [name, setName]             = useState('')
  const [model, setModel]           = useState('')
  const [ip, setIp]                 = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(8).fill(''))
  const codeRefs                    = useRef<(HTMLInputElement | null)[]>([])
  const [hasAms, setHasAms]         = useState(false)
  const [port, setPort]             = useState('')
  const [connectingMessage, setConnectingMessage] = useState('')

  const [scanning, setScanning]           = useState(false)
  const [discovered, setDiscovered]       = useState<LanDiscoveredPrinter[]>([])
  const [scanDone, setScanDone]           = useState(false)
  const [fromDiscovery, setFromDiscovery] = useState(false)

  const [cloudPrinters, setCloudPrinters] = useState<CloudDiscoveredPrinter[]>([])
  const [addingSerial, setAddingSerial]   = useState<string | null>(null)

  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown]     = useState(300)

  useEffect(() => {
    if (step !== 'verify') return
    const id = setInterval(() => setCountdown(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [step])

  function formatCountdown(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  function handleDigitChange(i: number, val: string) {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d && i < 5) digitRefs.current[i + 1]?.focus()
  }

  function handleDigitKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus()
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = Array(6).fill('')
    pasted.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    digitRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

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

  function selectBrand(b: typeof BRANDS[number]) {
    setBrand(b.name)
    setError(null)
    if (b.name === 'Bambu Lab') setStep('connection')
    else setStep('form')
  }

  function goBack() {
    setError(null)
    if (step === 'brand')           navigate('/printers')
    else if (step === 'connection') setStep('brand')
    else if (step === 'login')      setStep('connection')
    else if (step === 'verify')     setStep('login')
    else if (step === 'cloud_select') { setCountdown(300); setDigits(Array(6).fill('')); setStep('verify') }
    else if (step === 'lan_scan')   setStep('connection')
    else if (step === 'lan_form')   setStep('lan_scan')
    else if (step === 'form')       setStep('brand')
  }

  function selectConnection(type: 'lan' | 'cloud') {
    setError(null)
    if (type === 'lan') {
      setDiscovered([])
      setScanDone(false)
      setStep('lan_scan')
      startScan()
    } else {
      setStep('login')
    }
  }

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

  function selectDiscoveredPrinter(p: LanDiscoveredPrinter) {
    setIp(p.ipAddress)
    setSerialNumber(p.serialNumber)
    const next = Array(8).fill('')
    ;(p.accessCode ?? '').split('').forEach((c, i) => { if (i < 8) next[i] = c })
    setCodeDigits(next)
    setName(p.name.includes(p.ipAddress) ? `Bambu ${p.model}` : p.name)
    setModel(p.model)
    setFromDiscovery(true)
    setStep('lan_form')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await printersApi.registerCloud({ brand, email, password })
      if (result.requiresVerification) {
        setCountdown(300)
        setDigits(Array(6).fill(''))
        setStep('verify')
      } else if (result.availablePrinters && result.availablePrinters.length > 0) {
        setCloudPrinters(result.availablePrinters)
        setStep('cloud_select')
      } else {
        navigate('/printers')
      }
    } catch {
      setError(t('addPrinter.signInError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const printers = await printersApi.verifyCloud({ code: digits.join('') })
      if (printers.length > 0) {
        setCloudPrinters(printers)
        setStep('cloud_select')
      } else {
        navigate('/printers')
      }
    } catch {
      setError(t('addPrinter.verifyError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCloudPrinterTap(serial: string) {
    setAddingSerial(serial)
    setError(null)
    setConnectingMessage(t('addPrinter.connectingCloud'))
    setStep('connecting')
    try {
      await printersApi.selectCloud([serial])
      setStep('success')
    } catch {
      setError(t('addPrinter.addError'))
      setAddingSerial(null)
      setStep('cloud_select')
    }
  }

  async function handleLanSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const sn = serialNumber.trim()
    const resolvedName = name.trim() || (sn ? `Bambu Lab ${sn.slice(-6)}` : 'Bambu Lab Printer')
    const resolvedModel = model.trim() || 'Bambu Lab Printer'
    const accessCode = codeDigits.join('').trim()
    setConnectingMessage(t('addPrinter.connectingLan'))
    setStep('connecting')
    try {
      await printersApi.registerLan({
        name:         resolvedName,
        brand:        'Bambu Lab',
        model:        resolvedModel,
        ipAddress:    ip.trim(),
        serialNumber: sn || null,
        accessCode:   accessCode || null,
      })
      setStep('success')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? t('addPrinter.addError'))
      setStep('lan_form')
    }
  }

  async function handleGenericLanSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setConnectingMessage(t('addPrinter.connectingLan'))
    setStep('connecting')
    try {
      await printersApi.registerLan({
        name:      name.trim(),
        brand:     brand.trim(),
        model:     model.trim(),
        ipAddress: ip.trim(),
        port:      port ? parseInt(port, 10) : null,
        hasAms,
      })
      setStep('success')
    } catch {
      setError(t('addPrinter.addError'))
      setStep('form')
    }
  }

  const selectedBrand = BRANDS.find(b => b.name === brand)

  function backLabel() {
    if (step === 'brand')         return t('addPrinter.backPrinters')
    if (step === 'connection')    return t('addPrinter.backChooseBrand')
    if (step === 'login')         return t('addPrinter.backConnection')
    if (step === 'verify')        return t('addPrinter.backSignIn')
    if (step === 'cloud_select')  return t('addPrinter.backVerify')
    if (step === 'lan_scan')      return t('addPrinter.backConnection')
    if (step === 'lan_form')      return t('addPrinter.backScan')
    return t('addPrinter.backChooseBrand')
  }

  function pageTitle() {
    if (step === 'brand')         return t('addPrinter.stepTitleBrand')
    if (step === 'connection')    return t('addPrinter.stepTitleConnection')
    if (step === 'login')         return t('addPrinter.stepTitleLogin')
    if (step === 'verify')        return t('addPrinter.stepTitleVerify')
    if (step === 'cloud_select')  return t('addPrinter.stepTitleCloudSelect')
    if (step === 'lan_scan')      return t('addPrinter.stepTitleScan')
    if (step === 'lan_form')      return t('addPrinter.stepTitleLan')
    return t('addPrinter.stepTitleForm', { brand })
  }

  function pageSubtitle() {
    if (step === 'brand')         return t('addPrinter.stepSubtitleBrand')
    if (step === 'connection')    return t('addPrinter.stepSubtitleConnection')
    if (step === 'login')         return t('addPrinter.stepSubtitleLogin')
    if (step === 'verify')        return t('addPrinter.stepSubtitleVerify', { email })
    if (step === 'cloud_select')  return t('addPrinter.stepSubtitleCloudSelect')
    if (step === 'lan_scan')      return t('addPrinter.stepSubtitleScan')
    if (step === 'lan_form')      return t('addPrinter.stepSubtitleLan')
    return t('addPrinter.stepSubtitleForm')
  }

  return (
    <div className={styles.wrap}>

      {/* ── Nav: back + close ── */}
      {step !== 'connecting' && step !== 'success' && (
        <div className={styles.navRow}>
          {step === 'brand'
            ? <span />
            : (
              <button onClick={goBack} className={styles.backBtn}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                {backLabel()}
              </button>
            )}
          <Link to="/printers" className={styles.closeBtn} aria-label={t('common.cancel')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </Link>
        </div>
      )}

      {/* ── Header ── */}
      {step !== 'login' && step !== 'verify' && step !== 'connecting' && step !== 'success' && (
        <div>
          <h1 className={styles.pageTitle}>{pageTitle()}</h1>
          <p className={styles.pageSubtitle}>{pageSubtitle()}</p>
        </div>
      )}

      {/* ── Connecting ── */}
      {step === 'connecting' && (
        <div className={styles.scanProgress}>
          <svg className={`w-8 h-8 ${styles.scanSpinner}`} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className={styles.scanLabel}>{connectingMessage}</p>
        </div>
      )}

      {/* ── Success ── */}
      {step === 'success' && (
        <div className={styles.successCard}>
          <div className={styles.successCheck}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className={styles.successTitle}>{t('addPrinter.connectedTitle')}</h2>
          <p className={styles.successDesc}>{t('addPrinter.connectedDesc')}</p>
          <button onClick={() => navigate('/printers')} className={styles.btnSubmit}>{t('addPrinter.done')}</button>
        </div>
      )}

      {/* ── Step 1: Brand picker ── */}
      {step === 'brand' && (
        <div className={styles.brandGrid}>
          {BRANDS.map(b => (
            <button
              key={b.name}
              onClick={() => b.available && selectBrand(b)}
              disabled={!b.available}
              className={styles.brandCard}
            >
              {!b.available && (
                <span className={styles.soonBadge}>{t('addPrinter.soon')}</span>
              )}
              <div className={b.available ? styles.brandLogo : `${styles.brandLogo} ${styles.brandLogoDisabled}`}>
                {b.icon}
              </div>
              <div>
                <p className={b.available ? styles.brandName : `${styles.brandName} ${styles.brandNameDisabled}`}>{b.name}</p>
                <p className={styles.brandDesc}>{b.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: Connection type ── */}
      {step === 'connection' && (
        <div className={styles.connectionGrid}>
          <button onClick={() => selectConnection('lan')} className={styles.connectionCard}>
            <div className={styles.connectionIcon}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                <line x1="6" y1="6" x2="6.01" y2="6"/>
                <line x1="6" y1="18" x2="6.01" y2="18"/>
              </svg>
            </div>
            <div>
              <p className={styles.connectionTitle}>{t('addPrinter.connectionLan')}</p>
              <p className={styles.connectionDesc}>{t('addPrinter.connectionLanDesc')}</p>
            </div>
          </button>

          <button onClick={() => selectConnection('cloud')} className={styles.connectionCard}>
            <div className={styles.connectionIcon}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
              </svg>
            </div>
            <div>
              <p className={styles.connectionTitle}>{t('addPrinter.connectionCloud')}</p>
              <p className={styles.connectionDesc}>{t('addPrinter.connectionCloudDesc')}</p>
            </div>
          </button>
        </div>
      )}

      {/* ── Step 3a: LAN scan ── */}
      {step === 'lan_scan' && (
        <div className={styles.scanWrap}>
          {scanning && (
            <div className={styles.scanProgress}>
              <svg className={`w-8 h-8 ${styles.scanSpinner}`} viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <div>
                <p className={styles.scanLabel}>Scanning your network…</p>
                <p className={styles.scanDesc}>Broadcasting discovery probe and listening for responses…</p>
              </div>
            </div>
          )}

          {scanDone && (
            <>
              {discovered.length > 0 ? (
                <div className={styles.scanResultsList}>
                  <p className={styles.scanResultsHeader}>
                    {discovered.length} printer{discovered.length > 1 ? 's' : ''} found — tap to select
                  </p>
                  {discovered.map(p => (
                    <button key={p.serialNumber} onClick={() => selectDiscoveredPrinter(p)} className={styles.printerBtn}>
                      <div className={styles.printerBtnIcon}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                          <line x1="6" y1="6" x2="6.01" y2="6"/>
                          <line x1="6" y1="18" x2="6.01" y2="18"/>
                        </svg>
                      </div>
                      <div className={styles.printerBtnInfo}>
                        <p className={styles.printerBtnName}>{p.name}</p>
                        <p className={styles.printerBtnModel}>{p.model}</p>
                        <p className={styles.printerBtnMeta}>{p.ipAddress}{p.serialNumber ? ` · ${p.serialNumber.slice(-6)}` : ''}</p>
                      </div>
                      <svg className={`w-5 h-5 ${styles.printerBtnChevron}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.scanEmpty}>
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className={styles.scanEmptyTitle}>No printers found</p>
                  <p className={styles.scanEmptyDesc}>Make sure your printer is on and connected to the same network</p>
                </div>
              )}

              <div className={styles.scanActions}>
                <button onClick={startScan} className={styles.btnScan}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  Scan again
                </button>
                <button
                  onClick={() => { setName(''); setModel(''); setCodeDigits(Array(8).fill('')); setFromDiscovery(false); setStep('lan_form') }}
                  className={styles.btnManual}
                >
                  Enter manually
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3b: Bambu LAN form ── */}
      {step === 'lan_form' && (
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardLogo}>
              <img src="https://www.google.com/s2/favicons?sz=64&domain=bambulab.com" alt="Bambu Lab" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className={styles.formCardSubtitle}>Bambu Lab · LAN</p>
              <p className={styles.formCardDesc}>{t('addPrinter.stepSubtitleLan')}</p>
            </div>
          </div>

          <form onSubmit={handleLanSubmit} className={styles.formBody}>
            {fromDiscovery ? (
              <>
                <div className={styles.discoverInfo}>
                  <svg className={`w-4 h-4 flex-shrink-0 ${styles.discoverIcon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 13.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 2.84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 10.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 17.92z"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className={styles.discoverInfoTop}>Printer found · {model}</p>
                    <p className={styles.discoverInfoMeta}>{ip}{serialNumber ? ` · ${serialNumber.slice(-6)}` : ''}</p>
                  </div>
                </div>

                <div>
                  <label className={styles.fieldLabel}>{t('addPrinter.labelAccessCode')}</label>
                  <div className={styles.codeGrid}>
                    {codeDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { codeRefs.current[i] = el }}
                        type="text" maxLength={1} autoComplete="one-time-code"
                        value={d}
                        onChange={e => handleCodeChange(i, e.target.value)}
                        onKeyDown={e => handleCodeKeyDown(i, e)}
                        onPaste={i === 0 ? handleCodePaste : undefined}
                        autoFocus={i === 0}
                        className={styles.codeDigit}
                      />
                    ))}
                  </div>
                  <p className={styles.fieldHint}>{t('addPrinter.accessCodeHint')}</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={styles.fieldLabel}>{t('addPrinter.labelIpAddress')}</label>
                  <input
                    type="text" value={ip} onChange={e => setIp(e.target.value)}
                    placeholder="192.168.1.100" required autoFocus
                    className={`${styles.input} ${styles.inputMono}`}
                  />
                </div>

                <div>
                  <label className={styles.fieldLabel}>{t('addPrinter.labelSerialNumber')}</label>
                  <input
                    type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)}
                    placeholder="01S00C123456789"
                    className={`${styles.input} ${styles.inputMono}`}
                  />
                  <p className={styles.fieldHint}>Optional — auto-discovered on first MQTT connect if blank</p>
                </div>

                <div>
                  <label className={styles.fieldLabel}>{t('addPrinter.labelAccessCode')}</label>
                  <div className={styles.codeGrid}>
                    {codeDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { codeRefs.current[i] = el }}
                        type="text" maxLength={1} autoComplete="one-time-code"
                        value={d}
                        onChange={e => handleCodeChange(i, e.target.value)}
                        onKeyDown={e => handleCodeKeyDown(i, e)}
                        onPaste={i === 0 ? handleCodePaste : undefined}
                        className={styles.codeDigit}
                      />
                    ))}
                  </div>
                  <p className={styles.fieldHint}>{t('addPrinter.accessCodeHint')}</p>
                </div>
              </>
            )}

            {error && <p className={styles.errorBox}>{error}</p>}

            <div className={styles.formActions}>
              <Link to="/printers" className={styles.btnCancel}>{t('common.cancel')}</Link>
              <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                {submitting ? t('addPrinter.adding') : t('addPrinter.addPrinter')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 3c: Bambu Cloud login ── */}
      {step === 'login' && (
        <div className={styles.formCard}>
          <form onSubmit={handleLogin} className={styles.formBody}>
            <div className={styles.loginHero}>
              <div className={styles.loginLogoWrap}>
                <img src="https://www.google.com/s2/favicons?sz=64&domain=bambulab.com" alt="Bambu Lab" className="w-8 h-8 object-contain" />
              </div>
              <p className={styles.loginTitle}>{t('addPrinter.bambuAccount')}</p>
              <p className={styles.loginSubtitle}>{t('addPrinter.bambuSignInDesc')}</p>
            </div>
            <div>
              <label className={styles.fieldLabel}>{t('addPrinter.labelEmail')}</label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus autoComplete="email"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                />
              </div>
            </div>
            <div>
              <label className={styles.fieldLabel}>{t('addPrinter.labelPassword')}</label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className={styles.passwordToggle} tabIndex={-1}>
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className={styles.errorBox}>{error}</p>}

            <div className={styles.securityNotice}>
              <svg className={styles.securityIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <p className={styles.securityText}>{t('addPrinter.credentialsNotice')}</p>
            </div>

            <div className={styles.formActions}>
              <Link to="/printers" className={styles.btnCancel}>{t('common.cancel')}</Link>
              <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                {submitting ? t('addPrinter.signingIn') : t('addPrinter.signIn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 4: Verification code ── */}
      {step === 'verify' && (
        <div className={styles.verifyCard}>
          <div className={styles.verifyHero}>
            <p className={styles.verifyTitle}>{t('addPrinter.verifyTitle')}</p>
            <p className={styles.verifySubtitle}>
              {t('addPrinter.verifySubtitle')} <span className={styles.verifyEmail}>{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className={styles.verifyBody}>
            <div className={styles.otpRow}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { digitRefs.current[i] = el }}
                  type="text" inputMode="numeric" maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(i, e)}
                  onPaste={i === 0 ? handleDigitPaste : undefined}
                  disabled={countdown === 0}
                  autoFocus={i === 0}
                  className={`${styles.otpBox} ${d ? styles.otpBoxFilled : ''} ${countdown === 0 ? styles.otpBoxExpired : ''}`}
                />
              ))}
            </div>

            <p className={`${styles.countdownText} ${countdown <= 60 ? styles.countdownTextUrgent : countdown <= 120 ? styles.countdownTextWarning : ''}`}>
              {countdown === 0 ? t('addPrinter.codeExpired') : t('addPrinter.codeExpiresIn', { time: formatCountdown(countdown) })}
            </p>

            {countdown === 0 && <p className={styles.expiredBox}>{t('addPrinter.codeExpiredRetry')}</p>}
            {error && <p className={styles.errorBox}>{error}</p>}

            <button
              type="submit"
              disabled={submitting || digits.join('').length < 6 || countdown === 0}
              className={styles.btnVerify}
            >
              {submitting ? t('addPrinter.verifying') : t('addPrinter.verify')}
            </button>

            <p className={styles.resendRow}>
              {t('addPrinter.didntGetCode')}{' '}
              <button type="button" onClick={() => setStep('login')} className={styles.resendLink}>
                {t('addPrinter.goBackSignIn')}
              </button>
            </p>
          </form>
        </div>
      )}

      {/* ── Step 5: Cloud printer selection ── */}
      {step === 'cloud_select' && (
        <div className={styles.cloudList}>
          {cloudPrinters.length > 0 ? (
            <>
              <p className={styles.cloudListHeader}>
                {cloudPrinters.length} printer{cloudPrinters.length > 1 ? 's' : ''} found — tap to add
              </p>
              {cloudPrinters.map(p => {
                const isAdding = addingSerial === p.serialNumber
                if (p.alreadyAdded) {
                  return (
                    <div key={p.serialNumber} className={styles.cloudPrinterAdded}>
                      <div className={styles.cloudPrinterIconDim}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                        </svg>
                      </div>
                      <div className={styles.cloudPrinterInfo}>
                        <p className={styles.cloudPrinterNameDim}>{p.name}</p>
                        <p className={styles.cloudPrinterModel}>{p.model}</p>
                        <p className={styles.cloudPrinterSerial}>{p.serialNumber.slice(-6)}</p>
                      </div>
                      <span className={styles.badgeAdded}>Already added</span>
                    </div>
                  )
                }
                return (
                  <button
                    type="button"
                    key={p.serialNumber}
                    onClick={() => handleCloudPrinterTap(p.serialNumber)}
                    disabled={addingSerial !== null}
                    className={styles.cloudPrinterBtn}
                  >
                    <div className={styles.cloudPrinterIcon}>
                      {isAdding ? (
                        <svg className={`w-5 h-5 ${styles.cloudSpinner}`} viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                        </svg>
                      )}
                    </div>
                    <div className={styles.cloudPrinterInfo}>
                      <div className={styles.cloudPrinterNameRow}>
                        <p className={styles.cloudPrinterName}>{p.name}</p>
                        <span className={p.online ? styles.badgeOnline : styles.badgeOffline}>
                          {p.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <p className={styles.cloudPrinterModel}>{p.model}</p>
                      <p className={styles.cloudPrinterSerial}>{p.serialNumber.slice(-6)}</p>
                    </div>
                    <svg className={`w-5 h-5 ${styles.cloudChevron}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                )
              })}
            </>
          ) : (
            <div className={styles.cloudEmpty}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className={styles.cloudEmptyTitle}>No printers found on this account</p>
            </div>
          )}

          {error && <p className={styles.errorBox}>{error}</p>}
        </div>
      )}

      {/* ── Step 6 (fallback): Generic LAN form ── */}
      {step === 'form' && (
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <div className={styles.formCardLogo}>
              <img src={`https://www.google.com/s2/favicons?sz=64&domain=${selectedBrand?.domain}`} alt={brand} className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className={styles.formCardSubtitle}>{t('addPrinter.selectedBrand')}</p>
              <p className={styles.formCardTitle}>{brand}</p>
            </div>
          </div>

          <form onSubmit={handleGenericLanSubmit} className={styles.formBody}>
            <div className={styles.grid2}>
              <div>
                <label className={styles.fieldLabel}>{t('addPrinter.labelName')}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Workshop Printer" required autoFocus className={styles.input} />
              </div>
              <div>
                <label className={styles.fieldLabel}>{t('addPrinter.labelModel')}</label>
                <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="MK4" required className={styles.input} />
              </div>
            </div>

            <div className={styles.grid3}>
              <div>
                <label className={styles.fieldLabel}>{t('addPrinter.labelIpAddress')}</label>
                <input type="text" value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.1.100" required className={`${styles.input} ${styles.inputMono}`} />
              </div>
              <div>
                <label className={styles.fieldLabel}>{t('addPrinter.labelPort')}</label>
                <input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="8883" min={1} max={65535} className={`${styles.input} ${styles.inputMono}`} />
              </div>
            </div>

            <label className={styles.hasAmsRow}>
              <input type="checkbox" checked={hasAms} onChange={e => setHasAms(e.target.checked)} className="w-4 h-4 rounded accent-amber-400 flex-shrink-0" />
              <div>
                <span className={styles.hasAmsLabel}>{t('addPrinter.hasAms')}</span>
                <p className={styles.hasAmsDesc}>{t('addPrinter.hasAmsDesc')}</p>
              </div>
            </label>

            {error && <p className={styles.errorBox}>{error}</p>}

            <div className={styles.formActions}>
              <Link to="/printers" className={styles.btnCancel}>{t('common.cancel')}</Link>
              <button type="submit" disabled={submitting} className={styles.btnSubmit}>
                {submitting ? t('addPrinter.adding') : t('addPrinter.addPrinter')}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
