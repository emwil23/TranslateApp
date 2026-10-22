/** Spaced repetition for phrasebook flashcards: a small SM-2, the algorithm behind Anki. */
export interface Review {
  /** When the card is next due (ms since epoch). */
  due: number
  /** Days until the next review after a correct answer. */
  interval: number
  /** How easy the card is; higher means intervals grow faster. 1.3 at least. */
  ease: number
  /** Correct answers in a row. */
  reps: number
}

export type Grade = 'again' | 'hard' | 'good' | 'easy'

const DAY = 86_400_000
const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 }

export const newReview = (now = Date.now()): Review => ({
  due: now,
  interval: 0,
  ease: 2.5,
  reps: 0,
})

export function review(card: Review, grade: Grade, now = Date.now()): Review {
  const q = QUALITY[grade]
  const ease = Math.max(1.3, card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  // A miss starts the card over and shows it again in ten minutes.
  if (q < 3) return { due: now + 10 * 60_000, interval: 0, ease, reps: 0 }
  const reps = card.reps + 1
  let interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(card.interval * ease)
  if (grade === 'hard') interval = Math.max(1, Math.round(interval * 0.6))
  if (grade === 'easy') interval = Math.round(interval * 1.3)
  return { due: now + interval * DAY, interval, ease, reps }
}

export const isDue = (r: Review, now = Date.now()) => r.due <= now
