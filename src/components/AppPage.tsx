import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

/** The frame every app page shares: a title hanging from the line, a lead, then the page. */
export function AppPage({
  title,
  lead,
  actions,
  children,
  wide = false,
}: {
  title: string
  lead?: string
  actions?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={cn('mx-auto w-full px-4 py-6 md:px-8 md:py-10', wide ? 'max-w-6xl' : 'max-w-4xl')}
    >
      <header className="hang-accent mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
          {lead && <p className="text-muted mt-2">{lead}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  )
}
