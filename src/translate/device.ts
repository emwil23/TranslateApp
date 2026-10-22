/**
 * Chrome's built-in Translator and Language Detector APIs (Chrome 138+ on desktop): free, private and
 * offline once a language pack is downloaded. Other browsers don't have them and fall back to AI.
 * https://developer.chrome.com/docs/ai/translator-api
 */

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available'

interface Monitor {
  addEventListener: (type: 'downloadprogress', cb: (e: { loaded: number }) => void) => void
}
interface TranslatorInstance {
  translate: (text: string, opts?: { signal?: AbortSignal }) => Promise<string>
  translateStreaming: (text: string, opts?: { signal?: AbortSignal }) => ReadableStream<string>
  destroy: () => void
}
interface DetectorInstance {
  detect: (text: string) => Promise<{ detectedLanguage: string; confidence: number }[]>
}
declare global {
  var Translator:
    | {
        availability: (o: {
          sourceLanguage: string
          targetLanguage: string
        }) => Promise<Availability>
        create: (o: {
          sourceLanguage: string
          targetLanguage: string
          monitor?: (m: Monitor) => void
          signal?: AbortSignal
        }) => Promise<TranslatorInstance>
      }
    | undefined
  var LanguageDetector:
    | {
        availability: () => Promise<Availability>
        create: (o?: { monitor?: (m: Monitor) => void }) => Promise<DetectorInstance>
      }
    | undefined
}

/** Resolves to `fallback` if `p` takes longer than `ms`: these APIs can stall while a model downloads. */
const within = <T>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])

export const hasDeviceTranslator = () => typeof globalThis.Translator !== 'undefined'
export const hasDeviceDetector = () => typeof globalThis.LanguageDetector !== 'undefined'

// Chrome expects plain language codes; our list has a few script variants.
const deviceCode = (code: string) => (code === 'zh-Hant' ? code : (code.split('-')[0] ?? code))

export async function deviceAvailability(from: string, to: string): Promise<Availability> {
  if (!globalThis.Translator || from === 'auto') return 'unavailable'
  try {
    return await within(
      globalThis.Translator.availability({
        sourceLanguage: deviceCode(from),
        targetLanguage: deviceCode(to),
      }),
      2000,
      'unavailable',
    )
  } catch {
    return 'unavailable'
  }
}

const cache = new Map<string, Promise<TranslatorInstance>>()

/**
 * Translates on the device, downloading the language pack on first use (Chrome only allows that after a
 * click or key press, which is always how a translation starts here).
 */
export async function* translateOnDevice(
  text: string,
  from: string,
  to: string,
  signal: AbortSignal,
  onDownload?: (fraction: number) => void,
): AsyncGenerator<string> {
  const T = globalThis.Translator
  if (!T) throw new Error('This browser has no on-device translator.')
  const key = `${from}>${to}`
  let translator = cache.get(key)
  if (!translator) {
    translator = T.create({
      sourceLanguage: deviceCode(from),
      targetLanguage: deviceCode(to),
      monitor: (m) => m.addEventListener('downloadprogress', (e) => onDownload?.(e.loaded)),
    })
    cache.set(key, translator)
    translator.catch(() => cache.delete(key))
  }
  const t = await translator
  const reader = t.translateStreaming(text, { signal }).getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    yield value
  }
}

let detector: Promise<DetectorInstance> | null = null

/** The most likely language of `text`, or null when unsure or unsupported. */
export async function detectOnDevice(text: string): Promise<string | null> {
  const D = globalThis.LanguageDetector
  if (!D || text.trim().length < 3) return null
  try {
    // Only use a detector that's ready; a download would hold up the translation.
    if ((await within(D.availability(), 1000, 'unavailable')) !== 'available') {
      // Start the download in the background (this runs after a key press, which Chrome requires).
      detector ??= D.create()
      detector.catch(() => (detector = null))
      return null
    }
    detector ??= D.create()
    const result = await within((await detector).detect(text), 1500, [])
    const [best] = result
    return best && best.confidence > 0.5 && best.detectedLanguage !== 'und'
      ? best.detectedLanguage
      : null
  } catch {
    detector = null
    return null
  }
}
