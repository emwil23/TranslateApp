import { describe, expect, it } from 'vitest'
import { protectTerms, termsFor, termsIn, type Term } from './glossary'

const term = (source: string, target: string, to = ''): Term => ({
  id: source,
  source,
  target,
  to,
  createdAt: 0,
})

describe('glossary', () => {
  const terms = [
    term('EWSTUDIOS', 'EWSTUDIOS'),
    term('New York', 'न्यूयॉर्क', 'hi'),
    term('New York Times', 'NYT', 'hi'),
    term('Pro', 'Pro', 'fr'),
  ]

  it('picks terms for the target language, longest first', () => {
    expect(termsFor(terms, 'hi').map((t) => t.source)).toEqual([
      'New York Times',
      'EWSTUDIOS',
      'New York',
    ])
    expect(termsFor(terms, 'fr-CA').map((t) => t.source)).toContain('Pro')
  })

  it('protects terms with placeholders and restores the fixed target', () => {
    const p = protectTerms('I read the New York Times in New York.', termsFor(terms, 'hi'))
    expect(p.text).toBe('I read the ⟦0⟧ in ⟦1⟧.')
    expect(p.restore('मैंने ⟦ 0 ⟧ ⟦1⟧ में पढ़ा।')).toBe('मैंने NYT न्यूयॉर्क में पढ़ा।')
  })

  it('matches whole words only, ignoring case', () => {
    const p = protectTerms('Product pro PRO', termsFor(terms, 'fr'))
    expect(p.text).toBe('Product ⟦0⟧ ⟦0⟧')
  })

  it('lists the terms that occur in a text', () => {
    expect(termsIn('Made by EWSTUDIOS', terms).map((t) => t.source)).toEqual(['EWSTUDIOS'])
  })
})
