import { useDesign } from '@/context/DesignContext'
import styles from './DesignDock.module.css'

export default function DesignDock() {
  const { dir, setDir, mode, setMode } = useDesign()
  const isDark = mode === 'dark'

  return (
    <div className={styles.dock}>
      <span className={styles.lbl}>Direction</span>
      <div className={styles.seg}>
        <button data-dir="a" className={dir === 'a' ? styles.on : ''} onClick={() => setDir('a')}>
          Studio
        </button>
        <button data-dir="b" className={dir === 'b' ? styles.on : ''} onClick={() => setDir('b')}>
          Console
        </button>
      </div>
      <div className={styles.div} />
      <div className={styles.seg}>
        <button className={!isDark ? styles.on : ''} onClick={() => setMode('light')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
          </svg>
          Light
        </button>
        <button className={isDark ? styles.on : ''} onClick={() => setMode('dark')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z" />
          </svg>
          Dark
        </button>
      </div>
    </div>
  )
}
