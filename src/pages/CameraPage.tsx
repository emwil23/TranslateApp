import { AppPage } from '@/components/AppPage'
import { LanguagePicker } from '@/components/LanguagePicker'
import { Button } from '@/components/ui/button'
import { useErrorText, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { db } from '@/lib/db'
import { loadFontForLang } from '@/lib/scripts'
import { useSettings } from '@/stores/settings'
import { translateAll } from '@/translate/engine'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ImageUp, Languages, RotateCcw, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Languages Tesseract can read, with its own codes. Its trained data downloads on first use. */
const OCR: { code: string; tess: string; name: string }[] = [
  { code: 'en', tess: 'eng', name: 'English' },
  { code: 'hi', tess: 'hin', name: 'हिन्दी Hindi' },
  { code: 'es', tess: 'spa', name: 'Español' },
  { code: 'fr', tess: 'fra', name: 'Français' },
  { code: 'de', tess: 'deu', name: 'Deutsch' },
  { code: 'it', tess: 'ita', name: 'Italiano' },
  { code: 'pt', tess: 'por', name: 'Português' },
  { code: 'nl', tess: 'nld', name: 'Nederlands' },
  { code: 'tr', tess: 'tur', name: 'Türkçe' },
  { code: 'ru', tess: 'rus', name: 'Русский' },
  { code: 'uk', tess: 'ukr', name: 'Українська' },
  { code: 'ar', tess: 'ara', name: 'العربية' },
  { code: 'ur', tess: 'urd', name: 'اردو' },
  { code: 'bn', tess: 'ben', name: 'বাংলা' },
  { code: 'ta', tess: 'tam', name: 'தமிழ்' },
  { code: 'mr', tess: 'mar', name: 'मराठी' },
  { code: 'th', tess: 'tha', name: 'ไทย' },
  { code: 'vi', tess: 'vie', name: 'Tiếng Việt' },
  { code: 'zh', tess: 'chi_sim', name: '简体中文' },
  { code: 'zh-Hant', tess: 'chi_tra', name: '繁體中文' },
  { code: 'ja', tess: 'jpn', name: '日本語' },
  { code: 'ko', tess: 'kor', name: '한국어' },
]

interface Line {
  text: string
  box: { x: number; y: number; w: number; h: number }
  translated?: string
}

export function CameraPage() {
  const t = useT()
  const s = useSettings()
  const [ocrLang, setOcrLang] = useState(OCR.find((o) => o.code === s.from)?.code ?? 'en')
  const [image, setImage] = useState<{ url: string; w: number; h: number } | null>(null)
  const [lines, setLines] = useState<Line[] | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [allowAi, setAllowAi] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const errorText = useErrorText()
  const fileRef = useRef<HTMLInputElement>(null)
  const terms = useLiveQuery(() => db.terms.toArray(), []) ?? []

  useEffect(() => loadFontForLang(s.to), [s.to])
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url)
    },
    [image],
  )

  const read = async (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.src = url
    await img.decode()
    setImage({ url, w: img.naturalWidth, h: img.naturalHeight })
    setLines(null)
    setSelected(null)
    setError(null)
    setProgress(0)
    // Tesseract (WebAssembly) runs in a worker on this device; the photo never leaves it.
    const { createWorker } = await import('tesseract.js')
    const tess = OCR.find((o) => o.code === ocrLang)?.tess ?? 'eng'
    const worker = await createWorker(tess, 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') setProgress(m.progress)
      },
    })
    try {
      const { data } = await worker.recognize(blob, {}, { blocks: true })
      const found =
        data.blocks
          ?.flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
          .filter((l) => l.confidence > 40 && l.text.trim().length > 1)
          .map((l) => ({
            text: l.text.trim(),
            box: { x: l.bbox.x0, y: l.bbox.y0, w: l.bbox.x1 - l.bbox.x0, h: l.bbox.y1 - l.bbox.y0 },
          })) ?? []
      setLines(found)
    } catch {
      setError(t('cam.none'))
    } finally {
      setProgress(null)
      await worker.terminate()
    }
  }

  const translateLines = async (indexes: number[]) => {
    if (!lines) return
    setError(null)
    const signal = AbortSignal.timeout(90_000)
    // One request for several lines keeps AI calls down; the line breaks map results back.
    const text = indexes.map((i) => lines[i]?.text ?? '').join('\n')
    try {
      const { text: out } = await translateAll(
        { text, from: ocrLang, to: s.to, tone: 'plain', terms },
        signal,
        { allowAi, action: indexes.length > 1 ? 'document' : 'translate' },
      )
      const parts = indexes.length > 1 ? out.split('\n') : [out]
      setLines(
        (all) =>
          all?.map((l, i) => {
            const at = indexes.indexOf(i)
            return at >= 0 ? { ...l, translated: parts[at] ?? l.translated } : l
          }) ?? null,
      )
    } catch (e) {
      setError(errorText(e))
    }
  }

  const reset = () => {
    setImage(null)
    setLines(null)
    setSelected(null)
  }

  return (
    <AppPage title={t('cam.title')} lead={t('cam.lead')} wide>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="text-muted mb-1 block">{t('cam.script')}</span>
          <select
            value={ocrLang}
            onChange={(e) => setOcrLang(e.target.value)}
            className="border-line bg-surface h-10 rounded-full border px-4 text-sm"
          >
            {OCR.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm">
          <span className="text-muted mb-1 block">{t('ws.to')}</span>
          <LanguagePicker
            label={t('ws.to')}
            value={s.to}
            onChange={(to) => s.set({ to })}
            className="border-line bg-surface border"
          />
        </div>
        <label
          className="text-muted flex items-center gap-2 pb-2 text-sm"
          title={t('doc.allowAiHint')}
        >
          <input
            type="checkbox"
            checked={allowAi}
            onChange={(e) => setAllowAi(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          {t('doc.allowAi')}
        </label>
      </div>

      <p className="text-muted mb-6 flex items-center gap-2 text-xs">
        <ShieldCheck className="text-source size-4 shrink-0" aria-hidden />
        {allowAi ? t('ai.private') : t('ws.engine.deviceHint')}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void read(f)
          e.target.value = ''
        }}
      />

      {live ? (
        <Viewfinder
          onShot={(blob) => {
            setLive(false)
            void read(blob)
          }}
          onCancel={() => setLive(false)}
        />
      ) : !image ? (
        <div className="border-line grid grid-cols-1 gap-6 rounded-3xl border border-dashed p-8 md:grid-cols-[1fr_auto] md:items-center">
          <img
            src="/media/mode-camera.webp"
            alt=""
            width={720}
            height={540}
            className="w-full max-w-md rounded-2xl"
          />
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                'mediaDevices' in navigator && matchMedia('(pointer: fine)').matches
                  ? setLive(true)
                  : fileRef.current?.click()
              }
            >
              <Camera /> {t('cam.take')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                fileRef.current?.removeAttribute('capture')
                fileRef.current?.click()
                fileRef.current?.setAttribute('capture', 'environment')
              }}
            >
              <ImageUp /> {t('cam.upload')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="relative overflow-hidden rounded-2xl">
            <img src={image.url} alt="" className="w-full" />
            {/* Boxes drawn in the photo's own pixel space, so they scale with it. */}
            <svg
              viewBox={`0 0 ${image.w} ${image.h}`}
              className="absolute inset-0 size-full"
              aria-hidden
            >
              {lines?.map((l, i) => (
                <rect
                  key={i}
                  x={l.box.x - 4}
                  y={l.box.y - 4}
                  width={l.box.w + 8}
                  height={l.box.h + 8}
                  rx={6}
                  className={cn(
                    'cursor-pointer fill-transparent stroke-[3]',
                    selected === i ? 'stroke-[var(--accent)]' : 'stroke-[var(--source)]',
                  )}
                  onClick={() => {
                    setSelected(i)
                    if (!l.translated) void translateLines([i])
                  }}
                />
              ))}
            </svg>
            {progress !== null && (
              <div className="bg-bg/70 absolute inset-0 grid place-items-center backdrop-blur-sm">
                <p className="spec" role="status">
                  {t('cam.reading', { pct: Math.round(progress * 100) })}
                </p>
              </div>
            )}
          </div>
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {lines && lines.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void translateLines(lines.map((_, i) => i))}
                >
                  <Languages /> {t('cam.all')}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={reset}>
                <RotateCcw /> {t('cam.again')}
              </Button>
            </div>
            {lines && (
              <p className="text-muted mb-3 text-sm" role="status">
                {lines.length ? t('cam.found', { n: lines.length }) : t('cam.none')}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="border-danger/30 bg-danger/10 text-danger mb-3 rounded-xl border p-3 text-sm"
              >
                {error}
              </p>
            )}
            <ol className="flex flex-col gap-1">
              {lines?.map((l, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(i)
                      if (!l.translated) void translateLines([i])
                    }}
                    aria-pressed={selected === i}
                    className={cn(
                      'hang hover:bg-surface-2 w-full rounded-lg px-3 py-2 text-start',
                      selected === i && 'border-accent',
                    )}
                  >
                    <span className="text-muted block text-sm" lang={ocrLang} dir="auto">
                      {l.text}
                    </span>
                    {l.translated && (
                      <span className="font-display block text-lg" lang={s.to} dir="auto">
                        {l.translated}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </AppPage>
  )
}

/** A live camera preview with a shutter, for desktops and laptops. Phones use the native camera instead. */
function Viewfinder({ onShot, onCancel }: { onShot: (b: Blob) => void; onCancel: () => void }) {
  const t = useT()
  const video = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } })
      .then((s) => {
        stream = s
        if (video.current) video.current.srcObject = s
      })
      .catch(() => setFailed(true))
    return () => stream?.getTracks().forEach((tr) => tr.stop())
  }, [])

  const shoot = () => {
    const v = video.current
    if (!v) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    c.toBlob((b) => b && onShot(b), 'image/jpeg', 0.92)
  }

  if (failed)
    return (
      <div className="hang-accent">
        <p className="text-danger" role="alert">
          {t('cam.unavailable')}
        </p>
        <Button variant="secondary" className="mt-3" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    )
  return (
    <div className="relative overflow-hidden rounded-3xl bg-black">
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        className="max-h-[70vh] w-full object-contain"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-5">
        <Button variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <button
          type="button"
          onClick={shoot}
          aria-label={t('cam.take')}
          className="bg-accent ring-accent/40 size-16 rounded-full ring-8"
        />
      </div>
    </div>
  )
}
