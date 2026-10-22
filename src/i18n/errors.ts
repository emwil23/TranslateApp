import { en } from './en'

type Key = keyof typeof en

/**
 * An error the interface can show in either language: it carries a string key, and its message is the
 * English text for logs. `useErrorText` turns it into the user's language.
 */
export class AppError extends Error {
  constructor(
    readonly key: Key,
    readonly vars?: Record<string, string | number>,
  ) {
    super(
      Object.entries(vars ?? {}).reduce<string>(
        (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
        en[key],
      ),
    )
  }
}
