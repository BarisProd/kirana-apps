// Mesin hitung remunerasi Kirana.
// Diturunkan dari 15 file "Download" simulasi remunerasi Scala (Branch Bank DKI, Mar 2025 – Sep 2026), dicocokkan per sen:
//   Basic Salary      = MIN(THP, MAX(THP × 80%, UMR))           → THP kecil dinaikkan porsi gaji pokoknya sampai UMR
//   Tunjangan Posisi  = THP − Basic Salary
//   Iuran perusahaan  = Basic × (JKK 0,24% | JKM 0,30% | JHT 3,7% | JP 2% | BPJS Kes 4%)
//   Iuran karyawan    = Basic × (JHT 2% | JP 1% | BPJS Kes 1%)
//   Bruto pajak (TER) = THP + addition kena pajak + JKK + JKM + BPJS Kes perusahaan   (potongan TIDAK mengurangi bruto)
//   Pajak             = Bruto × tarif TER A (PP 58/2023), ditanggung perusahaan
//   Potongan absen    = THP ÷ hari kerja bulan itu × hari tidak hadir
//   KAK               = Gaji Pokok × hari kontrak ÷ 365 (maks 1×)
//   Total TANI        = THP + addition − (kliring + potongan absen + lain-lain) + iuran BPJSTK perusahaan + BPJS Kes perusahaan + pajak
// Koreksi Kirana atas kejanggalan di file Scala (lihat dokumen audit): Nett Salary memakai THP (bukan hanya Basic),
// potongan absen tidak dikurangkan dua kali, iuran karyawan yang ditanggung perusahaan ikut dihitung di TANI,
// BPJS Kes perusahaan selalu masuk bruto pajak, Sisa Kontrak = biaya rutin bulanan × sisa bulan + estimasi KAK.
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
export const terRate = (bruto) => TER_A.find(([max]) => bruto <= max)[1]

// Jenis addition & deduction (sama dengan dropdown "Keperluan Pembayaran" di Scala, + Sisa Cuti)
export const ADD_TYPES = ['Lembur', 'Bonus', 'Rapel', 'Tunjangan Hari Raya', 'Kompensasi Akhir Kontrak', 'Reimburse', 'Sisa Cuti Diuangkan', 'Lain - Lain']
export const DED_TYPES = ['Kliring', 'Potongan Absen', 'Lain - Lain']
export const NON_TAXABLE = ['Reimburse'] // penggantian biaya bukan penghasilan
export const needsNote = (tipe) => tipe === 'Lain - Lain'

export const DEFAULT_SETUP = {
  basic: 80, posisi: 20,
  company: { jkk: 0.24, jkm: 0.3, jht: 3.7, jp: 2, kes: 4 },
  employee: { jht: 2, jp: 1, kes: 1 },
  umr: 5396761,
  umrFloor: true, // gaji pokok minimal UMR (pola file Scala)
  umrDitanggung: true, // bila gaji pokok = UMR, iuran BPJS karyawan ditanggung perusahaan (pola file Scala)
  jpCap: 10547400, // batas upah iuran JP (perlu diperbarui tiap tahun sesuai BPJS Ketenagakerjaan)
  kesCap: 12000000, // batas upah iuran BPJS Kesehatan
  thr: { komponen: 'Gaji Pokok & Tunjangan Posisi', pengali: 100 },
  kak: { komponen: 'Gaji Pokok', pengali: 100 },
  sisa: { basic: 80, posisi: 20, company: { jkk: 0.24, jkm: 0.3, jht: 3.7, jp: 2, kes: 4 }, employee: { jht: 2, jp: 1, kes: 1 } },
  overrides: {},
  deduksiAbsen: true,
  sisaCutiResign: 'Hangus',
}

const num = (v) => Number(v) || 0
// baris lama (keperluan bebas) → tipe
export const lineType = (l, kind) => l.tipe || (kind === 'add' ? (/lembur/i.test(l.keperluan) ? 'Lembur' : /reimb/i.test(l.keperluan) ? 'Reimburse' : /rapel/i.test(l.keperluan) ? 'Rapel' : 'Lain - Lain') : (/absen/i.test(l.keperluan) ? 'Potongan Absen' : /kliring/i.test(l.keperluan) ? 'Kliring' : 'Lain - Lain'))
const sumType = (lines, kind, tipe) => (lines || []).filter((l) => lineType(l, kind) === tipe).reduce((s, l) => s + num(l.nominal), 0)

export function splitThp(thp, setup = DEFAULT_SETUP) {
  const raw = thp * setup.basic / 100
  const gp = setup.umrFloor === false ? raw : Math.min(thp, Math.max(raw, num(setup.umr)))
  return { gp, tp: thp - gp, umrApplied: setup.umrFloor !== false && raw < num(setup.umr) }
}

// row: { emp, thp, skema, additions:[{tipe, notes, nominal}], deductions:[...] }
export function calcRow(row, setup = DEFAULT_SETUP) {
  if (row.skema === 'Khusus' && setup.khusus) setup = { ...setup, ...setup.khusus, overrides: setup.overrides }
  const ov = setup.overrides && row.emp ? setup.overrides[row.emp] : null
  if (ov) setup = { ...setup, ...ov }
  setup = { ...DEFAULT_SETUP, ...setup }
  const thp = num(row.thp)
  const { gp, tp, umrApplied } = splitThp(thp, setup)
  const c = setup.company, e = setup.employee
  const jpBase = Math.min(gp, num(setup.jpCap) || Infinity); const kesBase = Math.min(gp, num(setup.kesCap) || Infinity)
  const comp = { jkk: gp * c.jkk / 100, jkm: gp * c.jkm / 100, jht: gp * c.jht / 100, jp: jpBase * c.jp / 100, kes: kesBase * c.kes / 100 }
  const emp = { jht: gp * e.jht / 100, jp: jpBase * e.jp / 100, kes: kesBase * e.kes / 100 }
  const A = (t) => sumType(row.additions, 'add', t), D = (t) => sumType(row.deductions, 'ded', t)
  const by = { kak: A('Kompensasi Akhir Kontrak'), thr: A('Tunjangan Hari Raya'), lembur: A('Lembur'), rapel: A('Rapel'), bonus: A('Bonus'), sisaCuti: A('Sisa Cuti Diuangkan'), lainAdd: A('Lain - Lain'), reimburse: A('Reimburse'), kliring: D('Kliring'), absen: D('Potongan Absen'), lainDed: D('Lain - Lain') }
  const add = (row.additions || []).reduce((s, l) => s + num(l.nominal), 0)
  const addTax = add - by.reimburse
  const ded = by.kliring + by.absen + by.lainDed
  const empTotal = emp.jht + emp.jp + emp.kes
  const tkTotal = comp.jkk + comp.jkm + comp.jht + comp.jp
  const compTotal = tkTotal + comp.kes
  const ditanggung = row.skema === 'Khusus' || (setup.umrDitanggung !== false && umrApplied)
  const potBpjs = ditanggung ? 0 : empTotal
  const totalPotongan = ded + potBpjs
  const net = thp + add - totalPotongan
  const bruto = thp + addTax + comp.jkk + comp.jkm + comp.kes
  const rate = terRate(bruto)
  const pajak = bruto * rate / 100
  const tani = thp + add - ded + compTotal + pajak + (ditanggung ? empTotal : 0)
  // biaya rutin per bulan (tanpa addition/deduction sekali bayar) → dasar Sisa Kontrak
  const brutoRutin = thp + comp.jkk + comp.jkm + comp.kes; const rateRutin = terRate(brutoRutin); const pajakRutin = brutoRutin * rateRutin / 100
  const taniRutin = thp + compTotal + pajakRutin + (ditanggung ? empTotal : 0)
  return { thp, gp, tp, umrApplied, comp, emp, by, add, addTax, ded, empTotal, tkTotal, compTotal, ditanggung, potBpjs, totalPotongan, net, bruto, rate, pajak, tani, brutoRutin, rateRutin, pajakRutin, taniRutin }
}

// ---- periode & masa kerja ----
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const parsePeriod = (label) => { const [b, y] = String(label).split(' '); return { y: Number(y), m: BULAN.indexOf(b) + 1 } }
export const monthsLeft = (end, period) => { if (!end) return 0; const d = new Date(end); return (d.getFullYear() * 12 + d.getMonth() + 1) - (period.y * 12 + period.m) }
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1
export const monthsBetween = (a, b) => { const x = new Date(a), y = new Date(b); return (y.getFullYear() - x.getFullYear()) * 12 + y.getMonth() - x.getMonth() + (y.getDate() >= x.getDate() - 1 ? 1 : 0) }

// Sisa kontrak (sheet "Sisa Kontrak"): biaya rutin × sisa bulan + estimasi KAK akhir kontrak
export function calcSisa(row, c, period, setup = DEFAULT_SETUP) {
  const sisa = Math.max(0, monthsLeft(row.end, period))
  const kakEst = row.type === 'Kontrak' && row.start && row.end ? c.gp * Math.min(1, daysBetween(row.start, row.end) / 365) * (num(setup.kak?.pengali) || 100) / 100 : 0
  const taniSisa = c.taniRutin * sisa + (sisa > 0 ? kakEst : 0)
  return { sisa, kakEst, taniSisa, grand: c.tani + taniSisa }
}

export function totals(rows, period, setup) {
  return rows.reduce((t, r) => { const c = calcRow(r, setup); const s = calcSisa(r, c, period, setup); t.bulan += c.tani; t.sisa += s.taniSisa; return t }, { bulan: 0, sisa: 0 })
}

export const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID')
