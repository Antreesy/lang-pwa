import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Deutsch lernen',
        short_name: 'Deutsch',
        description: 'Немецкий: словарь и карточки',
        lang: 'ru',
        start_url: '.',
        display: 'standalone',
        background_color: '#16171a',
        theme_color: '#2f5fd0',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the data files too, so that the first import also works after a reload offline.
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        // Dictionary files are larger than the 2 MB default limit.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
    }),
  ],
})
