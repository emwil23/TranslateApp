import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { useSettings, type UiLang } from '@/stores/settings'

/** EN | हिं: flips the whole interface between English and Hindi. */
export function UiLangToggle({ className }: { className?: string }) {
  const ui = useSettings((s) => s.ui)
  const set = useSettings((s) => s.set)
  const t = useT()
  return (
    <div
      role="radiogroup"
      aria-label={t('uiLang')}
      className={cn('border-line flex rounded-full border p-0.5 text-xs', className)}
    >
      {(
        [
          ['en', 'EN', 'English'],
          ['hi', 'हिं', 'हिन्दी'],
        ] as [UiLang, string, string][]
      ).map(([value, short, full]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={ui === value}
          aria-label={full}
          lang={value}
          onClick={() => set({ ui: value })}
          className={cn(
            'rounded-full px-2.5 py-1 transition-colors',
            ui === value ? 'bg-accent text-accent-ink font-semibold' : 'text-muted hover:text-text',
          )}
        >
          {short}
        </button>
      ))}
    </div>
  )
}
