import { describe, expect, it } from 'vitest'
import { isDue, newReview, review } from './srs'

const DAY = 86_400_000

describe('spaced repetition', () => {
  it('schedules 1 day, 6 days, then grows by ease', () => {
    let r = newReview(0)
    r = review(r, 'good', 0)
    expect(r.interval).toBe(1)
    r = review(r, 'good', r.due)
    expect(r.interval).toBe(6)
    r = review(r, 'good', r.due)
    expect(r.interval).toBe(15)
  })

  it('starts over on a miss and shows the card again soon', () => {
    const r = review({ due: 0, interval: 15, ease: 2.5, reps: 3 }, 'again', 0)
    expect(r.reps).toBe(0)
    expect(r.due).toBe(10 * 60_000)
    expect(r.ease).toBeLessThan(2.5)
  })

  it('never lets ease drop below 1.3', () => {
    let r = newReview(0)
    for (let i = 0; i < 20; i++) r = review(r, 'again', 0)
    expect(r.ease).toBe(1.3)
  })

  it('knows when a card is due', () => {
    expect(isDue(review(newReview(0), 'easy', 0), DAY)).toBe(true)
    expect(isDue(review(newReview(0), 'good', 0), DAY - 1)).toBe(false)
  })
})
