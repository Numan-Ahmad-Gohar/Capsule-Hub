/**
 * icons.jsx — a small inline SVG icon set (no icon-font dependency, crisp at any
 * DPI, and tree-shakeable). Each icon accepts standard SVG props (className,
 * etc.) so callers control size/colour via Tailwind.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
}

export function CapsuleIcon(props) {
  return (
    <svg {...base} width="20" height="20" {...props}>
      <rect x="3.5" y="8" width="17" height="8" rx="4" transform="rotate(-45 12 12)" />
      <line x1="9.5" y1="14.5" x2="14.5" y2="9.5" />
    </svg>
  )
}

export function SparkleIcon(props) {
  return (
    <svg {...base} width="20" height="20" {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5a3.5 3.5 0 0 0 3.5 3.5A3.5 3.5 0 0 0 12 15.5 3.5 3.5 0 0 0 8.5 12 3.5 3.5 0 0 0 12 8.5z" />
    </svg>
  )
}

export function SearchIcon(props) {
  return (
    <svg {...base} width="20" height="20" {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}

export function SettingsIcon(props) {
  return (
    <svg {...base} width="20" height="20" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  )
}

export function TrashIcon(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export function InjectIcon(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <path d="M4 12l5 5L20 6" />
    </svg>
  )
}

export function ArrowLeftIcon(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

export function CopyIcon(props) {
  return (
    <svg {...base} width="18" height="18" {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}
