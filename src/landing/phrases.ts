/** The phrase the hero globe spells, one language after another. */
interface Phrase {
  text: string
  lang: string
  label: string
  font: string
}

export const PHRASES: [Phrase, ...Phrase[]] = [
  { text: 'How are you?', lang: 'en', label: 'English', font: '"Fraunces Variable", serif' },
  {
    text: 'आप कैसे हैं?',
    lang: 'hi',
    label: 'हिन्दी · Hindi',
    font: '"Noto Serif Devanagari Variable", serif',
  },
  {
    text: 'Aap kaise hain?',
    lang: 'hi-Latn',
    label: 'Hinglish',
    font: '"Fraunces Variable", serif',
  },
  {
    text: 'كيف حالك؟',
    lang: 'ar',
    label: 'العربية · Arabic',
    font: '"Noto Naskh Arabic Variable", serif',
  },
  {
    text: 'お元気ですか？',
    lang: 'ja',
    label: '日本語 · Japanese',
    font: '"Noto Sans JP Variable", sans-serif',
  },
  {
    text: '¿Cómo estás?',
    lang: 'es',
    label: 'Español · Spanish',
    font: '"Fraunces Variable", serif',
  },
]
