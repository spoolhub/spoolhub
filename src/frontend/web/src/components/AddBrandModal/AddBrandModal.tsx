import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { brandsApi } from '@/api/brands'
import BRAND_DOMAINS from '@/components/BrandCard/brandDomains'
import type { OfdBrandResult } from '@/types/brand'
import styles from './AddBrandModal.module.css'

function guessDomain(name: string): string {
  return BRAND_DOMAINS[name] ?? ''
}

interface AddBrandModalProps {
  existingSlugs: Set<string>
  onClose: () => void
  onAdded: (brandName: string) => void
}

export default function AddBrandModal({ existingSlugs, onClose, onAdded }: AddBrandModalProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OfdBrandResult[]>([])
  const [selected, setSelected] = useState<OfdBrandResult | null>(null)
  const [domain, setDomain] = useState('')
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const suppressSearchRef = useRef(false)

  const isDuplicate = selected !== null && existingSlugs.has(selected.slug)

  useEffect(() => {
    if (suppressSearchRef.current) { suppressSearchRef.current = false; return }
    const timeout = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return }
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setSearching(true)
      try {
        const res = await brandsApi.searchOfd(query, ctrl.signal)
        setResults(res)
      } catch {
        // aborted or network error — ignore
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSelect(r: OfdBrandResult) {
    if (existingSlugs.has(r.slug)) return
    suppressSearchRef.current = true
    setSelected(r)
    setResults([])
    setQuery(r.name)
    setDomain(guessDomain(r.name))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setError(t('addBrand.selectError')); return }
    if (isDuplicate) return
    setSubmitting(true)
    setError(null)
    try {
      await brandsApi.add({ name: selected.name, domain: domain.trim(), ofdSlug: selected.slug })
      onAdded(selected.name)
      onClose()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(status === 409
        ? t('addBrand.duplicateError')
        : t('addBrand.addError')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('filaments.addBrand')}</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldWrap}>
            <label className={styles.label}>{t('addBrand.searchLabel')}</label>
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              placeholder="e.g. Bambu Lab"
              className={styles.input}
              autoFocus
            />
            {searching && <div className={styles.spinner} />}
            {results.length > 0 && (
              <ul className={styles.dropdown} role="listbox">
                {results.map(r => {
                  const already = existingSlugs.has(r.slug)
                  return (
                    <li key={r.slug}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected?.slug === r.slug}
                        aria-disabled={already}
                        onClick={() => handleSelect(r)}
                        className={`${styles.option}${already ? ` ${styles.optionDisabled}` : ''}`}
                      >
                        <span className={styles.optionName}>{r.name}</span>
                        <span className={styles.optionMeta}>
                          {already ? t('addBrand.alreadyAdded') : t('addBrand.materialCount', { count: r.materialCount })}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {isDuplicate && (
            <p className={styles.warning} role="alert">{t('addBrand.duplicateWarning')}</p>
          )}

          {error && (
            <p className={styles.error} role="alert">{error}</p>
          )}

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnCancel}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !selected || isDuplicate}
              className={styles.btnSubmit}
            >
              {submitting ? t('addBrand.adding') : t('filaments.addBrand')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
