// Rekap absensi tahunan, analisis cuti, dan potongan gaji dari absensi (per Branch).
// Rekap bulanan diturunkan dari data absensi harian (clock in/out) — di prototipe dibangkitkan secara deterministik.
import { rnd } from '../data/rootSeed.js'
import { DEFAULT_SETUP } from './payroll.js'

export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const BL3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const DATA_SAMPAI = '2026-11-19' // rekap contoh dibangkitkan sampai tanggal ini
const p2 = (n) => String(n).padStart(2, '0')
const isoD = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const dim = (y, m) => new Date(y, m, 0).getDate()
// ---------- Kalender kerja per Branch ----------
const dow = (iso) => { const d = new Date(iso + 'T00:00:00').getDay(); return d === 0 ? 7 : d } // 1 = Senin … 7 = Minggu
export const holidayOn = (s, bid, iso) => s.holidays.find((h) => h.tanggal === iso && (!h.branches?.length || h.branches.includes(bid)) && !(h.jenis === 'Cuti bersama' && s.workCal?.[bid]?.cutiBersama === 'masuk'))
export const isWorkday = (s, bid, iso) => (s.workCal?.[bid]?.hari || [1, 2, 3, 4, 5]).includes(dow(iso)) && !holidayOn(s, bid, iso)
export function workdaysOf(s, bid, y, m) {
  const lim = `${y}-${p2(m)}` === DATA_SAMPAI.slice(0, 7) ? Number(DATA_SAMPAI.slice(8)) : `${y}-${p2(m)}` > DATA_SAMPAI.slice(0, 7) ? 0 : dim(y, m)
  const o = []; for (let d = 1; d <= lim; d++) { const iso = `${y}-${p2(m)}-${p2(d)}`; if (isWorkday(s, bid, iso)) o.push(iso) } return o
}
// Tanggal kerja yang tercakup sebuah pengajuan cuti/izin (hari libur & akhir pekan tidak dihitung)
export function leaveDates(s, l, bid) { const o = []; const d = new Date(l.dari + 'T00:00:00'); const end = l.sampai || l.dari; while (isoD(d) <= end) { const iso = isoD(d); if (isWorkday(s, bid, iso)) o.push(iso); d.setDate(d.getDate() + 1) } return o }
// n hari kerja mulai tanggal tertentu
const spanWd = (s, bid, y, m, d, n) => { const out = []; const dt = new Date(y, m - 1, d); let guard = 0; while (out.length < n && guard++ < 60) { const iso = isoD(dt); if (isWorkday(s, bid, iso)) out.push(iso); dt.setDate(dt.getDate() + 1) } return out }

// ---------- Data contoh ----------
const PLAN = { // [tahun, bulan, tanggal, hari, jenis?]
  e0: [[2026, 9, 1, 3, 'Dinas Luar'], [2025, 3, 10, 3], [2025, 6, 16, 3], [2025, 9, 8, 2], [2025, 12, 22, 2], [2026, 3, 9, 2], [2026, 7, 13, 3], [2026, 9, 21, 1]],
  e1: [[2026, 5, 20, 1, 'Izin Sakit (tanpa surat dokter)'], [2026, 10, 7, 1, 'Izin Sakit (tanpa surat dokter)'], [2025, 2, 3, 3], [2025, 5, 12, 3], [2025, 8, 18, 3], [2025, 12, 15, 3], [2026, 4, 6, 2], [2026, 8, 10, 5]],
  e2: [[2026, 2, 3, 2, 'Cuti Sakit'], [2026, 7, 6, 1, 'Izin Sakit (tanpa surat dokter)'], [2025, 4, 7, 2], [2025, 8, 11, 2], [2025, 11, 10, 2], [2026, 5, 18, 1], [2026, 9, 14, 2]],
  e3: [[2025, 1, 20, 3], [2025, 4, 14, 3], [2025, 7, 7, 3], [2025, 10, 6, 3], [2026, 2, 9, 3], [2026, 5, 4, 3], [2026, 7, 20, 3], [2026, 9, 7, 2], [2026, 10, 26, 1]],
  e4: [[2025, 3, 3, 2], [2025, 6, 9, 3], [2025, 10, 20, 3], [2026, 3, 16, 2], [2026, 6, 22, 1], [2026, 8, 3, 4, 'Cuti Sakit'], [2026, 4, 21, 2, 'Izin Sakit (tanpa surat dokter)']],
  e5: [[2025, 2, 17, 3], [2025, 7, 21, 3], [2025, 12, 1, 3], [2026, 6, 8, 2]],
  e6: [[2026, 6, 8, 4, 'Dinas Luar'], [2026, 10, 12, 2, 'Dinas Luar'], [2025, 3, 24, 3], [2025, 8, 4, 3], [2025, 11, 17, 3]],
  e7: [[2026, 11, 2, 2, 'Izin Resmi'], [2025, 4, 21, 3], [2025, 7, 14, 3], [2025, 9, 22, 2], [2025, 12, 8, 2], [2026, 1, 26, 3], [2026, 4, 13, 3], [2026, 6, 15, 3], [2026, 8, 24, 3], [2026, 10, 19, 4]],
  e8: [[2026, 3, 9, 2, 'Cuti Sakit'], [2026, 9, 14, 1, 'Izin Resmi']],
  e9: [[2025, 4, 14, 3], [2025, 8, 18, 2], [2025, 12, 22, 3], [2026, 2, 23, 3], [2026, 6, 22, 2], [2026, 10, 5, 3], [2026, 8, 10, 2, 'Dinas Luar']],
  e10: [[2025, 6, 9, 3], [2025, 10, 13, 3], [2026, 4, 13, 2], [2026, 7, 13, 3], [2026, 9, 21, 1, 'Izin Sakit (tanpa surat dokter)']],
  e11: [[2025, 3, 17, 3], [2025, 7, 7, 3], [2025, 11, 3, 2], [2026, 1, 12, 3], [2026, 4, 27, 3], [2026, 7, 6, 3], [2026, 9, 7, 3], [2026, 11, 9, 3]],
  e12: [[2026, 5, 4, 1, 'Izin Sakit (tanpa surat dokter)']],
  e13: [[2025, 5, 19, 3], [2025, 9, 8, 3], [2025, 12, 15, 3], [2026, 3, 2, 3], [2026, 8, 3, 6], [2026, 10, 26, 2, 'Cuti Sakit']],
  e15: [[2025, 5, 5, 3], [2025, 10, 20, 3], [2026, 3, 30, 3], [2026, 8, 24, 3], [2026, 10, 12, 1, 'Izin Resmi']],
  e16: [[2025, 7, 14, 3], [2026, 1, 19, 2], [2026, 6, 29, 3], [2026, 9, 7, 2, 'Izin Sakit (tanpa surat dokter)']],
  e14: [[2025, 6, 23, 3], [2025, 10, 6, 3], [2026, 2, 9, 2], [2026, 5, 11, 3], [2026, 9, 28, 2], [2026, 6, 15, 2, 'Izin Resmi']],
}
const PROFIL = { e0: [0.03, 1], e1: [0.14, 2], e2: [0.06, 7], e3: [0.04, 1], e4: [0.09, 4], e5: [0.05, 0], e6: [0.02, 0], e7: [0.05, 2], e8: [0.11, 3], e9: [0.08, 1], e10: [0.1, 5], e11: [0.03, 0], e12: [0.12, 3], e13: [0.05, 2], e14: [0.04, 1], e15: [0.03, 0], e16: [0.09, 2], e17: [0.06, 1] } // [peluang terlambat/hari, tidak absen/tahun]
const ALASAN = ['Acara keluarga', 'Liburan keluarga', 'Urusan pribadi', 'Mudik', 'Istirahat', 'Pernikahan saudara']

const ALASAN_IZIN = { 'Cuti Sakit': 'Demam berdarah, rawat jalan (surat dokter)', 'Izin Sakit (tanpa surat dokter)': 'Migrain', 'Izin Resmi': 'Menghadiri sidang/urusan resmi', 'Dinas Luar': 'Kunjungan klien & pelatihan di luar kota' }
export function seedAttendanceYear(s) {
  let n = 0; const br = (id) => s.employees.find((e) => e.id === id)?.branch || 'b1'
  Object.entries(PLAN).forEach(([emp, list]) => list.forEach(([y, m, d, hari, jenis]) => {
    const days = spanWd(s, br(emp), y, m, d, hari)
    s.leaves.push({ id: 'lh' + ++n, emp, jenis: jenis || (y === 2026 ? 'Cuti Tahunan' : `Cuti Tahunan ${y}`), dari: days[0], sampai: days[days.length - 1], hari: days.length, alasan: ALASAN_IZIN[jenis] || ALASAN[n % ALASAN.length], lampiran: jenis && jenis !== 'Izin Sakit (tanpa surat dokter)' ? 'Bukti.pdf' : '', status: 'Approved', line: [{ by: 'Atasan', status: 'Approved' }, { by: 'HR', status: 'Approved' }] })
  }))
  s.attRecap = []
  s.employees.forEach((e) => {
    const [lateP, alpaY] = PROFIL[e.id] || [0.04, 1]
    const cuti = new Set(s.leaves.filter((l) => l.emp === e.id && l.status === 'Approved').flatMap((l) => leaveDates(s, l, e.branch)))
    ;[2025, 2026].forEach((y) => {
      const r = rnd(e.id + y); const months = y === 2026 ? 11 : 12
      const pool = []; for (let m = 1; m <= months; m++) workdaysOf(s, e.branch, y, m).forEach((iso) => { if (!cuti.has(iso)) pool.push(iso) })
      const alpa = new Set(); const want = Math.round(alpaY * (months / 12)); while (alpa.size < want && pool.length) alpa.add(pool[Math.floor(r() * pool.length)])
      for (let m = 1; m <= months; m++) {
        const rec = { emp: e.id, y, m, alpa: [], telat: [] }
        workdaysOf(s, e.branch, y, m).forEach((iso) => {
          if (cuti.has(iso)) return
          if (alpa.has(iso)) { rec.alpa.push(iso); return }
          if (r() < lateP) { const x = r(); rec.telat.push([iso, 3 + Math.floor(x * x * 92)]) }
        })
        s.attRecap.push(rec)
      }
    })
  })
  s.attDeduct = {
    b1: { ...DEDUCT_DEFAULT, aktif: true },
    b2: { ...DEDUCT_DEFAULT, aktif: true, dasar: 'gp', pembagi: '22', telat: { ...DEDUCT_DEFAULT.telat, mode: 'menit', toleransi: 10, perMenit: 2000 }, cutiLebih: { aktif: false, faktor: 1 } },
    b3: { ...DEDUCT_DEFAULT, aktif: false },
  }
}

// ---------- Cuti ----------
export const annualType = (s, y) => s.leaveTypes.find((lt) => Number(lt.durasi) === y && /^Cuti Tahunan/.test(lt.name))
const inYear = (l, y) => l.dari.slice(0, 4) === String(y)
export function leaveYear(s, empId, y) {
  const e = s.employees.find((x) => x.id === empId) || {}
  const lt = annualType(s, y); const prev = annualType(s, y - 1)
  const mine = s.leaves.filter((l) => l.emp === empId && inYear(l, y))
  const used = (t, yy) => s.leaves.filter((l) => l.emp === empId && l.status === 'Approved' && l.jenis === t.name && inYear(l, yy)).reduce((a, b) => a + b.hari, 0)
  // Carry over: sisa jatah tahun lalu boleh dipakai bila kategori tahun lalu punya masa carry over (bulan) dan karyawan sudah bekerja tahun itu
  const carry = prev && prev.carry > 0 && (e.start || '') <= `${y - 1}-12-31` ? Math.max(0, prev.kuota - used(prev, y - 1)) : 0
  const masa = (new Date(`${y}-01-01`) - new Date(e.start || `${y}-01-01`)) / (365.25 * 864e5)
  const bonus = s.leaveTenure && masa >= s.leaveTenure.masa ? s.leaveTenure.tambahan : 0
  const adj = lt && s.leaveAdjust.find((a) => a.emp === empId && a.kategori === lt.name)
  const jatah = lt ? adj?.kuota ?? lt.kuota + carry + bonus : 0
  // Cuti bersama yang di Branch ini memotong jatah cuti tahunan
  const cb = (s.workCal?.[e.branch]?.cutiBersama === 'potong') ? s.holidays.filter((h) => h.jenis === 'Cuti bersama' && h.tanggal.startsWith(String(y)) && h.tanggal <= DATA_SAMPAI && (s.workCal[e.branch].hari || []).includes(dow(h.tanggal))).length : 0
  const pakai = lt ? adj?.terpakai ?? used(lt, y) + cb : 0
  const tipe = (n) => s.leaveTypes.find((t) => t.name === n)
  const long = mine.filter((l) => l.status !== 'Rejected' && tipe(l.jenis)?.maksBerturut && l.hari > tipe(l.jenis).maksBerturut).map((l) => ({ ...l, maks: tipe(l.jenis).maksBerturut }))
  return {
    lt, kuota: lt?.kuota || 0, carry, carryBulan: prev?.carry || 0, bonus, adj, jatah, pakai, sisa: jatah - pakai, lebih: Math.max(0, pakai - jatah),
    pending: mine.filter((l) => l.status === 'Waiting' && l.jenis === lt?.name).reduce((a, b) => a + b.hari, 0),
    semua: mine.filter((l) => l.status === 'Approved' && (tipe(l.jenis)?.kelompok || 'Cuti') === 'Cuti').reduce((a, b) => a + b.hari, 0), long, cb,
    izin: mine.filter((l) => l.status === 'Approved' && tipe(l.jenis)?.kelompok === 'Izin').reduce((a, b) => a + b.hari, 0),
    terakhir: s.leaves.filter((l) => l.emp === empId && l.status === 'Approved').sort((a, b) => b.dari.localeCompare(a.dari))[0],
  }
}
// Hari cuti tahunan yang melebihi jatah, dikelompokkan per bulan terjadinya
export function overflowByMonth(s, empId, y) {
  const ly = leaveYear(s, empId, y); if (!ly.lt || ly.adj) return {}
  let acc = ly.cb || 0; const out = {}
  s.leaves.filter((l) => l.emp === empId && l.status === 'Approved' && l.jenis === ly.lt.name && inYear(l, y)).sort((a, b) => a.dari.localeCompare(b.dari)).forEach((l) => {
    const before = acc; acc += l.hari; const over = Math.max(0, acc - Math.max(before, ly.jatah)); if (over) { const m = Number(l.dari.slice(5, 7)); out[m] = (out[m] || 0) + over }
  })
  return out
}

// ---------- Absensi ----------
export const shiftOf = (s, e) => s.shifts?.find((x) => x.name === e.shift) || s.shifts?.[0] || { name: 'Shift 1', masuk: '08:30', batas: '09:00', pulang: '17:00' }
const addMin = (hhmm, n) => { const t = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + n; return `${p2(Math.floor(t / 60))}:${p2(t % 60)}` }
export const jamMasuk = (s, e, menit) => addMin(shiftOf(s, e).batas, menit)
// Rekap 1 bulan mengikuti kalender kerja Branch yang berlaku saat ini (hari kerja, libur nasional, cuti bersama, libur perusahaan)
export function monthView(s, e, y, m) {
  const rec = (s.attRecap || []).find((x) => x.emp === e.id && x.y === y && x.m === m) || { alpa: [], telat: [] }
  const wds = workdaysOf(s, e.branch, y, m); const W = new Set(wds)
  const leaves = s.leaves.filter((l) => l.emp === e.id && l.status === 'Approved' && l.dari <= `${y}-${p2(m)}-31` && (l.sampai || l.dari) >= `${y}-${p2(m)}-01`)
  const cutiD = new Set(leaves.flatMap((l) => leaveDates(s, l, e.branch)).filter((d) => W.has(d)))
  const alpa = rec.alpa.filter((d) => W.has(d) && !cutiD.has(d)); const telat = rec.telat.filter(([d]) => W.has(d) && !cutiD.has(d))
  return { y, m, hk: wds.length, cuti: cutiD.size, alpa, telat, hadir: wds.length - cutiD.size - alpa.length, libur: s.holidays.filter((h) => h.tanggal.startsWith(`${y}-${p2(m)}`) && (!h.branches?.length || h.branches.includes(e.branch))) }
}
export function attYear(s, empId, y) {
  const e = s.employees.find((x) => x.id === empId); const months = y === Number(DATA_SAMPAI.slice(0, 4)) ? Number(DATA_SAMPAI.slice(5, 7)) : 12
  const mv = Array.from({ length: months }, (_, i) => monthView(s, e, y, i + 1))
  const telat = mv.flatMap((r) => r.telat.map(([tgl, mn]) => ({ tgl, m: r.m, menit: mn, jam: jamMasuk(s, e, mn) })))
  const alpa = mv.flatMap((r) => r.alpa.map((tgl) => ({ tgl, m: r.m })))
  const kat = {}; s.leaves.filter((l) => l.emp === empId && l.status === 'Approved' && l.dari.startsWith(String(y))).forEach((l) => { kat[l.jenis] = (kat[l.jenis] || 0) + leaveDates(s, l, e.branch).length })
  return { hk: mv.reduce((a, r) => a + r.hk, 0), hadir: mv.reduce((a, r) => a + r.hadir, 0), cuti: mv.reduce((a, r) => a + r.cuti, 0), telat, alpa, kat, menit: telat.reduce((a, t) => a + t.menit, 0) }
}

// ---------- Potongan gaji dari absensi ----------
export const DEDUCT_DEFAULT = {
  aktif: false, dasar: 'thp', pembagi: 'aktual', batas: 50,
  alpa: { aktif: true, faktor: 1 },
  telat: { aktif: true, toleransi: 15, bebas: 0, mode: 'tier', perMenit: 1000, perKejadian: 30000,
    tiers: [{ dari: 16, sampai: 30, jenis: 'nominal', nilai: 25000 }, { dari: 31, sampai: 60, jenis: 'nominal', nilai: 50000 }, { dari: 61, sampai: '', jenis: 'hari', nilai: 0.5 }] },
  cutiLebih: { aktif: true, faktor: 1 },
}
export const upahDasar = (e, cfg, setup = DEFAULT_SETUP) => cfg.dasar === 'gp' ? Math.max(e.thp * (setup.basic || 80) / 100, Math.min(e.thp, setup.umr || 0)) : e.thp
export function telatRp(cfg, menit, harian) {
  const t = cfg.telat; if (menit <= t.toleransi) return 0
  if (t.mode === 'menit') return (menit - t.toleransi) * t.perMenit
  if (t.mode === 'kejadian') return t.perKejadian
  const tier = t.tiers.find((x) => menit >= Number(x.dari) && (x.sampai === '' || x.sampai == null || menit <= Number(x.sampai)))
  return tier ? (tier.jenis === 'hari' ? tier.nilai * harian : Number(tier.nilai)) : 0
}
export function deductionOf(s, e, y, m) {
  const cfg = s.attDeduct?.[e.branch]; if (!(s.attRecap || []).some((x) => x.emp === e.id && x.y === y && x.m === m)) return null
  const r = monthView(s, e, y, m)
  const base = { r, cfg, aktif: !!cfg?.aktif }
  if (!cfg?.aktif) return { ...base, total: 0 }
  const upah = upahDasar(e, cfg, s.setup || DEFAULT_SETUP); const hk = cfg.pembagi === 'aktual' ? Math.max(1, r.hk) : Number(cfg.pembagi); const harian = upah / hk
  const alpaRp = cfg.alpa.aktif ? r.alpa.length * harian * cfg.alpa.faktor : 0
  const lates = r.telat.map(([d, mn]) => ({ d, menit: mn, jam: jamMasuk(s, e, mn) })).filter((x) => x.menit > cfg.telat.toleransi)
  const kena = cfg.telat.aktif ? lates.slice(cfg.telat.bebas || 0).map((x) => ({ ...x, rp: telatRp(cfg, x.menit, harian) })) : []
  const telatRpSum = kena.reduce((a, x) => a + x.rp, 0)
  const lebihHari = cfg.cutiLebih.aktif ? overflowByMonth(s, e.id, y)[m] || 0 : 0
  const cutiRp = lebihHari * harian * cfg.cutiLebih.faktor
  const raw = alpaRp + telatRpSum + cutiRp; const cap = (upah * Math.min(50, cfg.batas)) / 100
  return { ...base, upah, hk, harian, alpaRp, lates, kena, telatRp: telatRpSum, lebihHari, cutiRp, raw, cap, total: Math.min(raw, cap), dibatasi: raw > cap }
}
