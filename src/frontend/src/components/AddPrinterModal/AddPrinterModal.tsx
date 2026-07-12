import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { printersApi } from '@/api/printers'
import type { PrinterResponse } from '@/types/printer'
import styles from './AddPrinterModal.module.css'

interface Props {
  onClose: () => void
  onAdded: (printer: PrinterResponse) => void
}

export default function AddPrinterModal({ onClose, onAdded }: Props) {
  const { t } = useTranslation()
  const [name, setName]         = useState('')
  const [brand, setBrand]       = useState('Bambu Lab')
  const [model, setModel]       = useState('')
  const [ip, setIp]             = useState('')
  const [port, setPort]         = useState('')
  const [hasAms, setHasAms]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const printer = await printersApi.registerLan({
        name:      name.trim(),
        brand:     brand.trim(),
        model:     model.trim(),
        ipAddress: ip.trim(),
        port:      port ? parseInt(port, 10) : null,
        hasAms,
      })
      onAdded(printer)
    } catch {
      setError(t('addPrinter.registerError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <h2 className={styles.headerTitle}>{t('addPrinter.registerTitle')}</h2>
          <button onClick={onClose} aria-label="Close" className={styles.closeBtn}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          <div>
            <label className={styles.label}>{t('addPrinter.labelName')}</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Garage X1C" required
              className={styles.input}
            />
          </div>

          <div className={styles.row2}>
            <div>
              <label className={styles.label}>{t('filters.brand')} *</label>
              <input
                list="printer-brands" type="text"
                value={brand} onChange={e => setBrand(e.target.value)}
                placeholder="Bambu Lab" required
                className={styles.input}
              />
              <datalist id="printer-brands">
                <option value="Bambu Lab" />
                <option value="Prusa" />
                <option value="Creality" />
                <option value="AnkerMake" />
                <option value="Elegoo" />
                <option value="Flashforge" />
              </datalist>
            </div>
            <div>
              <label className={styles.label}>{t('addPrinter.labelModel')}</label>
              <input
                type="text" value={model} onChange={e => setModel(e.target.value)}
                placeholder="X1 Carbon" required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.row3}>
            <div>
              <label className={styles.label}>{t('addPrinter.labelIpAddress')}</label>
              <input
                type="text" value={ip} onChange={e => setIp(e.target.value)}
                placeholder="192.168.1.100" required
                className={`${styles.input} ${styles.inputMono}`}
              />
            </div>
            <div>
              <label className={styles.label}>{t('addPrinter.labelPort')}</label>
              <input
                type="number" value={port} onChange={e => setPort(e.target.value)}
                placeholder="1883" min={1} max={65535}
                className={`${styles.input} ${styles.inputMono}`}
              />
            </div>
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox" checked={hasAms} onChange={e => setHasAms(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-400"
            />
            <div>
              <span className={styles.checkLabel}>{t('addPrinter.hasAms')}</span>
              <p className={styles.checkDesc}>{t('addPrinter.hasAmsDescShort')}</p>
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.btnSecondary}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={submitting} className={styles.btnPrimary}>
              {submitting ? t('addPrinter.registering') : t('addPrinter.register')}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
