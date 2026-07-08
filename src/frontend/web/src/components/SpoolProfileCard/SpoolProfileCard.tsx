import { useTranslation } from 'react-i18next'
import type { SpoolProfileResponse } from '@/types/spoolProfile'
import { SpoolIcon } from '@/components/icons'
import styles from './SpoolProfileCard.module.css'

interface SpoolProfileCardProps {
  profile: SpoolProfileResponse
  onClick: (profile: SpoolProfileResponse) => void
}

export default function SpoolProfileCard({ profile, onClick }: SpoolProfileCardProps) {
  const { t } = useTranslation()

  const color = profile.colorHex || '#888'
  const hasExtruder = profile.extruderMin != null && profile.extruderMax != null
  const hasBed = profile.bedMin != null && profile.bedMax != null

  return (
    <div
      className={styles.card}
      onClick={() => onClick(profile)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(profile) }}
    >
      {/* Color header band — icon left, info right */}
      <div className={styles.colorBand}>
        <div className={styles.colorBandBg} style={{ backgroundColor: color }} />
        <div className={styles.colorBandGrad} />
        <span className={styles.spoolIconWrap}>
          <SpoolIcon color={color} size={64} />
        </span>
        <div className={styles.bandInfo}>
          <div className={styles.bandTop}>
            <p className={styles.bandColor}>{profile.colorName}</p>
            <span className={styles.bandChip}>{profile.material}</span>
          </div>
          <p className={styles.bandBrand}>{profile.brand}</p>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Material stats */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statVal}>{profile.initialWeightG}g</span>
            <span className={styles.statLabel}>{t('spoolProfile.initialW')}</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statVal} ${!profile.spoolWeightG ? styles.statEmpty : ''}`}>
              {profile.spoolWeightG > 0 ? `${profile.spoolWeightG}g` : '—'}
            </span>
            <span className={styles.statLabel}>{t('spoolProfile.spoolW')}</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statVal} ${profile.density == null ? styles.statEmpty : ''}`}>
              {profile.density != null ? `${profile.density}` : '—'}
            </span>
            <span className={styles.statLabel}>{t('spoolProfile.density')}</span>
          </div>
        </div>

        {/* Temperature pills */}
        <div className={styles.temps}>
          <div className={styles.tempPill}>
            <span className={styles.tempLabel}>Spools</span>
            <span className={styles.tempVal}>{profile.spoolCount}</span>
          </div>
          <div className={styles.tempPill}>
            <span className={styles.tempLabel}>{t('spoolProfile.extruder')}</span>
            <span className={`${styles.tempVal} ${!hasExtruder ? styles.tempEmpty : ''}`}>
              {hasExtruder ? `${profile.extruderMin}–${profile.extruderMax}°C` : '—'}
            </span>
          </div>
          <div className={styles.tempPill}>
            <span className={styles.tempLabel}>{t('spoolProfile.bed')}</span>
            <span className={`${styles.tempVal} ${!hasBed ? styles.tempEmpty : ''}`}>
              {hasBed ? `${profile.bedMin}–${profile.bedMax}°C` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
