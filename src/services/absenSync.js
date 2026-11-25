// Mesin absen offline-first: semua absen (online maupun offline) lewat jalur yang sama:
//   ambil selfie + GPS → simpan ke outbox di HP → kirim ke server begitu ada sinyal → tandai terkirim.
// Pemicu kirim: sinyal kembali, aplikasi dibuka/kembali ke depan, tiap 20 detik, dan tepat setelah absen.
// Gagal karena sinyal → dicoba lagi (jeda makin panjang, maks 5 menit). Ditolak server → status "Gagal".
import { update, getState } from './store.js'
import { outbox } from './outbox.js'
import { net } from './net.js'
import { server, offlineSetting } from './mockServer.js'
import { deviceClock, isoDate, hhmm } from './deviceClock.js'

let started = false; let flushing = false; let timer = null
const backoff = (n) => Math.min(300000, 5000 * 2 ** Math.min(n, 6))
const rid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ab-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10))

// Status absen hari ini di HP (dipakai tampilan Beranda/Absensi, tidak menunggu server)
function applyLocal(recs, emp) {
  const today = isoDate(deviceClock.deviceNow())
  const mine = recs.filter((r) => r.emp === emp && r.tanggal === today).sort((a, b) => a.clock.deviceAt - b.clock.deviceAt)
  update((s) => {
    const c = { in: null, out: null, inFoto: '', outFoto: '' }
    mine.forEach((r) => { c[r.jenis] = r.result?.jam || r.jam; c[r.jenis + 'Foto'] = r.foto; c[r.jenis + 'Rec'] = r.id })
    s.clock = { ...s.clock, ...c, emp, tanggal: today }
  })
}

export const absenSync = {
  async start(emp) {
    if (!started) {
      started = true
      await outbox.load()
      outbox.all().filter((r) => r.status === 'sent').forEach((r) => server.replay(r))
      net.subscribe(() => { if (net.online()) { absenSync.syncTime(); absenSync.flush() } })
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden) absenSync.flush() })
      if (typeof window !== 'undefined') window.addEventListener('focus', () => absenSync.flush())
      timer = setInterval(() => absenSync.flush(), 20000)
    }
    absenSync.syncTime()
    if (emp) applyLocal(outbox.all(), emp)
    absenSync.flush()
  },
  // Simpan absen. Mengembalikan record yang langsung tampil di layar.
  async capture({ emp, branch, jenis, foto, gps, kantor, mode, kesehatan, shift }) {
    const s = getState()
    const off = offlineSetting(s, branch)
    const offline = !net.online()
    if (offline && !off.aktif) { const e = new Error('Branch-mu belum mengizinkan absen offline. Cari sinyal dulu, ya.'); e.blocked = true; throw e }
    const at = deviceClock.deviceNow()
    const rec = {
      id: rid(), kind: 'attendance', emp, branch, jenis, foto, gps, kantor, mode, kesehatan, shift,
      tanggal: isoDate(at), jam: hhmm(at), offline,
      clock: { deviceAt: at, mono: deviceClock.mono(), session: deviceClock.session, anchor: deviceClock.anchor() },
      status: 'pending', tries: 0, createdAt: Date.now(),
    }
    await outbox.add(rec)
    applyLocal(outbox.all(), emp)
    absenSync.flush()
    return rec
  },
  // Cocokkan jam dengan server (jangkar anti jam HP diubah). Dipanggil saat app dibuka & sinyal kembali.
  async syncTime() { if (!net.online()) return; try { deviceClock.sync(await server.ping()); net.markServer(true) } catch (e) { /* coba lagi nanti */ } },
  async flush() {
    if (flushing || !net.online()) return
    flushing = true
    try {
      const due = outbox.all().filter((r) => (r.status === 'pending') && (!r.nextTry || r.nextTry <= Date.now())).sort((a, b) => a.createdAt - b.createdAt)
      for (const r of due) {
        if (!net.online()) break
        const first = r.sentFirstAt || Date.now()
        await outbox.patch(r.id, { status: 'sending', sentFirstAt: first })
        try {
          const res = await server.submitAttendance({ ...r, sentFirstAt: first })
          deviceClock.sync(server.now()); net.markServer(true)
          await outbox.patch(r.id, { status: 'sent', sentAt: Date.now(), result: res, lastError: '' })
          applyLocal(outbox.all(), r.emp)
        } catch (e) {
          const tries = (r.tries || 0) + 1
          if (e.network) { await outbox.patch(r.id, { status: 'pending', tries, nextTry: Date.now() + backoff(tries), lastError: 'Belum ada sinyal' }); break }
          await outbox.patch(r.id, { status: 'failed', tries, lastError: e.message || 'Ditolak server' })
        }
      }
    } finally { flushing = false }
  },
  // Kirim sekarang (mengabaikan jeda tunggu)
  async retryNow() { for (const r of outbox.all()) if (r.status === 'pending' || r.status === 'failed') await outbox.patch(r.id, { status: 'pending', nextTry: 0 }); return absenSync.flush() },
  stop() { clearInterval(timer) },
}
