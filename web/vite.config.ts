import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves project sites from https://<user>.github.io/cosmarium/.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/cosmarium/' : '/',
  plugins: [react()],
  clearScreen: false,
  server: { port: 1422, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: { target: 'es2020', outDir: 'dist' }
}))
