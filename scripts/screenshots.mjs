// Takes the README screenshots in docs/ from a production build.
// The AI replies are real Gemini answers to the server's own prompts, recorded once in
// scripts/screenshot-fixtures.json and replayed here, so the screenshots are repeatable and spend no quota.
// Serve a build (`npm run build && npx serve dist -c ../serve.json -l 4180`), then `node scripts/screenshots.mjs`.
// ANGLE on D3D11 uses the real GPU even headless, so the landing page's WebGL globe renders.
import { readFile } from 'node:fs/promises'
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4180'
const AI = 'http://ai.test/v1'
const BR = '\n'
const docs = (name) =>
  new URL(`../docs/${name}.png`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const fixtures = JSON.parse(
  await readFile(new URL('./screenshot-fixtures.json', import.meta.url), 'utf8'),
)

/** Finds the recorded answer for a prompt: by action, then by the text it was asked about. */
function answer(prompt) {
  if (prompt.includes('Explain this translation')) return fixtures.explain.output
  const last = [...prompt.matchAll(/<data>\n([\s\S]*?)\n<\/data>/g)].at(-1)?.[1]
  const text = last ? JSON.parse(last) : ''
  const hit = Object.values(fixtures).find(
    (f) =>
      f.input.text === text &&
      (f.input.tone === undefined || prompt.includes(toneHint[f.input.tone])) &&
      (f.input.to === undefined || prompt.includes(`into ${f.input.to}`)),
  )
  if (hit) return hit.output
  // Camera text comes from OCR, so it may differ a little from the recorded menu: match it line by line.
  const menuIn = fixtures.menu.input.text.split(BR)
  const menuOut = fixtures.menu.output.split(BR)
  const key = (l) =>
    l
      .toLowerCase()
      .replace(/[^a-z]/g, '')
      .slice(0, 6)
  return String(text)
    .split(BR)
    .map((l) => menuOut[menuIn.findIndex((m) => key(m) && key(m) === key(l))] ?? l)
    .join(BR)
}
const toneHint = {
  plain: 'faithfully',
  formal: 'formal, polite register',
  whatsapp: 'short chat message',
  email: 'business email',
}

async function mockAi(page) {
  await page.route(`${AI}/**`, async (route) => {
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const prompt = route.request().postDataJSON().messages.at(-1).content
    const content = answer(prompt)
    // Stream it in small pieces, like the real thing.
    const pieces = content.match(/[\s\S]{1,12}/g) ?? []
    const body = pieces
      .map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`)
      .join('')
    return route.fulfill({
      headers: { ...headers, 'content-type': 'text/event-stream' },
      body: `${body}data: [DONE]\n\n`,
    })
  })
}

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] })

async function open(options = {}, settings = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    ...options,
  })
  await ctx.addInitScript(
    ([ai, s]) =>
      localStorage.setItem(
        'translateplus-settings',
        JSON.stringify({
          state: { provider: 'own', ownKey: 'demo', ownBaseUrl: ai, from: 'en', to: 'hi', ...s },
          version: 0,
        }),
      ),
    [AI, settings],
  )
  const p = await ctx.newPage()
  await mockAi(p)
  return { ctx, p }
}

const source = fixtures.wa.input.text
async function translate(p, tone, respect) {
  await p.goto(`${BASE}/app`)
  await p.getByRole('textbox', { name: 'Text to translate' }).fill(source)
  await p.getByRole('radio', { name: tone }).click()
  if (respect) await p.getByRole('radio', { name: respect }).click()
  await p.getByRole('button', { name: 'Translate', exact: true }).click()
  await p.getByRole('button', { name: 'Explain' }).waitFor()
  await p.waitForTimeout(600)
}

// Landing, desktop, dark.
{
  const { ctx, p } = await open()
  await p.goto(`${BASE}/`)
  await p.locator('canvas').waitFor() // the globe loads when the page is idle
  await p.waitForTimeout(900)
  await p.screenshot({ path: docs('globe') })
  await p.waitForTimeout(3200) // the glyphs spell the first phrase
  await p.screenshot({ path: docs('landing') })
  await p.evaluate(() => window.scrollTo(0, document.querySelector('#how').offsetTop - 40))
  await p.waitForTimeout(2000)
  await p.screenshot({ path: docs('story') })
  await p.goto(`${BASE}/developer`)
  await p.waitForTimeout(2500)
  await p.screenshot({ path: docs('developer') })
  await p.goto(`${BASE}/nowhere`)
  await p.waitForTimeout(1500)
  await p.screenshot({ path: docs('not-found') })
  await ctx.close()
}

// The workspace and the AI panels, desktop, dark.
{
  const { ctx, p } = await open()
  await translate(p, 'WhatsApp')
  await p.screenshot({ path: docs('workspace') })
  await p.getByRole('button', { name: 'Explain' }).click()
  await p.getByRole('dialog').getByRole('heading').nth(1).waitFor()
  await p.waitForTimeout(800)
  await p.screenshot({ path: docs('explain') })
  await p.keyboard.press('Escape')
  await p.getByRole('button', { name: 'Save to phrasebook' }).click()
  await p.getByText('Saved to your phrasebook').waitFor()

  await p.goto(`${BASE}/app`)
  await p.getByRole('button', { name: 'Translate to: Hindi' }).click()
  await p.getByRole('textbox', { name: 'Search languages' }).fill('Japanese')
  await p.keyboard.press('Enter')
  await p.getByRole('textbox', { name: 'Text to translate' }).fill(source)
  await p.getByRole('radio', { name: 'Business email' }).click()
  await p.getByRole('radio', { name: /keigo/ }).click()
  await p.getByRole('button', { name: 'Translate', exact: true }).click()
  await p.getByRole('button', { name: 'Explain' }).waitFor()
  await p.waitForTimeout(800)
  await p.screenshot({ path: docs('workspace-japanese') })

  // Conversation: typed turns stand in for speech.
  await p.goto(`${BASE}/app/conversation`)
  await p.getByRole('textbox', { name: /Or type \(English\)/ }).fill(fixtures.conv1.input.text)
  await p.keyboard.press('Enter')
  await p.waitForTimeout(900)
  await p.getByRole('textbox', { name: /Or type \(Hindi\)/ }).fill(fixtures.conv2.input.text)
  await p.keyboard.press('Enter')
  await p.waitForTimeout(900)
  await p.getByRole('textbox', { name: /Or type \(English\)/ }).fill(fixtures.conv3.input.text)
  await p.keyboard.press('Enter')
  await p.waitForTimeout(1200)
  await p.screenshot({ path: docs('conversation') })

  // Documents.
  await p.goto(`${BASE}/app/documents`)
  await p.locator('input[type=file]').setInputFiles({
    name: 'lesson-1.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(fixtures.doc.input.text),
  })
  await p.getByLabel('Allow AI for this document').check()
  await p.getByRole('button', { name: 'Translate document' }).click()
  await p.getByRole('button', { name: /Download lesson-1.hi.txt/ }).waitFor()
  await p.waitForTimeout(600)
  await p.screenshot({ path: docs('documents') })

  // Camera: a photographed menu, read on the device by Tesseract.
  const menu = await ctx.newPage()
  await menu.setViewportSize({ width: 900, height: 640 })
  await menu.setContent(`<body style="margin:0;background:#2b1d14;display:grid;place-items:center;height:100vh">
    <div style="background:#f3e9d2;color:#2b1d14;font:600 44px Georgia,serif;padding:48px 64px;border-radius:12px;line-height:1.6;transform:rotate(-2deg);box-shadow:0 30px 60px #0008">
    <div style="font-size:30px;letter-spacing:.2em;text-align:center;margin-bottom:12px">TAPAS</div>
    ${fixtures.menu.input.text
      .split('\n')
      .map((l) => `<div>${l}</div>`)
      .join('')}</div></body>`)
  const photo = await menu.screenshot({ type: 'jpeg', quality: 90 })
  await menu.close()
  await p.goto(`${BASE}/app/camera`)
  await p.getByLabel('Text in the photo').selectOption('es')
  await p.getByLabel('Allow AI for this document').check()
  await p
    .locator('input[type=file]')
    .setInputFiles({ name: 'menu.jpg', mimeType: 'image/jpeg', buffer: photo })
  await p.getByRole('button', { name: 'Translate all' }).waitFor({ timeout: 90_000 })
  await p.getByRole('button', { name: 'Translate all' }).click()
  await p.getByText(fixtures.menu.output.split('\n')[0]).waitFor({ timeout: 30_000 })
  await p.waitForTimeout(600)
  await p.screenshot({ path: docs('camera') })

  // Phrasebook practice, answer showing.
  await p.goto(`${BASE}/app/phrasebook`)
  await p.waitForTimeout(800)
  await p.screenshot({ path: docs('phrasebook') })
  await p.getByRole('button', { name: /Practise/ }).click()
  await p.getByRole('button', { name: 'Show answer' }).click()
  await p.waitForTimeout(900)
  await p.screenshot({ path: docs('flashcard') })
  await ctx.close()
}

// Light theme, formal Hindi with "aap".
{
  const { ctx, p } = await open({ colorScheme: 'light' }, { theme: 'light' })
  await translate(p, 'Formal', /aap/)
  await p.screenshot({ path: docs('workspace-light') })
  await ctx.close()
}

// The interface in Hindi.
{
  const { ctx, p } = await open({}, { ui: 'hi' })
  await p.goto(`${BASE}/app`)
  await p.getByRole('textbox', { name: 'अनुवाद के लिए पाठ' }).fill(source)
  await p.getByRole('radio', { name: 'व्हाट्सऐप' }).click()
  await p.getByRole('button', { name: 'अनुवाद करें', exact: true }).click()
  await p.getByRole('button', { name: 'समझाएँ' }).waitFor()
  await p.waitForTimeout(600)
  await p.screenshot({ path: docs('workspace-hindi-ui') })
  await ctx.close()
}

// Phones.
{
  const { ctx, p } = await open({ ...devices['iPhone 15 Pro'], colorScheme: 'dark' })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(2500)
  await p.screenshot({ path: docs('mobile-landing') })
  await translate(p, 'WhatsApp')
  await p.screenshot({ path: docs('mobile-workspace') })
  await ctx.close()
}

await browser.close()
console.log('screenshots saved to docs/')
