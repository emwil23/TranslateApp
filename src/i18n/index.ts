import { useSettings } from '@/stores/settings'
import { useEffect } from 'react'
import { AppError } from './errors'
import { en } from './en'
import { hi } from './hi'

export type Key = keyof typeof en
const dictionaries: Record<'en' | 'hi', Record<Key, string>> = { en, hi }

/**
 * The interface language (English or Hindi). Returns a lookup; `{name}` placeholders are filled from `vars`.
 * The prerendered pages are English; Hindi switches in after hydration.
 */
export function useT() {
  const ui = useSettings((s) => s.ui)
  const dict = dictionaries[ui]
  return (key: Key, vars?: Record<string, string | number>) => {
    let s = dict[key]
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}

/** Shows any error in the interface language: AppErrors by their key, others by their own message. */
export function useErrorText() {
  const t = useT()
  return (e: unknown) =>
    e instanceof AppError ? t(e.key, e.vars) : e instanceof Error ? e.message : t('err.generic')
}

/** Keeps <html lang> in step with the interface language, for screen readers and fonts. */
export function useHtmlLang() {
  const ui = useSettings((s) => s.ui)
  useEffect(() => {
    document.documentElement.lang = ui
  }, [ui])
}
