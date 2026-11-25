// Pengingat absen terjadwal DI HP (LocalNotifications) → tetap muncul walau tanpa sinyal & aplikasi tertutup.
// Dijadwalkan ulang setiap aplikasi dibuka, setelah absen, dan saat pengaturan diubah: 7 hari kerja ke depan,
// melewati hari libur, cuti yang disetujui, dan absen yang sudah dilakukan hari ini.
// PWA/web: penjadwalan di latar belakang tidak didukung browser → hanya pengingat di dalam aplikasi.
import { LocalNotifications } from '@capacitor/local-notifications'
import { isWorkday } from './attendance.js'
import { isoDate } from './deviceClock.js'

const BASE = 7000 // id notifikasi 7000–7099 milik pengingat absen
export const reminderSupported = () => !!window.Capacitor?.isNativePlatform?.() && !!LocalNotifications

function shiftOf(s, me) {
  const set = s.absenSetup?.[me.branch] || {}
  return (set.shifts || []).find((x) => x.nama === me.shift && x.aktif) || (set.shifts || []).find((x) => x.aktif) || { nama: 'Shift', masukDari: '08:30', masukSampai: '09:00', pulangDari: '17:00' }
}
const at = (iso, hhmm, deltaMin = 0) => { const d = new Date(`${iso}T${hhmm}:00`); d.setMinutes(d.getMinutes() + deltaMin); return d }

// Daftar pengingat yang akan dijadwalkan (dipakai juga untuk pratinjau di Profil)
export function planReminders(s, me, prefs, clock = {}) {
  if (!me?.id || !prefs.pengingat) return []
  const sh = shiftOf(s, me); const out = []; const now = new Date()
  const cuti = s.leaves.filter((l) => l.emp === me.id && l.status === 'Approved')
  for (let i = 0; i < 10 && out.length < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i); const iso = isoDate(d.getTime())
    if (!isWorkday(s, me.branch, iso) || cuti.some((l) => iso >= l.dari && iso <= l.sampai)) continue
    if (me.end && iso > me.end) break
    const today = i === 0
    const inAt = at(iso, sh.masukDari, -(prefs.menitSebelum || 15))
    if (inAt > now && !(today && clock.in)) out.push({ id: BASE + i * 2, title: 'Jangan lupa absen masuk ⏰', body: `${sh.nama} mulai ${sh.masukDari.replace(':', '.')}. Absen tetap bisa walau sinyal lemah.`, at: inAt })
    const outAt = at(iso, sh.pulangDari)
    if (prefs.pengingatPulang && outAt > now && !(today && clock.out)) out.push({ id: BASE + i * 2 + 1, title: 'Sudah jam pulang 🏡', body: 'Jangan lupa absen pulang sebelum meninggalkan kantor ya.', at: outAt })
  }
  return out
}

export async function scheduleReminders(s, me, prefs, clock) {
  if (!reminderSupported()) return { ok: false, reason: 'web' }
  try {
    const pending = await LocalNotifications.getPending()
    const mine = (pending.notifications || []).filter((n) => n.id >= BASE && n.id < BASE + 100)
    if (mine.length) await LocalNotifications.cancel({ notifications: mine.map((n) => ({ id: n.id })) })
    const plan = planReminders(s, me, prefs, clock)
    if (!plan.length) return { ok: true, count: 0 }
    let perm = await LocalNotifications.checkPermissions()
    // izin diminta di layar pengenalan (Onboarding); sebelum itu jangan munculkan dialog sistem tiba-tiba
    if (perm.display !== 'granted' && prefs.onboarded) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return { ok: false, reason: 'denied' }
    await LocalNotifications.schedule({ notifications: plan.map((p) => ({ id: p.id, title: p.title, body: p.body, schedule: { at: p.at, allowWhileIdle: true }, iconColor: '#0a5950', extra: { route: '/app/talent/beranda' } })) })
    return { ok: true, count: plan.length }
  } catch (e) { return { ok: false, reason: e.message } }
}

// Ketuk notifikasi → buka Beranda
export function listenReminderTap() {
  if (!reminderSupported()) return
  try { LocalNotifications.addListener('localNotificationActionPerformed', (a) => { const r = a?.notification?.extra?.route; if (r) window.location.hash = '#' + r }) } catch (e) { /* abaikan */ }
}
