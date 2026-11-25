// Lowongan: Approval (admin), halaman detail dengan URL sendiri, halaman publik untuk kandidat,
// pendaftaran, lalu pilihan langsung pre-test atau melihat lowongan lain.
import React, { useMemo, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { useNavigate } from '../lib/router.jsx'
import { Btn, Card, Badge, Modal, Field, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { useLookup, fmtDate } from './shared.jsx'
import { Logo } from './Landing.jsx'
import { PretestTalent } from './pretest.jsx'

const BL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const LABEL = { Waiting: 'Approval', Approved: 'Approved', Rejected: 'Rejected' }
const base = () => `${location.origin}${location.pathname}`
export const publicUrl = (id) => `${base()}#/lowongan/${id}`
const months = (a, b) => { if (!a || !b) return ''; const n = Math.round((new Date(b) - new Date(a)) / (30.44 * 864e5)); return `${n} bulan` }
export const isOpen = (j) => j.status === 'Active' && j.approval === 'Approved' && (!j.tutup || j.tutup >= new Date().toISOString().slice(0, 10))

// Salin teks ke clipboard. Kalau browser menolak (mis. di dalam iframe), kembalikan false supaya UI bisa menampilkan tautannya.
export async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true } } catch (e) { /* lanjut ke cara lama */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok
  } catch (e) { return false }
}

// Bagikan: salin tautan publik. Kalau gagal, tampilkan kotak tautan untuk disalin manual.
function useShare(toast) {
  const [link, setLink] = useState('')
  const share = async (j) => { const url = publicUrl(j.id); if (await copyText(url)) toast('Tautan lowongan disalin. Tinggal tempel di mana pun.'); else setLink(url) }
  const box = <Modal open={!!link} title="Bagikan lowongan" onClose={() => setLink('')} footer={<Btn kind="ghost" onClick={() => setLink('')}>Tutup</Btn>}>
    <p className="muted">Browser tidak mengizinkan penyalinan otomatis. Salin tautan ini secara manual:</p>
    <div className="link-box"><input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Tautan lowongan" /></div>
  </Modal>
  return [share, box]
}

// ---------- Isi detail lowongan (dipakai admin & publik) ----------
function JobBody({ j, branchName }) {
  const facts = [['Jenis pekerjaan', j.jenis], ['Tingkat', j.tingkat], ['Dibutuhkan', `${j.kuota} orang`], ['Periode kerja', `${fmtDate(j.kerjaDari)} – ${fmtDate(j.kerjaSampai)}`], ['Durasi', months(j.kerjaDari, j.kerjaSampai)], ['Lamaran dibuka', `${fmtDate(j.buka)} – ${fmtDate(j.tutup)}`]]
  return (
    <>
      <div className="jd-facts">{facts.map(([k, v]) => <div key={k}><small>{k}</small><b>{v || '—'}</b></div>)}</div>
      <section className="jd-sec"><h2>Kualifikasi</h2><ul><li>Pengalaman: {j.pengalaman || '—'}</li><li>Pendidikan: {j.pendidikan || '—'}</li><li>Spesialisasi: {j.spesialisasi || '—'}</li></ul></section>
      <section className="jd-sec"><h2>Keuntungan & fasilitas</h2><ul>{(j.benefit || '—').split(', ').map((x) => <li key={x}>{x}</li>)}</ul></section>
      <section className="jd-sec"><h2>Jam kerja</h2><p>Senin – Jumat, 08.30–17.30</p></section>
      <section className="jd-sec"><h2>Deskripsi pekerjaan</h2><p>{j.deskripsi || `Bertanggung jawab atas pekerjaan ${j.posisi} di ${branchName}, bekerja sama dengan tim untuk mencapai target yang disepakati.`}</p></section>
    </>
  )
}
const JobHero = ({ j, branchName, children }) => (
  <div className="jd-hero">
    <Avatar name={branchName.replace('Branch ', '')} size={72} />
    <div className="grow"><h1>{j.posisi}</h1>
      <div className="meta"><span><Icon name="building" size={16} />{branchName}</span><span><Icon name="pin" size={16} />{j.lokasi}</span><span><Icon name="wallet" size={16} />IDR {j.gaji}</span></div></div>
    {children}
  </div>
)

// ---------- Admin: Approval Lowongan ----------
export function ApprovalJob({ role, sub, go }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast(); const [share, shareBox] = useShare(toast)
  const [fy, setFy] = useState(''); const [fm, setFm] = useState(''); const [fb, setFb] = useState(''); const [fs, setFs] = useState('')
  const [confirm, setConfirm] = useState(null); const [reject, setReject] = useState(null); const [note, setNote] = useState('')
  const years = [...new Set(s.jobs.map((j) => (j.posted || '').slice(0, 4)).filter(Boolean))].sort()
  const rows = s.jobs.filter((j) => (!fy || (j.posted || '').slice(0, 4) === fy) && (!fm || (j.posted || '').slice(5, 7) === fm) && (!fb || j.branch === fb) && (!fs || j.approval === fs))
    .sort((a, b) => (a.approval === 'Waiting' ? 0 : 1) - (b.approval === 'Waiting' ? 0 : 1) || (b.posted || '').localeCompare(a.posted || ''))
  const waiting = s.jobs.filter((j) => j.approval === 'Waiting').length
  const dialogs = <>
    <Modal open={!!confirm} title="Setujui lowongan" onClose={() => setConfirm(null)} footer={<><Btn kind="ghost" onClick={() => setConfirm(null)}>Batal</Btn><Btn onClick={() => { api.approveJob(confirm, true); setConfirm(null); toast('Lowongan disetujui dan langsung tayang') }}>Ya, setujui</Btn></>}>
      <p>Lowongan akan langsung tayang dan bisa dilamar talent lewat tautannya. Lanjutkan?</p>
    </Modal>
    <Modal open={!!reject} title="Tolak lowongan" onClose={() => setReject(null)} footer={<><Btn kind="ghost" onClick={() => setReject(null)}>Batal</Btn><Btn disabled={!note.trim()} onClick={() => { api.approveJob(reject, false, note.trim()); setReject(null); toast('Lowongan ditolak. Catatan dikirim ke Branch') }}>Kirim penolakan</Btn></>}>
      <Field label="Catatan untuk Branch" hint="Wajib diisi, supaya Branch tahu apa yang perlu diperbaiki."><textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: rentang gaji belum sesuai standar posisi ini" /></Field>
    </Modal>{shareBox}{t}</>

  if (sub) {
    const j = s.jobs.find((x) => x.id === sub)
    if (!j) return <><nav className="crumb"><button onClick={() => go('approval-lowongan')}>Approval Lowongan</button><span>›</span><b>Tidak ditemukan</b></nav><Empty text="Lowongan tidak ditemukan." /></>
    const bn = branch(j.branch)
    return (
      <>
        <nav className="crumb" aria-label="Breadcrumb"><button onClick={() => go('approval-lowongan')}>Approval Lowongan</button><span>›</span><b>{j.posisi}</b></nav>
        <div className="jd">
          <div className="card"><div className="card-b" style={{ display: 'grid', gap: 20 }}>
            <JobHero j={j} branchName={bn}><Badge>{j.approval === 'Approved' ? (isOpen(j) ? 'Tayang' : 'Ditutup') : LABEL[j.approval]}</Badge></JobHero>
            {j.approval === 'Rejected' && j.catatan && <Note><b>Catatan penolakan:</b> {j.catatan}</Note>}
            <JobBody j={j} branchName={bn} />
          </div></div>
          <aside className="jd-side"><Card title="Tindakan">
            <div style={{ display: 'grid', gap: 10 }}>
              {j.approval === 'Waiting' && <><Btn icon="check" onClick={() => setConfirm(j.id)}>Setujui</Btn><Btn kind="ghost" icon="x" onClick={() => { setNote(''); setReject(j.id) }}>Tolak</Btn></>}
              <Btn kind="ghost" icon="share" onClick={() => share(j)}>Salin tautan lowongan</Btn>
              <a className="btn btn-ghost" href={'#/lowongan/' + j.id} target="_blank" rel="noopener"><Icon name="eye" size={18} />Lihat sebagai talent</a>
              <p className="muted sm" style={{ margin: 0 }}>Diajukan {fmtDate(j.posted)} oleh {bn}. {j.pelamar ? `${j.pelamar} pelamar.` : 'Belum ada pelamar.'}</p>
            </div></Card></aside>
        </div>{dialogs}
      </>
    )
  }

  return (
    <>
      <PageHead title="Approval Lowongan" sub="Klik kartu untuk membuka detail lowongan di tab baru."><span className="review-pill">Perlu ditinjau: <b>{waiting}</b></span></PageHead>
      <div className="filters">
        <label className="fsel"><span>Tahun</span><select value={fy} onChange={(e) => setFy(e.target.value)}><option value="">Semua tahun</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="fsel"><span>Bulan</span><select value={fm} onChange={(e) => setFm(e.target.value)}><option value="">Semua bulan</option>{BL.map((b, i) => <option key={b} value={String(i + 1).padStart(2, '0')}>{b}</option>)}</select></label>
        <label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="fsel"><span>Status</span><select value={fs} onChange={(e) => setFs(e.target.value)}><option value="">Semua status</option><option value="Waiting">Approval</option><option>Approved</option><option>Rejected</option></select></label>
      </div>
      {rows.length ? <div className="job-grid">{rows.map((j) => (
        <article key={j.id} className={`job-card ${j.approval.toLowerCase()}`}>
          <a className="job-main" href={`#/app/${role}/approval-lowongan/${j.id}`} target="_blank" rel="noopener" aria-label={`Buka detail ${j.posisi} di tab baru`}>
            <Avatar name={branch(j.branch).replace('Branch ', '')} size={56} />
            <div>
              <div className="job-meta"><span>{fmtDate(j.posted)}</span><span className="job-st">{LABEL[j.approval]}</span></div>
              <strong>{j.posisi}</strong>
              <span>{branch(j.branch)}</span>
              <span>IDR {j.gaji} · {j.kuota} orang</span>
            </div>
          </a>
          <div className="job-acts">
            <button className="icon-btn" aria-label="Salin tautan lowongan" title="Salin tautan" onClick={() => share(j)}><Icon name="share" size={18} /></button>
            {j.approval === 'Waiting' && <>
              <button className="icon-btn" aria-label="Tolak" title="Tolak" onClick={() => { setNote(''); setReject(j.id) }}><Icon name="x" size={18} /></button>
              <button className="icon-btn" aria-label="Setujui" title="Setujui" onClick={() => setConfirm(j.id)}><Icon name="check" size={18} /></button>
            </>}
          </div>
        </article>))}</div> : <Card><Empty text="Tidak ada lowongan untuk filter ini." /></Card>}
      {dialogs}
    </>
  )
}

// =====================================================================
// Halaman publik
// =====================================================================
function PubLayout({ children, cta }) {
  return (
    <div className="pub">
      <header className="pub-nav"><div className="pub-nav-in"><a href="#/" className="brand"><Logo /></a>{cta}</div></header>
      <main className="pub-main">{children}</main>
      <footer className="pub-foot">Kirana · Semua urusan orang, rapi di satu meja.</footer>
    </div>
  )
}

export function PublicJobs() {
  const s = useStore(); const { branch } = useLookup(); const [q, setQ] = useState('')
  const list = s.jobs.filter(isOpen).filter((j) => `${j.posisi} ${branch(j.branch)} ${j.lokasi}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <PubLayout cta={<a className="btn btn-ghost" href="#/login">Masuk</a>}>
      <div className="page-head"><div><h1>Lowongan yang sedang dibuka</h1><p>Pilih yang paling cocok, lalu lamar dalam beberapa menit.</p></div></div>
      <label className="search" style={{ maxWidth: 480 }}><Icon name="search" size={18} /><input placeholder="Cari posisi, Branch, atau kota" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari lowongan" /></label>
      {list.length ? <div className="pub-jobs">{list.map((j) => (
        <a key={j.id} className="pub-job" href={'#/lowongan/' + j.id}>
          <Avatar name={branch(j.branch).replace('Branch ', '')} size={48} />
          <div className="grow"><strong>{j.posisi}</strong><small>{branch(j.branch)} · {j.lokasi}</small><small>IDR {j.gaji} · tutup {fmtDate(j.tutup)}</small></div>
          <Icon name="arrowRight" size={18} />
        </a>))}</div> : <Card><Empty text="Belum ada lowongan yang cocok. Coba kata kunci lain." /></Card>}
    </PubLayout>
  )
}

export function PublicJob({ id }) {
  const s = useStore(); const { branch } = useLookup(); const nav = useNavigate(); const [t, toast] = useToast(); const [share, shareBox] = useShare(toast)
  const j = s.jobs.find((x) => x.id === id)
  if (!j) return <PubLayout><Empty text="Lowongan tidak ditemukan atau sudah dihapus." /><a className="btn btn-primary" href="#/lowongan">Lihat lowongan lain</a></PubLayout>
  const bn = branch(j.branch); const open = isOpen(j)
  const apply = () => nav('/daftar/' + j.id)
  return (
    <PubLayout cta={<a className="btn btn-ghost" href="#/lowongan">Lowongan lain</a>}>
      <nav className="crumb"><a href="#/lowongan">Lowongan</a><span>›</span><b>{j.posisi}</b></nav>
      {!open && <Note>{j.approval === 'Approved' ? 'Lowongan ini sudah ditutup.' : 'Lowongan ini belum tayang, jadi belum bisa dilamar.'} Lihat lowongan lain yang masih dibuka.</Note>}
      <div className="jd">
        <div className="card"><div className="card-b" style={{ display: 'grid', gap: 20 }}>
          <JobHero j={j} branchName={bn} />
          <JobBody j={j} branchName={bn} />
        </div></div>
        <aside className="jd-side"><Card>
          <div style={{ display: 'grid', gap: 10 }}>
            <strong style={{ fontFamily: 'Poppins', fontSize: '1.05rem' }}>{open ? 'Tertarik dengan posisi ini?' : 'Lowongan belum bisa dilamar'}</strong>
            <p className="muted sm" style={{ margin: 0 }}>{open ? `Lamaran ditutup ${fmtDate(j.tutup)}. Setelah daftar, kamu bisa langsung mengerjakan pre-test.` : 'Cek lagi nanti atau lihat lowongan lain.'}</p>
            <Btn icon="send" disabled={!open} onClick={apply}>Lamar sekarang</Btn>
            <Btn kind="ghost" icon="share" onClick={() => share(j)}>Bagikan</Btn>
          </div></Card></aside>
      </div>
      {open && <div className="apply-bar"><Btn kind="ghost" icon="share" onClick={() => share(j)} aria-label="Bagikan" /><Btn icon="send" onClick={apply}>Lamar sekarang</Btn></div>}
      {shareBox}{t}
    </PubLayout>
  )
}

// ---------- Daftar → pilihan langkah berikutnya ----------
export function Register({ jobId }) {
  const s = useStore(); const { branch } = useLookup(); const nav = useNavigate()
  const j = s.jobs.find((x) => x.id === jobId)
  const [f, setF] = useState({ name: '', email: '', hp: '', kelamin: '', pendidikan: '', pass: '', setuju: false })
  const [err, setErr] = useState({}); const [done, setDone] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = (e) => {
    e.preventDefault()
    const x = {}
    if (f.name.trim().length < 3) x.name = 'Tulis nama lengkap sesuai KTP.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) x.email = 'Format e-mail belum benar.'
    if (!/^(\+62|0)8\d{7,12}$/.test(f.hp.replace(/[\s-]/g, ''))) x.hp = 'Gunakan nomor HP aktif, contoh 0812xxxxxxx.'
    if (!f.kelamin) x.kelamin = 'Pilih salah satu.'
    if (!f.pendidikan) x.pendidikan = 'Pilih pendidikan terakhir.'
    if (f.pass.length < 8) x.pass = 'Minimal 8 karakter.'
    if (!f.setuju) x.setuju = 'Centang persetujuan untuk melanjutkan.'
    setErr(x); if (Object.keys(x).length) return
    setDone(api.registerCandidate({ name: f.name.trim(), email: f.email.trim(), hp: f.hp.trim(), kelamin: f.kelamin, pendidikan: f.pendidikan, job: j?.id }))
  }
  const modul = j?.pretest?.length ? j.pretest : s.pretestSets.find((x) => x.aktif)?.modul || []
  const menit = modul.reduce((a, m) => a + Number(m.durasi || 0), 0)
  if (done) return (
    <PubLayout>
      <div className="reg"><Card><div style={{ display: 'grid', gap: 16 }}>
        <div className="reg-steps" aria-hidden="true"><i className="on" /><i className="on" /><i /></div>
        <div><h1 style={{ fontSize: '1.5rem' }}>Akunmu sudah jadi, {f.name.split(' ')[0]}!</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>{j ? <>Lamaran untuk <b>{j.posisi}</b> di {branch(j.branch)} sudah tercatat. </> : null}Mau lanjut ke mana?</p></div>
        <div className="choice">
          <button className="main-c" onClick={() => nav('/pretest/' + (j?.id || 'umum'))}><span className="ic"><Icon name="test" /></span><span className="grow"><strong>Kerjakan pre-test sekarang</strong><small>{modul.length} modul · sekitar {menit} menit. Siapkan koneksi stabil dan tempat yang tenang.</small></span><Icon name="arrowRight" /></button>
          <button onClick={() => nav('/lowongan')}><span className="ic"><Icon name="briefcase" /></span><span className="grow"><strong>Lihat lowongan lain dulu</strong><small>Pre-test bisa dikerjakan nanti dari akunmu, sebelum lamaran ditutup.</small></span><Icon name="arrowRight" /></button>
        </div>
        <p className="muted sm" style={{ margin: 0 }}>Kami juga mengirim ringkasan ke {f.email}.</p>
      </div></Card></div>
    </PubLayout>
  )
  return (
    <PubLayout cta={<a className="btn btn-ghost" href="#/login">Masuk</a>}>
      <div className="reg"><Card><form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
        <div className="reg-steps" aria-hidden="true"><i className="on" /><i /><i /></div>
        <div><h1 style={{ fontSize: '1.5rem' }}>Buat akun untuk melamar</h1>
          {j ? <p className="muted" style={{ margin: '6px 0 0' }}>Kamu melamar <b>{j.posisi}</b> · {branch(j.branch)}</p> : <p className="muted" style={{ margin: '6px 0 0' }}>Satu akun untuk semua lamaranmu.</p>}</div>
        <div className="form">
          <Field label="Nama lengkap" hint={err.name}><input value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!err.name} /></Field>
          <div className="form two">
            <Field label="E-mail" hint={err.email}><input type="email" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!err.email} /></Field>
            <Field label="No. HP (WhatsApp)" hint={err.hp}><input type="tel" inputMode="tel" value={f.hp} onChange={set('hp')} autoComplete="tel" placeholder="0812xxxxxxx" aria-invalid={!!err.hp} /></Field>
            <Field label="Jenis kelamin" hint={err.kelamin}><select value={f.kelamin} onChange={set('kelamin')} aria-invalid={!!err.kelamin}><option value="">Pilih</option><option>Laki-laki</option><option>Perempuan</option></select></Field>
            <Field label="Pendidikan terakhir" hint={err.pendidikan}><select value={f.pendidikan} onChange={set('pendidikan')} aria-invalid={!!err.pendidikan}><option value="">Pilih</option>{['SMA/SMK', 'D3', 'S1', 'S2', 'S3'].map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <Field label="Kata sandi" hint={err.pass || 'Minimal 8 karakter.'}><input type="password" value={f.pass} onChange={set('pass')} autoComplete="new-password" aria-invalid={!!err.pass} /></Field>
          <label className="chk-l"><input type="checkbox" className="chk" checked={f.setuju} onChange={set('setuju')} />Saya setuju data saya dipakai untuk proses rekrutmen.</label>
          {err.setuju && <p className="err-t">{err.setuju}</p>}
        </div>
        <Btn type="submit" className="full">Daftar & lanjutkan</Btn>
      </form></Card></div>
    </PubLayout>
  )
}

export function PublicPretest({ jobId }) {
  const s = useStore(); const j = s.jobs.find((x) => x.id === jobId)
  return (
    <PubLayout cta={<a className="btn btn-ghost" href="#/lowongan">Lowongan lain</a>}>
      <div className="reg-steps" aria-hidden="true" style={{ maxWidth: 560 }}><i className="on" /><i className="on" /><i className="on" /></div>
      <PretestTalent modul={j?.pretest?.length ? j.pretest : null} title={j ? `Pre-test · ${j.posisi}` : undefined} />
    </PubLayout>
  )
}
