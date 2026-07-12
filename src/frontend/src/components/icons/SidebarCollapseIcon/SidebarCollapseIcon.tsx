import styles from './SidebarCollapseIcon.module.css'
export default function SidebarCollapseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={[styles.icon, className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M9 3v18" />
      <path d="M14 9l-3 3 3 3" />
    </svg>
  )
}
