import { cn } from '@/lib/cn'

/**
 * The Translate+ mark: a plus whose top bar is a shirorekha, with one stroke hanging from it that reads as
 * both a Latin "T" and the Devanagari "त".
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M6 10h20" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 10v15" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M16 17.5c-3.6 0-6-1.6-6-4"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M21 19.5h5M23.5 17v5"
        stroke="var(--accent-ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-display text-xl leading-none font-semibold tracking-tight">
        Translate<span className="text-accent-text">+</span>
      </span>
    </span>
  )
}
