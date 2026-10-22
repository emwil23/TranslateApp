import Dexie, { type EntityTable } from 'dexie'
import type { Term } from './glossary'
import type { Review } from './srs'
import type { Tone } from './tones'

export interface Translation {
  id: string
  source: string
  output: string
  from: string
  to: string
  tone: Tone
  respect?: string
  /** Where it ran: on this device, or through an AI provider. */
  engine: 'device' | 'ai'
  createdAt: number
}

export interface Phrase extends Omit<Translation, 'engine'> {
  review: Review
}

export const db = new Dexie('translateplus') as Dexie & {
  history: EntityTable<Translation, 'id'>
  phrases: EntityTable<Phrase, 'id'>
  terms: EntityTable<Term, 'id'>
}

db.version(1).stores({
  history: 'id, createdAt',
  phrases: 'id, createdAt, review.due',
  terms: 'id, source, to',
})

export const uid = () => crypto.randomUUID()

/** History keeps the most recent 500 translations. */
export async function addHistory(t: Omit<Translation, 'id' | 'createdAt'>) {
  await db.history.add({ ...t, id: uid(), createdAt: Date.now() })
  const count = await db.history.count()
  if (count > 500)
    await db.history
      .orderBy('createdAt')
      .limit(count - 500)
      .delete()
}
