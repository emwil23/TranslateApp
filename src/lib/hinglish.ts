/**
 * Hindi ↔ Hinglish (Hindi in Latin letters, the way people type it on WhatsApp).
 * Rule-based and on-device: "क्या हाल है" → "kya haal hai", and back.
 */

const VOWELS: Record<string, string> = {
  अ: 'a',
  आ: 'aa',
  इ: 'i',
  ई: 'ee',
  उ: 'u',
  ऊ: 'oo',
  ऋ: 'ri',
  ए: 'e',
  ऐ: 'ai',
  ओ: 'o',
  औ: 'au',
  ऑ: 'o',
}
const MATRAS: Record<string, string> = {
  'ा': 'aa',
  'ि': 'i',
  'ी': 'ee',
  'ु': 'u',
  'ू': 'oo',
  'ृ': 'ri',
  'े': 'e',
  'ै': 'ai',
  'ो': 'o',
  'ौ': 'au',
  'ॉ': 'o',
}
const CONSONANTS: Record<string, string> = {
  क: 'k',
  ख: 'kh',
  ग: 'g',
  घ: 'gh',
  ङ: 'n',
  च: 'ch',
  छ: 'chh',
  ज: 'j',
  झ: 'jh',
  ञ: 'n',
  ट: 't',
  ठ: 'th',
  ड: 'd',
  ढ: 'dh',
  ण: 'n',
  त: 't',
  थ: 'th',
  द: 'd',
  ध: 'dh',
  न: 'n',
  प: 'p',
  फ: 'ph',
  ब: 'b',
  भ: 'bh',
  म: 'm',
  य: 'y',
  र: 'r',
  ल: 'l',
  व: 'v',
  श: 'sh',
  ष: 'sh',
  स: 's',
  ह: 'h',
  क़: 'q',
  ख़: 'kh',
  ग़: 'gh',
  ज़: 'z',
  ड़: 'd',
  ढ़: 'dh',
  फ़: 'f',
  ळ: 'l',
}
for (const [k, v] of Object.entries(CONSONANTS)) CONSONANTS[k.normalize('NFC')] = v
const VIRAMA = '्'
const NUKTA = '़'
const OTHER: Record<string, string> = {
  'ं': 'n',
  'ँ': 'n',
  'ः': 'h',
  '।': '.',
  '॥': '.',
  ॐ: 'om',
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
}

const isDevanagari = (ch: string) => ch >= 'ऀ' && ch <= 'ॿ' && ch !== '।' && ch !== '॥'

const SCHWA = 'a'
const SHORT: Record<string, string> = { aa: 'a', ee: 'i', oo: 'u' }
/** One syllable-ish unit: a consonant (or nothing, for an independent vowel) and the vowel it carries. */
interface Unit {
  cons: string
  /** '' after a virama (part of a conjunct), `null` once a silent schwa is dropped. */
  vowel: string | null
  schwa: boolean
  nasal: string
}

/** Devanagari → Hinglish, dropping silent schwas the way people write it: "समझना" → "samajhna". */
export function toHinglish(text: string): string {
  let out = ''
  let word: string[] = []
  const flush = () => {
    if (word.length) out += wordToLatin(word)
    word = []
  }
  for (const ch of text.normalize('NFC')) {
    if (ch === NUKTA && word.length) word.push((word.pop() ?? '') + ch)
    else if (isDevanagari(ch) && !(ch in OTHER && /[०-९ॐ]/.test(ch))) word.push(ch)
    else {
      flush()
      out += OTHER[ch] ?? ch
    }
  }
  flush()
  return out
}

function wordToLatin(chars: string[]): string {
  const units: Unit[] = []
  for (const ch of chars) {
    const last = units.at(-1)
    const [cons, matra, vowel, other] = [CONSONANTS[ch], MATRAS[ch], VOWELS[ch], OTHER[ch]]
    if (cons !== undefined) units.push({ cons, vowel: SCHWA, schwa: true, nasal: '' })
    else if (ch === VIRAMA && last) Object.assign(last, { vowel: '', schwa: false })
    else if (matra !== undefined && last) Object.assign(last, { vowel: matra, schwa: false })
    else if (vowel !== undefined) units.push({ cons: '', vowel, schwa: false, nasal: '' })
    else if (other !== undefined && last) last.nasal += other
  }
  const n = units.length
  const last = units[n - 1]
  // The final schwa is silent, except in one-letter words ("न") and after a conjunct ("मित्र" → "mitra").
  if (last?.schwa && n > 1 && units[n - 2]?.vowel !== '' && !last.nasal) last.vowel = null
  // Medial schwas, right to left: silent between two vowel-carrying syllables, never two in a row.
  for (let i = n - 2; i >= 1; i--) {
    const [prev, u, next] = [units[i - 1], units[i], units[i + 1]]
    if (!prev || !u || !next) continue
    // A nasal syllable before it keeps it: "ज़िंदगी" → "zindagi".
    if (u.schwa && !u.nasal && !prev.nasal && next.cons && next.vowel && prev.vowel) u.vowel = null
  }
  // Typed Hinglish shortens long vowels at the end of a word: "क्या" → "kya", "नहीं" → "nahin".
  if (last?.vowel) last.vowel = SHORT[last.vowel] ?? last.vowel
  return units.map((u) => u.cons + (u.vowel ?? '') + u.nasal).join('')
}

// Latin → Devanagari: longest match first.
const L_CONS: [string, string][] = Object.entries({
  chh: 'छ',
  kh: 'ख',
  gh: 'घ',
  ch: 'च',
  jh: 'झ',
  th: 'थ',
  dh: 'ध',
  ph: 'फ',
  bh: 'भ',
  sh: 'श',
  k: 'क',
  g: 'ग',
  c: 'क',
  j: 'ज',
  t: 'त',
  d: 'द',
  n: 'न',
  p: 'प',
  f: 'फ़',
  b: 'ब',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  w: 'व',
  s: 'स',
  h: 'ह',
  q: 'क़',
  z: 'ज़',
  x: 'क्स',
}).sort((a, b) => b[0].length - a[0].length)
const L_VOWELS: [string, string, string][] = (
  [
    ['aa', 'आ', 'ा'],
    ['ai', 'ऐ', 'ै'],
    ['au', 'औ', 'ौ'],
    ['ee', 'ई', 'ी'],
    ['ii', 'ई', 'ी'],
    ['oo', 'ऊ', 'ू'],
    ['uu', 'ऊ', 'ू'],
    ['a', 'अ', ''],
    ['i', 'इ', 'ि'],
    ['u', 'उ', 'ु'],
    ['e', 'ए', 'े'],
    ['o', 'ओ', 'ो'],
  ] as [string, string, string][]
).sort((a, b) => b[0].length - a[0].length)

/** Hinglish → Devanagari, word by word. Ambiguous spellings get the most common reading. */
export function fromHinglish(text: string): string {
  return text.replace(/[A-Za-z]+/g, (word) => wordToDevanagari(word.toLowerCase()))
}

function wordToDevanagari(word: string): string {
  let out = ''
  let i = 0
  let afterConsonant = false
  while (i < word.length) {
    const rest = word.slice(i)
    const cons = L_CONS.find(([l]) => rest.startsWith(l))
    if (cons) {
      // Two consonants in a row join with a virama: "kya" → क्या.
      if (afterConsonant) out += VIRAMA
      out += cons[1]
      i += cons[0].length
      afterConsonant = true
      continue
    }
    const vowel = L_VOWELS.find(([l]) => rest.startsWith(l))
    if (vowel) {
      out += afterConsonant ? vowel[2] : vowel[1]
      i += vowel[0].length
      afterConsonant = false
      continue
    }
    out += word.charAt(i)
    i++
    afterConsonant = false
  }
  // Typed Hinglish ends words in a short letter for a long vowel: "kya" → क्या, "bhi" → भी.
  if (/[^aeiou]a$/.test(word) && /(?:[क-ह]|़)$/u.test(out)) out += 'ा'
  out = out.replace(/ि$/u, 'ी')
  // A final "n" after a vowel is usually nasal: "main" → मैं, "hain" → हैं.
  return out.replace(/([ािीुूेैोौ])न$/u, '$1ं')
}
