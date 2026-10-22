import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { language, LANGUAGES } from '@/lib/languages'
import { pushRecent, useSettings } from '@/stores/settings'
import { Check, ChevronDown, Search, Sparkles } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useMemo, useState } from 'react'

/**
 * A language button that opens a searchable list. Each language shows its own name in its own script,
 * and search matches either name or the code ("hi", "Hindi", "हिन्दी").
 */
export function LanguagePicker({
  value,
  onChange,
  label,
  allowAuto = false,
  detected,
  className,
}: {
  value: string
  onChange: (code: string) => void
  label: string
  allowAuto?: boolean
  /** Shown next to "Detect language" once a language was detected. */
  detected?: string | null
  className?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const recent = useSettings((s) => s.recent)

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return LANGUAGES
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.native.toLowerCase().includes(query) ||
        l.code.toLowerCase() === query,
    )
  }, [q])

  const pick = (code: string) => {
    onChange(code)
    if (code !== 'auto') pushRecent(code)
    setOpen(false)
    setQ('')
  }

  const current = value === 'auto' ? null : language(value)
  const detectedName = detected ? language(detected)?.name : null

  const item = (code: string, name: string, native?: string) => (
    <li key={code}>
      <button
        type="button"
        onClick={() => pick(code)}
        aria-current={value === code ? 'true' : undefined}
        className="hover:bg-surface-2 focus-visible:bg-surface-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm outline-none"
      >
        <span className="flex-1">{name}</span>
        {native && native !== name && (
          <span className="text-muted" lang={code} dir="auto">
            {native}
          </span>
        )}
        {value === code && <Check className="text-accent-text size-4" aria-hidden />}
      </button>
    </li>
  )

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={`${label}: ${current?.name ?? t('ws.detect')}`}
        className={cn(
          'hover:bg-surface-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          className,
        )}
      >
        {current ? (
          <>
            {current.name}
            <span className="text-muted hidden font-normal sm:inline" lang={current.code}>
              {current.native !== current.name && current.native}
            </span>
          </>
        ) : (
          <>
            <Sparkles className="text-source size-4" aria-hidden />
            {detectedName ? t('ws.detected', { lang: detectedName }) : t('ws.detect')}
          </>
        )}
        <ChevronDown className="text-muted size-4" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="border-line bg-surface z-50 flex max-h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border shadow-2xl"
        >
          <label className="border-line flex items-center gap-2 border-b px-3">
            <Search className="text-muted size-4" aria-hidden />
            <span className="sr-only">{t('ws.search')}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('ws.search')}
              className="h-11 flex-1 bg-transparent text-sm outline-none"
              onKeyDown={(e) => {
                const first = results[0]
                if (e.key === 'Enter' && first) pick(first.code)
              }}
            />
          </label>
          <div className="overflow-y-auto p-1.5">
            {!q && (
              <>
                {allowAuto && <ul>{item('auto', t('ws.detect'))}</ul>}
                <p className="spec text-muted px-3 pt-2 pb-1">{t('ws.recent')}</p>
                <ul>
                  {recent.map((c) => {
                    const l = language(c)
                    return l ? item(l.code, l.name, l.native) : null
                  })}
                </ul>
                <p className="spec text-muted px-3 pt-3 pb-1">{t('ws.all')}</p>
              </>
            )}
            <ul>{results.map((l) => item(l.code, l.name, l.native))}</ul>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
