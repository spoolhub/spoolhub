import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { printersApi } from '@/api/printers'
import type { PrinterResponse } from '@/types/printer'

interface Props {
  onClose: () => void
  onAdded: (printer: PrinterResponse) => void
}

const inputClass =
  'w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow'

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
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{t('addPrinter.registerTitle')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              {t('addPrinter.labelName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Garage X1C"
              required
              className={inputClass}
            />
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                {t('filters.brand')} *
              </label>
              <input
                list="printer-brands"
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Bambu Lab"
                required
                className={inputClass}
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
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                {t('addPrinter.labelModel')}
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="X1 Carbon"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* IP + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                {t('addPrinter.labelIpAddress')}
              </label>
              <input
                type="text"
                value={ip}
                onChange={e => setIp(e.target.value)}
                placeholder="192.168.1.100"
                required
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                {t('addPrinter.labelPort')}
              </label>
              <input
                type="number"
                value={port}
                onChange={e => setPort(e.target.value)}
                placeholder="1883"
                min={1}
                max={65535}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Has AMS */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAms}
              onChange={e => setHasAms(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-400"
            />
            <div>
              <span className="text-sm font-semibold text-[var(--text-secondary)]">{t('addPrinter.hasAms')}</span>
              <p className="text-xs text-[var(--text-secondary)]">{t('addPrinter.hasAmsDescShort')}</p>
            </div>
          </label>

          {/* Error */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-50 transition-colors"
            >
              {submitting ? t('addPrinter.registering') : t('addPrinter.register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
