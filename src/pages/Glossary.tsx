import { AppPage } from '@/components/AppPage'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { db, uid } from '@/lib/db'
import { LANGUAGES, languageName } from '@/lib/languages'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { useState, type SyntheticEvent } from 'react'

const field =
  'h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm outline-none focus:border-accent'

export function Glossary() {
  const t = useT()
  const terms = useLiveQuery(() => db.terms.orderBy('source').toArray(), [])
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [to, setTo] = useState('')

  const add = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!source.trim()) return
    await db.terms.add({
      id: uid(),
      source: source.trim(),
      // An empty target means "keep it as it is", the usual case for names and brands.
      target: target.trim() || source.trim(),
      to,
      createdAt: Date.now(),
    })
    setSource('')
    setTarget('')
  }

  return (
    <AppPage title={t('gl.title')} lead={t('gl.lead')}>
      <form
        onSubmit={(e) => void add(e)}
        className="border-line bg-surface grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end"
      >
        <label className="text-sm">
          <span className="text-muted mb-1 block">{t('gl.source')}</span>
          <input
            className={field}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            maxLength={100}
            required
            dir="auto"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted mb-1 block">{t('gl.target')}</span>
          <input
            className={field}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            maxLength={100}
            placeholder={t('gl.keep')}
            dir="auto"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted mb-1 block">{t('gl.lang')}</span>
          <select className={field} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">{t('gl.any')}</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="primary">
          <Plus /> {t('gl.add')}
        </Button>
      </form>

      {terms?.length === 0 && (
        <EmptyState art="/media/empty-glossary" title={t('gl.emptyTitle')}>
          {t('gl.empty')}
        </EmptyState>
      )}
      {terms && terms.length > 0 && (
        <ul className="mt-8">
          {terms.map((term) => (
            <li key={term.id} className="hang flex items-center gap-4 py-3">
              <span className="font-display min-w-0 flex-1 truncate text-xl" dir="auto">
                {term.source}
              </span>
              <span className="text-muted" aria-hidden>
                →
              </span>
              <span className="min-w-0 flex-1 truncate text-lg" dir="auto">
                {term.target === term.source ? (
                  <span className="text-muted">{t('gl.keep')}</span>
                ) : (
                  term.target
                )}
              </span>
              <span className="spec text-muted hidden w-28 sm:block">
                {term.to ? languageName(term.to) : t('gl.any')}
              </span>
              <Button
                variant="danger"
                size="icon"
                aria-label={`${t('gl.delete')}: ${term.source}`}
                onClick={() => void db.terms.delete(term.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  )
}
