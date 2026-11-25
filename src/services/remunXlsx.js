// File "Remunerasi <Bulan Tahun>.xlsx" (tombol Download setelah Create Simulation).
// Kolom mengikuti file Scala (sheet "Perbulan" & "Sisa Kontrak"), tetapi berisi RUMUS Excel yang merujuk sheet Parameter & TER,
// plus sheet "Rincian" berisi asal setiap addition/deduction (otomatis dari modul / manual).
import { buildXlsx, colName, excelDate, ST } from './xlsxF.js'
import { TER_A, DEFAULT_SETUP, calcRow, calcSisa, parsePeriod, lineType } from './payrollScala.js'

const H = (v) => ({ v, s: ST.head })
const N = (v) => ({ v: Math.round((Number(v) || 0) * 100) / 100, s: ST.num })
const F = (f, s = ST.num) => ({ f, s })
const D = (iso) => (iso ? { v: excelDate(iso), s: ST.date } : { v: '', s: ST.text })
const T = (v) => ({ v: v ?? '', s: ST.text })

// Parameter: baris → sel
const P = { tahun: 3, bulan: 4, basic: 5, umr: 6, umrFloor: 7, umrDitanggung: 8, jkk: 9, jkm: 10, jht: 11, jp: 12, kes: 13, ejht: 14, ejp: 15, ekes: 16, jpCap: 17, kesCap: 18, kak: 19 }
const p = (k) => `Parameter!$B$${P[k]}`
const TER_RANGE = `TER!$A$2:$C$${TER_A.length + 1}`

export function buildRemunXlsx({ remun, s, branchName }) {
  const setup = { ...DEFAULT_SETUP, ...(s.setup || {}) }
  const period = parsePeriod(remun.bulan)
  const emp = (id) => s.employees.find((e) => e.id === id) || { name: id }
  // baris dengan aturan khusus (Employee Setup / Skema Khusus berbeda) ditulis sebagai nilai agar tetap akurat
  const special = (r) => !!(setup.overrides?.[r.emp]) || (r.skema === 'Khusus' && !!setup.khusus)

  const COLS = ['No', 'Nama', 'Tipe Karyawan', 'Skema', 'Tanggal Masuk', 'Tanggal Keluar', 'THP', 'Sisa Kontrak (bulan)', 'Basic Salary', 'Tunjangan Posisi',
    'Kompensasi Akhir Kontrak', 'Tunjangan Hari Raya', 'Overtime', 'Rapel', 'Bonus', 'Sisa Cuti Diuangkan', 'Lain - Lain', 'Reimburse (tidak kena pajak)',
    'BPJSTK Iuran JKK', 'BPJSTK Iuran JKM', 'BPJSTK Iuran JHT', 'BPJSTK Iuran JP', 'Total Iuran BPJSTK', 'Premi BPJSKES',
    'Bruto Pajak', 'Perhitungan Pajak (TER)', 'Pajak', 'Kliring', 'Potongan Absen', 'Lain - Lain',
    'BPJSTK Iuran JHT (karyawan)', 'BPJSTK Iuran JP (karyawan)', 'Premi BPJSKES (karyawan)', 'Iuran Karyawan Ditanggung Perusahaan',
    'Total Potongan Gaji', 'Nett Salary Karyawan', 'Total Tani']
  const c = Object.fromEntries(COLS.map((h, i) => [i, colName(i)]))
  const L = (name) => colName(COLS.indexOf(name))
  const first = 2; const last = first + remun.rows.length - 1
  const perbulan = [COLS.map(H)]
  remun.rows.forEach((r, i) => {
    const e = emp(r.emp); const x = first + i; const v = calcRow(r, setup); const by = v.by; const sp = special(r)
    const R = (col) => `${col}${x}`
    const g = R('G'), I = R('I')
    const fx = (f, val, st = ST.num) => (sp ? N(val) : F(f, st))
    perbulan.push([
      { v: i + 1, s: ST.text }, T(e.name), T(r.type || e.type), T(r.skema || 'Normal'), D(r.start || e.start), D(r.end || e.end), N(v.thp),
      F(`(YEAR(F${x})*12+MONTH(F${x}))-(${p('tahun')}*12+${p('bulan')})`),
      fx(`IF(${p('umrFloor')}=1,MIN(${g},MAX(${g}*${p('basic')},${p('umr')})),${g}*${p('basic')})`, v.gp),
      F(`${g}-${I}`),
      N(by.kak), N(by.thr), N(by.lembur), N(by.rapel), N(by.bonus), N(by.sisaCuti), N(by.lainAdd), N(by.reimburse),
      fx(`${I}*${p('jkk')}`, v.comp.jkk), fx(`${I}*${p('jkm')}`, v.comp.jkm), fx(`${I}*${p('jht')}`, v.comp.jht), fx(`MIN(${I},${p('jpCap')})*${p('jp')}`, v.comp.jp),
      F(`SUM(S${x}:V${x})`), fx(`MIN(${I},${p('kesCap')})*${p('kes')}`, v.comp.kes),
      F(`${g}+SUM(K${x}:Q${x})+S${x}+T${x}+X${x}`),
      F(`VLOOKUP(Y${x},${TER_RANGE},3,TRUE)`, ST.pct),
      F(`Y${x}*Z${x}`),
      N(by.kliring), N(by.absen), N(by.lainDed),
      fx(`${I}*${p('ejht')}`, v.emp.jht), fx(`MIN(${I},${p('jpCap')})*${p('ejp')}`, v.emp.jp), fx(`MIN(${I},${p('kesCap')})*${p('ekes')}`, v.emp.kes),
      sp ? T(v.ditanggung ? 'Ya' : 'Tidak') : F(`IF(OR(D${x}="Khusus",AND(${p('umrDitanggung')}=1,${p('umrFloor')}=1,${g}*${p('basic')}<${p('umr')})),"Ya","Tidak")`, ST.text),
      F(`AB${x}+AC${x}+AD${x}+IF(AH${x}="Ya",0,AE${x}+AF${x}+AG${x})`),
      F(`${g}+SUM(K${x}:R${x})-AI${x}`),
      F(`${g}+SUM(K${x}:R${x})-(AB${x}+AC${x}+AD${x})+W${x}+X${x}+AA${x}+IF(AH${x}="Ya",AE${x}+AF${x}+AG${x},0)`),
    ])
  })
  const sumCols = ['G', ...'IJKLMNOPQRSTUVWXY'.split(''), 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AJ', 'AK']
  perbulan.push(COLS.map((_, i) => { const col = colName(i); if (i === 1) return { v: 'TOTAL', s: ST.totText }; return sumCols.includes(col) && remun.rows.length ? { f: `SUM(${col}${first}:${col}${last})`, s: ST.totNum } : { v: '', s: ST.totText } }))

  // ---- Sisa Kontrak ----
  const SC = ['No', 'Nama', 'Tipe Karyawan', 'Tanggal Masuk', 'Tanggal Keluar', 'Durasi Kontrak (bulan)', 'THP', 'Sisa Kontrak (bulan)', 'Basic Salary', 'Tunjangan Posisi',
    'Total Iuran BPJSTK / bulan', 'Premi BPJSKES / bulan', 'Bruto Pajak Rutin', 'Perhitungan Pajak (TER)', 'Pajak Rutin / bulan', 'Iuran Karyawan Ditanggung / bulan',
    'Total Tani Rutin / bulan', 'Estimasi Kompensasi Akhir Kontrak', 'Total Tani (Sisa Kontrak)', 'Total Tani (Perbulan)', 'Grand Total Tani']
  const sisa = [SC.map(H)]
  remun.rows.forEach((r, i) => {
    const e = emp(r.emp); const x = first + i; const v = calcRow(r, setup); const ss = calcSisa({ ...r, type: r.type || e.type, start: r.start || e.start, end: r.end || e.end }, v, period, setup)
    const pb = (col) => `'Perbulan'!${col}${x}`
    sisa.push([
      { v: i + 1, s: ST.text }, T(e.name), T(r.type || e.type), D(r.start || e.start), D(r.end || e.end),
      F(`DATEDIF(D${x},E${x}+1,"m")`), F(pb('G')), F(`MAX(0,${pb('H')})`), F(pb('I')), F(pb('J')), F(pb('W')), F(pb('X')),
      F(`G${x}+${pb('S')}+${pb('T')}+L${x}`), F(`VLOOKUP(M${x},${TER_RANGE},3,TRUE)`, ST.pct), F(`M${x}*N${x}`),
      F(`IF(${pb('AH')}="Ya",${pb('AE')}+${pb('AF')}+${pb('AG')},0)`),
      F(`G${x}+K${x}+L${x}+O${x}+P${x}`),
      special(r) ? N(ss.kakEst) : F(`IF(AND(C${x}="Kontrak",H${x}>0),I${x}*MIN(1,(E${x}-D${x}+1)/365)*${p('kak')},0)`),
      F(`Q${x}*H${x}+R${x}`), F(pb('AK')), F(`S${x}+T${x}`),
    ])
  })
  sisa.push(SC.map((_, i) => { const col = colName(i); if (i === 1) return { v: 'TOTAL', s: ST.totText }; return i >= 6 && !['H', 'N'].includes(col) && remun.rows.length ? { f: `SUM(${col}${first}:${col}${last})`, s: ST.totNum } : { v: '', s: ST.totText } }))

  // ---- Rincian addition & deduction ----
  const rincian = [['Nama', 'Jenis', 'Keperluan Pembayaran', 'Notes', 'Sumber', 'Sebesar'].map(H)]
  remun.rows.forEach((r) => {
    const nm = emp(r.emp).name
    ;(r.additions || []).forEach((l) => rincian.push([T(nm), T('Addition'), T(lineType(l, 'add')), T(l.notes || l.keperluan || ''), T(l.auto ? 'Otomatis · ' + l.auto : l.fromAdj ? 'Halaman Addition & Deduction' : 'Manual (Edit)'), N(l.nominal)]))
    ;(r.deductions || []).forEach((l) => rincian.push([T(nm), T('Deduction'), T(lineType(l, 'ded')), T(l.notes || l.keperluan || ''), T(l.auto ? 'Otomatis · ' + l.auto : l.fromAdj ? 'Halaman Addition & Deduction' : 'Manual (Edit)'), N(l.nominal)]))
  })
  if (rincian.length === 1) rincian.push([T('Tidak ada addition/deduction pada periode ini')])

  // ---- Parameter ----
  const k = setup.company, em = setup.employee
  const prm = (label, val, st = ST.input) => [T(label), typeof val === 'number' ? { v: val, s: st } : T(val)]
  const parameter = [
    [{ v: `Parameter remunerasi · ${branchName} · ${remun.bulan}`, s: ST.title }],
    [H('Parameter'), H('Nilai')],
    prm('Tahun periode', period.y, ST.text), prm('Bulan periode (1–12)', period.m, ST.text),
    prm('Porsi Basic Salary dari THP', setup.basic / 100, ST.pct), prm('Batas UMR', Number(setup.umr) || 0),
    prm('Basic minimal UMR (1 = ya)', setup.umrFloor === false ? 0 : 1, ST.text), prm('Iuran karyawan ditanggung bila basic = UMR (1 = ya)', setup.umrDitanggung === false ? 0 : 1, ST.text),
    prm('BPJSTK JKK (perusahaan)', k.jkk / 100, ST.pct), prm('BPJSTK JKM (perusahaan)', k.jkm / 100, ST.pct), prm('BPJSTK JHT (perusahaan)', k.jht / 100, ST.pct), prm('BPJSTK JP (perusahaan)', k.jp / 100, ST.pct), prm('Premi BPJS Kes (perusahaan)', k.kes / 100, ST.pct),
    prm('BPJSTK JHT (karyawan)', em.jht / 100, ST.pct), prm('BPJSTK JP (karyawan)', em.jp / 100, ST.pct), prm('Premi BPJS Kes (karyawan)', em.kes / 100, ST.pct),
    prm('Batas upah iuran JP', Number(setup.jpCap) || 0), prm('Batas upah iuran BPJS Kes', Number(setup.kesCap) || 0), prm('Pengali KAK', (setup.kak?.pengali || 100) / 100, ST.pct),
    [], [{ v: 'Catatan', s: ST.head }],
    [{ v: 'Ubah sel kuning untuk simulasi; semua kolom rumus di sheet Perbulan & Sisa Kontrak ikut menghitung ulang.', s: ST.muted }],
    [{ v: 'Pajak = PPh 21 TER kategori A (PP 58/2023), dasar = THP + addition kena pajak + JKK + JKM + BPJS Kes perusahaan.', s: ST.muted }],
    [{ v: 'Baris dengan aturan khusus di Employee Setup ditulis sebagai nilai, bukan rumus.', s: ST.muted }],
    [{ v: `Dibuat Kirana HRIS · ${new Date().toLocaleString('id-ID')}`, s: ST.muted }],
  ]
  // ---- TER ----
  const ter = [[H('Batas bawah bruto'), H('Batas atas bruto'), H('Tarif TER A')]]
  TER_A.forEach(([max, rate], i) => { const lo = i === 0 ? 0 : TER_A[i - 1][0] + 0.01; ter.push([N(lo), max === Infinity ? T('dan seterusnya') : N(max), { v: rate / 100, s: ST.pct }]) })

  const W = (n, w = 16) => Array(n).fill(w)
  const blob = buildXlsx([
    { name: 'Perbulan', rows: perbulan, headRow: 1, freeze: [2, 1], widths: [5, 26, 13, 10, 13, 13, ...W(31)] },
    { name: 'Sisa Kontrak', rows: sisa, headRow: 1, freeze: [2, 1], widths: [5, 26, 13, 13, 13, ...W(16)] },
    { name: 'Rincian', rows: rincian, headRow: 1, widths: [26, 12, 26, 48, 30, 16] },
    { name: 'Parameter', rows: parameter, widths: [52, 18] },
    { name: 'TER', rows: ter, headRow: 1, widths: [20, 20, 14] },
  ])
  return new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
