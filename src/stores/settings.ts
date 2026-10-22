import type { Tone } from '@/lib/tones'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'dark' | 'light'
export type ProviderId = 'ew' | 'puter' | 'openrouter' | 'own'
export type UiLang = 'en' | 'hi'

export interface Settings {
  theme: Theme
  /** The interface language. */
  ui: UiLang
  provider: ProviderId | null
  /** From OpenRouter's PKCE sign-in. Kept only in this browser. */
  openrouterKey: string | null
  openrouterModel: string
  /** Any OpenAI-compatible endpoint. Kept only in this browser. */
  ownKey: string | null
  ownBaseUrl: string
  ownModel: string
  /** The workspace's last language pair and tone, so it opens where you left it. */
  from: string
  to: string
  tone: Tone
  /** Respect level per target language ("hi" → "aap"). */
  respect: Record<string, string>
  /** Recently picked languages, newest first. */
  recent: string[]
  /** Show Hindi output in Latin letters too. */
  hinglish: boolean
  /** Use Chrome's on-device translator for plain translations when it's available. */
  preferDevice: boolean
  set: (patch: Partial<Omit<Settings, 'set'>>) => void
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      theme: 'system',
      ui: 'en',
      provider: null,
      openrouterKey: null,
      openrouterModel: 'openrouter/free',
      ownKey: null,
      ownBaseUrl: 'https://api.openai.com/v1',
      ownModel: 'gpt-5-mini',
      from: 'auto',
      to: 'hi',
      tone: 'plain',
      respect: {},
      recent: ['en', 'hi', 'es', 'ja'],
      hinglish: true,
      preferDevice: true,
      set: (patch) => set(patch),
    }),
    { name: 'translateplus-settings' },
  ),
)

/** Remembers a picked language at the front of the recent list. */
export const pushRecent = (code: string) =>
  useSettings.setState((s) => ({
    recent: [code, ...s.recent.filter((c) => c !== code)].slice(0, 6),
  }))

export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}
