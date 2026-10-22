import type { ReactNode } from 'react'

function Page({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <article className="[&_h2]:font-display [&_p]:text-muted [&_ul]:text-muted mx-auto max-w-3xl px-6 pt-36 pb-28 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-3xl [&_li]:mt-2 [&_p]:mt-3 [&_ul]:list-disc [&_ul]:ps-5">
      <p className="spec text-accent-text">Last updated {updated}</p>
      <h1 className="font-display hang-accent mt-4 text-6xl">{title}</h1>
      {children}
    </article>
  )
}

export function Privacy() {
  return (
    <Page title="Privacy" updated="22 October 2026">
      <p>
        The short version: whenever your browser can, translation happens on your device and nothing
        leaves it. Your history, phrasebook and glossary are stored only in your browser. We don't
        run ads, trackers or analytics.
      </p>

      <h2>What stays on your device</h2>
      <ul>
        <li>
          <strong>Plain translations</strong> use your browser's built-in translator when it has one
          (Chrome on desktop, version 138 and later). The text never leaves your device.
        </li>
        <li>
          <strong>Photos</strong> on the Camera page are read on your device by Tesseract, which
          runs in your browser. The photo is never uploaded. The first time you read a language, its
          recognition data downloads from the jsDelivr CDN.
        </li>
        <li>
          <strong>Documents</strong> are opened and rebuilt in your browser. They are translated on
          your device unless you tick “Allow AI for this document”.
        </li>
        <li>
          <strong>Speech</strong> uses your browser's speech recognition and voices. Some browsers
          (Chrome among them) send speech recognition audio to their own servers; that is the
          browser's service, under its own policy.
        </li>
        <li>
          History, phrasebook, glossary and settings live in your browser (IndexedDB and local
          storage). Clearing your browser data deletes them.
        </li>
      </ul>

      <h2>When you use the AI</h2>
      <p>
        Tones, respect levels, explanations and word alternatives need AI, as does any translation
        your browser can't do on its own. You choose the provider in Settings. The AI sees only the
        text you asked it to work on and the glossary terms that appear in it.
      </p>
      <ul>
        <li>
          <strong>Translate+ AI (free)</strong> runs through our server on Google's Gemini API free
          tier.{' '}
          <strong>
            Google may read and use prompts sent on the free tier to improve its products, so don't
            send confidential or personal text through the free server.
          </strong>{' '}
          Use on-device translation or your own key for that. You sign in with an email code or a
          passkey (Supabase) so we can count your daily calls; we store your email, a user id, the
          date you confirmed you're 18 or over, a per-day call count and, if you add one, your
          passkey's public key. Nothing else, and never the text you translate. You can delete all
          of it any time from Settings. This option is not offered in the EEA, the UK or
          Switzerland, or to anyone under 18.
        </li>
        <li>
          <strong>Puter</strong>, <strong>OpenRouter</strong> and <strong>your own key</strong> send
          requests straight from your browser to that service, under its own privacy policy. Keys
          are stored only in your browser.
        </li>
      </ul>

      <h2>Our server</h2>
      <p>
        Our API logs the time, route and status of requests to keep it running, and uses your IP
        address in memory to apply rate limits and the region rule. It doesn't store what you
        translate. We don't sell or share data.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or deletion requests: reach Emmanuel via{' '}
        <a className="text-accent-text underline" href="https://emmanuelwilson.tech">
          emmanuelwilson.tech
        </a>
        .
      </p>
    </Page>
  )
}

export function Terms() {
  return (
    <Page title="Terms" updated="22 October 2026">
      <p>
        Translate+ is open-source software provided as is, without warranty. By using it you agree
        to these terms.
      </p>
      <h2>Translations</h2>
      <p>
        Machine translations, explanations and alternatives can be wrong or sound off. Check
        anything important with a fluent speaker before you rely on it, and never use Translate+ for
        medical, legal or safety-critical text without a professional review.
      </p>
      <h2>Your content</h2>
      <p>
        What you translate stays yours, and it lives on your device. You are responsible for backing
        up your phrasebook and glossary, and for having the right to translate the documents you
        open.
      </p>
      <h2>The free AI server</h2>
      <p>Fair-use limits apply to the free AI server, and we may change or pause it.</p>
      <h2>Pro</h2>
      <p>
        When Pro launches, its price and refund rules will be shown at checkout. Pro never unlocks
        the AI itself; that stays free.
      </p>
      <h2>Licence</h2>
      <p>
        The source code is MIT-licensed. The Translate+ name, logo and character artwork belong to
        EWSTUDIOS.
      </p>
    </Page>
  )
}
