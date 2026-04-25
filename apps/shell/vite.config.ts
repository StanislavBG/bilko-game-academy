import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base path — set via `BASE_PATH=/bilko-game-academy/` env for GitHub Pages
// sub-path deploys. Leave unset (defaults to '/') for root-hosted deploys
// (Cloudflare Pages, Netlify with custom domain, local dev).
const BASE_PATH = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bilko Game Academy',
        short_name: 'Bilko',
        description: 'A library of 2D games — play on iPad, web, and PC.',
        theme_color: '#0a4052',
        background_color: '#0a4052',
        display: 'standalone',
        orientation: 'any',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icon-maskable.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only shell + Phaser chunks. Sprites cache on first-use to
        // keep PWA install lightweight (~1.8 MB instead of 29 MB).
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2,json}'],
        globIgnores: ['**/boat-shooter-sprites/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/boat-shooter-sprites\/.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'boat-shooter-sprites',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split Phaser out so the shell can boot without loading it until
          // a game is actually mounted. Shaves ~1.2 MB off the initial bundle
          // for users who never launch a game (Home / Settings / etc.).
          if (id.includes('node_modules/phaser/')) return 'phaser';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'i18n';
          return undefined;
        },
      },
    },
  },
});
