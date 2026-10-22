import { finishOpenRouterAuth, openRouterPending, startOpenRouterAuth } from '@/ai/openrouter'
import { inBlockedRegion, loadPuter, providers } from '@/ai/providers'
import {
  addPasskey,
  confirmAdult,
  countPasskeys,
  deleteAccount,
  googleEnabled,
  getSupabase,
  isAdult,
  passkeysSupported,
  sendMagicLink,
  signInWithGoogle,
  signInWithPasskey,
  signOut,
  verifyEmailCode,
} from '@/ai/supabase'
import { PageHeader } from '@/components/PageHeader'
import { UiLangToggle } from '@/components/UiLangToggle'
import { useT, type Key } from '@/i18n'
import { hasDeviceTranslator } from '@/translate/device'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { useSettings, type ProviderId, type Theme } from '@/stores/settings'
import { Link } from '@tanstack/react-router'
import { KeyRound, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="border-line scroll-mt-24 border-b py-8 first:pt-0"
    >
      <h2 id={`${id}-h`} className="font-display mb-4 text-3xl">
        {title}
      </h2>
      {children}
    </section>
  )
}

// Provider names that change with the interface language; Puter and OpenRouter are names.
const PROVIDER_LABEL: Partial<Record<ProviderId, Key>> = { ew: 'prov.ew', own: 'prov.own' }

const input =
  'h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm outline-none focus:border-accent'

export function SettingsPage() {
  const s = useSettings()
  const t = useT()
  const label = (id: ProviderId, fallback: string) => {
    const key = PROVIDER_LABEL[id]
    return key ? t(key) : fallback
  }

  // Back from OpenRouter's consent screen with ?code=...
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('code')
    // Supabase's email link also lands here with ?code=; leave that one for Supabase to exchange.
    if (!code || !openRouterPending()) return
    history.replaceState(null, '', location.pathname + location.hash)
    finishOpenRouterAuth(code)
      .then((ok) => ok && toast.success(t('set.orConnected')))
      .catch(() => toast.error(t('set.orFailed')))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on the way back from OpenRouter
  }, [])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader eyebrow={t('set.eyebrow')} title={t('set.title')} />

      <Section id="theme" title={t('set.theme')}>
        <div role="radiogroup" aria-label={t('set.theme')} className="flex gap-2">
          {(
            [
              ['system', 'set.system', Monitor],
              ['dark', 'set.dark', Moon],
              ['light', 'set.light', Sun],
            ] as [Theme, Key, typeof Sun][]
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={s.theme === value}
              onClick={() => s.set({ theme: value })}
              className={cn(
                'flex items-center gap-2 rounded-full border px-4 py-2 text-sm',
                s.theme === value ? 'border-accent bg-accent/10' : 'border-line hover:bg-surface-2',
              )}
            >
              <Icon className="size-4" aria-hidden /> {t(label)}
            </button>
          ))}
        </div>
      </Section>

      <Section id="translation" title={t('set.translation')}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm">{t('uiLang')}</span>
            <UiLangToggle />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={s.preferDevice}
              onChange={(e) => s.set({ preferDevice: e.target.checked })}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              {t('set.preferDevice')}
              <span className="text-muted block">
                {hasDeviceTranslator() ? t('set.deviceYes') : t('set.deviceNo')}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={s.hinglish}
              onChange={(e) => s.set({ hinglish: e.target.checked })}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              {t('set.hinglish')}
              <span className="text-muted block">आप कैसे हैं → aap kaise hain</span>
            </span>
          </label>
        </div>
      </Section>

      <Section id="ai" title={t('set.ai')}>
        <p className="text-muted mb-4 max-w-prose text-sm">
          {t('set.aiLead')}{' '}
          <Link to="/privacy" className="text-accent-text underline underline-offset-4">
            {t('set.privacyLink')}
          </Link>
        </p>
        <div
          role="radiogroup"
          aria-label={t('set.provider')}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          {providers.map((p) => {
            const offered = p.offered()
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={s.provider === p.id}
                disabled={!offered}
                onClick={() => s.set({ provider: p.id })}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-colors disabled:opacity-50',
                  s.provider === p.id
                    ? 'border-accent-text bg-accent/5'
                    : 'border-line hover:bg-surface-2',
                )}
              >
                <span className="font-medium">{label(p.id, p.label)}</span>
                <span className="text-muted mt-1 block text-sm">
                  {offered
                    ? t(`prov.${p.id}.blurb`)
                    : p.id === 'ew' && inBlockedRegion()
                      ? t('set.notRegion')
                      : t('set.notSetUp')}
                </span>
              </button>
            )
          })}
        </div>
        <ProviderSetup provider={s.provider} />
      </Section>

      <p className="spec text-muted pt-8">{t('set.build', { build: __BUILD__ })}</p>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  type = 'number',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="spec text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={input}
      />
    </div>
  )
}

function ProviderSetup({ provider }: { provider: ProviderId | null }) {
  const s = useSettings()
  const t = useT()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [passkeys, setPasskeys] = useState<number | null>(null)
  const [code, setCode] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [adult, setAdult] = useState(false)

  useEffect(() => {
    if (provider !== 'ew') return
    let unsubscribe = () => {}
    let live = true
    void getSupabase().then((sb) => {
      if (!sb || !live) return
      // Fires once straight away with the current session, then on every sign-in or sign-out.
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        setSignedIn(Boolean(session))
        void isAdult()
          .then(setAdult)
          .catch(() => setAdult(false))
        if (session) void countPasskeys().then(setPasskeys)
      })
      unsubscribe = () => data.subscription.unsubscribe()
    })
    return () => {
      live = false
      unsubscribe()
    }
  }, [provider])

  if (provider === 'ew')
    return (
      <div className="border-line mt-6 max-w-lg rounded-2xl border p-4">
        {!signedIn && passkeysSupported() && (
          <div className="border-line mb-4 flex flex-col gap-2 border-b pb-4">
            <Button
              variant="primary"
              className="self-start"
              onClick={() =>
                void signInWithPasskey()
                  .then(() => toast.success(t('set.signedInToast')))
                  .catch(() => toast.error(t('set.passkeyNone')))
              }
            >
              <KeyRound /> {t('set.passkeyBtn')}
            </Button>
            <p className="text-muted text-xs">{t('set.passkeyHint')}</p>
          </div>
        )}
        {!signedIn && googleEnabled && (
          <Button
            className="mb-4"
            onClick={() => void signInWithGoogle().catch(() => toast.error(t('set.googleFail')))}
          >
            {t('set.google')}
          </Button>
        )}
        {!signedIn && !sent ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              sendMagicLink(email)
                .then(() => setSent(true))
                .catch((err: unknown) =>
                  toast.error(err instanceof Error ? err.message : t('set.emailFail')),
                )
            }}
          >
            <label htmlFor="ew-email" className="text-sm">
              {t('set.emailLabel')}
            </label>
            <div className="flex gap-2">
              <input
                id="ew-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                autoComplete="email"
              />
              <Button type="submit" variant="primary">
                {t('set.emailMe')}
              </Button>
            </div>
          </form>
        ) : !signedIn ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              verifyEmailCode(email, code.trim())
                .then(() => toast.success(t('set.signedInToast')))
                .catch(() => toast.error(t('set.codeWrong')))
            }}
          >
            <label htmlFor="ew-code" className="text-sm">
              {t('set.codeLabel', { email })}
            </label>
            <div className="flex gap-2">
              <input
                id="ew-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className={`${input} font-mono tracking-[0.3em]`}
              />
              <Button type="submit" variant="primary">
                {t('set.verify')}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => {
                setSent(false)
                setCode('')
              }}
            >
              {t('set.otherEmail')}
            </Button>
          </form>
        ) : adult ? (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-accent-text">{t('set.signedIn')}</span>
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                {t('set.signOut')}
              </Button>
            </div>
            {passkeysSupported() && !passkeys && (
              <div className="border-accent/30 bg-accent/10 flex flex-wrap items-center gap-3 rounded-xl border p-3">
                <p className="flex-1">{t('set.addPasskeyHint')}</p>
                <Button
                  variant="ai"
                  size="sm"
                  onClick={() =>
                    void addPasskey()
                      .then(() => {
                        setPasskeys(1)
                        toast.success(t('set.passkeyAdded'))
                      })
                      .catch(() => toast.error(t('set.passkeyFail')))
                  }
                >
                  <KeyRound /> {t('set.addPasskey')}
                </Button>
              </div>
            )}
            {Boolean(passkeys) && (
              <p className="text-muted">
                {passkeys === 1
                  ? t('set.passkeysOne')
                  : t('set.passkeysMany', { n: passkeys ?? 0 })}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p>{t('set.adultOnly')}</p>
            <Button
              variant="primary"
              className="self-start"
              onClick={() =>
                void confirmAdult()
                  .then(() => setAdult(true))
                  .catch(() => toast.error(t('set.saveFail')))
              }
            >
              {t('set.adultBtn')}
            </Button>
          </div>
        )}
        {signedIn && (
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => {
              if (!confirm(t('set.deleteConfirm'))) return
              deleteAccount()
                .then(() => toast.success(t('set.deleted')))
                .catch(() => toast.error(t('set.deleteFail')))
            }}
          >
            <Trash2 /> {t('set.delete')}
          </Button>
        )}
      </div>
    )

  if (provider === 'puter') return <PuterSetup />

  if (provider === 'openrouter')
    return (
      <div className="border-line mt-6 flex max-w-lg flex-col gap-3 rounded-2xl border p-4">
        {s.openrouterKey ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-accent-text">{t('set.orConnected')}</span>
            <Button variant="ghost" size="sm" onClick={() => s.set({ openrouterKey: null })}>
              {t('set.disconnect')}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            className="self-start"
            onClick={() => void startOpenRouterAuth()}
          >
            {t('set.orConnect')}
          </Button>
        )}
        <NumberField
          label={t('set.model')}
          type="text"
          value={s.openrouterModel}
          onChange={(v) => s.set({ openrouterModel: v })}
        />
      </div>
    )

  if (provider === 'own')
    return (
      <div className="border-line mt-6 grid max-w-lg gap-3 rounded-2xl border p-4">
        <NumberField
          label={t('set.baseUrl')}
          type="url"
          value={s.ownBaseUrl}
          onChange={(v) => s.set({ ownBaseUrl: v })}
        />
        <NumberField
          label={t('set.model')}
          type="text"
          value={s.ownModel}
          onChange={(v) => s.set({ ownModel: v })}
        />
        <NumberField
          label={t('set.apiKey')}
          type="password"
          value={s.ownKey ?? ''}
          onChange={(v) => s.set({ ownKey: v || null })}
        />
      </div>
    )

  return null
}

/** Puter runs the model on the user's own free Puter account; sign-in must start from a click (it's a popup). */
function PuterSetup() {
  const t = useT()
  const [state, setState] = useState<'loading' | 'out' | 'in' | 'error'>('loading')
  const [user, setUser] = useState('')

  useEffect(() => {
    let live = true
    loadPuter()
      .then(async () => {
        if (!live || !window.puter) return
        if (window.puter.auth.isSignedIn()) {
          setUser((await window.puter.auth.getUser()).username)
          setState('in')
        } else setState('out')
      })
      .catch(() => live && setState('error'))
    return () => {
      live = false
    }
  }, [])

  async function connect() {
    try {
      await window.puter?.auth.signIn()
      setUser((await window.puter?.auth.getUser())?.username ?? '')
      setState('in')
      toast.success(t('set.puterDone'))
    } catch {
      toast.error(t('set.puterFail'))
    }
  }

  return (
    <div className="border-line mt-6 flex max-w-lg flex-col gap-3 rounded-2xl border p-4 text-sm">
      {state === 'loading' && <p className="text-muted">{t('set.puterLoading')}</p>}
      {state === 'error' && <p className="text-danger">{t('set.puterError')}</p>}
      {state === 'out' && (
        <>
          <p>{t('set.puterLead')}</p>
          <Button variant="primary" className="self-start" onClick={() => void connect()}>
            {t('set.puterConnect')}
          </Button>
        </>
      )}
      {state === 'in' && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-accent-text">
            {user ? t('set.puterConnectedAs', { user }) : t('set.puterConnected')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.puter?.auth.signOut()
              setState('out')
            }}
          >
            {t('set.disconnect')}
          </Button>
        </div>
      )}
    </div>
  )
}
