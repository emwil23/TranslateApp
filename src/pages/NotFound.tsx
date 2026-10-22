import { LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

// "Lost", in the scripts that hang around the broken line.
const LOST = [
  { text: 'खो गया', lang: 'hi' },
  { text: 'perdido', lang: 'es' },
  { text: '迷子', lang: 'ja' },
  { text: 'ضائع', lang: 'ar' },
  { text: 'verloren', lang: 'de' },
  { text: '길을 잃은', lang: 'ko' },
  { text: 'perdu', lang: 'fr' },
  { text: 'потерян', lang: 'ru' },
]

/** A designed 404: the line every page hangs from, broken, with "lost" in many scripts dangling off it. */
export function NotFound() {
  return (
    <main
      id="main"
      className="grain relative grid min-h-dvh place-items-center overflow-hidden px-6 text-center"
    >
      <div className="relative w-full max-w-3xl">
        <LogoMark className="mx-auto mb-10 size-12" />
        <div className="flex items-start justify-center gap-6" aria-hidden>
          <div className="bg-accent mt-0 h-0.5 flex-1 rounded-full" />
          <div className="bg-accent mt-3 h-0.5 flex-1 rotate-[8deg] rounded-full" />
        </div>
        <ul
          className="text-muted/70 mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2"
          aria-hidden
        >
          {LOST.map((l, i) => (
            <li
              key={l.lang}
              lang={l.lang}
              className="font-display text-xl"
              style={{ transform: `rotate(${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg)` }}
            >
              {l.text}
            </li>
          ))}
        </ul>
        <p className="spec text-accent-text mt-10">Error 404</p>
        <h1 className="font-display mt-4 text-5xl md:text-8xl">
          This page got <em>lost</em> in translation.
        </h1>
        <p className="text-muted mx-auto mt-4 max-w-md">
          There's nothing at this address. Let's get you back to something you can say.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link to="/app">Start translating</Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
