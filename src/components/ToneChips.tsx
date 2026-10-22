import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { RESPECT } from '@/lib/languages'
import { TONES, type Tone } from '@/lib/tones'
import { useSettings } from '@/stores/settings'
import { motion } from 'motion/react'

/** The tone chips that sit on the output's line; the active one gets the marigold pill. */
export function ToneChips({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
  const t = useT()
  const ui = useSettings((s) => s.ui)
  return (
    <div
      role="radiogroup"
      aria-label={t('ws.tone')}
      className="-mx-1 flex [scrollbar-width:none] gap-1 overflow-x-auto px-1 pb-1"
    >
      {TONES.map((tone) => {
        const active = tone.id === value
        return (
          <button
            key={tone.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={tone.hint}
            onClick={() => onChange(tone.id)}
            className={cn(
              'relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
              active ? 'text-accent-ink font-medium' : 'text-muted hover:text-text',
            )}
          >
            {active && (
              <motion.span
                layoutId="tone-pill"
                className="bg-accent absolute inset-0 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              />
            )}
            <tone.icon className="relative size-4" aria-hidden />
            <span className="relative">{ui === 'hi' ? tone.hi : tone.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Respect levels for languages that have them (Hindi aap/tum/tu, Japanese keigo, Korean speech levels). */
export function RespectPicker({
  lang,
  value,
  onChange,
}: {
  lang: string
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  const t = useT()
  const levels = RESPECT[lang.split('-')[0] ?? '']
  if (!levels) return null
  return (
    <div
      role="radiogroup"
      aria-label={t('ws.respect')}
      className="flex flex-wrap items-center gap-1"
    >
      <span className="spec text-muted me-1">{t('ws.respect')}</span>
      {levels.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={value === l.id}
          title={l.hint}
          // Clicking the active level again goes back to "let the tone decide".
          onClick={() => onChange(value === l.id ? undefined : l.id)}
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs transition-colors',
            value === l.id
              ? 'border-accent-text text-accent-text bg-accent/10'
              : 'border-line text-muted hover:text-text',
          )}
          lang={lang}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
