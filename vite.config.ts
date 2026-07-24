import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/BoardScore/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['boardscore-icon.svg', 'favicon.svg'],
      manifest: {
        name: 'BoardScore',
        short_name: 'BoardScore',
        description: 'Fast, reliable board game scoring.',
        theme_color: '#3268e4',
        background_color: '#f8f9fa',
        display: 'standalone',
        start_url: '/BoardScore/',
        scope: '/BoardScore/',
        icons: [
          {
            src: '/BoardScore/boardscore-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: '/BoardScore/boardscore-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
