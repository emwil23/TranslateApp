import { describe, expect, it } from 'vitest'
import { guessFromScript } from './scripts'

describe('guessFromScript', () => {
  it.each([
    ['नमस्ते', 'hi'],
    ['こんにちは', 'ja'],
    ['東京へようこそ', 'ja'],
    ['你好', 'zh'],
    ['안녕하세요', 'ko'],
    ['مرحبا', 'ar'],
    ['שלום', 'he'],
    ['Привет', 'ru'],
    ['Hello', null],
  ])('%s → %s', (text, lang) => expect(guessFromScript(text)).toBe(lang))
})
