# Translate+: build brief (approved by the owner 2026-10-22)

Read `D:\Code\AIPro\AIPro\ew-apps\CLAUDE.md` first, plus the saved memory on EW apps infrastructure and TaskPilot lessons. They all apply. **Reuse the shared pieces from `../taskpilot` and `../pixe`** (Vite starter setup, AI-connect layer, auth with passkey + email code, Meet-the-developer page, CI, the Cloudflare Workers deploy setup) by copying them, not rebuilding them. Add Translate+'s routes to `../ew-apps-api`; only one session writes there at a time, so check nobody else is working in it. Work on a new branch `revamp` from `main`, commit in small steps, push, and open a PR to `main`. Replace the CRA app entirely; keep git history. Don't rename the repo without asking.

## 1. What's there now

- React 17 CRA with Semantic UI from a CDN: 5 class components and 2 React Contexts.
- It's a Context exercise, not a translator: clicking a 🇺🇸 or 🇮🇳 flag swaps 2 hard-coded labels ("Submit" ↔ "Bhejo", plus the name label).
- Problems: the name input has no state, the prop is misspelled (`onLanguageChnage`), there's no real translation, and the README is CRA boilerplate.
- Keep: **the English ↔ Hindi idea.** It becomes the app's signature, with Hinglish transliteration and an interface that itself comes in English and Hindi.

## 2. What we're making

**Translate+: the translator that gets your tone.** Translate into 100+ languages, then choose how it should sound: formal, casual, friendly, WhatsApp or business email.

Pages:

- `/`: landing with a 3D hero, a globe of glyphs from many writing systems (Latin, Devanagari, Arabic, CJK) that morphs one phrase across scripts. Scroll story of the modes, pricing teaser, footer "Made with ♥ by EWSTUDIOS".
- `/app`: side-by-side workspace with automatic language detection and a tone picker. Click any word for alternatives. "Explain this translation" (grammar and nuance). Transliteration: Hindi in Latin letters (Hinglish) and back.
- `/app/conversation`: two-person mode. Each person taps a mic, speaks, and hears the translation read aloud.
- `/app/camera`: take or upload a photo; text is read on the device, then translated.
- `/app/documents`: .txt, .docx, .pdf and .srt; .docx comes back with its formatting kept.
- `/app/phrasebook`: saved phrases with flashcards and spaced repetition.
- `/app/glossary`: terms that always translate a fixed way (names, brand words).
- `/app/history`, `/developer`, `/pro`, `/settings`, `/privacy`, `/terms`, a designed 404.

## 3. Taken from competitors

| From                 | Feature                                                                    | In Translate+                                                            |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| DeepL                | Glossary, formality, document translation keeping formatting, alternatives | Glossary page, tone picker, docx in and out, click-a-word alternatives   |
| Google Translate     | Camera, conversation mode, 100+ languages                                  | Camera page, conversation page, broad language list                      |
| Reverso              | Words in real example sentences, verb tables                               | The "Explain" panel shows example sentences and verb forms               |
| Papago               | Politeness levels for Korean and Japanese                                  | Respectful-form choices for Hindi, Japanese and Korean (aap/tum, keigo)  |
| Microsoft Translator | Group conversation, each in their own language                             | **Pro:** shared conversation rooms via Supabase Realtime and a join link |
| Duolingo-style       | Remembering what you learn                                                 | Phrasebook flashcards with spaced repetition                             |

**AI actions** (shared route `/api/ai/translateplus/:action`): translate with tone, alternatives, explain, transliterate, document chunk, conversation turn.

## 4. Rules (required)

- Free-tier Gemini may be read by Google. Documents and camera text **default to on-device translation**, and a notice says "don't send confidential text through the free server; use on-device or your own key". Say so on the privacy page.
- Plain translations use Chrome's built-in Translator and Language Detector APIs wherever the browser supports them (on device, free, offline). Gemini is only called for what needs AI (tone, explanations, alternatives), which protects the shared free quota. Check current browser support before building; other browsers fall back to Gemini or the user's own provider.
- 18+ for the Gemini route; hidden for EU/UK/CH users (per CLAUDE.md). Fallback providers still work there.

## 5. Tech (all in)

- Same base as TaskPilot and Pixe: React 19, strict TS, Vite, TanStack Router, Dexie, Zustand, Tailwind v4, shadcn/Radix, Motion, GSAP + Lenis, React Three Fiber + drei, PWA, CI with Lighthouse ≥ 95 and axe.
- Files: Tesseract.js (text from photos, on device), mammoth (read .docx), docx (write .docx), pdf.js (read PDFs).
- Speech: the browser's speech recognition and speech synthesis.
- Scripts: right-to-left works (`dir="auto"`, CSS logical properties); Noto fonts loaded per script; the interface in English and Hindi.
- Tests: unit tests for document chunking, glossary application and transliteration; Playwright for translate → save → flashcard.

## 6. Sign-in and hosting

- Passkey + email code (a passkey app per CLAUDE.md). Host at `translateplus.ewstudios.workers.dev`; add that origin to Supabase passkey origins, redirect URLs and `ALLOWED_ORIGINS` when deploying.

## 7. Pro (gated through the shared entitlement)

Large documents (free: up to 5 pages), shared conversation rooms, history/phrasebook/glossary sync across devices, higher AI quota.

## 8. Design and assets

- Use the `awwwards` MCP for 3–5 references (language, typography, 3D globes) and write docs/design-brief.md. Show the owner the direction before building the UI.
- Assets through the `flow` MCP (rules in CLAUDE.md). The owner's character appears **only** on the developer page. Assets:
  - hero: the glyph globe, an 8s clip and a still
  - an illustration for each mode (conversation, camera, documents, phrasebook)
  - 4 empty-state illustrations
  - OG image
- List assets in docs/assets.md. Delete downloaded originals after use. Draw the logo and icons as SVG.

## Done means

- All pages work and tests pass in CI.
- docs/design-brief.md and docs/assets.md exist.
- A showcase README (see CLAUDE.md) uses real screenshots.
- A PR is open.
- After the owner approves, deploy to its workers.dev address like Pixe, then set the GitHub About section.

Don't deploy, rename the repo or spend anything without asking.
