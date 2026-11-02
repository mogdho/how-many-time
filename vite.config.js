import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages এবং Vercel উভয়ের জন্য এটি সবচেয়ে নিরাপদ
  base: './', 
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // SW is registered in src/lib/pwa.js
      // Our own service worker (src/sw.js) so it can show the evening reminder.
      // Offline caching and the index.html fallback are set up inside it.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'How many times I have done it',
        short_name: 'HMT',
        description: 'Track your guilty pleasures. Private, local-only, no tracking.',
        theme_color: '#1a1a3e',
        background_color: '#1a1a3e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  test: {
    env: { TZ: 'America/New_York' },
  },
  build: {
    // Vite 8 এর নতুন এরর এড়াতে এই সেটিংসটি যোগ করুন
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  }
})
