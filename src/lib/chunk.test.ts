import { describe, expect, it } from 'vitest'
import { batchBy, chunkText, formatSrt, parseSrt } from './chunk'

describe('chunkText', () => {
  it('returns short text as one chunk', () => {
    expect(chunkText('Hello.', 100)).toEqual(['Hello.'])
  })

  it('cuts at paragraph breaks first and loses nothing', () => {
    const text = `${'a'.repeat(60)}\n\n${'b'.repeat(60)}\n\n${'c'.repeat(30)}`
    const chunks = chunkText(text, 100)
    expect(chunks.join('')).toBe(text)
    expect(chunks[0]).toBe(`${'a'.repeat(60)}\n\n`)
    expect(chunks.every((c) => c.length <= 100)).toBe(true)
  })

  it('falls back to sentence ends, including Devanagari and CJK full stops', () => {
    const text = 'यह पहला वाक्य है। '.repeat(10)
    const chunks = chunkText(text, 50)
    expect(chunks.join('')).toBe(text)
    expect(chunks[0]).toMatch(/। $/)
  })

  it('hard-cuts a single word longer than the limit', () => {
    expect(chunkText('x'.repeat(250), 100).map((c) => c.length)).toEqual([100, 100, 50])
  })
})

describe('srt', () => {
  const srt =
    '1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,500\r\nTwo\r\nlines\r\n'

  it('parses cues and writes them back with timings unchanged', () => {
    const cues = parseSrt(srt)
    expect(cues).toHaveLength(2)
    expect(cues[1]).toEqual({
      index: '2',
      time: '00:00:03,000 --> 00:00:04,500',
      text: 'Two\nlines',
    })
    expect(formatSrt(cues)).toBe(srt.replace(/\r\n/g, '\n'))
  })
})

describe('batchBy', () => {
  it('groups items under the size limit', () => {
    expect(batchBy(['aaaa', 'bbbb', 'cccc'], (s) => s, 10)).toEqual([['aaaa', 'bbbb'], ['cccc']])
  })
})
