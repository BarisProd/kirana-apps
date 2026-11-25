/* Service worker Kirana Karyawan (PWA) — dibuat otomatis saat build (vite.app.config.js).
   Strategi: semua berkas aplikasi disimpan saat dipasang (precache) → aplikasi bisa dibuka tanpa sinyal.
   Data absen offline TIDAK lewat sini: disimpan di IndexedDB oleh aplikasi dan dikirim saat online. */
const VERSION = '__VERSION__'
const CACHE = 'kirana-' + VERSION
const FILES = __FILES__

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))) })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('kirana-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting() })
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  // halaman: coba jaringan dulu (versi terbaru), jatuh ke salinan bila offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return r }).catch(() => caches.match('./index.html')))
    return
  }
  // berkas statis: dari cache dulu (cepat & jalan offline), sambil memperbarui di belakang
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) } return r }).catch(() => hit)
    return hit || net
  }))
})
