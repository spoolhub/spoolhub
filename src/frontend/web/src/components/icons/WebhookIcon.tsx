interface IconProps {
  size?: number
  className?: string
}

export default function WebhookIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 16.969v-.434c0-.552-.448-1-1-1h-4.5c-.828 0-1.5-.672-1.5-1.5v-2.5" />
      <path d="M6 16.969v.434c0 .552.448 1 1 1H11.5c.828 0 1.5.672 1.5 1.5v2.5" />
      <circle cx="5" cy="14" r="2.5" />
      <circle cx="12" cy="7" r="2.5" />
      <circle cx="19" cy="10" r="2.5" />
      <path d="M7.5 12.5l2-4M16.5 -2 4M9.5 14h1.125" />
    </svg>
  )
}
