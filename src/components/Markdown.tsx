import { Fragment, type ReactNode } from 'react'

/** Inline **bold** only; everything renders as text nodes, so model output can't inject HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="text-text font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

/** The small Markdown explanations use: ## headings, bullet lists, pipe tables and paragraphs. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  let table: string[][] = []
  const flushTable = () => {
    const [head, ...rows] = table
    if (head)
      blocks.push(
        <div key={blocks.length} className="mt-3 overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr>
                {head.map((c, i) => (
                  <th
                    key={i}
                    className="border-line text-text border-b py-1.5 pe-4 text-start font-medium"
                  >
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className="border-line border-b py-1.5 pe-4" dir="auto">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    table = []
  }
  const flushList = () => {
    if (list.length)
      blocks.push(
        <ul key={blocks.length} className="mt-2 list-disc space-y-1 ps-5">
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
          ))}
        </ul>,
      )
    list = []
  }
  const flush = () => {
    flushTable()
    flushList()
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('|')) {
      flushList()
      // Skip the |---|---| separator row.
      if (!/^\|[\s:|-]+\|$/.test(line))
        table.push(
          line
            .slice(1, line.endsWith('|') ? -1 : undefined)
            .split('|')
            .map((c) => c.trim()),
        )
      continue
    }
    flushTable()
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    if (bullet?.[1] !== undefined) {
      list.push(bullet[1])
      continue
    }
    flush()
    if (!line) continue
    const h = /^#{1,4}\s+(.*)$/.exec(line)
    blocks.push(
      h?.[1] !== undefined ? (
        <h3 key={blocks.length} className="font-display text-text mt-4 text-xl first:mt-0">
          {h[1]}
        </h3>
      ) : (
        <p key={blocks.length} className="mt-2" dir="auto">
          {inline(line)}
        </p>
      ),
    )
  }
  flush()
  return <div className="text-muted text-sm leading-relaxed">{blocks}</div>
}
