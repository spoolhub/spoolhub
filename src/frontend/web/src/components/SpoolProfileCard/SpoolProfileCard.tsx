import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { SpoolProfileResponse } from '@/types/spoolProfile'
import { SpoolIcon } from '@/components/icons'
import styles from './SpoolProfileCard.module.css'

interface SpoolProfileCardProps {
  profile: SpoolProfileResponse
  onEdit: (profile: SpoolProfileResponse) => void
  onDelete: (profile: SpoolProfileResponse) => void
}

export default function SpoolProfileCard({ profile, onEdit, onDelete }: SpoolProfileCardProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function handleDeleteClick() {
    setMenuOpen(false)
    setDeleting(true)
  }

  function handleSpinEnd() {
    if (!deleting) return
    setConfirming(true)
  }

  function handleConfirmDelete() {
    onDelete(profile)
  }

  function handleCancelDelete() {
    setDeleting(false)
    setConfirming(false)
  }

  return (
    <div
      className={`${styles.card} ${deleting ? styles.deleting : ''}`}
      onAnimationEnd={deleting ? handleSpinEnd : undefined}
    >
      {/* Delete confirmation overlay */}
      {confirming && (
        <div className={styles.confirmOverlay}>
          <p className={styles.confirmText}>{t('spoolProfile.deleteProfile')}?</p>
          <div className={styles.confirmActions}>
            <button className={styles.confirmCancel} onClick={handleCancelDelete}>{t('common.cancel', 'Cancel')}</button>
            <button className={styles.confirmDelete} onClick={handleConfirmDelete}>{t('spoolProfile.deleteProfile')}</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerColorOverlay} style={{ backgroundColor: profile.colorHex || '#888' }} />
        <SpoolIcon color={profile.colorHex || '#888'} size={48} />
        <div className={styles.headerInfo}>
          <p className={styles.brand}>{profile.brand}</p>
          <p className={styles.sub}>{profile.colorName}</p>
        </div>
        <span className={styles.matChip}>{profile.material}</span>
        <div className={styles.menuWrap} ref={menuRef}>
          <button className={styles.menuBtn} onClick={() => setMenuOpen(v => !v)} aria-label={t('common.edit')}>
            ⋮
          </button>
          {menuOpen && (
            <div className={styles.menu}>
              <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onEdit(profile) }}>
                {t('common.edit')}
              </button>
              <button className={styles.menuItemDelete} onClick={handleDeleteClick}>
                {t('spoolProfile.deleteProfile')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Split section: Print Settings | Material */}
      <div className={styles.splitSection}>
        <div className={styles.sectionCol}>
          <p className={styles.sectionLabel}>{t('spoolProfile.printSettings')}</p>
          <div className={styles.printRows}>
            <div className={styles.printEntry}>
              <span className={styles.printKey}>{t('spoolProfile.extruder')}</span>
              <span className={styles.printVal}>
                {profile.extruderMin != null && profile.extruderMax != null ? `${profile.extruderMin}–${profile.extruderMax}°C` : '—'}
              </span>
            </div>
            <div className={styles.printEntry}>
              <span className={styles.printKey}>{t('spoolProfile.bed')}</span>
              <span className={styles.printVal}>
                {profile.bedMin != null && profile.bedMax != null ? `${profile.bedMin}–${profile.bedMax}°C` : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.sectionCol}>
          <p className={styles.sectionLabel}>{t('spoolProfile.materialProps')}</p>
          <div className={styles.matTable}>
            <div className={styles.matRow}>
              <span className={styles.matKey}>{t('spoolProfile.initialW')}</span>
              <span className={styles.matKey}>{t('spoolProfile.spoolW')}</span>
              <span className={styles.matKey}>{t('spoolProfile.density')}</span>
            </div>
            <div className={styles.matRow}>
              <span className={styles.matVal}>{profile.initialWeightG}g</span>
              <span className={styles.matVal}>{profile.spoolWeightG > 0 ? `${profile.spoolWeightG}g` : '—'}</span>
              <span className={styles.matVal}>{profile.density != null ? `${profile.density} g/cm³` : '—'}</span>
            </div>
            <div className={styles.matRow}>
              <span className={styles.matKey}>{t('spoolProfile.tolerance')}</span>
              <span className={styles.matKey}></span>
              <span className={styles.matKey}></span>
            </div>
            <div className={styles.matRow}>
              <span className={styles.matVal}>{profile.diameterTolerance != null ? `±${profile.diameterTolerance}mm` : '—'}</span>
              <span className={styles.matVal}></span>
              <span className={styles.matVal}></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
