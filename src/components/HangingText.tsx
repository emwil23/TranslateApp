import { cn } from '@/lib/cn'
import { language } from '@/lib/languages'
import { useMemo } from 'react'

const segmenters = new Map<string, Intl.Segmenter>()
/** Word segments in the language's own rules, so Japanese, Chinese and Thai split into real words. */
export function words(text: string, lang: string) {
  let seg = segmenters.get(lang)
  if (!seg) {
    try {
      seg = new Intl.Segmenter(lang, { granularity: 'word' })
    } catch {
      seg = new Intl.Segmenter('en', { granularity: 'word' })
    }
    segmenters.set(lang, seg)
  }
  return [...seg.segment(text)].map((s) => ({ text: s.segment, word: s.isWordLike ?? false }))
}

/**
 * Translated text that drops from the marigold line word by word as it streams in. Words already shown
 * keep their key, so only new ones animate. Clicking a word asks for alternatives.
 */
export function HangingText({
  text,
  lang,
  onWord,
  animate,
  className,
}: {
  text: string
  lang: string
  onWord?: (word: string, index: number) => void
  animate: boolean
  className?: string
}) {
  const parts = useMemo(() => words(text, lang), [text, lang])
  const rtl = language(lang)?.rtl
  return (
    <p lang={lang} dir={rtl ? 'rtl' : 'auto'} className={cn('whitespace-pre-wrap', className)}>
      {parts.map((p, i) =>
        // Line breaks must stay plain text: inside an inline-block they wouldn't break the line.
        p.text.includes('\n') ? (
          p.text
        ) : p.word && onWord ? (
          <button
            key={i}
            type="button"
            // Keyboard users pick words from the Alternatives dialog instead of tabbing through every word.
            tabIndex={-1}
            onClick={() => onWord(p.text, i)}
            className={cn(
              'hover:decoration-accent-text rounded-sm underline decoration-transparent decoration-2 underline-offset-[6px] transition-colors',
              animate && 'drop-in',
            )}
            style={animate ? { animationDelay: `${(i % 24) * 12}ms` } : undefined}
          >
            {p.text}
          </button>
        ) : (
          <span
            key={i}
            className={animate ? 'drop-in' : undefined}
            style={animate ? { animationDelay: `${(i % 24) * 12}ms` } : undefined}
          >
            {p.text}
          </span>
        ),
      )}
    </p>
  )
}
