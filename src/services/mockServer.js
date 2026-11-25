// SERVER TIRUAN untuk absensi (prototipe). Meniru perilaku backend asli:
// - menerima absen dari app (idempotent: ID yang sama tidak dicatat dua kali)
// - memakai jam server sendiri, menghitung jam absen sebenarnya dari jangkar jam (anti jam HP diubah)
// - mengecek ulang radius, akurasi GPS, batas waktu kirim offline (per Branch) → "Perlu persetujuan HR"
// - menulis hasilnya ke data absensi yang dilihat Admin/Branch
// Rilis: ganti isi file ini dengan panggilan Firestore/Cloud Function; bentuk request & response dipertahankan.
import { update, getState, uid } from './store.js'
import { net } from './net.js'
import { distanceM } from './geo.js'
import { hhmm, isoDate, stampOf } from './deviceClock.js'

const seen = new Map() // id → hasil (idempotensi)
const LATENCY = [350, 900]
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
export const offlineSetting = (s, branch) => ({ aktif: true, batasJam: 72, ...(s.absenSetup?.[branch]?.offline || {}) })

function judge(s, rec, serverNow) {
  const set = s.absenSetup?.[rec.branch] || {}; const off = offlineSetting(s, rec.branch)
  // jam sebenarnya saat tombol ditekan
  const a = rec.clock?.anchor
  let trueAt = rec.clock.deviceAt + (a?.serverMinusDevice || 0)
  if (a && a.session === rec.clock.session) trueAt = rec.clock.mono + a.serverMinusMono
  // Dibuat saat ada sinyal → dikirim seketika, jadi jam sebenarnya ≈ jam server saat diterima
  else if (!rec.offline && rec.sentFirstAt && rec.sentFirstAt - rec.createdAt < 60000) trueAt = serverNow - (Date.now() - rec.createdAt)
  const flags = []
  const drift = Math.abs(rec.clock.deviceAt - trueAt)
  if (drift > 5 * 60000) flags.push(`Jam HP tidak sesuai (selisih ${Math.round(drift / 60000)} menit)`)
  if (trueAt > serverNow + 2 * 60000) { flags.push('Waktu absen di masa depan'); trueAt = serverNow }
  // lokasi
  const g = rec.gps
  if (!g) flags.push('Tanpa lokasi GPS')
  else {
    if (g.demo) flags.push('Lokasi demo (prototipe)')
    if (g.acc > 150) flags.push(`GPS kurang akurat (±${g.acc} m)`)
    const kantor = (set.lokasi || []).filter((l) => l.aktif && l.lat != null).map((l) => ({ ...l, jarak: distanceM(g, l) })).sort((x, y) => x.jarak - y.jarak)[0]
    if (rec.mode === 'WFO' && kantor && kantor.jarak > (kantor.radius || 100)) flags.push(`Di luar radius ${kantor.nama} (${kantor.jarak} m)`)
  }
  const telatKirim = serverNow - trueAt
  const offline = !!rec.offline || telatKirim > 10 * 60000
  let perluHR = false
  if (offline && !off.aktif) { flags.push('Absen offline tidak diizinkan untuk Branch ini'); perluHR = true }
  if (telatKirim > off.batasJam * 3600000) { flags.push(`Terkirim ${Math.round(telatKirim / 3600000)} jam setelah absen (batas ${off.batasJam} jam)`); perluHR = true }
  if (flags.some((f) => /Jam HP|masa depan|luar radius/.test(f))) perluHR = true
  return { trueAt, flags, perluHR, offline, telatKirim }
}

export const server = {
  now: () => Date.now(),
  // GET /time — dipakai app untuk mencocokkan jam saat dibuka (online)
  async ping() { await wait(150); if (!net.online()) { const e = new Error('Tidak ada sinyal'); e.network = true; throw e } return server.now() },
  // POST /attendance  → { ok, id, status, jam, flags, perluHR, diterima }
  async submitAttendance(rec) {
    await wait(LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0]))
    if (!net.online()) { const e = new Error('Tidak ada sinyal'); e.network = true; throw e }
    if (seen.has(rec.id)) return { ...seen.get(rec.id), duplicate: true }
    const s = getState(); const serverNow = server.now()
    const j = judge(s, rec, serverNow)
    const tanggal = isoDate(j.trueAt); const jam = hhmm(j.trueAt)
    const e = s.employees.find((x) => x.id === rec.emp) || {}
    const set = s.absenSetup?.[rec.branch] || {}
    const sh = (set.shifts || []).find((x) => x.nama === e.shift) || (set.shifts || [])[0] || { masukSampai: '09:00' }
    const res = { ok: true, id: rec.id, jenis: rec.jenis, tanggal, jam, flags: j.flags, perluHR: j.perluHR, offline: j.offline, diterima: stampOf(serverNow), deviceJam: hhmm(rec.clock.deviceAt) }
    update((st) => {
      let a = st.attendance.find((x) => x.emp === rec.emp && x.tanggal === tanggal)
      if (!a) { a = { id: uid('at'), emp: rec.emp, tanggal, masuk: '', pulang: '', status: 'Hadir', lokasi: '', sumber: 'App' }; st.attendance.unshift(a) }
      const k = rec.jenis === 'in' ? 'Masuk' : 'Pulang'
      if (rec.jenis === 'in') { a.masuk = jam; a.status = jam > sh.masukSampai ? 'Terlambat' : 'Hadir'; a.fotoMasuk = rec.foto; a.lokasi = rec.kantor?.nama || a.lokasi || (rec.mode === 'WFA' ? 'WFA' : 'Kantor') }
      else { a.pulang = jam; a.fotoPulang = rec.foto; if (!a.masuk) a.status = 'Tidak clock in' }
      a['gps' + k] = rec.gps ? { lat: rec.gps.lat, lng: rec.gps.lng, acc: rec.gps.acc, demo: !!rec.gps.demo } : null
      a['kesehatan' + k] = rec.kesehatan || ''
      a.mode = rec.mode
      a.sync = { ...(a.sync || {}), [rec.jenis]: { offline: j.offline, diterima: res.diterima, deviceJam: res.deviceJam, flags: j.flags, perluHR: j.perluHR, rid: rec.id } }
      if (j.perluHR) a.reviewHR = a.reviewHR === 'Disetujui' || a.reviewHR === 'Ditolak' ? a.reviewHR : 'Perlu persetujuan HR'
      if (j.perluHR) st.inbox.unshift({ id: uid('n'), to: 'admin', judul: 'Absen perlu persetujuan HR', isi: `${e.name || 'Karyawan'} · ${k.toLowerCase()} ${tanggal} ${jam}: ${j.flags.join('; ')}`, waktu: res.diterima, link: 'absensi/' + a.id })
    })
    seen.set(rec.id, res)
    return res
  },
  // Dipakai saat aplikasi dibuka ulang: server tiruan di memori ikut ter-reset, jadi absen yang dulu sudah
  // terkirim dimasukkan kembali agar data admin tetap konsisten (di server asli langkah ini tidak ada).
  replay(rec) { if (!seen.has(rec.id) && rec.result) { seen.set(rec.id, rec.result); const r = rec.result
    update((st) => { let a = st.attendance.find((x) => x.emp === rec.emp && x.tanggal === r.tanggal)
      if (!a) { a = { id: uid('at'), emp: rec.emp, tanggal: r.tanggal, masuk: '', pulang: '', status: 'Hadir', lokasi: rec.kantor?.nama || '', sumber: 'App' }; st.attendance.unshift(a) }
      if (rec.jenis === 'in') { a.masuk = r.jam; a.fotoMasuk = rec.foto } else { a.pulang = r.jam; a.fotoPulang = rec.foto }
      a.sync = { ...(a.sync || {}), [rec.jenis]: { offline: r.offline, diterima: r.diterima, deviceJam: r.deviceJam, flags: r.flags, perluHR: r.perluHR, rid: rec.id } }
      if (r.perluHR && !a.reviewHR) a.reviewHR = 'Perlu persetujuan HR' }) } },
}
