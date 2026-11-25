// Halaman admin hasil sisir ulang Figma (13 Nov 2026): tombol & kolom disamakan dengan desain Scala.
import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { rupiah } from '../services/payroll.js'
import { exportExcel } from '../services/export.js'
import { Btn, Card, Badge, Table, Modal, Field, Toggle, useToast, Avatar, PageHead, Note, Icon, Empty, usePerm } from '../components/ui.jsx'
import { Columns } from '../components/charts.jsx'
import { BLAST_CATS, KANAL, kanalLabel } from '../data/blasts.js'
import { MitraDetail, MitraCreate, ReqTable, ReqModal, AturanCard, reqInfo, tpActive, PERJ_T } from './talentPoolUI.jsx'
import { useLookup, fmtDate, TalentBio } from './shared.jsx'
import { ADMIN_MENU, SUPER_ONLY, ACTIONS, capsOf, accSummary, FEATURE_NOTE } from './menus.js'
import { useDraft, DraftBar } from './admin3.jsx'
import { drafts } from '../services/drafts.js'

const BL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const Sel = ({ label, value, onChange, all, opts }) => (
  <label className="fsel"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}><option value="">{all}</option>{opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select></label>
)
const Search = ({ value, onChange, ph = 'Cari di sini' }) => (
  <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder={ph} value={value} onChange={(e) => onChange(e.target.value)} /></span></label>
)
const Confirm = ({ open, text, onNo, onYes, yes = 'Yakin' }) => (
  <Modal open={!!open} title="Konfirmasi" onClose={onNo} footer={<><Btn kind="ghost" onClick={onNo}>Batal</Btn><Btn onClick={onYes}>{yes}</Btn></>}><div className="center"><span className="q-ic">?</span><p>{text}</p></div></Modal>
)
const dl = (toast, payload) => { try { exportExcel(payload); toast('File Excel diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }

// ---------- Setup › Admin ----------
const EMPTY_ADMIN = { adminId: '', name: '', email: '', divisi: '', jabatan: '', perms: ['dashboard'], acc: {}, branches: [] }
export function AdminIzin({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const [q, setQ] = useState(''); const [off, setOff] = useState(null)
  const id = sub && sub !== 'baru' ? sub : null; const src = id && s.admins.find((a) => a.id === id)
  const d = useDraft('admin:' + (sub || 'none'), structuredClone(src ? { ...EMPTY_ADMIN, ...src } : EMPTY_ADMIN))
  const f = sub ? d.value : null; const setF = d.set
  const rows = s.admins.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
  const set = (k, v) => setF({ ...f, [k]: v })
  const tog = (k, v, on) => set(k, on ? [...f[k], v] : f[k].filter((x) => x !== v))
  const valid = f && f.adminId.trim() && f.name.trim() && /^\S+@\S+\.\S+$/.test(f.email)
  if (sub) {
    if (id && !src) return <Empty text="Admin tidak ditemukan." />
    return (
      <>
        <nav className="crumb" aria-label="Breadcrumb"><button onClick={() => go('admin-izin')}>Admin & Izin</button><span>›</span><b>{id ? 'Edit Admin' : 'New Admin'}</b></nav>
        <PageHead title={id ? 'Edit Admin' : 'New Admin'} sub="Isian tersimpan otomatis sebagai draft sampai kamu menekan Save." />
        <DraftBar d={d} />
        <Card>
          <section className="fsec">
            <h3 className="fsec-h">Data admin</h3>
            <div className="form two">
              <Field label="Admin ID"><input value={f.adminId} onChange={(e) => set('adminId', e.target.value)} placeholder="Masukkan ID Admin" /></Field>
              <Field label="Nama"><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Masukkan Nama Admin" /></Field>
              <Field label="Email"><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Masukkan Email Admin" /></Field>
              <Field label="Divisi"><input value={f.divisi} onChange={(e) => set('divisi', e.target.value)} placeholder="Masukkan Divisi Admin" /></Field>
              <Field label="Jabatan"><input value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} placeholder="Masukkan Jabatan Admin" /></Field>
              <Field label="Password" hint="Admin mengatur password sendiri lewat tautan yang dikirim ke e-mail."><input disabled value="Dikirim lewat e-mail" /></Field>
            </div>
          </section>
          <section className="fsec">
            <h3 className="fsec-h">Branch yang ditugaskan</h3>
            <div className="feat-grid7">{s.branches.map((b) => <label key={b.id} className={`mod ${f.branches.includes(b.id) ? 'on' : ''}`}><input type="checkbox" checked={f.branches.includes(b.id)} onChange={(e) => tog('branches', b.id, e.target.checked)} /><span>{b.name}</span></label>)}</div>
          </section>
          <section className="fsec">
            <h3 className="fsec-h">Hak akses per fitur</h3>
            <PermMatrix f={f} setF={setF} />
          </section>
          <div className="row-end"><Btn kind="ghost" onClick={() => go('admin-izin')}>Close</Btn><Btn disabled={!valid} onClick={() => { api.saveAdmin(id, f); d.clear(); toast(id ? 'Data admin diperbarui' : 'Admin dibuat. Tautan atur password dikirim ke e-mail'); go('admin-izin') }}>Save</Btn></div>
        </Card>
      </>
    )
  }
  return (
    <>
      <PageHead title="Admin & Izin" sub="Superadmin mengatur Branch dan hak akses tiap admin per fitur: Lihat, Tambah, Ubah, Hapus."><Btn icon="plus" onClick={() => go('admin-izin/baru')}>{drafts.get('admin:baru') ? 'Lanjutkan draft' : 'New Admin'}</Btn></PageHead>
      <div className="filters"><Search value={q} onChange={setQ} ph="Ketikkan nama" /></div>
      <Card pad={false}><Table center rows={rows} empty="Admin tidak ditemukan." cols={[
        { h: 'No', r: (r) => rows.indexOf(r) + 1 }, { h: 'Admin ID', k: 'adminId' },
        { h: 'Nama', r: (r) => <div className="who"><Avatar name={r.name} size={30} /><strong>{r.name}</strong></div> },
        { h: 'Email', k: 'email' }, { h: 'Divisi', k: 'divisi' }, { h: 'Jabatan', k: 'jabatan' },
        { h: 'Izin', r: (r) => { const a = accSummary(r); return <div><div>{a.lihat} fitur · {r.branches.length} Branch</div><div className="muted sm">{a.kelola ? `${a.kelola} bisa dikelola · ${a.lihat - a.kelola} lihat saja` : 'Semua lihat saja'}</div></div> } },
        { h: 'Action', r: (r) => <div className="row-act">
          <button className="icon-btn" title="Edit" aria-label={'Edit ' + r.name} onClick={() => go('admin-izin/' + r.id)}><Icon name="edit" size={18} /></button>
          <Toggle on={r.aktif !== false} onChange={() => (r.aktif !== false ? setOff(r) : (api.toggleAdmin(r.id), toast('Admin diaktifkan')))} label={r.aktif !== false ? 'On' : 'Off'} /></div> },
      ]} /></Card>
      <Note>Coba: ubah hak akses Dewi, lalu masuk sebagai <b>Admin Operasional</b>. Sidebar mengikuti fitur yang bisa dilihat, dan tombol tambah/ubah/hapus terkunci bila izinnya tidak diberikan.</Note>
      <Confirm open={off} text={<>Anda akan menonaktifkan admin <b>{off?.name}</b>. Apakah anda yakin?</>} onNo={() => setOff(null)} onYes={() => { api.toggleAdmin(off.id); setOff(null); toast('Admin dinonaktifkan') }} />{t}
    </>
  )
}

// ---------- Setup › Job Post (master pilihan untuk form lowongan) ----------
export function SetupLowongan() {
  const s = useStore(); const [t, toast] = useToast()
  const [key, setKey] = useState(''); const [q, setQ] = useState(''); const [f, setF] = useState(null); const [del, setDel] = useState(null)
  const rows = key ? s.masters[key].filter((m) => m.name.toLowerCase().includes(q.toLowerCase())) : []
  return (
    <>
      <PageHead title="Setup Lowongan" sub="Master pilihan yang muncul di form lowongan Branch." />
      <div className="filters"><Sel label="Pilih pengaturan untuk" value={key} onChange={setKey} all="Pilih pengaturan" opts={Object.keys(s.masters)} />
        {key && <><Search value={q} onChange={setQ} ph="Cari..." /><Btn icon="plus" onClick={() => setF({ id: null, name: '' })}>Add</Btn></>}</div>
      {!key ? <Card><Empty text="Pilih pengaturan terlebih dahulu." /></Card> : (
        <Card pad={false}><Table rows={rows} empty="Belum ada data." cols={[
          { h: 'No', r: (r) => rows.indexOf(r) + 1 }, { h: key, k: 'name' },
          { h: 'Status', r: (r) => <Toggle on={r.aktif} onChange={() => api.toggleMaster(key, r.id)} label={r.aktif ? 'Aktif' : 'Non-Aktif'} /> },
          { h: 'Action', r: (r) => <div className="row-act"><button className="icon-btn" title="Edit" aria-label={'Edit ' + r.name} onClick={() => setF({ id: r.id, name: r.name })}><Icon name="edit" size={18} /></button><button className="icon-btn" title="Hapus" aria-label={'Hapus ' + r.name} onClick={() => setDel(r)}><Icon name="trash" size={18} /></button></div> },
        ]} /></Card>)}
      <Modal open={!!f} title={f?.id ? `Edit ${key}` : `Add ${key}`} onClose={() => setF(null)} footer={<><Btn kind="ghost" onClick={() => setF(null)}>Close</Btn><Btn disabled={!f?.name.trim()} onClick={() => { api.saveMaster(key, f.id, f.name.trim()); setF(null); toast('Data Berhasil Disimpan') }}>Save</Btn></>}>
        {f && <Field label={key}><input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>}
      </Modal>
      <Confirm open={del} text={<>Hapus <b>{del?.name}</b> dari {key}?</>} yes="Hapus" onNo={() => setDel(null)} onYes={() => { api.deleteMaster(key, del.id); setDel(null); toast('Data dihapus') }} />{t}
    </>
  )
}

// ---------- Blast Notification ----------
export function Blast({ me }) {
  const s = useStore(); const [t, toast] = useToast(); const pm = usePerm(); const can = (a) => !pm || pm.can(a)
  const [ke, setKe] = useState([]); const [km, setKm] = useState([]); const [judul, setJudul] = useState(''); const [isi, setIsi] = useState(''); const [err, setErr] = useState('')
  const [kat, setKat] = useState('Pengumuman'); const [kanal, setKanal] = useState('Keduanya')
  const [q, setQ] = useState(''); const [d1, setD1] = useState(''); const [d2, setD2] = useState(''); const [detail, setDetail] = useState(null); const [del, setDel] = useState(null)
  const [fcat, setFcat] = useState(''); const [fbr, setFbr] = useState(''); const [fkan, setFkan] = useState(''); const [foleh, setFoleh] = useState('')
  const brs = me ? s.branches.filter((b) => me.branches.includes(b.id)) : s.branches
  const targets = [...(me ? [] : ['Semua']), ...brs.map((b) => b.name)]
  const short = (n) => n.replace('Branch ', '')
  const pick = (x, on) => setKe(x === 'Semua' ? (on ? ['Semua'] : []) : (on ? [...ke.filter((k) => k !== 'Semua'), x] : ke.filter((k) => k !== x)))
  const hits = (b, br) => b.ke === 'Semua' || b.ke.split(', ').includes(br)
  const reach = (b) => s.employees.filter((e) => { const bn = s.branches.find((x) => x.id === e.branch)?.name; return bn && hits(b, bn) }).length
  const submit = () => {
    if (!ke.length && !km.length) return setErr('Tidak bisa mengirimkan pesan dikarenakan belum memilih Branch atau Mitra')
    if (!judul.trim() || !isi.trim()) return setErr('Judul dan isi pesan wajib diisi')
    api.blast({ judul: judul.trim(), isi: isi.trim(), ke: ke.length ? ke.join(', ') : '—', mitra: km.length ? km : undefined, kategori: kat, kanal, oleh: me ? me.name : 'Rani Hapsari', peran: me ? 'Admin' : 'Superadmin' })
    setJudul(''); setIsi(''); setKe([]); setKm([]); toast('Pesan terkirim lewat ' + kanalLabel(kanal).toLowerCase())
  }
  const scope = s.blasts.filter((b) => (!me || brs.some((x) => hits(b, x.name))))
  const base = scope.filter((b) => (b.judul + ' ' + b.isi).toLowerCase().includes(q.toLowerCase()) && (!d1 || b.tanggal >= d1) && (!d2 || b.tanggal <= d2) && (!fbr || hits(b, fbr)) && (!fkan || b.kanal === fkan) && (!foleh || b.oleh === foleh))
  const rows = base.filter((b) => !fcat || b.kategori === fcat)
  const senders = [...new Set(scope.map((b) => b.oleh))]
  const toList = () => setTimeout(() => document.getElementById('bl-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  const cats = [['', 'layers', '#8f9893', 'Semua kategori'], ...BLAST_CATS.map(([k, ic, c]) => [k, ic, c, k])]
  const kanalCount = (k, lst) => lst.filter((b) => b.kanal === k).length
  return (
    <>
      <PageHead title="Blast Notifikasi" sub="Kirim pengumuman ke karyawan lewat app, e-mail, atau keduanya — lengkap dengan rekap per kategori & Branch." />
      {can('c') && <Card title="Notification">
        <div className="form">
          <Field label="Kirim notifikasi untuk"><div className="mod-row">{targets.map((x) => <label key={x} className={`mod ${ke.includes(x) ? 'on' : ''}`}><input type="checkbox" checked={ke.includes(x)} onChange={(e) => pick(x, e.target.checked)} />{x}</label>)}</div></Field>
          {!me && <Field label="Kirim juga ke Mitra Talent Pool" hint="Muncul di lonceng notifikasi akun mitra"><div className="mod-row">{s.mitras.filter((m) => m.perjanjian?.status === 'Aktif').map((m) => <label key={m.id} className={`mod ${km.includes(m.id) ? 'on' : ''}`}><input type="checkbox" checked={km.includes(m.id)} onChange={(e) => setKm(e.target.checked ? [...km, m.id] : km.filter((x) => x !== m.id))} />{m.name}</label>)}</div></Field>}
          <div className="grid2">
            <Field label="Kategori"><select value={kat} onChange={(e) => setKat(e.target.value)}>{BLAST_CATS.map(([k]) => <option key={k}>{k}</option>)}</select></Field>
            <Field label="Dikirim lewat" hint={kanal === 'Email' ? 'Tidak muncul di inbox app karyawan' : kanal === 'App' ? 'Hanya notifikasi & inbox app, tanpa e-mail' : 'Notifikasi app + e-mail ke alamat karyawan'}>
              <div className="mod-row" role="radiogroup" aria-label="Kanal pengiriman">{KANAL.map(([v, l]) => <label key={v} className={`mod ${kanal === v ? 'on' : ''}`}><input type="radio" name="bl-kanal" checked={kanal === v} onChange={() => setKanal(v)} />{l}</label>)}</div>
            </Field>
          </div>
          <Field label="Judul" hint={`Tersisa ${40 - judul.length} karakter`}><input maxLength={40} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Masukkan judul pesan broadcast" /></Field>
          <Field label="Isi Pesan" hint={`Tersisa ${160 - isi.length} karakter`}><textarea rows={4} maxLength={160} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Masukkan isi pesan broadcast" /></Field>
          <div className="row-end"><Btn icon="send" onClick={submit}>Submit</Btn></div>
        </div>
      </Card>}

      <h3 className="bl-h">Rekap blast per kategori</h3>
      <div className="rk-tiles four" role="group" aria-label="Rekap blast per kategori">{cats.map(([k, ic, c, l]) => { const lst = base.filter((b) => !k || b.kategori === k); const on = fcat === k; return (
        <button key={l} className={`rk-tile ${on ? 'on' : ''}`} style={{ borderTopColor: c }} aria-pressed={on} onClick={() => { setFcat(k); toList() }}>
          <span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{lst.length}</b>
          <small>{lst.reduce((a, b) => a + reach(b), 0)} penerima · {kanalCount('Keduanya', lst)} keduanya · {kanalCount('App', lst)} app · {kanalCount('Email', lst)} e-mail</small>
          <small className="rk-br">{brs.map((x) => `${short(x.name).split(' ')[0]} ${lst.filter((b) => hits(b, x.name)).length}`).join(' · ')}</small>
        </button>) })}</div>

      <Card title="Kategori × Branch" pad={false}><p className="muted sm bl-note">Jumlah blast yang menjangkau tiap Branch (blast ke Semua Branch dihitung di tiap Branch). Klik angka untuk melihat row datanya.</p>
        <div className="tbl-wrap"><table className="tbl bl-mx"><thead><tr><th>Kategori</th>{brs.map((x) => <th key={x.id} className="bl-n">{short(x.name)}</th>)}<th className="bl-n">Total blast</th></tr></thead>
          <tbody>{BLAST_CATS.map(([k, , c]) => { const lst = base.filter((b) => b.kategori === k); return (
            <tr key={k}><td><span className="bl-dot" style={{ background: c }} />{k}</td>
              {brs.map((x) => { const n = lst.filter((b) => hits(b, x.name)).length; return <td key={x.id} className="bl-n"><button className="linkish" aria-label={`${k} di ${x.name}: ${n}`} onClick={() => { setFcat(k); setFbr(x.name); toList() }}>{n}</button></td> })}
              <td className="bl-n"><b>{lst.length}</b></td></tr>) })}
            <tr className="tot"><td><b>Total</b></td>{brs.map((x) => <td key={x.id} className="bl-n"><b>{base.filter((b) => hits(b, x.name)).length}</b></td>)}<td className="bl-n"><b>{base.length}</b></td></tr></tbody></table></div>
      </Card>

      <div className="grid2">
        <Card title="Kanal pengiriman">{KANAL.map(([v, l]) => { const n = kanalCount(v, base); return (
          <button key={v} className={`bl-bar ${fkan === v ? 'on' : ''}`} onClick={() => { setFkan(fkan === v ? '' : v); toList() }}><span>{l}</span><span className="bl-track"><span style={{ width: `${base.length ? (n / base.length) * 100 : 0}%` }} /></span><b>{n}</b></button>) })}</Card>
        <Card title="Dikirim oleh">{senders.map((o) => { const l = base.filter((b) => b.oleh === o); const last = l[0]; return (
          <button key={o} className={`bl-who ${foleh === o ? 'on' : ''}`} onClick={() => { setFoleh(foleh === o ? '' : o); toList() }}><Avatar name={o} size={32} /><span><strong>{o}</strong><small className="muted">{scope.find((b) => b.oleh === o)?.peran} · terakhir {last ? `${fmtDate(last.tanggal)} ${last.jam}` : '—'}</small></span><b>{l.length}</b></button>) })}</Card>
      </div>

      <div className="filters anchor" id="bl-list"><Search value={q} onChange={setQ} ph="Cari judul / isi" />
        <Sel label="Kategori" value={fcat} onChange={setFcat} all="Semua kategori" opts={BLAST_CATS.map(([k]) => k)} />
        <Sel label="Branch" value={fbr} onChange={setFbr} all="Semua Branch" opts={brs.map((x) => [x.name, short(x.name)])} />
        <Sel label="Kanal" value={fkan} onChange={setFkan} all="Semua kanal" opts={KANAL} />
        <Sel label="Pengirim" value={foleh} onChange={setFoleh} all="Semua pengirim" opts={senders} />
        <label className="fsel"><span>Dari tanggal</span><input type="date" value={d1} onChange={(e) => setD1(e.target.value)} /></label>
        <label className="fsel"><span>Sampai tanggal</span><input type="date" value={d2} onChange={(e) => setD2(e.target.value)} /></label></div>
      {(fcat || fbr || fkan || foleh) && <p className="muted sm">Menampilkan {rows.length} blast{fcat && <> · {fcat}</>}{fbr && <> · {short(fbr)}</>}{fkan && <> · {kanalLabel(fkan)}</>}{foleh && <> · oleh {foleh}</>} <button className="linkish" onClick={() => { setFcat(''); setFbr(''); setFkan(''); setFoleh('') }}>Reset filter</button></p>}
      <Card pad={false}><Table rows={rows} empty="Belum ada pesan." cols={[
        { h: 'Judul', r: (r) => <><strong>{r.judul}</strong><small className="muted bl-isi">{r.isi}</small></> },
        { h: 'Kategori', r: (r) => <span className="bl-cat"><span className="bl-dot" style={{ background: (BLAST_CATS.find(([k]) => k === r.kategori) || [])[2] }} />{r.kategori}</span> },
        { h: 'Untuk', r: (r) => <>{r.ke === 'Semua' ? 'Semua Branch' : r.ke === '—' ? '' : r.ke.split(', ').map(short).join(', ')}{r.mitra?.length > 0 && <div><Badge t="info">{r.mitra.length} Mitra</Badge></div>}</> },
        { h: 'Kanal', r: (r) => <Badge t={r.kanal === 'Keduanya' ? 'ok' : r.kanal === 'App' ? 'warn' : 'neutral'}>{kanalLabel(r.kanal)}</Badge> },
        { h: 'Penerima', r: (r) => reach(r) },
        { h: 'Dikirim oleh', r: (r) => <><strong>{r.oleh}</strong><small className="muted" style={{ display: 'block' }}>{r.peran}</small></> },
        { h: 'Waktu', r: (r) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.tanggal)}<small className="muted" style={{ display: 'block' }}>{r.jam} WIB</small></span> },
        { h: 'Action', r: (r) => <div className="row-act">{can('d') && <button className="icon-btn" title="Hapus" aria-label={'Hapus ' + r.judul} onClick={() => setDel(r)}><Icon name="trash" size={18} /></button>}<Btn kind="ghost" perm="r" onClick={() => setDetail(r)}>Detail</Btn></div> }]} /></Card>
      <Modal open={!!detail} title={detail?.judul || ''} onClose={() => setDetail(null)} footer={<Btn kind="ghost" perm="r" onClick={() => setDetail(null)}>Close</Btn>}>{detail && <>
        <dl className="dl">{[['Kategori', detail.kategori], ['Untuk', detail.ke === 'Semua' ? 'Semua Branch' : detail.ke === '—' ? 'Tidak ke Branch' : detail.ke], ...(detail.mitra?.length ? [['Mitra', detail.mitra.map((id) => s.mitras.find((m) => m.id === id)?.name || id).join(', ')]] : []), ['Dikirim lewat', kanalLabel(detail.kanal)], ['Penerima', reach(detail) + ' karyawan'], ['Dikirim oleh', `${detail.oleh} (${detail.peran})`], ['Waktu', `${fmtDate(detail.tanggal)} ${detail.jam} WIB`]].map(([a, b]) => <React.Fragment key={a}><dt>{a}</dt><dd>{b}</dd></React.Fragment>)}</dl>
        <p>{detail.isi}</p></>}</Modal>
      <Modal open={!!err} title="Belum bisa dikirim" onClose={() => setErr('')} footer={<Btn perm="r" onClick={() => setErr('')}>Oke</Btn>}><div className="center"><span className="q-ic">!</span><p>{err}</p></div></Modal>
      <Confirm open={del} text={<>Hapus pesan <b>{del?.judul}</b>? Riwayat pesan ini akan hilang.</>} yes="Hapus" onNo={() => setDel(null)} onYes={() => { api.deleteBlast(del.id); setDel(null); toast('Pesan dihapus') }} />{t}
    </>
  )
}

// ---------- List Mitra ----------
export function MitraAdmin({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const [q, setQ] = useState(''); const [cr, setCr] = useState(false); const [req, setReq] = useState(false); const [cat, setCat] = useState('')
  const mine = s.mitras.filter((m) => (m.mitraDengan === 'Owner Kirana' ? (m.klien || []).includes('c1') : m.customer === 'c1'))
  if (sub) { const m = mine.find((x) => x.id === sub); if (!m) return <Empty text="Mitra tidak ditemukan." />
    return <MitraDetail m={m} onBack={() => go('mitra')} backLabel="List Mitra" /> }
  const tal = (m) => s.pool.filter((p) => p.mitra === m.name)
  const CATS = [['', 'Semua mitra', () => true, '#0a5950'], ['aktif', 'Perjanjian aktif', (m) => m.perjanjian?.status === 'Aktif', '#2f8f4e'], ['tunggu', 'Menunggu persetujuan', (m) => m.perjanjian?.status !== 'Aktif', '#d9a400'], ['kirana', 'Mitra Owner Kirana', (m) => m.mitraDengan === 'Owner Kirana', '#7a5af5'], ['sla', 'Ada permintaan lewat SLA', (m) => s.requisitions.some((r) => r.mitra === m.id && reqInfo(s, r).status === 'Lewat SLA'), '#c0452a']]
  const fn = (CATS.find((c) => c[0] === cat) || CATS[0])[2]
  const rows = mine.filter((m) => fn(m) && m.name.toLowerCase().includes(q.toLowerCase()))
  const reqs = s.requisitions.filter((r) => mine.some((m) => m.id === r.mitra))
  return (
    <>
      <PageHead title="List Mitra" sub="Mitra = penyedia talent (pola outsourcing). Akun dibuat Superadmin bersama aturan kerja sama yang wajib disetujui mitra."><div className="row-act"><Btn kind="ghost" icon="send" onClick={() => setReq(true)}>Teruskan lowongan</Btn><Btn icon="plus" onClick={() => setCr(true)}>Create Mitra Account</Btn></div></PageHead>
      <div className="rk-tiles" role="group" aria-label="Rekap mitra">{CATS.map(([k, l, f, c]) => { const l2 = mine.filter(f); const on = cat === k; return (
        <button key={l} className={`rk-tile ${on ? 'on' : ''}`} style={{ borderTopColor: c }} aria-pressed={on} onClick={() => { setCat(k); setTimeout(() => document.getElementById('mitra-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}>
          <span className="rk-h">{l}</span><b>{l2.length}</b><small>{l2.reduce((a, m) => a + tal(m).filter(tpActive).length, 0)} talent aktif · {l2.reduce((a, m) => a + tal(m).filter((p) => p.status === 'Hired').length, 0)} hired</small></button>) })}</div>
      <div id="mitra-list" className="anchor filters"><Search value={q} onChange={setQ} ph="Cari mitra" /></div>
      <Card pad={false}><Table rows={rows} empty="Mitra tidak ditemukan." onRow={(r) => go('mitra/' + r.id)} cols={[
        { h: 'Mitra', r: (r) => <div className="who"><Avatar name={r.name} size={36} /><div><strong>{r.name}</strong><div className="muted sm">{r.pic} · {r.email}</div></div></div> },
        { h: 'Kerja sama', r: (r) => <span className="sm">{r.mitraDengan === 'Owner Kirana' ? 'Owner Kirana' : 'Superadmin (perusahaan)'}</span> },
        { h: 'Skema billing', r: (r) => <span className="sm">{r.perjanjian?.billing}<span className="muted" style={{ display: 'block' }}>{r.perjanjian?.nilai}</span></span> },
        { h: 'API', r: (r) => (r.perjanjian?.api?.aktif ? <Badge t="ok">Aktif</Badge> : <span className="muted sm">Manual/CSV</span>) },
        { h: 'Talent', right: true, r: (r) => tal(r).filter(tpActive).length },
        { h: 'Hired', right: true, r: (r) => tal(r).filter((p) => p.status === 'Hired').length },
        { h: 'Perjanjian', r: (r) => <Badge t={PERJ_T[r.perjanjian?.status]}>{r.perjanjian?.status}</Badge> },
      ]} /></Card>
      <Card title={`Permintaan ke mitra · ${reqs.length}`} pad={false}><ReqTable rows={reqs} showMitra /></Card>
      <AturanCard title="Aturan & alur kerja sama mitra (berlaku untuk semua mitra)" />
      <MitraCreate open={cr} onClose={() => setCr(false)} />
      <ReqModal open={req} onClose={() => setReq(false)} mitras={mine} />{t}
    </>
  )
}

// ---------- Data Karyawan ----------
const BERKAS = ['Offering Letter', 'PKWT', 'Amandemen PKWT', 'Kontrak Internship', 'Kontrak Freelance']
const STATUS_BERKAS = ['None', 'Sent', 'Employee Signed', 'Full Signed']
export function DataKaryawan({ role, sub, go }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast()
  const [q, setQ] = useState(''); const [fl, setFl] = useState({ branch: '', berkas: '', doc: '', jalur: '', type: '', shift: '', divisi: '' })
  const [sel, setSel] = useState([]); const [bulk, setBulk] = useState(null); const [gear, setGear] = useState(null); const [hist, setHist] = useState(false)
  if (sub) return <TalentBio person={s.employees.find((e) => e.id === sub)} crumb="Data Karyawan" onBack={() => go('data-karyawan')} />
  const uniq = (k) => [...new Set(s.employees.map((e) => e[k]).filter(Boolean))]
  const berkasOf = (e) => (e.type === 'Magang' ? 'Kontrak Internship' : e.type === 'Freelance' ? 'Kontrak Freelance' : 'PKWT')
  const rows = s.employees.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) && (!fl.branch || e.branch === fl.branch) && (!fl.berkas || berkasOf(e) === fl.berkas) && ['doc', 'jalur', 'type', 'shift', 'divisi'].every((k) => !fl[k] || e[k] === fl[k]))
  const belum = s.employees.filter((e) => !e.divisi || !e.shift).length
  const allSel = rows.length > 0 && rows.every((r) => sel.includes(r.id))
  const F = (k, label, all, opts) => <Sel label={label} value={fl[k]} onChange={(v) => setFl({ ...fl, [k]: v })} all={all} opts={opts} />
  const download = () => dl(toast, { title: 'Data Karyawan - Kirana HRIS', meta: `${rows.length} karyawan (sesuai filter)`, cols: ['Nama', 'Branch', 'Jabatan', 'Tipe', 'Jalur', 'Berkas', 'Status Berkas', 'Shift', 'Lokasi', 'Divisi', 'Akun'], rows: rows.map((e) => [e.name, branch(e.branch), e.role, e.type, e.jalur, berkasOf(e), e.doc, e.shift, e.lokasi || 'Kantor Branch', e.divisi, e.enabled === false ? 'Disable' : 'Enable']), file: 'data-karyawan' })
  return (
    <>
      <PageHead title="Data Karyawan" sub="Status berkas, jalur, jabatan, shift, lokasi & divisi. Klik nama karyawan untuk data lengkapnya.">
        <Btn kind="ghost" icon="clock" onClick={() => setHist(true)}>History</Btn><Btn kind="ghost" icon="download" onClick={download}>Download All</Btn>
      </PageHead>
      {belum > 0 && <div className="warnbar"><Icon name="dot" size={14} />{belum} pegawai belum set Divisi dan Shift</div>}
      <div className="stats five">{[['Total', s.employees.length], ...STATUS_BERKAS.map((x) => [x, s.employees.filter((e) => e.doc === x).length])].map(([l, v]) => <button key={l} className={`stat clickable ${fl.doc === l ? 'sel' : ''}`} onClick={() => setFl({ ...fl, doc: l === 'Total' || fl.doc === l ? '' : l })}><div><div className="stat-v">{v}</div><div className="stat-l">{l}</div></div></button>)}</div>
      <div className="filters">
        {F('branch', 'Branch', 'Semua Branch', s.branches.map((b) => [b.id, b.name]))}{F('berkas', 'Berkas', 'Semua berkas', BERKAS)}{F('doc', 'Status Berkas', 'Semua status', STATUS_BERKAS)}
        {F('jalur', 'Jalur', 'Semua jalur', ['Selection', 'Non Selection'])}{F('type', 'Tipe Karyawan', 'Semua tipe', uniq('type'))}{F('shift', 'Shifting Time', 'Semua shift', uniq('shift'))}{F('divisi', 'Divisi', 'Semua divisi', uniq('divisi'))}
        <Search value={q} onChange={setQ} ph="Cari nama" />
      </div>
      <div className="filters"><label className="chk-l"><input type="checkbox" className="chk" checked={allSel} onChange={() => setSel(allSel ? [] : rows.map((r) => r.id))} />Select All</label>
        <Btn icon="settings" disabled={!sel.length} onClick={() => setBulk({ shift: 'Shift 1', lokasi: 'Kantor Branch' })}>Set Shift & Location ({sel.length})</Btn></div>
      <Card pad={false}><Table rows={rows} empty="Tidak ada karyawan untuk filter ini." cols={[
        { h: '', r: (r) => <input type="checkbox" className="chk" aria-label={'Pilih ' + r.name} checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} /> },
        { h: 'Karyawan', r: (r) => <div className="who"><Avatar name={r.name} size={44} /><div><a className="link" href={`#/app/${role}/data-karyawan/${r.id}`}>{r.name}</a><div className="muted sm">{branch(r.branch)}</div></div></div> },
        { h: 'Berkas', r: (r) => <div><div className="sm">{berkasOf(r)}</div><Badge>{r.doc}</Badge></div> },
        { h: 'Jalur', k: 'jalur' }, { h: 'Jabatan', k: 'role' }, { h: 'Tipe', r: (r) => <Badge t="neutral">{r.type}</Badge> },
        { h: 'Shift', r: (r) => (r.shift ? <Badge t="neutral">{r.shift}</Badge> : <Badge t="warn">Belum diatur</Badge>) }, { h: 'Lokasi', r: (r) => r.lokasi || 'Kantor Branch' }, { h: 'Divisi', r: (r) => r.divisi || <Badge t="warn">Belum diatur</Badge> },
        { h: 'Rekening', r: (r) => <Badge t={r.bankOk ? 'ok' : 'bad'}>{r.bankOk ? 'Tersinkron' : 'Belum sinkron'}</Badge> },
        { h: 'Action', r: (r) => <div className="row-act"><Toggle on={r.enabled !== false} onChange={() => { api.setEmp([r.id], { enabled: r.enabled === false }); toast(r.enabled === false ? 'Akses kerja diaktifkan' : 'Akses kerja dinonaktifkan') }} label={r.enabled !== false ? 'Enable' : 'Disable'} />
          <button className="icon-btn" title="Setup data karyawan" aria-label={'Setup ' + r.name} onClick={() => setGear({ id: r.id, name: r.name, role: r.role, divisi: r.divisi || '', shift: r.shift || 'Shift 1' })}><Icon name="settings" size={18} /></button></div> },
      ]} /></Card>
      <Modal open={!!bulk} title="Set Shift & Location" onClose={() => setBulk(null)} footer={<><Btn kind="ghost" onClick={() => setBulk(null)}>Batal</Btn><Btn onClick={() => { api.setEmp(sel, bulk); setBulk(null); toast(`Shift & lokasi diatur untuk ${sel.length} karyawan`); setSel([]) }}>Save</Btn></>}>
        {bulk && <div className="form"><p><Badge t="ok">{sel.length} karyawan</Badge> dipilih</p>
          <Field label="Shift kerja"><select value={bulk.shift} onChange={(e) => setBulk({ ...bulk, shift: e.target.value })}>{s.shifts.map((x) => <option key={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Lokasi kerja"><select value={bulk.lokasi} onChange={(e) => setBulk({ ...bulk, lokasi: e.target.value })}><option>Kantor Branch</option><option>WFA (bebas lokasi)</option></select></Field></div>}
      </Modal>
      <Modal open={!!gear} title={gear ? 'Setup Data Karyawan · ' + gear.name : ''} onClose={() => setGear(null)} footer={<><Btn kind="ghost" onClick={() => setGear(null)}>Batal</Btn><Btn onClick={() => { api.setEmp([gear.id], { role: gear.role, divisi: gear.divisi, shift: gear.shift }); setGear(null); toast('Data karyawan tersimpan') }}>Save</Btn></>}>
        {gear && <div className="form"><Field label="Role / Jabatan"><input value={gear.role} onChange={(e) => setGear({ ...gear, role: e.target.value })} /></Field>
          <Field label="Divisi"><select value={gear.divisi} onChange={(e) => setGear({ ...gear, divisi: e.target.value })}><option value="">Pilih divisi</option>{[...new Set([...uniq('divisi'), 'Human Capital', 'Finance'])].map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Shift Kerja Tetap"><div className="seg">{s.shifts.map((x) => x.name).map((x) => <button type="button" key={x} className={gear.shift === x ? 'on' : ''} onClick={() => setGear({ ...gear, shift: x })}>{x}</button>)}</div></Field></div>}
      </Modal>
      <Modal open={hist} title="History unduhan" onClose={() => setHist(false)} footer={<Btn kind="ghost" onClick={() => setHist(false)}>Close</Btn>}><Table rows={[{ f: 'data-karyawan_oktober-2026.xls', w: '2026-11-01' }, { f: 'data-karyawan_september-2026.xls', w: '2026-10-01' }]} cols={[{ h: 'File', k: 'f' }, { h: 'Tanggal', r: (r) => fmtDate(r.w) }]} /><p className="muted sm">Contoh riwayat. Di produksi berisi file yang pernah diunduh admin.</p></Modal>{t}
    </>
  )
}

// ---------- Payslip ----------
const MODE_T = { Terjadwal: 'ok', Manual: 'warn' }
const dtj = (iso) => { const d = new Date(iso); return `${fmtDate(iso.slice(0, 10))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const setupTxt = (c) => !c ? '—' : !c.aktif ? 'Otomatis nonaktif' : `${c.mode === 'setelah' ? 'Setelah transfer berhasil' : `Tiap tanggal ${c.tanggal}`} · ${c.jam} · ${[c.app && 'Aplikasi', c.email && 'E-mail'].filter(Boolean).join(' + ')}`
const nextRun = (c) => { if (!c?.aktif) return '—'; if (c.mode === 'setelah') return 'mengikuti disbursement berikutnya'; const t = new Date(); let d = new Date(t.getFullYear(), t.getMonth(), c.tanggal); if (d < new Date(t.getFullYear(), t.getMonth(), t.getDate())) d = new Date(t.getFullYear(), t.getMonth() + 1, c.tanggal); return `${fmtDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)} ${c.jam}` }
export function PayslipAdmin({ sub, go }) {
  if (sub === 'setup') return <PayslipSetup go={go} />
  return <PayslipMain go={go} />
}
function PayslipMain({ go }) {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast()
  const [fb, setFb] = useState(''); const [fy, setFy] = useState('2026'); const [cat, setCat] = useState(''); const [open, setOpen] = useState(null); const [q, setQ] = useState(''); const [fbl, setFbl] = useState(''); const [man, setMan] = useState(null); const [slip, setSlip] = useState(null); const [sel, setSel] = useState(null)
  const of = (bid) => s.payslips.filter((p) => emp(p.emp).branch === bid)
  const months = [...new Set(s.payslips.map((p) => p.bulan))]
  const cols = ['Karyawan', 'Branch', 'Bulan', 'Net dibayar']
  const row = (p) => [emp(p.emp).name, branch(emp(p.emp).branch), p.bulan, p.thp]
  const list = open ? of(open).filter((p) => emp(p.emp).name.toLowerCase().includes(q.toLowerCase()) && (!fbl || p.bulan === fbl)) : []
  const brs = s.branches.filter((b) => !fb || b.id === fb)
  // Rekap pengiriman
  const sends = s.payslipSends.filter((x) => x.at.startsWith(fy) && (!fb || x.branch === fb))
  // Berulang = karyawan yang sama menerima payslip periode & tipe yang sama lebih dari sekali
  const ek = (e, x) => `${e}|${x.branch}|${x.periode}|${x.tipe}`
  const tot = {}; sends.forEach((x) => x.emp.forEach((e) => { tot[ek(e, x)] = (tot[ek(e, x)] || 0) + 1 }))
  const seen = {}; const ke = {}; [...sends].sort((a, b) => a.at.localeCompare(b.at)).forEach((x) => { let mx = 0; x.emp.forEach((e) => { seen[ek(e, x)] = (seen[ek(e, x)] || 0) + 1; mx = Math.max(mx, seen[ek(e, x)]) }); ke[x.id] = mx })
  const rep = (x) => x.emp.some((e) => tot[ek(e, x)] > 1)
  const CATS = [
    ['', 'Semua pengiriman', 'send', sends],
    ['Terjadwal', 'Otomatis terjadwal', 'calendar', sends.filter((x) => x.mode === 'Terjadwal')],
    ['Manual', 'Manual Send', 'user', sends.filter((x) => x.mode === 'Manual')],
    ['berulang', 'Berulang di periode sama', 'layers', sends.filter(rep)],
    ['gagal', 'Ada yang gagal terkirim', 'x', sends.filter((x) => x.gagal > 0)],
  ]
  const rows = (CATS.find((c) => c[0] === cat) || CATS[0])[3]
  const nPay = (l) => l.reduce((a, x) => a + x.emp.length, 0)
  const cy = fy || String(new Date().getFullYear())
  const per = Array.from({ length: 12 }, (_, i) => { const m = `${cy}-${String(i + 1).padStart(2, '0')}`; return { l: BL[i].slice(0, 3), full: `${BL[i]} ${cy}`, v: sends.filter((x) => x.at.startsWith(m)).length } })
  const lastM = cy === String(new Date().getFullYear()) ? new Date().getMonth() + 1 : 12
  const groups = Object.values(sends.filter(rep).reduce((m, x) => { const k = `${x.branch}|${x.periode}|${x.tipe}`; const g = (m[k] = m[k] || { k, branch: x.branch, periode: x.periode, tipe: x.tipe, list: [], emps: new Set() }); g.list.push(x); x.emp.forEach((e) => { if (tot[ek(e, x)] > 1) g.emps.add(e) }); return m }, {}))
  const pick = (c) => { setCat(c); setTimeout(() => document.getElementById('ps-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const prev = man && s.payslipSends.filter((x) => x.branch === man.branch && x.periode === `${man.bulan} ${man.tahun}`)
  return (
    <>
      <PageHead title="Payslip" sub="Payslip dikirim otomatis sesuai jadwal pengiriman tiap Branch setelah disbursement berhasil. Manual Send dipakai bila perlu kirim ulang.">
        <Btn kind="ghost" icon="settings" perm="r" onClick={() => go('payslip-admin/setup')}>Setup Pengiriman</Btn>
        <Btn kind="ghost" icon="send" onClick={() => setMan({ branch: '', bulan: 'November', tahun: '2026', catatan: '' })}>Manual Send</Btn>
        <Btn icon="download" onClick={() => dl(toast, { title: 'Payslip - Kirana HRIS', meta: fb ? branch(fb) : 'Semua Branch', cols, rows: s.payslips.filter((p) => !fb || emp(p.emp).branch === fb).map(row), file: 'payslip_' + (fb || 'semua') })}>Download All Filtered</Btn>
      </PageHead>
      <div className="ps-sched">{s.branches.map((b) => <button key={b.id} className={`ps-sc ${s.payslipSetup[b.id]?.aktif ? 'on' : ''}`} onClick={() => go('payslip-admin/setup')}><Icon name="calendar" size={16} /><span><b>{b.name.replace('Branch ', '')}</b>{setupTxt(s.payslipSetup[b.id])}<small>Berikutnya: {nextRun(s.payslipSetup[b.id])}</small></span></button>)}</div>
      <div className="filters">
        <Sel label="Tahun" value={fy} onChange={setFy} all="Semua tahun" opts={['2026', '2025']} />
        <Sel label="Branch" value={fb} onChange={setFb} all="Semua Branch" opts={s.branches.map((b) => [b.id, b.name])} />
      </div>
      <div className="rk-tiles" role="group" aria-label="Rekap pengiriman payslip">{CATS.map(([k, l, ic, lst]) => <button key={l} className={`rk-tile ps-${k || 'all'} ${cat === k ? 'on' : ''}`} aria-pressed={cat === k} onClick={() => pick(k)}>
        <span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{lst.length}</b><small>{nPay(lst)} payslip terkirim{k === 'gagal' ? ` · ${lst.reduce((a, x) => a + x.gagal, 0)} gagal` : ''}</small>
        <small className="rk-br">{s.branches.map((b) => { const n = lst.filter((x) => x.branch === b.id).length; return n ? `${b.name.replace('Branch ', '')} ${n}` : null }).filter(Boolean).join(' · ') || '—'}</small></button>)}</div>
      <div className="dgrid two">
        <Card title={`Pengiriman per bulan ${cy}`} action={<span className="muted sm">jumlah pengiriman</span>}><Columns label="Jumlah pengiriman payslip per bulan" points={per.slice(0, lastM)} height={180} /></Card>
        <Card title="Pengiriman berulang di periode yang sama" action={<span className="muted sm">{groups.length} periode</span>} pad={false}>
          {groups.length ? <ul className="ps-rep">{groups.map((g) => <li key={g.k}><div><strong>{branch(g.branch)}</strong><span className="muted sm">{g.tipe === 'THR' ? 'THR ' : ''}{g.periode}</span></div><span className="sm">{g.emps.size} karyawan menerima lebih dari 1× <Badge t="warn">{g.list.length} kiriman</Badge></span><button className="linkish sm" onClick={() => { setCat('berulang'); pick('berulang') }}>Lihat</button></li>)}</ul> : <Empty text="Tidak ada pengiriman berulang." />}
        </Card>
      </div>
      <div id="ps-list" className="anchor" />
      <Card title={<span>Riwayat pengiriman <span className="muted sm">· {(CATS.find((c) => c[0] === cat) || CATS[0])[1]} · {rows.length} baris</span></span>} action={cat ? <Btn kind="ghost" perm="r" onClick={() => setCat('')}>Tampilkan semua</Btn> : null} pad={false}>
        <Table rows={rows} empty="Tidak ada pengiriman untuk kategori ini." onRow={setSel} cols={[
          { h: 'Waktu kirim', r: (x) => <span className="nowrap">{dtj(x.at)}</span> },
          { h: 'Periode', r: (x) => <div><strong>{x.tipe === 'THR' ? 'THR ' : ''}{x.periode}</strong>{ke[x.id] > 1 ? <div><Badge t="warn">Kirim ulang ke-{ke[x.id]}</Badge></div> : rep(x) ? <div className="muted sm">pengiriman awal, lalu dikirim ulang</div> : null}</div> },
          { h: 'Branch', r: (x) => branch(x.branch) },
          { h: 'Cara', r: (x) => <Badge t={MODE_T[x.mode]}>{x.mode}</Badge> },
          { h: 'Oleh', k: 'oleh' },
          { h: 'Payslip', right: true, r: (x) => <span className="nowrap">{x.emp.length}{x.gagal ? <span className="txt-bad sm"> · {x.gagal} gagal</span> : ''}</span> },
          { h: 'Catatan', r: (x) => <span className="sm">{x.catatan || '—'}</span> },
        ]} />
      </Card>
      <Card title="Payslip per Branch" pad={false}><Table rows={brs} cols={[{ h: 'Branch', r: (b) => <div className="who"><Avatar name={b.name.replace('Branch ', '')} size={34} /><strong>{b.name}</strong></div> }, { h: 'Payslip terbit', r: (b) => of(b.id).length },
        { h: 'Action', r: (b) => <div className="row-act"><button className="icon-btn" title="Unduh payslip Branch ini" aria-label={'Unduh ' + b.name} onClick={() => dl(toast, { title: 'Payslip - ' + b.name, cols, rows: of(b.id).map(row), file: 'payslip_' + b.id })}><Icon name="download" size={18} /></button>
          <Btn kind="ghost" onClick={() => { setOpen(b.id); setFbl('') }}>History</Btn><Btn kind="ghost" onClick={() => { setOpen(b.id); setFbl('') }}>Karyawan</Btn></div> }]} /></Card>
      <Modal open={!!sel} title={sel ? `Pengiriman payslip · ${branch(sel.branch)}` : ''} onClose={() => setSel(null)} footer={<Btn kind="ghost" onClick={() => setSel(null)}>Close</Btn>}>
        {sel && <><dl className="dl"><dt>Waktu kirim</dt><dd>{dtj(sel.at)}</dd><dt>Periode</dt><dd>{sel.tipe === 'THR' ? 'THR ' : ''}{sel.periode}</dd><dt>Cara</dt><dd>{sel.mode}{sel.mode === 'Terjadwal' ? ` (${setupTxt(s.payslipSetup[sel.branch])})` : ''}</dd><dt>Oleh</dt><dd>{sel.oleh}</dd><dt>Pengiriman</dt><dd>{ke[sel.id] > 1 ? `Kirim ulang ke-${ke[sel.id]} untuk periode ini` : rep(sel) ? 'Pengiriman awal (ada kiriman ulang setelahnya)' : 'Pengiriman tunggal'}</dd>{sel.catatan && <><dt>Catatan</dt><dd>{sel.catatan}</dd></>}</dl>
          <Table rows={sel.emp.map((id, i) => ({ id, ok: i >= sel.emp.length - (sel.gagal || 0) ? false : true }))} cols={[{ h: 'Karyawan', r: (x) => emp(x.id).name }, { h: 'Kanal', r: () => 'Aplikasi + E-mail' }, { h: 'Status', r: (x) => <Badge t={x.ok ? 'ok' : 'bad'}>{x.ok ? 'Terkirim' : 'E-mail gagal'}</Badge> }]} /></>}
      </Modal>
      <Modal wide open={!!open} title={open ? 'Payslip · ' + branch(open) : ''} onClose={() => setOpen(null)} footer={<Btn kind="ghost" onClick={() => setOpen(null)}>Close</Btn>}>
        <div className="filters"><Search value={q} onChange={setQ} ph="Cari nama" /><Sel label="Bulan" value={fbl} onChange={setFbl} all="Semua bulan" opts={months} /></div>
        <Table center rows={list} empty="Belum ada payslip." cols={[{ h: 'Karyawan', r: (p) => emp(p.emp).name }, { h: 'Bulan', k: 'bulan' }, { h: 'Terbit', r: (p) => (p.terbit ? fmtDate(p.terbit) : 'Otomatis') }, { h: 'Net dibayar', r: (p) => rupiah(p.thp) }, { h: 'Action', r: (p) => <Btn kind="ghost" onClick={() => setSlip(p)}>Detail</Btn> }]} />
      </Modal>
      <Modal open={!!slip} title={slip ? `Payslip ${slip.bulan}` : ''} onClose={() => setSlip(null)} footer={<Btn kind="ghost" onClick={() => setSlip(null)}>Close</Btn>}>{slip && <dl className="dl"><dt>Karyawan</dt><dd>{emp(slip.emp).name}</dd><dt>Branch</dt><dd>{branch(emp(slip.emp).branch)}</dd><dt>Periode</dt><dd>{slip.bulan}</dd><dt>Net dibayar</dt><dd>{rupiah(slip.thp)}</dd></dl>}</Modal>
      <Modal open={!!man} title="Manual Send" onClose={() => setMan(null)} footer={<><Btn kind="ghost" onClick={() => setMan(null)}>Batal</Btn><Btn disabled={!man?.branch || (prev?.length > 0 && man.catatan.trim().length < 5)} onClick={() => { api.sendPayslip(man.branch, `${man.bulan} ${man.tahun}`, { catatan: man.catatan.trim() }); setMan(null); setCat(''); toast(prev?.length ? 'Payslip dikirim ulang · tercatat sebagai pengiriman berulang' : 'Payslip dikirim ke karyawan aktif Branch tersebut') }}>Submit</Btn></>}>
        {man && <div className="form"><Field label="Branch"><select value={man.branch} onChange={(e) => setMan({ ...man, branch: e.target.value })}><option value="">Pilih Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <div className="form two"><Field label="Bulan"><select value={man.bulan} onChange={(e) => setMan({ ...man, bulan: e.target.value })}>{BL.map((b) => <option key={b}>{b}</option>)}</select></Field>
            <Field label="Tahun"><select value={man.tahun} onChange={(e) => setMan({ ...man, tahun: e.target.value })}><option>2026</option><option>2025</option></select></Field></div>
          {prev?.length > 0 && <div className="alert warn" role="status"><Icon name="bell" size={18} />Payslip {man.bulan} {man.tahun} untuk Branch ini sudah dikirim {prev.length}× (terakhir {dtj(prev[0].at)}, {prev[0].mode.toLowerCase()}). Pengiriman ini akan tercatat sebagai pengiriman berulang.</div>}
          <Field label={prev?.length ? 'Alasan kirim ulang (wajib)' : 'Catatan (opsional)'}><textarea rows={2} value={man.catatan} onChange={(e) => setMan({ ...man, catatan: e.target.value })} placeholder="Contoh: karyawan belum menerima e-mail" /></Field>
          <p className="muted sm">Payslip dikirim ke semua karyawan aktif di Branch tersebut lewat aplikasi dan e-mail.</p></div>}
      </Modal>{t}
    </>
  )
}
function PayslipSetup({ go }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast(); const pc = usePerm(); const canU = !pc || pc.can('u')
  const [bid, setBid] = useState(s.branches[0].id); const [all, setAll] = useState(() => structuredClone(s.payslipSetup)); const [why, setWhy] = useState(''); const [lb, setLb] = useState('')
  const f = all[bid]; const set = (p) => setAll({ ...all, [bid]: { ...f, ...p } })
  const dirty = JSON.stringify(f) !== JSON.stringify(s.payslipSetup[bid])
  const log = s.payslipSetupLog.filter((x) => !lb || x.branch === lb)
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button className="linkish" onClick={() => go('payslip-admin')}>Payslip</button><span>›</span><span>Setup Pengiriman</span></nav>
      <PageHead title="Setup Pengiriman Payslip" sub="Atur kapan payslip dikirim otomatis per Branch. Setiap perubahan tercatat di log." />
      <div className="tabs" role="tablist">{s.branches.map((b) => <button key={b.id} role="tab" aria-selected={bid === b.id} className={bid === b.id ? 'on' : ''} onClick={() => { setBid(b.id); setWhy('') }}>{b.name}</button>)}</div>
      <Card>
        {!canU && <Note>Akunmu hanya bisa melihat setup. Perubahan butuh izin Ubah di Payslip.</Note>}
        <fieldset className="ps" disabled={!canU}>
          <Toggle on={f.aktif} onChange={(v) => set({ aktif: v })} label="Kirim payslip otomatis" />
          {f.aktif && <>
            <fieldset className="rg mt"><legend>Waktu kirim</legend>
              <label className="chk-l"><input type="radio" name="pm" checked={f.mode === 'tanggal'} onChange={() => set({ mode: 'tanggal' })} />Tanggal tetap setiap bulan</label>
              <label className="chk-l"><input type="radio" name="pm" checked={f.mode === 'setelah'} onChange={() => set({ mode: 'setelah' })} />Segera setelah transfer gaji berhasil</label>
            </fieldset>
            <div className="form two">
              {f.mode === 'tanggal' && <Field label="Tanggal kirim" hint="Bila transfer gaji selesai setelah tanggal ini, payslip dikirim keesokan harinya."><select value={f.tanggal} onChange={(e) => set({ tanggal: Number(e.target.value) })}>{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Tanggal {d}</option>)}</select></Field>}
              <Field label="Jam kirim"><input type="time" value={f.jam} onChange={(e) => set({ jam: e.target.value })} /></Field>
            </div>
            <fieldset className="rg"><legend>Kanal</legend>
              <label className="chk-l"><input type="checkbox" checked={f.app} onChange={(e) => set({ app: e.target.checked })} />Notifikasi aplikasi karyawan</label>
              <label className="chk-l"><input type="checkbox" checked={f.email} onChange={(e) => set({ email: e.target.checked })} />E-mail</label>
            </fieldset>
          </>}
          <p className="muted sm mt">Saat ini: <b>{setupTxt(s.payslipSetup[bid])}</b> · berikutnya {nextRun(s.payslipSetup[bid])}. Payslip hanya dikirim untuk disbursement berstatus Success.</p>
          {dirty && <Field label="Alasan perubahan (wajib, masuk log)"><input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Contoh: menyesuaikan jadwal transfer" /></Field>}
        </fieldset>
        <div className="row-end"><Btn kind="ghost" perm="r" disabled={!dirty} onClick={() => { setAll({ ...all, [bid]: structuredClone(s.payslipSetup[bid]) }); setWhy('') }}>Batalkan</Btn><Btn perm="u" disabled={!dirty || why.trim().length < 5 || (f.aktif && !f.app && !f.email)} onClick={() => { api.savePayslipSetup(bid, all[bid], why.trim()); setWhy(''); toast('Setup pengiriman disimpan · tercatat di log') }}>Simpan</Btn></div>
      </Card>
      <Card title="Log perubahan setup" action={<label className="fsel"><span className="sr-only">Branch</span><select aria-label="Filter Branch log" value={lb} onChange={(e) => setLb(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>} pad={false}>
        <Table rows={log} empty="Belum ada perubahan." cols={[
          { h: 'Waktu', r: (x) => <span className="nowrap">{dtj(x.at)}</span> }, { h: 'Oleh', r: (x) => <div><strong>{x.oleh}</strong><div className="muted sm">{x.peran}</div></div> },
          { h: 'Branch', r: (x) => branch(x.branch) }, { h: 'Pengaturan', k: 'field' },
          { h: 'Perubahan', r: (x) => <span className="nowrap"><s className="muted">{x.sebelum}</s> → <b>{x.sesudah}</b></span> }, { h: 'Alasan', r: (x) => <span className="sm">{x.alasan}</span> },
        ]} />
      </Card>
      {t}
    </>
  )
}

// Matriks hak akses: baris = fitur, kolom = Lihat · Tambah · Ubah · Hapus
function PermMatrix({ f, setF }) {
  const groups = ADMIN_MENU.map((g) => ({ ...g, items: g.items.filter(([k]) => !SUPER_ONLY.includes(k)) })).filter((g) => g.items.length)
  const keys = groups.flatMap((g) => g.items.map(([k]) => k))
  const acc = f.acc || {}
  const has = (k, a) => (a === 'r' ? f.perms.includes(k) : !!acc[k]?.[a])
  const applies = (k, a) => a === 'r' || capsOf(k).includes(a)
  const write = (perms, nacc) => setF({ ...f, perms, acc: nacc })
  const setOne = (k, a, on, perms = [...f.perms], nacc = structuredClone(acc)) => {
    if (a === 'r') { if (on) { if (!perms.includes(k)) perms.push(k) } else { perms = perms.filter((x) => x !== k); delete nacc[k] } }
    else { nacc[k] = { ...(nacc[k] || {}), [a]: on }; if (on && !perms.includes(k)) perms.push(k) } // Tambah/Ubah/Hapus otomatis memberi akses Lihat
    return [perms, nacc]
  }
  const toggle = (k, a, on) => write(...setOne(k, a, on))
  const bulk = (ks, as, on) => { let p = [...f.perms], n = structuredClone(acc); ks.forEach((k) => as.forEach((a) => { if (applies(k, a)) [p, n] = setOne(k, a, on, p, n) })); write(p, n) }
  const colAll = (ks, a) => ks.filter((k) => applies(k, a)).every((k) => has(k, a))
  return (
    <>
      <div className="row-act mb">
        <Btn kind="ghost" perm="r" onClick={() => { const [p, n] = [[...keys], {}]; write(p, n) }}>Lihat saja semua fitur</Btn>
        <Btn kind="ghost" perm="r" onClick={() => bulk(keys, ['r', 'c', 'u', 'd'], true)}>Akses penuh semua fitur</Btn>
        <Btn kind="ghost" perm="r" onClick={() => write([], {})}>Kosongkan</Btn>
      </div>
      <div className="tbl-wrap"><table className="tbl pm">
        <thead><tr><th>Fitur</th>{ACTIONS.map(([a, l, h]) => <th key={a} className="c"><div>{l}</div><small>{h}</small></th>)}</tr></thead>
        {groups.map((g) => { const ks = g.items.map(([k]) => k); return (
          <tbody key={g.group}>
            <tr className="pm-g"><th scope="rowgroup">{g.group}</th>{ACTIONS.map(([a, l]) => { const any = ks.some((k) => applies(k, a)); return <td key={a} className="c">{any && <label className="pm-all"><input type="checkbox" className="chk" checked={colAll(ks, a)} onChange={(e) => bulk(ks, [a], e.target.checked)} aria-label={`${l} semua fitur ${g.group}`} />semua</label>}</td> })}</tr>
            {g.items.map(([k, l]) => <tr key={k} className={has(k, 'r') ? 'on' : ''}><th scope="row">{l}{FEATURE_NOTE[k] && <small className="pm-note">{FEATURE_NOTE[k]}</small>}</th>{ACTIONS.map(([a, al]) => <td key={a} className="c">{applies(k, a) ? <input type="checkbox" className="chk" checked={has(k, a)} onChange={(e) => toggle(k, a, e.target.checked)} aria-label={`${al} ${l}`} /> : <span className="muted" aria-label="Tidak berlaku">—</span>}</td>)}</tr>)}
          </tbody>) })}
      </table></div>
      <p className="muted sm">Mencentang Tambah, Ubah, atau Hapus otomatis memberi akses Lihat. Menghapus centang Lihat menutup seluruh akses ke fitur itu. "—" berarti aksi tersebut tidak ada di fitur itu.</p>
    </>
  )
}
