import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './Pagination.module.css'

interface PaginationProps {
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  perPageOptions?: number[]
  itemLabel?: string
  className?: string
}

const DEFAULT_PER_PAGE_OPTIONS = [12, 20, 32, 48, 96]

export default function Pagination({ total, page, perPage, onPageChange, onPerPageChange, perPageOptions = DEFAULT_PER_PAGE_OPTIONS, itemLabel = 'spools', className }: PaginationProps) {
  const { t } = useTranslation()
  const totalPages = Math.ceil(total / perPage)

  useEffect(() => {
    if (total > 0 && page > totalPages) onPageChange(totalPages)
  }, [total, page, totalPages, onPageChange])

  const from = Math.min((page - 1) * perPage + 1, total)
  const to   = Math.min(page * perPage, total)

  function getPages(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages]
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '…', page - 1, page, page + 1, '…', totalPages]
  }

  function getMobilePages(): (number | '…')[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 2) return [1, 2, 3, '…', totalPages]
    if (page >= totalPages - 1) return [1, '…', totalPages - 2, totalPages - 1, totalPages]
    return [1, '…', page, '…', totalPages]
  }

  function renderPages(pages: (number | '…')[]) {
    return pages.map((p, i) =>
      p === '…' ? (
        <span key={`e-${i}`} className={styles.ellipsis}>…</span>
      ) : (
        <button
          key={`${p}-${i}`}
          onClick={() => onPageChange(p as number)}
          className={`${styles.btn}${p === page ? ` ${styles.btnActive}` : ''}`}
        >
          {p}
        </button>
      )
    )
  }

  if (total === 0 || totalPages <= 1) return null

  const prevBtn = (
    <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className={styles.btn} aria-label={t('pagination.previousPage')}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )
  const nextBtn = (
    <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className={styles.btn} aria-label={t('pagination.nextPage')}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )

  return (
    <div className={`${styles.wrap}${className ? ` ${className}` : ''}`}>
      <p className={styles.info}>
        {t('pagination.showing', { from, to, total, itemLabel: t(`pagination.${itemLabel}`, itemLabel) })}
      </p>
      <div className={styles.controls}>
        <div className={styles.perPageWrap}>
          <span className={styles.perPageLabel}>{t('pagination.perPage')}</span>
          <select value={perPage} onChange={e => onPerPageChange(Number(e.target.value))} className={styles.perPageSelect}>
            {perPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {prevBtn}
        <div className={styles.pagesMobile}>{renderPages(getMobilePages())}</div>
        <div className={styles.pagesDesktop}>{renderPages(getPages())}</div>
        {nextBtn}
      </div>
    </div>
  )
}
