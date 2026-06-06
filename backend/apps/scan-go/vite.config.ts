import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      // Dev SW disabled: the workbox precache serves stale bundles during local
      // dev (e.g. after .env / vendor changes), which breaks live verification.
      // Production PWA (generateSW on build) is unaffected.
      devOptions: { enabled: false, type: 'module' },
      manifest: {
        name: 'Hanoot Scan & Go',
        short_name: 'Scan & Go',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/admin\/pos-terminal\/catalog-snapshot/,
            handler: 'NetworkFirst',
            options: { cacheName: 'scango-catalog', expiration: { maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['**/*.test.js', '**/*.test.jsx', '**/node_modules/**', '**/dist/**'],
  },
});
