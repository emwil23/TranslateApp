import type { ActionInputs, ActionName, ActionOutputs } from '@/ai/actions'
import { jsonLines } from '@/ai/lines'
import { providerById } from '@/ai/providers'
import { protectTerms, termsFor, termsIn, type Term } from '@/lib/glossary'
import { guessFromScript } from '@/lib/scripts'
import { needsAi, type Tone } from '@/lib/tones'
import { useSettings } from '@/stores/settings'
import { cleanReply } from './clean'
import { detectOnDevice, deviceAvailability, translateOnDevice } from './device'

export class NoProviderError extends Error {
  constructor() {
    super('Pick an AI provider in Settings to use tones, explanations and alternatives.')
  }
}

/** Streams an AI text action through the provider picked in Settings: the whole text so far, each time. */
export async function* aiText<A extends ActionName>(
  action: A,
  input: ActionInputs[A],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const provider = providerById(useSettings.getState().provider)
  if (!provider) throw new NoProviderError()
  let all = ''
  for await (const chunk of provider.run(action, input, signal)) {
    all += chunk
    if (all.includes('[[error]]')) throw new Error('The AI stopped partway. Please try again.')
    // The server's keep-alive blank lines come before the first word.
    yield all.trimStart()
  }
}

/** Runs a JSON Lines AI action and returns its items. */
export async function aiLines<A extends ActionName>(
  action: A,
  input: ActionInputs[A],
  signal: AbortSignal,
): Promise<ActionOutputs[A][]> {
  const provider = providerById(useSettings.getState().provider)
  if (!provider) throw new NoProviderError()
  const out: ActionOutputs[A][] = []
  for await (const item of jsonLines<ActionOutputs[A]>(provider.run(action, input, signal)))
    out.push(item)
  return out
}

/** The source language: the detector's answer in Chrome, the script elsewhere, or "auto" for the AI. */
export async function resolveSource(text: string, from: string): Promise<string> {
  if (from !== 'auto') return from
  return (await detectOnDevice(text)) ?? guessFromScript(text) ?? 'auto'
}

export interface TranslateRequest {
  text: string
  from: string
  to: string
  tone: Tone
  respect?: string
  terms: Term[]
}

export type TranslateEvent =
  | { type: 'source'; code: string }
  | { type: 'engine'; engine: 'device' | 'ai' }
  | { type: 'download'; fraction: number }
  | { type: 'text'; text: string }

export class DeviceOnlyError extends Error {
  constructor() {
    super(
      "This browser can't translate this pair on your device. Allow the AI server or your own provider to continue.",
    )
  }
}

export interface TranslateOptions {
  /** Documents use their own prompt, which keeps the line count. */
  action?: 'translate' | 'document'
  /** Documents and camera text stay on the device unless the user allows AI for them. */
  allowAi?: boolean
}

/**
 * Translates with the cheapest engine that can do the job: Chrome's on-device translator for plain
 * translations, AI for tones and respect levels (and wherever there is no on-device translator).
 */
export async function* translate(
  req: TranslateRequest,
  signal: AbortSignal,
  { action = 'translate', allowAi = true }: TranslateOptions = {},
): AsyncGenerator<TranslateEvent> {
  const from = await resolveSource(req.text, req.from)
  yield { type: 'source', code: from }
  const terms = termsFor(req.terms, req.to)
  const { preferDevice } = useSettings.getState()

  const device =
    (preferDevice || !allowAi) &&
    (!allowAi || !needsAi(req.tone, req.respect)) &&
    from !== 'auto' &&
    from !== req.to
      ? await deviceAvailability(from, req.to)
      : 'unavailable'

  if (device !== 'unavailable') {
    yield { type: 'engine', engine: 'device' }
    const protectedText = protectTerms(req.text, terms)
    let all = ''
    const downloads: number[] = []
    const stream = translateOnDevice(protectedText.text, from, req.to, signal, (f) =>
      downloads.push(f),
    )
    for await (const chunk of stream) {
      for (const fraction of downloads.splice(0)) yield { type: 'download', fraction }
      all += chunk
      yield { type: 'text', text: protectedText.restore(all) }
    }
    return
  }

  if (from === req.to) {
    yield { type: 'text', text: req.text }
    return
  }

  if (!allowAi) throw new DeviceOnlyError()
  yield { type: 'engine', engine: 'ai' }
  const input = {
    text: req.text,
    from,
    to: req.to,
    tone: req.tone,
    ...(req.respect && { respect: req.respect }),
    terms: termsIn(req.text, terms).map(({ source, target }) => ({ source, target })),
  }
  for await (const text of aiText(action, input, signal))
    yield { type: 'text', text: cleanReply(text, req.text) }
}

/** Runs a translation to the end and returns the result; for batch work like documents and camera text. */
export async function translateAll(
  req: TranslateRequest,
  signal: AbortSignal,
  options?: TranslateOptions,
): Promise<{ text: string; engine: 'device' | 'ai'; from: string }> {
  let text = ''
  let engine: 'device' | 'ai' = 'ai'
  let from = req.from
  for await (const e of translate(req, signal, options)) {
    if (e.type === 'text') text = e.text
    else if (e.type === 'engine') engine = e.engine
    else if (e.type === 'source') from = e.code
  }
  return { text, engine, from }
}
