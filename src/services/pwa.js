// PWA: daftarkan service worker (supaya bisa dibuka offline) + tombol "Pasang aplikasi".
// Tidak dipakai di APK (berkas sudah ada di dalam aplikasi) dan di pratinjau yang menolak service worker.
import { useSyncExternalStore } from 'react'

let deferred = null; let waiting = null; const subs = new Set(); const emit = () => subs.forEach((f) => f())
export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '')

export function registerPwa() {
  if (typeof window === 'undefined' || window.Capacitor?.isNativePlatform?.()) return
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit() })
  window.addEventListener('appinstalled', () => { deferred = null; emit() })
  if (!('serviceWorker' in navigator)) return
  const ok = location.protocol === 'https:' || location.hostname === 'localhost'
  if (!ok) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // versi baru terpasang di belakang → tawarkan muat ulang (tidak memaksa, supaya absen yang sedang diisi tidak hilang)
      const watch = (w) => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { waiting = w; emit() } })
      if (reg.waiting && navigator.serviceWorker.controller) { waiting = reg.waiting; emit() }
      reg.addEventListener('updatefound', () => watch(reg.installing))
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
    }).catch(() => { /* pratinjau/izin ditolak: abaikan */ })
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload() } })
  })
}

// 'prompt' = bisa dipasang lewat tombol · 'ios' = tampilkan petunjuk Bagikan › Tambah ke Layar Utama · '' = tidak perlu
const snap = () => (window.Capacitor?.isNativePlatform?.() || isStandalone() ? '' : deferred ? 'prompt' : isIOS() ? 'ios' : '')
export const useInstall = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, snap)
export async function promptInstall() { if (!deferred) return false; deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; emit(); return r?.outcome === 'accepted' }

export const useUpdate = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => !!waiting)
export const applyUpdate = () => { waiting?.postMessage('skipWaiting') }
