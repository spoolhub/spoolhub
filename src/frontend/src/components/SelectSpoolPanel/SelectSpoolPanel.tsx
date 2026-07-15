import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SpoolIcon } from '@/components/icons'
import SpoolCard from '@/components/SpoolCard'
import Pagination from '@/components/Pagination'
import NotificationBell from '@/components/NotificationBell'
import type { SpoolResponse } from '@/types/spool'
import type { PrinterResponse } from '@/types/printer'
import {
  buildSelectSpoolAddUrl,
  filterSpoolsForTraySelect,
  selectTrayHintLabel,
  trayContextForSlot,
} from '@/utils/selectSpoolFilter'
import styles from './SelectSpoolPanel.module.css'

export interface SelectSpoolPanelProps {
  printer: PrinterResponse
  spools: SpoolResponse[]
  amsSlot: number | null
  loading?: boolean
  assigning?: boolean
  error?: string | null
  onSelect: (spool: SpoolResponse) => void
  onBack?: () => void
  variant?: 'page' | 'drawer'
}

export default function SelectSpoolPanel({
  printer,
  spools,
  amsSlot,
  loading = false,
  assigning = false,
  error = null,
  onSelect,
  onBack,
  variant = 'page',
}: SelectSpoolPanelProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(variant === 'drawer' ? 8 : 20)

  const { trayHint, traySpool } = trayContextForSlot(printer, amsSlot)
  const trayLabel = trayHint ? selectTrayHintLabel(trayHint, printer.brand, spools, traySpool) : ''
  const addSpoolUrl = buildSelectSpoolAddUrl(printer, amsSlot)

  const filtered = useMemo(
    () => filterSpoolsForTraySelect(spools, trayHint, ''),
    [spools, trayHint],
  )
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const title = amsSlot != null
    ? t('selectSpool.titleWithSlot', { slot: amsSlot })
    : t('selectSpool.title')

  const hasMatches = !loading && filtered.length > 0

  return (
    <div className={`${styles.root} ${variant === 'page' ? styles.rootPage : ''}`}>
      {variant === 'page' && (
        <header className={styles.topbar}>
          <button type="button" onClick={onBack} className={styles.backBtn} aria-label={t('selectSpool.back')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className={styles.h}>
            <h1>{title}</h1>
            {trayHint?.material && (
              <div className={styles.sub}>
                {t('selectSpool.printerReports', { filament: trayLabel })}
              </div>
            )}
          </div>
          <NotificationBell variant="bordered" />
        </header>
      )}

      {variant === 'drawer' && trayHint?.material && (
        <p className={styles.drawerSub}>
          {t('selectSpool.printerReports', { filament: trayLabel })}
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <div className={`${styles.spoolGrid} ${variant === 'drawer' ? styles.spoolGridDrawer : ''}`}>
          {[1, 2].map(i => (
            <div key={i} className={`${styles.skeleton} ${variant === 'drawer' ? styles.skeletonDrawer : ''}`} />
          ))}
        </div>
      ) : hasMatches ? (
        <>
          <div className={`${styles.spoolGrid} ${variant === 'drawer' ? styles.spoolGridDrawer : ''} ${assigning ? styles.cardDisabled : ''}`}>
            {paginated.map(spool => (
              <SpoolCard key={spool.id} spool={spool} onClick={() => onSelect(spool)} />
            ))}
          </div>
          {filtered.length > perPage && (
            <Pagination
              total={filtered.length}
              page={page}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={p => { setPerPage(p); setPage(1) }}
              itemLabel="spools"
              className={styles.pagination}
            />
          )}
        </>
      ) : (
        <div className={styles.emptyActions}>
          <p className={styles.emptyText}>
            {trayHint?.material
              ? t('selectSpool.noMatchTray', { filament: trayLabel })
              : t('selectSpool.noAvailable')}
          </p>
          {addSpoolUrl && trayHint?.material ? (
            <Link to={addSpoolUrl} className={styles.addCta}>
              <SpoolIcon color={trayHint.colorHex ?? '#888888'} size={28} />
              {t('selectSpool.addThisSpool', { filament: trayLabel })}
            </Link>
          ) : addSpoolUrl ? (
            <Link to={addSpoolUrl} className={styles.addCta}>
              <SpoolIcon color="#888888" size={28} />
              {t('nav.addSpool')}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
