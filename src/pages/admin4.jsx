// Pengaturan Cuti / Lembur / Reimbursement mengikuti Figma admin STA (ver 2.0) + audit Scala live.
import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { rupiah } from '../services/payroll.js'
import { exportExcel } from '../services/export.js'
import { Btn, Card, Badge, Stat, Table, Modal, Field, Tabs, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { useLookup, fmtDate, empGroups, cutiTab, matchEmp } from './shared.jsx'

// Saat ditampilkan di dalam Setup Aktivitas (embedded), judul halaman diganti judul bagian dan breadcrumb disembunyikan
const Head = ({ embedded, title, sub, children }) => (embedded ? <div className="sub-head"><div><h2>{title}</h2>{sub && <p className="muted">{sub}</p>}</div>{children && <div className="sub-head-act">{children}</div>}</div> : <PageHead title={title} sub={sub}>{children}</PageHead>)
const Crumb = ({ items }) => <nav className="crumb" aria-label="Breadcrumb">{items.map((x, i) => (i < items.length - 1 ? <React.Fragment key={i}><button onClick={x[1]}>{x[0]}</button><span>›</span></React.Fragment> : <b key={i}>{x[0]}</b>))}</nav>
const Confirm = ({ open, text, onNo, onYes, yes = 'Yakin' }) => (
  <Modal open={!!open} title="Konfirmasi" onClose={onNo} footer={<><Btn kind="ghost" onClick={onNo}>Batal</Btn><Btn onClick={onYes}>{yes}</Btn></>}><div className="center"><span className="q-ic">?</span><p>{text}</p></div></Modal>
)
const Num = ({ value, onChange, suffix, ...p }) => <span className="num"><input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))} {...p} />{suffix && <em>{suffix}</em>}</span>
const penerimaLabel = (s, v) => (!v ? 'Semua Karyawan' : v.startsWith('e:') ? s.employees.find((e) => e.id === v.slice(2))?.name : empGroups(s).find((g) => g.id === v)?.name) || 'Semua Karyawan'
const Penerima = ({ value, onChange, label }) => {
  const s = useStore()
  return <Field label={label} hint="Pilih semua karyawan, satu kategori (mis. Perempuan), atau satu nama."><select value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">Semua Karyawan</option>
    <optgroup label="Kategori">{empGroups(s).map((g) => <option key={g.id} value={g.id}>{g.name} ({g.members.length})</option>)}</optgroup>
    <optgroup label="Karyawan">{s.employees.map((e) => <option key={e.id} value={'e:' + e.id}>{e.name}</option>)}</optgroup>
  </select></Field>
}
const Aturan = ({ file, onChange, title }) => (
  <Card title={title}><div className="batch-row">
    {file ? <span className="file-chip"><Icon name="doc" size={18} />{file}</span> : <span className="muted">Belum ada file aturan.</span>}
    {file && <button className="icon-btn" title="Hapus file" aria-label="Hapus file aturan" onClick={() => onChange('')}><Icon name="trash" size={18} /></button>}
    <span className="grow" />
    <span className="upl btnlike"><Icon name="upload" size={18} /><span>{file ? 'Change' : 'Upload'} (PDF)</span><input type="file" accept=".pdf" aria-label={title} onChange={(e) => e.target.files[0] && onChange(e.target.files[0].name)} /></span>
  </div></Card>
)

// =================== CUTI ===================
const CUTI_BLANK = { id: null, kelompok: 'Cuti', bukti: '', tanpaKuota: false, name: '', kuota: '', maksBerturut: '', durasi: '', carry: '', pakai: 'bulanan', aktifMode: 'langsung', aktifSetelah: '', penerima: '', mulai: '' }
export function PengaturanCuti({ go, embedded }) {
  const s = useStore(); const [t, toast] = useToast(); const [tab, setTab] = useState('Active')
  const [f, setF] = useState(null); const [del, setDel] = useState(null); const [dup, setDup] = useState(null)
  const [ten, setTen] = useState(s.leaveTenure)
  const yearNow = new Date().getFullYear(); const years = Array.from({ length: 9 }, (_, i) => yearNow - 1 + i)
  const rows = s.leaveTypes.filter((lt) => cutiTab(lt) === tab)
  const editable = tab === 'Plan' || tab === 'Active'
  const set = (k, v) => setF({ ...f, [k]: v })
  const valid = f && f.name.trim() && (f.tanpaKuota || Number(f.kuota) > 0) && f.durasi && f.mulai && (f.aktifMode === 'langsung' || Number(f.aktifSetelah) > 0)
  const save = () => {
    api.saveType('leaveTypes', f.id, { kelompok: f.kelompok, bukti: f.bukti.trim(), tanpaKuota: !!f.tanpaKuota, name: f.name.trim(), kuota: f.tanpaKuota ? 0 : Number(f.kuota), maksBerturut: Number(f.maksBerturut) || 0, durasi: Number(f.durasi), carry: Number(f.carry) || 0, pakai: f.pakai, aktifSetelah: f.aktifMode === 'langsung' ? 0 : Number(f.aktifSetelah), penerima: f.penerima, mulai: f.mulai })
    setF(null); toast('Kategori cuti tersimpan')
  }
  return (
    <>
      {!embedded && <Crumb items={[['Cuti', () => go('cuti')], ['Pengaturan Cuti']]} />}
      <Head embedded={embedded} title="Pengaturan Cuti" sub="Kategori cuti & kuota hari cuti. Tab ditentukan otomatis dari tanggal pengaktifan, durasi aktif, dan carry over." />
      <Card title="Kategori Cuti & Izin">
        <Tabs tabs={['Plan', 'Active', 'Carry Over', 'Inactive']} value={tab} onChange={setTab} />
        <div className="type-list">{rows.length ? rows.map((lt) => (
          <div key={lt.id} className="type-row">
            <strong className="grow">{lt.name}</strong><span className="kpill">{lt.kuota} Hari</span><span className="muted">{fmtDate(lt.mulai)}</span>
            <span className="muted sm">{penerimaLabel(s, lt.penerima)}</span>
            <div className="row-act">
              {editable && <button className="icon-btn" title="Edit" aria-label={'Edit ' + lt.name} onClick={() => setF({ ...CUTI_BLANK, ...lt, kelompok: lt.kelompok || 'Cuti', bukti: lt.bukti || '', kuota: String(lt.kuota), maksBerturut: String(lt.maksBerturut || ''), carry: String(lt.carry || ''), aktifMode: lt.aktifSetelah ? 'setelah' : 'langsung', aktifSetelah: String(lt.aktifSetelah || '') })}><Icon name="edit" size={18} /></button>}
              {editable && <button className="icon-btn" title="Hapus" aria-label={'Hapus ' + lt.name} onClick={() => setDel(lt)}><Icon name="trash" size={18} /></button>}
              <button className="icon-btn" title="Salin" aria-label={'Salin ' + lt.name} onClick={() => setDup(lt)}><Icon name="layers" size={18} /></button>
            </div>
          </div>)) : <Empty text={`Belum ada kategori cuti di tab ${tab}.`} />}</div>
        <Btn kind="ghost" icon="plus" onClick={() => setF({ ...CUTI_BLANK, durasi: yearNow })}>Tambahkan Kategori</Btn>
        <p className="muted sm mt">Plan = belum mulai · Active = sedang berlaku · Carry Over = tahun sudah lewat tetapi sisa kuota masih boleh dipakai · Inactive = sudah hangus. Kategori Carry Over & Inactive hanya bisa disalin.</p>
      </Card>
      <Card title="Cuti Berdasarkan Lama Bekerja (Tenure-Based Leave)">
        <p className="muted">Menetapkan kuota cuti tambahan berdasarkan masa kerja karyawan.</p>
        <div className="form two">
          <Field label="Masa Kerja"><select value={ten.masa} onChange={(e) => setTen({ ...ten, masa: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 8, 10].map((y) => <option key={y} value={y}>&gt; {y} Tahun</option>)}</select></Field>
          <Field label="Tambahan Cuti Tahunan"><select value={ten.tambahan} onChange={(e) => setTen({ ...ten, tambahan: Number(e.target.value) })}>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((d) => <option key={d} value={d}>{d} Hari</option>)}</select></Field>
        </div>
      </Card>
      <Aturan title="Aturan dan Kebijakan Penggunaan Cuti" file={s.leavePolicy} onChange={(v) => { api.setKey('leavePolicy', v); toast(v ? 'File aturan diganti' : 'File aturan dihapus') }} />
      <div className="row-end"><Btn kind="ghost" onClick={() => { setTen(s.leaveTenure); toast('Perubahan dibatalkan') }}>Reset</Btn><Btn onClick={() => { api.setKey('leaveTenure', ten); toast('Pengaturan cuti tersimpan') }}>Save</Btn></div>

      <Modal wide open={!!f} title={f?.id ? 'Edit Kategori' : 'Tambahkan Kategori'} onClose={() => setF(null)} footer={<><Btn kind="ghost" onClick={() => setF(null)}>Batal</Btn><Btn icon="send" disabled={!valid} onClick={save}>Kirim</Btn></>}>
        {f && <>
          <div className="form two">
            <Field label="Kelompok" hint="Izin = sakit, izin resmi, dinas luar. Tidak dihitung sebagai cuti, tetapi juga bukan tidak absen."><div className="seg">{['Cuti', 'Izin'].map((x) => <button type="button" key={x} className={f.kelompok === x ? 'on' : ''} onClick={() => set('kelompok', x)}>{x}</button>)}</div></Field>
            <Field label="Bukti yang wajib dilampirkan" hint="Kosongkan bila tidak perlu."><input value={f.bukti} onChange={(e) => set('bukti', e.target.value)} placeholder="Contoh: Surat dokter" /></Field>
            <Field label="Kategori Cuti"><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Masukkan nama kategori cuti (contoh: Annual Leave)" /></Field>
            <Field label="Kuota Hari">{f.tanpaKuota ? <input disabled value="Tanpa batas kuota" /> : <Num value={f.kuota} onChange={(v) => set('kuota', v)} suffix="Hari" placeholder="Masukkan jumlah hari cuti (angka)" aria-label="Kuota hari" />}<label className="chk-l sm"><input type="checkbox" checked={!!f.tanpaKuota} onChange={(e) => set('tanpaKuota', e.target.checked)} />Tanpa batas kuota (mis. dinas luar)</label></Field>
            <Field label="Durasi Aktif"><select value={f.durasi} onChange={(e) => set('durasi', e.target.value)}><option value="">Pilih tahun cuti aktif</option>{years.map((y) => <option key={y}>{y}</option>)}</select></Field>
            <Field label="Maks. hari berturut-turut" hint="Batas hari dalam satu kali pengajuan. Kosongkan bila tidak dibatasi. Dipantau di Dashboard Absensi."><Num value={f.maksBerturut} onChange={(v) => set('maksBerturut', v)} suffix="Hari" placeholder="Contoh: 3" aria-label="Maksimal hari berturut-turut" /></Field>
            <Field label="Carry Over" hint="Carry over = sisa cuti tahun lalu yang boleh dipakai tahun depan dengan batas waktu tertentu."><Num value={f.carry} onChange={(v) => set('carry', v)} suffix="Bulan" placeholder="Jumlah bulan carry over (angka)" aria-label="Carry over bulan" /></Field>
          </div>
          <fieldset className="rg"><legend>Waktu Pemakaian Cuti</legend>
            <label className="chk-l"><input type="radio" name="pakai" checked={f.pakai === 'bulanan'} onChange={() => set('pakai', 'bulanan')} />Munculkan cuti 1 hari dalam 1 bulan (selama kontrak berlangsung)</label>
            <label className="chk-l"><input type="radio" name="pakai" checked={f.pakai === 'sekaligus'} onChange={() => set('pakai', 'sekaligus')} />Munculkan cuti sekaligus (selama kontrak berlangsung)</label></fieldset>
          <fieldset className="rg"><legend>Waktu Pengaktifan Cuti</legend>
            <label className="chk-l"><input type="radio" name="aktif" checked={f.aktifMode === 'langsung'} onChange={() => set('aktifMode', 'langsung')} />Aktif langsung setelah karyawan mendapatkan kontrak</label>
            <label className="chk-l"><input type="radio" name="aktif" checked={f.aktifMode === 'setelah'} onChange={() => set('aktifMode', 'setelah')} />Aktif setelah karyawan bekerja selama <Num value={f.aktifSetelah} onChange={(v) => setF({ ...f, aktifSetelah: v, aktifMode: 'setelah' })} suffix="bulan" aria-label="Aktif setelah berapa bulan" className="tiny" /></label></fieldset>
          <div className="form two">
            <Penerima label="Penerima Cuti" value={f.penerima} onChange={(v) => set('penerima', v)} />
            <Field label="Tanggal Pengaktifan Kategori Cuti"><input type="date" value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
          </div>
          <p className="muted sm">Kolom angka hanya bisa diisi angka. Tanpa cuti setengah hari; kuota prorata sisa kontrak.</p>
        </>}
      </Modal>
      <Confirm open={dup} yes="Approve" text={<>Anda akan <b>membuat salinan</b> dokumen "{dup?.name}". Anda yakin ingin melanjutkan?</>} onNo={() => setDup(null)} onYes={() => { api.copyType('leaveTypes', dup.id, { durasi: yearNow, mulai: new Date().toISOString().slice(0, 10) }); setDup(null); setTab('Active'); toast('Salinan dibuat di tab Active') }} />
      <Confirm open={del} yes="Hapus" text={<>Hapus kategori <b>{del?.name}</b>? Pengajuan yang sudah ada tidak ikut terhapus.</>} onNo={() => setDel(null)} onYes={() => { api.deleteType('leaveTypes', del.id); setDel(null); toast('Kategori cuti dihapus') }} />{t}
    </>
  )
}

export function TalentSettingCuti({ go, embedded }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast()
  const aktif = s.leaveTypes.filter((lt) => cutiTab(lt) === 'Active')
  const [kat, setKat] = useState(aktif[0]?.name || ''); const [q, setQ] = useState(''); const [ed, setEd] = useState(null); const [log, setLog] = useState(false)
  const lt = aktif.find((x) => x.name === kat)
  const adj = (empId) => s.leaveAdjust.find((a) => a.emp === empId && a.kategori === kat)
  const pakaiAsli = (empId) => s.leaves.filter((l) => l.emp === empId && l.jenis === kat && l.status === 'Approved').reduce((a, b) => a + b.hari, 0)
  const kuota = (e) => adj(e.id)?.kuota ?? lt?.kuota ?? 0
  const pakai = (e) => adj(e.id)?.terpakai ?? pakaiAsli(e.id)
  const rows = lt ? s.employees.filter((e) => matchEmp(s, lt.penerima, e.id) && e.name.toLowerCase().includes(q.toLowerCase())) : []
  return (
    <>
      {!embedded && <Crumb items={[['Cuti', () => go('cuti')], ['Talent Setting']]} />}
      <Head embedded={embedded} title="Talent Setting" sub="Koreksi kuota dan cuti terpakai per karyawan. Setiap perubahan tercatat di log."><Btn kind="ghost" icon="clock" onClick={() => setLog(true)}>All Log Activity</Btn></Head>
      <div className="filters"><label className="fsel"><span>Kategori Cuti</span><select value={kat} onChange={(e) => setKat(e.target.value)}>{aktif.map((x) => <option key={x.id}>{x.name}</option>)}</select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Ketikkan nama" value={q} onChange={(e) => setQ(e.target.value)} /></span></label></div>
      <Card pad={false}><Table center rows={rows} empty="Tidak ada karyawan penerima kategori ini." cols={[
        { h: 'No', r: (e) => rows.indexOf(e) + 1 }, { h: 'Karyawan', r: (e) => <div className="who"><Avatar name={e.name} size={32} /><div><strong>{e.name}</strong><div className="muted sm">{branch(e.branch)}</div></div></div> },
        { h: 'Jabatan', k: 'role' }, { h: 'Kategori Cuti', r: () => kat }, { h: 'Kuota Cuti', r: (e) => kuota(e) }, { h: 'Cuti Terpakai', r: (e) => pakai(e) }, { h: 'Sisa Cuti', r: (e) => kuota(e) - pakai(e) },
        { h: 'Last Modified', r: (e) => (adj(e.id) ? fmtDate(adj(e.id).at) : '—') }, { h: 'Last Modified by', r: (e) => adj(e.id)?.by || '—' },
        { h: 'Action', r: (e) => <button className="icon-btn" title="Ubah kuota" aria-label={'Ubah kuota ' + e.name} onClick={() => setEd({ e, kuota: '', terpakai: '' })}><Icon name="edit" size={18} /></button> }]} /></Card>
      <Modal open={!!ed} title={ed ? ed.e.name : ''} onClose={() => setEd(null)} footer={<><Btn kind="ghost" onClick={() => setEd(null)}>Batal</Btn><Btn disabled={!ed || (ed.kuota === '' && ed.terpakai === '')} onClick={() => { api.adjustLeave({ emp: ed.e.id, kategori: kat, kuota: ed.kuota === '' ? kuota(ed.e) : Number(ed.kuota), terpakai: ed.terpakai === '' ? pakai(ed.e) : Number(ed.terpakai), dari: `${kuota(ed.e)}/${pakai(ed.e)}` }); setEd(null); toast('Kuota cuti diperbarui') }}>Save</Btn></>}>
        {ed && <div className="form two">
          <div><strong>Kuota Cuti: {kat}</strong><div className="form two mt"><Field label="Sebelum"><input disabled value={kuota(ed.e) + ' hari'} /></Field><Field label="Sesudah"><Num value={ed.kuota} onChange={(v) => setEd({ ...ed, kuota: v })} suffix="hari" placeholder="Masukkan hari" aria-label="Kuota sesudah" /></Field></div></div>
          <div><strong>Cuti Terpakai</strong><div className="form two mt"><Field label="Sebelum"><input disabled value={pakai(ed.e) + ' hari'} /></Field><Field label="Sesudah"><Num value={ed.terpakai} onChange={(v) => setEd({ ...ed, terpakai: v })} suffix="hari" placeholder="Masukkan hari" aria-label="Terpakai sesudah" /></Field></div></div>
        </div>}
      </Modal>
      <Modal wide open={log} title="All Log Activity" onClose={() => setLog(false)} footer={<Btn kind="ghost" onClick={() => setLog(false)}>Close</Btn>}>
        <Table center rows={s.leaveAdjust} empty="Belum ada perubahan kuota." cols={[{ h: 'Tanggal', r: (a) => fmtDate(a.at) }, { h: 'Karyawan', r: (a) => s.employees.find((e) => e.id === a.emp)?.name }, { h: 'Kategori', k: 'kategori' }, { h: 'Kuota/Terpakai sebelum', k: 'dari' }, { h: 'Kuota/Terpakai sesudah', r: (a) => `${a.kuota}/${a.terpakai}` }, { h: 'Oleh', k: 'by' }]} />
      </Modal>{t}
    </>
  )
}

// =================== LEMBUR ===================
const KOMPONEN = ['Persentase Gaji Pokok', 'Nominal Pengali Upah']
const HARI = ['Hari Kerja', 'Hari Libur', 'Libur Nasional & Cuti Bersama']
const OV_BLANK = { id: null, name: '', maks: '', komponen: KOMPONEN[0], nominal: '', shift: ['Shift 1'], hari: HARI[0], pengali: [{ dari: 1, sampai: 1, x: 1.5 }] }
const overlap = (rows) => rows.some((a, i) => Number(a.dari) > Number(a.sampai) || rows.some((b, j) => j > i && Number(a.dari) <= Number(b.sampai) && Number(b.dari) <= Number(a.sampai)))
export function PengaturanLembur({ go, embedded }) {
  const s = useStore(); const [t, toast] = useToast(); const [f, setF] = useState(null); const [del, setDel] = useState(null)
  const [cut, setCut] = useState(s.overtimeSetup)
  const set = (k, v) => setF({ ...f, [k]: v })
  const setP = (i, k, v) => set('pengali', f.pengali.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const bentrok = f && overlap(f.pengali)
  const valid = f && f.name.trim() && Number(f.maks) > 0 && f.shift.length && f.pengali.length && f.pengali.every((r) => Number(r.dari) > 0 && Number(r.sampai) > 0 && Number(r.x) > 0) && !bentrok && (f.komponen !== KOMPONEN[1] || Number(f.nominal) > 0)
  return (
    <>
      {!embedded && <Crumb items={[['Lembur', () => go('lembur')], ['Pengaturan Lembur']]} />}
      <Head embedded={embedded} title="Pengaturan Lembur" sub="Kategori lembur, batas jam, pengali upah, tanggal cut-off, dan aturan." />
      <Card title="Kategori Lembur" action={<span className="review-pill">Total Jam Lembur: <b>{s.overtimeTypes.reduce((a, b) => a + Number(b.maks), 0)} jam/bulan</b></span>}>
        <div className="type-list">{s.overtimeTypes.map((o) => (
          <div key={o.id} className="type-row"><div className="grow"><strong>{o.name}</strong><div className="muted sm">{o.hari} · {o.shift.join(', ')} · {o.komponen}{o.komponen === KOMPONEN[1] ? ' ' + rupiah(o.nominal) : ''}</div>
            <div className="chips">{o.pengali.map((p, i) => <Badge key={i} t="neutral">Jam ke-{p.dari}{p.sampai !== p.dari ? '–' + p.sampai : ''}: {p.x}×</Badge>)}</div></div>
            <span className="kpill">{o.maks} jam/bulan</span>
            <div className="row-act"><button className="icon-btn" title="Edit" aria-label={'Edit ' + o.name} onClick={() => setF(structuredClone({ ...OV_BLANK, ...o, maks: String(o.maks), nominal: String(o.nominal || '') }))}><Icon name="edit" size={18} /></button>
              <button className="icon-btn" title="Hapus" aria-label={'Hapus ' + o.name} onClick={() => setDel(o)}><Icon name="trash" size={18} /></button>
              <button className="icon-btn" title="Salin" aria-label={'Salin ' + o.name} onClick={() => { api.copyType('overtimeTypes', o.id); toast('Salinan kategori dibuat') }}><Icon name="layers" size={18} /></button></div></div>))}</div>
        <Btn kind="ghost" icon="plus" onClick={() => setF(structuredClone(OV_BLANK))}>Tambahkan Kategori</Btn>
      </Card>
      <Card title="Tanggal Cut-Off"><p className="muted">Lembur di luar rentang ini masuk ke periode gaji berikutnya.</p>
        <div className="form two"><Field label="Tanggal awal (setiap bulan)"><select value={cut.cutDari} onChange={(e) => setCut({ ...cut, cutDari: Number(e.target.value) })}>{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Tanggal akhir (bulan berikutnya)"><select value={cut.cutSampai} onChange={(e) => setCut({ ...cut, cutSampai: Number(e.target.value) })}>{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d}>{d}</option>)}</select></Field></div></Card>
      <Aturan title="Aturan dan Kebijakan Lembur" file={cut.aturan} onChange={(v) => setCut({ ...cut, aturan: v })} />
      <div className="row-end"><Btn kind="ghost" onClick={() => setCut(s.overtimeSetup)}>Reset</Btn><Btn onClick={() => { api.setKey('overtimeSetup', cut); toast('Pengaturan lembur tersimpan') }}>Save</Btn></div>

      <Modal wide open={!!f} title={f?.id ? 'Edit Kategori Lembur' : 'Tambahkan Kategori Lembur'} onClose={() => setF(null)} footer={<><Btn kind="ghost" onClick={() => setF(null)}>Batal</Btn><Btn icon="send" disabled={!valid} onClick={() => { api.saveType('overtimeTypes', f.id, { name: f.name.trim(), maks: Number(f.maks), komponen: f.komponen, nominal: Number(f.nominal) || 0, shift: f.shift, hari: f.hari, pengali: f.pengali.map((r) => ({ dari: Number(r.dari), sampai: Number(r.sampai), x: Number(r.x) })) }); setF(null); toast('Kategori lembur tersimpan') }}>Kirim</Btn></>}>
        {f && <>
          <div className="form two">
            <Field label="Nama Kategori"><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Contoh: Lembur Hari Libur" /></Field>
            <Field label="Durasi maksimal"><Num value={f.maks} onChange={(v) => set('maks', v)} suffix="jam/bulan" aria-label="Durasi maksimal jam per bulan" /></Field>
            <Field label="Tipe Komponen Pengali Upah"><select value={f.komponen} onChange={(e) => set('komponen', e.target.value)}>{KOMPONEN.map((k) => <option key={k}>{k}</option>)}</select></Field>
            {f.komponen === KOMPONEN[1] ? <Field label="Nominal Pengali Upah"><Num value={f.nominal} onChange={(v) => set('nominal', v)} suffix="Rp/jam" aria-label="Nominal pengali upah" /></Field> : <Field label="Dasar upah"><input disabled value="Upah per jam dari Gaji Pokok" /></Field>}
            <Field label="Aktif Pada Hari" hint="Jenis hari mengikuti Master Calendar."><select value={f.hari} onChange={(e) => set('hari', e.target.value)}>{HARI.map((h) => <option key={h}>{h}</option>)}</select></Field>
            <div className="field"><span className="field-l">Jadwal Shift</span><div className="mod-row">{s.shifts.map((z) => z.name).map((x) => <label key={x} className={`mod ${f.shift.includes(x) ? 'on' : ''}`}><input type="checkbox" checked={f.shift.includes(x)} onChange={(e) => set('shift', e.target.checked ? [...f.shift, x] : f.shift.filter((y) => y !== x))} />{x}</label>)}</div></div>
          </div>
          <hr /><strong>Pengali upah tiap jam</strong>
          {f.pengali.map((r, i) => (
            <div key={i} className="pengali-row"><Field label="Jam ke-"><Num value={r.dari} onChange={(v) => setP(i, 'dari', v)} aria-label={`Baris ${i + 1} jam mulai`} /></Field><Field label="sampai jam ke-"><Num value={r.sampai} onChange={(v) => setP(i, 'sampai', v)} aria-label={`Baris ${i + 1} jam akhir`} /></Field>
              <Field label="Pengali"><span className="num"><input inputMode="decimal" value={r.x} onChange={(e) => setP(i, 'x', e.target.value.replace(/[^\d.]/g, ''))} aria-label={`Baris ${i + 1} pengali`} /><em>× upah/jam</em></span></Field>
              <button type="button" className="icon-btn" title="Hapus baris" aria-label={`Hapus baris ${i + 1}`} disabled={f.pengali.length === 1} onClick={() => set('pengali', f.pengali.filter((_, j) => j !== i))}><Icon name="trash" size={18} /></button></div>))}
          {bentrok && <div className="err"><p>Rentang jam tumpang tindih atau terbalik. Tiap jam hanya boleh masuk satu baris.</p></div>}
          <Btn kind="ghost" icon="plus" onClick={() => { const last = Math.max(...f.pengali.map((r) => Number(r.sampai) || 0)); set('pengali', [...f.pengali, { dari: last + 1, sampai: last + 1, x: 2 }]) }}>Tambah rentang jam</Btn>
        </>}
      </Modal>
      <Confirm open={del} yes="Hapus" text={<>Hapus kategori <b>{del?.name}</b>?</>} onNo={() => setDel(null)} onYes={() => { api.deleteType('overtimeTypes', del.id); setDel(null); toast('Kategori lembur dihapus') }} />{t}
    </>
  )
}

// =================== REIMBURSEMENT ===================
export function PengaturanReimburse({ go, embedded }) {
  const s = useStore(); const [t, toast] = useToast(); const [f, setF] = useState(null); const [del, setDel] = useState(null); const [st, setSt] = useState(s.reimburseSetup)
  const set = (k, v) => setF({ ...f, [k]: v })
  const used = (n) => s.reimbursements.filter((r) => r.jenis === n).length
  return (
    <>
      {!embedded && <Crumb items={[['Reimbursement', () => go('reimbursement')], ['Pengaturan Reimbursement']]} />}
      <Head embedded={embedded} title="Pengaturan Reimbursement" sub="Jenis reimbursement dan limit per karyawan per tahun." />
      <Card title="Jenis Reimbursement">
        <div className="type-list">{s.reimburseTypes.map((r) => (
          <div key={r.id} className="type-row"><div className="grow"><strong>{r.name}</strong><div className="muted sm">{penerimaLabel(s, r.penerima)} · {r.bukti ? 'Wajib lampiran bukti' : 'Lampiran opsional'}</div></div><span className="kpill">{rupiah(r.limit)} / tahun</span>
            <div className="row-act"><button className="icon-btn" title="Edit" aria-label={'Edit ' + r.name} onClick={() => setF({ ...r, limit: String(r.limit) })}><Icon name="edit" size={18} /></button>
              <button className="icon-btn" title={used(r.name) ? 'Sudah dipakai pengajuan' : 'Hapus'} aria-label={'Hapus ' + r.name} disabled={used(r.name) > 0} onClick={() => setDel(r)}><Icon name="trash" size={18} /></button>
              <button className="icon-btn" title="Salin" aria-label={'Salin ' + r.name} onClick={() => { api.copyType('reimburseTypes', r.id); toast('Salinan jenis dibuat') }}><Icon name="layers" size={18} /></button></div></div>))}</div>
        <Btn kind="ghost" icon="plus" onClick={() => setF({ id: null, name: '', limit: '', penerima: '', bukti: true })}>Tambahkan Jenis</Btn>
        <p className="muted sm mt">Jenis yang sudah dipakai pengajuan tidak bisa dihapus.</p>
      </Card>
      <Card title="Periode limit"><div className="form two"><Field label="Tahun berlaku" hint="Limit dihitung per karyawan per tahun dan kembali penuh di awal tahun."><select value={st.tahun} onChange={(e) => setSt({ ...st, tahun: Number(e.target.value) })}>{[2025, 2026, 2027, 2028].map((y) => <option key={y}>{y}</option>)}</select></Field></div></Card>
      <Aturan title="Aturan dan Kebijakan Reimbursement" file={st.aturan} onChange={(v) => setSt({ ...st, aturan: v })} />
      <div className="row-end"><Btn kind="ghost" onClick={() => setSt(s.reimburseSetup)}>Reset</Btn><Btn onClick={() => { api.setKey('reimburseSetup', st); toast('Pengaturan reimbursement tersimpan') }}>Save</Btn></div>
      <Modal open={!!f} title={f?.id ? 'Edit Jenis Reimbursement' : 'Tambahkan Jenis Reimbursement'} onClose={() => setF(null)} footer={<><Btn kind="ghost" onClick={() => setF(null)}>Batal</Btn><Btn icon="send" disabled={!f?.name.trim() || !(Number(f?.limit) > 0)} onClick={() => { api.saveType('reimburseTypes', f.id, { name: f.name.trim(), limit: Number(f.limit), penerima: f.penerima, bukti: f.bukti }); setF(null); toast('Jenis reimbursement tersimpan') }}>Kirim</Btn></>}>
        {f && <div className="form"><Field label="Jenis Reimbursement"><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Contoh: Kesehatan" /></Field>
          <Field label="Limit per tahun" hint={Number(f.limit) > 0 ? rupiah(Number(f.limit)) : 'Hanya angka'}><Num value={f.limit} onChange={(v) => set('limit', v)} suffix="Rp" aria-label="Limit per tahun" /></Field>
          <Penerima label="Penerima" value={f.penerima} onChange={(v) => set('penerima', v)} />
          <label className="chk-l"><input type="checkbox" className="chk" checked={f.bukti} onChange={(e) => set('bukti', e.target.checked)} />Wajib melampirkan bukti (nota/kuitansi)</label></div>}
      </Modal>
      <Confirm open={del} yes="Hapus" text={<>Hapus jenis <b>{del?.name}</b>?</>} onNo={() => setDel(null)} onYes={() => { api.deleteType('reimburseTypes', del.id); setDel(null); toast('Jenis reimbursement dihapus') }} />{t}
    </>
  )
}

// =================== REKAP ===================
export function Rekap({ go, page, title, col, valueOf, valueLabel, fmt = (v) => v, extra }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast(); const [fb, setFb] = useState('')
  const rows = s.employees.filter((e) => !fb || e.branch === fb).map((e) => { const mine = s[col].filter((r) => r.emp === e.id && r.status === 'Approved'); return { e, n: mine.length, total: mine.reduce((a, r) => a + valueOf(r, e), 0) } }).filter((r) => r.n > 0)
  return (
    <>
      <Crumb items={[[title, () => go(page)], ['Rekap']]} />
      <PageHead title={'Rekap ' + title} sub="Hanya pengajuan yang sudah Approved."><Btn icon="download" onClick={() => { try { exportExcel({ title: `Rekap ${title} - Kirana HRIS`, meta: fb ? branch(fb) : 'Semua Branch', cols: ['Nama', 'Divisi', 'Jabatan', 'Total pengajuan', valueLabel], rows: rows.map((r) => [r.e.name, r.e.divisi, r.e.role, r.n, r.total]), file: `rekap-${page}` }); toast('Rekap diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }}>Download</Btn></PageHead>
      <div className="filters"><label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
      <div className="stats"><Stat label="Total orang" value={rows.length} icon="users" /><Stat label="Total pengajuan" value={rows.reduce((a, r) => a + r.n, 0)} icon="doc" /><Stat label={valueLabel} value={fmt(rows.reduce((a, r) => a + r.total, 0))} icon="chart" />{extra}</div>
      <Card pad={false}><Table center rows={rows} empty="Belum ada pengajuan yang disetujui." cols={[{ h: 'Nama', r: (r) => <div className="who"><Avatar name={r.e.name} size={30} />{r.e.name}</div> }, { h: 'Divisi', r: (r) => r.e.divisi || '—' }, { h: 'Jabatan', r: (r) => r.e.role }, { h: 'Total pengajuan', k: 'n' }, { h: valueLabel, r: (r) => fmt(r.total) }]} /></Card>{t}
    </>
  )
}
