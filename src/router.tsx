import { SiteLayout } from '@/components/SiteLayout'
import { useHtmlLang } from '@/i18n'
import { NotFound } from '@/pages/NotFound'
import { useSettings, applyTheme } from '@/stores/settings'
import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { Toaster } from 'sonner'

function Root() {
  const theme = useSettings((s) => s.theme)
  useHtmlLang()
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])
  return (
    <>
      <Outlet />
      <Toaster
        position="bottom-center"
        theme={theme === 'system' ? 'system' : theme}
        richColors
        closeButton
      />
    </>
  )
}

const root = createRootRoute({ component: Root, notFoundComponent: NotFound })

const site = createRoute({ getParentRoute: () => root, id: 'site', component: SiteLayout })
// The app shell is lazy too, so the landing page doesn't download the app.
const shell = createRoute({
  getParentRoute: () => root,
  id: 'shell',
  component: lazyRouteComponent(() => import('@/components/AppShell'), 'AppShell'),
})

const sitePages = [
  createRoute({
    getParentRoute: () => site,
    path: '/',
    component: lazyRouteComponent(() => import('@/pages/Landing'), 'Landing'),
  }),
  createRoute({
    getParentRoute: () => site,
    path: 'developer',
    component: lazyRouteComponent(() => import('@/pages/Developer'), 'Developer'),
  }),
  createRoute({
    getParentRoute: () => site,
    path: 'pro',
    component: lazyRouteComponent(() => import('@/pages/Pro'), 'Pro'),
  }),
  createRoute({
    getParentRoute: () => site,
    path: 'privacy',
    component: lazyRouteComponent(() => import('@/pages/Legal'), 'Privacy'),
  }),
  createRoute({
    getParentRoute: () => site,
    path: 'terms',
    component: lazyRouteComponent(() => import('@/pages/Legal'), 'Terms'),
  }),
]

const page = <P extends string>(path: P, component: ReturnType<typeof lazyRouteComponent>) =>
  createRoute({ getParentRoute: () => shell, path, component })

const appPages = [
  createRoute({
    getParentRoute: () => shell,
    path: 'app',
    // ?text= prefills the workspace (from History, the PWA share target, or a link).
    validateSearch: (s: Record<string, unknown>): { text?: string; to?: string } => ({
      ...(typeof s.text === 'string' && s.text && { text: s.text.slice(0, 5000) }),
      ...(typeof s.to === 'string' && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(s.to) && { to: s.to }),
    }),
    component: lazyRouteComponent(() => import('@/pages/Workspace'), 'Workspace'),
  }),
  page(
    'app/conversation',
    lazyRouteComponent(() => import('@/pages/Conversation'), 'Conversation'),
  ),
  page(
    'app/camera',
    lazyRouteComponent(() => import('@/pages/CameraPage'), 'CameraPage'),
  ),
  page(
    'app/documents',
    lazyRouteComponent(() => import('@/pages/Documents'), 'Documents'),
  ),
  page(
    'app/phrasebook',
    lazyRouteComponent(() => import('@/pages/Phrasebook'), 'Phrasebook'),
  ),
  page(
    'app/glossary',
    lazyRouteComponent(() => import('@/pages/Glossary'), 'Glossary'),
  ),
  page(
    'app/history',
    lazyRouteComponent(() => import('@/pages/HistoryPage'), 'HistoryPage'),
  ),
  page(
    'settings',
    lazyRouteComponent(() => import('@/pages/SettingsPage'), 'SettingsPage'),
  ),
]

const routeTree = root.addChildren([site.addChildren(sitePages), shell.addChildren(appPages)])

export const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
