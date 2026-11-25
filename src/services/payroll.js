import { colName } from './xlsx.js'
// Rumus remunerasi mengikuti "Template Master Data HCMS" blok AFTER
// (sheet HCMS Remunerasi Per Bulan & Sisa Kontrak, skema Normal & Khusus).
// Semua persentase, batas upah BPJS, UMR, dan tabel TER diambil dari Setup Remunerasi admin (dinamis).

// Tabel TER kategori A: [batas atas penghasilan bruto, tarif %] — bisa diubah admin di Setup Remunerasi.
export const TER_A = [
  [5400000, 0], [5650000, 0.25], [5950000, 0.5], [6300000, 0.75], [6750000, 1], [7500000, 1.25],
  [8550000, 1.5], [9650000, 1.75], [10050000, 2], [10350000, 2.25], [10700000, 2.5], [11050000, 3],
  [11600000, 3.5], [12500000, 4], [13750000, 5], [15100000, 6], [16950000, 7], [19750000, 8],
  [24150000, 9], [26450000, 10], [28000000, 11], [30050000, 12], [32400000, 13], [35400000, 14],
  [39100000, 15], [43850000, 16], [47800000, 17], [51400000, 18], [56300000, 19], [62200000, 20],
  [68600000, 21], [77500000, 22], [89000000, 23], [103000000, 24], [125000000, 25], [157000000, 26],
  [206000000, 27], [337000000, 28], [454000000, 29], [550000000, 30], [695000000, 31],
  [910000000, 32], [1400000000, 33], [Infinity, 34],
]

export const terRate = (bruto, table = TER_A) => {
  const t = (table && table.length ? table : TER_A).map(([m, r]) => [m === '' || m == null ? Infinity : Number(m), Number(r) || 0]).sort((a, b) => a[0] - b[0])
  return (t.find(([max]) => bruto <= max) || t[t.length - 1])[1]
}

export const DEFAULT_SETUP = {
  basic: 80, posisi: 20,
  company: { jkk: 0.24, jkm: 0.3, jht: 3.7, jp: 2, kes: 4 },
  employee: { jht: 2, jp: 1, kes: 1 },
  umr: 5396761,
  capJP: 10042300, // batas upah iuran JP (perusahaan & karyawan)
  capKes: 12000000, // batas upah premi BPJS Kesehatan (perusahaan & karyawan)
  ter: TER_A.map(([m, r]) => [m === Infinity ? '' : m, r]),
  thr: { komponen: 'Gaji Pokok & Tunjangan Posisi', pengali: 100 },
  kak: { komponen: 'Gaji Pokok & Tunjangan Posisi', pengali: 100 }, // template: KAK = THP
  sisa: { basic: 80, posisi: 20, company: { jkk: 0.24, jkm: 0.3, jht: 3.7, jp: 2, kes: 4 }, employee: { jht: 2, jp: 1, kes: 1 } }, // kolom 'Remunerasi Sisa Kontrak'
  overrides: {},
  deduksiAbsen: true,
  sisaCutiResign: 'Hangus',
}

// Kategori baris tambahan/potongan = kolom Excel yang diinput dari pengajuan Branch.
export const ADD_KAT = ['Overtime', 'Rapel', 'Bonus', 'Lain-lain']
export const DED_KAT = ['Potongan Absen', 'Kliring', 'Lain-lain']
export const katOf = (line, kind) => {
  if (line.kategori) return line.kategori
  const k = (line.keperluan || '').toLowerCase()
  if (kind === 'add') return k.startsWith('lembur') || k.includes('overtime') ? 'Overtime' : k.includes('rapel') ? 'Rapel' : k.includes('bonus') ? 'Bonus' : k.includes('thr') ? 'THR' : k.includes('kak') || k.includes('kompensasi') ? 'KAK' : 'Lain-lain'
  return k.includes('absen') ? 'Potongan Absen' : k.includes('kliring') ? 'Kliring' : 'Lain-lain'
}

const BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember']
export const refDate = (bulan) => { // "November 2026" -> 1 Nov 2026
  const [b, y] = String(bulan || '').toLowerCase().split(' '); const i = BULAN.indexOf(b)
  return i >= 0 && y ? new Date(Number(y), i, 1) : new Date(2026, 10, 1)
}
const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
export const durasiBulan = (start, end) => (start && end ? Math.max(0, monthsBetween(new Date(start), new Date(end)) + 1) : 0)
// Sisa Kontrak = durasi kontrak dikurangi bulan yang sudah dijalani (bulan pengajuan ikut dihitung di Per Bulan).
export const sisaBulan = (end, ref) => (end ? Math.max(0, monthsBetween(ref, new Date(end))) : 0)

const merge = (setup, ov) => (ov ? { ...setup, ...ov } : setup)
const pct = (v) => (Number(v) || 0) / 100

/**
 * Hitung satu baris remunerasi (rumus AFTER).
 * row: { emp, thp, skema:'Normal'|'Khusus', start, end, additions:[{keperluan,nominal,kategori}], deductions:[...] }
 * opt: { thr:bool, kak:bool, bulan:'November 2026', sisa:bool (pakai persentase kolom Sisa Kontrak) }
 */
export function calcRow(row, setup = DEFAULT_SETUP, opt = {}) {
  setup = merge(setup, setup.overrides && row.emp ? setup.overrides[row.emp] : null) // aturan per karyawan (Employee Setup)
  const p = opt.sisa && setup.sisa ? { ...setup, ...setup.sisa } : setup
  const c = p.company, e = p.employee
  const umr = Number(setup.umr) || 0, capJP = Number(setup.capJP) || DEFAULT_SETUP.capJP, capKes = Number(setup.capKes) || DEFAULT_SETUP.capKes
  const khusus = row.skema === 'Khusus'
  const thp = Number(row.thp) || 0

  // Gaji Pokok: THP × % basic, tidak boleh di bawah UMR (kecuali THP sendiri di bawah UMR)
  const gpPct = thp * pct(p.basic)
  const gp = gpPct > umr ? gpPct : Math.min(thp, umr)
  const tp = thp * pct(p.posisi) // Tunjangan Posisi = THP × % posisi (sesuai template, juga saat Gaji Pokok dinaikkan ke UMR)

  // Penambah gaji (input Branch + THR/KAK otomatis)
  const ref = refDate(opt.bulan)
  const masaKerja = row.start ? Math.max(0, monthsBetween(new Date(row.start), ref)) : 0
  const durasi = durasiBulan(row.start, row.end)
  const upah = (k) => (k.komponen === 'Gaji Pokok' ? gp : gp + tp) * pct(k.pengali)
  const add = { KAK: 0, THR: 0, Overtime: 0, Rapel: 0, Bonus: 0, 'Lain-lain': 0 }
  ;(row.additions || []).forEach((a) => { const k = katOf(a, 'add'); add[k] = (add[k] || 0) + (Number(a.nominal) || 0) })
  if (opt.thr) add.THR += upah(setup.thr) * (masaKerja >= 12 ? 1 : masaKerja / 12) // ≥12 bulan = 1× upah, di bawahnya proporsional
  if (opt.kak) add.KAK += upah(setup.kak) * durasi / 12 // masa kontrak (bulan) ÷ 12 × upah
  if (opt.accrual && durasi > 0) { add.KAK += upah(setup.kak) / durasi; add.THR += upah(setup.thr) / durasi } // Sisa Kontrak: cicilan KAK & THR per bulan (THP ÷ durasi kontrak)
  const addTotal = Object.values(add).reduce((s, v) => s + v, 0)

  // Pengurang gaji (input Branch)
  const ded = { 'Potongan Absen': 0, Kliring: 0, 'Lain-lain': 0 }
  ;(row.deductions || []).forEach((a) => { const k = katOf(a, 'ded'); ded[k] = (ded[k] || 0) + (Number(a.nominal) || 0) })
  if (setup.deduksiAbsen === false) ded['Potongan Absen'] = 0
  const dedTotal = ded['Potongan Absen'] + ded.Kliring + ded['Lain-lain']

  // Tanggungan perusahaan
  const comp = {
    jkk: gp * pct(c.jkk), jkm: gp * pct(c.jkm), jht: gp * pct(c.jht),
    jp: Math.min(gp, capJP) * pct(c.jp),
    kes: (gp <= capKes ? gp : capKes) * pct(c.kes),
  }
  const bpjstk = comp.jkk + comp.jkm + comp.jht + comp.jp // Total Iuran BPJSTK

  // Tanggungan karyawan
  const emp = { jht: gp * pct(e.jht), jp: Math.min(gp, capJP) * pct(e.jp), kes: Math.min(gp, capKes) * pct(e.kes) }
  const empTotal = emp.jht + emp.jp + emp.kes

  // Pajak TER. Dasar pajak = Gaji Pokok + Tunjangan + penambah + JKK + JKM + Premi BPJSKES perusahaan
  const bruto = gp + tp + addTotal + comp.jkk + comp.jkm + comp.kes
  // Tarif: Normal pakai dasar pajak di atas; Khusus pakai dasar sesuai template (termasuk JHT, JP perusahaan & tanggungan karyawan)
  const brutoTarif = khusus ? gp + tp + addTotal + comp.jht + comp.jp + comp.kes + empTotal : bruto
  const rate = terRate(brutoTarif, setup.ter)
  const pajak = bruto * rate / 100

  // Hasil
  const net = thp + addTotal - dedTotal - (khusus ? 0 : empTotal) // Nett Salary Karyawan
  const tani = thp + bpjstk + comp.kes + pajak + addTotal + (khusus ? empTotal : 0) - ded['Potongan Absen'] // Total Tani 1 Bulan
  const compTotal = bpjstk + comp.kes

  return { thp, gp, tp, add, addTotal, ded, dedTotal, comp, bpjstk, emp, empTotal, compTotal, bruto, brutoTarif, rate, pajak, net, tani, masaKerja, durasi, khusus }
}

// Hitung satu baris dalam konteks pengajuan: Per Bulan + Sisa Kontrak + Grand Total.
export function calcRemunRow(row, setup, remun = {}, e = {}) {
  const r = { ...row, start: row.start || e.start, end: row.end || e.end, skema: row.skema || e.skema }
  const opt = { thr: !!remun.thr, kak: !!remun.kak, bulan: remun.bulan }
  const bulan = calcRow(r, setup, opt)
  // Sisa Kontrak: proyeksi bulan-bulan berikutnya — tanpa input sekali bayar bulan ini, KAK & THR dicicil per bulan
  const s = calcRow({ ...r, additions: [], deductions: [] }, setup, { bulan: remun.bulan, sisa: true, accrual: true })
  const sisa = sisaBulan(r.end, refDate(remun.bulan))
  // Total Tani (Sisa Kontrak) = (THP + KAK + THR + Total Iuran BPJSTK + Premi BPJSKES + Pajak [+ Tanggungan Karyawan bila Khusus]) × Sisa Kontrak
  const taniSisaBulan = s.thp + s.add.KAK + s.add.THR + s.bpjstk + s.comp.kes + s.pajak + (s.khusus ? s.empTotal : 0)
  const taniSisa = taniSisaBulan * sisa
  return { ...bulan, row: r, s, sisa, taniSisaBulan, taniSisa, grand: taniSisa + bulan.tani }
}

// ---------- Workbook Excel remunerasi (susunan kolom = template HCMS blok AFTER) ----------
// rows: [{ name, type, c }] dengan c = calcRemunRow(...). Hasil: 4 sheet (Per Bulan & Sisa Kontrak × Normal & Khusus).
const C = { id: 'A64D79', gp: 'B6D7A8', add: '999999', comp: 'D9EAD3', tax: 'FF00FF', res2: '92D050', ded: 'B7B7B7', emp: 'DDEBF7', empPct: 'CFE2F3', res: '92D050' }
const pctLbl = (v) => (Number(v) || 0).toFixed(2).replace('.', ',') + '%'

// Satu definisi kolom untuk layar simulasi & file Excel. g = grup warna, t = format.
export const REMUN_CATS = [
  { key: 'bulan-normal', label: 'Per Bulan', skema: 'Normal', sisa: false, khusus: false },
  { key: 'sisa-normal', label: 'Sisa Kontrak', skema: 'Normal', sisa: true, khusus: false },
  { key: 'bulan-khusus', label: 'Per Bulan', skema: 'Khusus', sisa: false, khusus: true },
  { key: 'sisa-khusus', label: 'Sisa Kontrak', skema: 'Khusus', sisa: true, khusus: true },
]
export const REMUN_GROUPS = { add: 'Penambah Gaji', comp: 'Tanggungan Perusahaan', tax: 'Tanggungan Perusahaan', ded: 'Pengurang Gaji', emp: 'Tanggungan Karyawan' }
export function remunCols(setup, { sisa, khusus }) {
  const p = sisa && setup.sisa ? { ...setup, ...setup.sisa } : setup
  const cp = p.company, ep = p.employee
  const K = (x) => (sisa ? x.c.s : x.c)
  return [
    { h: 'No', g: 'id', t: 'int', f: (x, i) => i + 1 },
    { h: 'Nama', g: 'id', t: 'text', f: (x) => x.name },
    { h: 'Tipe Karyawan', g: 'id', t: 'text', f: (x) => x.type },
    { h: 'Tanggal Masuk', g: 'id', t: 'date', f: (x) => x.c.row.start },
    { h: 'Tanggal Keluar', g: 'id', t: 'date', f: (x) => x.c.row.end },
    ...(sisa ? [{ h: 'Durasi Kontrak', g: 'id', t: 'int', f: (x) => x.c.s.durasi }, { h: 'Sisa Kontrak', g: 'id', t: 'int', f: (x) => x.c.sisa }] : []),
    { h: 'THP', g: 'id', t: 'num', f: (x) => K(x).thp },
    { h: 'Gaji Pokok', g: 'gp', t: 'num', f: (x) => K(x).gp },
    { h: 'Tunjangan Posisi', g: 'gp', t: 'num', f: (x) => K(x).tp },
    { h: 'Kompensasi Akhir Kontrak', g: 'add', t: 'num', f: (x) => K(x).add.KAK },
    { h: 'Tunjangan Hari Raya', g: 'add', t: 'num', f: (x) => K(x).add.THR },
    { h: 'Overtime', g: 'add', t: 'num', f: (x) => K(x).add.Overtime },
    { h: 'Rapel', g: 'add', t: 'num', f: (x) => K(x).add.Rapel },
    { h: 'Bonus', g: 'add', t: 'num', f: (x) => K(x).add.Bonus },
    { h: 'Lain-lain', g: 'add', t: 'num', f: (x) => K(x).add['Lain-lain'] },
    { h: `BPJSTK Iuran JKK (${pctLbl(cp.jkk)})`, g: 'comp', t: 'num', f: (x) => K(x).comp.jkk },
    { h: `BPJSTK Iuran JKM (${pctLbl(cp.jkm)})`, g: 'comp', t: 'num', f: (x) => K(x).comp.jkm },
    { h: `BPJSTK Iuran JHT (${pctLbl(cp.jht)})`, g: 'comp', t: 'num', f: (x) => K(x).comp.jht },
    { h: `BPJSTK Iuran JP (${pctLbl(cp.jp)})`, g: 'comp', t: 'num', f: (x) => K(x).comp.jp },
    { h: 'Total Iuran BPJSTK', g: 'comp', t: 'num', f: (x) => K(x).bpjstk },
    { h: 'Premi BPJSKES', g: 'comp', t: 'num', f: (x) => K(x).comp.kes },
    { h: 'Perhitungan Pajak (TER)', g: !sisa && !khusus ? 'tax' : 'comp', t: 'pct', f: (x) => K(x).rate / 100 },
    { h: 'Pajak', g: !sisa && !khusus ? 'tax' : 'comp', t: 'num', f: (x) => K(x).pajak },
    { h: 'Potongan Absen', g: 'ded', t: 'num', f: (x) => K(x).ded['Potongan Absen'] },
    { h: 'Kliring', g: 'ded', t: 'num', f: (x) => K(x).ded.Kliring },
    { h: 'Lain-lain', g: 'ded', t: 'num', f: (x) => K(x).ded['Lain-lain'] },
    { h: `BPJSTK Iuran JHT (${pctLbl(ep.jht)})`, g: 'emp', t: 'num', f: (x) => K(x).emp.jht },
    { h: `BPJSTK Iuran JP (${pctLbl(ep.jp)})`, g: 'emp', t: 'num', f: (x) => K(x).emp.jp },
    { h: 'Premi BPJSKES', g: 'emp', t: 'num', f: (x) => K(x).emp.kes },
    { h: sisa && khusus ? 'Total Potongan Gaji' : 'Total Tanggungan Karyawan', g: 'emp', t: 'num', f: (x) => K(x).empTotal },
    { h: 'Nett Salary Karyawan', g: 'res', t: 'num', f: (x) => K(x).net },
    ...(sisa ? [{ h: 'Total Tani (Sisa Kontrak)', g: 'res', t: 'num', f: (x) => x.c.taniSisa }, { h: 'Total Tani (Per Bulan)', g: 'res', t: 'num', f: (x) => x.c.tani }, { h: 'Grand Total Tani', g: 'res', t: 'num', f: (x) => x.c.grand }]
      : [{ h: khusus ? 'Total Tani Per Bulan' : 'Total Tani 1 Bulan', g: 'res', t: 'num', f: (x) => x.c.tani }]),
  ]
}
export const catRows = (rows, cat) => rows.filter((x) => (x.c.row.skema === 'Khusus') === cat.khusus)

function remunSheet(rows, setup, { sisa, khusus, title, meta }) {
  const p = sisa && setup.sisa ? { ...setup, ...setup.sisa } : setup
  const cp = p.company, ep = p.employee
  const pre = sisa ? 2 : 0 // Sisa Kontrak menambah kolom Durasi & Sisa Kontrak
  // Warna & font mengikuti Kirana: header hijau #0A5950 teks putih, baris total krem; tebal hanya kolom total paling kanan
  const defs = remunCols(setup, { sisa, khusus })
  const last = defs.length - 1
  const head = defs.map((d) => ({ v: d.h, fill: '0A5950', color: 'FFFFFF', bold: true, align: 'center', wrap: true, border: true }))
  const data = rows.map((x, i) => defs.map((d, k) => {
    const v = d.f(x, i), b = k === last
    return d.t === 'text' ? { v, border: true } : d.t === 'date' ? { v, fmt: 'date', border: true, align: 'center' } : d.t === 'int' ? { v, fmt: 'int', border: true, align: 'center' } : d.t === 'pct' ? { v, fmt: 'pct', border: true, align: 'center' } : { v: Number(v) || 0, fmt: 'num', border: true, bold: b, color: b ? '0A5950' : undefined }
  }))
  const T = (v) => ({ v, border: true })
  const skip = new Set(defs.map((d, k) => (d.t === 'num' ? -1 : k)))
  const total = head.map((_, k) => (k === 1 ? { v: 'Total', border: true, fill: 'F5F5EB' } : skip.has(k) ? { v: '', border: true, fill: 'F5F5EB' } : { v: data.reduce((a, r) => a + (r[k].v || 0), 0), fmt: 'num', border: true, fill: 'F5F5EB', bold: k === last, color: k === last ? '0A5950' : undefined }))
  // Mulai langsung dari header tabel di baris 1 (tanpa judul, grup, dan baris persentase)
  const sheetRows = [head, ...data, ...(data.length ? [total] : [])]
  const widths = head.map((h, k) => (k === 0 ? 5 : k === 1 ? 24 : k === 2 ? 15 : k < 5 + pre ? 13 : 16))
  return { rows: sheetRows, merges: [], widths, freeze: 1, freezeCols: 2, heights: { 0: 42 } }
}

export function remunWorkbook(rows, setup, { branch = '', bulan = '', meta = '' } = {}) {
  return REMUN_CATS.map((cat) => {
    const name = `${cat.label} (${cat.skema})`
    return { name, ...remunSheet(catRows(rows, cat), setup, { sisa: cat.sisa, khusus: cat.khusus, title: `HCMS Remunerasi ${name} - ${branch} - ${bulan}`, meta }) }
  })
}

export const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID')
