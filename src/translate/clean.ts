/**
 * Undoes the ways a small model sometimes wraps a translation: in our own <data> tags, as a JSON string
 * ("…"), or as the JSON object it was given ({"text": …}). Plain replies pass through unchanged.
 */
export function cleanReply(reply: string, source: string): string {
  let s = reply
    .trim()
    .replace(/^<data>\s*/, '')
    .replace(/\s*<\/data>$/, '')
  if (s.startsWith('{') || (s.startsWith('"') && !source.trim().startsWith('"'))) {
    try {
      const parsed = JSON.parse(s) as unknown
      if (typeof parsed === 'string') s = parsed
      else if (
        parsed &&
        typeof parsed === 'object' &&
        'text' in parsed &&
        typeof parsed.text === 'string'
      )
        s = parsed.text
    } catch {
      // Still streaming, or not JSON after all: show it as it is.
    }
  }
  return s
}
