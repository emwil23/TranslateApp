import { AppPage } from '@/components/AppPage'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { db, type Phrase } from '@/lib/db'
import { toHinglish } from '@/lib/hinglish'
import { languageName } from '@/lib/languages'
import { isDue, review, type Grade } from '@/lib/srs'
import { canSpeak, speak } from '@/lib/speech'
import { useSettings } from '@/stores/settings'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, GraduationCap, Trash2, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const DAY = 86_400_000

/** "in 3 days", "in 10 minutes": when a card comes back. */
function relative(due: number, ui: string, now = Date.now()) {
  const rtf = new Intl.RelativeTimeFormat(ui, { numeric: 'auto' })
  const diff = due - now
  if (diff < 3_600_000) return rtf.format(Math.max(1, Math.round(diff / 60_000)), 'minute')
  if (diff < DAY * 0.8) return rtf.format(Math.round(diff / 3_600_000), 'hour')
  return rtf.format(Math.round(diff / DAY), 'day')
}

export function Phrasebook() {
  const t = useT()
  const ui = useSettings((s) => s.ui)
  const phrases = useLiveQuery(() => db.phrases.orderBy('createdAt').reverse().toArray(), [])
  const [practising, setPractising] = useState(false)
  const due = phrases?.filter((p) => isDue(p.review)) ?? []

  if (practising) return <Practice onExit={() => setPractising(false)} />

  return (
    <AppPage
      title={t('pb.title')}
      lead={t('pb.lead')}
      actions={
        phrases && phrases.length > 0 ? (
          <Button variant="primary" onClick={() => setPractising(true)} disabled={!due.length}>
            <GraduationCap /> {t('pb.practise')}
            <span className="bg-accent-ink/15 rounded-full px-2 text-xs">
              {t('pb.due', { n: due.length })}
            </span>
          </Button>
        ) : undefined
      }
    >
      {phrases?.length === 0 && (
        <EmptyState
          art="/media/empty-phrasebook"
          title={t('pb.emptyTitle')}
          action={
            <Button asChild variant="primary">
              <Link to="/app">{t('common.start')}</Link>
            </Button>
          }
        >
          {t('pb.empty')}
        </EmptyState>
      )}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {phrases?.map((p) => (
          <li key={p.id} className="border-line bg-surface relative rounded-2xl border p-5">
            <div className="bg-accent absolute inset-x-5 top-0 h-0.5 rounded-full" aria-hidden />
            <p className="spec text-muted">
              {languageName(p.from)} → {languageName(p.to)}
            </p>
            <p dir="auto" className="text-muted mt-3 line-clamp-2">
              {p.source}
            </p>
            <p dir="auto" lang={p.to} className="font-display mt-1 text-2xl">
              {p.output}
            </p>
            <div className="mt-3 flex items-center gap-1">
              <span className="spec text-muted flex-1">
                {isDue(p.review)
                  ? t('pb.due', { n: 1 })
                  : t('pb.next', { when: relative(p.review.due, ui) })}
              </span>
              {canSpeak() && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('ws.listen')}
                  onClick={() => speak(p.output, p.to)}
                >
                  <Volume2 />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('pb.delete')}
                onClick={() => void db.phrases.delete(p.id)}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </AppPage>
  )
}

/** Flashcards for the phrases that are due: see the source, recall, flip, grade. */
function Practice({ onExit }: { onExit: () => void }) {
  const t = useT()
  // The queue is fixed when practice starts, so grading a card doesn't reshuffle the session.
  const [cards, setCards] = useState<Phrase[] | null>(null)
  useEffect(() => {
    void db.phrases
      .toArray()
      .then((all) =>
        setCards(all.filter((p) => isDue(p.review)).sort((a, b) => a.review.due - b.review.due)),
      )
  }, [])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card: Phrase | undefined = cards?.[index]

  const grade = async (g: Grade) => {
    if (!card) return
    await db.phrases.update(card.id, { review: review(card.review, g) })
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  const grades: { g: Grade; key: 'pb.again' | 'pb.hard' | 'pb.good' | 'pb.easy' }[] = [
    { g: 'again', key: 'pb.again' },
    { g: 'hard', key: 'pb.hard' },
    { g: 'good', key: 'pb.good' },
    { g: 'easy', key: 'pb.easy' },
  ]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6 md:py-10">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft className="rtl:rotate-180" /> {t('pb.back')}
        </Button>
        {cards && (
          <span className="spec text-muted" aria-live="polite">
            {Math.min(index + 1, cards.length)} / {cards.length}
          </span>
        )}
      </div>
      <h1 className="sr-only">{t('pb.practise')}</h1>

      {cards && !card ? (
        <div className="hang-accent text-center">
          <p className="font-display text-3xl">{t('pb.done', { n: cards.length })}</p>
          <Button variant="primary" className="mt-6" onClick={onExit}>
            {t('pb.back')}
          </Button>
        </div>
      ) : card ? (
        <>
          <div className="flip h-80" data-flipped={flipped}>
            <div className="flip-inner relative h-full">
              <div
                className="flip-face border-line bg-surface absolute inset-0 flex flex-col items-center justify-center rounded-3xl border p-8 text-center"
                aria-hidden={flipped}
              >
                <div
                  className="bg-source absolute inset-x-8 top-0 h-0.5 rounded-full"
                  aria-hidden
                />
                <p className="spec text-muted">{languageName(card.from)}</p>
                <p dir="auto" className="font-display mt-4 text-3xl">
                  {card.source}
                </p>
              </div>
              <div
                className="flip-face flip-back border-line bg-surface absolute inset-0 flex flex-col items-center justify-center rounded-3xl border p-8 text-center"
                aria-hidden={!flipped}
              >
                <div
                  className="bg-accent absolute inset-x-8 top-0 h-0.5 rounded-full"
                  aria-hidden
                />
                <p className="spec text-muted">{languageName(card.to)}</p>
                <p dir="auto" lang={card.to} className="font-display mt-4 text-3xl">
                  {card.output}
                </p>
                {card.to.startsWith('hi') && (
                  <p className="text-muted mt-2">{toHinglish(card.output)}</p>
                )}
                {canSpeak() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-4"
                    aria-label={t('ws.listen')}
                    tabIndex={flipped ? 0 : -1}
                    onClick={() => speak(card.output, card.to)}
                  >
                    <Volume2 />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-2">
            {flipped ? (
              grades.map(({ g, key }) => (
                <Button
                  key={g}
                  variant={g === 'good' ? 'primary' : 'secondary'}
                  onClick={() => void grade(g)}
                >
                  {t(key)}
                </Button>
              ))
            ) : (
              <Button variant="primary" size="lg" onClick={() => setFlipped(true)}>
                {t('pb.show')}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
