import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB to support SQLite WASM offline precaching
      },
      manifest: {
        name: 'Gym Tracker',
        short_name: 'GymTracker',
        description: 'Lightweight, frictionless offline-first gym tracking PWA',
        theme_color: '#0b0e14',
        background_color: '#0b0e14',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          }
        ]
      }
    })
  ],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@powersync/web']
  }
})
