# Translate+ assets

All art was generated on 22 October 2026 in the owner's Google Flow project **"Revamp"** through the `flow` MCP: stills with Nano Banana Pro (0 credits), clips with Omni 1.1 Flash (12 credits each, 24 in all). The owner's master character (`asset:master`) appears **only** on the Meet the developer page and the landing page's developer card.

The logo, favicon, PWA icons and UI icons are SVG drawn in code (`src/components/Logo.tsx`, `public/favicon.svg`, Lucide). The mark is a plus sign whose top bar is a shirorekha, with one stroke hanging from it that reads as both "T" and "त". The PNG icons and `og.jpg` were rendered from that SVG and HTML with headless Chromium.

Shared style for every still: _soft 3D illustration, clay-like materials, night-ink blue background (#0D0E13 / #16171F), warm marigold (#FFB43A) light, paper-white highlights, indigo accents, unbranded devices, no readable text, no logos._

| File (`public/media/`)                                               | Size              | Used on                                                                                  | Prompt (short)                                                                                            |
| -------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `hero.webp`, `hero-828.webp`                                         | 1280×720, 828×466 | Landing hero (under the live 3D globe; the whole hero on phones and with reduced motion) | A floating sphere made of glowing glyphs from many writing systems, particles peeling off one side.       |
| `hero.mp4`, `hero.webm`, `hero-poster.webp`                          | 960×540, 8s loop  | Landing, behind the language wall                                                        | First frame = the hero still; the sphere turns, glyphs drift off and rejoin it.                           |
| `mode-conversation.webp`                                             | 720×540           | Landing story, beat 2                                                                    | Two characters across a café table with phones, speech bubbles in two scripts between them.               |
| `mode-camera.webp`                                                   | 720×540           | Landing story, beat 3; Camera page                                                       | An unbranded phone held up to a sign; the sign's letters lift off as glowing glyphs.                      |
| `mode-documents.webp`                                                | 720×540           | Landing story, beat 4                                                                    | Floating paper pages; grey lines turn into marigold lines of another script.                              |
| `mode-phrasebook.webp`                                               | 720×540           | Landing story, beat 5                                                                    | A fan of flashcards, one mid-flip, a small progress ring.                                                 |
| `empty-history.webp`                                                 | 480×480           | Empty History                                                                            | An empty hourglass on its side, glyph-shaped grains around it.                                            |
| `empty-phrasebook.webp`                                              | 480×480           | Empty Phrasebook                                                                         | An open blank notebook with a ribbon, one flashcard leaning on it.                                        |
| `empty-glossary.webp`                                                | 480×480           | Empty Glossary                                                                           | Two blank tags clipped to a glowing marigold line (the shirorekha).                                       |
| `empty-documents.webp`                                               | 480×480           | Documents drop zone                                                                      | An empty paper tray, one blank sheet hovering above it.                                                   |
| `developer.webp`                                                     | 960×720           | Landing developer card                                                                   | **Owner's character** at a desk with an unbranded laptop, smiling, speech bubbles with glyphs around him. |
| `developer-loop.mp4`, `developer-loop.webm`, `developer-poster.webp` | 720×540, 8s loop  | Meet the developer                                                                       | **Owner's character**; first frame = the portrait. He smiles, types, looks up and nods.                   |
| `og.jpg`                                                             | 1200×630          | Social share image                                                                       | The wide glyph-globe still (Flow scene "translateplus-scene-10"), wordmark and tagline set in HTML.       |

## How they were optimised

- Flow marks each output with a small sparkle in the bottom-right corner; every still and clip is cropped from the top-left to leave it out.
- Stills: Pillow to WebP, quality 78, resized to the sizes above.
- Clips: `ffmpeg`, H.264 (`+faststart`) and VP9, no audio. The developer clip is cropped to 4:3 around the character. Posters are each clip's own first frame, so nothing jumps when it starts.
- Clips load with `preload="none"` and play only while on screen (`src/components/LoopVideo.tsx`), and never with reduced motion. The service worker doesn't precache them.
- The flow MCP's known wrong-tile bug hit three stills (the café, the documents and the developer portrait came down as old Pixe images). The right ones were fetched again by their Flow titles with `flow_download` and checked by eye before use. Flow still has three older Pixe images carrying the titles `translateplus-scene-02`, `-04` and `-11`; the MCP has no rename tool, so they were left as they are.

## Fonts

- **Fraunces** (variable) for display, **Instrument Sans** (variable) for the interface, **Noto Serif Devanagari** and **Noto Sans Devanagari** always loaded, all self-hosted through `@fontsource`.
- Noto Naskh Arabic, Noto Sans Hebrew, Bengali, Tamil, Thai, JP, SC and KR load only when their script appears on the page (`src/lib/scripts.ts`). Each is split by `unicode-range`, so the browser downloads only the subsets it needs.
- JetBrains Mono (latin, weight 400) for small language-code labels, copied from Pixe's subset.
- All SIL Open Font License.
