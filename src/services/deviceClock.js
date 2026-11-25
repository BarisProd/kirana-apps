// Jam perangkat + jangkar monoton untuk mendeteksi jam HP yang diubah.
// - deviceNow(): jam HP (bisa diubah pengguna). Uji coba prototipe bisa menggeser jam ini (setSkew).
// - mono(): jam monoton (performance.now) yang TIDAK ikut berubah walau jam HP diubah selama aplikasi terbuka.
// - Setiap kali server berhasil dihubungi, selisih server↔monoton disimpan. Saat absen offline, server
//   memakai selisih itu untuk menghitung jam sebenarnya. Rilis Android: ganti mono() dengan
//   SystemClock.elapsedRealtime() lewat plugin native supaya tetap valid setelah aplikasi ditutup.
let skewMs = 0
const SESSION = Math.random().toString(36).slice(2, 10)
let anchor = null // { session, serverMinusMono, at }
try { const a = JSON.parse(localStorage.getItem('kirana.clockAnchor') || 'null'); if (a) anchor = a } catch (e) { /* abaikan */ }

export const deviceClock = {
  session: SESSION,
  deviceNow: () => Date.now() + skewMs,
  mono: () => (typeof performance !== 'undefined' && performance.timeOrigin ? performance.timeOrigin + performance.now() : Date.now()),
  skewMin: () => Math.round(skewMs / 60000),
  setSkew(min) { skewMs = (Number(min) || 0) * 60000 },
  anchor: () => anchor,
  // dipanggil setiap kali server membalas (serverNow = jam server)
  sync(serverNow) {
    anchor = { session: SESSION, serverMinusMono: serverNow - deviceClock.mono(), serverMinusDevice: serverNow - deviceClock.deviceNow(), at: serverNow }
    try { localStorage.setItem('kirana.clockAnchor', JSON.stringify(anchor)) } catch (e) { /* abaikan: penanda kecil, bukan data penting */ }
  },
}

export const pad = (n) => String(n).padStart(2, '0')
export const isoDate = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export const hhmm = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const stampOf = (ms) => `${isoDate(ms)} ${hhmm(ms)}`
