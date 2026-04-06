import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    base: '/how-many-time/',
    plugins: [
        react(),
        VitePWA({
            injectRegister: 'auto',
            registerType: 'autoUpdate',
            includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                navigateFallback: null,
                // Add this to avoid Vite 6/Rolldown conflicts
                skipWaiting: true,
                clientsClaim: true,
            },
            // Add this line
            experimental: {
                directoryIndex: 'index.html',
            },
            manifest: {
                name: 'How many time I have done it',
                short_name: 'HMT',
                description: 'Private, offline single-action logger',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                start_url: '/how-many-time/',
                scope: '/how-many-time/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            }
        })
    ]
});
