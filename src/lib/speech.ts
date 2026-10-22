/** The browser's own speech synthesis and recognition: free, and on the device where the OS supports it. */

export const canSpeak = () => typeof speechSynthesis !== 'undefined'

/** Picks the best installed voice for a language: an exact match, then the same base language. */
function voiceFor(lang: string): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices()
  const base = (lang.split('-')[0] ?? lang).toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().split(/[-_]/)[0] === base)
  )
}

export function speak(text: string, lang: string, onEnd?: () => void) {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  const voice = voiceFor(lang)
  if (voice) u.voice = voice
  if (onEnd) {
    u.onend = onEnd
    u.onerror = onEnd
  }
  speechSynthesis.speak(u)
}

export const stopSpeaking = () => canSpeak() && speechSynthesis.cancel()

interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
export interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

const Ctor = (): RecognitionCtor | undefined => {
  const w = globalThis as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const canListen = () => Boolean(Ctor())

/** Starts listening in `lang`; `onText` gets the transcript so far, `final` once speech ends. */
export function listen(
  lang: string,
  onText: (text: string, final: boolean) => void,
  onEnd: (error?: string) => void,
): Recognition | null {
  const C = Ctor()
  if (!C) return null
  const r = new C()
  r.lang = lang
  r.interimResults = true
  r.continuous = false
  let text = ''
  r.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (!res) continue
      if (res.isFinal) text += res[0].transcript
      else interim += res[0].transcript
    }
    onText((text + interim).trim(), false)
  }
  r.onerror = (e) => onEnd(e.error)
  r.onend = () => {
    if (text.trim()) onText(text.trim(), true)
    onEnd()
  }
  r.start()
  return r
}
