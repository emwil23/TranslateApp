/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Shown at the bottom of Settings, so anyone can tell which build they're on.
const build = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
})()

export default defineConfig({
  define: { __BUILD__: JSON.stringify(`${build} · ${new Date().toISOString().slice(0, 10)}`) },
  plugins: [
    react(),
    {
      // A copy of the plain index.html for the service worker's offline fallback. index.html itself gets
      // prerendered landing content after the build (scripts/prerender.mjs), which /app must never show.
      name: 'app-shell',
      enforce: 'post',
      generateBundle(_, bundle) {
        const html = bundle['index.html']
        if (html.type === 'asset')
          this.emitFile({ type: 'asset', fileName: 'shell/index.html', source: html.source })
      },
    },
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Translate+',
        short_name: 'Translate+',
        description: 'The translator that gets your tone',
        theme_color: '#0D0E13',
        background_color: '#0D0E13',
        display: 'standalone',
        start_url: '/app',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Conversation', url: '/app/conversation' },
          { name: 'Camera', url: '/app/camera' },
          { name: 'Phrasebook', url: '/app/phrasebook' },
        ],
        // Share text from another app straight into the workspace.
        share_target: { action: '/app', method: 'GET', params: { text: 'text' } },
      },
      workbox: {
        // Take over as soon as a new version installs, so a deploy reaches open tabs on their next load.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,svg,woff2,avif,webp,png}', 'shell/index.html'],
        // The hero video and the 3D bundle are landing-page extras; don't make every install download them.
        // CJK fonts alone are hundreds of files; they load on demand when that script appears.
        globIgnores: [
          '**/media/*.mp4',
          '**/media/*.webm',
          '**/GlyphGlobe-*.js',
          '**/noto-sans-{jp,sc,kr}-*.woff2',
          '**/pdf.worker*',
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/shell/index.html',
      },
    }),
  ],
  // The lazy 3D hero chunk (three.js) is ~1 MB by itself; it loads after first paint, on wide screens only.
  build: { chunkSizeWarningLimit: 1200 },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
