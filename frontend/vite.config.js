import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }) //extenstion plugin
  ],
  server: {
    proxy: {
      '/analyze': {
        target: 'http://127.0.0.1:8000', // Flask backend URL
        changeOrigin: true,
      },
    },
  },
})
// When you run a browser extension, it doesn't run on http://localhost:5173.
// It runs on a special protocol that looks like this: chrome-extension://[random-letters]
