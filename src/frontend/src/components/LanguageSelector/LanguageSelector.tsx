import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import 'flag-icons/css/flag-icons.min.css'
import styles from './LanguageSelector.module.css'

const LANGUAGES = [
  { code: 'en', flag: 'gb', label: 'English' },
  { code: 'es', flag: 'es', label: 'Spanish' },
  { code: 'sv', flag: 'se', label: 'Swedish' },
]

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0]

  function handleSelect(lang: typeof LANGUAGES[number]) {
    i18n.changeLanguage(lang.code)
    localStorage.setItem('language', lang.code)
    setOpen(false)
  }

  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={styles.wrap}>
      <button onClick={() => setOpen(o => !o)} className={styles.trigger} aria-label="Select language">
        <span className={`fi fi-${selected.flag} rounded-sm ${styles.flagIcon}`} />
        <span className={styles.label}>{selected.label}</span>
        <svg className={`${styles.chevron}${open ? ` ${styles.chevronOpen}` : ''}`} viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang)}
              className={`${styles.option}${selected.code === lang.code ? ` ${styles.optionActive}` : ''}`}
            >
              <span className={`fi fi-${lang.flag} rounded-sm flex-shrink-0 ${styles.flagIcon}`} />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
