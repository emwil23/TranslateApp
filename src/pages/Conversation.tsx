import { LanguagePicker } from '@/components/LanguagePicker'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { language } from '@/lib/languages'
import { loadFontForLang } from '@/lib/scripts'
import { canListen, canSpeak, listen, speak, type Recognition } from '@/lib/speech'
import { useSettings } from '@/stores/settings'
import { cleanReply } from '@/translate/clean'
import { aiText, NoProviderError, translateAll } from '@/translate/engine'
import { Link } from '@tanstack/react-router'
import { FlipVertical2, Mic, Send, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState, type SyntheticEvent } from 'react'

interface Turn {
  id: number
  side: 0 | 1
  said: string
  translated: string
}

/**
 * Two people, two languages, one screen. Each half has its own mic; what one says is translated into the
 * other's language, shown on their half and read aloud.
 */
export function Conversation() {
  const t = useT()
  const s = useSettings()
  const [langs, setLangs] = useState<[string, string]>(() => [
    s.from === 'auto' ? 'en' : s.from,
    s.to,
  ])
  const [turns, setTurns] = useState<Turn[]>([])
  const [active, setActive] = useState<0 | 1 | null>(null)
  const [interim, setInterim] = useState('')
  const [face, setFace] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognition = useRef<Recognition | null>(null)
  const nextId = useRef(0)

  useEffect(() => langs.forEach(loadFontForLang), [langs])
  useEffect(() => () => recognition.current?.abort(), [])

  const handle = async (side: 0 | 1, said: string) => {
    const from = langs[side]
    const to = langs[side === 0 ? 1 : 0]
    const id = nextId.current++
    setTurns((all) => [...all, { id, side, said, translated: '' }])
    setError(null)
    const signal = AbortSignal.timeout(60_000)
    try {
      // On-device when the browser can; otherwise the conversation prompt, which fixes mishearings.
      let translated = (
        await translateAll({ text: said, from, to, tone: 'plain', terms: [] }, signal, {
          allowAi: false,
        }).catch(() => null)
      )?.text
      if (!translated)
        for await (const all of aiText('conversation', { text: said, from, to }, signal))
          translated = cleanReply(all, said)
      const final = translated ?? ''
      setTurns((all) => all.map((x) => (x.id === id ? { ...x, translated: final } : x)))
      if (final) speak(final, to)
    } catch (e) {
      setTurns((all) => all.filter((x) => x.id !== id))
      setError(
        e instanceof NoProviderError ? 'no-provider' : e instanceof Error ? e.message : 'Error',
      )
    }
  }

  const talk = (side: 0 | 1) => {
    if (active !== null) {
      recognition.current?.stop()
      return
    }
    setActive(side)
    setInterim('')
    recognition.current = listen(
      langs[side],
      (text, final) => {
        if (final) void handle(side, text)
        else setInterim(text)
      },
      () => {
        setActive(null)
        setInterim('')
      },
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col md:min-h-dvh">
      <h1 className="sr-only">{t('conv.title')}</h1>
      <Half
        side={1}
        lang={langs[1]}
        onLang={(code) => setLangs([langs[0], code])}
        turns={turns}
        active={active}
        interim={interim}
        onTalk={talk}
        onType={(text) => void handle(1, text)}
        rotated={face}
      />
      <div className="border-line flex items-center justify-center gap-2 border-y py-2">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={face}
          onClick={() => setFace((f) => !f)}
          title={t('conv.flipHint')}
        >
          <FlipVertical2 /> {t('conv.flip')}
        </Button>
        {!canListen() && <p className="text-muted px-2 text-xs">{t('conv.noMic')}</p>}
      </div>
      <Half
        side={0}
        lang={langs[0]}
        onLang={(code) => setLangs([code, langs[1]])}
        turns={turns}
        active={active}
        interim={interim}
        onTalk={talk}
        onType={(text) => void handle(0, text)}
      />
      {error && (
        <p
          role="alert"
          className="border-danger/30 bg-danger/10 text-danger m-4 rounded-xl border p-3 text-sm"
        >
          {error === 'no-provider' ? (
            <>
              {t('ai.pick')}{' '}
              <Link to="/settings" hash="ai" className="underline underline-offset-4">
                {t('ai.open')}
              </Link>
            </>
          ) : (
            error
          )}
        </p>
      )}
    </div>
  )
}

function Half({
  side,
  lang,
  onLang,
  turns,
  active,
  interim,
  onTalk,
  onType,
  rotated = false,
}: {
  side: 0 | 1
  lang: string
  onLang: (code: string) => void
  turns: Turn[]
  active: 0 | 1 | null
  interim: string
  onTalk: (side: 0 | 1) => void
  onType: (text: string) => void
  rotated?: boolean
}) {
  const t = useT()
  const [typed, setTyped] = useState('')
  const listRef = useRef<HTMLOListElement>(null)
  const listening = active === side
  const name = language(lang)?.name ?? lang

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns])

  const send = (e: SyntheticEvent) => {
    e.preventDefault()
    if (!typed.trim()) return
    onType(typed.trim())
    setTyped('')
  }

  return (
    <section
      aria-label={name}
      className={cn('relative flex min-h-0 flex-1 flex-col', rotated && 'rotate-180')}
    >
      <div
        className={cn(
          'absolute inset-x-6 top-0 h-0.5 rounded-full',
          side === 0 ? 'bg-source' : 'bg-accent',
        )}
        aria-hidden
      />
      <div className="flex items-center justify-between px-4 pt-3">
        <LanguagePicker label={t('ws.to')} value={lang} onChange={onLang} />
      </div>
      <ol
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
        aria-live="polite"
      >
        {turns.length === 0 && !listening && (
          <li className="text-muted font-display m-auto text-xl">{t('conv.empty')}</li>
        )}
        {turns.map((turn) => {
          const mine = turn.side === side
          // Each half shows the conversation in its own language: what I said, and what they said translated.
          const text = mine ? turn.said : turn.translated
          if (!text) return null
          return (
            <li
              key={turn.id}
              className={cn(
                'flex max-w-[85%] flex-col',
                mine ? 'items-end self-end' : 'self-start',
              )}
            >
              <p
                lang={lang}
                dir="auto"
                className={cn(
                  'rounded-2xl px-4 py-2',
                  mine
                    ? 'bg-surface-2 text-muted'
                    : 'bg-surface font-display border-line border text-xl',
                )}
              >
                {text}
              </p>
              {!mine && canSpeak() && (
                <button
                  type="button"
                  onClick={() => speak(text, lang)}
                  aria-label={t('ws.listen')}
                  className="text-muted hover:text-text mt-1 rounded-full p-1"
                >
                  <Volume2 className="size-4" />
                </button>
              )}
            </li>
          )
        })}
        {listening && interim && (
          <li className="text-muted self-end italic" lang={lang} dir="auto">
            {interim}
          </li>
        )}
      </ol>
      <div className="flex items-center gap-3 px-4 pb-4">
        <form
          onSubmit={send}
          className="border-line bg-surface flex flex-1 items-center rounded-full border ps-4"
        >
          <label className="sr-only" htmlFor={`type-${side}`}>
            {t('conv.type')} ({name})
          </label>
          <input
            id={`type-${side}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t('conv.type')}
            lang={lang}
            dir="auto"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <Button type="submit" variant="ghost" size="icon" aria-label={t('conv.send')}>
            <Send className="rtl:-scale-x-100" />
          </Button>
        </form>
        {canListen() && (
          <button
            type="button"
            onClick={() => onTalk(side)}
            aria-pressed={listening}
            aria-label={`${listening ? t('conv.listening') : t('conv.tap')} (${name})`}
            className={cn(
              'relative grid size-16 shrink-0 place-items-center rounded-full transition-transform active:scale-95',
              listening
                ? 'bg-accent text-accent-ink'
                : side === 0
                  ? 'bg-source text-white'
                  : 'bg-accent text-accent-ink',
            )}
          >
            {listening && (
              <span
                className="bg-accent absolute inset-0 animate-ping rounded-full opacity-40"
                aria-hidden
              />
            )}
            <Mic className="relative size-6" aria-hidden />
          </button>
        )}
      </div>
    </section>
  )
}
