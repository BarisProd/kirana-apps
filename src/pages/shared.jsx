import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { calcRow, calcRemunRow, remunWorkbook, remunCols, catRows, REMUN_CATS, rupiah } from '../services/payroll.js'
import { totals, parsePeriod } from '../services/payrollScala.js'
import { Badge, Table, Icon, Btn, Modal, Avatar, useToast, Pager, Field } from '../components/ui.jsx'
import { exportExcel, exportPdf, exportXlsx } from '../services/export.js'

export const useLookup = () => {
  const s = useStore()
  return {
    emp: (id) => s.employees.find((e) => e.id === id) || { name: '—' },
    branch: (id) => s.branches.find((b) => b.id === id)?.name || '—',
    job: (id) => s.jobs.find((j) => j.id === id) || { posisi: '—' },
    pool: (id) => s.pool.find((p) => p.id === id) || { name: '—' },
  }
}

export const fmtDate = (d) => {
  if (!d || d === '—') return d || '—'
  const [y, m, dd] = d.split('-'); const b = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${Number(dd)} ${b[Number(m) - 1]} ${y}`
}

export const ApprovalLine = ({ line }) => (
  <ol className="aline">{(line || []).map((l, i) => <li key={i} className={l.status.toLowerCase()}><span className="aline-dot">{l.status === 'Approved' ? <Icon name="check" size={12} /> : i + 1}</span>{l.by}<Badge>{l.status}</Badge></li>)}</ol>
)

// Data pembentuk Excel remunerasi (template HCMS blok AFTER): Per Bulan & Sisa Kontrak.
export const remunRows = (remun, s) => remun.rows.map((r) => { const e = s.employees.find((x) => x.id === r.emp) || r.demo || {}; return { r, e, name: e.name || '—', type: r.type || e.type || '', c: calcRemunRow(r, s.setup, remun, e) } })
export function exportRemun(remun, s) {
  const rows = remunRows(remun, s)
  const br = s.branches.find((b) => b.id === remun.branch)?.name || remun.branch
  const meta = `${rows.length} karyawan | Status ${remun.status || 'Simulasi'} | THR ${remun.thr ? 'aktif' : 'tidak'} | KAK ${remun.kak ? 'aktif' : 'tidak'} | Dibuat ${new Date().toLocaleDateString('id-ID')}`
  return exportXlsx({ sheets: remunWorkbook(rows, s.setup, { branch: br, bulan: remun.bulan, meta }), file: `HCMS-Remunerasi_${br}_${remun.bulan || ''}`.replace(/\s+/g, '-') })
}


// ---------- Pagination (dipakai tabel panjang) ----------
export { Pager }
export const pageOf = (list, page, size) => { const pages = Math.max(1, Math.ceil(list.length / size)); const p = Math.min(page, pages); return list.slice((p - 1) * size, p * size) }

// Contoh 300 karyawan untuk pratinjau tabel besar (tidak masuk Data Karyawan, tidak bisa diajukan)
const DN1 = ['Adi', 'Bunga', 'Citra', 'Dani', 'Eka', 'Fikri', 'Gita', 'Hadi', 'Indah', 'Joko', 'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oki', 'Puspita', 'Rizky', 'Salsa', 'Teguh', 'Umar', 'Vina', 'Wahyu', 'Yogi', 'Zahra']
const DN2 = ['Pratama', 'Lestari', 'Saputra', 'Wijaya', 'Kusuma', 'Hidayat', 'Permana', 'Anggraini', 'Nugroho', 'Maharani', 'Setiawan', 'Rahmawati', 'Firmansyah']
const DROLE = [['Staff Operasional', 5200000], ['Customer Service', 5800000], ['Admin Gudang', 5000000], ['Sales Executive', 6800000], ['Software Engineer', 13500000], ['QA Engineer', 9000000], ['Finance Staff', 8200000], ['HR Officer', 8600000], ['Supervisor', 11000000], ['Designer', 10500000]]
export const demoRemunRows = (n = 300) => Array.from({ length: n }, (_, i) => {
  const [role, base] = DROLE[(i * 7) % DROLE.length]; const thp = base + ((i * 37) % 9) * 250000
  const m = (i * 5) % 12; const start = `20${24 + (i % 2)}-${String(m + 1).padStart(2, '0')}-0${1 + (i % 9)}`
  const end = `2027-${String(((i * 3) % 12) + 1).padStart(2, '0')}-${String(10 + (i % 18))}`
  const type = i % 17 === 0 ? 'Magang' : 'Kontrak'; const skema = i % 7 === 3 ? 'Khusus' : 'Normal'
  const name = `${DN1[i % DN1.length]} ${DN2[(i * 5 + Math.floor(i / DN1.length)) % DN2.length]}`
  const demo = { id: 'demo' + i, name, role, type, skema, thp, start, end, level: i % 5 === 0 ? 'Senior' : 'Junior', kelamin: i % 2 ? 'Perempuan' : 'Laki-laki' }
  return { emp: 'demo' + i, demo, jenis: 'Active', thp, skema, start, end, role, level: demo.level, type, additions: i % 4 === 0 ? [{ keperluan: 'Lembur', kategori: 'Overtime', nominal: 150000 + (i % 5) * 50000 }] : [], deductions: [] }
})

const Line = ({ l, v, minus, strong, hint }) => <div className={'rd-l' + (strong ? ' strong' : '')}><span>{l}{hint && <small> {hint}</small>}</span><b>{minus && v ? '− ' : ''}{typeof v === 'string' ? v : rupiah(v)}</b></div>
const pctTxt = (v) => (+(Number(v) || 0).toFixed(2)).toLocaleString('id-ID') + '%'

function RemunDetail({ x }) {
  const { c } = x; const s = c.s
  const grp = (title, cls, items) => <div className={'rd-g ' + cls}><h5>{title}</h5>{items}</div>
  const block = (k, label) => (
    <div className="rd-col">
      <h4>{label}</h4>
      {grp('Penambah Gaji', 'add', <>
        <Line l="THP" v={k.thp} /><Line l="Gaji Pokok" v={k.gp} /><Line l="Tunjangan Posisi" v={k.tp} />
        {['KAK', 'THR', 'Overtime', 'Rapel', 'Bonus', 'Lain-lain'].map((n) => <Line key={n} l={n === 'KAK' ? 'Kompensasi Akhir Kontrak' : n === 'THR' ? 'Tunjangan Hari Raya' : n} v={k.add[n]} />)}
      </>)}
      {grp('Tanggungan Perusahaan', 'comp', <>
        <Line l="BPJSTK Iuran JKK" v={k.comp.jkk} /><Line l="BPJSTK Iuran JKM" v={k.comp.jkm} /><Line l="BPJSTK Iuran JHT" v={k.comp.jht} /><Line l="BPJSTK Iuran JP" v={k.comp.jp} />
        <Line l="Total Iuran BPJSTK" v={k.bpjstk} strong /><Line l="Premi BPJSKES" v={k.comp.kes} />
        <Line l="Perhitungan Pajak (TER)" v={pctTxt(k.rate)} hint={`dasar ${rupiah(k.brutoTarif)}`} /><Line l="Pajak" v={k.pajak} strong />
      </>)}
      {grp('Pengurang Gaji', 'ded', <><Line l="Potongan Absen" v={k.ded['Potongan Absen']} minus /><Line l="Kliring" v={k.ded.Kliring} minus /><Line l="Lain-lain" v={k.ded['Lain-lain']} minus /></>)}
      {grp('Tanggungan Karyawan' + (k.khusus ? ' (dibayar perusahaan)' : ''), 'emp', <><Line l="BPJSTK Iuran JHT" v={k.emp.jht} /><Line l="BPJSTK Iuran JP" v={k.emp.jp} /><Line l="Premi BPJSKES" v={k.emp.kes} /><Line l="Total Tanggungan Karyawan" v={k.empTotal} strong /></>)}
      <Line l="Nett Salary Karyawan" v={k.net} strong />
    </div>
  )
  return (
    <div className="rd">
      {block(c, 'Per Bulan')}
      <div className="rd-col">
        {block(s, `Sisa Kontrak · ${c.sisa} bulan`).props.children}
        <div className="rd-tot">
          <Line l={`Total Tani (Sisa Kontrak) = ${rupiah(c.taniSisaBulan)} × ${c.sisa}`} v={c.taniSisa} />
          <Line l="Total Tani (Per Bulan)" v={c.tani} />
          <Line l="Grand Total Tani" v={c.grand} strong />
        </div>
      </div>
    </div>
  )
}

const fmtCell = (d, v) => (d.t === 'num' ? Math.round(Number(v) || 0).toLocaleString('id-ID') : d.t === 'pct' ? pctTxt((Number(v) || 0) * 100) : d.t === 'date' ? fmtDate(v) : v ?? '')


// Tabel HCMS (dipakai simulasi: per halaman & lihat semua). Total di tfoot selalu dari seluruh list.
function XlTable({ defs, list, rows, offset = 0, idx, onOpen, label, tall }) {
  return (
    <div className={'xl-wrap' + (tall ? ' tall' : '')} tabIndex={0} aria-label={label}>
      <table className="xl">
        <thead><tr>{defs.map((d, i) => <th key={i} className={i < 2 ? 'stick s' + i : undefined}>{d.h}</th>)}</tr></thead>
        <tbody>{rows.map((x, k) => { const ri = idx ? idx[k] : offset + k; return <tr key={x.r.emp}>{defs.map((d, i) => <td key={i} className={(d.t === 'num' ? 'n' : d.t === 'text' ? '' : 'c') + (i < 2 ? ' stick s' + i : '') + (i === defs.length - 1 ? ' last' : '')}>{i === 1 ? <button className="linkish" onClick={() => onOpen(x)}>{x.name}</button> : fmtCell(d, d.f(x, ri))}</td>)}</tr> })}</tbody>
        <tfoot><tr>{defs.map((d, i) => <td key={i} className={(d.t === 'num' ? 'n' : '') + (i < 2 ? ' stick s' + i : '') + (i === defs.length - 1 ? ' last' : '')}>{i === 1 ? `Total (${list.length.toLocaleString('id-ID')})` : d.t === 'num' ? fmtCell(d, list.reduce((a, x, ri) => a + (Number(d.f(x, ri)) || 0), 0)) : ''}</td>)}</tr></tfoot>
      </table>
    </div>
  )
}

// Simulasi remunerasi: 4 kategori sesuai Excel (Per Bulan & Sisa Kontrak × Normal & Khusus), dari data karyawan yang diinput Branch.
export function RemunSummary({ remun, exportable = true }) {
  const s = useStore(); const [t, toast] = useToast(); const [open, setOpen] = useState(null)
  const rows = remunRows(remun, s)
  const firstCat = REMUN_CATS.find((c) => catRows(rows, c).length) || REMUN_CATS[0]
  const [catKey, setCat0] = useState(firstCat.key); const [page, setPage] = useState(1); const [size, setSize] = useState(10); const [all, setAll] = useState(false); const [q, setQ] = useState('')
  const setCat = (k) => { setCat0(k); setPage(1) }
  const cat = REMUN_CATS.find((c) => c.key === catKey) || firstCat
  const list = catRows(rows, cat)
  const defs = remunCols(s.setup, cat)
  const sum = (f, l = rows) => l.reduce((a, x) => a + f(x.c), 0)
  const catTotal = (c) => { const l = catRows(rows, c); return c.sisa ? sum((k) => k.taniSisa, l) : sum((k) => k.tani, l) }
  const dl = () => { try { exportRemun(remun, s); toast('Excel remunerasi diunduh (4 kategori)') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  return (
    <>
      <div className="rcat" role="tablist" aria-label="Kategori simulasi">
        {REMUN_CATS.map((c) => { const n = catRows(rows, c).length; return (
          <button key={c.key} role="tab" aria-selected={c.key === cat.key} className={'rcat-b' + (c.key === cat.key ? ' on' : '')} onClick={() => setCat(c.key)}>
            <small>{c.label} · {c.skema}</small><strong>{rupiah(catTotal(c))}</strong><span>{n} karyawan · {c.sisa ? 'Total Tani Sisa Kontrak' : 'Total Tani'}</span>
          </button>) })}
      </div>
      <div className="rcat-head"><h4>HCMS Remunerasi {cat.label} ({cat.skema})</h4>{exportable && <Btn kind="ghost" icon="download" onClick={dl}>Download Excel</Btn>}</div>
      {list.length === 0 ? <p className="muted sm rcat-empty">Tidak ada karyawan skema {cat.skema} pada pengajuan ini. Skema diatur per karyawan lewat tombol Edit.</p> : <>
        {list.length > size && <div className="xl-bar"><span className="muted sm">{list.length.toLocaleString('id-ID')} karyawan di kategori ini · tabel dipotong per halaman supaya ringan</span><Btn kind="ghost" perm="r" icon="eye" onClick={() => setAll(true)}>Lihat semua ({list.length.toLocaleString('id-ID')})</Btn></div>}
        <XlTable defs={defs} list={list} rows={pageOf(list, page, size)} offset={(Math.min(page, Math.ceil(list.length / size) || 1) - 1) * size} onOpen={setOpen} label={`Tabel ${cat.label} ${cat.skema}`} />
        {list.length > 10 && <Pager total={list.length} page={page} size={size} onPage={setPage} onSize={setSize} label="karyawan" />}
      </>}
      <div className="budget three">
        <div><small>Total Tani Per Bulan (Normal + Khusus)</small><strong>{rupiah(sum((c) => c.tani))}</strong></div>
        <div><small>Total Tani Sisa Kontrak (Normal + Khusus)</small><strong>{rupiah(sum((c) => c.taniSisa))}</strong></div>
        <div><small>Grand Total Tani</small><strong>{rupiah(sum((c) => c.grand))}</strong></div>
        <p className="muted sm">Dihitung dari data karyawan yang diinput Branch (THP, tanggal kontrak, skema, tambahan & potongan) dengan rumus Excel HCMS (AFTER). Persentase, batas upah BPJS, UMR, dan tabel TER diatur Superadmin di Setup Remunerasi. Klik nama karyawan untuk rincian.</p>
      </div>
      <Modal wide="full" open={all} title={`HCMS Remunerasi ${cat.label} (${cat.skema}) · ${list.length.toLocaleString('id-ID')} karyawan`} onClose={() => setAll(false)} footer={<>{exportable && <Btn kind="ghost" icon="download" onClick={dl}>Download Excel</Btn>}<Btn kind="ghost" perm="r" onClick={() => setAll(false)}>Tutup</Btn></>}>
        <label className="fsel grow"><span>Cari karyawan</span><span className="search"><Icon name="search" size={18} /><input placeholder="Nama karyawan" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
        {(() => { const fl = list.map((x, i) => ({ x, i })).filter(({ x }) => x.name.toLowerCase().includes(q.toLowerCase())); return <><p className="muted sm">{fl.length.toLocaleString('id-ID')} baris · total di bawah tetap menghitung seluruh {list.length.toLocaleString('id-ID')} karyawan</p>
          <XlTable defs={defs} list={list} rows={fl.map(({ x }) => x)} idx={fl.map(({ i }) => i)} onOpen={(x) => { setAll(false); setOpen(x) }} label="Semua baris" tall /></> })()}
      </Modal>
      <Modal wide open={!!open} title={open ? `Rincian · ${open.name}` : ''} onClose={() => setOpen(null)}>{open && <RemunDetail x={open} />}</Modal>
      {t}
    </>
  )
}

// ---------- Kategori karyawan (Setup Aktivitas › Kategori) — muncul di setiap "Pilih Karyawan" ----------
export const empGroups = (s) => [
  { id: 'g:L', name: 'Laki-laki', locked: true, source: 'Jenis kelamin', members: s.employees.filter((e) => e.kelamin === 'Laki-laki').map((e) => e.id) },
  { id: 'g:P', name: 'Perempuan', locked: true, source: 'Jenis kelamin', members: s.employees.filter((e) => e.kelamin === 'Perempuan').map((e) => e.id) },
  ...(s.org?.divisi || []).map((d) => ({ id: 'd:' + d.id, name: 'Divisi ' + d.name, locked: true, source: 'Organisasi', members: [...new Set(s.org.nodes.filter((n) => n.divisi === d.id && n.emp).map((n) => n.emp))] })),
  ...s.empCategories.map((c) => ({ id: 'c:' + c.id, name: c.name, source: 'Manual', branch: c.branch || '', members: c.members })),
]
export const matchEmp = (s, sel, empId) => !sel || (sel.startsWith('e:') ? sel.slice(2) === empId : (empGroups(s).find((g) => g.id === sel)?.members || []).includes(empId))
export const PilihKaryawan = ({ value, onChange, label = 'Pilih Karyawan', all = 'Semua karyawan', only }) => {
  const s = useStore(); const list = s.employees.filter((e) => !only || only(e))
  return (
    <label className="fsel"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{all}</option>
      <optgroup label="Kategori">{empGroups(s).map((g) => <option key={g.id} value={g.id}>{g.name} ({g.members.length})</option>)}</optgroup>
      <optgroup label="Karyawan">{list.map((e) => <option key={e.id} value={'e:' + e.id}>{e.name}</option>)}</optgroup>
    </select></label>
  )
}

// ---------- Kategori cuti: tab dihitung dari tanggal ----------
export const cutiTab = (lt, now = new Date()) => {
  const start = new Date(lt.mulai || `${lt.durasi}-01-01`); const end = new Date(`${lt.durasi}-12-31T23:59:59`)
  if (start > now) return 'Plan'
  if (now <= end) return 'Active'
  const carryEnd = new Date(end); carryEnd.setMonth(carryEnd.getMonth() + (Number(lt.carry) || 0))
  return Number(lt.carry) > 0 && now <= carryEnd ? 'Carry Over' : 'Inactive'
}
export const aktifCuti = (s, empId) => s.leaveTypes.filter((lt) => cutiTab(lt) === 'Active' && (!empId || matchEmp(s, lt.penerima, empId)))

// ---------- Filter + Download (Excel/PDF) per Branch, Tahun, Bulan ----------

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const plain = (v) => (v == null ? '' : typeof v === 'object' ? '' : String(v))

// rows: data mentah; dateOf(r) -> 'YYYY-MM-DD'; branchOf(r) -> id branch; cols: [{h, v:(r)=>teks}]
export function useExport({ title, rows, dateOf, branchOf, cols, empOf = (r) => r.emp }) {
  const s = useStore()
  const [b, setB] = useState(''); const [y, setY] = useState(''); const [m, setM] = useState(''); const [k, setK] = useState('')
  const [t, toast] = useToast()
  const years = [...new Set(rows.map((r) => (dateOf(r) || '').slice(0, 4)).filter((x) => /^\d{4}$/.test(x)))].sort()
  const filtered = rows.filter((r) => { const d = dateOf(r) || ''; return (!b || branchOf(r) === b) && (!y || d.slice(0, 4) === y) && (!m || d.slice(5, 7) === m) && matchEmp(s, k, empOf(r)) })
  const run = (kind) => {
    if (!filtered.length) { toast('Tidak ada data untuk filter ini'); return }
    const bn = b ? s.branches.find((x) => x.id === b)?.name : 'Semua Branch'
    const meta = `Branch: ${bn} | Tahun: ${y || 'Semua'} | Bulan: ${m ? BULAN[Number(m) - 1] : 'Semua'} | ${filtered.length} baris`
    const payload = { title: title + ' - Kirana HRIS', meta, cols: cols.map((c) => c.h), rows: filtered.map((r) => cols.map((c) => plain(c.v(r)))), file: `${title.toLowerCase().replace(/\s+/g, '-')}_${b || 'semua-branch'}_${y || 'semua-tahun'}${m ? '-' + m : ''}` }
    try { kind === 'xls' ? exportExcel(payload) : exportPdf(payload); toast(`${filtered.length} baris diunduh sebagai ${kind === 'xls' ? 'Excel' : 'PDF'}`) } catch (e) { toast('Unduhan diblokir di pratinjau ini') }
  }
  const bar = (
    <div className="filters export-bar">
      <label className="fsel"><span>Branch</span><select value={b} onChange={(e) => setB(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="fsel"><span>Tahun</span><select value={y} onChange={(e) => setY(e.target.value)}><option value="">Semua tahun</option>{years.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className="fsel"><span>Bulan</span><select value={m} onChange={(e) => setM(e.target.value)}><option value="">Semua bulan</option>{BULAN.map((x, i) => <option key={x} value={String(i + 1).padStart(2, '0')}>{x}</option>)}</select></label>
      <PilihKaryawan value={k} onChange={setK} />
      <div className="export-btns"><Btn kind="ghost" icon="download" onClick={() => run('xls')}>Download Excel</Btn><Btn icon="download" onClick={() => run('pdf')}>Download PDF</Btn></div>
      {t}
    </div>
  )
  return { filtered, bar }
}

// ---------- Bio talent (detail saat nama diklik) — kolom mengikuti Figma "Bio" ----------
// Data contoh dibentuk dari nama (fiktif); di produksi dibaca dari profil talent di Firestore.
export function bioOf(p) {
  const n = p.name || ''; const h = [...n].reduce((a, c) => a + c.charCodeAt(0), 0)
  const pick = (arr, k = 0) => arr[(h + k) % arr.length]
  const first = n.split(' ')[0].toLowerCase()
  const skor = p.skor ?? null
  const kota = pick(['Jakarta', 'Bandung', 'Surabaya', 'Yogyakarta', 'Semarang'])
  return {
    nama: n, tempat: kota, lahir: `${1 + (h % 27)} ${pick(['Jan', 'Mar', 'Jun', 'Sep', 'Nov'], 2)} ${1992 + (h % 9)}`,
    email: `${first}.${(n.split(' ')[1] || 'talent').toLowerCase()}@contoh.id`, linkedin: `https://linkedin.com/in/${first}-contoh`,
    hp: `0812-55${String(h % 100).padStart(2, '0')}-0${100 + (h % 800)}`,
    darurat: { nama: pick(['Sri Hartati', 'Budi Santosa', 'Marni Wulandari', 'Agus Setiawan']), hubungan: pick(['Orang tua', 'Saudara', 'Pasangan'], 1), hp: `0813-55${String((h * 3) % 100).padStart(2, '0')}-0${100 + ((h * 7) % 800)}` },
    kelamin: p.kelamin || pick(['Perempuan', 'Laki-laki']), nikah: pick(['Belum Menikah', 'Menikah'], 3),
    domisili: `Jl. Contoh No. ${1 + (h % 90)}, ${kota}`, ktp: `Jl. Kenangan No. ${1 + ((h * 2) % 90)}, ${pick(['Bogor', 'Malang', 'Solo', 'Cirebon'], 1)}`,
    ptkp: pick(['TK/0', 'K/0', 'K/1']), nik: `3174••••••••${String(1000 + (h % 9000))}`, npwp: h % 3 ? `••.•••.•••.•-${100 + (h % 800)}.000` : '—',
    bpjskes: h % 2 ? `000••••••${1000 + (h % 9000)}` : '—', bpjstk: h % 2 ? `••••••${1000 + ((h * 5) % 9000)}` : '—',
    rek: `••••••${1000 + ((h * 11) % 9000)}`, rekNama: n, posisi: p.spesialisasi || p.role || '—', ekspektasi: p.ekspektasi || p.thp || 0,
    psikotes: pick(['DISC - Influence', 'DISC - Steadiness', 'DISC - Dominance', 'DISC - Compliance']), wawancara: skor == null ? '—' : pick(['A', 'A+', 'B+']), kompetensi: skor == null ? 'Belum dinilai' : `${skor}/100`,
    // periode pakai tanggal (YYYY-MM-DD) supaya bisa diurutkan terbaru → terlama; selesai kosong = masih berlangsung
    pengalaman: [
      { posisi: p.spesialisasi || p.role || 'Staff', perusahaan: pick(['PT Contoh Nusantara', 'PT Karya Digital', 'CV Maju Bersama']), tipe: 'Full Time', mulai: `${2021 + (h % 2)}-0${1 + (h % 6)}-01`, selesai: `${2024 + (h % 2)}-1${h % 3}-15`, lokasi: kota },
      { posisi: 'Staf Magang', perusahaan: pick(['PT Sinar Contoh', 'CV Kreasi Muda', 'PT Mitra Data'], 1), tipe: 'Magang', mulai: `${2019 + (h % 2)}-07-01`, selesai: `${2019 + (h % 2)}-12-31`, lokasi: kota },
    ],
    pendidikan: [
      { institusi: pick(['Universitas Contoh', 'Politeknik Nusantara', 'Institut Teknologi Contoh']), jenjang: p.pendidikan || 'S1', jurusan: pick(['Informatika', 'Manajemen', 'Komunikasi', 'Akuntansi'], 2), mulai: `${2014 + (h % 4)}-08-15`, selesai: `${2018 + (h % 4)}-08-30`, ipk: (3 + (h % 90) / 100).toFixed(2) },
      { institusi: pick(['SMA Negeri 1 Contoh', 'SMK Nusantara', 'SMA Harapan Bangsa'], 1), jenjang: 'SMA/SMK', jurusan: pick(['IPA', 'IPS', 'Rekayasa Perangkat Lunak'], 3), mulai: `${2011 + (h % 4)}-07-15`, selesai: `${2014 + (h % 4)}-06-10`, ipk: '' },
    ],
    sertifikat: [
      { nama: pick(['TOEFL ITP', 'Sertifikat BNSP', 'Google Data Analytics']), lembaga: pick(['Lembaga Bahasa', 'BNSP', 'Coursera']), skor: pick(['550', 'Kompeten', 'Lulus']), tanggal: `${2023 + (h % 3)}-0${1 + (h % 9)}-12` },
      { nama: pick(['Microsoft Excel Expert', 'Public Speaking', 'K3 Umum'], 2), lembaga: pick(['Microsoft', 'Dale Carnegie', 'Kemnaker'], 2), skor: 'Lulus', tanggal: `${2020 + (h % 3)}-1${h % 3}-05` },
    ],
    modul: skor == null ? [] : [
      { nama: 'Wawancara Mandiri', durasi: '00:35:42', jenis: 'Upload dokumen (video)', skor: Math.min(10, (skor / 10) - 0.5).toFixed(1) },
      { nama: 'Tes Potensi Akademik', durasi: '00:10:27', jenis: 'Pilihan ganda', skor: Math.min(10, skor / 10).toFixed(1) },
      { nama: 'Tes Kompetensi', durasi: '00:15:23', jenis: 'Essay', skor: Math.min(10, (skor / 10) + 0.4).toFixed(1) },
    ],
    berkas: [['CV', true], ['Pas Foto 4x6', true], ['KTP', h % 2 === 0], ['Kartu Keluarga', h % 3 === 0], ['NPWP', h % 3 !== 0], ['BPJSKES & TK', h % 2 === 1]],
  }
}


// Daftar memanjang (seperti berkas lampiran) untuk Pendidikan, Pengalaman kerja, Sertifikat — bisa diubah talent
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const tglPendek = (d) => { if (!d) return ''; const [y, m, t] = d.split('-'); return `${+t} ${BLN[+m - 1]} ${y}` }
const blnThn = (d) => { if (!d) return ''; const [y, m] = d.split('-'); return `${BLN[+m - 1]} ${y}` }
const periodeTxt = (x, now) => x.mulai ? `${blnThn(x.mulai)} – ${x.selesai ? blnThn(x.selesai) : now}` : (x.periode || '')
// terbaru di atas: yang masih berlangsung dulu, lalu tanggal selesai/terbit terbaru, lalu tanggal mulai terbaru
const sortKey = (x) => [x.mulai && !x.selesai ? '9999-12-31' : (x.selesai || x.tanggal || ''), x.mulai || '']
export const sortTerbaru = (items) => items.map((x, i) => ({ x, i })).sort((a, b) => { const ka = sortKey(a.x), kb = sortKey(b.x); return kb[0].localeCompare(ka[0]) || kb[1].localeCompare(ka[1]) })
// field: [key, label, wajib, opsi, placeholder, tipe]
const LIST_SECTIONS = [
  { k: 'pendidikan', title: 'Pendidikan', icon: 'test', range: true, ongoingLabel: 'Masih berlangsung', now: 'Sekarang', fields: [['institusi', 'Institusi', true], ['jenjang', 'Jenjang', true, ['SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3']], ['jurusan', 'Jurusan', true], ['ipk', 'IPK / nilai', false]], title1: (x) => x.institusi, sub: (x) => [x.jenjang, x.jurusan, x.ipk && 'IPK ' + x.ipk].filter(Boolean).join(' · ') },
  { k: 'pengalaman', title: 'Pengalaman kerja', icon: 'briefcase', range: true, ongoingLabel: 'Masih bekerja di sini', now: 'Sekarang', fields: [['posisi', 'Posisi', true], ['perusahaan', 'Perusahaan', true], ['tipe', 'Tipe', false, ['Full Time', 'Part Time', 'Kontrak', 'Magang', 'Freelance']], ['lokasi', 'Lokasi', false]], title1: (x) => x.posisi, sub: (x) => [x.perusahaan, x.tipe, x.lokasi].filter(Boolean).join(' · ') },
  { k: 'sertifikat', title: 'Sertifikat', icon: 'checkCircle', fields: [['nama', 'Nama sertifikat', true], ['lembaga', 'Lembaga', true], ['skor', 'Skor / hasil', false], ['tanggal', 'Tanggal terbit', true, null, '', 'date']], title1: (x) => x.nama, sub: (x) => [x.lembaga, x.skor && 'Skor ' + x.skor].filter(Boolean).join(' · ') },
]
const sideTxt = (sec, x) => sec.range ? periodeTxt(x, sec.now) : (x.tanggal ? tglPendek(x.tanggal) : (x.tahun || ''))
function formErrors(sec, d) {
  const e = {}
  sec.fields.forEach(([k, l, req]) => { if (req && !String(d[k] || '').trim()) e[k] = l + ' wajib diisi' })
  const today = new Date().toISOString().slice(0, 10)
  if (sec.range) {
    if (!d.mulai) e.mulai = 'Tanggal mulai wajib diisi'
    else if (d.mulai > today) e.mulai = 'Tanggal mulai tidak boleh setelah hari ini'
    if (!d.ongoing) {
      if (!d.selesai) e.selesai = 'Isi tanggal selesai atau centang "' + sec.ongoingLabel + '"'
      else if (d.mulai && d.selesai < d.mulai) e.selesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai'
    }
  }
  if (sec.k === 'sertifikat' && d.tanggal && d.tanggal > today) e.tanggal = 'Tanggal terbit tidak boleh setelah hari ini'
  return e
}
function BioList({ sec, items, editable, onSave }) {
  const [form, setForm] = useState(null); const [del, setDel] = useState(null); const [tried, setTried] = useState(false)
  const errs = form ? formErrors(sec, form.data) : {}
  const nErr = Object.keys(errs).length
  const sorted = sortTerbaru(items)
  const set = (k, v) => setForm({ ...form, data: { ...form.data, [k]: v } })
  const open = (i, x) => { setTried(false); setForm({ i, data: x ? { ...x, ongoing: !!(x.mulai && !x.selesai) } : {} }) }
  const save = () => {
    setTried(true); if (nErr) return
    const { ongoing, periode, tahun, ...d } = form.data; if (sec.range && ongoing) d.selesai = ''
    const n = [...items]; if (form.i < 0) n.push(d); else n[form.i] = d
    onSave(sortTerbaru(n).map((r) => r.x), `${sec.title} tersimpan`); setForm(null)
  }
  const today = new Date().toISOString().slice(0, 10)
  return (
    <section className="card pf-card pf-files pf-list">
      <header className="pf-card-h"><span className="pf-ic"><Icon name={sec.icon} size={18} /></span><h3>{sec.title}</h3><span className="muted sm">{items.length} data · terbaru di atas</span>
        {editable && <Btn kind="ghost" icon="plus" onClick={() => open(-1)}>Tambah</Btn>}</header>
      {items.length === 0 ? <p className="muted li-empty">Belum ada {sec.title.toLowerCase()}.</p> : <div className="li-rows">{sorted.map(({ x, i }) => (
        <div key={i} className="li-row"><span className="li-ic"><Icon name={sec.icon} size={18} /></span>
          <div className="grow"><strong>{sec.title1(x)}</strong><small className="muted">{sec.sub(x)}</small></div>
          <span className="li-side">{sideTxt(sec, x)}{sec.range && x.mulai && !x.selesai && <em className="li-now">Berlangsung</em>}</span>
          {editable && <span className="li-act"><button className="icon-btn" aria-label={`Ubah ${sec.title1(x)}`} onClick={() => open(i, x)}><Icon name="edit" size={16} /></button><button className="icon-btn danger" aria-label={`Hapus ${sec.title1(x)}`} onClick={() => setDel(i)}><Icon name="trash" size={16} /></button></span>}
        </div>))}</div>}
      <Modal open={!!form} title={form ? (form.i < 0 ? 'Tambah ' : 'Ubah ') + sec.title.toLowerCase() : ''} onClose={() => setForm(null)} footer={<><Btn kind="ghost" onClick={() => setForm(null)}>Batal</Btn><Btn onClick={save}>Simpan</Btn></>}>
        {form && <div className="form two">
          {sec.fields.map(([k, l, req, opts, ph, type]) => <Field key={k} label={l + (req ? '' : ' (opsional)')}>{opts ? <select value={form.data[k] || ''} aria-invalid={tried && !!errs[k]} onChange={(e) => set(k, e.target.value)}><option value="">Pilih</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>
            : <input type={type || 'text'} max={type === 'date' ? today : undefined} value={form.data[k] || ''} placeholder={ph || ''} aria-invalid={tried && !!errs[k]} onChange={(e) => set(k, e.target.value)} />}{tried && errs[k] && <span className="err-t">{errs[k]}</span>}</Field>)}
          {sec.range && <>
            <Field label="Tanggal mulai"><input type="date" max={today} value={form.data.mulai || ''} aria-invalid={tried && !!errs.mulai} onChange={(e) => set('mulai', e.target.value)} />{tried && errs.mulai && <span className="err-t">{errs.mulai}</span>}</Field>
            <Field label="Tanggal selesai"><input type="date" min={form.data.mulai || undefined} disabled={!!form.data.ongoing} value={form.data.ongoing ? '' : (form.data.selesai || '')} aria-invalid={tried && !!errs.selesai} onChange={(e) => set('selesai', e.target.value)} />{tried && errs.selesai && <span className="err-t">{errs.selesai}</span>}</Field>
            <label className="chk-l span2"><input type="checkbox" className="chk" checked={!!form.data.ongoing} onChange={(e) => setForm({ ...form, data: { ...form.data, ongoing: e.target.checked, selesai: e.target.checked ? '' : form.data.selesai } })} />{sec.ongoingLabel}</label>
          </>}
          {form.data.periode && !form.data.mulai && <p className="note-s span2" style={{ margin: 0 }}>Data lama: “{form.data.periode}”. Isi ulang dengan tanggal supaya urutannya tepat.</p>}
        </div>}
        {tried && nErr > 0 && <span className="err-t" style={{ margin: 0 }}>Masih ada {nErr} isian yang perlu diperbaiki.</span>}
      </Modal>
      <Modal open={del != null} title={`Hapus ${sec.title.toLowerCase()}?`} onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn><Btn onClick={() => { onSave(items.filter((_, j) => j !== del), `${sec.title} dihapus`); setDel(null) }}>Hapus</Btn></>}><p style={{ margin: 0 }}><b>{del != null && items[del] ? sec.title1(items[del]) : ''}</b> akan dihapus dari biodatamu.</p></Modal>
    </section>
  )
}

const Ro = ({ l, v, opt }) => <div className="ro"><span className="ro-l">{l}{opt && <em> (opsional)</em>}</span><span className="ro-v">{v || '—'}</span></div>

// Detail talent/karyawan: kepala profil + kartu putih 2 kolom, tiap kartu berisi jumlah isian genap, berkas di bawah.
// editable = dipakai talent di menu Biodata & Berkas (bisa ubah isian & unggah berkas).
export function TalentBio({ person, backLabel, onBack, crumb, editable = false }) {
  const s = useStore(); const [t, toast] = useToast(); const [mod, setMod] = useState(null); const [edit, setEdit] = useState(''); const [draft, setDraft] = useState({})
  if (!person) return <div className="empty"><p>Data tidak ditemukan.</p><Btn kind="ghost" icon="back" onClick={onBack}>Kembali</Btn></div>
  const b = { ...bioOf(person), ...(s.bioEdits?.[person.id] || {}) }
  const isEmp = !!person.branch
  const br = isEmp ? s.branches.find((x) => x.id === person.branch)?.name : null
  const avg = b.modul.length ? (b.modul.reduce((a, m) => a + Number(m.skor), 0) / b.modul.length).toFixed(1) : null
  const groups = [
    { id: 'diri', title: 'Data diri', icon: 'user', rows: [['Jenis kelamin', 'kelamin'], ['Tempat, tanggal lahir', 'ttl', `${b.tempat}, ${b.lahir}`], ['Status pernikahan', 'nikah'], ['NIK', 'nik'], ['Alamat domisili', 'domisili'], ['Alamat KTP', 'ktp']] },
    { id: 'kontak', title: 'Kontak', icon: 'mail', rows: [['E-mail', 'email'], ['No. handphone', 'hp'], ['LinkedIn', 'linkedin'], ['Kontak darurat', 'darNama', b.darurat.nama], ['Hubungan', 'darHub', b.darurat.hubungan], ['No. HP darurat', 'darHp', b.darurat.hp]] },
    isEmp
      ? { id: 'kerja', title: 'Pekerjaan', icon: 'briefcase', rows: [['Posisi', 'role', person.role], ['Branch', 'branch', br], ['Divisi', 'divisi', person.divisi || '—'], ['Tipe karyawan', 'type', person.type], ['Tanggal masuk', 'start', fmtDate(person.start)], ['Tanggal akhir kontrak', 'end', fmtDate(person.end)]], lock: true }
      : { id: 'kerja', title: 'Lamaran', icon: 'briefcase', rows: [['Melamar posisi', 'posisi'], ['Ekspektasi gaji', 'eks', b.ekspektasi ? rupiah(b.ekspektasi) : '—'], ['Spesialisasi', 'spes', person.spesialisasi], ['Pengalaman', 'peng', person.pengalaman], ['Pendidikan terakhir', 'pend', person.pendidikan], ['Mitra', 'mitra', person.mitra]], lock: true },
    { id: 'bank', title: 'Pajak & rekening', icon: 'wallet', rows: [['Status PTKP', 'ptkp'], ['NPWP', 'npwp'], ['BPJS Kesehatan', 'bpjskes'], ['BPJS Ketenagakerjaan', 'bpjstk'], ['No. rekening', 'rek'], ['Nama rekening', 'rekNama']] },
  ]
  const val = (r) => (r[2] !== undefined ? r[2] : b[r[1]])
  const save = (g) => { api.saveBio(person.id, draft); setEdit(''); toast(`${g.title} tersimpan`) }
  return (
    <>
      {onBack && <nav className="crumb" aria-label="Breadcrumb"><button onClick={onBack}>{crumb || backLabel}</button><span>›</span><b>{person.name}</b></nav>}
      <section className="pf-head card">
        <Avatar name={person.name} size={88} />
        <div className="grow"><h2>{b.nama}</h2><p className="muted">{isEmp ? `${person.role} · ${br}` : `${person.spesialisasi} · Talent Pool`}</p>
          <div className="chips"><Badge>{person.status || 'Aktif'}</Badge>{isEmp && <Badge t="neutral">{person.type}</Badge>}<Badge t="neutral">{b.email}</Badge></div></div>
        {editable && <p className="muted sm pf-hint">Pendidikan, pengalaman kerja, sertifikat, dan sebagian data diri bisa kamu ubah sendiri. Isian bergembok diatur HR.</p>}
      </section>
      <div className="pf-grid">{groups.map((g) => (
        <section key={g.id} className="card pf-card">
          <header className="pf-card-h"><span className="pf-ic"><Icon name={g.icon} size={18} /></span><h3>{g.title}</h3>
            {editable && (g.lock ? <span className="pf-lock" title="Diatur HR"><Icon name="lock" size={14} /></span>
              : edit === g.id ? <span className="pf-act"><Btn kind="ghost" onClick={() => setEdit('')}>Batal</Btn><Btn onClick={() => save(g)}>Simpan</Btn></span>
                : <Btn kind="ghost" icon="edit" onClick={() => { setEdit(g.id); setDraft(Object.fromEntries(g.rows.map((r) => [r[1], val(r)]))) }}>Ubah</Btn>)}</header>
          <dl className="pf-dl">{g.rows.map((r) => <div key={r[0]}><dt>{r[0]}</dt><dd>{edit === g.id ? <input aria-label={r[0]} value={draft[r[1]] ?? ''} onChange={(e) => setDraft({ ...draft, [r[1]]: e.target.value })} /> : (val(r) || '—')}</dd></div>)}</dl>
          {g.extra && b.modul.length > 0 && <div className="pf-mods">{b.modul.map((m) => <button key={m.nama} type="button" onClick={() => setMod(m)}><span>{m.nama}</span><b>{m.skor}</b></button>)}</div>}
        </section>))}</div>
      {LIST_SECTIONS.map((sec) => <BioList key={sec.k} sec={sec} items={b[sec.k] || []} editable={editable} onSave={(items, msg) => { api.saveBio(person.id, { [sec.k]: items }); toast(msg) }} />)}
      <section className="card pf-card pf-files pf-list">
        <header className="pf-card-h"><span className="pf-ic"><Icon name="star" size={18} /></span><h3>Hasil tes</h3><span className="muted sm">Average score {avg || '—'}</span>{editable && <span className="pf-lock" title="Diatur HR"><Icon name="lock" size={14} /></span>}</header>
        <div className="li-rows">
          {[['Psikotes', b.psikotes, 'Hasil tes kepribadian'], ['Wawancara mandiri', b.wawancara, 'Nilai rekaman self interview'], ['Tes kompetensi', b.kompetensi, 'Nilai tes sesuai spesialisasi']].map(([l, v, d]) => <div key={l} className="li-row"><span className="li-ic"><Icon name="test" size={18} /></span><div className="grow"><strong>{l}</strong><small className="muted">{d}</small></div><b className="li-val">{v || '—'}</b></div>)}
          {b.modul.map((m) => <div key={m.nama} className="li-row"><span className="li-ic"><Icon name="doc" size={18} /></span><div className="grow"><strong>{m.nama}</strong><small className="muted">{m.jenis} · durasi {m.durasi}</small></div><b className="li-val">{m.skor}</b><Btn kind="ghost" icon="eye" onClick={() => setMod(m)}>Detail</Btn></div>)}
        </div>
      </section>
      <section className="card pf-card pf-files">
        <header className="pf-card-h"><span className="pf-ic"><Icon name="doc" size={18} /></span><h3>Berkas lampiran</h3><span className="muted sm">{b.berkas.filter((x) => x[1]).length}/{b.berkas.length} terunggah · maks 3 MB per berkas</span></header>
        <div className="berkas">{b.berkas.map(([nama, ada]) => (
          <div key={nama} className={`bk ${ada ? '' : 'kosong'}`}><Icon name="doc" size={26} /><strong>{nama}</strong><small>{ada ? 'Terunggah' : 'Belum diunggah'}</small>
            <div className="bk-act">{ada && <Btn kind="ghost" icon="eye" onClick={() => toast(`Pratinjau ${nama} belum tersedia di prototipe`)}>Lihat</Btn>}
              {editable && <label className="btn btn-ghost up-btn"><Icon name="upload" size={16} />{ada ? 'Ganti' : 'Unggah'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label={'Unggah ' + nama} onChange={(e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 3 * 1024 * 1024) return toast('Ukuran maksimal 3 MB'); toast(nama + ' terunggah') }} /></label>}</div></div>))}</div>
      </section>
      <Modal open={!!mod} title={mod ? 'Detail · ' + mod.nama : ''} onClose={() => setMod(null)} footer={<Btn kind="ghost" onClick={() => setMod(null)}>Tutup</Btn>}>
        {mod && <dl className="dl"><dt>Jenis modul</dt><dd>{mod.jenis}</dd><dt>Durasi pengerjaan</dt><dd>{mod.durasi}</dd><dt>Skor</dt><dd>{mod.skor}</dd></dl>}
      </Modal>{t}
    </>
  )
}
