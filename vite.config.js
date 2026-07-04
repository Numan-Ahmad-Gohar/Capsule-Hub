import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  build: {
    // Chrome Web Store rejects source maps that reference eval; keep clean output.
    sourcemap: false,
    // MV3 target — modern Chrome only, so we can ship modern JS.
    target: 'esnext',
  },
  server: {
    // Stable port so the HMR websocket in the extension context can reconnect.
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
