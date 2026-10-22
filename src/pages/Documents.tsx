import { AppPage } from '@/components/AppPage'
import { LanguagePicker } from '@/components/LanguagePicker'
import { ToneChips } from '@/components/ToneChips'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { db } from '@/lib/db'
import {
  FREE_PAGES,
  kindOf,
  loadDoc,
  translateDoc,
  type LoadedDoc,
  type TranslatedDoc,
} from '@/lib/documents'
import { loadFontForLang, loadFontsFor } from '@/lib/scripts'
import { useSettings } from '@/stores/settings'
import { resolveSource, translateAll } from '@/translate/engine'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, FileUp, ShieldCheck, Square, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function Documents() {
  const t = useT()
  const s = useSettings()
  const [doc, setDoc] = useState<LoadedDoc | null>(null)
  const [result, setResult] = useState<TranslatedDoc | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [allowAi, setAllowAi] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const abort = useRef<AbortController | null>(null)
  const terms = useLiveQuery(() => db.terms.toArray(), []) ?? []

  useEffect(() => loadFontForLang(s.to), [s.to])
  useEffect(() => () => abort.current?.abort(), [])

  const open = async (file: File) => {
    setError(null)
    setResult(null)
    if (!kindOf(file.name)) {
      setError(t('doc.unsupported'))
      return
    }
    try {
      const loaded = await loadDoc(file)
      loadFontsFor(loaded.text.slice(0, 2000))
      setDoc(loaded)
    } catch {
      setError(t('doc.unsupported'))
    }
  }

  const tooBig = doc && doc.pages > FREE_PAGES

  const run = async () => {
    if (!doc || tooBig) return
    const controller = new AbortController()
    abort.current = controller
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: 1 })
    try {
      const from = await resolveSource(doc.text.slice(0, 1000), s.from)
      const out = await translateDoc(
        doc,
        s.to,
        async (text) =>
          (
            await translateAll(
              { text, from, to: s.to, tone: allowAi ? s.tone : 'plain', terms },
              controller.signal,
              { action: 'document', allowAi },
            )
          ).text,
        (done, total) => setProgress({ done, total }),
      )
      setResult(out)
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setProgress(null)
    }
  }

  const download = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(result.blob)
    a.download = result.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <AppPage title={t('doc.title')} lead={t('doc.lead')} wide>
      <input
        ref={input}
        type="file"
        accept=".txt,.srt,.docx,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void open(f)
          e.target.value = ''
        }}
      />

      {!doc ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            const f = e.dataTransfer.files[0]
            if (f) void open(f)
          }}
          className={cn(
            'grid gap-6 rounded-3xl border border-dashed p-8 transition-colors md:grid-cols-[auto_1fr] md:items-center',
            drag ? 'border-accent bg-accent/5' : 'border-line',
          )}
        >
          <img
            src="/media/empty-documents.webp"
            alt=""
            width={240}
            height={240}
            className="size-48 rounded-3xl md:size-60"
          />
          <div>
            <p className="font-display text-3xl">{t('doc.drop')}</p>
            <p className="text-muted mt-2 text-sm">{t('doc.limit', { pages: FREE_PAGES })}</p>
            <Button
              variant="primary"
              size="lg"
              className="mt-6"
              onClick={() => input.current?.click()}
            >
              <FileUp /> {t('doc.choose')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="border-line bg-surface mb-6 flex flex-wrap items-center gap-4 rounded-2xl border p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{doc.name}</p>
              <p className="spec text-muted">
                {doc.kind} · ~{doc.pages} {doc.pages === 1 ? 'page' : 'pages'}
              </p>
            </div>
            <LanguagePicker
              label={t('ws.to')}
              value={s.to}
              onChange={(to) => s.set({ to })}
              className="border-line border"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.cancel')}
              onClick={() => {
                abort.current?.abort()
                setDoc(null)
                setResult(null)
              }}
            >
              <X />
            </Button>
          </div>

          <div className="mb-6 flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowAi}
                onChange={(e) => setAllowAi(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              {t('doc.allowAi')}
            </label>
            <p className="text-muted flex items-start gap-2 text-xs">
              <ShieldCheck className="text-source size-4 shrink-0" aria-hidden />
              {allowAi ? `${t('doc.allowAiHint')} ${t('ai.private')}` : t('ws.engine.deviceHint')}
            </p>
            {allowAi && <ToneChips value={s.tone} onChange={(tone) => s.set({ tone })} />}
          </div>

          {tooBig && (
            <p
              role="alert"
              className="border-accent-text/30 bg-accent/5 mb-6 rounded-xl border p-3 text-sm"
            >
              {t('doc.tooBig', { pages: doc.pages, max: FREE_PAGES })}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="border-danger/30 bg-danger/10 text-danger mb-6 rounded-xl border p-3 text-sm"
            >
              {error}
            </p>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-3">
            {progress ? (
              <>
                <Button variant="secondary" onClick={() => abort.current?.abort()}>
                  <Square /> {t('ws.stop')}
                </Button>
                <p className="spec text-muted" role="status">
                  {t('doc.progress', {
                    done: Math.min(progress.done + 1, progress.total),
                    total: progress.total,
                  })}
                </p>
              </>
            ) : (
              <Button variant="primary" onClick={() => void run()} disabled={Boolean(tooBig)}>
                {t('doc.translate')}
              </Button>
            )}
            {result && (
              <Button variant="secondary" onClick={download}>
                <Download /> {t('doc.download', { name: result.name })}
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section
              aria-label={t('doc.original')}
              className="border-line bg-surface relative max-h-[60vh] overflow-y-auto rounded-2xl border p-5"
            >
              <div className="bg-source absolute inset-x-5 top-0 h-0.5 rounded-full" aria-hidden />
              <h2 className="spec text-muted mb-3">{t('doc.original')}</h2>
              <p className="text-sm whitespace-pre-wrap" dir="auto">
                {doc.text.slice(0, 20000)}
              </p>
            </section>
            <section
              aria-label={t('doc.translated')}
              className="border-line bg-surface relative max-h-[60vh] overflow-y-auto rounded-2xl border p-5"
            >
              <div
                className="bg-line absolute inset-x-5 top-0 h-0.5 overflow-hidden rounded-full"
                aria-hidden
              >
                {/* The marigold line moves along as parts finish. */}
                <div
                  className="bg-accent h-full transition-[width] duration-500"
                  style={{
                    width: result
                      ? '100%'
                      : progress
                        ? `${(progress.done / progress.total) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <h2 className="spec text-muted mb-3">{t('doc.translated')}</h2>
              <p className="font-display text-base whitespace-pre-wrap" dir="auto" lang={s.to}>
                {result?.text.slice(0, 20000)}
              </p>
            </section>
          </div>
        </>
      )}
      {!doc && error && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {error}
        </p>
      )}
    </AppPage>
  )
}
