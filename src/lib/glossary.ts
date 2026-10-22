export interface Term {
  id: string
  /** The term as written in the source text. */
  source: string
  /** How it must always come out. Same as `source` for names and brand words that stay as they are. */
  target: string
  /** Applies only into this language; empty means every language. */
  to: string
  note?: string
  createdAt: number
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Terms that apply to a translation into `to`, longest first so "New York Times" wins over "New York". */
export function termsFor(terms: Term[], to: string): Term[] {
  return terms
    .filter((t) => t.source.trim() && (!t.to || t.to === to || t.to === to.split('-')[0]))
    .sort((a, b) => b.source.length - a.source.length)
}

// Unicode-aware word edges (letters, combining marks such as Devanagari vowel signs, digits), so "Pro"
// doesn't match inside "Product".
const edge = (term: string) =>
  new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escape(term)}(?![\\p{L}\\p{M}\\p{N}])`, 'giu')

/**
 * Hides glossary terms behind numbered placeholders before an on-device translation, which can't be told
 * about a glossary. `restore` puts each term's fixed target back afterwards.
 */
export function protectTerms(text: string, terms: Term[]) {
  const used: Term[] = []
  let out = text
  for (const t of terms) {
    out = out.replace(edge(t.source), () => {
      let i = used.indexOf(t)
      if (i < 0) i = used.push(t) - 1
      return `⟦${i}⟧`
    })
  }
  return {
    text: out,
    used,
    restore: (translated: string) =>
      // Translators sometimes add spaces inside the brackets; accept those too.
      translated.replace(/⟦\s*(\d+)\s*⟧/g, (m, n: string) => used[Number(n)]?.target ?? m),
  }
}

/** The terms that actually occur in `text`, for the AI prompt. */
export const termsIn = (text: string, terms: Term[]) =>
  terms.filter((t) => edge(t.source).test(text))
