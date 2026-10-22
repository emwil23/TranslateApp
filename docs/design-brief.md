# Translate+ design brief

Made with the `awwwards` MCP (`search_sites`, `get_site_details`, `create_design_brief`) on 2026-10-22. We take ideas from these sites; we copy none of them.

## References

| Site                                               | Award            | What we take                                                                                                                                                                      |
| -------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Senthora, AI language tutor](https://senthora.ai) | Nominee          | A breathing GLSL particle orb that reacts to scroll, on deep ink. Our hero globe is also made of points, but every point is a glyph.                                              |
| [fio.ai](https://fio.ai)                           | Nominee          | A point cloud that dissolves and re-forms. Our globe's glyphs fly off and re-form the same phrase in another script.                                                              |
| [Maria Vasilyeva](https://www.mariavasilyeva.com/) | SOTD + Developer | Huge editorial serif set between thin horizontal rules, with small annotations in the margins. Our workspace sets text on ruled lines, with notes ("formal · aap") in the margin. |
| [Aardvark Book Club](https://aardvarkbookclub.com) | SOTD             | Warm marigold, confident type and playful hovers that feel like unboxing. Our one accent colour, and the springy tone chips.                                                      |

## The idea: everything hangs from the line

In Devanagari, letters hang from a headline bar, the **shirorekha** (शिरोरेखा). Translate+ borrows it as its signature: every block of text, card and panel hangs from one hairline rule, and the rule is where translation happens. When you translate, a marigold line draws across the top of the output and the new text drops down from it, letter by letter, in its own script.

It ties the old app's English ↔ Hindi idea to something you can see, and it works for every script: Latin and Cyrillic sit under the line, Arabic and Hebrew run right to left from it, CJK hangs in a grid below it.

The tone picker is the second motif. Each tone is a chip with its own small mark (a tie for business, a speech bubble for WhatsApp, a bow for formal), and changing tone re-sets the output with a short spring, as if a different person had said it.

## Palette

Ink and paper, one warm accent. Script colour comes from the type itself, not from flags (flags are countries, not languages, and the old app's 🇺🇸/🇮🇳 buttons were the first thing to go).

Dark ("ink", default):

| Token        | Hex       | Use                                                                                |
| ------------ | --------- | ---------------------------------------------------------------------------------- |
| `--bg`       | `#0D0E13` | night ink, slightly blue                                                           |
| `--surface`  | `#16171F` | panels, the two translation sheets                                                 |
| `--line`     | `#2B2D3A` | the hanging rules, borders                                                         |
| `--text`     | `#EEEBE3` | body text (16.2:1 on bg)                                                           |
| `--muted`    | `#A3A1AE` | secondary text (7.6:1 on bg)                                                       |
| `--accent`   | `#FFB43A` | marigold: the shirorekha line, primary buttons (ink text on it, 11:1), focus rings |
| `--accent-2` | `#7C8CFF` | indigo: the source side, "detected" badges (6.5:1 on bg)                           |
| `--warn`     | `#FF6B4A` | errors, delete (6.8:1 on bg)                                                       |

Light ("paper"): `--bg #F6F2E9`, `--surface #FFFFFF`, `--text #15161C` (16.2:1), `--muted #5B5966` (6.1:1), `--accent #9A5A00` for text and rings (4.9:1; buttons keep the marigold fill with ink text), `--accent-2 #3B4BD8` (5.9:1), `--warn #C23A1C` (4.8:1).

Contrast is checked by axe in both themes in CI.

## Type

- Display: **Fraunces** variable (soft, high-contrast serif with optical sizes) for headlines and the big phrase in the hero. Its Hindi partner is **Noto Serif Devanagari**, so a headline set in both reads as one family.
- UI and body: **Instrument Sans** variable.
- Language codes and margin notes: **JetBrains Mono**, uppercase 11px, wide tracking ("EN → HI · FORMAL · AAP").
- Script fonts: Noto Sans Devanagari, Noto Naskh Arabic, Noto Sans JP / SC / KR, Noto Sans Bengali, Tamil, Thai and Hebrew, all self-hosted through `@fontsource` with `unicode-range` subsets, so a page only downloads the scripts it actually shows. CJK loads only when CJK text appears.
- Text boxes use `dir="auto"` and CSS logical properties, so Arabic and Hebrew lay out correctly without special cases.

## Motion

- **Hero (React Three Fiber + drei):** a slowly turning globe of about 2,000 glyphs from eight scripts, instanced on one plane mesh with a glyph atlas (one draw call). Every few seconds the glyphs fly off the sphere and re-form one phrase ("How are you?") flat in front of it, then dissolve back: English → हिंदी → Hinglish → العربية → 日本語 → Español. The pointer tilts the globe. On phones, slow GPUs or reduced motion it's the Flow still (and the 8s clip on wide screens without WebGL). Loaded after first paint, wide screens only, like TaskPilot and Pixe.
- **Scroll story (GSAP ScrollTrigger + Lenis):** one pinned section, five beats, each a Flow illustration plus a live mini demo: _tone_ (the same sentence re-set in five tones) → _conversation_ (two speech bubbles in two scripts) → _camera_ (a sign's text lifts off a photo) → _documents_ (a .docx page translates paragraph by paragraph, formatting kept) → _remember_ (a phrase flips into a flashcard).
- **App (Motion):** the output drops from the marigold line (letters stagger 12ms, 180ms ease-out); tone change is a 220ms spring; click a word and its alternatives fan out under it like a dropdown on the line. No scroll-jacking in the app.
- `prefers-reduced-motion`: no Lenis, no scrub, no globe spin, output appears at once; same content and keyboard access.

## Layout

- **Landing `/`:** hero (globe left, big bilingual headline right: "Say it like you mean it." / "जैसा कहना है, वैसा ही।") → pinned five-beat story → "what makes it different" bento (tone, Hinglish, on-device privacy, glossary, works offline) → language wall (100+ language names, each in its own script, scrolling slowly) → pricing teaser → developer card → footer "Made with ♥ by EWSTUDIOS".
- **Workspace `/app`:** two sheets side by side, each hanging from its own rule: source (indigo line, auto-detect badge) and output (marigold line). Tone chips sit on the output's rule; the Hindi / Japanese / Korean respect level (aap / tum, keigo) sits next to them when it applies. Under the output: copy, listen, save to phrasebook, "Explain". The Explain panel slides in from the end edge with grammar, nuance, example sentences and verb forms. A small badge says where the translation ran: **On device**, **Translate+ AI** or **Your provider**. On phones the sheets stack and the tone chips scroll sideways.
- **Conversation `/app/conversation`:** the screen splits top and bottom, the top half rotated 180° on phones so two people can sit across a table. Each half has a big mic button and its language.
- **Camera `/app/camera`:** viewfinder or upload; detected text boxes are drawn on the photo, and tapping one translates it. A notice says the text is read on your device.
- **Documents `/app/documents`:** drop zone, then a two-column page preview with a progress line that moves down the page as chunks finish. Download keeps the original format.
- **Phrasebook `/app/phrasebook`:** saved phrases as hanging cards; "Practise" opens flashcards with the due count, and cards flip in 3D (CSS, not WebGL).
- **Glossary, History, Settings:** quiet lists on ruled lines, the same hanging rules.
- **Interface language:** a switch in the header, `EN | हिं`, flips the whole interface (labels, nav, empty states) between English and Hindi.
- **404:** a lone phrase in many scripts that all mean "lost", hanging from a broken line: "This page got lost in translation."

## Assets (from Flow, project "Revamp")

Hero globe still + 8s clip; one illustration per mode (conversation, camera, documents, phrasebook); four empty states (no history, empty phrasebook, empty glossary, no document yet); OG image; the developer page uses the owner's character. Style for all: soft 3D, ink-blue and paper tones with marigold light, unbranded devices, no readable fake text. Logo and icons are SVG, drawn by hand: the mark is a **plus sign whose top bar is a shirorekha**, with a small hanging stroke that reads as both "T" and the Devanagari "त".
