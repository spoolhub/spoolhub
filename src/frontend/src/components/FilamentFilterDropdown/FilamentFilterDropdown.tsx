import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { FilamentFilters } from '@/types/filamentFilters'
import { DEFAULT_FILAMENT_FILTERS } from '@/types/filamentFilters'
import styles from './FilamentFilterDropdown.module.css'

interface FilamentFilterDropdownProps {
  allMaterials: string[]
  allColors: { hex: string; name: string }[]
  filters: FilamentFilters
  onChange: (filters: FilamentFilters) => void
}

export default function FilamentFilterDropdown({
  allMaterials,
  allColors,
  filters,
  onChange,
}: FilamentFilterDropdownProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeCount =
    filters.materials.length +
    filters.colors.length +
    (filters.hideDiscontinued ? 1 : 0)

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

  return (
    <div ref={ref} className={styles.wrap}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`${styles.trigger}${activeCount > 0 ? ` ${styles.triggerActive}` : ''}`}
        aria-label="Filter filaments"
      >
        <svg className={styles.triggerIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {activeCount > 0 && <span className={styles.count}>{activeCount}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownHeaderLabel}>{t('filters.header')}</span>
            {activeCount > 0 && (
              <button onClick={() => onChange({ ...DEFAULT_FILAMENT_FILTERS })} className={styles.clearBtn}>
                {t('filters.clearAll')}
              </button>
            )}
          </div>

          <div className={styles.scroll}>
            <div className={styles.section}>
              <p className={styles.sectionLabel}>{t('filters.status')}</p>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={filters.hideDiscontinued}
                  onChange={() => onChange({ ...filters, hideDiscontinued: !filters.hideDiscontinued })}
                  className={styles.checkbox}
                />
                <span>{t('filamentFilter.hideDiscontinued')}</span>
              </label>
            </div>

            {allMaterials.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionLabel}>{t('filters.material')}</p>
                <div className={styles.pillGroup}>
                  {allMaterials.map(m => (
                    <button
                      key={m}
                      onClick={() => onChange({ ...filters, materials: toggleItem(filters.materials, m) })}
                      className={`${styles.pill}${filters.materials.includes(m) ? ` ${styles.pillActive}` : ''}`}
                    >
                      {m}
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
