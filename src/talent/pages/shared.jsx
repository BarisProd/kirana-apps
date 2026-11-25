import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { calcRow, rupiah, totals, parsePeriod } from '../services/payroll.js'
import { Badge, Table, Icon, Btn, Modal, Avatar, useToast, Field } from '../components/ui.jsx'
import { exportExcel, exportPdf } from '../services/export.js'

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

export function RemunSummary({ remun }) {
  const s = useStore()
  const { emp } = useLookup()
  const rows = remun.rows.map((r) => ({ ...r, c: calcRow(r, s.setup) }))
  const total = rows.reduce((t, r) => t + r.c.tani, 0)
  const sisa = totals(remun.rows.map((r) => ({ ...r, type: r.type || emp(r.emp).type, start: r.start || emp(r.emp).start, end: r.end || emp(r.emp).end })), parsePeriod(remun.bulan), s.setup).sisa
  return (
    <>
      <Table cols={[
        { h: 'Karyawan', r: (r) => <div><strong>{emp(r.emp).name}</strong><div className="muted sm">{emp(r.emp).role}</div></div> },
        { h: 'Jenis', r: (r) => <Badge t="neutral">{r.jenis}</Badge> },
        { h: 'THP', right: true, r: (r) => rupiah(r.c.thp) },
        { h: 'Tambahan', right: true, r: (r) => rupiah(r.c.add) },
        { h: 'Potongan', right: true, r: (r) => rupiah(r.c.ded + (r.skema === 'Khusus' ? 0 : r.c.empTotal)) },
        { h: 'Net dibayar', right: true, r: (r) => <strong>{rupiah(r.c.net)}</strong> },
        { h: 'TANI', right: true, r: (r) => rupiah(r.c.tani) },
      ]} rows={rows} />
      <div className="budget">
        <div><small>Total Bulan Ini (Σ TANI)</small><strong>{rupiah(total)}</strong></div>
        <div><small>Sisa Kontrak (estimasi)</small><strong>{rupiah(sisa)}</strong></div>
        <p className="muted sm">Rumus sama dengan simulasi Branch (diturunkan dari file Scala).</p>
      </div>
    </>
  )
}

// ---------- Kategori karyawan (Setup Aktivitas › Kategori) — muncul di setiap "Pilih Karyawan" ----------
// Kategori karyawan: bawaan (jenis kelamin), otomatis dari Divisi di Organisasi, lalu buatan admin
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
