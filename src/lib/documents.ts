import { batchBy, chunkText, formatSrt, parseSrt } from './chunk'

export type DocKind = 'txt' | 'srt' | 'docx' | 'pdf'

/** Roughly one printed page of text, for the free tier's page limit. */
export const CHARS_PER_PAGE = 3000
export const FREE_PAGES = 5

export interface LoadedDoc {
  kind: DocKind
  name: string
  /** Plain text, for the preview and the page estimate. */
  text: string
  pages: number
  file: File
}

export function kindOf(name: string): DocKind | null {
  const ext = name.toLowerCase().split('.').pop()
  return ext === 'txt' || ext === 'srt' || ext === 'docx' || ext === 'pdf' ? ext : null
}

async function pdfPages(file: File): Promise<string[]> {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent()
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : ''))
        .join('')
        .trim(),
    )
  }
  return pages
}

/** Reads a file for the preview and the page count. Text never leaves the device here. */
export async function loadDoc(file: File): Promise<LoadedDoc> {
  const kind = kindOf(file.name)
  if (!kind) throw new Error('unsupported')
  let text: string
  let pages: number
  if (kind === 'pdf') {
    const all = await pdfPages(file)
    text = all.join('\n\n')
    pages = all.length
  } else {
    text =
      kind === 'docx'
        ? (
            await (
              await import('mammoth')
            ).extractRawText({ arrayBuffer: await file.arrayBuffer() })
          ).value
        : await file.text()
    pages = Math.max(1, Math.ceil(text.length / CHARS_PER_PAGE))
  }
  return { kind, name: file.name, text, pages, file }
}

/**
 * Translates lines in batches. `run` gets several lines joined by "\n" and must return as many lines;
 * when a batch comes back with a different count, its lines are translated one at a time instead.
 */
export async function translateLines(
  lines: string[],
  run: (text: string) => Promise<string>,
  onProgress: (done: number, total: number) => void,
  max = 1800,
): Promise<string[]> {
  const indexed = lines.map((text, i) => ({ text, i }))
  const work = indexed.filter((l) => l.text.trim())
  const batches = batchBy(work, (l) => l.text, max)
  const out = [...lines]
  for (const [n, batch] of batches.entries()) {
    onProgress(n, batches.length)
    const result = (await run(batch.map((l) => l.text).join('\n'))).split('\n')
    if (result.length === batch.length) batch.forEach((l, k) => (out[l.i] = result[k] ?? l.text))
    else for (const l of batch) out[l.i] = (await run(l.text)).replace(/\n+/g, ' ')
  }
  onProgress(batches.length, batches.length)
  return out
}

export interface TranslatedDoc {
  blob: Blob
  name: string
  /** Translated plain text, for the preview. */
  text: string
}

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/**
 * A translated copy of a .docx with its formatting kept: each paragraph's text goes into its first run,
 * so paragraph styles, headings, lists, tables and the first run's character style all survive.
 */
async function translateDocx(
  file: File,
  run: (t: string) => Promise<string>,
  onProgress: (d: number, t: number) => void,
): Promise<{ blob: Blob; text: string }> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const parts = Object.keys(zip.files).filter((p) =>
    /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(p),
  )
  const docs = await Promise.all(
    parts.map(async (p) => ({
      path: p,
      xml: new DOMParser().parseFromString(
        (await zip.file(p)?.async('string')) ?? '',
        'application/xml',
      ),
    })),
  )
  const paragraphs = docs.flatMap((d) =>
    [...d.xml.getElementsByTagNameNS(W_NS, 'p')].map((p) => ({
      p,
      runs: [...p.getElementsByTagNameNS(W_NS, 't')],
    })),
  )
  // Line breaks inside a paragraph become spaces, so one paragraph is always one line to the translator.
  const texts = paragraphs.map((x) =>
    x.runs
      .map((r) => r.textContent)
      .join('')
      .replace(/\n/g, ' '),
  )
  const translated = await translateLines(texts, run, onProgress)
  paragraphs.forEach(({ runs }, i) => {
    const [first, ...rest] = runs
    if (!first || !texts[i]?.trim()) return
    first.textContent = translated[i] ?? first.textContent
    first.setAttribute('xml:space', 'preserve')
    for (const r of rest) r.textContent = ''
  })
  const serializer = new XMLSerializer()
  for (const d of docs) zip.file(d.path, serializer.serializeToString(d.xml))
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  return { blob, text: translated.filter((t) => t.trim()).join('\n\n') }
}

/** A simple .docx from translated PDF pages: one paragraph per line, a page break between pages. */
async function pagesToDocx(pages: string[][]): Promise<Blob> {
  const { Document, Packer, Paragraph, PageBreak, TextRun } = await import('docx')
  const children = pages.flatMap((lines, n) => [
    ...(n ? [new Paragraph({ children: [new PageBreak()] })] : []),
    ...lines.map((l) => new Paragraph({ children: [new TextRun(l)] })),
  ])
  return Packer.toBlob(new Document({ sections: [{ children }] }))
}

const rename = (name: string, lang: string, ext?: string) => {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  return `${base}.${lang}.${ext ?? name.slice(dot + 1)}`
}

/** Translates a loaded document into the same format (PDFs come back as .docx). */
export async function translateDoc(
  doc: LoadedDoc,
  lang: string,
  run: (text: string) => Promise<string>,
  onProgress: (done: number, total: number) => void,
): Promise<TranslatedDoc> {
  if (doc.kind === 'docx') {
    const { blob, text } = await translateDocx(doc.file, run, onProgress)
    return { blob, text, name: rename(doc.name, lang) }
  }
  if (doc.kind === 'srt') {
    const cues = parseSrt(doc.text)
    const out = await translateLines(
      cues.map((c) => c.text.replace(/\n/g, ' ')),
      run,
      onProgress,
    )
    const text = formatSrt(cues.map((c, i) => ({ ...c, text: out[i] ?? c.text })))
    return {
      blob: new Blob([text], { type: 'application/x-subrip' }),
      text,
      name: rename(doc.name, lang),
    }
  }
  if (doc.kind === 'pdf') {
    const pages = (await pdfPages(doc.file)).map((p) => p.split('\n'))
    const flat = pages.flat()
    const out = await translateLines(flat, run, onProgress)
    let k = 0
    const translatedPages = pages.map((p) => p.map(() => out[k++] ?? ''))
    return {
      blob: await pagesToDocx(translatedPages),
      text: translatedPages.map((p) => p.join('\n')).join('\n\n'),
      name: rename(doc.name, lang, 'docx'),
    }
  }
  // Plain text: chunks at paragraph breaks keep the layout; each chunk keeps its own line breaks.
  const chunks = chunkText(doc.text)
  const out: string[] = []
  for (const [n, chunk] of chunks.entries()) {
    onProgress(n, chunks.length)
    // Keep the whitespace around each chunk; the translator may trim it.
    const lead = /^\s*/.exec(chunk)?.[0] ?? ''
    const trail = /\s*$/.exec(chunk)?.[0] ?? ''
    out.push(chunk.trim() ? lead + (await run(chunk.trim())) + trail : chunk)
  }
  onProgress(chunks.length, chunks.length)
  const text = out.join('')
  return {
    blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
    text,
    name: rename(doc.name, lang),
  }
}
