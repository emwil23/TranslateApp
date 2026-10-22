import { AppPage } from '@/components/AppPage'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { db } from '@/lib/db'
import { languageName } from '@/lib/languages'
import { TONES } from '@/lib/tones'
import { useSettings } from '@/stores/settings'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cpu, Search, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function HistoryPage() {
  const t = useT()
  const ui = useSettings((s) => s.ui)
  const [q, setQ] = useState('')
  const items = useLiveQuery(async () => {
    const all = await db.history.orderBy('createdAt').reverse().toArray()
    const query = q.trim().toLowerCase()
    return query
      ? all.filter(
          (h) => h.source.toLowerCase().includes(query) || h.output.toLowerCase().includes(query),
        )
      : all
  }, [q])
  const date = new Intl.DateTimeFormat(ui, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <AppPage
      title={t('hi.title')}
      lead={t('hi.lead')}
      actions={
        items && items.length > 0 && !q ? (
          <Button
            variant="danger"
            onClick={() => {
              if (!confirm(t('hi.confirm'))) return
              void db.history.clear().then(() => toast.success(t('hi.cleared')))
            }}
          >
            <Trash2 /> {t('hi.clear')}
          </Button>
        ) : undefined
      }
    >
      <label className="border-line bg-surface mb-6 flex items-center gap-2 rounded-full border px-4">
        <Search className="text-muted size-4" aria-hidden />
        <span className="sr-only">{t('hi.search')}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('hi.search')}
          className="h-11 flex-1 bg-transparent text-sm outline-none"
        />
      </label>

      {items?.length === 0 && !q && (
        <EmptyState art="/media/empty-history" title={t('hi.emptyTitle')}>
          {t('hi.empty')}
        </EmptyState>
      )}
      <ol className="flex flex-col gap-4">
        {items?.map((h) => {
          const tone = TONES.find((x) => x.id === h.tone)
          return (
            <li key={h.id} className="hang">
              <div className="spec text-muted flex flex-wrap items-center gap-2">
                <span>
                  {languageName(h.from)} → {languageName(h.to)}
                </span>
                {tone && tone.id !== 'plain' && <span>· {ui === 'hi' ? tone.hi : tone.label}</span>}
                {h.engine === 'device' ? (
                  <Cpu className="size-3" aria-label={t('ws.engine.device')} />
                ) : (
                  <Sparkles className="size-3" aria-label={t('ws.engine.ai')} />
                )}
                <time className="ms-auto" dateTime={new Date(h.createdAt).toISOString()}>
                  {date.format(h.createdAt)}
                </time>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2 md:gap-6">
                <p
                  dir="auto"
                  lang={h.from === 'auto' ? undefined : h.from}
                  className="text-muted line-clamp-3"
                >
                  {h.source}
                </p>
                <p dir="auto" lang={h.to} className="font-display line-clamp-3 text-lg">
                  {h.output}
                </p>
              </div>
              <div className="mt-1 flex gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/app" search={{ text: h.source, to: h.to }}>
                    {t('hi.open')}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.delete')}
                  onClick={() => void db.history.delete(h.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
    </AppPage>
  )
}
