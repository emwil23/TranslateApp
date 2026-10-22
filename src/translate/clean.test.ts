import { describe, expect, it } from 'vitest'
import { cleanReply } from './clean'

describe('cleanReply', () => {
  it('passes plain replies through', () => {
    expect(cleanReply('आप कैसे हैं?', 'How are you?')).toBe('आप कैसे हैं?')
  })

  it('unwraps a JSON string, line breaks included', () => {
    expect(cleanReply('"पहली पंक्ति\\nदूसरी"', 'First\nSecond')).toBe('पहली पंक्ति\nदूसरी')
  })

  it('keeps quotes the source had', () => {
    expect(cleanReply('"नमस्ते"', '"Hello"')).toBe('"नमस्ते"')
  })

  it('unwraps an echoed data block', () => {
    expect(
      cleanReply('<data>\n{"text":"Ham croquettes","glossary":[]}\n</data>', 'Croquetas'),
    ).toBe('Ham croquettes')
  })

  it('leaves half-streamed JSON alone', () => {
    expect(cleanReply('{"text":"Ham cro', 'x')).toBe('{"text":"Ham cro')
  })
})
