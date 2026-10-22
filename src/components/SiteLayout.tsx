import { useT } from '@/i18n'
import { Link, Outlet } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { Logo } from './Logo'
import { UiLangToggle } from './UiLangToggle'
import { Button } from './ui/button'

export function SiteLayout() {
  const t = useT()
  const links = [
    { to: '/', hash: 'how', label: t('nav.how') },
    { to: '/pro', label: t('nav.pro') },
    { to: '/developer', label: t('nav.developer') },
  ] as const
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="focus:bg-accent focus:text-accent-ink sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:px-3 focus:py-2"
      >
        {t('skip')}
      </a>
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="border-line/70 bg-bg/70 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-6xl items-center justify-between gap-3 rounded-full border px-4 py-2 backdrop-blur-md">
          <Link to="/" aria-label={t('home')}>
            <Logo />
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                {...('hash' in l && { hash: l.hash, activeOptions: { includeHash: true } })}
                className="text-muted hover:text-text [&.active]:text-text rounded-lg px-3 py-1.5 text-sm"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <UiLangToggle className="hidden sm:flex" />
            <Button asChild variant="primary" size="sm">
              <Link to="/app">{t('nav.open')}</Link>
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export function Footer() {
  const t = useT()
  const link = 'text-muted hover:text-text'
  return (
    <footer className="border-line border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="text-muted mt-3 text-sm">{t('tagline')}</p>
          <UiLangToggle className="mt-4 inline-flex" />
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
          <Link to="/app" className={link}>
            {t('nav.app')}
          </Link>
          <Link to="/pro" className={link}>
            {t('nav.pro')}
          </Link>
          <Link to="/developer" className={link}>
            {t('nav.meet')}
          </Link>
          <Link to="/privacy" className={link}>
            {t('nav.privacy')}
          </Link>
          <a href="https://github.com/emwil23/TranslateApp" className={link}>
            {t('nav.source')}
          </a>
          <Link to="/terms" className={link}>
            {t('nav.terms')}
          </Link>
        </nav>
      </div>
      {/* The studio credit stays in English in both interface languages. */}
      <p className="spec border-line text-muted border-t py-5 text-center" lang="en">
        Made with{' '}
        <Heart className="fill-accent-text text-accent-text inline size-3.5" aria-label="love" /> by
        EWSTUDIOS
      </p>
    </footer>
  )
}
