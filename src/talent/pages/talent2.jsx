// Role Talent (revisi 18 Nov): pengajuan di halaman sendiri, payslip berpassword + PDF, menu karier dikunci saat masih
// terikat kontrak, Kontrak sesuai Figma, Inventaris dengan pemeriksaan penerimaan, Resign + pengembalian barang,
// Inbox dengan kirim pesan antar karyawan, dan menu dari app STA (Event, Karyawan, Feedback, Reviews & More, Akun).
import { UjiOffline } from '../components/OfflineAbsen.jsx'
import React, { useMemo, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { rupiah, calcRow } from '../services/payroll.js'
import { Btn, Card, Badge, Stat, Table, Tabs, Modal, Field, Toggle, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { aktifCuti, useLookup, fmtDate, ApprovalLine, TalentBio, bioOf } from './shared.jsx'
import { copyText } from '../lib/clipboard.js'
import { DISCLAIMER } from '../data/disclaimer.js'
import { DocView } from './docEditor.jsx'
import { RichText, htmlText } from '../components/RichText.jsx'
import { Sticker, ArtHead } from '../components/Sticker.jsx'
import { exportPdf, save } from '../services/export.js'
import { textPdf, isDownloadable, downloadContracts } from '../services/docs.js'
import { PretestTalent } from './pretest.jsx'
import { KarierLowongan, KarierJadwal, KontrakKandidat } from './talentKarier.jsx'
import { karierState, talentPhase, KERJA_TUTUP } from '../services/talentAccess.js'

import { ME } from '../services/session.js'
export { ME }
import { TALENT_ACCOUNTS } from '../services/auth.js'
// Password payslip demo = password akun talent yang sedang login (Putri: putri123)
export const payslipPassword = () => TALENT_ACCOUNTS.find((a) => a.id === ME)?.password || 'putri123'
const today = () => new Date().toISOString().slice(0, 10)
const Crumb = ({ items }) => <nav className="crumb" aria-label="Breadcrumb">{items.map((x, i) => (i < items.length - 1 ? <React.Fragment key={i}><button onClick={x[1]}>{x[0]}</button><span>›</span></React.Fragment> : <b key={i}>{x[0]}</b>))}</nav>
// Talent aktif bisa karyawan (employees) atau kandidat dari talent pool (pool)
const useMe = () => { const s = useStore(); return s.employees.find((e) => e.id === ME) || s.pool.find((p) => p.id === ME) }
const masaKerja = (a, b) => { const m = Math.max(0, Math.round((new Date(b) - new Date(a)) / (30.44 * 864e5))); return m >= 12 ? `${Math.floor(m / 12)} tahun ${m % 12} bulan` : `${m} bulan` }

// ---------- Menu karier dikunci saat kontrak aktif ----------
export const useEmployed = () => { const me = useMe(); return !!me && (me.status || 'Aktif') !== 'Nonaktif' && me.end >= today() }
function KarierTutup({ go, menu }) {
  const me = useMe(); const s = useStore(); const br = s.branches.find((b) => b.id === me.branch)?.name
  return (
    <div className="gate">
      <div className="gate-art stk-art" aria-hidden="true"><span className="g1" /><Sticker name="kerja" size={168} /></div>
      <h1>Kamu sedang bekerja, {me.name.split(' ')[0]} ✨</h1>
      <p>{menu} ditutup sementara selama kontrakmu di <b>{br}</b> masih berlaku sampai <b>{fmtDate(me.end)}</b>. Menu ini terbuka lagi otomatis saat kontrak berakhir, jadi fokus dulu di pekerjaanmu ya.</p>
      <div className="gate-act"><Btn onClick={() => go('kontrak')} icon="doc">Lihat kontrak</Btn><Btn kind="ghost" onClick={() => go('beranda')}>Ke Beranda</Btn></div>
    </div>
  )
}
// Terkunci/terbuka mengikuti fase kontrak + pengaturan superadmin (Setup Aktivitas › Akses Talent)
const useKarier = (key) => { const s = useStore(); return karierState(s, ME, key) }
export const usePhase = () => { const s = useStore(); return talentPhase(s, ME) }
// Saat terbuka, isinya diambil dari data akun yang login (tawaran, lamaran, jadwal, pre-test masing-masing)
export function LowonganT(p) { return useKarier('lowongan') !== 'buka' ? <KarierTutup go={p.go} menu="Lowongan & Tawaran" /> : <KarierLowongan {...p} /> }
export function JadwalT(p) { return useKarier('jadwal') !== 'buka' ? <KarierTutup go={p.go} menu="Jadwal Wawancara" /> : <KarierJadwal {...p} /> }
export function PretestT(p) { return useKarier('pretest') !== 'buka' ? <KarierTutup go={p.go} menu="Pre-test" /> : <PretestTalent who={ME} /> }

// =====================================================================
// Pengajuan (Cuti / Lembur / Reimbursement): daftar + halaman form sendiri + halaman detail
// =====================================================================
function RequestPage({ page, sub, go, title, desc, col, modul, cols, form, validate, summary, art }) {
  const s = useStore(); const [t, toast] = useToast(); const [tab, setTab] = useState('All')
  if (sub === 'ajukan') return <RequestForm page={page} go={go} title={title} col={col} modul={modul} form={form} validate={validate} />
  if (sub) { const d = s[col].find((x) => x.id === sub); if (!d) return <Empty text="Pengajuan tidak ditemukan." />; return (
    <><Crumb items={[[title, () => go(page)], ['Detail']]} /><PageHead title={`Detail ${title.toLowerCase()}`}><Badge>{d.status}</Badge></PageHead>
      <div className="grid2"><Card title="Pengajuan"><dl className="dl">{cols.map((c) => <React.Fragment key={c.h}><dt>{c.h}</dt><dd>{c.r ? c.r(d) : d[c.k]}</dd></React.Fragment>)}<dt>Status</dt><dd><Badge>{d.status}</Badge></dd></dl></Card>
        <Card title="Approval line"><ApprovalLine line={d.line || [{ by: 'HR', status: d.status }]} /></Card></div></>) }
  const rows = s[col].filter((x) => x.emp === ME && (tab === 'All' || x.status === tab))
  return (
    <>
      <ArtHead art={art} title={title} sub={desc}><Btn icon="plus" onClick={() => go(page + '/ajukan')}>Ajukan</Btn></ArtHead>
      {summary}
      <Tabs tabs={APP_UI ? [{ v: 'All', l: 'Semua' }, { v: 'Waiting', l: 'Menunggu' }, { v: 'Approved', l: 'Disetujui' }, { v: 'Rejected', l: 'Ditolak' }] : ['All', 'Approved', 'Waiting', 'Rejected']} value={tab} onChange={setTab} />
      {APP_UI ? <ReqList rows={rows} cols={cols} onOpen={(r) => go(page + '/' + r.id)} empty={tab === 'All'
        ? { icon: 'doc', title: `Belum ada pengajuan ${title.toLowerCase()}`, hint: 'Pengajuan yang kamu buat akan tampil di sini lengkap dengan statusnya.', action: { label: `Ajukan ${title.toLowerCase()}`, onClick: () => go(page + '/ajukan') } }
        : { icon: 'search', title: `Tidak ada yang ${(STATUS_ID[tab] || [tab])[0].toLowerCase()}`, hint: 'Lihat tab Semua untuk seluruh pengajuanmu.', action: { label: 'Lihat semua', ghost: true, onClick: () => setTab('All') } }} />
        : <Card pad={false}><Table center rows={rows} onRow={(r) => go(page + '/' + r.id)} empty="Belum ada pengajuan. Tekan Ajukan untuk membuat yang pertama." cols={[...cols, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} /></Card>}{t}
    </>
  )
}
// Aplikasi karyawan: daftar ringkas (judul, tanggal, status) menggantikan tabel; status berbahasa Indonesia
const APP_UI = typeof window !== 'undefined' && !!window.KIRANA_APP
export const STATUS_ID = { Approved: ['Disetujui', 'ok'], Waiting: ['Menunggu', 'warn'], Rejected: ['Ditolak', 'bad'] }
function ReqList({ rows, cols, onOpen, empty }) {
  if (!rows.length) return <Empty {...empty} />
  const val = (c, r) => (c.r ? c.r(r) : r[c.k])
  return <ul className="req-list">{rows.map((r) => { const [l, tn] = STATUS_ID[r.status] || [r.status, 'neutral']; return (
    <li key={r.id}><button type="button" onClick={() => onOpen(r)}>
      <span className="grow"><b>{val(cols[0], r)}</b><small>{cols.slice(1, 3).map((c) => val(c, r)).filter((x) => x !== '' && x != null).map((x, i) => <React.Fragment key={i}>{i ? ' · ' : ''}{x}{c0(cols[i + 1])}</React.Fragment>)}</small></span>
      <Badge t={tn}>{l}</Badge><Icon name="chevron" size={18} />
    </button></li>) })}</ul>
}
const c0 = (c) => (c?.h === 'Hari' ? ' hari' : '')
function RequestForm({ page, go, title, col, modul, form, validate }) {
  const s = useStore(); const [t, toast] = useToast(); const [f, setF] = useState(form.init); const [err, setErr] = useState('')
  const submit = () => { const e = validate ? validate(f, s) : ''; if (e) return setErr(e); api.request(col, { emp: ME, ...form.map(f) }, modul); toast('Pengajuan terkirim, menunggu approval'); setTimeout(() => go(page), 500) }
  return (
    <>
      <Crumb items={[[title, () => go(page)], ['Ajukan']]} />
      <PageHead title={`Ajukan ${title.toLowerCase()}`} sub="Isi data di bawah. Pengajuan langsung diteruskan ke atasan sesuai approval line." />
      <div className="req-layout">
        <Card><div className="form">{form.render(f, setF, s)}
          <label className="chk-l"><input type="checkbox" className="chk" checked={!!f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />Saya menyetujui aturan & kebijakan yang berlaku</label>
          {err && <div className="err" role="alert"><Icon name="x" size={16} /><div><b>Maaf ya!</b><p>{err}</p></div></div>}
        </div>
          <div className="row-end"><Btn kind="ghost" onClick={() => go(page)}>Batal</Btn><Btn disabled={!f.agree} onClick={submit}>{APP_UI ? 'Kirim pengajuan' : 'Submit'}</Btn></div></Card>
        {form.aside && <aside className="req-aside">{form.aside(f, s)}</aside>}
      </div>{t}
    </>
  )
}

const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1
export function CutiT({ sub, go }) {
  const s = useStore()
  const usedOf = (n) => s.leaves.filter((l) => l.emp === ME && l.jenis === n && l.status !== 'Rejected').reduce((a, b) => a + b.hari, 0)
  return <RequestPage art="libur" page="cuti" sub={sub} go={go} title="Cuti" desc="Kalender di form menandai libur nasional & blackout dates." col="leaves" modul="Cuti"
    summary={<div className="stats">{aktifCuti(s, ME).map((lt) => <Stat key={lt.name} label={lt.name} value={`${lt.kuota - usedOf(lt.name)}/${lt.kuota}`} hint="sisa hari" />)}</div>}
    cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Tanggal', r: (r) => fmtDate(r.dari) + (r.sampai !== r.dari ? ' – ' + fmtDate(r.sampai) : '') }, { h: 'Hari', k: 'hari' }, { h: 'Alasan', k: 'alasan' }]}
    form={{ init: { jenis: aktifCuti(s, ME)[0]?.name || 'Cuti Tahunan', dari: '', sampai: '', alasan: '' }, map: (f) => ({ jenis: f.jenis, dari: f.dari, sampai: f.sampai, hari: days(f.dari, f.sampai), alasan: f.alasan }),
      render: (f, setF, st) => <>
        <Field label="Jenis cuti"><select value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}>{aktifCuti(st, ME).map((l) => <option key={l.name}>{l.name}</option>)}</select></Field>
        <div className="form two"><Field label="Dari"><input type="date" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value, sampai: f.sampai || e.target.value })} /></Field><Field label="Sampai" hint={f.dari && f.sampai >= f.dari ? `${days(f.dari, f.sampai)} hari` : undefined}><input type="date" min={f.dari} value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} /></Field></div>
        <Field label="Alasan"><textarea rows={3} value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} placeholder="Contoh: acara keluarga di luar kota" /></Field>
        <Field label="Lampiran (opsional)"><input type="file" /></Field></>,
      aside: (f, st) => <Card title="Hari libur & blackout"><ul className="hol-list">{[...st.holidays.map((h) => ({ t: fmtDate(h.tanggal), n: h.nama, k: 'Libur' })), ...st.blackout.map((b) => ({ t: fmtDate(b.dari) + (b.sampai !== b.dari ? ' – ' + fmtDate(b.sampai) : ''), n: b.nama, k: 'Blackout' }))].map((h) => <li key={h.t + h.n}><Badge t={h.k === 'Libur' ? 'bad' : 'neutral'}>{h.k}</Badge><span><b>{h.t}</b>{h.n}</span></li>)}</ul></Card> }}
    validate={(f, st) => {
      if (!f.dari || !f.sampai) return 'Pilih tanggal mulai dan selesai.'
      if (f.sampai < f.dari) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
      if (st.blackout.some((b) => !(f.sampai < b.dari || f.dari > b.sampai))) return 'Tanggal yang kamu pilih masuk periode blackout days perusahaan. Pilih tanggal lain ya.'
      if (st.holidays.some((h) => h.tanggal >= f.dari && h.tanggal <= f.sampai)) return 'Ada hari libur nasional di rentang itu, jadi tidak perlu ambil cuti di hari libur.'
      const lt = aktifCuti(st, ME).find((l) => l.name === f.jenis); if (usedOf(f.jenis) + days(f.dari, f.sampai) > lt.kuota) return 'Kuota cutimu tidak cukup untuk rentang tanggal ini.'
      if (f.sampai > st.employees.find((e) => e.id === ME).end) return 'Cuti tidak boleh melewati tanggal akhir kontrak.'
      return ''
    }} />
}
export function LemburT({ sub, go }) {
  const s = useStore()
  const total = s.overtimes.filter((o) => o.emp === ME && o.status === 'Approved').reduce((a, b) => a + b.durasi, 0)
  const dur = (f) => Math.max(0, (Number(f.selesai.slice(0, 2)) * 60 + Number(f.selesai.slice(3)) - Number(f.mulai.slice(0, 2)) * 60 - Number(f.mulai.slice(3))) / 60)
  return <RequestPage art="kerja" page="lembur" sub={sub} go={go} title="Lembur" desc="Lembur yang disetujui otomatis masuk remunerasi bulan berjalan." col="overtimes" modul="Lembur"
    summary={<div className="stats"><Stat icon="star" label="Lembur bulan ini" value={total + ' jam'} /></div>}
    cols={[{ h: 'Kegiatan', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Jam', k: 'jam' }, { h: 'Durasi', r: (r) => r.durasi + ' jam' }, { h: 'Tipe', k: 'tipe' }]}
    form={{ init: { tipe: s.overtimeTypes[0]?.name || '', tanggal: today(), mulai: '18:00', selesai: '21:00', judul: '' }, map: (f) => ({ tipe: f.tipe, tanggal: f.tanggal, jam: f.mulai + '–' + f.selesai, durasi: dur(f), judul: f.judul || 'Lembur' }),
      render: (f, setF, st) => <>
        <Field label="Tipe lembur"><select value={f.tipe} onChange={(e) => setF({ ...f, tipe: e.target.value })}>{st.overtimeTypes.map((o) => <option key={o.name}>{o.name}</option>)}</select></Field>
        <Field label="Tanggal"><input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field>
        <div className="form two"><Field label="Mulai"><input type="time" value={f.mulai} onChange={(e) => setF({ ...f, mulai: e.target.value })} /></Field><Field label="Selesai" hint={f.selesai > f.mulai ? `${dur(f)} jam` : undefined}><input type="time" value={f.selesai} onChange={(e) => setF({ ...f, selesai: e.target.value })} /></Field></div>
        <Field label="Deskripsi pekerjaan"><textarea rows={3} value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} placeholder="Contoh: rilis aplikasi versi 2.4" /></Field>
        <Field label="Lampiran (opsional)"><input type="file" /></Field></>,
      aside: (f, st) => { const tp = st.overtimeTypes.find((o) => o.name === f.tipe); return tp ? <Card title={tp.name}><dl className="dl"><dt>Maks per bulan</dt><dd>{tp.maks} jam</dd><dt>Komponen</dt><dd>{tp.komponen}</dd><dt>Berlaku</dt><dd>{tp.hari || '—'}</dd></dl></Card> : null } }}
    validate={(f) => (!f.tipe ? 'Tim HR belum mengatur jenis lembur. Hubungi HR ya.' : f.selesai <= f.mulai ? 'Jam selesai harus setelah jam mulai.' : '')} />
}
export function ReimburseT({ sub, go }) {
  const s = useStore()
  const used = (n) => s.reimbursements.filter((r) => r.emp === ME && r.jenis === n && r.status !== 'Rejected').reduce((a, b) => a + b.nominal, 0)
  return <RequestPage art="benefit" page="reimbursement" sub={sub} go={go} title="Reimbursement" desc="Limit per tahun. Dibayar bersama gaji setelah disetujui." col="reimbursements" modul="Reimbursement"
    summary={<div className="stats">{s.reimburseTypes.map((r) => <Stat key={r.name} label={r.name} value={rupiah(r.limit - used(r.name))} hint={'sisa dari ' + rupiah(r.limit)} />)}</div>}
    cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Judul', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Nominal', r: (r) => rupiah(r.nominal) }]}
    form={{ init: { jenis: s.reimburseTypes[0]?.name || '', judul: '', tanggal: today(), nominal: '' }, map: (f) => ({ jenis: f.jenis, judul: f.judul || f.jenis, tanggal: f.tanggal, nominal: Number(f.nominal) }),
      render: (f, setF, st) => <>
        <Field label="Jenis klaim"><select value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}>{st.reimburseTypes.map((o) => <option key={o.name}>{o.name}</option>)}</select></Field>
        <Field label="Judul"><input value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} placeholder="Contoh: Rawat jalan klinik" /></Field>
        <div className="form two"><Field label="Tanggal"><input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field><Field label="Nominal (Rp)"><input type="number" inputMode="numeric" value={f.nominal} onChange={(e) => setF({ ...f, nominal: e.target.value })} /></Field></div>
        <Field label="Bukti (wajib)"><input type="file" multiple /></Field></>,
      aside: (f, st) => { const tp = st.reimburseTypes.find((r) => r.name === f.jenis); return tp ? <Card title="Sisa limit"><div className="big-num">{rupiah(tp.limit - used(tp.name))}</div><p className="muted sm" style={{ margin: 0 }}>dari limit {rupiah(tp.limit)} per tahun</p></Card> : null } }}
    validate={(f, st) => { const lim = st.reimburseTypes.find((r) => r.name === f.jenis)?.limit || 0; if (!Number(f.nominal)) return 'Isi nominal klaim dulu.'; if (used(f.jenis) + Number(f.nominal) > lim) return 'Nominal melebihi sisa limit tahun ini.'; return '' }} />
}

// =====================================================================
// Payslip: password, daftar, detail, unduh PDF
// =====================================================================
export function PayslipT({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast(); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [show, setShow] = useState(false)
  const [ok, setOk] = useState(() => !!window.__kiranaSlip); const me = useMe()
  if (!ok) return (
    <><PageHead title="Payslip" sub="Payslip dilindungi password supaya tetap privat walau perangkat dipinjam orang lain." />
      <Card><form className="lock-form" onSubmit={(e) => { e.preventDefault(); if (pw !== payslipPassword()) return setErr('Password salah. Coba lagi ya.'); window.__kiranaSlip = true; setOk(true) }}>
        <span className="lock-art"><Sticker name="gajian" size={140} /><span className="lock-ic"><Icon name="lock" size={22} /></span></span><h2>Password diperlukan</h2><p className="muted">Masukkan password akunmu untuk membuka payslip.</p>
        <Field label="Password" hint={err}><div className="pw"><input type={show ? 'text' : 'password'} value={pw} aria-invalid={!!err} onChange={(e) => { setPw(e.target.value); setErr('') }} autoComplete="current-password" /><button type="button" className="icon-btn" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button></div></Field>
        <Btn disabled={!pw} type="submit" className="full">Buka payslip</Btn>
        <Note>Akun demo: password <b>{payslipPassword()}</b></Note>
      </form></Card></>)
  const list = s.payslips.filter((p) => p.emp === ME)
  const slipOf = (p) => calcRow({ thp: p.thp, skema: me.skema, additions: [], deductions: [] }, s.setup)
  // Payslip dikelompokkan per perusahaan (Branch). Kontrak yang sudah berakhir tetap bisa dibuka di folder "Perusahaan sebelumnya".
  const bOf = (p) => p.branch || me.branch
  const bName = (id) => s.branches.find((b) => b.id === id)?.name || 'Perusahaan'
  const current = talentPhase(s, ME) !== 'selesai' ? me.branch : null
  const prev = [...new Set(list.map(bOf))].filter((b) => b !== current)
  const Slips = ({ items }) => <div className="slip-grid">{items.map((p) => <button key={p.id} className="slip-card" onClick={() => go('payslip/' + p.id)}><span className="pf-ic"><Icon name="wallet" size={18} /></span><span className="grow"><strong>{p.bulan}</strong><small>Take home pay {rupiah(slipOf(p).net)}</small></span><Icon name="arrowRight" size={18} /></button>)}</div>
  if (sub && sub.startsWith('f-')) {
    const bid = sub.slice(2); const items = list.filter((p) => bOf(p) === bid)
    return <><Crumb items={[['Payslip', () => go('payslip')], [bName(bid)]]} />
      <PageHead title={bName(bid)} sub={`${bid === current ? 'Perusahaan saat ini' : 'Perusahaan sebelumnya'} · ${items.length} payslip. Tetap bisa dibuka & diunduh kapan saja, misalnya untuk melamar kerja.`} />
      {items.length ? <Slips items={items} /> : <Card><Empty text="Belum ada payslip." /></Card>}{t}</>
  }
  if (sub) {
    const p = list.find((x) => x.id === sub); if (!p) return <Empty text="Payslip tidak ditemukan." />
    const c = slipOf(p)
    const rows = [['Pendapatan', '', ''], ['Gaji Pokok', rupiah(c.gp), ''], ['Tunjangan Posisi', rupiah(c.tp), ''], ['Potongan', '', ''], ['BPJS Kesehatan (1%)', '', '− ' + rupiah(c.emp.kes)], ['JHT (2%)', '', '− ' + rupiah(c.emp.jht)], ['JP (1%)', '', '− ' + rupiah(c.emp.jp)], ['Take home pay', rupiah(c.net), ''], ['Ditanggung perusahaan', '', ''], [`PPh21 (TER ${c.rate}%)`, rupiah(c.pajak), ''], ['JKK + JKM', rupiah(c.comp.jkk + c.comp.jkm), ''], ['JHT + JP perusahaan', rupiah(c.comp.jht + c.comp.jp), ''], ['BPJS Kesehatan perusahaan', rupiah(c.comp.kes), '']]
    const pdf = () => { try { exportPdf({ title: `Payslip ${p.bulan}`, meta: `${me.name} · ${me.role} · ${bName(bOf(p))}`, cols: ['Komponen', 'Nominal', 'Potongan'], rows, file: `payslip_${p.bulan.replace(' ', '-')}_${me.name.replace(/ /g, '-')}` }); toast('Payslip PDF diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
    return (
      <><Crumb items={bOf(p) === current ? [['Payslip', () => go('payslip')], [p.bulan]] : [['Payslip', () => go('payslip')], [bName(bOf(p)), () => go('payslip/f-' + bOf(p))], [p.bulan]]} />
        <PageHead title={`Payslip ${p.bulan}`} sub={`${me.name} · ${me.role} · ${bName(bOf(p))}`}><Btn icon="download" onClick={pdf}>Download PDF</Btn></PageHead>
        <Card><div className="slip">
          <h4>Pendapatan</h4>{[['Gaji Pokok', c.gp], ['Tunjangan Posisi', c.tp]].map(([k, v]) => <div key={k}><span>{k}</span><b>{rupiah(v)}</b></div>)}
          <h4>Potongan</h4>{[['BPJS Kesehatan (1%)', c.emp.kes], ['JHT (2%)', c.emp.jht], ['JP (1%)', c.emp.jp]].map(([k, v]) => <div key={k}><span>{k}</span><b>− {rupiah(v)}</b></div>)}
          <div className="slip-total"><span>Take home pay</span><b>{rupiah(c.net)}</b></div>
          <h4>Ditanggung perusahaan</h4>{[['PPh21 (TER ' + c.rate + '%)', c.pajak], ['JKK + JKM', c.comp.jkk + c.comp.jkm], ['JHT + JP perusahaan', c.comp.jht + c.comp.jp], ['BPJS Kesehatan perusahaan', c.comp.kes]].map(([k, v]) => <div key={k}><span>{k}</span><b>{rupiah(v)}</b></div>)}
        </div></Card>{t}</>
    )
  }
  return (
    <><ArtHead art="gajian" title="Payslip" sub="Terbit setelah gaji selesai ditransfer. Klik bulan untuk melihat rincian dan unduh PDF."><Btn kind="ghost" icon="lock" onClick={() => { window.__kiranaSlip = false; setOk(false); setPw('') }}>Kunci lagi</Btn></ArtHead>
      {!list.length && <Card><Empty text="Belum ada payslip." /></Card>}
      {current && list.some((p) => bOf(p) === current) && <section className="ps-sec"><h2 className="ps-h">Perusahaan saat ini · {bName(current)}</h2><Slips items={list.filter((p) => bOf(p) === current)} /></section>}
      {prev.length > 0 && <section className="ps-sec"><h2 className="ps-h">Perusahaan sebelumnya</h2><p className="muted sm" style={{ margin: 0 }}>Payslip dari kontrak yang sudah berakhir tetap tersimpan di sini, per perusahaan.</p>
        <div className="slip-grid">{prev.map((b) => { const it = list.filter((p) => bOf(p) === b); return <button key={b} className="slip-card folder" onClick={() => go('payslip/f-' + b)}><span className="pf-ic"><Icon name="building" size={18} /></span><span className="grow"><strong>{bName(b)}</strong><small>{it.length} payslip · terakhir {it[0].bulan}</small></span><Icon name="arrowRight" size={18} /></button> })}</div></section>}{t}</>
  )
}

// =====================================================================
// Kontrak (Figma Talent - kontrak)
// =====================================================================
const STAGES = ['Sent', 'Employee Signed', 'Full Signed']
// Pemilih halaman tanpa hook bersyarat: tiap cabang komponen sendiri supaya urutan hook React tetap stabil
export function KontrakT({ go, sub }) {
  const phase = usePhase()
  if (phase === 'kandidat') return <KontrakKandidat go={go} />
  if (sub === 'agreement') return <AgreementT go={go} />
  return <KontrakMain go={go} sub={sub} />
}
function KontrakMain({ go, sub }) {
  const s = useStore(); const [t, toast] = useToast(); const me = useMe()
  const [sign, setSign] = useState(null); const [file, setFile] = useState(''); const [chk, setChk] = useState(false); const [view, setView] = useState(null); const [ask, setAsk] = useState(false)
  const agreed = s.contractAgreed[ME]
  const docs = s.docBatches.flatMap((b) => b.items.filter((i) => i.emp === ME && i.status !== 'None').map((i) => ({ ...i, batch: b.id, bulan: b.bulan, branch: b.branch })))
  const bname = s.branches.find((b) => b.id === me.branch)?.name || ''
  const periode = (d, i) => (d.dokumen.startsWith('PKWT') ? ` Periode ${docs.filter((x, j) => j <= i && x.dokumen.startsWith('PKWT')).length}` : '')
  const lastPkwt = [...docs].reverse().find((d) => (d.dokumen.startsWith('PKWT') || d.dokumen.startsWith('Amandemen')) && d.status === 'Full Signed')
  const myResign = s.resigns.find((r) => r.emp === ME && r.status !== 'Rejected')
  const [d, jam] = (agreed || '').split(' ')
  const unduh = async () => { const list = docs.filter((x) => x.status === 'Full Signed' && isDownloadable(x.dokumen)).map((x) => ({ folder: 'Kontrak ' + me.name, nama: me.name, dokumen: x.dokumen + periode(x, docs.indexOf(x)), text: x.text || `${x.dokumen}\n${me.name}\nNo. ${x.nomor || '-'}` })); if (!list.length) return toast('Belum ada dokumen Full Signed'); try { await downloadContracts(list, 'kontrak_' + me.name); toast(`${list.length} dokumen Full Signed diunduh`) } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  return (
    <><ArtHead art="kontrak" title="Contract" sub={`Dokumen kontrakmu di ${bname}. Unggah dokumen bertanda tangan di baris Employee Signed.`}>{agreed && <Btn kind="ghost" icon="doc" onClick={() => go('kontrak/agreement')}>Agreement</Btn>}<Btn icon="download" onClick={unduh}>Download</Btn></ArtHead>
      {docs.length === 0 ? <Card><Empty text="Belum ada dokumen kontrak." /></Card> : docs.map((x, i) => (
        <Card key={x.batch + x.dokumen} title={`${x.dokumen.replace(' (Potongan BPJS)', '').replace(' (Tanpa Potongan BPJS)', '')} ${bname.replace('Branch ', '')}${periode(x, i)}`} action={<Badge>{x.status}</Badge>}>
          <div className="ct-rows">
            {STAGES.map((st) => { const l = x.log?.[st]; const [tg, jm] = (l?.at || '').split(' '); return (
              <div key={st} className={`ct-row ${l ? 'on' : ''}`}>
                <b className="ct-l">{st}:</b>
                <span className={`ct-chk ${l ? 'on' : ''}`} aria-label={l ? 'Selesai' : 'Belum'}>{l && <Icon name="check" size={14} />}</span>
                <span className="ct-file">{l ? (st === 'Sent' && x.text ? <button type="button" className="lnk" onClick={() => setView(x)}>{l.file}</button> : <span>{l.file}</span>)
                  : st === 'Employee Signed' && x.status === 'Sent' ? <button type="button" className="lnk" onClick={() => { setSign(x); setFile('') }}>Upload File</button> : <span className="muted">—</span>}</span>
                <span className="ct-d">{l ? fmtDate(tg) : '—'}</span><span className="ct-t">{l ? jm + ' WIB' : '—'}</span>
              </div>) })}
            {lastPkwt && lastPkwt.batch === x.batch && lastPkwt.dokumen === x.dokumen && (
              <div className="ct-row"><b className="ct-l">Resign:</b><span className="ct-chk" /><span className="ct-file">{myResign ? <button type="button" className="lnk" onClick={() => go('resign/' + myResign.id)}>Pengajuan resign · {myResign.status}</button> : <button type="button" className="lnk" onClick={() => setAsk(true)}>Request Resign</button>}</span><span className="ct-d">{myResign ? fmtDate(myResign.lastDay) : '—'}</span><span className="ct-t">—</span></div>)}
          </div>
        </Card>))}
      <Modal open={!agreed && docs.length > 0} title="Pernyataan menu Kontrak" onClose={() => go('beranda')} footer={<><Btn kind="ghost" onClick={() => go('beranda')}>Kembali</Btn><Btn disabled={!chk} onClick={() => { api.agreeContract(ME); toast('Pernyataan disetujui dan dicatat') }}>Saya setuju</Btn></>}>
        <p style={{ margin: 0 }}>Sebelum membuka dan mengunggah dokumen di menu ini, mohon baca dan setujui pernyataan berikut.</p>
        <ol className="disc">{DISCLAIMER.map((x) => <li key={x}>{x}</li>)}</ol>
        <label className="chk-l"><input type="checkbox" className="chk" checked={chk} onChange={(e) => setChk(e.target.checked)} />Saya, {me?.name}, sudah membaca dan menyetujui pernyataan di atas</label>
      </Modal>
      <Modal open={!!sign} title={sign ? 'Upload ' + sign.dokumen : ''} onClose={() => setSign(null)} footer={<><Btn kind="ghost" onClick={() => setSign(null)}>Batal</Btn><Btn disabled={!file} onClick={() => { api.signDoc(sign.batch, ME); setSign(null); toast('Dokumen terkirim ke HR untuk ditandatangani') }}>Kirim ke HR</Btn></>}>
        <div className="drop"><Icon name="upload" size={26} /><p>{file || 'Unggah dokumen yang sudah kamu tanda tangani (.pdf)'}</p><input type="file" accept=".pdf" aria-label="Unggah dokumen" onChange={(e) => setFile(e.target.files[0]?.name || '')} /></div>
        <p className="muted sm" style={{ margin: 0 }}>Kalau salah unggah, hubungi HR. Dokumen bisa diganti HR lewat Track Document.</p>
      </Modal>
      <Modal open={ask} title="Ajukan resign?" onClose={() => setAsk(false)} footer={<><Btn kind="ghost" onClick={() => setAsk(false)}>Batal</Btn><Btn onClick={() => go('resign/baru')}>Yakin</Btn></>}><div className="center"><Sticker name="mikir" size={120} /><p style={{ margin: 0 }}>Anda akan mengajukan resign. Anda yakin ingin melanjutkan?</p></div></Modal>
      <Modal wide open={!!view} title={view?.dokumen || ''} onClose={() => setView(null)} footer={<Btn kind="ghost" onClick={() => setView(null)}>Close</Btn>}>{view && <DocView html={view.text} />}</Modal>{t}</>
  )
}

// Halaman Agreement: pernyataan menu Kontrak yang sudah disetujui (dilihat ulang + unduh PDF)
function AgreementT({ go }) {
  const s = useStore(); const me = useMe(); const [t, toast] = useToast()
  const agreed = s.contractAgreed[ME]; const [d, jam] = (agreed || '').split(' ')
  const br = s.branches.find((b) => b.id === me.branch)?.name || ''
  const text = () => ['PERNYATAAN MENU KONTRAK', 'Kirana HRIS', '', `Nama      : ${me.name}`, `Posisi    : ${me.role}`, `Branch    : ${br}`, '', 'Saya menyatakan:', ...DISCLAIMER.map((x, i) => `${i + 1}. ${x}`), '', agreed ? `Disetujui secara elektronik pada ${fmtDate(d)} pukul ${jam} WIB.` : 'Belum disetujui.'].join('\n')
  const pdf = async () => { try { await save(new Blob([textPdf(text())], { type: 'application/pdf' }), `Agreement Kontrak - ${me.name}.pdf`); toast('Agreement diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  return (
    <><Crumb items={[['Contract', () => go('kontrak')], ['Agreement']]} />
      <PageHead title="Agreement" sub="Pernyataan yang kamu setujui saat pertama kali menerima kontrak di Kirana."><Btn icon="download" disabled={!agreed} onClick={pdf}>Download PDF</Btn></PageHead>
      <article className="card agr">
        <header className="agr-h"><Sticker name="kontrak" size={96} /><div><h2>Pernyataan menu Kontrak</h2><p className="muted">{me.name} · {me.role} · {br}</p></div></header>
        <p>Saya menyatakan:</p>
        <ol className="disc">{DISCLAIMER.map((x) => <li key={x}>{x}</li>)}</ol>
        <div className="agr-sign">{agreed ? <><Icon name="checkCircle" size={20} /><span>Disetujui secara elektronik oleh <b>{me.name}</b> pada <b>{fmtDate(d)}</b> pukul <b>{jam} WIB</b>.</span></> : <span>Belum disetujui. Pernyataan muncul saat kontrak pertamamu dikirim HR.</span>}</div>
      </article>{t}</>
  )
}

// =====================================================================
// Resign (web Scala /resign/overview + app STA)
// =====================================================================
const ALASAN = ['Karier baru', 'Melanjutkan studi', 'Alasan keluarga', 'Alasan kesehatan', 'Pindah domisili', 'Lainnya']
const KONDISI = ['Baik', 'Rusak ringan', 'Rusak berat', 'Hilang']
const TEMPLATE_RESIGN = (me, br) => `SURAT PENGUNDURAN DIRI\n\nKepada Yth.\nHR ${br}\n\nDengan hormat,\nSaya yang bertanda tangan di bawah ini:\nNama    : ${me.name}\nJabatan : ${me.role}\n\nDengan ini mengajukan pengunduran diri dari posisi saya, dengan hari kerja terakhir pada tanggal ____________.\nTerima kasih atas kesempatan dan dukungan selama saya bekerja.\n\nHormat saya,\n\n\n${me.name}`
export function ResignT({ sub, go }) {
  const s = useStore(); const me = useMe(); const [t, toast] = useToast()
  const br = s.branches.find((b) => b.id === me.branch)?.name || ''
  const mine = s.resigns.filter((r) => r.emp === ME)
  const tpl = async () => { try { await save(new Blob([textPdf(TEMPLATE_RESIGN(me, br))], { type: 'application/pdf' }), 'Template Surat Pengunduran Diri.pdf'); toast('Template diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  if (sub === 'baru') return <ResignForm go={go} tpl={tpl} />
  if (sub) { const r = mine.find((x) => x.id === sub); return r ? <ResignDetail r={r} go={go} /> : <Empty text="Pengajuan tidak ditemukan." /> }
  const aktif = mine.find((r) => r.status === 'Waiting' || r.status === 'Approved')
  return (
    <><PageHead title="Resign Overview" sub="Ajukan paling lambat 30 hari sebelum hari kerja terakhir." />
      {!aktif && <section className="card farewell-card"><Sticker name="resign" size={124} /><div className="grow"><h2>Ending gracefully</h2><p className="muted">Siapkan langkah berikutnya dengan rapi. Pengajuanmu juga berisi daftar barang kantor yang perlu dikembalikan.</p></div>
        <div className="row-act"><Btn kind="ghost" icon="download" onClick={tpl}>Template surat resign</Btn><Btn onClick={() => go('resign/baru')}>Create request</Btn></div></section>}
      {mine.length > 0 && <div className="rs-list">{[...mine].reverse().map((r) => <button key={r.id} className="slip-card" onClick={() => go('resign/' + r.id)}><span className="pf-ic"><Icon name="doc" size={18} /></span><span className="grow"><strong>{me.name}</strong><small>Hari terakhir {fmtDate(r.lastDay)} · diajukan {fmtDate(r.diajukan)}</small></span><Badge>{r.status}</Badge><Icon name="arrowRight" size={18} /></button>)}</div>}
      <p className="quote">“Sometimes, the hardest goodbyes lead to the most exciting new beginnings. Believe in yourself and the journey ahead!”</p>{t}</>
  )
}
function ResignForm({ go, tpl }) {
  const s = useStore(); const me = useMe(); const [t, toast] = useToast()
  const items = s.inventories.filter((i) => i.emp === ME && i.status === 'Accepted')
  const minDay = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const [f, setF] = useState({ lastDay: '', alasan: '', catatan: '', file: '', agree: false })
  const [ret, setRet] = useState(() => items.map((i) => ({ inv: i.id, kondisi: 'Baik', catatan: '', fotoKondisi: '', fotoSeri: '' })))
  const [tried, setTried] = useState(false); const [ask, setAsk] = useState(false); const [done, setDone] = useState(null)
  const setR = (i, k, v) => setRet(ret.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const errs = []
  if (!f.lastDay) errs.push('Pilih hari kerja terakhir'); else if (f.lastDay < minDay) errs.push('Hari terakhir minimal 30 hari dari hari ini')
  if (!f.alasan) errs.push('Pilih alasan resign')
  if (!f.file) errs.push('Unggah surat resign')
  ret.forEach((r, i) => { const it = items[i]; if (r.kondisi !== 'Hilang' && (!r.fotoKondisi || !r.fotoSeri)) errs.push(`${it.item}: foto kondisi dan foto nomor seri wajib`); if (r.kondisi !== 'Baik' && !r.catatan.trim()) errs.push(`${it.item}: jelaskan kondisi barang`) })
  if (done) return (
    <div className="gate"><div className="gate-art stk-art" aria-hidden="true"><span className="g1" /><Sticker name="resign" size={168} /></div>
      <h1>Pengajuanmu sudah terkirim</h1><p>Admin operasional dan Branch sudah dapat notifikasi untuk memeriksa {ret.length} barang yang akan kamu kembalikan. Kamu bisa memantau statusnya di Resign Overview.</p>
      <div className="gate-act"><Btn onClick={() => go('resign/' + done)}>Lihat pengajuan</Btn><Btn kind="ghost" icon="mail" onClick={() => go('inbox/tulis?to=hr&judul=Pengajuan%20Resign')}>Kirim pesan ke HR</Btn></div></div>)
  return (
    <><Crumb items={[['Resign', () => go('resign')], ['Form resign']]} /><PageHead title="Form Resign" sub="Isi data pengajuan dan kondisi barang kantor yang akan kamu kembalikan." />
      <div className="grid2 rs-grid">
        <div className="col-stack">
          <Card title="Informasi kontrak saat ini"><dl className="pf-dl"><div><dt>Tanggal masuk</dt><dd>{fmtDate(me.start)}</dd></div><div><dt>Tanggal keluar</dt><dd>{fmtDate(me.end)}</dd></div><div><dt>Tipe kontrak</dt><dd>{me.type}</dd></div><div><dt>Masa kerja</dt><dd>{masaKerja(me.start, f.lastDay || today())}</dd></div></dl></Card>
          <Card title="Informasi pengajuan resign"><div className="form">
            <Field label="Hari kerja terakhir" hint={tried && !f.lastDay ? 'Wajib diisi' : `Paling cepat ${fmtDate(minDay)}`}><input type="date" min={minDay} value={f.lastDay} aria-invalid={tried && (!f.lastDay || f.lastDay < minDay)} onChange={(e) => setF({ ...f, lastDay: e.target.value })} /></Field>
            <Field label="Alasan"><select value={f.alasan} aria-invalid={tried && !f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })}><option value="">Pilih alasan</option>{ALASAN.map((a) => <option key={a}>{a}</option>)}</select></Field>
            <div className="field"><span className="field-l">Catatan untuk HR (opsional)</span><RichText value={f.catatan} onChange={(v) => setF({ ...f, catatan: v })} placeholder="Ceritakan singkat bila perlu" minHeight={110} /></div>
            <Field label="Surat resign" hint={tried && !f.file ? 'Wajib diunggah' : 'PDF/DOCX, ditandatangani'}><div className="drop sm"><Icon name="upload" size={20} /><p>{f.file || 'Pilih berkas'}</p><input type="file" accept=".pdf,.docx" aria-label="Unggah surat resign" onChange={(e) => setF({ ...f, file: e.target.files[0]?.name || '' })} /></div></Field>
            <button type="button" className="tpl-row" onClick={tpl}><Icon name="doc" size={20} /><span className="grow">Template contoh surat pengunduran diri</span><span className="lnk">Download</span></button>
          </div></Card>
        </div>
        <Card title={`Pengembalian barang (${items.length})`}>
          {items.length === 0 ? <p className="muted" style={{ margin: 0 }}>Kamu tidak memegang barang kantor. Tidak ada yang perlu dikembalikan.</p> : <div className="ret-list">{items.map((it, i) => { const r = ret[i]; return (
            <div key={it.id} className="ret">
              <div className="ret-h"><span className="pf-ic"><Icon name="box" size={18} /></span><div className="grow"><strong>{it.item}</strong><small className="muted">{it.nomor} · No. seri {it.seri} · {it.jumlah || 1} unit</small></div></div>
              <div className="form two">
                <Field label="Kondisi saat dikembalikan"><select value={r.kondisi} onChange={(e) => setR(i, 'kondisi', e.target.value)}>{KONDISI.map((k) => <option key={k}>{k}</option>)}</select></Field>
                <Field label={r.kondisi === 'Baik' ? 'Catatan (opsional)' : 'Jelaskan kondisinya'}><input value={r.catatan} aria-invalid={tried && r.kondisi !== 'Baik' && !r.catatan.trim()} onChange={(e) => setR(i, 'catatan', e.target.value)} placeholder="Contoh: lengkap dengan charger" /></Field>
              </div>
              {r.kondisi !== 'Hilang' ? <div className="photo-pair">
                {[['fotoKondisi', 'Foto kondisi barang'], ['fotoSeri', 'Foto nomor seri']].map(([k, l]) => <label key={k} className={`photo-drop ${r[k] ? 'ok' : ''} ${tried && !r[k] ? 'bad' : ''}`}><Icon name={r[k] ? 'checkCircle' : 'camera'} size={22} /><span>{r[k] || l}</span><small>{r[k] ? 'Ganti foto' : 'Wajib · JPG/PNG'}</small><input type="file" accept="image/*" capture="environment" aria-label={l + ' ' + it.item} onChange={(e) => setR(i, k, e.target.files[0]?.name || '')} /></label>)}
              </div> : <Note>Barang hilang akan ditindaklanjuti HR sesuai kebijakan inventaris.</Note>}
            </div>) })}</div>}
          <p className="muted sm" style={{ margin: '16px 0 0' }}>Admin operasional akan memeriksa barang saat diserahkan dan mencocokkan nomor serinya, lalu mengunggah bukti serah terima.</p>
        </Card>
      </div>
      {tried && errs.length > 0 && <Note><div><b>Lengkapi dulu ya:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{errs.map((e) => <li key={e}>{e}</li>)}</ul></div></Note>}
      <div className="row-end"><label className="chk-l grow"><input type="checkbox" className="chk" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />Saya menyetujui aturan & kebijakan pengajuan resign dan pengembalian inventaris</label>
        <Btn kind="ghost" onClick={() => go('resign')}>Batal</Btn><Btn disabled={!f.agree} onClick={() => { setTried(true); if (!errs.length) setAsk(true) }}>Submit</Btn></div>
      <Modal open={ask} title="Kirim pengajuan resign?" onClose={() => setAsk(false)} footer={<><Btn kind="ghost" onClick={() => setAsk(false)}>Batal</Btn><Btn onClick={() => { const id = api.submitResign({ emp: ME, alasan: f.alasan, catatan: htmlText(f.catatan) || '—', lastDay: f.lastDay, lampiran: f.file, returns: ret }); setAsk(false); setDone(id) }}>Yakin, kirim</Btn></>}>
        <p style={{ margin: 0 }}>Hari kerja terakhirmu <b>{fmtDate(f.lastDay)}</b>. {ret.length ? `${ret.length} barang akan diperiksa admin operasional saat diserahkan.` : ''} Lanjutkan?</p>
      </Modal>{t}</>
  )
}
function ResignDetail({ r, go }) {
  const s = useStore(); const me = useMe()
  return (
    <><Crumb items={[['Resign', () => go('resign')], ['Detail']]} /><PageHead title="Detail Resign"><Badge>{r.status}</Badge></PageHead>
      <div className="grid2 rs-grid">
        <Card title="Resign application"><dl className="pf-dl"><div><dt>Hari terakhir</dt><dd>{fmtDate(r.lastDay)}</dd></div><div><dt>Diajukan</dt><dd>{fmtDate(r.diajukan)}</dd></div><div><dt>Alasan</dt><dd>{r.alasan}</dd></div><div><dt>Surat resign</dt><dd>{r.lampiran || '—'}</dd></div><div className="full"><dt>Catatan</dt><dd>{r.catatan || '—'}</dd></div><div className="full"><dt>Catatan admin</dt><dd>{r.catatanAdmin || 'Admin belum menambahkan catatan'}</dd></div></dl></Card>
        <Card title="Pengembalian barang">{(r.returns || []).length === 0 ? <p className="muted" style={{ margin: 0 }}>Tidak ada barang yang perlu dikembalikan.</p> : <div className="ret-list">{r.returns.map((x) => { const it = s.inventories.find((i) => i.id === x.inv) || {}; return (
          <div key={x.inv} className="ret"><div className="ret-h"><span className="pf-ic"><Icon name="box" size={18} /></span><div className="grow"><strong>{it.item}</strong><small className="muted">No. seri {it.seri} · kondisi dari kamu: {x.kondisi}</small></div><Badge t={x.cek === 'Diterima' ? 'ok' : x.cek === 'Bermasalah' ? 'bad' : 'warn'}>{x.cek}</Badge></div>
            {x.cek !== 'Menunggu pemeriksaan' && <dl className="pf-dl"><div><dt>Diperiksa</dt><dd>{x.at}</dd></div><div><dt>Bukti serah terima</dt><dd>{x.bukti}</dd></div><div className="full"><dt>Catatan pemeriksa</dt><dd>{x.catatanAdmin || '—'}</dd></div></dl>}</div>) })}</div>}</Card>
      </div>
      {r.status === 'Approved' && <p className="quote">Terima kasih atas kebersamaan dan kontribusimu, {me.name.split(' ')[0]}. Sukses selalu di perjalanan berikutnya!</p>}</>
  )
}

// =====================================================================
// Inventaris: penerimaan tidak langsung, ada pemeriksaan
// =====================================================================
const invTone = (st) => (st === 'Accepted' || st === 'Dikembalikan' ? 'ok' : st === 'Dilaporkan' ? 'bad' : 'warn')
const used = (d) => { if (!d) return '-'; const m = Math.round((Date.now() - new Date(d)) / (30.44 * 864e5)); const dd = Math.round((Date.now() - new Date(d)) / 864e5) % 30; return m ? `${m} bulan ${dd} hari` : `${dd} hari` }
export function InventarisT({ sub, go }) {
  const s = useStore()
  const mine = s.inventories.filter((i) => i.emp === ME)
  if (sub) { const it = mine.find((x) => x.id === sub); return it ? <InvDetail it={it} go={go} /> : <Empty text="Barang tidak ditemukan." /> }
  return (
    <><PageHead title="Inventaris" sub="Barang kantor yang dipinjamkan kepadamu. Barang baru perlu kamu periksa sebelum diterima." />
      {mine.length ? <div className="inv-grid">{mine.map((i) => <button key={i.id} className="inv-card" onClick={() => go('inventaris/' + i.id)}>
        <span className="pf-ic"><Icon name={i.kategori === 'Transportasi' ? 'pin' : 'box'} size={20} /></span>
        <span className="grow"><strong>{i.item}</strong><small>{i.kebutuhan}</small><small className="inv-used">Dipakai: <b>{i.status === 'Accepted' ? used(i.diterima) : '-'}</b></small></span>
        <Badge t={invTone(i.status)}>{i.status === 'Waiting' ? 'Perlu diperiksa' : i.status}</Badge></button>)}</div> : <Card><Empty text="Kamu belum memegang barang kantor." /></Card>}</>
  )
}
function InvDetail({ it, go }) {
  const [t, toast] = useToast(); const [f, setF] = useState({ seri: '', foto: '', kondisi: 'Baik', catatan: '', lengkap: false, agree: false }); const [tried, setTried] = useState(false); const [lapor, setLapor] = useState(false); const [why, setWhy] = useState('')
  const seriOk = f.seri.trim().toUpperCase() === (it.seri || '').toUpperCase()
  const ok = seriOk && f.foto && f.lengkap && f.agree && (f.kondisi === 'Baik' || f.catatan.trim())
  return (
    <><Crumb items={[['Inventaris', () => go('inventaris')], [it.item]]} /><PageHead title={it.item} sub={it.nomor}><Badge t={invTone(it.status)}>{it.status === 'Waiting' ? 'Perlu diperiksa' : it.status}</Badge></PageHead>
      <div className="grid2 rs-grid">
        <div className="col-stack">
          <Card title="Detail barang"><dl className="pf-dl"><div><dt>Kategori</dt><dd>{it.kategori}</dd></div><div><dt>Jumlah</dt><dd>{it.jumlah || 1} unit</dd></div><div><dt>Nomor seri</dt><dd>{it.status === 'Waiting' ? 'Cocokkan dengan barang' : it.seri}</dd></div><div><dt>Tanggal diserahkan</dt><dd>{fmtDate(it.tanggal)}</dd></div><div className="full"><dt>Kebutuhan</dt><dd>{it.kebutuhan}</dd></div></dl></Card>
          <Card title="Catatan admin"><p style={{ margin: 0 }}>{it.catatanAdmin || 'Admin tidak menambahkan catatan.'}</p></Card>
          {it.diterima && <Card title="Diterima"><dl className="pf-dl"><div><dt>Tanggal diterima</dt><dd>{fmtDate(it.diterima)}</dd></div><div><dt>Lama dipakai</dt><dd>{used(it.diterima)}</dd></div><div><dt>Kondisi saat diterima</dt><dd>{it.kondisiTerima || 'Baik'}</dd></div><div><dt>Foto penerimaan</dt><dd>{it.fotoTerima || '—'}</dd></div></dl></Card>}
          {it.status === 'Dilaporkan' && <Note>Kamu melaporkan barang ini tidak sesuai: “{it.laporan}”. Admin akan menghubungimu.</Note>}
        </div>
        {it.status === 'Waiting' && <Card title="Periksa sebelum menerima">
          <ol className="steps-v">
            <li className={seriOk ? 'done' : ''}><b>Cocokkan nomor seri</b><p className="muted sm">Lihat stiker/label di barang, lalu ketik nomornya.</p><input value={f.seri} placeholder="Contoh: SN-XXX-00000" aria-invalid={tried && !seriOk} onChange={(e) => setF({ ...f, seri: e.target.value })} aria-label="Nomor seri barang" />{f.seri && !seriOk && <span className="err-t" style={{ margin: 0 }}>Nomor seri belum cocok dengan data admin.</span>}</li>
            <li className={f.foto ? 'done' : ''}><b>Foto barang yang kamu terima</b><label className={`photo-drop ${f.foto ? 'ok' : ''} ${tried && !f.foto ? 'bad' : ''}`}><Icon name={f.foto ? 'checkCircle' : 'camera'} size={22} /><span>{f.foto || 'Ambil / pilih foto'}</span><input type="file" accept="image/*" capture="environment" aria-label="Foto barang" onChange={(e) => setF({ ...f, foto: e.target.files[0]?.name || '' })} /></label></li>
            <li className={f.lengkap ? 'done' : ''}><b>Kondisi & kelengkapan</b><div className="form two"><Field label="Kondisi"><select value={f.kondisi} onChange={(e) => setF({ ...f, kondisi: e.target.value })}><option>Baik</option><option>Ada kerusakan kecil</option></select></Field><Field label={f.kondisi === 'Baik' ? 'Catatan (opsional)' : 'Jelaskan kerusakannya'}><input value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} /></Field></div>
              <label className="chk-l"><input type="checkbox" className="chk" checked={f.lengkap} onChange={(e) => setF({ ...f, lengkap: e.target.checked })} />Barang dan kelengkapannya sudah saya periksa</label></li>
          </ol>
          <label className="chk-l"><input type="checkbox" className="chk" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />Saya menyetujui aturan & kebijakan penerimaan inventaris</label>
          <div className="row-end"><Btn kind="ghost" onClick={() => setLapor(true)}>Laporkan tidak sesuai</Btn><Btn disabled={!ok} onClick={() => { setTried(true); if (!ok) return; api.acceptInventory(it.id, { fotoTerima: f.foto, kondisiTerima: f.kondisi + (f.catatan ? ' · ' + f.catatan : '') }); toast('Barang diterima. Terima kasih sudah memeriksa!') }}>Accept</Btn></div>
        </Card>}
      </div>
      <Modal open={lapor} title="Laporkan barang tidak sesuai" onClose={() => setLapor(false)} footer={<><Btn kind="ghost" onClick={() => setLapor(false)}>Batal</Btn><Btn disabled={!why.trim()} onClick={() => { api.reportInventory(it.id, why.trim()); setLapor(false); toast('Laporan terkirim ke admin') }}>Kirim laporan</Btn></>}>
        <Field label="Apa yang tidak sesuai?" hint="Contoh: nomor seri berbeda, kabel tidak ada, layar retak."><textarea rows={4} value={why} onChange={(e) => setWhy(e.target.value)} /></Field></Modal>{t}</>
  )
}

// =====================================================================
// Biodata & Berkas (sama dengan detail di admin/branch, bisa diubah)
// =====================================================================
export function BiodataT() {
  const me = useMe()
  return <><PageHead title="Biodata & Berkas" sub="Data ini dipakai HR untuk kontrak, BPJS, dan payroll. Pastikan selalu terbaru." /><TalentBio person={me} editable /></>
}

// =====================================================================
// Inbox: notifikasi + pesan antar karyawan
// =====================================================================
export function InboxT({ sub, go }) {
  const s = useStore(); const [tab, setTab] = useState('Notifikasi'); const [open, setOpen] = useState(null)
  const nameOf = (id) => (id === 'hr' ? 'HR' : s.employees.find((e) => e.id === id)?.name || id)
  // Kontrak berakhir: pesan dengan pegawai di tempat kerja sebelumnya & notifikasi menu kerja disembunyikan sampai ada kontrak baru
  const phase = talentPhase(s, ME); const alumni = phase === 'selesai'; const kandidat = phase === 'kandidat'
  if ((alumni || kandidat) && sub) return <><Empty text={kandidat ? 'Pesan antar karyawan bisa dipakai setelah kamu bergabung sebagai karyawan.' : 'Percakapan dengan rekan kerja di tempat sebelumnya sudah tidak bisa dibuka karena kontrakmu berakhir.'} /><div className="row-end"><Btn kind="ghost" onClick={() => go('inbox')}>Kembali ke Inbox</Btn></div></>
  if (sub && sub.startsWith('c-')) return <ChatPage go={go} other={sub.slice(2)} />
  if (sub && sub.startsWith('tulis')) { const q = new URLSearchParams(sub.split('?')[1] || ''); return <Compose go={go} to={q.get('to') || ''} judul={q.get('judul') || ''} /> }
  const masuk = alumni || kandidat ? [] : s.messages.filter((m) => m.to === ME); const keluar = alumni || kandidat ? [] : s.messages.filter((m) => m.from === ME)
  // Notifikasi per akun: n.emp = penerima; notifikasi tanpa emp (blast, payslip, event) hanya untuk karyawan
  const notif = s.inbox.filter((n) => n.to === 'talent' && (n.emp ? n.emp === ME : !kandidat) && !(alumni && n.menu && KERJA_TUTUP.includes(n.menu.split('/')[0])))
  const list = tab === 'Notifikasi' ? notif : tab === 'Pesan masuk' ? masuk : keluar
  return (
    <><ArtHead art="surat" title="Inbox" sub={kandidat ? 'Kabar lamaran, tawaran, dan jadwal wawancara dari Branch.' : 'Notifikasi dari HR & sistem, dan pesan dari rekan kerja.'}>{!alumni && !kandidat && <Btn icon="send" onClick={() => go('inbox/tulis')}>Tulis pesan</Btn>}</ArtHead>
      {alumni && <Note><div>Kontrakmu sudah berakhir, jadi pesan dengan pegawai di tempat kerja sebelumnya disembunyikan. Pesan akan muncul lagi bersama rekan kerja baru saat kamu punya kontrak baru di perusahaan pengguna Kirana.</div></Note>}
      <Tabs tabs={['Notifikasi', `Pesan masuk${masuk.filter((m) => !m.dibaca).length ? ` (${masuk.filter((m) => !m.dibaca).length})` : ''}`, 'Terkirim']} value={tab === 'Pesan masuk' ? `Pesan masuk${masuk.filter((m) => !m.dibaca).length ? ` (${masuk.filter((m) => !m.dibaca).length})` : ''}` : tab} onChange={(v) => setTab(v.startsWith('Pesan masuk') ? 'Pesan masuk' : v)} />
      <Card pad={false}>{list.length === 0 ? <Empty text={tab === 'Terkirim' ? 'Belum ada pesan terkirim.' : 'Belum ada pesan.'} /> : <ul className="msg-list">{list.map((m) => (
        <li key={m.id}><button className={`msg ${tab === 'Pesan masuk' && !m.dibaca ? 'unread' : ''}`} onClick={() => { if (tab !== 'Notifikasi') go('inbox/c-' + (tab === 'Terkirim' ? m.to : m.from)); else if (m.menu) go(m.menu) }}>
          <Avatar name={tab === 'Notifikasi' ? 'Kirana' : nameOf(tab === 'Terkirim' ? m.to : m.from)} size={36} />
          <span className="grow"><span className="msg-top"><strong>{tab === 'Notifikasi' ? m.judul : nameOf(tab === 'Terkirim' ? m.to : m.from)}</strong><small>{m.waktu}</small></span><span className="msg-sub">{tab === 'Notifikasi' ? m.isi : <><b>{m.judul}</b> · {htmlText(m.html)}</>}</span></span></button></li>))}</ul>}</Card>
      <Modal open={!!open} title={open?.judul || ''} onClose={() => setOpen(null)} footer={<>{open && open.from !== ME && <Btn kind="ghost" icon="send" onClick={() => go(`inbox/tulis?to=${open.from}&judul=${encodeURIComponent('Re: ' + open.judul)}`)}>Balas</Btn>}<Btn kind="ghost" onClick={() => setOpen(null)}>Tutup</Btn></>}>
        {open && <><p className="muted sm" style={{ margin: 0 }}>{open.from === ME ? 'Kepada ' + nameOf(open.to) : 'Dari ' + nameOf(open.from)} · {open.waktu}</p><div className="msg-body" dangerouslySetInnerHTML={{ __html: open.html }} /></>}
      </Modal></>
  )
}

// Percakapan ala WhatsApp Web: daftar obrolan di kiri, utas pesan di kanan, kolom tulis sama dengan "Tulis pesan"
const chatTime = (w) => (w || '').slice(11, 16)
const chatDay = (w) => { const d = (w || '').slice(0, 10); const t = today(); const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); return d === t ? 'Hari ini' : d === y ? 'Kemarin' : fmtDate(d) }
function ChatPage({ go, other }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast()
  const [q, setQ] = useState(''); const [judul, setJudul] = useState(''); const [html, setHtml] = useState(''); const [tried, setTried] = useState(false); const [key, setKey] = useState(0)
  const person = (id) => (id === 'hr' ? { id: 'hr', name: 'HR (Human Capital)', role: 'Tim HR', branch: '' } : s.employees.find((e) => e.id === id) || { id, name: id })
  const mine = s.messages.filter((m) => m.from === ME || m.to === ME)
  const peers = [...new Set(mine.map((m) => (m.from === ME ? m.to : m.from)))]
  if (!peers.includes(other)) peers.unshift(other)
  const convs = peers.map((id) => { const ms = mine.filter((m) => m.from === id || m.to === id).sort((a, b) => a.waktu.localeCompare(b.waktu)); return { id, p: person(id), last: ms[ms.length - 1], unread: ms.filter((m) => m.from === id && !m.dibaca).length } })
    .filter((c) => c.p.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.last?.waktu || '').localeCompare(a.last?.waktu || ''))
  const thread = mine.filter((m) => m.from === other || m.to === other).sort((a, b) => a.waktu.localeCompare(b.waktu))
  const lastJudul = thread.length ? thread[thread.length - 1].judul : ''
  React.useEffect(() => { thread.filter((m) => m.from === other && !m.dibaca).forEach((m) => api.readMessage(m.id)); setJudul(lastJudul ? (lastJudul.startsWith('Re: ') ? lastJudul : 'Re: ' + lastJudul) : ''); setHtml(''); setTried(false); setKey((k) => k + 1) }, [other])
  React.useEffect(() => { const el = document.querySelector('.wa-thread'); if (el) el.scrollTop = el.scrollHeight }, [thread.length, other])
  const p = person(other)
  const kirim = () => { setTried(true); if (!judul.trim() || !htmlText(html)) return; api.sendMessage({ from: ME, to: other, judul: judul.trim(), html }); setHtml(''); setKey((k) => k + 1); setTried(false); toast('Pesan terkirim') }
  let lastDay = ''
  return (
    <><Crumb items={[['Inbox', () => go('inbox')], [p.name]]} />
      <div className="wa">
        <aside className="wa-list" aria-label="Daftar percakapan">
          <div className="wa-list-h"><span className="search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari percakapan" aria-label="Cari percakapan" /></span>
            <button className="icon-btn" aria-label="Tulis pesan baru" onClick={() => go('inbox/tulis')}><Icon name="edit" size={18} /></button></div>
          <ul>{convs.map((c) => <li key={c.id}><button className={`wa-conv ${c.id === other ? 'on' : ''}`} onClick={() => go('inbox/c-' + c.id)}>
            <Avatar name={c.p.name} size={42} /><span className="grow"><span className="wa-top"><strong>{c.p.name}</strong><small>{c.last ? (chatDay(c.last.waktu) === 'Hari ini' ? chatTime(c.last.waktu) : chatDay(c.last.waktu)) : ''}</small></span>
              <span className="wa-snip">{c.last ? (c.last.from === ME ? 'Kamu: ' : '') + htmlText(c.last.html) : 'Belum ada pesan'}</span></span>{c.unread > 0 && <span className="wa-badge">{c.unread}</span>}</button></li>)}</ul>
        </aside>
        <section className="wa-main" aria-label={'Percakapan dengan ' + p.name}>
          <header className="wa-head"><button className="icon-btn wa-back" aria-label="Kembali ke Inbox" onClick={() => go('inbox')}><Icon name="back" size={18} /></button><Avatar name={p.name} size={40} /><div className="grow"><strong>{p.name}</strong><small className="muted">{p.role}{p.branch ? ' · ' + branch(p.branch) : ''}</small></div></header>
          <div className="wa-thread" aria-live="polite">
            {thread.length === 0 && <p className="wa-empty">Belum ada pesan. Mulai percakapan dengan {p.name.split(' ')[0]} di bawah.</p>}
            {thread.map((m) => { const d = chatDay(m.waktu); const show = d !== lastDay; lastDay = d; const me = m.from === ME; return (
              <React.Fragment key={m.id}>{show && <div className="wa-day"><span>{d}</span></div>}
                <div className={`wa-msg ${me ? 'me' : ''}`}><div className="wa-bub"><b className="wa-subj">{m.judul}</b><div className="wa-body" dangerouslySetInnerHTML={{ __html: m.html }} /><span className="wa-meta">{chatTime(m.waktu)}{me && <span className={`wa-tick ${m.dibaca ? 'read' : ''}`} aria-label={m.dibaca ? 'Dibaca' : 'Terkirim'}>✓✓</span>}</span></div></div></React.Fragment>) })}
          </div>
          <div className="wa-compose form compose">
            <Field label="Judul"><input value={judul} maxLength={100} aria-invalid={tried && !judul.trim()} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: Bahan rapat Kamis" /></Field>
            <div className="field"><span className="field-l">Isi pesan</span><RichText key={key} value={html} onChange={setHtml} minHeight={48} />{tried && !htmlText(html) && <span className="err-t" style={{ margin: 0 }}>Isi pesan belum ada.</span>}</div>
            <Btn icon="send" className="wa-send" onClick={kirim}>Kirim</Btn>
          </div>
        </section>
      </div>{t}</>
  )
}

function Compose({ go, to: to0, judul: j0 }) {
  const s = useStore(); const [t, toast] = useToast(); const { branch } = useLookup()
  const divisi = [...new Set(s.employees.map((e) => e.divisi).filter(Boolean))].sort()
  const [dv, setDv] = useState(''); const [q, setQ] = useState(''); const [to, setTo] = useState(to0); const [judul, setJudul] = useState(j0); const [html, setHtml] = useState(''); const [tried, setTried] = useState(false); const [openList, setOpenList] = useState(!to0)
  const people = s.employees.filter((e) => e.id !== ME && (!dv || e.divisi === dv) && e.name.toLowerCase().includes(q.toLowerCase()))
  const target = to === 'hr' ? { name: 'HR (Human Capital)', role: 'Tim HR', branch: '' } : s.employees.find((e) => e.id === to)
  const kirim = () => { setTried(true); if (!to || !judul.trim() || !htmlText(html)) return; api.sendMessage({ from: ME, to, judul: judul.trim(), html }); toast('Pesan terkirim'); setTimeout(() => go('inbox/c-' + to), 400) }
  return (
    <><Crumb items={[['Inbox', () => go('inbox')], ['Tulis pesan']]} /><PageHead title="Tulis pesan" sub="Kirim pesan ke rekan kerja di Branch mana pun." />
      <Card className="compose-card"><div className="form compose">
        <div className="field"><span className="field-l">Kepada</span>
          {target && !openList ? <div className="to-chip"><Avatar name={target.name} size={28} /><span className="grow"><strong>{target.name}</strong><small className="muted">{target.role}{target.branch ? ' · ' + branch(target.branch) : ''}</small></span><button type="button" className="icon-btn" aria-label="Ganti penerima" onClick={() => setOpenList(true)}><Icon name="x" size={16} /></button></div>
            : <div className="to-pick">
              <div className="to-filters"><select value={dv} onChange={(e) => setDv(e.target.value)} aria-label="Divisi"><option value="">Semua divisi</option>{divisi.map((d) => <option key={d}>{d}</option>)}</select>
                <span className="search"><Icon name="search" size={16} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama" aria-label="Cari nama penerima" /></span></div>
              <ul className="to-list" role="listbox" aria-label="Pilih penerima">{!dv && !q && <li><button type="button" onClick={() => { setTo('hr'); setOpenList(false) }}><Avatar name="HR" size={28} /><span className="grow"><strong>HR (Human Capital)</strong><small className="muted">Tim HR</small></span></button></li>}
                {people.map((e) => <li key={e.id}><button type="button" aria-selected={to === e.id} onClick={() => { setTo(e.id); setOpenList(false) }}><Avatar name={e.name} size={28} /><span className="grow"><strong>{e.name}</strong><small className="muted">{e.role} · {e.divisi || '—'} · {branch(e.branch)}</small></span></button></li>)}
                {!people.length && <li className="muted sm" style={{ padding: '10px 14px' }}>Tidak ada nama yang cocok.</li>}</ul>
              {tried && !to && <span className="err-t" style={{ margin: 0 }}>Pilih penerima dulu.</span>}</div>}
        </div>
        <Field label="Judul"><input value={judul} maxLength={100} aria-invalid={tried && !judul.trim()} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: Bahan rapat Kamis" /></Field>
        <div className="field"><span className="field-l">Isi pesan</span><RichText value={html} onChange={setHtml} />{tried && !htmlText(html) && <span className="err-t" style={{ margin: 0 }}>Isi pesan belum ada.</span>}</div>
      </div>
        <div className="row-end"><Btn kind="ghost" onClick={() => go('inbox')}>Batal</Btn><Btn icon="send" onClick={kirim}>Kirim</Btn></div></Card>{t}</>
  )
}

// =====================================================================
// Menu dari app STA
// =====================================================================
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export function EventT({ sub, go }) {
  if (sub) return <EventDetail id={sub} go={go} />
  const s = useStore(); const me = useMe(); const now = new Date(); const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const pre = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`
  const evs = s.events.filter((e) => (e.branch === 'all' || e.branch === me.branch) && e.tanggal.startsWith(pre)).sort((a, b) => (a.tanggal + a.mulai).localeCompare(b.tanggal + b.mulai))
  const libur = s.holidays.filter((h) => h.tanggal.startsWith(pre))
  const move = (d) => { const n = new Date(ym.y, ym.m + d, 1); setYm({ y: n.getFullYear(), m: n.getMonth() }) }
  return (
    <><ArtHead art="megaphone" title="Event" sub="Agenda kantor untuk Branch-mu dan acara semua Branch." />
      <div className="month-nav"><button className="icon-btn" aria-label="Bulan sebelumnya" onClick={() => move(-1)}><Icon name="back" size={18} /></button><strong>{BLN[ym.m]} {ym.y}</strong><button className="icon-btn" aria-label="Bulan berikutnya" onClick={() => move(1)}><Icon name="arrowRight" size={18} /></button></div>
      {evs.length ? <div className="ev-cards">{evs.map((e) => <button type="button" key={e.id} className="card ev-card ev-btn" onClick={() => go('event/' + e.id)} aria-label={`Lihat detail ${e.judul}`}><div className="ev-date-b"><b>{Number(e.tanggal.slice(8))}</b><small>{BLN[ym.m].slice(0, 3)}</small></div><div className="grow"><strong>{e.judul}</strong><p className="muted sm">{e.mulai}–{e.selesai} · {e.kategori}{e.branch === 'all' ? ' · Semua Branch' : ''}</p><p className="sm ev-desc">{e.deskripsi}</p></div><Icon name="arrowRight" size={18} /></button>)}</div> : <Card><Empty text={`Belum ada event di ${BLN[ym.m]}.`} icon="megaphone" title={`Belum ada acara di ${BLN[ym.m]}`} hint="Coba lihat bulan lain dengan tombol panah, atau cek lagi nanti." /></Card>}
      {libur.length > 0 && <Card title={`Libur ${BLN[ym.m]}`}><ul className="hol-list">{libur.map((h) => <li key={h.tanggal}><Badge t="bad">Libur</Badge><span><b>{fmtDate(h.tanggal)}</b>{h.nama}</span></li>)}</ul></Card>}</>
  )
}

function EventDetail({ id, go }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast(); const e = s.events.find((x) => x.id === id)
  if (!e) return <Empty text="Event tidak ditemukan." />
  const peserta = e.peserta === 'all' ? s.employees.filter((x) => e.branch === 'all' || x.branch === e.branch) : s.employees.filter((x) => (e.peserta || []).includes(x.id))
  const ikut = e.peserta === 'all' || (e.peserta || []).includes(ME)
  const d = new Date(e.tanggal + 'T00:00:00'); const hari = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const ics = async () => { const z = (t2) => e.tanggal.replace(/-/g, '') + 'T' + t2.replace(':', '') + '00'; const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kirana HRIS//ID', 'BEGIN:VEVENT', 'UID:' + e.id + '@kirana', 'DTSTART;TZID=Asia/Jakarta:' + z(e.mulai), 'DTEND;TZID=Asia/Jakarta:' + z(e.selesai), 'SUMMARY:' + e.judul, 'DESCRIPTION:' + (e.deskripsi || '').replace(/\n/g, ' '), e.link ? 'URL:' + e.link : '', 'LOCATION:' + (e.kategori === 'Online' ? 'Online' : branch(e.branch) || 'Kantor'), 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n'); try { await save(new Blob([txt], { type: 'text/calendar' }), e.judul.replace(/[^\w ]/g, '') + '.ics'); toast('Event ditambahkan ke file kalender') } catch (err) { toast('Unduhan diblokir di pratinjau ini') } }
  return (
    <><Crumb items={[['Event', () => go('event')], [e.judul]]} />
      <article className="card evd">
        <div className="evd-img">{e.gambar ? <img src={e.gambar} alt="" /> : <Sticker name="megaphone" size={150} />}</div>
        <div className="evd-body">
          <div className="chips"><Badge t={e.kategori === 'Online' ? 'neutral' : 'ok'}>{e.kategori}</Badge>{e.branch === 'all' ? <Badge t="warn">Semua Branch</Badge> : <Badge t="neutral">{branch(e.branch)}</Badge>}{ikut && <Badge t="ok">Kamu diundang</Badge>}</div>
          <h1>{e.judul}</h1>
          <dl className="evd-dl"><div><dt><Icon name="calendar" size={16} />Tanggal</dt><dd>{hari}</dd></div><div><dt><Icon name="clock" size={16} />Waktu</dt><dd>{e.mulai} – {e.selesai} WIB</dd></div><div><dt><Icon name="pin" size={16} />Lokasi</dt><dd>{e.kategori === 'Online' ? 'Online' : branch(e.branch) || 'Kantor'}</dd></div></dl>
          <p className="evd-desc">{e.deskripsi || 'Tidak ada deskripsi.'}</p>
          <div className="evd-act">{e.link && <a className="btn btn-primary" href={e.link} target="_blank" rel="noopener noreferrer"><Icon name="send" size={16} />Gabung meeting</a>}<Btn kind="ghost" icon="calendar" onClick={ics}>Tambah ke kalender</Btn></div>
        </div>
      </article>
      <Card title={`Peserta (${peserta.length})`}><div className="evd-ppl">{peserta.slice(0, 40).map((p) => <span key={p.id} className="evd-p"><Avatar name={p.name} size={32} /><span><b>{p.name}</b><small className="muted">{p.role}</small></span></span>)}</div></Card>{t}</>
  )
}
// Struktur tim dari Setup Aktivitas › Organisasi: atasan = node induk, rekan tim = node lain dengan atasan yang sama
export function teamOf(s, id) {
  const nodes = s.org?.nodes || []; const node = nodes.find((n) => n.emp === id)
  if (!node) return { node: null, atasan: null, peers: [], bawahan: [] }
  const up = node.parent ? nodes.find((n) => n.id === node.parent) : null
  const peers = node.parent ? nodes.filter((n) => n.parent === node.parent && n.id !== node.id && n.emp) : []
  const bawahan = nodes.filter((n) => n.parent === node.id && n.emp)
  return { node, atasan: up, peers, bawahan }
}
export function KaryawanT({ go, sub }) {
  const s = useStore(); const { branch } = useLookup(); const [q, setQ] = useState(''); const [dv, setDv] = useState('')
  if (sub) return <KaryawanDetail id={sub} go={go} />
  const t0 = today(); const off = s.leaves.filter((l) => l.status === 'Approved' && l.dari <= t0 && l.sampai >= t0).map((l) => l.emp)
  const divisi = [...new Set(s.employees.map((e) => e.divisi).filter(Boolean))].sort()
  const list = s.employees.filter((e) => e.id !== ME && (!dv || e.divisi === dv) && e.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <><ArtHead art="tim" title="Karyawan" sub="Direktori rekan kerja di semua Branch. Klik nama untuk melihat kontak, atasan, dan rekan timnya." />
      <div className="filters"><label className="fsel"><span>Divisi</span><select value={dv} onChange={(e) => setDv(e.target.value)}><option value="">Semua divisi</option>{divisi.map((d) => <option key={d}>{d}</option>)}</select></label><label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama" aria-label="Cari nama karyawan" /></span></label></div>
      <p className="muted sm" style={{ margin: 0 }}>Sedang cuti hari ini: <b>{off.length}</b> orang</p>
      <div className="dir-grid">{list.map((e) => <button key={e.id} className="dir" onClick={() => go('karyawan/' + e.id)}><Avatar name={e.name} size={44} /><span className="grow"><strong>{e.name}</strong><small>{e.role}</small><small>{e.divisi || '—'} · {branch(e.branch)}</small></span>{off.includes(e.id) && <Badge t="warn">Cuti</Badge>}</button>)}</div></>
  )
}
function KaryawanDetail({ id, go }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast()
  const e = s.employees.find((x) => x.id === id)
  if (!e) return <><Crumb items={[['Karyawan', () => go('karyawan')], ['Tidak ditemukan']]} /><Empty text="Data karyawan tidak ditemukan." /></>
  const { node, atasan, peers, bawahan } = teamOf(s, id)
  const empOf = (n) => s.employees.find((x) => x.id === n.emp)
  const t0 = today(); const cuti = s.leaves.some((l) => l.emp === id && l.status === 'Approved' && l.dari <= t0 && l.sampai >= t0)
  const bio = bioOf(e); const jabatan = node?.jabatan || e.role
  const divName = node?.divisi ? s.org.divisi.find((d) => d.id === node.divisi)?.name : ''
  const Person = ({ n, label }) => { const p = empOf(n); if (!p) return null; return <button type="button" className="dir" onClick={() => { go('karyawan/' + p.id); window.scrollTo?.(0, 0) }}><Avatar name={p.name} size={44} /><span className="grow"><strong>{p.name}{p.id === ME ? ' (Kamu)' : ''}</strong><small>{n.jabatan}</small><small>{label || branch(p.branch)}</small></span><Icon name="arrowRight" size={18} /></button> }
  const atasanEmp = atasan && empOf(atasan)
  return (
    <><Crumb items={[['Karyawan', () => go('karyawan')], [e.name]]} />
      <section className="card kd-head"><Avatar name={e.name} size={84} /><div className="grow"><h1>{e.name}{id === ME ? ' (Kamu)' : ''}</h1><p className="muted">{jabatan}{divName || e.divisi ? ' · ' + (divName || e.divisi) : ''} · {branch(e.branch)}</p>{cuti && <Badge t="warn">Sedang cuti hari ini</Badge>}</div>
        {id !== ME && <Btn icon="send" onClick={() => go('inbox/c-' + e.id)}>Kirim pesan</Btn>}</section>
      <div className="kd-grid">
        <Card title="Kontak"><div className="contact-copy">{[['mail', 'E-mail', bio.email], ['user', 'No. telepon', bio.hp]].map(([ic, l, v]) => <button key={l} type="button" className="cc-row" onClick={async () => { (await copyText(v)) ? toast(`${l} ${e.name.split(' ')[0]} disalin`) : toast('Browser menolak menyalin. Salin manual ya.') }} aria-label={`Salin ${l} ${v}`}><span className="li-ic"><Icon name={ic} size={18} /></span><span className="grow"><small className="muted">{l}</small><b>{v}</b></span><span className="cc-hint"><Icon name="copy" size={16} />Salin</span></button>)}</div></Card>
        <Card title="Atasan">{!node ? <p className="muted kd-empty">Posisi {e.name.split(' ')[0]} belum diatur di struktur organisasi.</p>
          : atasanEmp ? <Person n={atasan} /> : atasan ? <p className="muted kd-empty">Posisi atasan ({atasan.jabatan}) belum terisi.</p>
            : <p className="muted kd-empty">{e.name.split(' ')[0]} berada di posisi tertinggi ({node.jabatan}), jadi tidak memiliki atasan.</p>}</Card>
      </div>
      <Card title={`Rekan satu tim${peers.length ? ' · ' + peers.length + ' orang' : ''}`}>{!node ? <p className="muted kd-empty">Belum ada data tim.</p>
        : peers.length ? <div className="dir-grid">{peers.map((n) => <Person key={n.id} n={n} />)}</div>
          : !node.parent ? <p className="muted kd-empty">{e.name.split(' ')[0]} berada di posisi tertinggi, jadi tidak punya rekan setingkat.</p>
          : <p className="muted kd-empty">Belum ada rekan satu tim{atasanEmp ? ` di bawah ${atasanEmp.name}` : ''}. {e.name.split(' ')[0]} masih satu-satunya di timnya.</p>}</Card>
      {bawahan.length > 0 && <Card title={`Memimpin · ${bawahan.length} orang`}><div className="dir-grid">{bawahan.map((n) => <Person key={n.id} n={n} />)}</div></Card>}
      {t}</>
  )
}
export function FeedbackT() {
  const s = useStore(); const [t, toast] = useToast(); const [f, setF] = useState({ kategori: 'Aplikasi', isi: '', anonim: false })
  return (
    <><ArtHead art="notes" title="Feedback" sub="Masukanmu dibaca langsung oleh tim HR. Boleh tanpa nama." />
      <div className="grid2 rs-grid"><Card><div className="form">
        <Field label="Tentang"><select value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })}>{['Aplikasi', 'Lingkungan kerja', 'Kebijakan HR', 'Lainnya'].map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Masukanmu" hint={`${f.isi.length}/1000`}><textarea rows={6} maxLength={1000} value={f.isi} onChange={(e) => setF({ ...f, isi: e.target.value })} placeholder="Ceritakan apa yang bisa kami perbaiki" /></Field>
        <Toggle on={f.anonim} onChange={() => setF({ ...f, anonim: !f.anonim })} label="Kirim tanpa nama" />
      </div><div className="row-end"><Btn disabled={!f.isi.trim()} onClick={() => { api.sendFeedback({ emp: f.anonim ? null : ME, kategori: f.kategori, isi: f.isi.trim() }); setF({ ...f, isi: '' }); toast('Terima kasih! Masukanmu sudah terkirim') }}>Submit</Btn></div></Card>
        <Card title="Masukan terkirim">{s.feedbacks.filter((x) => x.emp === ME || x.emp === null).length ? <ul className="hol-list">{s.feedbacks.map((x) => <li key={x.id}><Badge t="neutral">{x.kategori}</Badge><span><b>{x.waktu}{x.emp === null ? ' · tanpa nama' : ''}</b>{x.isi}</span></li>)}</ul> : <p className="muted" style={{ margin: 0 }}>Belum ada masukan.</p>}</Card></div>{t}</>
  )
}
export function ReviewT() {
  const links = [['Panduan karyawan baru', 'Kebiasaan kerja, jam kantor, dan siapa yang dihubungi', 'doc'], ['Kebijakan cuti & lembur', 'Ringkasan aturan yang berlaku tahun ini', 'calendar'], ['Klinik & asuransi rekanan', 'Daftar fasilitas kesehatan yang bisa dipakai', 'checkCircle'], ['Survei kepuasan karyawan', 'Isi 5 menit, hasilnya dipakai untuk perbaikan', 'star'], ['Kanal pengaduan', 'Laporkan pelanggaran secara rahasia', 'lock']]
  return (
    <><PageHead title="Reviews & More" sub="Tautan penting dari HR. Isinya diatur admin di Setup Aktivitas." />
      <div className="dir-grid">{links.map(([n, d, ic]) => <a key={n} className="dir" href="#/" onClick={(e) => e.preventDefault()}><span className="pf-ic"><Icon name={ic} size={18} /></span><span className="grow"><strong>{n}</strong><small>{d}</small></span><Icon name="arrowRight" size={18} /></a>)}</div></>
  )
}
export function AkunT() {
  const me = useMe(); const [t, toast] = useToast(); const [p, setP] = useState({ lama: '', baru: '', ulang: '' }); const [tried, setTried] = useState(false)
  const kuat = p.baru.length >= 8 && /\d/.test(p.baru) && /[a-zA-Z]/.test(p.baru)
  const err = !p.lama ? 'Isi password lama' : !kuat ? 'Password baru minimal 8 karakter, berisi huruf dan angka' : p.baru !== p.ulang ? 'Konfirmasi password belum sama' : ''
  return (
    <><PageHead title="Akun & keamanan" sub="Kelola password dan baca kebijakan aplikasi." />
      <UjiOffline />
      <div className="grid2 rs-grid">
        <Card title="Ganti password"><div className="form">
          <Field label="Password lama"><input type="password" autoComplete="current-password" value={p.lama} onChange={(e) => setP({ ...p, lama: e.target.value })} /></Field>
          <Field label="Password baru" hint="Minimal 8 karakter, kombinasi huruf dan angka."><input type="password" autoComplete="new-password" value={p.baru} onChange={(e) => setP({ ...p, baru: e.target.value })} /></Field>
          <Field label="Ulangi password baru"><input type="password" autoComplete="new-password" value={p.ulang} onChange={(e) => setP({ ...p, ulang: e.target.value })} /></Field>
          {tried && err && <span className="err-t" style={{ margin: 0 }}>{err}</span>}
        </div><div className="row-end"><Btn onClick={() => { setTried(true); if (err) return; setP({ lama: '', baru: '', ulang: '' }); setTried(false); toast('Password diperbarui') }}>Simpan</Btn></div></Card>
        <Card title="Tentang aplikasi"><ul className="link-list">{['Syarat & ketentuan', 'Kebijakan privasi', 'Tentang Kirana'].map((x) => <li key={x}><button type="button" onClick={() => toast(x + ' akan ditampilkan di sini')}><span className="grow">{x}</span><Icon name="arrowRight" size={16} /></button></li>)}<li><span className="grow muted">Versi aplikasi</span><b>1.0.0</b></li></ul></Card>
      </div>{t}</>
  )
}
