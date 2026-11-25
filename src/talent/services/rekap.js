// Rekap pribadi talent: absensi harian lengkap per periode (gabungan log clock in/out + rekap bulanan HR),
// cuti, dan lembur. Dipakai menu Absensi & Rekap Saya.
import { isWorkday, leaveDates } from '../../services/attendance.js'

export const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const p2 = (n) => String(n).padStart(2, '0')
export const isoOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const addMin = (hm, m) => { const [h, mm] = hm.split(':').map(Number); const t = h * 60 + mm + m; return `${p2(Math.floor(t / 60) % 24)}:${p2(t % 60)}` }
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; return h >>> 0 }

export function shiftInfo(s, e) {
  const set = s.absenSetup?.[e.branch] || {}
  const sh = (set.shifts || []).find((x) => x.nama === e.shift && x.aktif) || (set.shifts || []).find((x) => x.aktif) || { nama: 'Shift 1', masukDari: '08:30', masukSampai: '09:00', pulangDari: '17:00', pulangSampai: '17:59' }
  const lok = (set.lokasi || []).find((l) => l.aktif)?.nama || 'Kantor'
  return { sh, lok }
}

// Satu baris per hari kerja: Hadir (tepat waktu) · Terlambat · Tidak absen · Cuti/izin · Belum absen (hari ini)
export function attendanceDays(s, empId, from, to) {
  const e = s.employees.find((x) => x.id === empId); if (!e) return []
  const { sh, lok } = shiftInfo(s, e)
  const today = isoOf(new Date())
  const start = [from, e.start || from].sort()[1]; const end = [to, today].sort()[0]
  const logs = new Map(s.attendance.filter((a) => a.emp === empId).map((a) => [a.tanggal, a]))
  const rec = new Map(); s.attRecap.filter((r) => r.emp === empId).forEach((r) => { r.alpa.forEach((d) => rec.set(d, { alpa: true })); r.telat.forEach(([d, m]) => rec.set(d, { telat: m })) })
  const cuti = new Map(); s.leaves.filter((l) => l.emp === empId && l.status === 'Approved').forEach((l) => leaveDates(s, l, e.branch).forEach((d) => cuti.set(d, l)))
  const out = []; const d = new Date(start + 'T00:00:00')
  for (; isoOf(d) <= end; d.setDate(d.getDate() + 1)) {
    const iso = isoOf(d); const log = logs.get(iso)
    if (!isWorkday(s, e.branch, iso) && !log) continue
    if (log) { out.push({ tanggal: iso, masuk: log.masuk || '—', pulang: log.pulang || '—', lokasi: log.lokasi || lok, status: log.status, sumber: 'App' }); continue }
    const l = cuti.get(iso)
    if (l) { out.push({ tanggal: iso, masuk: '—', pulang: '—', lokasi: '—', status: 'Cuti', ket: l.jenis, sumber: 'Cuti' }); continue }
    if (iso === today) { out.push({ tanggal: iso, masuk: s.clock?.in || '—', pulang: s.clock?.out || '—', lokasi: lok, status: s.clock?.in ? (s.clock.in > sh.masukSampai ? 'Terlambat' : 'Hadir') : 'Belum absen', sumber: 'App' }); continue }
    const r = rec.get(iso); const h = hash(empId + iso)
    if (r?.alpa) { out.push({ tanggal: iso, masuk: '—', pulang: '—', lokasi: '—', status: 'Tidak absen', sumber: 'Rekap HR' }); continue }
    const masuk = r?.telat ? addMin(sh.masukSampai, r.telat) : addMin(sh.masukDari, -(h % 20))
    out.push({ tanggal: iso, masuk, pulang: addMin(sh.pulangDari, (h >>> 8) % 45), lokasi: lok, status: r?.telat ? 'Terlambat' : 'Hadir', telat: r?.telat || 0, sumber: 'Rekap HR' })
  }
  return out.sort((a, b) => b.tanggal.localeCompare(a.tanggal))
}

// Hari cuti (hari kerja) per pengajuan di dalam rentang
export function leaveDaysIn(s, l, branch, from, to) { return leaveDates(s, l, branch).filter((d) => d >= from && d <= to) }
export const durasiJam = (o) => Number(o.durasi) || (() => { const m = String(o.jam || '').match(/(\d\d):(\d\d)\D+(\d\d):(\d\d)/); if (!m) return 0; const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4]; return Math.max(0, (b - a) / 60) })()
