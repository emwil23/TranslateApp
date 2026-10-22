// Hindi in the interface and in translations.
import '@fontsource-variable/noto-sans-devanagari'
import '@fontsource-variable/noto-serif-devanagari'
import { useT, type Key } from '@/i18n'
import { cn } from '@/lib/cn'
import { Link, Outlet } from '@tanstack/react-router'
import {
  BookMarked,
  Camera,
  FileText,
  History,
  Languages,
  MessagesSquare,
  Settings,
  Tags,
} from 'lucide-react'
import { Logo, LogoMark } from './Logo'
import { UiLangToggle } from './UiLangToggle'

const PRIMARY = [
  { to: '/app', key: 'nav.translate', icon: Languages, exact: true },
  { to: '/app/conversation', key: 'nav.conversation', icon: MessagesSquare, exact: false },
  { to: '/app/camera', key: 'nav.camera', icon: Camera, exact: false },
  { to: '/app/documents', key: 'nav.documents', icon: FileText, exact: false },
  { to: '/app/phrasebook', key: 'nav.phrasebook', icon: BookMarked, exact: false },
] as const
const SECONDARY = [
  { to: '/app/glossary', key: 'nav.glossary', icon: Tags, exact: false },
  { to: '/app/history', key: 'nav.history', icon: History, exact: false },
  { to: '/settings', key: 'nav.settings', icon: Settings, exact: false },
] as const

type NavItem = (typeof PRIMARY)[number] | (typeof SECONDARY)[number]

function SideLink({ item, label }: { item: NavItem; label: string }) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact }}
      className="text-muted hover:text-text [&.active]:text-text group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors [&.active]:font-medium"
    >
      {/* The active item hangs from a short marigold line, like the rest of the interface. */}
      <span className="bg-line group-[.active]:bg-accent h-5 w-0.5 rounded-full" aria-hidden />
      <item.icon className="size-4" aria-hidden />
      {label}
    </Link>
  )
}

export function AppShell() {
  const t = useT()
  const label = (k: Key) => t(k)
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="focus:bg-accent focus:text-accent-ink sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:px-3 focus:py-2"
      >
        {t('skip')}
      </a>

      <aside className="border-line bg-bg sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e px-3 py-5 md:flex">
        <Link to="/" aria-label={t('home')} className="mb-8 px-3">
          <Logo />
        </Link>
        <nav aria-label={t('nav.app')} className="flex flex-col gap-0.5">
          {PRIMARY.map((n) => (
            <SideLink key={n.to} item={n} label={label(n.key)} />
          ))}
          <div className="border-line my-3 border-t" />
          {SECONDARY.map((n) => (
            <SideLink key={n.to} item={n} label={label(n.key)} />
          ))}
        </nav>
        <UiLangToggle className="mt-auto self-start" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line bg-bg/85 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur-md md:hidden">
          <Link to="/" aria-label={t('home')}>
            <LogoMark />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <UiLangToggle />
            {SECONDARY.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                aria-label={label(n.key)}
                className="text-muted hover:text-text [&.active]:text-accent-text grid size-9 place-items-center rounded-full"
              >
                <n.icon className="size-4" aria-hidden />
              </Link>
            ))}
          </div>
        </header>

        <main id="main" className="flex min-h-0 flex-1 flex-col pb-20 md:pb-0">
          <Outlet />
        </main>

        <nav
          aria-label={t('nav.app')}
          className="border-line bg-bg/90 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        >
          {PRIMARY.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className={cn(
                'text-muted [&.active]:text-text flex flex-col items-center gap-1 border-t-2 border-transparent py-2 text-[11px]',
                '[&.active]:border-accent',
              )}
            >
              <n.icon className="size-5" aria-hidden />
              <span className="max-w-full truncate px-1">{label(n.key)}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
