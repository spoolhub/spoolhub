import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './IphoneScanner.module.css'

type View = 'tap' | 'setup'

export default function IphoneScanner() {
  const { t } = useTranslation()
  const [view, setView] = useState<View>('tap')
  const [copied, setCopied] = useState(false)
  const [tagUid, setTagUid] = useState('')

  const scanUrl = tagUid.trim()
    ? `${window.location.origin}/scan?tagUid=${encodeURIComponent(tagUid.trim())}`
    : `${window.location.origin}/scan?tagUid=[NFC Tag Serial Number]`

  async function copyUrl() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(scanUrl)
      } else {
        const el = document.createElement('textarea')
        el.value = scanUrl
        el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
        document.body.appendChild(el)
        el.focus()
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.card}>
      {view === 'tap' && (
        <div className={styles.tapWrap}>
          <div className={styles.nfcWrap}>
            <div className={styles.pingRing1} />
            <div className={styles.pingRing2} />
            <div className={styles.nfcCircle}>
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <line x1="5" y1="7" x2="5" y2="17" />
                <path d="M8 9.5a4 4 0 0 1 0 5" />
                <path d="M11 8a7 7 0 0 1 0 8" />
                <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
              </svg>
            </div>
          </div>

          <div>
            <h1 className={styles.title}>{t('scan.holdNearTag')}</h1>
            <p className={styles.subtitle}>{t('scan.tapIphone')}</p>
          </div>

          <button onClick={() => setView('setup')} className={styles.btnPrimary}>{t('scan.newTag')}</button>
        </div>
      )}

      {view === 'setup' && (
        <div className={styles.setupWrap}>
          <button onClick={() => setView('tap')} className={styles.backBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('scan.back')}
          </button>

          <h2 className={styles.setupTitle}>{t('scan.registerNewTag')}</h2>

          <ol className={styles.steps}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <li key={n} className={styles.step}>
                <span className={styles.stepNum}>{n}</span>
                <span className={styles.stepText}>{t(`scan.iphoneStep${n}`)}</span>
              </li>
            ))}
          </ol>

          <div className={styles.urlBox}>
            <p className={styles.urlLabel}>{t('scan.urlToPaste')}</p>
            <input
              className={styles.uidInput}
              type="text"
              placeholder={t('scan.iphoneUidPlaceholder')}
              value={tagUid}
              onChange={e => setTagUid(e.target.value)}
            />
            <p className={styles.urlText}>{scanUrl}</p>
            {!tagUid.trim() && (
              <p className={styles.uidHint}>{t('scan.iphoneUidHint')}</p>
            )}
            <button
              onClick={copyUrl}
              disabled={!tagUid.trim()}
              className={`${styles.copyBtn}${copied ? ` ${styles.copyBtnCopied}` : ''}${!tagUid.trim() ? ` ${styles.copyBtnDisabled}` : ''}`}
            >
              {copied ? t('scan.copied') : t('scan.copyUrl')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
