import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { renameSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join, relative } from 'path'
import { createHash } from 'crypto'

// Build aplikasi karyawan (APK & PWA): entry app.html → dist-app/index.html (webDir Capacitor & situs PWA).
// Setelah build: buat dist-app/sw.js berisi daftar semua berkas (precache) + versi dari hash isinya.
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
export default defineConfig({
  plugins: [react(), {
    name: 'kirana-app-finish',
    closeBundle() {
      if (existsSync('dist-app/app.html')) renameSync('dist-app/app.html', 'dist-app/index.html')
      const files = walk('dist-app').filter((p) => !p.endsWith('sw.js')).map((p) => './' + relative('dist-app', p).split('\\').join('/'))
      const h = createHash('sha256'); files.forEach((f) => h.update(f + readFileSync(join('dist-app', f))))
      const sw = readFileSync('scripts/sw-template.js', 'utf8').replace('__VERSION__', h.digest('hex').slice(0, 10)).replace('__FILES__', JSON.stringify(['./', ...files]))
      writeFileSync('dist-app/sw.js', sw)
    },
  }],
  base: './',
  publicDir: 'public-app',
  build: { outDir: 'dist-app', emptyOutDir: true, sourcemap: false, rollupOptions: { input: 'app.html' } },
})
