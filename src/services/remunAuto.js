// Addition & deduction otomatis dari modul lain (pengganti input manual lewat Google Sheet di Scala).
// Sumber: Lembur (Approved, periode cut-off), Reimbursement (Approved, belum dibayar), Absensi (Alpha / tidak hadir),
// Cuti tidak dibayar (Approved), Kliring (catatan finance), THR & KAK (bila diaktifkan di pengajuan), Sisa cuti (Resign).
import { calcRow, splitThp, parsePeriod, daysBetween, monthsBetween, DEFAULT_SETUP } from './payrollScala.js'

const iso = (d) => d.toISOString().slice(0, 10)
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const fmt = (t) => { const [y, m, d] = t.split('-'); return `${Number(d)}/${Number(m)}` }

// Hari kerja = hari dalam bulan − hari libur mingguan Branch − libur nasional (Setup Aktivitas › Kalender)
export function workDays(s, branch, period) {
  const cal = s.calendars?.[branch]?.[period.y] || { libur: ['Sabtu', 'Minggu'], nasional: [] }
  const nas = new Set((cal.nasional || []).map((x) => x.tanggal)); let n = 0
  for (let d = new Date(Date.UTC(period.y, period.m - 1, 1)); d.getUTCMonth() === period.m - 1; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!cal.libur.includes(HARI[d.getUTCDay()]) && !nas.has(iso(d))) n++
  }
  return n
}
export const inMonth = (t, p) => t && t.slice(0, 7) === `${p.y}-${String(p.m).padStart(2, '0')}`
// periode cut-off lembur, mis. 21 bulan lalu s.d. 20 bulan ini (Pengaturan Lembur)
export function cutOff(s, p) {
  const { cutDari = 21, cutSampai = 20 } = s.overtimeSetup || {}
  const from = new Date(Date.UTC(p.y, p.m - 2, cutDari)); const to = new Date(Date.UTC(p.y, p.m - 1, cutSampai))
  return [iso(from), iso(to)]
}

function lemburNominal(s, e, o, setup) {
  const tp = s.overtimeTypes.find((t) => t.name === o.tipe) || s.overtimeTypes[0]
  const { gp } = splitThp(e.thp, setup)
  const upahJam = tp?.komponen === 'Nominal Pengali Upah' ? Number(tp.nominal) || 0 : gp / 173 // Kepmenakertrans 102/2004
  let total = 0
  for (let h = 1; h <= Math.ceil(o.durasi); h++) { const x = (tp?.pengali || []).find((r) => h >= r.dari && h <= r.sampai)?.x ?? (h === 1 ? 1.5 : 2); total += upahJam * x * Math.min(1, o.durasi - h + 1) }
  return Math.round(total)
}

// opts: { thr, kak, jenis, row }
export function autoLines(s, empId, bulan, opts = {}) {
  const setup = { ...DEFAULT_SETUP, ...(s.setup || {}) }
  const e = s.employees.find((x) => x.id === empId); if (!e) return { additions: [], deductions: [] }
  const p = parsePeriod(bulan); const thp = Number(opts.row?.thp ?? e.thp) || 0
  const add = []; const ded = []
  // Lembur (Approved, dalam periode cut-off)
  const [cf, ct] = cutOff(s, p)
  s.overtimes.filter((o) => o.emp === empId && o.status === 'Approved' && !o.dibayar && o.tanggal >= cf && o.tanggal <= ct)
    .forEach((o) => add.push({ tipe: 'Lembur', notes: `${o.tipe} ${fmt(o.tanggal)} · ${o.durasi} jam`, nominal: lemburNominal(s, { ...e, thp }, o, setup), auto: 'Lembur', ref: o.id }))
  // Reimbursement (Approved, belum dibayar)
  s.reimbursements.filter((r) => r.emp === empId && r.status === 'Approved' && !r.dibayar)
    .forEach((r) => add.push({ tipe: 'Reimburse', notes: `${r.jenis} · ${r.judul || ''} ${fmt(r.tanggal)}`.trim(), nominal: Number(r.nominal) || 0, auto: 'Reimbursement', ref: r.id }))
  // Potongan absen: Alpha / tidak hadir tanpa keterangan + cuti tidak dibayar
  const hk = workDays(s, e.branch, p) || 21; const perHari = thp / hk
  if (setup.deduksiAbsen !== false) {
    const alpha = s.attendance.filter((a) => a.emp === empId && inMonth(a.tanggal, p) && /alpha|tidak hadir|mangkir/i.test(a.status))
    if (alpha.length) ded.push({ tipe: 'Potongan Absen', notes: `${alpha.length} hari tidak hadir (${alpha.map((a) => fmt(a.tanggal)).join(', ')}) · ${hk} hari kerja`, nominal: Math.round(perHari * alpha.length), auto: 'Absensi' })
    const unpaid = s.leaves.filter((l) => l.emp === empId && l.status === 'Approved' && inMonth(l.dari, p) && (s.leaveTypes.find((t) => t.name === l.jenis)?.dibayar === false))
    unpaid.forEach((l) => ded.push({ tipe: 'Potongan Absen', notes: `${l.jenis} ${fmt(l.dari)}${l.sampai !== l.dari ? '–' + fmt(l.sampai) : ''} · ${l.hari} hari`, nominal: Math.round(perHari * l.hari), auto: 'Cuti', ref: l.id }))
  }
  // Kliring dari finance
  ;(s.kliring || []).filter((k) => k.emp === empId && k.bulan === bulan).forEach((k) => ded.push({ tipe: 'Kliring', notes: k.notes, nominal: Number(k.nominal) || 0, auto: 'Kliring', ref: k.id }))
  // THR (bila diaktifkan): (GP+TP atau GP) × masa kerja/12, minimal 1 bulan kerja
  const { gp } = splitThp(thp, setup)
  if (opts.thr) {
    const mk = monthsBetween(e.start, `${p.y}-${String(p.m).padStart(2, '0')}-28`)
    if (mk >= 1) { const base = /Tunjangan/.test(setup.thr?.komponen || '') ? thp : gp; add.push({ tipe: 'Tunjangan Hari Raya', notes: `Masa kerja ${mk} bulan${mk < 12 ? ' (proporsional)' : ''}`, nominal: Math.round(base * Math.min(1, mk / 12) * (setup.thr?.pengali || 100) / 100), auto: 'THR' }) }
  }
  // KAK (bila diaktifkan): kontrak yang berakhir bulan ini, atau jenis Renewal/Resign
  const end = opts.row?.endBefore || e.end
  if (opts.kak && e.type === 'Kontrak' && (inMonth(end, p) || ['Renewal', 'Resign'].includes(opts.jenis))) {
    const hari = daysBetween(e.start, end); const base = /Tunjangan/.test(setup.kak?.komponen || '') ? thp : gp
    add.push({ tipe: 'Kompensasi Akhir Kontrak', notes: `Kontrak ${hari} hari`, nominal: Math.round(base * Math.min(1, hari / 365) * (setup.kak?.pengali || 100) / 100), auto: 'KAK' })
  }
  // Sisa cuti diuangkan saat Resign (Setup Remunerasi)
  if (opts.jenis === 'Resign' && setup.sisaCutiResign === 'Diuangkan') {
    const kuota = (s.leaveTypes.find((t) => t.name === 'Cuti Tahunan')?.kuota) || 12
    const pakai = s.leaves.filter((l) => l.emp === empId && l.jenis === 'Cuti Tahunan' && l.status === 'Approved').reduce((a, b) => a + b.hari, 0)
    const sisa = Math.max(0, kuota - pakai); if (sisa) add.push({ tipe: 'Sisa Cuti Diuangkan', notes: `${sisa} hari sisa cuti tahunan`, nominal: Math.round(perHari * sisa), auto: 'Cuti' })
  }
  return { additions: add, deductions: ded, hariKerja: hk }
}

// gabungkan otomatis + manual (halaman Addition & Deduction) + baris manual dari modal Edit
export function mergeLines(row, auto, manual) {
  const keepManual = (arr) => (arr || []).filter((l) => !l.auto && !l.fromAdj)
  const tag = (arr) => (arr || []).map((l) => ({ ...l, fromAdj: true }))
  return {
    additions: [...auto.additions, ...tag(manual?.additions), ...keepManual(row.additions)],
    deductions: [...auto.deductions, ...tag(manual?.deductions), ...keepManual(row.deductions)],
  }
}

export const previewRow = (row, setup) => calcRow(row, setup)
