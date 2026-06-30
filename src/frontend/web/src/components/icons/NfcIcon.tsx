interface Props { className?: string }

export default function NfcIcon({ className }: Props) {
  return (
    <svg
      className={className}
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="7" x2="5" y2="17" />
      <path d="M8 9.5a4 4 0 0 1 0 5" />
      <path d="M11 8a7 7 0 0 1 0 8" />
      <path d="M14 6.5a9.5 9.5 0 0 1 0 11" />
    </svg>
  )
}
