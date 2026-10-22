import { describe, expect, it } from 'vitest'
import { fromHinglish, toHinglish } from './hinglish'

describe('toHinglish', () => {
  it.each([
    ['क्या हाल है?', 'kya haal hai?'],
    ['कमल', 'kamal'],
    ['समझना', 'samajhna'],
    ['लड़का', 'ladka'],
    ['बोलना', 'bolna'],
    ['समय', 'samay'],
    ['मित्र', 'mitra'],
    ['नहीं', 'nahin'],
    ['मैं ठीक हूँ।', 'main theek hun.'],
    ['आप कैसे हैं', 'aap kaise hain'],
    ['ज़िंदगी', 'zindagi'],
  ])('%s → %s', (hi, latin) => expect(toHinglish(hi)).toBe(latin))

  it('leaves other scripts and digits alone', () => {
    expect(toHinglish('Hello, नमस्ते 42')).toBe('Hello, namaste 42')
    expect(toHinglish('२०२६')).toBe('2026')
  })
})

describe('fromHinglish', () => {
  it.each([
    ['kya haal hai', 'क्या हाल है'],
    ['main bhi hoon', 'मैं भी हूं'],
    ['aap kaise hain', 'आप कैसे हैं'],
    ['namaste', 'नमस्ते'],
  ])('%s → %s', (latin, hi) => expect(fromHinglish(latin)).toBe(hi))

  it('keeps punctuation and numbers', () => {
    expect(fromHinglish('acha, 5 baje?')).toBe('अचा, 5 बजे?')
  })
})
