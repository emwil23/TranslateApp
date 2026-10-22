import { HangingText, words } from '@/components/HangingText'
import { LanguagePicker } from '@/components/LanguagePicker'
import { Markdown } from '@/components/Markdown'
import { RespectPicker, ToneChips } from '@/components/ToneChips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { addHistory, db, uid } from '@/lib/db'
import { fromHinglish, toHinglish } from '@/lib/hinglish'
import type { Term } from '@/lib/glossary'
import { language } from '@/lib/languages'
import { loadFontForLang, loadFontsFor } from '@/lib/scripts'
import { canListen, canSpeak, listen, speak, type Recognition } from '@/lib/speech'
import { newReview } from '@/lib/srs'
import { needsAi, type Tone } from '@/lib/tones'
import { providerById } from '@/ai/providers'
import { useSettings } from '@/stores/settings'
import { hasDeviceTranslator } from '@/translate/device'
import { aiLines, aiText, DeviceOnlyError, NoProviderError, translate } from '@/translate/engine'
import { Link, useSearch } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeftRight,
  BookmarkPlus,
  Copy,
  Cpu,
  GraduationCap,
  Mic,
  Replace,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const MAX = 5000
const NO_TERMS: Term[] = []

type Status = 'idle' | 'running' | 'done' | 'error'

export function Workspace() {
  const t = useT()
  const search = useSearch({ from: '/shell/app' })
  const s = useSettings()
  const [text, setText] = useState(search.text ?? '')
  const [typeHinglish, setTypeHinglish] = useState(false)
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [engine, setEngine] = useState<'device' | 'ai' | null>(null)
  const [detected, setDetected] = useState<string | null>(null)
  const [download, setDownload] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const [explainOpen, setExplainOpen] = useState(false)
  const [altWord, setAltWord] = useState<{ word: string; index: number } | null>(null)
  const [altPicker, setAltPicker] = useState(false)
  const [listening, setListening] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const recognition = useRef<Recognition | null>(null)
  const terms = useLiveQuery(() => db.terms.toArray(), []) ?? NO_TERMS

  const to = s.to
  const respect = s.respect[to.split('-')[0] ?? '']
  const sourceText = typeHinglish ? fromHinglish(text) : text
  const outLang = to
  const aiNeeded = needsAi(s.tone, respect)
  const hasProvider = Boolean(providerById(s.provider))
  // Plain translations on device are instant and free, so they run as you type; AI waits for the button.
  // If the device can't do this pair, the button takes over, so typing never spends AI calls.
  const [failedPair, setFailedPair] = useState<string | null>(null)
  const pair = `${s.from}>${to}`
  const auto = !aiNeeded && s.preferDevice && hasDeviceTranslator() && failedPair !== pair

  // A link like /app?to=ja picks the target language once.
  useEffect(() => {
    if (search.to) useSettings.getState().set({ to: search.to })
  }, [search.to])
  useEffect(() => loadFontsFor(text), [text])
  useEffect(() => loadFontForLang(to), [to])

  const start = useCallback(
    async (fromTyping = false) => {
      const input = sourceText.trim()
      abort.current?.abort()
      if (!input) {
        setOutput('')
        setStatus('idle')
        return
      }
      const controller = new AbortController()
      abort.current = controller
      setStatus('running')
      setError(null)
      setDownload(null)
      setRun((r) => r + 1)
      let out = ''
      let usedEngine: 'device' | 'ai' = 'ai'
      let from = s.from
      try {
        for await (const e of translate(
          { text: input, from: s.from, to, tone: s.tone, respect, terms },
          controller.signal,
          { allowAi: !fromTyping },
        )) {
          if (e.type === 'text') setOutput((out = e.text))
          else if (e.type === 'engine') setEngine((usedEngine = e.engine))
          else if (e.type === 'source') {
            from = e.code
            setDetected(s.from === 'auto' && e.code !== 'auto' ? e.code : null)
          } else setDownload(e.fraction)
        }
        setStatus('done')
        setDownload(null)
        if (out.trim())
          void addHistory({
            source: input,
            output: out,
            from,
            to,
            tone: s.tone,
            ...(respect && { respect }),
            engine: usedEngine,
          })
      } catch (err) {
        if (controller.signal.aborted) return
        if (err instanceof DeviceOnlyError) {
          setFailedPair(`${s.from}>${to}`)
          setStatus('idle')
          return
        }
        setError(err instanceof Error ? err.message : 'Something went wrong.')
        setStatus(err instanceof NoProviderError ? 'idle' : 'error')
        if (err instanceof NoProviderError) setError('no-provider')
      }
    },
    [sourceText, s.from, s.tone, to, respect, terms],
  )

  // As-you-type for on-device; after a manual AI run, changing tone or language re-runs it.
  useEffect(() => {
    if (!auto) return
    const id = setTimeout(() => void start(true), 500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on inputs, not on `start` identity
  }, [auto, sourceText, s.from, to])
  const ranOnce = useRef(false)
  useEffect(() => {
    if (ranOnce.current && !auto) void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only tone, respect and target changes
  }, [s.tone, respect, to])
  useEffect(() => {
    if (status === 'done') ranOnce.current = true
  }, [status])
  useEffect(() => () => abort.current?.abort(), [])

  const swap = () => {
    const from = s.from === 'auto' ? (detected ?? 'en') : s.from
    s.set({ from: to, to: from })
    if (output) setText(output)
    setOutput('')
  }

  const save = async () => {
    await db.phrases.add({
      id: uid(),
      source: sourceText.trim(),
      output,
      from: detected ?? s.from,
      to,
      tone: s.tone,
      ...(respect && { respect }),
      createdAt: Date.now(),
      review: newReview(),
    })
    toast.success(t('ws.saved'))
  }

  const dictate = () => {
    if (listening) {
      recognition.current?.stop()
      return
    }
    const lang = s.from === 'auto' ? (detected ?? navigator.language) : s.from
    setListening(true)
    recognition.current = listen(
      lang,
      (spoken) => setText(spoken),
      () => setListening(false),
    )
  }

  const hindiOut = outLang.split('-')[0] === 'hi'
  const outputWords = words(output, outLang).filter((w) => w.word)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="sr-only">{t('nav.translate')}</h1>

      <div className="relative grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Source sheet: hangs from the indigo line. */}
        <section
          aria-label={t('ws.source')}
          className="border-line bg-surface relative flex min-h-[18rem] flex-col rounded-2xl border md:min-h-[26rem]"
        >
          <div className="bg-source absolute inset-x-5 top-0 h-0.5 rounded-full" aria-hidden />
          <div className="flex items-center gap-2 px-3 pt-3">
            <LanguagePicker
              label={t('ws.from')}
              value={s.from}
              onChange={(from) => s.set({ from })}
              allowAuto
              detected={detected}
            />
          </div>
          <label htmlFor="source" className="sr-only">
            {t('ws.source')}
          </label>
          <textarea
            id="source"
            value={text}
            maxLength={MAX}
            dir="auto"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void start()
              }
            }}
            placeholder={t('ws.placeholder')}
            className="font-display placeholder:text-muted/60 min-h-40 w-full flex-1 resize-none bg-transparent px-5 py-3 text-2xl leading-snug outline-none md:text-[1.7rem]"
          />
          {typeHinglish && text && (
            <p lang="hi" className="text-muted border-line mx-5 border-t py-2 text-lg">
              {sourceText}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1 px-3 pb-3">
            {canListen() && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={listening ? t('conv.listening') : t('conv.tap')}
                aria-pressed={listening}
                onClick={dictate}
                className={cn(listening && 'text-accent-text')}
              >
                <Mic />
              </Button>
            )}
            {(s.from === 'hi' || (s.from === 'auto' && /^[\x20-\x7e\s]*$/.test(text))) && (
              <label className="text-muted hover:text-text flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={typeHinglish}
                  onChange={(e) => {
                    setTypeHinglish(e.target.checked)
                    if (e.target.checked) s.set({ from: 'hi' })
                  }}
                  className="accent-[var(--accent)]"
                />
                <span title={t('ws.typeHinglishHint')}>{t('ws.typeHinglish')}</span>
              </label>
            )}
            <span className="spec text-muted ms-auto">
              {t('ws.chars', { n: text.length, max: MAX })}
            </span>
            {text && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('ws.clear')}
                onClick={() => {
                  setText('')
                  setOutput('')
                }}
              >
                <X />
              </Button>
            )}
          </div>
        </section>

        <button
          type="button"
          onClick={swap}
          aria-label={t('ws.swap')}
          className="border-line bg-bg hover:border-accent hover:text-accent-text z-10 mx-auto -my-6 grid size-11 place-items-center rounded-full border transition-colors md:absolute md:top-6 md:left-1/2 md:my-0 md:-translate-x-1/2"
        >
          <ArrowLeftRight className="size-4 rotate-90 md:rotate-0" aria-hidden />
        </button>

        {/* Output sheet: hangs from the marigold line, redrawn on every translation. */}
        <section
          aria-label={t('ws.output')}
          className="border-line bg-surface relative flex min-h-[18rem] flex-col rounded-2xl border md:min-h-[26rem]"
        >
          <div
            key={run}
            className={cn(
              'bg-accent absolute inset-x-5 top-0 h-0.5 rounded-full',
              run && 'draw-line',
            )}
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
            <LanguagePicker
              label={t('ws.to')}
              value={to}
              onChange={(code) => s.set({ to: code })}
            />
            {engine && output && (
              <span
                className={cn(
                  'spec ms-auto flex items-center gap-1.5 rounded-full px-2.5 py-1',
                  engine === 'device'
                    ? 'bg-source/10 text-source'
                    : 'bg-accent/10 text-accent-text',
                )}
                title={engine === 'device' ? t('ws.engine.deviceHint') : t('ws.engine.aiHint')}
              >
                {engine === 'device' ? (
                  <Cpu className="size-3" aria-hidden />
                ) : (
                  <Sparkles className="size-3" aria-hidden />
                )}
                {engine === 'device' ? t('ws.engine.device') : t('ws.engine.ai')}
              </span>
            )}
          </div>
          <div className="px-3 pt-2">
            <ToneChips value={s.tone} onChange={(tone) => s.set({ tone })} />
          </div>
          <div className="px-4 pt-1">
            <RespectPicker
              lang={to}
              value={respect}
              onChange={(v) => {
                const key = to.split('-')[0] ?? to
                const others = Object.entries(s.respect).filter(([k]) => k !== key)
                s.set({ respect: Object.fromEntries(v ? [...others, [key, v]] : others) })
              }}
            />
          </div>

          <div className="flex-1 px-5 py-3" aria-live="polite" aria-busy={status === 'running'}>
            {output ? (
              <>
                <HangingText
                  text={output}
                  lang={outLang}
                  animate={status === 'running'}
                  onWord={hasProvider ? (word, index) => setAltWord({ word, index }) : undefined}
                  className="font-display text-2xl leading-snug md:text-[1.7rem]"
                />
                {hindiOut && s.hinglish && (
                  <p className="text-muted mt-3 text-base" lang="hi-Latn">
                    {toHinglish(output)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted/70 font-display text-2xl">
                {status === 'running' ? t('ws.translating') : t('ws.empty')}
              </p>
            )}
            {download !== null && download < 1 && (
              <p className="spec text-source mt-3" role="status">
                {t('ws.download', { pct: Math.round(download * 100) })}
              </p>
            )}
            {error === 'no-provider' ? (
              <p
                role="status"
                className="border-accent-text/30 bg-accent/5 mt-4 rounded-xl border p-3 text-sm"
              >
                {t('ai.pick')}{' '}
                <Link
                  to="/settings"
                  hash="ai"
                  className="text-accent-text font-medium underline underline-offset-4"
                >
                  {t('ai.open')}
                </Link>
              </p>
            ) : (
              error && (
                <p
                  role="alert"
                  className="border-danger/30 bg-danger/10 text-danger mt-4 rounded-xl border p-3 text-sm"
                >
                  {error}
                </p>
              )
            )}
          </div>

          <div className="border-line flex flex-wrap items-center gap-1 border-t px-3 py-2">
            {status === 'running' ? (
              <Button variant="secondary" size="sm" onClick={() => abort.current?.abort()}>
                <Square /> {t('ws.stop')}
              </Button>
            ) : (
              !auto && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void start()}
                  disabled={!sourceText.trim()}
                >
                  {aiNeeded && <Sparkles />} {t('ws.translate')}
                  <kbd className="spec hidden opacity-60 lg:inline">Ctrl ↵</kbd>
                </Button>
              )
            )}
            {output && status !== 'running' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('ws.copy')}
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(output)
                      .then(() => toast.success(t('ws.copied')))
                  }
                >
                  <Copy />
                </Button>
                {canSpeak() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('ws.listen')}
                    onClick={() => speak(output, outLang)}
                  >
                    <Volume2 />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('ws.save')}
                  onClick={() => void save()}
                >
                  <BookmarkPlus />
                </Button>
                {hasProvider && outputWords.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setAltPicker(true)}>
                    <Replace /> {t('ws.altButton')}
                  </Button>
                )}
                <Button
                  variant="ai"
                  size="sm"
                  className="ms-auto"
                  onClick={() => setExplainOpen(true)}
                >
                  <GraduationCap /> {t('ws.explain')}
                </Button>
              </>
            )}
          </div>
        </section>
      </div>

      {hasProvider && output && status === 'done' && (
        <p className="text-muted mt-4 text-center text-xs">{t('ws.clickWord')}</p>
      )}
      {s.provider === 'ew' && aiNeeded && (
        <p className="text-muted mx-auto mt-2 max-w-xl text-center text-xs">{t('ai.private')}</p>
      )}

      <ExplainSheet
        open={explainOpen}
        onOpenChange={setExplainOpen}
        source={sourceText}
        translation={output}
        from={detected ?? s.from}
        to={to}
        tone={s.tone}
      />
      <AlternativesDialog
        open={Boolean(altWord) || altPicker}
        onOpenChange={(o) => {
          if (!o) {
            setAltWord(null)
            setAltPicker(false)
          }
        }}
        word={altWord}
        candidates={outputWords.map((w) => w.text)}
        onPickWord={(word) => {
          const index = words(output, outLang).findIndex((w) => w.text === word)
          setAltWord({ word, index })
        }}
        source={sourceText}
        translation={output}
        to={to}
        onReplace={(replacement) => {
          if (!altWord) return
          setOutput(
            words(output, outLang)
              .map((p, i) => (i === altWord.index ? replacement : p.text))
              .join(''),
          )
          setAltWord(null)
          setAltPicker(false)
        }}
      />
    </div>
  )
}

function ExplainSheet({
  open,
  onOpenChange,
  translation,
  from,
  to,
  ...rest
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  source: string
  translation: string
  from: string
  to: string
  tone: Tone
}) {
  const t = useT()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side
        title={t('ws.explainTitle')}
        description={`${language(from)?.name ?? ''} → ${language(to)?.name ?? to}`}
      >
        <div className="hang-accent mt-5">
          <p lang={to} dir="auto" className="font-display text-xl">
            {translation}
          </p>
        </div>
        {/* Mounted only while open, so each opening starts a fresh explanation. */}
        {translation && <Explanation translation={translation} from={from} to={to} {...rest} />}
      </DialogContent>
    </Dialog>
  )
}

function Explanation(input: {
  source: string
  translation: string
  from: string
  to: string
  tone: Tone
}) {
  const t = useT()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { source, translation, from, to, tone } = input

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const request = {
          source: source.slice(0, 2000),
          translation: translation.slice(0, 2000),
          from,
          to,
          tone,
        }
        for await (const all of aiText('explain', request, controller.signal)) setText(all)
      } catch (e) {
        if (controller.signal.aborted) return
        setError(
          e instanceof NoProviderError ? t('ai.pick') : e instanceof Error ? e.message : 'Error',
        )
      }
    })()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` changes identity with the language only
  }, [source, translation, from, to, tone])

  return (
    <div className="mt-5" aria-live="polite">
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : text ? (
        <Markdown text={text} />
      ) : (
        <p className="text-muted animate-pulse text-sm">{t('ws.translating')}</p>
      )}
    </div>
  )
}

function AlternativesDialog({
  open,
  onOpenChange,
  word,
  candidates,
  onPickWord,
  ...rest
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  word: { word: string; index: number } | null
  candidates: string[]
  onPickWord: (w: string) => void
  source: string
  translation: string
  to: string
  onReplace: (text: string) => void
}) {
  const t = useT()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={word ? t('ws.alternatives', { word: word.word }) : t('ws.altButton')}>
        {word ? (
          <Alternatives key={`${word.word}-${word.index}`} word={word.word} {...rest} />
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2" lang={rest.to}>
            {[...new Set(candidates)].map((w) => (
              <li key={w}>
                <Button variant="secondary" size="sm" onClick={() => onPickWord(w)}>
                  {w}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Alternatives({
  word,
  source,
  translation,
  to,
  onReplace,
}: {
  word: string
  source: string
  translation: string
  to: string
  onReplace: (text: string) => void
}) {
  const t = useT()
  const [items, setItems] = useState<{ text: string; note: string }[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const request = {
      source: source.slice(0, 2000),
      translation: translation.slice(0, 2000),
      word,
      to,
    }
    aiLines('alternatives', request, controller.signal)
      .then((r) => setItems(r.filter((i) => typeof i.text === 'string' && i.text.trim())))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Error')
      })
    return () => controller.abort()
  }, [word, source, translation, to])

  if (error)
    return (
      <p role="alert" className="text-danger mt-4 text-sm">
        {error}
      </p>
    )
  if (!items) return <p className="text-muted mt-4 animate-pulse text-sm">{t('ws.translating')}</p>
  if (!items.length) return <p className="text-muted mt-4 text-sm">{t('ws.noAlternatives')}</p>
  return (
    <ul className="mt-4 flex flex-col gap-1">
      {items.map((i) => (
        <li key={i.text}>
          <button
            type="button"
            onClick={() => onReplace(i.text)}
            className="hover:bg-surface-2 hang w-full rounded-lg px-3 py-2 text-start"
          >
            <span lang={to} className="font-display block text-lg">
              {i.text}
            </span>
            <span className="text-muted text-sm">{i.note}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
