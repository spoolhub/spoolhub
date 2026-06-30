import styles from './DarkModeToggle.module.css'

interface DarkModeToggleProps {
  isDark: boolean
  onToggle: () => void
}

export default function DarkModeToggle({ isDark, onToggle }: DarkModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className={`${styles.toggle} ${isDark ? styles.toggleDark : styles.toggleLight}`}
    >
      <span className={`${styles.stars} ${styles.stars1} ${isDark ? styles.starsVisible : styles.starsHidden}`}>
        <svg width="4" height="4" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2" fill="white" /></svg>
      </span>
      <span className={`${styles.stars} ${styles.stars2} ${isDark ? `${styles.starsVisible} ${styles.starsDelay}` : styles.starsHidden}`}>
        <svg width="3" height="3" viewBox="0 0 3 3"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></svg>
      </span>
      <span className={`${styles.sunRays} ${isDark ? styles.sunRaysHidden : ''}`}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="5" y1="0" x2="5" y2="2" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="5" y1="8" x2="5" y2="10" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="0" y1="5" x2="2" y2="5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8" y1="5" x2="10" y2="5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`${styles.thumb} ${isDark ? styles.thumbDark : styles.thumbLight}`}>
        {isDark ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#4338ca" stroke="#4338ca" strokeWidth="1" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" fill="#f59e0b" />
            <line x1="12" y1="2" x2="12" y2="5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="19" x2="12" y2="22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <line x1="2" y1="12" x2="5" y2="12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <line x1="19" y1="12" x2="22" y2="12" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  )
}
