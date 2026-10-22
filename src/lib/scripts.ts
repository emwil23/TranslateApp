/** Writing systems by Unicode block, for guessing a language without a detector and loading its font. */
const SCRIPTS: { re: RegExp; lang: string; font?: () => Promise<unknown> }[] = [
  { re: /[぀-ヿ]/, lang: 'ja', font: () => import('@fontsource-variable/noto-sans-jp') },
  { re: /[가-힯ᄀ-ᇿ]/, lang: 'ko', font: () => import('@fontsource-variable/noto-sans-kr') },
  { re: /[一-鿿]/, lang: 'zh', font: () => import('@fontsource-variable/noto-sans-sc') },
  { re: /[؀-ۿݐ-ݿ]/, lang: 'ar', font: () => import('@fontsource-variable/noto-naskh-arabic') },
  { re: /[֐-׿]/, lang: 'he', font: () => import('@fontsource-variable/noto-sans-hebrew') },
  { re: /[ঀ-৿]/, lang: 'bn', font: () => import('@fontsource-variable/noto-sans-bengali') },
  { re: /[஀-௿]/, lang: 'ta', font: () => import('@fontsource-variable/noto-sans-tamil') },
  { re: /[฀-๿]/, lang: 'th', font: () => import('@fontsource-variable/noto-sans-thai') },
  { re: /[ऀ-ॿ]/, lang: 'hi' },
  { re: /[਀-੿]/, lang: 'pa' },
  { re: /[઀-૿]/, lang: 'gu' },
  { re: /[ఀ-౿]/, lang: 'te' },
  { re: /[ಀ-೿]/, lang: 'kn' },
  { re: /[ഀ-ൿ]/, lang: 'ml' },
  { re: /[Ѐ-ӿ]/, lang: 'ru' },
  { re: /[Ͱ-Ͽ]/, lang: 'el' },
  { re: /[Ⴀ-ჿ]/, lang: 'ka' },
  { re: /[԰-֏]/, lang: 'hy' },
]

/**
 * A language guess from the script alone ("こんにちは" → "ja"). Latin text gives null: many languages share
 * it, so that is left to the detector or the AI.
 */
export function guessFromScript(text: string): string | null {
  return SCRIPTS.find((s) => s.re.test(text))?.lang ?? null
}

const loaded = new Set<number>()

/** Loads the Noto fonts for every script in `text` that isn't loaded yet. */
export function loadFontsFor(text: string) {
  SCRIPTS.forEach((s, i) => {
    if (s.font && !loaded.has(i) && s.re.test(text)) {
      loaded.add(i)
      void s.font()
    }
  })
}

// Font for a target language, loaded before its output arrives.
const LANG_SAMPLE: Record<string, string> = {
  ja: 'あ',
  ko: '가',
  zh: '中',
  'zh-Hant': '中',
  ar: 'ا',
  fa: 'ا',
  ur: 'ا',
  ps: 'ا',
  sd: 'ا',
  ug: 'ا',
  he: 'א',
  yi: 'א',
  bn: 'অ',
  as: 'অ',
  ta: 'அ',
  th: 'ก',
}
export const loadFontForLang = (code: string) => loadFontsFor(LANG_SAMPLE[code] ?? '')
