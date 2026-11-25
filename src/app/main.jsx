import './flag.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import AppKaryawan from './AppKaryawan.jsx'
import './fonts.css'
import '../styles.css'
import './app.css'
import { registerPwa } from '../services/pwa.js'
registerPwa()

createRoot(document.getElementById('root')).render(<AppKaryawan />)

// Splash pembuka (ada di app.html, tampil sejak detik pertama sebelum skrip selesai dimuat).
// Ditutup setelah 2 detik sejak aplikasi dibuka, lalu memudar ke Masuk/Beranda. Hanya saat aplikasi baru dibuka.
const SPLASH_MS = 2000
const splash = document.getElementById('ksplash')
if (splash) {
  const wait = Math.max(0, SPLASH_MS - performance.now())
  setTimeout(() => {
    splash.classList.add('out')
    setTimeout(() => { splash.remove(); document.documentElement.classList.remove('kirana-splash') }, 380)
  }, wait)
}
