/**
 * Splits text into chunks of at most `max` characters for translation, at paragraph breaks where
 * possible, then sentence ends, then spaces. Joining the chunks gives back the original text exactly.
 */
export function chunkText(text: string, max = 1800): string[] {
  const chunks: string[] = []
  let rest = text
  while (rest.length > max) {
    const window = rest.slice(0, max)
    const cut =
      lastBreak(window, /\n\s*\n/g) ??
      lastBreak(window, /\n/g) ??
      lastBreak(window, /[.!?।。！？]\s+/g) ??
      lastBreak(window, /\s+/g) ??
      max
    chunks.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  if (rest) chunks.push(rest)
  return chunks
}

/** End index of the last match of `re` in `s`, or null when there is none past the first quarter. */
function lastBreak(s: string, re: RegExp): number | null {
  let end: number | null = null
  for (const m of s.matchAll(re)) end = m.index + m[0].length
  return end !== null && end > s.length / 4 ? end : null
}

export interface Cue {
  index: string
  time: string
  text: string
}

/** Reads an .srt file into cues; timings are kept as they are. */
export function parseSrt(srt: string): Cue[] {
  return srt
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const [index = '', time = '', ...lines] = block.split('\n')
      return { index: index.trim(), time: time.trim(), text: lines.join('\n') }
    })
    .filter((c) => c.time.includes('-->'))
}

export const formatSrt = (cues: Cue[]) =>
  cues.map((c) => `${c.index}\n${c.time}\n${c.text}`).join('\n\n') + '\n'

/** Groups items into batches whose joined text stays under `max` characters (one item may exceed it). */
export function batchBy<T>(items: T[], text: (item: T) => string, max = 1800): T[][] {
  const batches: T[][] = []
  let current: T[] = []
  let size = 0
  for (const item of items) {
    const len = text(item).length
    if (current.length && size + len > max) {
      batches.push(current)
      current = []
      size = 0
    }
    current.push(item)
    size += len + 1
  }
  if (current.length) batches.push(current)
  return batches
}
