// Lokasi untuk absensi: ambil titik GPS + hitung jarak ke lokasi kantor.
// GPS tetap bisa didapat tanpa sinyal data (satelit), hanya lebih lambat → timeout dibuat longgar.
export const distanceM = (a, b) => {
  const R = 6371000; const r = (x) => (x * Math.PI) / 180
  const dLat = r(b.lat - a.lat); const dLng = r(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

// Lokasi kantor terdekat yang aktif + apakah di dalam radius
export function nearestOffice(pos, lokasi = []) {
  const act = lokasi.filter((l) => l.aktif && l.lat != null)
  if (!pos || !act.length) return null
  return act.map((l) => ({ ...l, jarak: distanceM(pos, l) })).sort((a, b) => a.jarak - b.jarak)[0]
}

// { lat, lng, acc, at, demo } | lempar error { code, text }
export function getPosition({ timeout = 15000, demoFallback = null } = {}) {
  return new Promise((ok, fail) => {
    const fallback = (code, text) => demoFallback ? ok({ ...demoFallback, demo: true, at: Date.now(), reason: text }) : fail({ code, text })
    if (typeof navigator === 'undefined' || !navigator.geolocation) return fallback('unsupported', 'Perangkat tidak mendukung GPS.')
    try {
      navigator.geolocation.getCurrentPosition(
        (g) => ok({ lat: +g.coords.latitude.toFixed(6), lng: +g.coords.longitude.toFixed(6), acc: Math.round(g.coords.accuracy || 0), at: g.timestamp || Date.now() }),
        (e) => fallback(e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable', e.code === 1 ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk Kirana di pengaturan HP.' : e.code === 3 ? 'GPS belum mengunci posisi. Coba ke area terbuka lalu ulangi.' : 'Lokasi tidak tersedia. Pastikan GPS/Lokasi HP menyala.'),
        { enableHighAccuracy: true, timeout, maximumAge: 30000 },
      )
    } catch (e) { fallback('error', 'Lokasi tidak bisa dibaca di tampilan ini.') }
  })
}
