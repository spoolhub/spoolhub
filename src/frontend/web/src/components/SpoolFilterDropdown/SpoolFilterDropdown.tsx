import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { SpoolFilters, StockLevel, ColorOption } from '@/types/spoolFilters'
import { DEFAULT_FILTERS } from '@/types/spoolFilters'
import styles from './SpoolFilterDropdown.module.css'

interface SpoolFilterDropdownProps {
  allMaterials: string[]
  allBrands: string[]
  allColors: ColorOption[]
  filters: SpoolFilters
  onChange: (filters: SpoolFilters) => void
}

const STOCK_LEVEL_KEYS: { key: StockLevel; tKey: string; color: string }[] = [
  { key: 'full',     tKey: 'filters.full',     color: '#22c55e' },
  { key: 'good',     tKey: 'filters.good',     color: '#34d399' },
  { key: 'low',      tKey: 'filters.low',      color: '#facc15' },
  { key: 'critical', tKey: 'filters.critical', color: '#ef4444' },
]

export default function SpoolFilterDropdown({
  allMaterials,
  allBrands,
  allColors,
  filters,
  onChange,
}: SpoolFilterDropdownProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeCount =
    filters.materials.length +
    filters.brands.length +
    filters.stockLevels.length +
    filters.colors.length +
    (filters.activeOnly ? 1 : 0) +
    (filters.lowStockOnly ? 1 : 0) +
    (filters.archivedOnly ? 1 : 0) +
    (filters.neverScanned ? 1 : 0)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
  }

  function toggleFlag(key: keyof SpoolFilters) {
    onChange({ ...filters, [key]: !filters[key] })
  }

  return (
    <div ref={ref} className={styles.wrap}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`${styles.trigger}${activeCount > 0 ? ` ${styles.triggerActive}` : ''}`}
        aria-label={t('filters.filterSpools')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {activeCount > 0 && <span className={styles.triggerBadge}>{activeCount}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownHeaderLabel}>{t('filters.header')}</span>
            {activeCount > 0 && (
              <button onClick={() => onChange({ ...DEFAULT_FILTERS })} className={styles.clearBtn}>
                {t('filters.clearAll')}
              </button>
            )}
          </div>

          <div className={styles.scroll}>
            <div className={styles.section}>
              <p className={styles.sectionLabel}>{t('filters.status')}</p>
              {(['activeOnly', 'lowStockOnly', 'archivedOnly', 'neverScanned'] as const).map(key => (
                <label key={key} className={styles.flagRow}>
                  <input type="checkbox" checked={!!filters[key]} onChange={() => toggleFlag(key)} className={styles.checkbox} />
                  <span className={styles.flagRowLabel}>{t(`filters.${key}`)}</span>
                </label>
              ))}
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>{t('filters.stockLevel')}</p>
              {STOCK_LEVEL_KEYS.map(({ key, tKey, color }) => (
                <label key={key} className={styles.stockRow}>
                  <input
                    type="checkbox"
                    checked={filters.stockLevels.includes(key)}
                    onChange={() => onChange({ ...filters, stockLevels: toggleItem(filters.stockLevels, key) })}
                    className={styles.checkbox}
                  />
                  <span className={styles.stockDot} style={{ backgroundColor: color }} />
                  <span className={styles.stockLabel}>{t(tKey)}</span>
                </label>
              ))}
            </div>

            {allMaterials.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionLabel}>{t('filters.material')}</p>
                <div className={styles.pillGroup}>
                  {allMaterials.map(mat => (
                    <button
                      key={mat}
                      onClick={() => onChange({ ...filters, materials: toggleItem(filters.materials, mat) })}
                      className={`${styles.pill}${filters.materials.includes(mat) ? ` ${styles.pillActive}` : ''}`}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allBrands.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionLabel}>{t('filters.brand')}</p>
                <div className={styles.pillGroup}>
                  {allBrands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => onChange({ ...filters, brands: toggleItem(filters.brands, brand) })}
                      className={`${styles.pill}${filters.brands.includes(brand) ? ` ${styles.pillActive}` : ''}`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allColors.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionLabel}>{t('filters.color')}</p>
                <div className={styles.colorGrid}>
                  {allColors.map(({ hex, name }) => (
                    <button
                      key={hex}
                      onClick={() => onChange({ ...filters, colors: toggleItem(filters.colors, hex) })}
                      title={name}
                      aria-label={name}
                      className={`${styles.colorSwatch}${filters.colors.includes(hex) ? ` ${styles.colorSwatchActive}` : ''}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
