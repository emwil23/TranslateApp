import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

// Playwright's Chromium has no on-device translator, so every translation goes to the AI provider. The
// tests pick "your own key" with a made-up OpenAI-compatible host and answer it here: no keys, no network.
const AI = 'http://ai.test/v1'
const HINDI = 'आप कैसे हैं?'

interface ChatBody {
  messages: { role: string; content: string }[]
}

/** The prompt's <data> blocks; the last one is what the user asked to translate or explain. */
const blocks = (prompt: string) =>
  [...prompt.matchAll(/<data>\n([\s\S]*?)\n<\/data>/g)].map((m) => JSON.parse(m[1]) as unknown)
const dataOf = (prompt: string) => blocks(prompt).at(-1)

function reply(prompt: string): string {
  if (prompt.includes('Explain this translation'))
    return '## Meaning and nuance\nA polite way to ask how someone is.\n## Verb forms\n| Tense | Form |\n|---|---|\n| Present | है |'
  if (prompt.includes('suggest up to 4 alternatives'))
    return '{"text": "कैसी", "note": "Feminine form"}\n{"text": "किस तरह", "note": "More literal"}'
  if (prompt.includes('one part of a longer document')) {
    return (dataOf(prompt) as string)
      .split('\n')
      .map((l) => (l ? `[hi] ${l}` : l))
      .join('\n')
  }
  return HINDI
}

async function mockAi(page: Page, seen: string[] = []) {
  await page.route(`${AI}/**`, async (route: Route) => {
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const body = route.request().postDataJSON() as ChatBody
    const prompt = body.messages.at(-1)?.content ?? ''
    seen.push(prompt)
    const content = reply(prompt)
    return route.fulfill({
      headers: { ...headers, 'content-type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`,
    })
  })
}

/** Starts the app with "your own key" pointed at the mock, English → Hindi. */
async function withProvider(page: Page, extra: Record<string, unknown> = {}) {
  await page.addInitScript(
    ([ai, more]) =>
      localStorage.setItem(
        'translateplus-settings',
        JSON.stringify({
          state: { provider: 'own', ownKey: 'test', ownBaseUrl: ai, from: 'en', to: 'hi', ...more },
          version: 0,
        }),
      ),
    [AI, extra] as const,
  )
}

test('landing tells the story and links into the app @mobile', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Say it like you mean it.')
  // The page is prerendered; React takes over after the load event.
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Made with')).toContainText('EWSTUDIOS')
  await expect(page.getByRole('heading', { name: /five ways to use it/i })).toBeVisible()
  // The tone demo works without any AI.
  await page.getByRole('radio', { name: 'Business email' }).first().click()
  await expect(page.getByText(/पुनर्निर्धारित/).first()).toBeVisible()
  // Back to the top, where nothing scrolls under the fixed header.
  await page.evaluate('window.scrollTo(0, 0)')
  await page.getByRole('link', { name: 'Open Translate+' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('textbox', { name: 'Text to translate' })).toBeVisible()
})

test('translate → save → flashcard', async ({ page }) => {
  await mockAi(page)
  await withProvider(page)
  await page.goto('/app')
  await page.getByRole('textbox', { name: 'Text to translate' }).fill('How are you?')
  await page.getByRole('button', { name: 'Translate', exact: true }).click()
  const output = page.getByRole('region', { name: 'Translation' })
  await expect(output).toContainText(HINDI)
  // Hindi output also shows in Latin letters.
  await expect(output).toContainText('aap kaise hain?')
  await expect(output.getByText('AI', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Save to phrasebook' }).click()
  await expect(page.getByText('Saved to your phrasebook')).toBeVisible()

  await page.getByRole('link', { name: 'Phrasebook' }).first().click()
  await expect(page.getByText(HINDI)).toBeVisible()
  await page.getByRole('button', { name: /Practise/ }).click()
  await expect(page.getByText('How are you?')).toBeVisible()
  await page.getByRole('button', { name: 'Show answer' }).click()
  await page.getByRole('button', { name: 'Good' }).click()
  await expect(page.getByText('Done for now. 1 reviewed.')).toBeVisible()
  await page.getByRole('button', { name: 'Back to the list' }).first().click()
  await expect(page.getByText(/Next review in 1 day|Next review tomorrow/)).toBeVisible()

  // The translation is in History too.
  await page.getByRole('link', { name: 'History' }).first().click()
  await expect(page.getByText(HINDI)).toBeVisible()
})

test('tones, respect levels and the glossary reach the prompt', async ({ page }) => {
  const seen: string[] = []
  await mockAi(page, seen)
  await withProvider(page)
  await page.goto('/app/glossary')
  await page.getByRole('textbox', { name: 'Term' }).fill('EWSTUDIOS')
  await page.getByRole('button', { name: 'Add term' }).click()
  await expect(page.getByText('Keep as is').last()).toBeVisible()

  await page.getByRole('link', { name: 'Translate', exact: true }).first().click()
  await page.getByRole('textbox', { name: 'Text to translate' }).fill('Made by EWSTUDIOS')
  await page.getByRole('radio', { name: 'WhatsApp' }).click()
  await page.getByRole('radio', { name: /tum/ }).click()
  await page.getByRole('button', { name: 'Translate', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Translation' })).toContainText(HINDI)
  const prompt = seen.at(-1) ?? ''
  expect(prompt).toContain('short chat message')
  expect(prompt).toContain('तुम (tum)')
  expect(blocks(prompt)).toEqual([
    [{ source: 'EWSTUDIOS', target: 'EWSTUDIOS' }],
    'Made by EWSTUDIOS',
  ])
})

test('explain and alternatives', async ({ page }) => {
  await mockAi(page)
  await withProvider(page)
  await page.goto('/app?text=How%20are%20you%3F')
  await page.getByRole('button', { name: 'Translate', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Translation' })).toContainText(HINDI)

  await page.getByRole('button', { name: 'Explain' }).click()
  const sheet = page.getByRole('dialog', { name: 'Why it says this' })
  await expect(sheet.getByRole('heading', { name: 'Meaning and nuance' })).toBeVisible()
  await expect(sheet.getByRole('cell', { name: 'है' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Alternatives' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'कैसे' }).click()
  await page.getByRole('button', { name: /किस तरह/ }).click()
  await expect(page.getByRole('region', { name: 'Translation' })).toContainText('आप किस तरह हैं?')
})

test('a text document translates line by line and downloads', async ({ page }) => {
  await mockAi(page)
  await withProvider(page)
  await page.goto('/app/documents')
  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('First line.\n\nSecond line.'),
  })
  await expect(page.getByText('notes.txt')).toBeVisible()
  await page.getByLabel('Allow AI for this document').check()
  await page.getByRole('button', { name: 'Translate document' }).click()
  await expect(page.getByRole('region', { name: 'Translated' })).toContainText('[hi] Second line.')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download notes.hi.txt/ }).click()
  expect((await download).suggestedFilename()).toBe('notes.hi.txt')
})

test('documents stay on the device unless AI is allowed', async ({ page }) => {
  const seen: string[] = []
  await mockAi(page, seen)
  await withProvider(page)
  await page.goto('/app/documents')
  await page.locator('input[type=file]').setInputFiles({
    name: 'private.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Confidential.'),
  })
  await page.getByRole('button', { name: 'Translate document' }).click()
  await expect(page.getByRole('alert')).toContainText("can't translate this pair on your device")
  expect(seen).toEqual([])
})

test('the interface switches to Hindi @mobile', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('radio', { name: 'हिन्दी' }).first().click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
  await expect(page.getByRole('link', { name: 'वाक्यकोश' }).first()).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'अनुवाद के लिए पाठ' })).toBeVisible()
})

test('unknown pages get the designed 404', async ({ page }) => {
  await page.goto('/nowhere')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('lost in translation')
})

const PAGES = [
  '/',
  '/developer',
  '/pro',
  '/privacy',
  '/terms',
  '/app',
  '/app/conversation',
  '/app/camera',
  '/app/documents',
  '/app/phrasebook',
  '/app/glossary',
  '/app/history',
  '/settings',
  '/nowhere',
]

for (const path of PAGES) {
  for (const theme of ['dark', 'light'] as const) {
    test(`axe: ${path} (${theme}) has no violations`, async ({ page }) => {
      await page.addInitScript(
        (t) =>
          localStorage.setItem(
            'translateplus-settings',
            JSON.stringify({ state: { theme: t }, version: 0 }),
          ),
        theme,
      )
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([])
    })
  }
}
