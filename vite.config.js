import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages এবং Vercel উভয়ের জন্য এটি সবচেয়ে নিরাপদ
  base: './', 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Vite 8/Rolldown এরর এড়াতে injectRegister 'script' ব্যবহার করুন
      injectRegister: 'script', 
      workbox: {
        // এই অংশটি সাদা স্ক্রিন ফিক্স করতে সাহায্য করবে
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'How many times I have done it',
        short_name: 'HMT',
        description: 'Track your guilty pleasures. Private, local-only, no tracking.',
        theme_color: '#c1272d',
        background_color: '#c1272d',
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
  build: {
    // Vite 8 এর নতুন এরর এড়াতে এই সেটিংসটি যোগ করুন
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  }
})
