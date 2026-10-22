import { LoopVideo } from '@/components/LoopVideo'
import { NearImage } from '@/components/NearImage'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { prerendered, useReducedMotionSafe } from '@/lib/boot'
import { cn } from '@/lib/cn'
import { LANGUAGES } from '@/lib/languages'
import { TONES, type Tone } from '@/lib/tones'
import { PHRASES } from '@/landing/phrases'
import { useSmoothScroll } from '@/landing/useSmoothScroll'
import { PLANS } from '@/pages/Pro'
import { useSettings } from '@/stores/settings'
import { Link, useNavigate } from '@tanstack/react-router'
import { gsap } from 'gsap'
import { ArrowRight, BookA, Cpu, Languages, Tags, WifiOff } from 'lucide-react'
import { motion } from 'motion/react'
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type SyntheticEvent,
  type ReactNode,
} from 'react'

const GlyphGlobe = lazy(() => import('@/landing/GlyphGlobe'))

/** WebGL only when it helps: wide screens, a real GPU, no reduced motion and no save-data. */
function useCan3D(reduce: boolean) {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    if (reduce || !matchMedia('(min-width: 768px)').matches) return
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) return
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return
    // Software rendering (no GPU) would spin the CPU for a decoration; the still carries the hero.
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return
    // Wait until the page is idle so the 3D bundle never competes with the first paint.
    const id = requestIdleCallback(() => setOk(true), { timeout: 2500 })
    return () => cancelIdleCallback(id)
  }, [reduce])
  return ok
}

/** If the 3D scene fails (a lost context, no fonts), the still image is already there. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export function Landing() {
  const reduce = useReducedMotionSafe()
  const can3D = useCan3D(reduce)
  useSmoothScroll(!reduce)
  return (
    <>
      <Hero can3D={can3D} reduce={reduce} />
      <Story />
      <Different />
      <LanguageWall reduce={reduce} />
      <Pricing />
      <DeveloperCard />
    </>
  )
}

/**
 * The phrase cycle shared by the globe and its caption: spell a phrase (morph 0 → 1), hold, re-form the
 * globe, move to the next language.
 */
function usePhraseCycle(active: boolean) {
  const phrase = useRef(0)
  const morph = useRef(0)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!active) return
    const state = { m: 0 }
    const tl = gsap.timeline({ repeat: -1, delay: 1.2 })
    // The caption changes as the letters start to fly, so it names the phrase being spelled.
    tl.call(() => setShown(phrase.current))
      .to(state, { m: 1, duration: 1.6, ease: 'power3.inOut' })
      .to(state, { m: 1, duration: 2.4 })
      .to(state, { m: 0, duration: 1.3, ease: 'power2.inOut' })
      .call(() => {
        phrase.current = (phrase.current + 1) % PHRASES.length
      })
      .to(state, { m: 0, duration: 1.4 })
    const tick = () => {
      morph.current = state.m
    }
    gsap.ticker.add(tick)
    return () => {
      tl.kill()
      gsap.ticker.remove(tick)
    }
  }, [active])
  return { phrase, morph, shown }
}

/** Without 3D the caption still cycles through the languages. */
function useCaptionCycle(active: boolean) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setI((n) => (n + 1) % PHRASES.length), 2800)
    return () => clearInterval(id)
  }, [active])
  return i
}

function Hero({ can3D, reduce }: { can3D: boolean; reduce: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const set = useSettings((s) => s.set)
  const { phrase, morph, shown } = usePhraseCycle(can3D)
  const stillIndex = useCaptionCycle(!can3D && !reduce)
  const current = PHRASES[can3D ? shown : stillIndex] ?? PHRASES[0]
  const [text, setText] = useState('')
  const id = useId()

  const go = (e: SyntheticEvent) => {
    e.preventDefault()
    set({ to: 'hi' })
    void navigate({ to: '/app', search: text.trim() ? { text: text.trim() } : {} })
  }

  const enter = prerendered || reduce ? false : 'hidden'

  return (
    <section aria-labelledby="hero-h" className="grain relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_45%,color-mix(in_oklab,var(--accent)_10%,transparent),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto grid min-h-dvh max-w-6xl grid-cols-1 items-center gap-10 px-6 pt-28 pb-16 md:grid-cols-[1.05fr_1fr]">
        <div className="relative order-2 md:order-1">
          {/* The still fades out at its edges, so it sits on the page instead of in a box. */}
          <div className="relative mx-auto aspect-square w-full max-w-[34rem] [mask-image:radial-gradient(closest-side,black_72%,transparent)]">
            <img
              src="/media/hero-828.webp"
              alt=""
              width={828}
              height={466}
              fetchPriority="high"
              className={cn(
                'absolute inset-0 size-full object-cover object-[44%_50%] transition-opacity duration-1000',
                can3D && 'opacity-0',
              )}
            />
            {can3D && (
              <Quiet>
                <Suspense fallback={null}>
                  <div className="absolute inset-0">
                    <GlyphGlobe phrase={phrase} morph={morph} />
                  </div>
                </Suspense>
              </Quiet>
            )}
          </div>
          {/* The caption under the globe: the line, then the language now being spelled. */}
          <div className="mx-auto mt-2 max-w-[22rem]" aria-hidden>
            <div className="bg-accent h-0.5 rounded-full" />
            <p key={current.lang} className="spec text-muted drop-block mt-3 text-center">
              {current.label}
            </p>
            {!can3D && (
              <p
                key={`t-${current.lang}`}
                lang={current.lang}
                className="font-display drop-block mt-1 text-center text-2xl"
              >
                {current.text}
              </p>
            )}
          </div>
        </div>

        <div className="order-1 md:order-2">
          <motion.p
            initial={enter}
            animate="show"
            custom={0}
            variants={fadeUp}
            className="spec text-accent-text"
          >
            {t('land.eyebrow')}
          </motion.p>
          <motion.h1
            id="hero-h"
            initial={enter}
            animate="show"
            custom={1}
            variants={fadeUp}
            className="font-display mt-5 text-[clamp(3rem,7vw,5.6rem)] leading-[0.95] font-medium tracking-tight"
          >
            {t('land.h1')}
            <span
              lang="hi"
              className="text-accent-text mt-3 block text-[0.62em] leading-tight font-normal"
            >
              जैसा कहना है, वैसा ही।
            </span>
          </motion.h1>
          <motion.p
            initial={enter}
            animate="show"
            custom={2}
            variants={fadeUp}
            className="text-muted mt-6 max-w-lg text-lg"
          >
            {t('land.lead')}
          </motion.p>
          <motion.form
            initial={enter}
            animate="show"
            custom={3}
            variants={fadeUp}
            onSubmit={go}
            className="border-line bg-surface/80 relative mt-8 flex max-w-lg items-center gap-2 rounded-full border p-1.5 ps-5 backdrop-blur"
          >
            <label htmlFor={id} className="sr-only">
              {t('ws.source')}
            </label>
            <input
              id={id}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('land.try')}
              dir="auto"
              className="h-10 min-w-0 flex-1 bg-transparent outline-none"
            />
            <Button type="submit" variant="primary">
              {t('ws.translate')} <ArrowRight className="rtl:rotate-180" />
            </Button>
          </motion.form>
          <motion.p
            initial={enter}
            animate="show"
            custom={4}
            variants={fadeUp}
            className="spec text-muted mt-4"
          >
            {t('land.under')}
          </motion.p>
        </div>
      </div>
    </section>
  )
}

/** The same sentence in each tone, written by hand so the landing page needs no AI to show the idea. */
const TONE_DEMO: Record<Tone, string> = {
  plain: 'क्या हम मीटिंग कल पर रख सकते हैं?',
  formal: 'क्या हम कृपया यह बैठक कल के लिए निर्धारित कर सकते हैं?',
  casual: 'मीटिंग कल कर लें क्या?',
  friendly: 'अगर ठीक लगे तो मीटिंग कल रख लें? 😊',
  whatsapp: 'मीटिंग कल रखें? 🙏',
  email: 'नमस्ते, क्या हम बैठक को कल के लिए पुनर्निर्धारित कर सकते हैं? धन्यवाद।',
}

function ToneDemo() {
  const t = useT()
  const ui = useSettings((s) => s.ui)
  const [tone, setTone] = useState<Tone>('whatsapp')
  return (
    <div className="border-line bg-surface relative rounded-3xl border p-6">
      <div className="bg-source absolute inset-x-6 top-0 h-0.5 rounded-full" aria-hidden />
      <p className="spec text-muted">English</p>
      <p className="font-display mt-2 text-2xl">Can we move the meeting to tomorrow?</p>
      <div role="radiogroup" aria-label={t('ws.tone')} className="mt-6 flex flex-wrap gap-1.5">
        {TONES.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={tone === x.id}
            onClick={() => setTone(x.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
              tone === x.id
                ? 'bg-accent text-accent-ink border-transparent font-medium'
                : 'border-line text-muted hover:text-text',
            )}
          >
            <x.icon className="size-4" aria-hidden />
            {ui === 'hi' ? x.hi : x.label}
          </button>
        ))}
      </div>
      <div className="hang-accent mt-6">
        <p className="spec text-muted">हिन्दी · Hindi</p>
        <p
          key={tone}
          lang="hi"
          className="font-display drop-block mt-2 text-3xl leading-snug"
          aria-live="polite"
        >
          {TONE_DEMO[tone]}
        </p>
      </div>
    </div>
  )
}

function Story() {
  const t = useT()
  const beats = [
    { key: 'tone', title: t('land.s1'), body: t('land.s1b'), art: null },
    {
      key: 'conversation',
      title: t('land.s2'),
      body: t('land.s2b'),
      art: '/media/mode-conversation.webp',
    },
    { key: 'camera', title: t('land.s3'), body: t('land.s3b'), art: '/media/mode-camera.webp' },
    {
      key: 'documents',
      title: t('land.s4'),
      body: t('land.s4b'),
      art: '/media/mode-documents.webp',
    },
    {
      key: 'phrasebook',
      title: t('land.s5'),
      body: t('land.s5b'),
      art: '/media/mode-phrasebook.webp',
    },
  ] as const
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  // The visual on the left follows whichever beat is in the middle of the screen.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.beat))
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section
      id="how"
      aria-labelledby="how-h"
      className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <p className="spec text-accent-text">{t('land.howEyebrow')}</p>
      <h2 id="how-h" className="font-display mt-4 max-w-3xl text-5xl leading-tight md:text-6xl">
        {t('land.howH')}
      </h2>
      <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2">
        <div className="hidden md:block">
          <div className="sticky top-28">
            {active === 0 ? (
              <ToneDemo />
            ) : (
              <NearImage
                key={active}
                src={beats[active]?.art ?? ''}
                alt=""
                width={720}
                height={540}

                className="drop-block w-full rounded-3xl"
              />
            )}
          </div>
        </div>
        <ol className="flex flex-col">
          {beats.map((b, i) => (
            <li
              key={b.key}
              ref={(el) => {
                refs.current[i] = el
              }}
              data-beat={i}
              className={cn(
                'border-line flex min-h-[60vh] flex-col justify-center border-t-2 py-10 transition-colors md:min-h-[70vh]',
                active === i && 'border-accent',
              )}
            >
              <p className="spec text-muted">0{i + 1}</p>
              <h3 className="font-display mt-3 text-4xl">{b.title}</h3>
              <p className="text-muted mt-4 max-w-md text-lg">{b.body}</p>
              <div className="mt-8 md:hidden">
                {b.art ? (
                  <NearImage
                    src={b.art}
                    alt=""
                    width={720}
                    height={540}

                    className="w-full rounded-3xl"
                  />
                ) : (
                  <ToneDemo />
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Different() {
  const t = useT()
  const cards = [
    { icon: Languages, title: t('land.d1'), body: t('land.d1b'), wide: true },
    { icon: BookA, title: t('land.d2'), body: t('land.d2b'), sample: true },
    { icon: Cpu, title: t('land.d3'), body: t('land.d3b') },
    { icon: Tags, title: t('land.d4'), body: t('land.d4b') },
    { icon: WifiOff, title: t('land.d5'), body: t('land.d5b') },
  ]
  return (
    <section aria-labelledby="diff-h" className="mx-auto max-w-6xl px-6 py-24">
      <h2 id="diff-h" className="font-display max-w-3xl text-5xl leading-tight md:text-6xl">
        {t('land.diffH')}
      </h2>
      <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <li
            key={c.title}
            className={cn(
              'border-line bg-surface relative flex flex-col rounded-3xl border p-6',
              c.wide && 'md:col-span-2',
            )}
          >
            <div className="bg-accent absolute inset-x-6 top-0 h-0.5 rounded-full" aria-hidden />
            <c.icon className="text-accent-text size-6" aria-hidden />
            <h3 className="font-display mt-6 text-2xl">{c.title}</h3>
            <p className="text-muted mt-2">{c.body}</p>
            {c.sample && (
              <p className="spec mt-6 flex flex-wrap items-center gap-2">
                <span className="text-text normal-case">kya haal hai</span>
                <ArrowRight className="text-accent-text size-3" aria-hidden />
                <span lang="hi" className="text-text text-sm normal-case">
                  क्या हाल है
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function LanguageWall({ reduce }: { reduce: boolean }) {
  const t = useT()
  // Three rows drifting at different speeds, each language in its own script.
  const rows = [0, 1, 2].map((r) => LANGUAGES.filter((_, i) => i % 3 === r).map((l) => l))
  return (
    <section aria-labelledby="langs-h" className="relative overflow-hidden py-24">
      {/* The globe clip turns slowly behind the wall; it loads only when near and never with reduced motion. */}
      <div className="pointer-events-none absolute inset-y-0 end-0 w-full max-w-3xl [mask-image:radial-gradient(closest-side,black_55%,transparent)] opacity-50">
        <LoopVideo
          src="/media/hero"
          poster="/media/hero-poster.webp"
          label=""
          reduce={reduce}
          className="size-full"
        />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <h2 id="langs-h" className="font-display max-w-3xl text-5xl leading-tight md:text-6xl">
          {t('land.langsH', { n: LANGUAGES.length })}
        </h2>
        <p className="text-muted mt-4 max-w-xl text-lg">{t('land.langsB')}</p>
      </div>
      <div className="relative mt-12 flex flex-col gap-4" aria-hidden>
        {rows.map((row, r) => (
          <div
            key={r}
            className="flex w-max gap-8"
            style={
              reduce
                ? undefined
                : { animation: `marquee ${80 + r * 25}s linear infinite ${r % 2 ? 'reverse' : ''}` }
            }
          >
            {[...row, ...row].map((l, i) => (
              <span
                key={i}
                lang={l.code}
                className={cn(
                  'font-display text-4xl whitespace-nowrap md:text-5xl',
                  i % 4 === 0 ? 'text-accent-text' : 'text-muted/70',
                )}
              >
                {l.native}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function Pricing() {
  const t = useT()
  return (
    <section aria-labelledby="price-h" className="mx-auto max-w-6xl px-6 py-24">
      <div className="hang-accent grid grid-cols-1 gap-10 md:grid-cols-[1fr_1.4fr] md:items-end">
        <div>
          <h2 id="price-h" className="font-display text-5xl leading-tight">
            {t('land.priceH')}
          </h2>
          <p className="text-muted mt-4 text-lg">{t('land.priceB')}</p>
          <Button asChild className="mt-6">
            <Link to="/pro">
              {t('land.priceCta')} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PLANS.map((p) => (
            <li
              key={p.name}
              className={cn(
                'rounded-2xl border p-5',
                p.featured ? 'border-accent-text bg-accent/5' : 'border-line',
              )}
            >
              <p className="spec text-muted">{p.name}</p>
              <p className="mt-2">
                <span className="font-display text-4xl">{p.price}</span>
                <span className="text-muted text-sm"> {p.per}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function DeveloperCard() {
  const t = useT()
  return (
    <section aria-labelledby="dev-h" className="mx-auto max-w-6xl px-6 pb-28">
      <div className="border-line bg-surface grid grid-cols-1 items-center gap-8 overflow-hidden rounded-3xl border md:grid-cols-[1fr_1.2fr]">
        <NearImage
          src="/media/developer.webp"
          alt={t('land.devAlt')}
          width={960}
          height={720}

          className="h-full w-full object-cover"
        />
        <div className="p-8">
          <p className="spec text-accent-text">{t('nav.meet')}</p>
          <h2 id="dev-h" className="font-display mt-3 text-4xl">
            {t('land.devH')}
          </h2>
          <p className="text-muted mt-4">{t('land.devB')}</p>
          <Button asChild variant="primary" className="mt-6">
            <Link to="/developer">
              {t('nav.meet')} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
