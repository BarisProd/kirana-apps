// Revisi 16 Nov 2026: detail approval sebagai halaman, Inventaris, Organisasi, Kategori karyawan, draft form.
import React, { useEffect, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { drafts } from '../services/drafts.js'
import { rupiah } from '../services/payroll.js'
import { Btn, Card, Badge, Stat, Table, Modal, Field, Tabs, Toggle, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { HBars, SegBar } from '../components/charts.jsx'
import { statusOf } from '../data/assets.js'
import { Sticker, ArtHead } from '../components/Sticker.jsx'
import { useLookup, fmtDate, ApprovalLine, useExport, empGroups, PilihKaryawan } from './shared.jsx'
import { PengaturanCuti, TalentSettingCuti, PengaturanLembur, PengaturanReimburse, Rekap } from './admin4.jsx'

const Crumb = ({ items }) => <nav className="crumb" aria-label="Breadcrumb">{items.map((x, i) => (i < items.length - 1 ? <React.Fragment key={i}><button onClick={x[1]}>{x[0]}</button><span>›</span></React.Fragment> : <b key={i}>{x[0]}</b>))}</nav>
const Confirm = ({ open, text, onNo, onYes, yes = 'Yakin' }) => (
  <Modal open={!!open} title="Konfirmasi" onClose={onNo} footer={<><Btn kind="ghost" onClick={onNo}>Batal</Btn><Btn onClick={onYes}>{yes}</Btn></>}><div className="center"><span className="q-ic">?</span><p>{text}</p></div></Modal>
)
const FieldBox = ({ label, hint, children }) => <div className="field"><span className="field-l">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</div>
const Ro = ({ l, v }) => <div className="ro"><span className="ro-l">{l}</span><span className="ro-v">{v || '—'}</span></div>

// Draft otomatis: isian disimpan tiap berubah, dipulihkan saat halaman dibuka lagi.
export function useDraft(key, initial) {
  const load = () => { const saved = drafts.get(key); return { key, value: saved ? saved.value : initial, restored: !!saved, dirty: false } }
  const [st, setSt] = useState(load)
  const cur = st.key === key ? st : load() // kunci berganti (mis. pindah dari daftar ke form) → muat draft milik kunci itu
  useEffect(() => { if (st.key !== key) setSt(cur) })
  useEffect(() => { if (cur.dirty) drafts.set(key, cur.value) }, [key, cur.value, cur.dirty])
  const set = (v) => setSt({ ...cur, value: v, dirty: true })
  const clear = () => { drafts.clear(key); setSt({ ...cur, dirty: false, restored: false }) }
  const reset = () => { drafts.clear(key); setSt({ key, value: initial, dirty: false, restored: false }) }
  return { value: cur.value, set, clear, reset, restored: cur.restored, dirty: cur.dirty }
}
export const DraftBar = ({ d }) => (d.restored || d.dirty) ? (
  <div className="draftbar" role="status"><Icon name="doc" size={18} /><span className="grow">{d.restored && !d.dirty ? 'Draft sebelumnya dipulihkan. Lanjutkan dari isian terakhirmu.' : 'Draft tersimpan otomatis. Isian aman kalau halaman tertutup tidak sengaja.'}</span><Btn kind="ghost" onClick={d.reset}>Buang draft</Btn></div>
) : null

// Atasan langsung dibaca dari pohon organisasi
const atasanOf = (s, empId) => { const n = s.org.nodes.find((x) => x.emp === empId); const p = n && s.org.nodes.find((x) => x.id === n.parent); return p ? { jabatan: p.jabatan, name: s.employees.find((e) => e.id === p.emp)?.name } : null }

function EmpHead({ e, status }) {
  const { branch } = useLookup()
  return <Card><div className="who"><Avatar name={e.name} size={56} /><div className="grow"><strong className="lg">{e.name}</strong><div className="muted">{e.role} · {e.divisi || 'Tanpa divisi'} · {branch(e.branch)}</div></div><Badge>{status}</Badge></div></Card>
}
function Decide({ waiting, onDecide, label = 'pengajuan ini' }) {
  const [ask, setAsk] = useState(null)
  if (!waiting) return null
  return <><div className="row-end sticky-act"><Btn kind="ghost" icon="x" onClick={() => setAsk('no')}>Tolak</Btn><Btn icon="check" onClick={() => setAsk('yes')}>Setujui</Btn></div>
    <Confirm open={ask} text={<>Anda akan {ask === 'yes' ? 'menyetujui' : 'menolak'} {label}. Anda yakin?</>} onNo={() => setAsk(null)} onYes={() => { onDecide(ask === 'yes'); setAsk(null) }} /></>
}
function Komentar({ col, it }) {
  const [txt, setTxt] = useState(''); const [notif, setNotif] = useState(true); const [t, toast] = useToast()
  return <Card title="Komentar Admin">
    {(it.komentar || []).map((k, i) => <p key={i} className="komen"><b>{fmtDate(k.at)}</b> {k.text}</p>)}
    <textarea rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Tulis catatan untuk karyawan" aria-label="Komentar admin" />
    <div className="row-end"><label className="chk-l"><input type="checkbox" className="chk" checked={notif} onChange={(e) => setNotif(e.target.checked)} />Kirim notifikasi</label><Btn kind="ghost" icon="send" disabled={!txt.trim()} onClick={() => { api.comment(col, it.id, txt.trim()); setTxt(''); toast(notif ? 'Komentar dikirim ke karyawan' : 'Komentar disimpan') }}>Send</Btn></div>{t}
  </Card>
}

// ---------- Cuti / Lembur / Reimbursement: daftar + halaman detail ----------
function RequestAdmin({ page, title, sub, col, cols, dateKey, hint, role, go, extra = {}, actions }) {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast(); const [tab, setTab] = useState('Waiting')
  const ex = useExport({ title, rows: s[col], dateOf: (r) => r[dateKey], branchOf: (r) => emp(r.emp).branch,
    cols: [{ h: 'Karyawan', v: (r) => emp(r.emp).name }, { h: 'Branch', v: (r) => branch(emp(r.emp).branch) }, ...cols.map((c) => ({ h: c.h, v: (r) => (c.r ? c.r(r) : r[c.k]) })), { h: 'Status', v: (r) => r.status }] })
  if (sub && extra[sub]) return extra[sub]({ go })
  if (sub) {
    const it = s[col].find((x) => x.id === sub)
    if (!it) return <><Crumb items={[[title, () => go(page)], ['Tidak ditemukan']]} /><Empty text="Pengajuan tidak ditemukan." /></>
    const e = emp(it.emp); const boss = atasanOf(s, it.emp)
    return (
      <>
        <Crumb items={[[title, () => go(page)], [`Detail · ${e.name}`]]} />
        <EmpHead e={e} status={it.status} />
        <div className="grid2">
          <Card title={'Data pengajuan ' + title.toLowerCase()}><div className="bio-grid two">{cols.map((c) => <Ro key={c.h} l={c.h} v={c.r ? c.r(it) : it[c.k]} />)}<Ro l="Lampiran" v={it.lampiran || it.file || 'Tidak ada lampiran'} /></div></Card>
          <Card title="Approval line"><ApprovalLine line={it.line || [{ by: 'HR', status: it.status }]} />
            <p className="muted sm mt">Atasan langsung menurut organisasi: <b>{boss ? `${boss.name || 'belum diisi'} (${boss.jabatan})` : 'belum diatur'}</b>. Muara akhir selalu HR. Lewat batas waktu = otomatis tidak disetujui.</p></Card>
        </div>
        <Komentar col={col} it={it} />
        <Decide waiting={it.status === 'Waiting'} onDecide={(ok) => { api.decide(col, it.id, ok); toast(ok ? 'Disetujui pada level ini' : 'Pengajuan ditolak') }} />{t}
      </>
    )
  }
  const rows = ex.filtered.filter((r) => (tab === 'Semua' ? true : r.status === tab))
  return (
    <>
      <PageHead title={title} sub={hint}>{actions && actions(go)}</PageHead>
      {ex.bar}
      <Tabs tabs={['Waiting', 'Approved', 'Rejected', 'Semua']} value={tab} onChange={setTab} />
      <Card pad={false}><Table center rows={rows} empty="Tidak ada pengajuan untuk filter ini." cols={[{ h: 'Karyawan', r: (r) => <div className="who"><Avatar name={emp(r.emp).name} size={30} />{emp(r.emp).name}</div> }, ...cols, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> },
        { h: 'Approval', r: (r) => <a className="btn btn-ghost" href={`#/app/${role}/${page}/${r.id}`}>{r.status === 'Waiting' ? 'Tinjau' : 'Detail'}</a> }]} /></Card>
      <Note>Klik Tinjau untuk membuka halaman detail sebelum menyetujui atau menolak. Download mengikuti filter, bukan tab.</Note>
    </>
  )
}
const lemburBiaya = (r, e) => Math.round((e.thp * 0.8 / 173) * r.durasi * 2) // perkiraan: upah/jam (GP ÷ 173) × jam × pengali rata-rata 2
// Rute lama Pengaturan (cuti/pengaturan, dst.) dialihkan ke Setup Aktivitas
function Pindah({ go, to }) { React.useEffect(() => { go(to) }, []); return null } // eslint-disable-line react-hooks/exhaustive-deps
export const CutiAdmin = (p) => <RequestAdmin {...p} page="cuti" title="Cuti" dateKey="dari" hint="List & approval cuti. Jenis cuti dan Talent Setting diatur di Setup Aktivitas › Cuti." col="leaves"
  extra={{ pengaturan: (x) => <Pindah go={x.go} to="setup-aktivitas/cuti" />, 'talent-setting': (x) => <Pindah go={x.go} to="setup-aktivitas/cuti" /> }}
  actions={(go) => <Btn kind="ghost" icon="settings" onClick={() => go('setup-aktivitas/cuti')}>Pengaturan & Talent Setting</Btn>}
  cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Tanggal', r: (r) => fmtDate(r.dari) + (r.sampai !== r.dari ? ' – ' + fmtDate(r.sampai) : '') }, { h: 'Hari', k: 'hari' }, { h: 'Alasan', k: 'alasan' }]} />
export const LemburAdmin = (p) => <RequestAdmin {...p} page="lembur" title="Lembur" dateKey="tanggal" hint="List & approval lembur. Masuk otomatis ke remunerasi bulan berjalan setelah disetujui." col="overtimes"
  extra={{ pengaturan: (x) => <Pindah go={x.go} to="setup-aktivitas/lembur" />, rekap: (x) => <Rekap {...x} page="lembur" title="Lembur" col="overtimes" valueOf={(r) => r.durasi} valueLabel="Total jam" fmt={(v) => v + ' jam'} /> }}
  actions={(go) => <><Btn kind="ghost" icon="chart" onClick={() => go('lembur/rekap')}>Rekapan Lembur</Btn><Btn kind="ghost" icon="settings" onClick={() => go('setup-aktivitas/lembur')}>Pengaturan</Btn></>}
  cols={[{ h: 'Kegiatan', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Jam', k: 'jam' }, { h: 'Durasi', r: (r) => r.durasi + ' jam' }, { h: 'Tipe', k: 'tipe' }]} />
export const ReimburseAdmin = (p) => <RequestAdmin {...p} page="reimbursement" title="Reimbursement" dateKey="tanggal" hint="List & approval reimbursement. Limit per tahun per jenis; dibayar bersama gaji." col="reimbursements"
  extra={{ pengaturan: (x) => <Pindah go={x.go} to="setup-aktivitas/reimbursement" />, rekap: (x) => <Rekap {...x} page="reimbursement" title="Reimbursement" col="reimbursements" valueOf={(r) => r.nominal} valueLabel="Total Amount" fmt={rupiah} /> }}
  actions={(go) => <><Btn kind="ghost" icon="chart" onClick={() => go('reimbursement/rekap')}>Rekap</Btn><Btn kind="ghost" icon="settings" onClick={() => go('setup-aktivitas/reimbursement')}>Pengaturan</Btn></>}
  cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Judul', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Nominal', r: (r) => rupiah(r.nominal) }]} />

// ---------- Absensi ----------
const perluTinjau = (a) => (a.status === 'Terlambat' || a.reviewHR === 'Perlu persetujuan HR') && !a.verif
// Absen dari aplikasi yang dikirim saat offline / punya catatan server (jam HP berubah, di luar radius, lewat batas kirim)
const syncOf = (a) => Object.entries(a.sync || {})
const isOffline = (a) => syncOf(a).some(([, x]) => x.offline)
const flagsOf = (a) => syncOf(a).flatMap(([, x]) => x.flags || [])
function SyncCard({ a }) {
  const list = syncOf(a)
  if (!list.length) return null
  return (
    <Card title="Data dari aplikasi">
      <div className="sync-list">{list.map(([k, x]) => (
        <div key={k} className="sync-row">
          <div className="sync-h"><b>{k === 'in' ? 'Clock in' : 'Clock out'} · tercatat {(k === 'in' ? a.masuk : a.pulang) || '—'}</b>{x.offline ? <Badge t="warn">Dikirim offline</Badge> : <Badge t="ok">Online</Badge>}{x.perluHR && <Badge t="bad">Perlu persetujuan HR</Badge>}</div>
          <p className="muted sm" style={{ margin: 0 }}>Diterima server {x.diterima} · jam di HP {x.deviceJam}{a['kesehatan' + (k === 'in' ? 'Masuk' : 'Pulang')] ? ` · kondisi: ${a['kesehatan' + (k === 'in' ? 'Masuk' : 'Pulang')]}` : ''}{a['gps' + (k === 'in' ? 'Masuk' : 'Pulang')] ? ` · GPS ${a['gps' + (k === 'in' ? 'Masuk' : 'Pulang')].lat}, ${a['gps' + (k === 'in' ? 'Masuk' : 'Pulang')].lng} (±${a['gps' + (k === 'in' ? 'Masuk' : 'Pulang')].acc} m)` : ' · tanpa GPS'}</p>
          {x.flags?.length > 0 && <ul className="q-flags" style={{ margin: 0 }}>{x.flags.map((f) => <li key={f}>{f}</li>)}</ul>}
        </div>
      ))}</div>
      <p className="muted sm" style={{ margin: '8px 0 0' }}>Jam tercatat memakai jam server (dihitung ulang bila jam HP diubah). Absen offline yang terkirim lewat batas Setup Absen perlu persetujuan HR.</p>
    </Card>
  )
}
// Kolom Action Needed: Waiting (terlambat, belum ditinjau) · Done (sudah ditinjau) · No Action Needed
const actionNeeded = (a) => (perluTinjau(a) ? 'Waiting' : a.verif ? 'Done' : 'No Action Needed')
export function Absensi({ sub, go, role, me }) {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast(); const [kor, setKor] = useState(null)
  const ex = useExport({ title: 'Absensi', rows: s.attendance, dateOf: (r) => r.tanggal, branchOf: (r) => emp(r.emp).branch,
    cols: [{ h: 'Karyawan', v: (r) => emp(r.emp).name }, { h: 'Branch', v: (r) => branch(emp(r.emp).branch) }, { h: 'Tanggal', v: (r) => fmtDate(r.tanggal) }, { h: 'Masuk', v: (r) => r.masuk }, { h: 'Pulang', v: (r) => r.pulang }, { h: 'Lokasi', v: (r) => r.lokasi }, { h: 'Status', v: (r) => r.status }, { h: 'Action Needed', v: actionNeeded }, { h: 'Hasil Approval', v: (r) => r.verif || '-' }] })
  if (sub) {
    const a = s.attendance.find((x) => x.id === sub)
    if (!a) return <><Crumb items={[['Absensi', () => go('absensi')], ['Tidak ditemukan']]} /><Empty text="Data absensi tidak ditemukan." /></>
    const e = emp(a.emp)
    return (
      <>
        <Crumb items={[['Absensi', () => go('absensi')], [`Detail · ${e.name}`]]} />
        <EmpHead e={e} status={a.verif || (perluTinjau(a) ? 'Waiting' : a.status)} />
        <div className="grid2">
          <Card title="Data kehadiran"><div className="bio-grid two"><Ro l="Tanggal" v={fmtDate(a.tanggal)} /><Ro l="Status" v={a.status} /><Ro l="Jam masuk" v={a.masuk} /><Ro l="Jam pulang" v={a.pulang} /><Ro l="Lokasi" v={a.lokasi} /><Ro l="Shift" v={e.shift} /><Ro l="Keterangan" v={a.ket || (a.status === 'Terlambat' ? 'Terlambat dari jam masuk shift' : 'Sesuai jadwal')} /></div></Card>
          <Card title="Bukti absen"><div className="bukti">{a.fotoMasuk ? <img className="selfie-img" src={a.fotoMasuk} alt="Selfie clock in" /> : <div className="selfie-ph"><Icon name="camera" size={28} /><span>Foto selfie clock in</span></div>}{a.fotoPulang && <img className="selfie-img" src={a.fotoPulang} alt="Selfie clock out" />}<div className="selfie-ph"><Icon name="pin" size={28} /><span>Titik GPS · {a.lokasi}</span></div></div><p className="muted sm">Di aplikasi asli bagian ini menampilkan foto selfie dan peta lokasi saat absen.</p></Card>
        </div>
        <SyncCard a={a} />
        {perluTinjau(a) && a.reviewHR === 'Perlu persetujuan HR' ? <Note>Absensi ini punya catatan dari server ({flagsOf(a).filter((f) => !/demo/.test(f)).join('; ') || 'lihat Data dari aplikasi'}). Setujui bila bisa diterima; Tolak bila tidak dihitung hadir.</Note> : perluTinjau(a) ? <Note>Absensi ini terlambat, jadi perlu ditinjau admin. Setujui bila alasannya bisa diterima; Tolak bila tetap dihitung terlambat.</Note> : <Note>Absensi ini tidak memerlukan persetujuan.</Note>}
        <Decide label="absensi ini" waiting={perluTinjau(a)} onDecide={(ok) => { api.verifyAttendance(a.id, ok); toast(ok ? 'Absensi disetujui' : 'Absensi ditolak') }} />{t}
      </>
    )
  }
  const rows = ex.filtered
  return (
    <>
      <PageHead title="Absensi" sub="Data dari app & web (selfie + GPS). Input manual hanya untuk koreksi saat sistem error.">{(role === 'superadmin' || me?.perms?.includes('dashboard-absensi')) && <Btn kind="ghost" icon="chart" perm="r" onClick={() => go('dashboard-absensi')}>Dashboard Absensi</Btn>}{(role === 'superadmin' || me?.perms?.includes('potongan-absensi')) && <Btn kind="ghost" icon="wallet" perm="r" onClick={() => go('potongan-absensi')}>Potongan Absensi</Btn>}<Btn kind="ghost" icon="upload" onClick={() => setKor({ who: '', tanggal: '', masuk: '08:30', pulang: '17:30' })}>Koreksi manual</Btn></PageHead>
      {ex.bar}
      <div className="stats"><Stat label="Hadir" value={rows.filter((a) => a.status === 'Hadir').length} icon="checkCircle" /><Stat label="Terlambat" value={rows.filter((a) => a.status === 'Terlambat').length} icon="clock" /><Stat label="Cuti" value={rows.filter((a) => a.status === 'Cuti').length} icon="calendar" /><Stat label="Perlu ditinjau" value={rows.filter(perluTinjau).length} icon="eye" /></div>
      <Card pad={false}><Table center rows={rows} empty="Tidak ada data absensi untuk filter ini." cols={[{ h: 'Karyawan', r: (r) => <div className="who"><Avatar name={emp(r.emp).name} size={30} />{emp(r.emp).name}</div> }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Masuk', k: 'masuk' }, { h: 'Pulang', k: 'pulang' }, { h: 'Lokasi', k: 'lokasi' }, { h: 'Status', r: (r) => <div className="row-act"><Badge>{r.status}</Badge>{isOffline(r) && <Badge t="warn">Offline</Badge>}{r.reviewHR === 'Perlu persetujuan HR' && !r.verif && <Badge t="bad">Cek HR</Badge>}</div> },
        { h: 'Action Needed', r: (r) => { const x = actionNeeded(r); return <Badge t={x === 'Waiting' ? 'warn' : x === 'Done' ? 'ok' : 'neutral'}>{x}</Badge> } },
        { h: 'Approval', r: (r) => <div className="row-act">{r.verif && <Badge>{r.verif}</Badge>}<a className="btn btn-ghost" href={`#/app/${role}/absensi/${r.id}`}>{perluTinjau(r) ? 'Tinjau' : 'Detail'}</a></div> }]} /></Card>
      <Modal open={!!kor} title="Koreksi manual absensi" onClose={() => setKor(null)} footer={<><Btn kind="ghost" onClick={() => setKor(null)}>Batal</Btn><Btn disabled={!kor?.who || !kor?.tanggal} onClick={() => { const g = empGroups(s).find((x) => x.id === kor.who); const n = g ? g.members.length : 1; setKor(null); toast(`Koreksi absensi dicatat untuk ${n} karyawan`) }}>Save</Btn></>}>
        {kor && <div className="form"><PilihKaryawan value={kor.who} onChange={(v) => setKor({ ...kor, who: v })} all="Pilih karyawan atau kategori" />
          <Field label="Tanggal"><input type="date" value={kor.tanggal} onChange={(e) => setKor({ ...kor, tanggal: e.target.value })} /></Field>
          <div className="form two"><Field label="Jam masuk"><input type="time" value={kor.masuk} onChange={(e) => setKor({ ...kor, masuk: e.target.value })} /></Field><Field label="Jam pulang"><input type="time" value={kor.pulang} onChange={(e) => setKor({ ...kor, pulang: e.target.value })} /></Field></div>
          <p className="muted sm">Memilih kategori (mis. Laki-laki) menerapkan koreksi ke semua anggotanya sekaligus.</p></div>}
      </Modal>{t}
    </>
  )
}

// ---------- Resign ----------
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5)
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const noticeDays = (r) => dayDiff(r.diajukan, r.lastDay)
const sisaHari = (r) => dayDiff(todayStr(), r.lastDay)
// One month notice period: resign disetujui dan hari terakhir tinggal ≤ 30 hari lagi
const inNotice = (r) => r.status === 'Approved' && sisaHari(r) >= 0 && sisaHari(r) <= 30
const RS_CATS = [
  ['all', 'Semua pengajuan', 'layers', () => true, 'semua status'],
  ['Waiting', 'Diajukan', 'clock', (r) => r.status === 'Waiting', 'menunggu persetujuan'],
  ['Approved', 'Disetujui', 'checkCircle', (r) => r.status === 'Approved', 'resign disetujui'],
  ['notice', 'One month notice', 'calendar', inNotice, 'hari terakhir ≤ 30 hari lagi'],
  ['Rejected', 'Ditolak', 'x', (r) => r.status === 'Rejected', 'pengajuan ditolak'],
]
// Pemeriksaan pengembalian barang oleh admin operasional: bukti serah terima, foto kondisi, foto nomor seri, nomor seri cocok.
function ReturnCheck({ r, toast }) {
  const s = useStore(); const [cek, setCek] = useState(null); const blank = { hasil: 'Diterima', seriOk: false, bukti: '', fotoKondisi: '', fotoSeri: '', catatanAdmin: '' }; const [f, setF] = useState(blank); const [tried, setTried] = useState(false)
  const it = cek ? s.inventories.find((i) => i.id === cek.inv) || {} : {}
  const ok = f.bukti && f.fotoKondisi && f.fotoSeri && (f.hasil === 'Bermasalah' ? f.catatanAdmin.trim() : f.seriOk)
  return (
    <Card title={`Pengembalian inventaris · ${r.inventaris}`}>
      {r.returns.length === 0 ? <p className="muted" style={{ margin: 0 }}>Karyawan ini tidak memegang inventaris.</p> : <div className="ret-list">{r.returns.map((x) => { const i = s.inventories.find((v) => v.id === x.inv) || {}; return (
        <div key={x.inv} className="ret"><div className="ret-h"><span className="pf-ic"><Icon name="box" size={18} /></span><div className="grow"><strong>{i.item}</strong><small className="muted">{i.nomor} · No. seri {i.seri}</small></div><Badge t={x.cek === 'Diterima' ? 'ok' : x.cek === 'Bermasalah' ? 'bad' : 'warn'}>{x.cek}</Badge></div>
          <dl className="pf-dl"><div><dt>Kondisi menurut karyawan</dt><dd>{x.kondisi}{x.catatan ? ' · ' + x.catatan : ''}</dd></div><div><dt>Foto dari karyawan</dt><dd>{[x.fotoKondisi, x.fotoSeri].filter(Boolean).join(', ') || '—'}</dd></div>
            {x.cek !== 'Menunggu pemeriksaan' && <><div><dt>Bukti serah terima</dt><dd>{x.bukti}</dd></div><div><dt>Diperiksa</dt><dd>{x.at}</dd></div></>}</dl>
          {x.cek !== 'Diterima' && <div className="row-end"><Btn kind="ghost" icon="check" onClick={() => { setCek(x); setF(blank); setTried(false) }}>{x.cek === 'Bermasalah' ? 'Periksa ulang' : 'Periksa barang'}</Btn></div>}</div>) })}</div>}
      <Modal open={!!cek} title={'Periksa ' + (it.item || '')} onClose={() => setCek(null)} footer={<><Btn kind="ghost" onClick={() => setCek(null)}>Batal</Btn><Btn onClick={() => { setTried(true); if (!ok) return; api.checkReturn(r.id, cek.inv, { cek: f.hasil, bukti: f.bukti, fotoKondisiAdmin: f.fotoKondisi, fotoSeriAdmin: f.fotoSeri, catatanAdmin: f.catatanAdmin }); setCek(null); toast(f.hasil === 'Diterima' ? 'Barang diterima dan tercatat' : 'Pengembalian ditandai bermasalah') }}>Simpan hasil</Btn></>}>
        <p className="muted sm" style={{ margin: 0 }}>Nomor seri di data: <b>{it.seri}</b>. Pastikan sama dengan label di barang.</p>
        <div className="form">
          <Field label="Hasil pemeriksaan"><div className="seg">{['Diterima', 'Bermasalah'].map((h) => <button key={h} type="button" className={f.hasil === h ? 'on' : ''} onClick={() => setF({ ...f, hasil: h })}>{h}</button>)}</div></Field>
          <div className="photo-pair">{[['bukti', 'Bukti serah terima', '.pdf,image/*'], ['fotoKondisi', 'Foto kondisi barang', 'image/*'], ['fotoSeri', 'Foto nomor seri', 'image/*']].map(([k, l, acc]) => <label key={k} className={`photo-drop ${f[k] ? 'ok' : ''} ${tried && !f[k] ? 'bad' : ''}`}><Icon name={f[k] ? 'checkCircle' : k === 'bukti' ? 'upload' : 'camera'} size={22} /><span>{f[k] || l}</span><small>{f[k] ? 'Ganti' : 'Wajib'}</small><input type="file" accept={acc} aria-label={l} onChange={(e) => setF({ ...f, [k]: e.target.files[0]?.name || '' })} /></label>)}</div>
          {f.hasil === 'Diterima' && <label className="chk-l"><input type="checkbox" className="chk" checked={f.seriOk} onChange={(e) => setF({ ...f, seriOk: e.target.checked })} />Nomor seri barang sama dengan data ({it.seri})</label>}
          <Field label={f.hasil === 'Bermasalah' ? 'Jelaskan masalahnya' : 'Catatan (opsional)'}><textarea rows={3} value={f.catatanAdmin} aria-invalid={tried && f.hasil === 'Bermasalah' && !f.catatanAdmin.trim()} onChange={(e) => setF({ ...f, catatanAdmin: e.target.value })} /></Field>
          {tried && !ok && <span className="err-t" style={{ margin: 0 }}>Lengkapi bukti, kedua foto{f.hasil === 'Diterima' ? ', dan centang kecocokan nomor seri' : ', dan catatan masalah'}.</span>}
        </div>
      </Modal>
    </Card>
  )
}

export function ResignAdmin({ sub, go, role }) {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast(); const [rcat, setRcat] = useState('all')
  const ex = useExport({ title: 'Resign', rows: s.resigns, dateOf: (r) => r.lastDay, branchOf: (r) => emp(r.emp).branch,
    cols: [{ h: 'Karyawan', v: (r) => emp(r.emp).name }, { h: 'Branch', v: (r) => branch(emp(r.emp).branch) }, { h: 'Alasan', v: (r) => r.alasan }, { h: 'Hari terakhir', v: (r) => fmtDate(r.lastDay) }, { h: 'Inventaris', v: (r) => r.inventaris }, { h: 'Status', v: (r) => r.status }] })
  if (sub) {
    const r = s.resigns.find((x) => x.id === sub)
    if (!r) return <><Crumb items={[['Resign', () => go('resign')], ['Tidak ditemukan']]} /><Empty text="Pengajuan resign tidak ditemukan." /></>
    const e = emp(r.emp); const inv = s.inventories.filter((i) => i.emp === r.emp)
    return (
      <>
        <Crumb items={[['Resign', () => go('resign')], [`Detail · ${e.name}`]]} />
        <EmpHead e={e} status={r.status} />
        <div className="grid2">
          <Card title="Data pengajuan resign"><div className="bio-grid two"><Ro l="Tanggal pengajuan" v={fmtDate(r.diajukan)} /><Ro l="Hari terakhir bekerja" v={fmtDate(r.lastDay)} /><Ro l="Alasan" v={r.alasan} /><Ro l="Catatan" v={r.catatan} /><Ro l="Surat resign" v={r.lampiran || r.file || 'Belum diunggah'} /><Ro l="Mulai bekerja" v={fmtDate(e.start)} /></div></Card>
          {r.returns ? <ReturnCheck r={r} toast={toast} /> : <Card title="Pengembalian inventaris" pad={false}><Table center rows={inv} empty="Karyawan ini tidak memegang inventaris." cols={[{ h: 'Nomor', k: 'nomor' }, { h: 'Item', k: 'item' }, { h: 'Kategori', k: 'kategori' }, { h: 'Status', r: (i) => <Badge>{i.status}</Badge> }]} /><p className="muted sm pad">Status pengembalian: <b>{r.inventaris}</b></p></Card>}
        </div>
        <Komentar col="resigns" it={r} />
        <Note>Setelah disetujui, akun nonaktif otomatis H+14 dari tanggal resign. Sisa cuti: {s.setup.sisaCutiResign}.</Note>
        <Decide label="pengajuan resign ini" waiting={r.status === 'Waiting'} onDecide={(ok) => { api.decide('resigns', r.id, ok); toast(ok ? 'Resign disetujui. Akun nonaktif H+14' : 'Pengajuan resign ditolak') }} />{t}
      </>
    )
  }
  return (
    <><ArtHead art="hibur" title="Resign" sub={`Akun nonaktif otomatis H+14 dari tanggal resign. Sisa cuti: ${s.setup.sisaCutiResign}. Periksa pengembalian barang sebelum hari terakhir.`} />
      {ex.bar}
      {(() => { const base = ex.filtered; return <div className="rk-tiles" role="group" aria-label="Rekap status resign">{RS_CATS.map(([k, l, ic, fn, sub2]) => { const lst = base.filter(fn); const on = rcat === k; return (
        <button key={k} className={`rk-tile rs-${k} ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => { setRcat(k); setTimeout(() => document.getElementById('rs-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}>
          <span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{lst.length}</b><small>{sub2}</small>
          <small className="rk-br">{s.branches.map((b) => { const n = lst.filter((r) => emp(r.emp).branch === b.id).length; return n ? `${b.name.replace('Branch ', '')} ${n}` : null }).filter(Boolean).join(' · ') || '—'}</small></button>) })}</div> })()}
      <div id="rs-list" className="anchor" />
      <Card pad={false}><Table center rows={ex.filtered.filter((RS_CATS.find((c) => c[0] === rcat) || RS_CATS[0])[3])} empty="Tidak ada pengajuan resign untuk filter ini." cols={[{ h: 'Karyawan', r: (r) => <div className="who"><Avatar name={emp(r.emp).name} size={30} />{emp(r.emp).name}</div> }, { h: 'Alasan', k: 'alasan' }, { h: 'Diajukan', r: (r) => fmtDate(r.diajukan) }, { h: 'Hari terakhir', r: (r) => <div>{fmtDate(r.lastDay)}{noticeDays(r) < 30 && <div className="txt-warn sm">notice {noticeDays(r)} hari (&lt; 1 bulan)</div>}</div> }, { h: 'Pengembalian inventaris', r: (r) => <Badge>{r.inventaris}</Badge> },
        { h: 'Status', r: (r) => <div><Badge>{r.status}</Badge>{inNotice(r) && <div className="sm nowrap"><Badge t="warn">Notice · sisa {sisaHari(r)} hari</Badge></div>}</div> },
        { h: 'Approval', r: (r) => <a className="btn btn-ghost" href={`#/app/${role}/resign/${r.id}`}>{r.status === 'Waiting' ? 'Tinjau' : 'Detail'}</a> }]} /></Card>
      <Note>Filter Tahun & Bulan pada Resign memakai tanggal hari terakhir bekerja.</Note></>
  )
}

// ---------- Inventaris ----------
// Dropdown yang bisa diketik: daftar baru muncul saat kolom diklik atau diketik.
const EmpSearch = ({ value, onPick, branchId }) => {
  const s = useStore(); const cur = s.employees.find((e) => e.id === value)
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [hi, setHi] = useState(0)
  const list = s.employees.filter((e) => (!branchId || e.branch === branchId) && e.name.toLowerCase().includes(q.toLowerCase()))
  const pick = (e) => { onPick(e.id); setQ(''); setOpen(false) }
  const key = (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setOpen(true); setHi((h) => Math.min(list.length - 1, h + 1)) }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (ev.key === 'Enter' && open && list[hi]) { ev.preventDefault(); pick(list[hi]) }
    else if (ev.key === 'Escape') setOpen(false)
  }
  return (
    <div className="combo" onBlur={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget)) { setOpen(false); setQ('') } }}>
      <input role="combobox" aria-expanded={open} aria-autocomplete="list" aria-label="Nama karyawan" placeholder="Pilih atau ketik nama karyawan"
        value={open ? q : (cur ? cur.name : '')} onFocus={() => { setOpen(true); setHi(0) }} onClick={() => setOpen(true)} onChange={(ev) => { setQ(ev.target.value); setOpen(true); setHi(0) }} onKeyDown={key} />
      {cur && !open ? <button type="button" className="combo-x" aria-label="Kosongkan pilihan" title="Kosongkan" onClick={() => onPick('')}><Icon name="x" size={16} /></button> : <span className="combo-caret" aria-hidden="true">▾</span>}
      {open && <ul className="combo-list" role="listbox">{list.length ? list.map((e, i) => (
        <li key={e.id} role="option" aria-selected={e.id === value}><button type="button" tabIndex={-1} className={i === hi ? 'hi' : ''} onMouseEnter={() => setHi(i)} onClick={() => pick(e)}><strong>{e.name}</strong><small>{e.role} · {e.divisi || 'Tanpa divisi'}</small></button></li>)) : <li className="combo-empty">Tidak ada karyawan dengan nama itu.</li>}</ul>}
    </div>
  )
}
const dDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5)
const tdy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// Barang yang masih dipegang karyawan dengan pengajuan resign (Approved = wajib kembali sebelum hari terakhir)
export function resignReturns(s) {
  return s.resigns.filter((r) => r.status === 'Approved' || r.status === 'Waiting').map((r) => ({ r, items: s.inventories.filter((i) => i.emp === r.emp && i.status !== 'Returned'), sisa: dDiff(tdy(), r.lastDay) }))
    .filter((x) => x.items.length).sort((a, b) => (a.r.status === 'Approved' ? 0 : 1) - (b.r.status === 'Approved' ? 0 : 1) || a.sisa - b.sisa)
}
const urg = (x) => x.r.status !== 'Approved' ? ['neutral', 'Resign belum disetujui'] : x.sisa < 0 ? ['bad', `Lewat ${-x.sisa} hari`] : x.sisa <= 7 ? ['bad', `Sisa ${x.sisa} hari`] : x.sisa <= 30 ? ['warn', `Sisa ${x.sisa} hari`] : ['neutral', `Sisa ${x.sisa} hari`]
export function Inventaris({ sub, go, role }) {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast(); const [icat, setIcat] = useState('all')
  const [kat, setKat] = useState(null); const [del, setDel] = useState(null); const [view, setView] = useState(null)
  const blank = { branch: '', emp: '', kategori: '', item: '', kebutuhan: '', lampiran: [] }
  const d = useDraft('inventaris-baru', blank); const f = d.value; const set = (k, v) => d.set({ ...f, [k]: v })
  const ex = useExport({ title: 'Inventaris', rows: s.inventories, dateOf: (r) => r.tanggal, branchOf: (r) => emp(r.emp).branch,
    cols: [{ h: 'Nomor', v: (r) => r.nomor }, { h: 'Karyawan', v: (r) => emp(r.emp).name }, { h: 'Branch', v: (r) => branch(emp(r.emp).branch) }, { h: 'Kategori', v: (r) => r.kategori }, { h: 'Item', v: (r) => r.item }, { h: 'Kebutuhan', v: (r) => r.kebutuhan }, { h: 'Tanggal serah', v: (r) => fmtDate(r.tanggal) }, { h: 'Status', v: (r) => r.status }] })
  const nextNo = `INV-${new Date().getFullYear()}-${String(Math.max(0, ...s.inventories.map((i) => Number((i.nomor || '').split('-')[2]) || 0)) + 1).padStart(4, '0')}`
  if (sub === 'baru') {
    const ok = f.emp && f.kategori && f.item.trim()
    return (
      <>
        <Crumb items={[['Inventaris', () => go('inventaris')], ['Add New']]} />
        <PageHead title="Add New Inventaris" sub="Serahkan barang milik kantor ke karyawan tertentu. Karyawan menerimanya lewat app/web." />
        <DraftBar d={d} />
        <Card><div className="form two">
          <Field label="Nomor Inventaris" hint="Dibuat otomatis oleh sistem saat disimpan."><input disabled value={nextNo} /></Field>
          <Field label="Branch"><select value={f.branch} onChange={(e) => d.set({ ...f, branch: e.target.value, emp: '' })}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <FieldBox label="Nama Karyawan"><EmpSearch value={f.emp} branchId={f.branch} onPick={(v) => set('emp', v)} /></FieldBox>
          <FieldBox label="Kategori" hint={<button type="button" className="linkbtn" onClick={() => setKat({ id: null, name: '' })}>+ Buat kategori baru</button>}><select aria-label="Kategori" value={f.kategori} onChange={(e) => set('kategori', e.target.value)}><option value="">Pilih kategori</option>{s.invCategories.map((c) => <option key={c.id}>{c.name}</option>)}</select></FieldBox>
          <Field label="Ambil dari stok aset (opsional)" hint="Pilih barang yang sudah tercatat di Audit Aset. Kosongkan bila barang baru, akan dicatat otomatis."><select value={f.asset || ''} onChange={(e) => { const a = s.assets.find((x) => x.id === e.target.value); d.set({ ...f, asset: e.target.value, ...(a ? { item: a.nama, kategori: a.kategori } : {}) }) }}><option value="">Barang baru (bukan dari stok)</option>{s.assets.filter((a) => statusOf(s, a) === 'Tersedia' && a.kondisi !== 'Rusak berat' && (!f.kategori || a.kategori === f.kategori)).map((a) => <option key={a.id} value={a.id}>{a.kode} · {a.nama}</option>)}</select></Field>
          <Field label="Item"><input value={f.item} onChange={(e) => set('item', e.target.value)} placeholder="Mis. Laptop 14 inci, nomor seri ABC123" /></Field>
          <Field label="Kebutuhan"><input value={f.kebutuhan} onChange={(e) => set('kebutuhan', e.target.value)} placeholder="Dipakai untuk apa" /></Field>
          <Field label="Lampiran (boleh lebih dari satu)"><span className={`upl ${f.lampiran.length ? 'has' : ''}`}><Icon name="upload" size={18} /><span>{f.lampiran.length ? f.lampiran.join(', ') : 'Foto barang atau berita acara serah terima'}</span><input type="file" multiple aria-label="Lampiran inventaris" onChange={(e) => set('lampiran', [...e.target.files].map((x) => x.name))} /></span></Field>
        </div>
        <div className="row-end"><Btn kind="ghost" onClick={() => go('inventaris')}>Cancel</Btn><Btn icon="send" disabled={!ok} onClick={() => { api.addInventory({ emp: f.emp, kategori: f.kategori, item: f.item.trim(), kebutuhan: f.kebutuhan.trim(), lampiran: f.lampiran, asset: f.asset || undefined }); d.clear(); go('inventaris') }}>Send</Btn></div></Card>
        <EmpInventory empId={f.emp} kategori={f.kategori} />
        <KatModal kat={kat} setKat={setKat} onSaved={(n) => { set('kategori', n); toast('Kategori dibuat') }} />{t}
      </>
    )
  }
  if (sub === 'dashboard') return <InvDashboard go={go} />
  if (sub === 'kategori') {
    const used = (n) => s.inventories.filter((i) => i.kategori === n).length
    return (
      <>
        <Crumb items={[['Inventaris', () => go('inventaris')], ['Master Kategori']]} />
        <PageHead title="Master Kategori Inventaris" sub="Kelompok barang milik kantor."><Btn icon="plus" onClick={() => setKat({ id: null, name: '' })}>Kategori baru</Btn></PageHead>
        <Card pad={false}><Table center rows={s.invCategories} empty="Belum ada kategori." cols={[{ h: 'No', r: (r) => s.invCategories.indexOf(r) + 1 }, { h: 'Kategori', r: (r) => <strong>{r.name}</strong> }, { h: 'Barang terdaftar', r: (r) => used(r.name) },
          { h: 'Action', r: (r) => <div className="row-act"><button className="icon-btn" title="Edit" aria-label={'Edit ' + r.name} onClick={() => setKat({ id: r.id, name: r.name })}><Icon name="edit" size={18} /></button><button className="icon-btn" title={used(r.name) ? 'Masih dipakai barang' : 'Hapus'} aria-label={'Hapus ' + r.name} disabled={used(r.name) > 0} onClick={() => setDel(r)}><Icon name="trash" size={18} /></button></div> }]} /></Card>
        <Note>Kategori yang masih dipakai barang tidak bisa dihapus.</Note>
        <KatModal kat={kat} setKat={setKat} onSaved={() => toast('Kategori tersimpan')} />
        <Confirm open={del} yes="Hapus" text={<>Hapus kategori <b>{del?.name}</b>?</>} onNo={() => setDel(null)} onYes={() => { api.deleteInvCategory(del.id); setDel(null); toast('Kategori dihapus') }} />{t}
      </>
    )
  }
  const rsEmp = new Set(s.resigns.filter((r) => r.status === 'Approved').map((r) => r.emp))
  const ICATS = [['all', 'Semua barang', 'box', () => true], ['Waiting', 'Menunggu diterima', 'clock', (r) => r.status === 'Waiting'], ['Accepted', 'Dipegang karyawan', 'checkCircle', (r) => r.status === 'Accepted'],
    ['Returned', 'Sudah dikembalikan', 'back', (r) => r.status === 'Returned'], ['resign', 'Wajib kembali (resign)', 'bell', (r) => r.status !== 'Returned' && rsEmp.has(r.emp)]]
  return (
    <>
      <PageHead title="Inventaris" sub="Barang milik kantor yang diserahkan ke karyawan. Nomor inventaris dibuat otomatis oleh sistem.">
        <Btn kind="ghost" icon="chart" perm="r" onClick={() => go('inventaris/dashboard')}>Dashboard</Btn><Btn kind="ghost" icon="approval" perm="r" onClick={() => go('audit-aset')}>Audit Aset</Btn><Btn kind="ghost" icon="layers" onClick={() => go('inventaris/kategori')}>Master Kategori</Btn><Btn icon="plus" onClick={() => go('inventaris/baru')}>{drafts.get('inventaris-baru') ? 'Lanjutkan draft' : 'Add New'}</Btn>
      </PageHead>
      {ex.bar}
      {(() => { const rr = resignReturns(s).filter((x) => x.r.status === 'Approved'); const n = rr.reduce((a, x) => a + x.items.length, 0); return rr.length > 0 && <div className="alert bad inv-rs" role="status"><Icon name="bell" size={18} /><span><b>{n} barang wajib dikembalikan</b> oleh {rr.length} karyawan yang resign-nya sudah disetujui: {rr.map((x) => `${emp(x.r.emp).name} (hari terakhir ${fmtDate(x.r.lastDay)})`).join(', ')}.</span><Btn kind="ghost" perm="r" onClick={() => go('inventaris/dashboard')}>Lihat pengembalian</Btn></div> })()}
      <div className="rk-tiles" role="group" aria-label="Rekap status inventaris">{ICATS.map(([k, l, ic, fn]) => { const lst = ex.filtered.filter(fn); const on = icat === k; return (
        <button key={k} className={`rk-tile iv-${k} ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => { setIcat(k); setTimeout(() => document.getElementById('inv-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}>
          <span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{lst.length}</b><small>{new Set(lst.map((r) => r.emp)).size} karyawan</small>
          <small className="rk-br">{[...new Set(lst.map((r) => r.kategori))].map((k2) => `${k2} ${lst.filter((r) => r.kategori === k2).length}`).join(' · ') || '—'}</small></button>) })}</div>
      <div id="inv-list" className="anchor" />
      <Card pad={false}><Table center rows={ex.filtered.filter((ICATS.find((c) => c[0] === icat) || ICATS[0])[3])} empty="Tidak ada inventaris untuk filter ini." cols={[{ h: 'Nomor', r: (r) => <code>{r.nomor}</code> }, { h: 'Karyawan', r: (r) => <div className="who"><Avatar name={emp(r.emp).name} size={30} />{emp(r.emp).name}</div> }, { h: 'Kategori', k: 'kategori' }, { h: 'Item', k: 'item' }, { h: 'Tanggal serah', r: (r) => fmtDate(r.tanggal) }, { h: 'Status', r: (r) => <InvBadge s={r.status} /> }, { h: '', r: (r) => <Btn kind="ghost" onClick={() => setView(r)}>Detail</Btn> }]} /></Card>
      <Modal open={!!view} title={view ? view.nomor : ''} onClose={() => setView(null)} footer={<Btn kind="ghost" onClick={() => setView(null)}>Close</Btn>}>{view && <dl className="dl"><dt>Karyawan</dt><dd>{emp(view.emp).name}</dd><dt>Branch</dt><dd>{branch(emp(view.emp).branch)}</dd><dt>Kategori</dt><dd>{view.kategori}</dd><dt>Item</dt><dd>{view.item}</dd><dt>Kebutuhan</dt><dd>{view.kebutuhan || '—'}</dd><dt>Lampiran</dt><dd>{view.lampiran?.length ? view.lampiran.join(', ') : '—'}</dd><dt>Tanggal serah</dt><dd>{fmtDate(view.tanggal)}</dd><dt>Status</dt><dd><InvBadge s={view.status} /></dd>{view.status === 'Returned' && <><dt>Tanggal kembali</dt><dd>{fmtDate(view.tanggalKembali)}</dd><dt>Kondisi</dt><dd>{view.kondisi}{view.catatanKembali ? ` · ${view.catatanKembali}` : ''}</dd></>}</dl>}
        {view?.status === 'Accepted' && <div className="row-end"><Btn kind="ghost" icon="check" onClick={() => { api.returnInventory(view.id); setView(null); toast('Inventaris ditandai dikembalikan') }}>Tandai dikembalikan</Btn></div>}</Modal>{t}
    </>
  )
}
const INV_ST = { Waiting: ['warn', 'Menunggu diterima'], Accepted: ['ok', 'Dipegang karyawan'], Returned: ['neutral', 'Sudah dikembalikan'] }
const InvBadge = ({ s }) => <Badge t={INV_ST[s]?.[0]}>{INV_ST[s]?.[1] || s}</Badge>
// Riwayat inventaris karyawan yang sedang dipilih di form Add New
function EmpInventory({ empId, kategori }) {
  const s = useStore(); const { emp, branch } = useLookup()
  if (!empId) return <Card title="Inventaris karyawan"><p className="muted">Pilih karyawan untuk melihat inventaris yang sudah atau pernah dipegangnya.</p></Card>
  const e = emp(empId); const rows = s.inventories.filter((i) => i.emp === empId).sort((a, b) => (a.status === 'Returned') - (b.status === 'Returned') || b.tanggal.localeCompare(a.tanggal))
  const n = (st) => rows.filter((i) => i.status === st).length
  const same = kategori && rows.filter((i) => i.kategori === kategori && i.status !== 'Returned')
  return (
    <Card title={<span>Inventaris {e.name} <span className="muted sm">· {branch(e.branch)}</span></span>} pad={false}>
      {rows.length ? <>
        <div className="inv-sum"><span><b>{n('Accepted')}</b> dipegang</span><span><b>{n('Waiting')}</b> menunggu diterima</span><span><b>{n('Returned')}</b> sudah dikembalikan</span></div>
        {same?.length > 0 && <div className="alert warn inv-al" role="status"><Icon name="box" size={18} />{e.name} masih memegang {same.length} barang kategori {kategori}: {same.map((i) => i.item).join(', ')}. Pastikan ini bukan penyerahan ganda.</div>}
        <Table rows={rows} cols={[
          { h: 'Nomor', r: (r) => <code>{r.nomor}</code> }, { h: 'Kategori', k: 'kategori' }, { h: 'Item', r: (r) => <div><strong>{r.item}</strong>{r.kebutuhan && <div className="muted sm">{r.kebutuhan}</div>}</div> },
          { h: 'Tanggal serah', r: (r) => <span className="nowrap">{fmtDate(r.tanggal)}</span> },
          { h: 'Status', r: (r) => <InvBadge s={r.status} /> },
          { h: 'Dikembalikan', r: (r) => r.status === 'Returned' ? <div><span className="nowrap">{fmtDate(r.tanggalKembali)}</span><div className="muted sm">Kondisi {r.kondisi?.toLowerCase()}{r.catatanKembali ? ` · ${r.catatanKembali}` : ''}</div></div> : <span className="muted">—</span> },
        ]} />
      </> : <div className="inv-empty"><Icon name="box" size={22} /><div><strong>Belum ada inventaris</strong><p className="muted sm">{e.name} belum pernah menerima barang inventaris kantor. Ini akan jadi inventaris pertamanya.</p></div></div>}
    </Card>
  )
}
function InvDashboard({ go }) {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast(); const [fb, setFb] = useState(''); const [ret, setRet] = useState(null)
  const items = s.inventories.filter((i) => !fb || emp(i.emp).branch === fb)
  const kats = s.invCategories.map((c) => c.name)
  const by = (k, st) => items.filter((i) => i.kategori === k && (!st || i.status === st)).length
  const rr = resignReturns(s).filter((x) => !fb || emp(x.r.emp).branch === fb)
  const appr = rr.filter((x) => x.r.status === 'Approved')
  return (
    <>
      <Crumb items={[['Inventaris', () => go('inventaris')], ['Dashboard']]} />
      <PageHead title="Dashboard Inventaris" sub="Sebaran barang per kategori dan pengembalian barang oleh karyawan yang resign." />
      <div className="filters"><label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
      <Card title={<span>Pengembalian inventaris karyawan resign <span className="muted sm">· {appr.reduce((a, x) => a + x.items.length, 0)} barang wajib kembali</span></span>} pad={false}>
        {rr.length ? <Table rows={rr} cols={[
          { h: 'Karyawan', r: (x) => <div className="who"><Avatar name={emp(x.r.emp).name} size={30} /><div><strong>{emp(x.r.emp).name}</strong><div className="muted sm">{branch(emp(x.r.emp).branch)}</div></div></div> },
          { h: 'Resign', r: (x) => <div><Badge>{x.r.status}</Badge><div className="muted sm nowrap">hari terakhir {fmtDate(x.r.lastDay)}</div></div> },
          { h: 'Tenggat pengembalian', r: (x) => <Badge t={urg(x)[0]}>{urg(x)[1]}</Badge> },
          { h: 'Barang belum kembali', r: (x) => <ul className="rt-l">{x.items.map((i) => <li key={i.id}><div><strong>{i.item}</strong><span className="muted sm"><code>{i.nomor}</code> · {i.kategori}{i.status === 'Waiting' ? ' · belum diterima' : ''}</span></div><Btn kind="ghost" icon="check" onClick={() => setRet(i)}>Tandai kembali</Btn></li>)}</ul> },
          { h: '', r: (x) => <a className="btn btn-ghost" href={`#/app/superadmin/resign/${x.r.id}`}>Lihat resign</a> },
        ]} /> : <Empty text="Tidak ada barang yang menunggu dikembalikan oleh karyawan resign." />}
      </Card>
      <Note>Barang karyawan dengan resign Approved wajib kembali sebelum hari terakhir kerja (masa notice). Merah = sisa ≤ 7 hari atau lewat, kuning = dalam one month notice. Bila semua barang kembali, status pengembalian di Resign otomatis Lengkap.</Note>
      <div className="inv-kats">{kats.map((k) => { const tot = by(k); return (
        <Card key={k} title={k} action={<span className="muted sm">{tot} barang</span>}>
          <SegBar label={`Status barang ${k}`} parts={[['Accepted', 'Dipegang', '#2f8f4e'], ['Waiting', 'Menunggu diterima', '#d9a400'], ['Returned', 'Dikembalikan', '#8f9893']].map(([st, l, c]) => ({ l, c, v: by(k, st) }))} />
          <p className="muted sm mt">{new Set(items.filter((i) => i.kategori === k && i.status !== 'Returned').map((i) => i.emp)).size} karyawan memegang · {items.filter((i) => i.kategori === k && i.status !== 'Returned' && s.resigns.some((r) => r.emp === i.emp && r.status === 'Approved')).length} wajib kembali (resign)</p>
        </Card>) })}</div>
      <div className="dgrid two">
        <Card title="Barang dipegang per kategori"><HBars label="Barang dipegang per kategori" rows={kats.map((k) => ({ l: k, v: by(k, 'Accepted') + by(k, 'Waiting') }))} /></Card>
        <Card title="Rincian per kategori" pad={false}><Table rows={kats} cols={[{ h: 'Kategori', r: (k) => <strong>{k}</strong> }, { h: 'Dipegang', right: true, r: (k) => by(k, 'Accepted') }, { h: 'Menunggu', right: true, r: (k) => by(k, 'Waiting') }, { h: 'Kembali', right: true, r: (k) => by(k, 'Returned') }, { h: 'Total', right: true, r: (k) => <b>{by(k)}</b> }]} /></Card>
      </div>
      <Modal open={!!ret} title="Tandai barang dikembalikan" onClose={() => setRet(null)} footer={<><Btn kind="ghost" onClick={() => setRet(null)}>Batal</Btn><Btn icon="check" onClick={() => { api.returnInventory(ret.id, ret.kondisi || 'Baik', 'Pengembalian saat resign'); setRet(null); toast('Barang ditandai dikembalikan') }}>Simpan</Btn></>}>
        {ret && <div className="form"><p><b>{ret.item}</b> · {emp(ret.emp).name}</p><Field label="Kondisi"><select value={ret.kondisi || 'Baik'} onChange={(e) => setRet({ ...ret, kondisi: e.target.value })}>{['Baik', 'Rusak ringan', 'Rusak berat', 'Hilang'].map((k) => <option key={k}>{k}</option>)}</select></Field></div>}
      </Modal>
      {t}
    </>
  )
}
function KatModal({ kat, setKat, onSaved }) {
  const s = useStore(); const dup = kat && s.invCategories.some((c) => c.name.toLowerCase() === kat.name.trim().toLowerCase() && c.id !== kat.id)
  return (
    <Modal open={!!kat} title={kat?.id ? 'Edit kategori' : 'Kategori baru'} onClose={() => setKat(null)} footer={<><Btn kind="ghost" onClick={() => setKat(null)}>Batal</Btn><Btn disabled={!kat?.name.trim() || dup} onClick={() => { api.saveInvCategory(kat.id, kat.name.trim()); onSaved(kat.name.trim()); setKat(null) }}>Save</Btn></>}>
      {kat && <Field label="Nama kategori" hint={dup ? 'Kategori dengan nama ini sudah ada.' : ''}><input autoFocus value={kat.name} onChange={(e) => setKat({ ...kat, name: e.target.value })} placeholder="Mis. Alat Kerja" /></Field>}
    </Modal>
  )
}

// ---------- Setup Aktivitas › Organisasi ----------
export function Organisasi({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const { nodes, divisi } = s.org
  const [ed, setEd] = useState(null); const [del, setDel] = useState(null); const [dv, setDv] = useState(null); const [delDv, setDelDv] = useState(null)
  const empName = (id) => s.employees.find((e) => e.id === id)?.name
  const dvName = (id) => divisi.find((d) => d.id === id)?.name
  const kids = (id) => nodes.filter((n) => n.parent === id)
  const descendants = (id) => kids(id).flatMap((k) => [k.id, ...descendants(k.id)])
  const taken = (empId, selfId) => nodes.some((n) => n.emp === empId && n.id !== selfId)
  const Node = ({ n }) => (
    <li>
      <div className={`org-card ${n.emp ? '' : 'kosong'}`}>
        {n.emp ? <Avatar name={empName(n.emp)} size={40} /> : <span className="org-empty"><Icon name="user" size={20} /></span>}
        <div className="grow"><strong>{n.jabatan}</strong><div className="muted sm">{n.emp ? empName(n.emp) : 'Belum ada orangnya'}</div>{n.divisi && <Badge t="neutral">{dvName(n.divisi)}</Badge>}</div>
        <div className="row-act">
          <button className="icon-btn" title="Tambah bawahan" aria-label={'Tambah bawahan untuk ' + n.jabatan} onClick={() => setEd({ id: null, jabatan: '', divisi: n.divisi, emp: '', parent: n.id })}><Icon name="plus" size={18} /></button>
          <button className="icon-btn" title="Edit" aria-label={'Edit ' + n.jabatan} onClick={() => setEd({ ...n })}><Icon name="edit" size={18} /></button>
          <button className="icon-btn" title="Hapus" aria-label={'Hapus ' + n.jabatan} onClick={() => setDel(n)}><Icon name="trash" size={18} /></button>
        </div>
      </div>
      {kids(n.id).length > 0 && <ul>{kids(n.id).map((k) => <Node key={k.id} n={k} />)}</ul>}
    </li>
  )
  const roots = nodes.filter((n) => !n.parent || !nodes.some((x) => x.id === n.parent))
  const blocked = ed?.id ? [ed.id, ...descendants(ed.id)] : []
  return (
    <>
      <Crumb items={[['Setup Aktivitas', () => go('setup-aktivitas')], ['Organisasi']]} />
      <PageHead title="Organisasi" sub="Atur siapa atasan siapa dan divisi apa saja. Pohon ini menentukan 'Atasan langsung' pada approval cuti, lembur, dan reimbursement.">
        <Btn icon="plus" onClick={() => setEd({ id: null, jabatan: '', divisi: '', emp: '', parent: roots[0]?.id || null })}>Tambah jabatan</Btn>
      </PageHead>
      <Card title="Divisi" action={<Btn kind="ghost" icon="plus" onClick={() => setDv({ id: null, name: '' })}>Tambah divisi</Btn>}>
        <div className="chips">{divisi.length ? divisi.map((d) => <span key={d.id} className="dv-chip">{d.name} <small>({nodes.filter((n) => n.divisi === d.id).length} jabatan)</small>
          <button className="icon-btn sm" title="Ubah nama" aria-label={'Ubah nama divisi ' + d.name} onClick={() => setDv({ ...d })}><Icon name="edit" size={16} /></button>
          <button className="icon-btn sm" title="Hapus divisi" aria-label={'Hapus divisi ' + d.name} onClick={() => setDelDv(d)}><Icon name="x" size={16} /></button></span>) : <span className="muted">Belum ada divisi.</span>}</div>
      </Card>
      <Card title="Pohon organisasi">{roots.length ? <ul className="org">{roots.map((n) => <Node key={n.id} n={n} />)}</ul> : <Empty text="Belum ada jabatan. Mulai dengan Tambah jabatan." />}</Card>
      <Note>HR selalu menjadi muara akhir approval. Jabatan yang belum ada orangnya dilewati saat approval berjalan.</Note>

      <Modal open={!!ed} title={ed?.id ? 'Edit jabatan' : 'Tambah jabatan'} onClose={() => setEd(null)} footer={<><Btn kind="ghost" onClick={() => setEd(null)}>Batal</Btn><Btn disabled={!ed?.jabatan.trim()} onClick={() => { api.saveOrgNode(ed.id, { jabatan: ed.jabatan.trim(), divisi: ed.divisi, emp: ed.emp, parent: ed.parent || null }); setEd(null); toast('Organisasi diperbarui') }}>Save</Btn></>}>
        {ed && <div className="form">
          <Field label="Nama jabatan"><input autoFocus value={ed.jabatan} onChange={(e) => setEd({ ...ed, jabatan: e.target.value })} placeholder="Mis. Product Manager" /></Field>
          <Field label="Divisi"><select value={ed.divisi || ''} onChange={(e) => setEd({ ...ed, divisi: e.target.value })}><option value="">Tanpa divisi</option>{divisi.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="Atasan langsung" hint="Kosongkan untuk jabatan paling atas."><select value={ed.parent || ''} onChange={(e) => setEd({ ...ed, parent: e.target.value || null })}><option value="">Tidak punya atasan (paling atas)</option>{nodes.filter((n) => !blocked.includes(n.id)).map((n) => <option key={n.id} value={n.id}>{n.jabatan}{n.emp ? ' · ' + empName(n.emp) : ''}</option>)}</select></Field>
          <FieldBox label="Orang yang menjabat" hint={ed.emp && taken(ed.emp, ed.id) ? 'Orang ini sudah punya jabatan lain di pohon. Menyimpan akan membuatnya merangkap.' : 'Cari nama lalu pilih. Boleh dikosongkan dulu.'}><EmpSearch value={ed.emp} onPick={(v) => setEd({ ...ed, emp: v })} /></FieldBox>
        </div>}
      </Modal>
      <Modal open={!!dv} title={dv?.id ? 'Ubah nama divisi' : 'Tambah divisi'} onClose={() => setDv(null)} footer={<><Btn kind="ghost" onClick={() => setDv(null)}>Batal</Btn><Btn disabled={!dv?.name.trim()} onClick={() => { api.saveDivisi(dv.id, dv.name.trim()); setDv(null); toast('Divisi tersimpan') }}>Save</Btn></>}>
        {dv && <Field label="Nama divisi"><input autoFocus value={dv.name} onChange={(e) => setDv({ ...dv, name: e.target.value })} /></Field>}
      </Modal>
      <Confirm open={del} yes="Hapus" text={<>Hapus jabatan <b>{del?.jabatan}</b>? {del && kids(del.id).length ? `${kids(del.id).length} bawahannya akan naik ke atasan jabatan ini.` : ''}</>} onNo={() => setDel(null)} onYes={() => { api.deleteOrgNode(del.id); setDel(null); toast('Jabatan dihapus') }} />
      <Confirm open={delDv} yes="Hapus" text={<>Hapus divisi <b>{delDv?.name}</b>? Jabatan di dalamnya tetap ada, tetapi jadi tanpa divisi.</>} onNo={() => setDelDv(null)} onYes={() => { api.deleteDivisi(delDv.id); setDelDv(null); toast('Divisi dihapus') }} />{t}
    </>
  )
}

// ---------- Setup Aktivitas › Kategori (kelompok karyawan) ----------
export function KategoriKaryawan() {
  const s = useStore(); const [t, toast] = useToast(); const [ed, setEd] = useState(null); const [del, setDel] = useState(null); const [q, setQ] = useState(''); const [view, setView] = useState(null)
  const groups = empGroups(s); const name = (id) => s.employees.find((e) => e.id === id)?.name
  const bname = (id) => (id ? s.branches.find((b) => b.id === id)?.name : 'Semua Branch')
  const dup = ed && groups.some((g) => g.name.toLowerCase() === ed.name.trim().toLowerCase() && g.id !== 'c:' + ed.id)
  const pilihan = ed ? s.employees.filter((e) => (!ed.branch || e.branch === ed.branch) && e.name.toLowerCase().includes(q.toLowerCase())) : []
  const why = { 'Jenis kelamin': 'Kategori bawaan, terisi otomatis dari jenis kelamin di Data Karyawan', Organisasi: 'Terisi otomatis dari Divisi di menu Organisasi. Ubah lewat Organisasi.' }
  return (
    <Card title="Kategori karyawan" action={<Btn icon="plus" onClick={() => { setQ(''); setEd({ id: null, name: '', branch: '', members: [] }) }}>Kategori baru</Btn>}>
      <p className="muted" style={{ marginTop: 0 }}>Kategori muncul di setiap kolom <b>Pilih Karyawan</b> (Absensi, Cuti, Lembur, Reimbursement, Inventaris, Resign). Divisi di Organisasi otomatis menjadi kategori.</p>
      <div className="kat-tbl"><Table center rows={groups} cols={[
        { h: 'Kategori', r: (g) => <span className="kat-name">{g.locked && <Icon name="lock" size={14} />}<strong>{g.name}</strong></span> },
        { h: 'Sumber', r: (g) => <Badge t={g.source === 'Manual' ? 'ok' : 'neutral'}>{g.source}</Badge> },
        { h: 'Branch', r: (g) => (g.locked ? 'Semua Branch' : bname(g.branch)) },
        { h: 'Anggota', r: (g) => `${g.members.length} orang` },
        { h: 'Action', r: (g) => <div className="row-act nowrap">
          <button className="icon-btn" title="Lihat anggota" aria-label={'Lihat anggota ' + g.name} onClick={() => setView(g)}><Icon name="eye" size={18} /></button>
          <button className="icon-btn" title={g.locked ? why[g.source] : 'Edit'} aria-label={g.locked ? g.name + ' terkunci' : 'Edit ' + g.name} disabled={g.locked} onClick={() => { setQ(''); setEd({ id: g.id.slice(2), name: g.name, branch: g.branch || '', members: [...g.members] }) }}><Icon name="edit" size={18} /></button>
          <button className="icon-btn" title={g.locked ? why[g.source] : 'Hapus'} aria-label={g.locked ? g.name + ' terkunci' : 'Hapus ' + g.name} disabled={g.locked} onClick={() => setDel(g)}><Icon name="trash" size={18} /></button></div> }]} /></div>
      <p className="muted sm" style={{ margin: '12px 0 0' }}>Tombol abu-abu berarti kategori terkunci (otomatis). Arahkan kursor ke tombol untuk melihat alasannya.</p>
      <Modal wide open={!!ed} title={ed?.id ? 'Edit kategori' : 'Kategori baru'} onClose={() => setEd(null)} footer={<><span className="muted sm grow">{ed?.members.length || 0} karyawan dipilih</span><Btn kind="ghost" onClick={() => setEd(null)}>Batal</Btn><Btn disabled={!ed?.name.trim() || dup} onClick={() => { api.saveEmpCategory(ed.id, { name: ed.name.trim(), branch: ed.branch, members: ed.members }); setEd(null); toast('Kategori tersimpan') }}>Save</Btn></>}>
        {ed && <><div className="form two">
          <Field label="Nama kategori" hint={dup ? 'Nama ini sudah dipakai.' : ''}><input autoFocus value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} placeholder="Mis. Tim Shift Malam" /></Field>
          <Field label="Branch" hint="Pilih Semua Branch bila anggotanya lintas Branch."><select value={ed.branch} onChange={(e) => { const b = e.target.value; setEd({ ...ed, branch: b, members: b ? ed.members.filter((id) => s.employees.find((x) => x.id === id)?.branch === b) : ed.members }) }}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field></div>
          <Field label="Anggota"><span className="search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama karyawan" aria-label="Cari karyawan" /></span></Field>
          <div className="pick-list two">{pilihan.map((e) => { const on = ed.members.includes(e.id); return (
            <label key={e.id} className={`pick ${on ? 'on' : ''}`}><input type="checkbox" checked={on} onChange={() => setEd({ ...ed, members: on ? ed.members.filter((x) => x !== e.id) : [...ed.members, e.id] })} /><div><strong>{e.name}</strong><small>{e.role} · {bname(e.branch)}</small></div></label>) })}</div>
          {!pilihan.length && <p className="muted sm">Tidak ada karyawan yang cocok.</p>}</>}
      </Modal>
      <Modal open={!!view} title={view ? `Anggota · ${view.name}` : ''} onClose={() => setView(null)} footer={<Btn kind="ghost" onClick={() => setView(null)}>Close</Btn>}>{view && (view.members.length ? <div className="pick-list">{view.members.map((id) => <div key={id} className="who"><Avatar name={name(id)} size={32} />{name(id)}</div>)}</div> : <p className="muted">Belum ada anggota.</p>)}</Modal>
      <Confirm open={del} yes="Hapus" text={<>Hapus kategori <b>{del?.name}</b>? Karyawan di dalamnya tidak ikut terhapus.</>} onNo={() => setDel(null)} onYes={() => { api.deleteEmpCategory(del.id.slice(2)); setDel(null); toast('Kategori dihapus') }} />{t}
    </Card>
  )
}
