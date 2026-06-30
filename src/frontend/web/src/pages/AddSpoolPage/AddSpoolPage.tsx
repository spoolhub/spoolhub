import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AddSpoolForm from '@/components/AddSpoolForm'
import ScanView from '@/components/ScanView'
import SpoolCard from '@/components/SpoolCard'
import { scanTag, registerTag } from '@/api/nfc'
import { spoolsApi } from '@/api/spools'
import type { SpoolResponse } from '@/types/spool'
import styles from './AddSpoolPage.module.css'

function IosNfcWriter({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const writeUrl = `${window.location.origin}/spools/add/nfctag?tagUid=[NFC Tag Identifier]`

  async function copyUrl() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(writeUrl)
      } else {
        const el = document.createElement('textarea')
        el.value = writeUrl
        el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
        document.body.appendChild(el)
        el.focus(); el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.backRow}>
        <button onClick={onBack} className={styles.backBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {t('addSpool.backToAddSpool')}
        </button>
      </div>

      <div className={styles.iosNfcMaxW}>
        <div className={styles.iosNfcCard}>
          <div className={styles.iosNfcHeader}>
            <div className={styles.iosNfcIconBg}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="7" x2="5" y2="17" />
                <path d="M8 9.5a4 4 0 0 1 0 5" />
                <path d="M11 8a7 7 0 0 1 0 8" />
                <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
              </svg>
            </div>
            <div>
              <p className={styles.iosNfcHeaderTitle}>{t('addSpool.registerNfcTag')}</p>
              <p className={styles.iosNfcHeaderDesc}>{t('addSpool.nfcTagSetupSubtitle')}</p>
            </div>
          </div>

          <div className={styles.iosNfcSection}>
            <p className={styles.iosNfcSectionLabel}>{t('addSpool.howToSetUp')}</p>
            <ol className={styles.iosNfcSteps}>
              {[1, 2, 3, 4].map(n => (
                <li key={n} className={styles.iosNfcStep}>
                  <span className={styles.iosNfcStepNum}>{n}</span>
                  <p className={styles.iosNfcStepText}>{t(`addSpool.iosStep${n}`)}</p>
                </li>
              ))}
              <li className={styles.iosNfcStep}>
                <span className={styles.iosNfcStepComplete}>✓</span>
                <p className={styles.iosNfcStepText}>{t('addSpool.iosStep5')}</p>
              </li>
            </ol>
          </div>

          <div className={styles.iosNfcUrlSection}>
            <p className={styles.iosNfcUrlLabel}>{t('scan.urlToPaste')}</p>
            <div className={styles.iosNfcUrlBox}>
              <p className={styles.iosNfcUrlText}>{writeUrl}</p>
            </div>
            <button
              onClick={copyUrl}
              className={`${styles.iosNfcCopyBtn}${copied ? ` ${styles.iosNfcCopyBtnCopied}` : ''}`}
            >
              {copied ? t('scan.copied') : t('scan.copyUrl')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type Platform = 'web-nfc' | 'ios' | 'android-no-nfc' | 'desktop'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if ('NDEFReader' in window) return 'web-nfc'
  if (/iPhone|iPad/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android-no-nfc'
  return 'desktop'
}

export default function AddSpoolPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()

  const isNfc    = pathname === '/spools/add/nfctag'
  const isManual = pathname === '/spools/add/manual'
  const tagUidParam = isNfc ? (searchParams.get('tagUid') ?? '') : ''

  const [capturedUid, setCapturedUid] = useState('')
  const [lookingUp, setLookingUp] = useState(!!tagUidParam)
  const [noNfcSpools, setNoNfcSpools] = useState<SpoolResponse[]>([])
  const [filamentSectionVisible, setFilamentSectionVisible] = useState(false)
  const [manualEditorVisible, setManualEditorVisible] = useState(false)
  const platform = detectPlatform()

  useEffect(() => {
    const uid = tagUidParam || capturedUid
    if (!uid) return
    spoolsApi.getAll()
      .then(data => setNoNfcSpools(data.filter(s => !s.hasNfcTag && !s.isArchived)))
      .catch(() => {})
  }, [tagUidParam, capturedUid])

  const nfcLabels: Record<Platform, string> = {
    'web-nfc':        t('addSpool.nfcLabelWebNfc'),
    'ios':            t('addSpool.nfcLabelIos'),
    'android-no-nfc': t('addSpool.nfcLabelAndroid'),
    'desktop':        t('addSpool.nfcLabelDesktop'),
  }
  const nfcHints: Record<Platform, string> = {
    'web-nfc':        t('addSpool.nfcHintWebNfc'),
    'ios':            t('addSpool.nfcHintIos'),
    'android-no-nfc': t('addSpool.nfcHintAndroid'),
    'desktop':        t('addSpool.nfcHintDesktop'),
  }
  const nfcBadges: Partial<Record<Platform, string>> = {
    'android-no-nfc': t('addSpool.requiresChrome'),
  }

  useEffect(() => {
    if (!tagUidParam) return
    scanTag(tagUidParam)
      .then(result => {
        if (result.status === 'found' && result.spool) {
          navigate(`/spools/${result.spool.id}`, { replace: true })
        } else {
          setLookingUp(false)
        }
      })
      .catch(() => setLookingUp(false))
  }, [tagUidParam]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isNfc && !isManual) {
    return (
      <div className={styles.wrap}>
        <div className={styles.headingRow}>
          <button
            onClick={() => navigate(-1)}
            className={styles.backBtnIcon}
            aria-label={t('common.back')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className={styles.headingTitle}>{t('addSpool.title')}</h1>
        </div>

        <div className={styles.choiceGrid}>
          <button onClick={() => navigate('/spools/add/nfctag')} className={styles.choiceCardNfc}>
            <div className={styles.choiceIconNfc}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="7" x2="5" y2="17" />
                <path d="M8 9.5a4 4 0 0 1 0 5" />
                <path d="M11 8a7 7 0 0 1 0 8" />
                <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
              </svg>
            </div>
            <div className={styles.choiceLabel}>
              <div className={styles.choiceLabelRow}>
                <p className={styles.choiceTitleNfc}>{nfcLabels[platform]}</p>
                {nfcBadges[platform] && <span className={styles.choiceBadge}>{nfcBadges[platform]}</span>}
              </div>
              <p className={styles.choiceDesc}>{nfcHints[platform]}</p>
            </div>
          </button>

          <button onClick={() => navigate('/spools/add/manual')} className={styles.choiceCardManual}>
            <div className={styles.choiceIconManual}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div className={styles.choiceLabel}>
              <p className={styles.choiceTitleManual}>{t('addSpool.manual')}</p>
              <p className={styles.choiceDesc}>{t('addSpool.manualDesc')}</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  if (isManual) {
    return (
      <div className={styles.wrap}>
        {!manualEditorVisible && (
          <div className={styles.backRowSmall}>
            <button onClick={() => navigate('/spools/add')} className={styles.backBtn}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              {t('addSpool.backToAddSpool')}
            </button>
          </div>
        )}
        <div className={styles.formWrap}>
          <AddSpoolForm onSpoolEditorVisible={setManualEditorVisible} />
        </div>
      </div>
    )
  }

  const activeUid = tagUidParam || capturedUid

  if (lookingUp) {
    return (
      <div className={styles.lookingUpWrap}>
        <div className={styles.spinnerRing} />
        <p className={styles.lookingUpLabel}>{t('scan.lookingUp')}</p>
      </div>
    )
  }

  if (activeUid) {
    return (
      <div className={styles.wrap}>
        <div className={styles.backRowSmall}>
          <button onClick={() => tagUidParam ? navigate('/spools/add') : setCapturedUid('')} className={styles.backBtn}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            {t('addSpool.backToAddSpool')}
          </button>
        </div>

        <div className={styles.formWrap}>
          <AddSpoolForm
            tagUid={activeUid}
            tagUidLocked
            onFilamentSectionVisible={setFilamentSectionVisible}
          />
        </div>

        {!filamentSectionVisible && noNfcSpools.length > 0 && (
          <div className={styles.unassignedSection}>
            <p className={styles.unassignedTitle}>{t('addSpool.unassignTagTitle')}</p>
            <p className={styles.unassignedDesc}>{t('addSpool.unassignTagDesc')}</p>
            <div className={styles.unassignedGrid}>
              {noNfcSpools.map(spool => (
                <div key={spool.id} className={styles.spoolCardWrap}>
                  <SpoolCard spool={spool} onClick={async () => {
                    try {
                      await registerTag(activeUid, spool.id)
                      navigate(`/spools/${spool.id}`)
                    } catch {
                      // stay on page if error
                    }
                  }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (platform === 'ios') {
    return <IosNfcWriter onBack={() => navigate('/spools/add')} />
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.backRowSmall}>
        <button onClick={() => navigate('/spools/add')} className={styles.backBtn}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {t('addSpool.backToAddSpool')}
        </button>
      </div>
      <ScanView onUnknownTag={uid => setCapturedUid(uid)} />
    </div>
  )
}
