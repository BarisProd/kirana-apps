import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static build (tanpa SSR). base './' agar bisa dibungkus WebView Android/iOS & di-hosting di mana saja.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', sourcemap: false }
})
