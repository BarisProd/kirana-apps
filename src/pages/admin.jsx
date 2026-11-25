import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { rupiah, calcRow, calcRemunRow, DEFAULT_SETUP } from '../services/payroll.js'
import { Btn, Card, Badge, Stat, Table, Tabs, Modal, Field, Toggle, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { useLookup, fmtDate, ApprovalLine, RemunSummary, TalentBio, useExport, exportRemun } from './shared.jsx'
import { QuickSummary, tpActive, reqInfo } from './talentPoolUI.jsx'
import { TP_STATUS } from '../data/talentPool.js'
import { Sticker, ArtHead } from '../components/Sticker.jsx'
import { Organisasi, KategoriKaryawan, useDraft, DraftBar } from './admin3.jsx'
import { drafts } from '../services/drafts.js'
import { ADMIN_MENU, SUPER_ONLY } from './menus.js'
import { KalenderKerja, ShiftSetup } from './absensi2.jsx'
import { SetupAbsen } from './setupAbsen.jsx'
import { exportExcel } from '../services/export.js'

// ---------- Dashboard ----------
export function Dashboard({ go, role, me }) {
  const s = useStore()
  const waitingLeave = s.leaves.filter((l) => l.status === 'Waiting').length
  const waitingOt = s.overtimes.filter((l) => l.status === 'Waiting').length
  const waitingRb = s.reimbursements.filter((l) => l.status === 'Waiting').length
  const hadir = s.attendance.filter((a) => a.tanggal === '2026-11-11' && a.status !== 'Cuti').length
  return (
    <>
      <ArtHead art="analisa" title={`Halo, ${role === 'admin' ? me.name.split(' ')[0] : 'Rani'}!`} sub="Ringkasan hari ini, Kamis 12 November 2026. Cek persetujuan yang menunggu dan pantau angka penting di bawah." />
      <div className="stats">
        <Stat icon="users" label="Karyawan aktif" value={s.employees.filter((e) => e.status === 'Aktif').length} />
        <Stat icon="clock" label="Hadir hari ini" value={hadir} hint="1 cuti" />
        <Stat icon="approval" label="Menunggu approval" value={waitingLeave + waitingOt + waitingRb + s.remunerations.filter((r) => r.status === 'In Review').length + s.jobs.filter((j) => j.approval === 'Waiting').length} />
        <Stat icon="calendar" label="Kontrak habis bulan ini" value={s.employees.filter((e) => e.end.startsWith('2026-11')).length} />
      </div>
      <div className="grid2">
        <Card title="Perlu ditindaklanjuti">
          <ul className="todo">
            {[
              ['Approval lowongan', s.jobs.filter((j) => j.approval === 'Waiting').length, 'approval-lowongan'],
              ['Approval remunerasi', s.remunerations.filter((r) => r.status === 'In Review').length, 'approval-remunerasi'],
              ['Dokumen belum dikirim', s.docBatches.filter((b) => b.status === 'Process').length, 'send-document'],
              ['Cuti menunggu', waitingLeave, 'cuti'], ['Lembur menunggu', waitingOt, 'lembur'], ['Reimbursement menunggu', waitingRb, 'reimbursement'],
              ['Pre-test belum dinilai', s.pool.filter((p) => p.status === 'Pending Assessment').length, 'penilaian'],
            ].map(([l, n, k]) => <li key={k}><button onClick={() => go(k)}><span>{l}</span><Badge t={n ? 'warn' : 'ok'}>{n ? n : 'Beres'}</Badge></button></li>)}
          </ul>
        </Card>
        <Card title="Mitra talent pool" action={<Btn kind="ghost" onClick={() => go('mitra')}>List Mitra</Btn>}>
          <ul className="todo">{s.mitras.filter((m) => m.mitraDengan === 'Owner Kirana' ? (m.klien || []).includes('c1') : true).map((m) => { const n = s.pool.filter((p) => p.mitra === m.name && tpActive(p)).length; const lewat = s.requisitions.filter((r) => r.mitra === m.id && reqInfo(s, r).status === 'Lewat SLA').length
            return <li key={m.id}><button onClick={() => go('mitra/' + m.id)}><span>{m.name}<small className="muted" style={{ display: 'block' }}>{n} talent aktif · {m.mitraDengan === 'Owner Kirana' ? 'mitra Kirana' : 'mitra perusahaan'}</small></span>{m.perjanjian?.status !== 'Aktif' ? <Badge t="warn">Menunggu persetujuan</Badge> : lewat ? <Badge t="bad">{lewat} lewat SLA</Badge> : <Badge t="ok">Aktif</Badge>}</button></li> })}</ul>
        </Card>
      </div>
      <QuickSummary list={s.pool} value="" onPick={(v) => go('talent-pool')} title="Talent Pool · Quick Summary" sub="Klik untuk membuka Talent Pool" />
    </>
  )
}

// ---------- Blast ----------
export function Blast() {
  const s = useStore(); const [t, toast] = useToast()
  const [f, setF] = useState({ judul: '', isi: '', ke: 'Semua' })
  return (
    <>
      <PageHead title="Blast Notifikasi" sub="Kirim pengumuman ke karyawan lewat app & email." />
      <div className="grid2">
        <Card title="Pesan baru">
          <form className="form" onSubmit={(e) => { e.preventDefault(); if (!f.judul) return; api.blast({ ...f, tanggal: '2026-11-12' }); setF({ judul: '', isi: '', ke: 'Semua' }); toast('Pesan terkirim ke ' + f.ke) }}>
            <Field label="Kirim ke"><select value={f.ke} onChange={(e) => setF({ ...f, ke: e.target.value })}><option>Semua</option>{s.branches.map((b) => <option key={b.id}>{b.name}</option>)}</select></Field>
            <Field label="Judul" hint={`${40 - f.judul.length} karakter tersisa`}><input maxLength={40} value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} placeholder="Contoh: Libur Natal" /></Field>
            <Field label="Isi pesan"><textarea maxLength={160} rows={4} value={f.isi} onChange={(e) => setF({ ...f, isi: e.target.value })} /></Field>
            <Btn icon="send" disabled={!f.judul}>Kirim</Btn>
          </form>
        </Card>
        <Card title="Riwayat"><Table cols={[{ h: 'Judul', k: 'judul' }, { h: 'Untuk', k: 'ke' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }]} rows={s.blasts} /></Card>
      </div>{t}
    </>
  )
}

// ---------- Talent Pool (dipakai admin & branch) ----------
export function TalentPoolView({ canOffer = true, role, sub, go }) {
  const s = useStore(); const { job, pool } = useLookup(); const [t, toast] = useToast()
  const [filter, setFilter] = useState('Semua'); const [showOff, setShowOff] = useState(false); const [sel, setSel] = useState([]); const [offer, setOffer] = useState(false); const [jobSel, setJobSel] = useState('')
  const [fp, setFp] = useState(''); const [fx, setFx] = useState(''); const [fk, setFk] = useState(''); const [fsp, setFsp] = useState(''); const [q, setQ] = useState(''); const [fmt, setFmt] = useState('')
  const statuses = ['Semua', 'Registered', 'Pending Assessment', 'Active Pool', 'In Hiring Process', 'Hired']
  const tips = { Registered: 'Baru mendaftar, belum mengerjakan pre-test', 'Pending Assessment': 'Pre-test belum dinilai admin', 'Active Pool': 'Bisa langsung ditawari lowongan', 'In Hiring Process': 'Sedang ikut seleksi', Hired: 'Berhasil diterima' }
  const uniq = (k) => [...new Set(s.pool.map((p) => p[k]).filter(Boolean))]
  const komp = (p) => (p.skor == null ? 'Belum dinilai' : p.skor >= 80 ? '80–100' : p.skor >= 60 ? '60–79' : '< 60')
  const BLUE = TP_STATUS.filter((x) => x[4]).map((x) => x[0])
  const base = role === 'branch' ? s.pool.filter((p) => BLUE.includes(p.status)) : s.pool
  const rows = base.filter((p) => (filter === 'Semua' ? tpActive(p) || showOff : p.status === filter) && (!fp || p.pendidikan === fp) && (!fx || p.pengalaman === fx) && (!fk || komp(p) === fk) && (!fsp || p.spesialisasi === fsp) && (!fmt || p.mitra === fmt) && p.name.toLowerCase().includes(q.toLowerCase()))
  const active = s.jobs.filter((j) => j.status === 'Active')
  if (sub) return <TalentBio person={s.pool.find((p) => p.id === sub)} crumb="Talent Pool" onBack={() => go('talent-pool')} />
  return (
    <>
      <ArtHead art="kaca" title="Talent Pool" sub="Kandidat yang tidak lolos lowongan otomatis masuk ke sini. Klik nama talent untuk melihat data lengkapnya.">
        {canOffer && <Btn icon="send" disabled={!sel.length} onClick={() => setOffer(true)}>Offer to Talent ({sel.length})</Btn>}
      </ArtHead>
      <QuickSummary list={base} role={role} value={filter === 'Semua' ? '' : filter} onPick={(v) => setFilter(v || 'Semua')} sub={role === 'branch' ? 'Talent siap diundang ke lowongan Branch-mu' : `${s.mitras.length} mitra · ${base.filter((p) => !p.consent && tpActive(p)).length} talent belum consent PDP`} />
      <div className="filters">
        <label className="fsel"><span>Pendidikan</span><select value={fp} onChange={(e) => setFp(e.target.value)}><option value="">Pilih Pendidikan</option>{uniq('pendidikan').map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel"><span>Pengalaman</span><select value={fx} onChange={(e) => setFx(e.target.value)}><option value="">Pilih Pengalaman</option>{uniq('pengalaman').map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel"><span>Tes Kompetensi</span><select value={fk} onChange={(e) => setFk(e.target.value)}><option value="">Pilih Tes Kompetensi</option>{['80–100', '60–79', '< 60', 'Belum dinilai'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel"><span>Spesialisasi</span><select value={fsp} onChange={(e) => setFsp(e.target.value)}><option value="">Pilih Spesialisasi</option>{uniq('spesialisasi').map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel"><span>Mitra</span><select value={fmt} onChange={(e) => setFmt(e.target.value)}><option value="">Pilih Mitra</option>{uniq('mitra').map((x) => <option key={x} value={x}>{x === '—' ? 'Tanpa mitra' : x}</option>)}</select></label>
        <label className="fsel grow"><span>Cari Kandidat</span><span className="search"><Icon name="search" size={18} /><input placeholder="Cari kandidat" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      {role !== 'branch' && <label className="chk-l sm"><input type="checkbox" className="chk" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} />Tampilkan talent nonaktif</label>}
      <Card pad={false} title={`Daftar talent · ${filter === 'Semua' ? 'Semua' : TP_STATUS.find((x) => x[0] === filter)?.[1]}`}>
        <Table center rows={rows} empty="Tidak ada talent untuk filter ini." cols={[
          { h: '', r: (r) => canOffer && r.status === 'Active Pool' && r.consent ? <input type="checkbox" className="chk" aria-label={'Pilih ' + r.name} checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} /> : null },
          { h: 'Talent', r: (r) => <div className="who"><Avatar name={r.name} size={34} /><div><a className="link" href={`#/app/${role}/talent-pool/${r.id}`}>{r.name}</a><div className="muted sm">{r.spesialisasi} · {r.pendidikan}</div></div></div> },
          { h: 'Ekspektasi gaji', r: (r) => (r.ekspektasi ? rupiah(r.ekspektasi) : '—') },
          { h: 'Pengalaman', k: 'pengalaman' }, { h: 'Skor pre-test', r: (r) => r.skor ?? '—' }, { h: 'Mitra', r: (r) => (r.mitra && r.mitra !== '—' ? r.mitra : <span className="muted">Daftar sendiri</span>) },
          { h: 'Consent PDP', r: (r) => (r.consent ? <Badge t="ok">Ada</Badge> : <Badge t="bad">Belum</Badge>) },
          { h: 'Status', r: (r) => <Badge t={r.status === 'Nonaktif' ? 'neutral' : undefined}>{TP_STATUS.find((x) => x[0] === r.status)?.[1] || r.status}</Badge> },
        ]} />
      </Card>
      {s.offers.length > 0 && <Card title="Tawaran terkirim" pad={false}><Table center rows={s.offers} cols={[{ h: 'Talent', r: (r) => pool(r.talent).name }, { h: 'Lowongan', r: (r) => job(r.job).posisi }, { h: 'Batas jawab', r: (r) => fmtDate(r.batas) }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} /></Card>}
      <Modal open={offer} title="Offer to Talent" onClose={() => setOffer(false)} footer={<><Btn kind="ghost" onClick={() => setOffer(false)}>Batal</Btn><Btn disabled={!jobSel} onClick={() => { api.offerTalent(sel, jobSel); setOffer(false); setSel([]); toast('Tawaran terkirim — talent akan memilih lanjut atau tidak') }}>Kirim tawaran</Btn></>}>
        <p className="muted">Pilih lowongan yang cocok. Talent menerima notifikasi app & email dan memutuskan sendiri mau lanjut atau tidak.</p>
        <div className="pick-list">{active.map((j) => {
          const applied = sel.some((t) => s.offers.some((o) => o.talent === t && o.job === j.id))
          return <label key={j.id} className={`pick ${jobSel === j.id ? 'on' : ''}`}><input type="radio" name="job" checked={jobSel === j.id} onChange={() => setJobSel(j.id)} /><div><strong>{j.posisi}</strong><small>{j.gaji} · {j.lokasi}</small></div>{applied && <Badge t="warn">Sudah ditawarkan</Badge>}</label>
        })}</div>
      </Modal>{t}
    </>
  )
}
export const TalentPool = (p) => <TalentPoolView {...p} />

// ---------- Pre-test ----------
export function Pretest() {
  const s = useStore(); const [open, setOpen] = useState(null)
  const MODS = { 'Wawancara Mandiri': ['Interview Dasar', 'Interview User'], 'Tes Kepribadian': ['Tes Potensi Akademik', 'Psikotes DISC', 'Tes IQ'], 'Tes Kompetensi': ['Tes Excel', 'Tes Photoshop', 'Tes Coding'] }
  const TYPES = [['camera', 'Live Recording', 'Rekam video jawaban'], ['doc', 'Essay', 'Jawaban teks panjang'], ['checkCircle', 'Pilihan Ganda', 'Dinilai otomatis'], ['upload', 'Upload Dokumen', 'Unggah file tugas']]
  return (
    <>
      <PageHead title="Pre-test" sub="Rangkaian tes per spesialisasi. Ke depan juga bisa diatur per lowongan." />
      <Card title="Jenis modul yang bisa dibuat"><div className="type-grid">{TYPES.map(([ic, l, d]) => <div key={l} className="type"><Icon name={ic} /><strong>{l}</strong><small>{d}</small></div>)}</div></Card>
      <Card title="Rangkaian tes per spesialisasi" pad={false}>
        <Table rows={s.pretests} onRow={setOpen} cols={[{ h: 'Spesialisasi', k: 'spesialisasi' }, { h: 'Modul', r: (r) => <div className="chips">{r.modul.map((m) => <Badge key={m} t="neutral">{m}</Badge>)}</div> }, { h: '', r: () => <Btn kind="ghost">Atur</Btn> }]} />
      </Card>
      <Modal open={!!open} title={`Rangkaian tes · ${open?.spesialisasi}`} onClose={() => setOpen(null)} footer={<Btn onClick={() => setOpen(null)}>Simpan</Btn>}>
        {open && Object.entries(MODS).map(([k, list]) => (
          <div key={k} className="mod-group"><strong>{k}</strong><div className="mod-row">{list.map((m) => <label key={m} className={`mod ${open.modul.includes(m) ? 'on' : ''}`}><input type="checkbox" defaultChecked={open.modul.includes(m)} />{m}</label>)}</div></div>
        ))}
      </Modal>
    </>
  )
}

// ---------- Penilaian ----------
export function Penilaian() {
  const s = useStore(); const [t, toast] = useToast(); const [tab, setTab] = useState('Belum Dinilai')
  const rows = s.pool.filter((p) => (tab === 'Belum Dinilai' ? p.status === 'Pending Assessment' : p.skor != null))
  return (
    <>
      <PageHead title="Penilaian Pre-test" sub="Pilihan ganda dinilai otomatis; essay, video, dan dokumen dinilai 1–100." />
      <Tabs tabs={['Belum Dinilai', 'Sudah Dinilai']} value={tab} onChange={setTab} />
      {rows.length === 0 && <Empty text="Semua pre-test sudah dinilai." />}
      {rows.map((p) => <ScoreCard key={p.id} p={p} done={tab !== 'Belum Dinilai'} onSave={(avg) => { api.scorePool(p.id, avg); toast(`Nilai ${p.name} tersimpan — masuk Active Pool`) }} />)}
      {t}
    </>
  )
}
function ScoreCard({ p, done, onSave }) {
  const mods = [['Interview Dasar', '00:12:40', 'Video'], ['Tes Potensi Akademik', '00:24:10', 'Pilihan ganda'], ['Tes Excel', '00:18:05', 'Upload dokumen']]
  const [sc, setSc] = useState(done ? [p.skor, p.skor, p.skor] : ['', 76, ''])
  const avg = sc.every((x) => x !== '') ? Math.round(sc.reduce((a, b) => a + Number(b), 0) / sc.length) : 0
  return (
    <Card title={<span className="who"><Avatar name={p.name} size={30} />{p.name}</span>} action={<Badge>{done ? 'Skor ' + p.skor : 'Review kandidat'}</Badge>}>
      <Table rows={mods} cols={[{ h: 'Modul', r: (r) => r[0] }, { h: 'Durasi', r: (r) => r[1] }, { h: 'Tipe', r: (r) => r[2] }, { h: 'Skor', r: (r) => { const i = mods.indexOf(r); return r[2] === 'Pilihan ganda' ? <b>{sc[i]} <small className="muted">otomatis</small></b> : <input className="score" type="number" min="1" max="100" disabled={done} value={sc[i]} onChange={(e) => { const n = [...sc]; n[i] = e.target.value; setSc(n) }} aria-label={'Skor ' + r[0]} /> } }]} />
      {!done && <div className="row-end"><span className="muted">Rata-rata: <b>{avg || '—'}</b></span><Btn disabled={!avg} onClick={() => onSave(avg)}>Simpan nilai</Btn></div>}
    </Card>
  )
}

// ---------- Mitra ----------
export function MitraAdmin() {
  const s = useStore(); const [t, toast] = useToast(); const [open, setOpen] = useState(false); const [f, setF] = useState({ name: '', pic: '', email: '' })
  return (
    <>
      <PageHead title="Mitra Talent Pool" sub="Penyedia talent. Akun mitra dibuat admin; password dikirim ke e-mail."><Btn icon="plus" onClick={() => setOpen(true)}>Buat akun mitra</Btn></PageHead>
      <Card pad={false}><Table rows={s.mitras} cols={[{ h: 'Mitra', r: (r) => <div className="who"><Avatar name={r.name} size={32} /><strong>{r.name}</strong></div> }, { h: 'PIC', k: 'pic' }, { h: 'E-mail', k: 'email' }, { h: 'Talent', k: 'talent' }, { h: 'Diundang', k: 'diundang' }, { h: 'Diproses', k: 'diproses' }, { h: 'Terpilih', k: 'terpilih' }]} /></Card>
      <Modal open={open} title="Buat akun mitra" onClose={() => setOpen(false)} footer={<><Btn kind="ghost" onClick={() => setOpen(false)}>Batal</Btn><Btn disabled={!f.name || !f.email} onClick={() => { api.addMitra(f); setOpen(false); setF({ name: '', pic: '', email: '' }); toast('Akun mitra dibuat — password dikirim ke e-mail') }}>Simpan</Btn></>}>
        <div className="form"><Field label="Nama mitra"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Nama PIC"><input value={f.pic} onChange={(e) => setF({ ...f, pic: e.target.value })} /></Field><Field label="E-mail"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field></div>
      </Modal>{t}
    </>
  )
}

// ---------- Approval Remunerasi ----------
export function ApprovalRemun({ go }) {
  const s = useStore(); const { branch, emp } = useLookup(); const [t, toast] = useToast()
  const [fy, setFy] = useState(''); const [fm, setFm] = useState(''); const [fb, setFb] = useState(''); const [fs, setFs] = useState(''); const [fp, setFp] = useState(''); const [open, setOpen] = useState(null); const [note, setNote] = useState(''); const [rej, setRej] = useState(false); const [yes, setYes] = useState(false)
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const all = s.remunerations.filter((r) => r.status !== 'Draft')
  const years = [...new Set(all.map((r) => (r.bulan || '').split(' ')[1]).filter(Boolean))]
  const disbOf = (x) => s.disbursements.find((d) => d.remun === x.id && ['Success', 'Scheduled'].includes(d.status))
  const base = all.filter((r) => (!fy || (r.bulan || '').endsWith(fy)) && (!fm || (r.bulan || '').startsWith(fm)) && (!fb || r.branch === fb))
  const rows = base.filter((r) => (!fs || r.status === fs) && (!fp || (fp === 'sudah' ? !!disbOf(r) : !disbOf(r)))).sort((a, b) => (a.status === 'In Review' ? 0 : 1) - (b.status === 'In Review' ? 0 : 1))
  const r = s.remunerations.find((x) => x.id === open)
  const xls = (x) => { try { exportRemun(x, s); toast('Excel remunerasi diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  const disb = (x) => s.disbursements.find((d) => d.remun === x.id && ['Success', 'Scheduled'].includes(d.status))
  return (
    <>
      <PageHead title="Approval Remunerasi" sub="Setelah disetujui: jenis selain Active otomatis masuk Send Document, dan remunerasi siap dibayar lewat Disbursement."><span className="review-pill">Perlu ditinjau: <b>{all.filter((x) => x.status === 'In Review').length}</b></span></PageHead>
      {(() => {
        const nom = (x) => x.rows.reduce((a, row) => a + (calcRemunRow(row, s.setup, x, s.employees.find((e) => e.id === row.emp) || {}).net || 0), 0)
        const grp = [
          ['', '', 'Semua pengajuan', 'layers', base],
          ['In Review', '', 'Perlu ditinjau', 'clock', base.filter((x) => x.status === 'In Review')],
          ['Approved', 'belum', 'Disetujui, siap dibayar', 'wallet', base.filter((x) => x.status === 'Approved' && !disbOf(x))],
          ['Approved', 'sudah', 'Disetujui, sudah dibayar', 'checkCircle', base.filter((x) => x.status === 'Approved' && disbOf(x))],
          ['Rejected', '', 'Ditolak', 'x', base.filter((x) => x.status === 'Rejected')],
        ]
        const pick = (st, p) => { setFs(st); setFp(p); setTimeout(() => document.getElementById('remun-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
        return <div className="rk-tiles" role="group" aria-label="Rekap berdasarkan status">{grp.map(([st, p, l, ic, list]) => { const on = fs === st && fp === p; return (
          <button key={l} className={`rk-tile st-${(st || 'all').replace(' ', '').toLowerCase()} ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => pick(st, p)}>
            <span className="rk-h"><Icon name={ic} size={18} />{l}</span>
            <b>{list.length}</b>
            <small>{list.reduce((a, x) => a + x.rows.length, 0)} karyawan · {rupiah(list.reduce((a, x) => a + nom(x), 0))}</small>
            <small className="rk-br">{s.branches.map((b) => { const n = list.filter((x) => x.branch === b.id).length; return n ? `${b.name.replace('Branch ', '')} ${n}` : null }).filter(Boolean).join(' · ') || '—'}</small>
          </button>) })}</div>
      })()}
      <div className="filters">
        <label className="fsel"><span>Tahun</span><select value={fy} onChange={(e) => setFy(e.target.value)}><option value="">Semua tahun</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="fsel"><span>Bulan</span><select value={fm} onChange={(e) => setFm(e.target.value)}><option value="">Semua bulan</option>{BLN.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="fsel"><span>Status</span><select value={fs} onChange={(e) => { setFs(e.target.value); setFp('') }}><option value="">Semua status</option><option>In Review</option><option>Approved</option><option>Rejected</option></select></label>
        {fp && <span className="chip">{fp === 'sudah' ? 'Sudah dibayar/dijadwalkan' : 'Belum dibayar'}<button className="icon-btn sm" aria-label="Hapus filter pembayaran" onClick={() => setFp('')}><Icon name="x" size={14} /></button></span>}
      </div>
      <div id="remun-list" className="anchor" /><Card pad={false}><Table rows={rows} empty="Tidak ada pengajuan untuk filter ini." cols={[{ h: 'Branch', r: (x) => <div className="who"><Avatar name={branch(x.branch).replace('Branch ', '')} size={32} /><strong>{branch(x.branch)}</strong></div> }, { h: 'Bulan', k: 'bulan' }, { h: 'Karyawan', r: (x) => x.rows.length + ' orang' }, { h: 'THR/KAK', r: (x) => [x.thr && 'THR', x.kak && 'KAK'].filter(Boolean).join(' · ') || '—' }, { h: 'Lampiran', r: (x) => x.files?.length || 0 }, { h: 'Status', r: (x) => <Badge>{x.status}</Badge> },
        { h: 'Action', r: (x) => <div className="row-act">
          {x.note && <button className="icon-btn" title={'Catatan: ' + x.note} aria-label="Lihat catatan" onClick={() => setOpen(x.id)}><Icon name="inbox" size={18} /></button>}
          <button className="icon-btn" title="Unduh Excel" aria-label="Unduh Excel" onClick={() => xls(x)}><Icon name="download" size={18} /></button>
          <Btn kind="ghost" onClick={() => { setNote(''); setOpen(x.id) }}>Detail</Btn>
          {x.status === 'Approved' && (disb(x) ? <Btn kind="ghost" onClick={() => go('disbursement/d-' + disb(x).id)}>{disb(x).status === 'Scheduled' ? 'Dijadwalkan' : 'Dibayar ✓'}</Btn> : <Btn kind="ghost" onClick={() => go('disbursement/create')}>Bayar gaji</Btn>)}</div> }]} /></Card>
      <Modal wide open={!!r} title={r ? `${branch(r.branch)} · ${r.bulan}` : ''} onClose={() => setOpen(null)} footer={r && <>
        <Btn kind="ghost" icon="download" onClick={() => xls(r)}>Download Excel</Btn>
        {r.status === 'In Review' && <><Btn kind="ghost" icon="x" onClick={() => setRej(true)}>Reject</Btn><Btn icon="check" onClick={() => setYes(true)}>Accept</Btn></>}</>}>
        {r && <>{r.files?.length > 0 && <div className="chips mb">{r.files.map((f) => <Badge key={f} t="neutral"><Icon name="doc" size={14} /> {f}</Badge>)}</div>}<RemunSummary remun={r} exportable={false} />{r.note && <Note>Catatan: {r.note}</Note>}</>}
      </Modal>
      <Modal open={yes} title="Konfirmasi" onClose={() => setYes(false)} footer={<><Btn kind="ghost" onClick={() => setYes(false)}>Batal</Btn><Btn onClick={() => { api.decideRemun(r.id, true); setYes(false); setOpen(null); toast('Disetujui. Dokumen & disbursement dibuat') }}>Yakin</Btn></>}><div className="center"><span className="q-ic">?</span><p>Anda akan menyetujui pengajuan remunerasi ini.<br />Anda yakin?</p></div></Modal>
      <Modal open={rej} title="Notes" onClose={() => setRej(false)} footer={<Btn disabled={!note.trim()} onClick={() => { api.decideRemun(r.id, false, note.trim()); setRej(false); setOpen(null); setNote(''); toast('Pengajuan dikembalikan ke Branch') }}>Submit</Btn>}>
        <Field label="Catatan penolakan" hint="Wajib diisi. Catatan ini dibaca Branch pengaju."><textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>{t}
    </>
  )
}

// ---------- Send Document ----------
const SETELAN = [['Semua', 'Setiap karyawan di batch boleh beda setelan.'], ['New Contract Manual', 'Karyawan baru, dokumen tidak sesuai template → unggah file sendiri.'], ['New Contract Template', 'Karyawan baru, dokumen sesuai template → isi form, sistem generate.'], ['Existing Contract', 'Karyawan lama (migrasi) → unggah dokumen yang sudah ditandatangani.']]
export function SendDocument({ go }) {
  const s = useStore(); const { branch, emp } = useLookup(); const [t, toast] = useToast()
  const [open, setOpen] = useState(null); const [gear, setGear] = useState(false); const [form, setForm] = useState(null); const [track, setTrack] = useState(null); const [out, setOut] = useState(null)
  const b = s.docBatches.find((x) => x.id === open)
  const flow = ['None', 'Sent', 'Employee Signed', 'Full Signed']
  return (
    <>
      <PageHead title="Send Document" sub="Remunerasi disetujui → atur setelan batch → buat dokumen → Send All → lacak sampai Full Signed." />
      <div className="batch-list">{s.docBatches.map((x) => (
        <Card key={x.id} className="batch">
          <div className="batch-row"><Avatar name={branch(x.branch)} /><div className="grow"><strong>{branch(x.branch)}</strong><div className="muted sm">{x.bulan} · {x.items.length} dokumen · {x.setelan || 'setelan belum dipilih'}</div></div>
            <Badge>{x.status === 'Complete' ? 'Complete' : 'Process'}</Badge><Btn kind="ghost" onClick={() => setOpen(x.id)}>Buka</Btn></div>
        </Card>))}
        {!s.docBatches.length && <Empty text="Belum ada batch dokumen." />}
      </div>
      <Modal wide open={!!b} title={b ? `${branch(b.branch)} · ${b.bulan}` : ''} onClose={() => setOpen(null)} footer={b && <>
        <Btn kind="ghost" icon="eye" onClick={() => go('approval-remunerasi')}>Lihat remunerasi</Btn>
        <Btn kind="ghost" icon="download" disabled={!b.items.some((i) => i.status === 'Full Signed')} onClick={() => toast('Unduhan disiapkan (hanya dokumen Full Signed)')}>Download</Btn>
        <Btn kind="ghost" icon="settings" onClick={() => setGear(true)}>Setelan batch</Btn>
        <Btn icon="send" disabled={!b.setelan || b.items.some((i) => !i.ready && i.status === 'None')} onClick={() => { api.setBatch(b.id, (bb) => { bb.items.forEach((i) => { if (i.status === 'None') i.status = 'Sent' }) }); toast('Terkirim ke Track Document, Inbox talent & e-mail') }}>Send All</Btn></>}>
        {b && !b.setelan && <Note>Pilih <b>setelan pembuatan dokumen</b> dulu (tombol Setelan batch).</Note>}
        {b && <Table rows={b.items} cols={[
          { h: 'Karyawan', r: (i) => <div><strong>{emp(i.emp).name}</strong><div className="muted sm">{i.jenis}</div></div> },
          { h: 'Dokumen', r: (i) => <select disabled={!b.setelan} value={i.dokumen} onChange={(e) => api.setBatch(b.id, (bb) => { bb.items.find((y) => y.emp === i.emp).dokumen = e.target.value })}>{['Offering Letter', 'PKWT (Potongan BPJS)', 'PKWT (Tanpa Potongan BPJS)', 'Amandemen PKWT', 'Kontrak Freelance', 'Kontrak Internship', 'Surat Keterangan Kerja'].map((d) => <option key={d}>{d}</option>)}</select> },
          { h: 'Aksi', r: (i) => <div className="row-act">
            <button className="icon-btn" disabled={!b.setelan} title="Buat dokumen" aria-label="Buat dokumen" onClick={() => setForm(i)}><Icon name="doc" /></button>
            <button className="icon-btn" title="Lacak dokumen" aria-label="Lacak dokumen" onClick={() => setTrack(i)}><Icon name="search" /></button>
            <button className="icon-btn" title="Kirim pengingat" aria-label="Kirim pengingat" onClick={() => toast('Pengingat dikirim ke ' + emp(i.emp).name)}><Icon name="mail" /></button>
            <button className="icon-btn" disabled={i.status !== 'None'} title="Keluarkan dari batch" aria-label="Keluarkan dari batch" onClick={() => setOut(i)}><Icon name="x" /></button></div> },
          { h: 'Siap', r: (i) => i.ready || i.status !== 'None' ? <Badge t="ok">Siap</Badge> : <Badge t="neutral">Belum</Badge> },
          { h: 'Status', r: (i) => <Badge>{i.status}</Badge> },
        ]} />}
      </Modal>
      <Modal open={!!out} title="Konfirmasi" onClose={() => setOut(null)} footer={<><Btn kind="ghost" onClick={() => setOut(null)}>Batal</Btn><Btn onClick={() => { api.removeDocItem(b.id, out.emp); setOut(null); toast('Karyawan dikeluarkan dari batch') }}>Yakin</Btn></>}><div className="center"><span className="q-ic">?</span><p>Anda yakin akan membatalkan karyawan <b>{out && emp(out.emp).name}</b> dari batch ini?</p></div></Modal>
      <Modal open={gear} title="Setelan pembuatan dokumen" onClose={() => setGear(false)}>
        <div className="pick-list">{SETELAN.map(([k, d]) => <button key={k} className={`pick ${b?.setelan === k ? 'on' : ''}`} onClick={() => { api.setBatch(b.id, (bb) => { bb.setelan = k }); setGear(false) }}><div><strong>{k}</strong><small>{d}</small></div></button>)}</div>
      </Modal>
      <Modal open={!!form} title={form ? `${form.dokumen} · ${emp(form.emp).name}` : ''} onClose={() => setForm(null)} footer={<><Btn kind="ghost" onClick={() => setForm(null)}>Batal</Btn><Btn onClick={() => { api.setBatch(b.id, (bb) => { bb.items.find((y) => y.emp === form.emp).ready = true }); setForm(null); toast('Dokumen tersimpan') }}>Simpan & preview</Btn></>}>
        {form && <DocForm item={form} setelan={b?.setelan} />}
      </Modal>
      <Modal open={!!track} title={track ? `Track Document · ${emp(track.emp).name}` : ''} onClose={() => setTrack(null)} footer={<Btn kind="ghost" icon="download" onClick={() => toast('Unduhan disiapkan (hanya dokumen Full Signed)')}>Download</Btn>}>
        {track && <>
          <p className="muted">Periode 1 · {track.dokumen}</p>
          <ol className="aline">{flow.slice(1).map((st, i) => { const reached = flow.indexOf(track.status) >= i + 1; return <li key={st} className={reached ? 'approved' : 'waiting'}><span className="aline-dot">{reached ? <Icon name="check" size={12} /> : i + 1}</span>{st}<span className="grow" />{st === 'Full Signed' && track.status === 'Employee Signed' ? <Btn kind="ghost" icon="upload" onClick={() => { api.setBatch(b.id, (bb) => { const it = bb.items.find((y) => y.emp === track.emp); it.status = 'Full Signed'; if (bb.items.every((y) => y.status === 'Full Signed')) bb.status = 'Complete' }); setTrack({ ...track, status: 'Full Signed' }); toast('Full Signed diunggah') }}>Unggah</Btn> : <Badge t={reached ? 'ok' : 'neutral'}>{reached ? 'Ada' : '—'}</Badge>}</li> })}</ol>
          <Note>Persetujuan disclaimer talent: {track.agreed ? 'sudah disetujui' : 'belum'}.</Note>
        </>}
      </Modal>{t}
    </>
  )
}
function DocForm({ item, setelan }) {
  const s = useStore(); const e = s.employees.find((x) => x.id === item.emp)
  if (setelan === 'Existing Contract' || setelan === 'New Contract Manual') return <div className="form">{(setelan === 'Existing Contract' ? ['Sent (opsional)', 'Employee Signed (opsional)', 'Full Signed (wajib)'] : ['File dokumen']).map((l) => <Field key={l} label={l}><input type="file" accept=".pdf,.docx" /></Field>)}</div>
  const thp = e?.thp || 0
  return (
    <div className="form two">
      <Field label="Nomor surat"><input placeholder="001/HR/XI/2026" /></Field>
      <Field label="Tanggal hari ini"><input type="date" defaultValue="2026-11-12" /></Field>
      <Field label="Penanggung jawab" hint="Default dari Setup Dokumen"><input defaultValue="Rani Hapsari" /></Field>
      <Field label="Jabatan PJ"><input defaultValue="HC Operation Manager" /></Field>
      <Field label="Take Home Pay" hint="Otomatis dari remunerasi"><input readOnly value={rupiah(thp)} /></Field>
      <Field label="Gaji Pokok (80%)"><input readOnly value={rupiah(thp * 0.8)} /></Field>
      <Field label="Tunjangan Posisi (20%)"><input readOnly value={rupiah(thp * 0.2)} /></Field>
      <Field label="Durasi kontrak"><input defaultValue="12 bulan" /></Field>
    </div>
  )
}

// ---------- Disbursement: lihat pages/disbursement.jsx ----------
export { Disbursement } from './disbursement.jsx'

export function PayslipAdmin() {
  const s = useStore(); const { emp } = useLookup()
  return <><PageHead title="Payslip" sub="Terbit otomatis setelah disbursement Completed." /><Card pad={false}><Table rows={s.payslips} cols={[{ h: 'Karyawan', r: (r) => emp(r.emp).name }, { h: 'Bulan', k: 'bulan' }, { h: 'Net dibayar', right: true, r: (r) => rupiah(r.thp) }]} /></Card></>
}

// ---------- Data Karyawan (= Data Talent) ----------
export function DataKaryawan({ role, sub, go }) {
  const s = useStore(); const { branch } = useLookup(); const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [div, setDiv] = useState('')
  const my = role === 'branch' ? (s.myBranch || 'b1') : ''
  if (sub) return <TalentBio person={s.employees.find((e) => e.id === sub)} crumb="Data Karyawan" onBack={() => go('data-karyawan')} />
  const today = new Date().toISOString().slice(0, 10); const lim = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
  const base = s.employees.filter((e) => !my || e.branch === my)
  const CATS = [
    ['', 'Semua karyawan', 'users', '#0a5950', () => true],
    ['Kontrak', 'Kontrak', 'doc', '#2f8f4e', (e) => e.type === 'Kontrak'],
    ['Magang', 'Magang', 'star', '#2a78d6', (e) => e.type === 'Magang'],
    ['Freelance', 'Freelance', 'briefcase', '#7a5af5', (e) => e.type === 'Freelance'],
    ['berkas', 'Berkas belum lengkap', 'approval', '#d9a400', (e) => e.doc !== 'Full Signed'],
    ['rekening', 'Rekening belum sinkron', 'lock', '#c0452a', (e) => !e.bankOk],
    ['habis', 'Kontrak habis ≤ 60 hari', 'calendar', '#d9663a', (e) => e.end && e.end >= today && e.end <= lim],
    ['nonsel', 'Jalur Non-Selection', 'upload', '#8f9893', (e) => e.jalur === 'Non-Selection'],
  ]
  const fn = (CATS.find((c) => c[0] === cat) || CATS[0])[4]
  const inCat = base.filter(fn)
  const divs = Object.entries(inCat.reduce((a, e) => { const k = e.divisi || 'Lainnya'; a[k] = (a[k] || 0) + 1; return a }, {})).sort((x, y) => y[1] - x[1])
  const rows = inCat.filter((e) => (!div || (e.divisi || 'Lainnya') === div) && (e.name + ' ' + (e.role || '') + ' ' + (e.divisi || '')).toLowerCase().includes(q.toLowerCase()))
  const toList = () => setTimeout(() => document.getElementById('dk-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  const spread = (l) => my ? Object.entries(l.reduce((a, e) => { const k = e.divisi || 'Lainnya'; a[k] = (a[k] || 0) + 1; return a }, {})).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, n]) => `${k} ${n}`).join(' · ') : s.branches.map((b) => `${b.name.replace('Branch ', '').split(' ')[0]} ${l.filter((e) => e.branch === b.id).length}`).join(' · ')
  return (
    <>
      <PageHead title="Data Karyawan" sub="Status berkas, jalur, shift & divisi. Klik kotak rekap untuk menyaring, klik nama karyawan untuk data lengkapnya." />
      <div className="rk-tiles four" role="group" aria-label="Rekap karyawan per kategori">{CATS.map(([k, l, ic, c, f]) => { const lst = base.filter(f); const on = cat === k; return (
        <button key={l} className={`rk-tile ${on ? 'on' : ''}`} style={{ borderTopColor: c }} aria-pressed={on} onClick={() => { setCat(k); setDiv(''); toList() }}>
          <span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{lst.length.toLocaleString('id-ID')}</b>
          <small>{base.length ? Math.round((lst.length / base.length) * 100) : 0}% dari {base.length.toLocaleString('id-ID')} karyawan</small>
          <small className="rk-br">{lst.length ? spread(lst) : '—'}</small>
        </button>) })}</div>
      <div id="dk-list" className="anchor" />
      <div className="dk-div" role="group" aria-label="Saring per divisi"><span className="muted sm">Divisi:</span>
        <button className={!div ? 'on' : ''} aria-pressed={!div} onClick={() => setDiv('')}>Semua {inCat.length}</button>
        {divs.map(([d, n]) => <button key={d} className={div === d ? 'on' : ''} aria-pressed={div === d} onClick={() => setDiv(div === d ? '' : d)}>{d} {n}</button>)}</div>
      <div className="filters"><label className="search"><Icon name="search" size={18} /><input placeholder="Cari nama, role, atau divisi" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <span className="muted sm">{rows.length.toLocaleString('id-ID')} karyawan{cat || div ? <> · {(CATS.find((c) => c[0] === cat) || CATS[0])[1]}{div ? ` · ${div}` : ''} <button className="linkish" onClick={() => { setCat(''); setDiv(''); setQ('') }}>Reset</button></> : ''}</span></div>
      <Card pad={false}><Table rows={rows} empty="Tidak ada karyawan untuk kategori ini." cols={[
        { h: 'Karyawan', r: (r) => <div className="who"><Avatar name={r.name} size={32} /><div><a className="link" href={`#/app/${role}/data-karyawan/${r.id}`}>{r.name}</a><div className="muted sm">{r.role}</div></div></div> },
        my ? { h: 'Divisi', r: (r) => r.divisi || '—' } : { h: 'Branch', r: (r) => branch(r.branch) }, { h: 'Tipe', r: (r) => <Badge t="neutral">{r.type}</Badge> }, { h: 'Jalur', k: 'jalur' },
        { h: 'Berkas', r: (r) => <Badge>{r.doc}</Badge> }, { h: 'Kontrak s.d.', r: (r) => <span className={`nowrap ${r.end && r.end >= today && r.end <= lim ? 'dk-soon' : ''}`}>{r.end ? fmtDate(r.end) : '—'}</span> }, { h: 'Shift', k: 'shift' }, { h: 'Rekening', r: (r) => <Badge t={r.bankOk ? 'ok' : 'bad'}>{r.bankOk ? 'Tersinkron' : 'Belum sinkron'}</Badge> },
      ]} /></Card>
    </>
  )
}

// ---------- Absensi ----------
export function Absensi() {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast()
  const ex = useExport({ title: 'Absensi', rows: s.attendance, dateOf: (r) => r.tanggal, branchOf: (r) => emp(r.emp).branch,
    cols: [{ h: 'Karyawan', v: (r) => emp(r.emp).name }, { h: 'Branch', v: (r) => branch(emp(r.emp).branch) }, { h: 'Tanggal', v: (r) => fmtDate(r.tanggal) }, { h: 'Masuk', v: (r) => r.masuk }, { h: 'Pulang', v: (r) => r.pulang }, { h: 'Lokasi', v: (r) => r.lokasi }, { h: 'Status', v: (r) => r.status }] })
  const rows = ex.filtered
  return (
    <>
      <PageHead title="Absensi" sub="Data dari app & web (selfie + GPS). Input manual hanya untuk koreksi saat sistem error."><Btn kind="ghost" icon="upload" onClick={() => toast('Template koreksi absensi disiapkan')}>Koreksi manual</Btn></PageHead>
      {ex.bar}
      <div className="stats"><Stat label="Hadir" value={rows.filter((a) => a.status === 'Hadir').length} icon="checkCircle" /><Stat label="Terlambat" value={rows.filter((a) => a.status === 'Terlambat').length} icon="clock" /><Stat label="Cuti" value={rows.filter((a) => a.status === 'Cuti').length} icon="calendar" /></div>
      <Card pad={false}><Table rows={rows} empty="Tidak ada data absensi untuk filter ini." cols={[{ h: 'Karyawan', r: (r) => emp(r.emp).name }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Masuk', k: 'masuk' }, { h: 'Pulang', k: 'pulang' }, { h: 'Lokasi', k: 'lokasi' }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} /></Card>{t}
    </>
  )
}

// ---------- Pengajuan (cuti/lembur/reimburse) ----------
function RequestAdmin({ title, sub, col, cols, dateKey }) {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast(); const [tab, setTab] = useState('Waiting'); const [open, setOpen] = useState(null)
  const ex = useExport({ title, rows: s[col], dateOf: (r) => r[dateKey], branchOf: (r) => emp(r.emp).branch,
    cols: [{ h: 'Karyawan', v: (r) => emp(r.emp).name }, { h: 'Branch', v: (r) => branch(emp(r.emp).branch) }, ...cols.map((c) => ({ h: c.h, v: (r) => (c.r ? c.r(r) : r[c.k]) })), { h: 'Status', v: (r) => r.status }] })
  const rows = ex.filtered.filter((r) => (tab === 'Semua' ? true : r.status === tab))
  const it = s[col].find((x) => x.id === open)
  return (
    <>
      <PageHead title={title} sub={sub} />
      {ex.bar}
      <Tabs tabs={['Waiting', 'Approved', 'Rejected', 'Semua']} value={tab} onChange={setTab} />
      <Card pad={false}><Table rows={rows} empty="Tidak ada pengajuan untuk filter ini." onRow={(r) => setOpen(r.id)} cols={[{ h: 'Karyawan', r: (r) => <div className="who"><Avatar name={emp(r.emp).name} size={30} />{emp(r.emp).name}</div> }, ...cols, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} /></Card>
      <Note>Download mengikuti filter Branch, Tahun, dan Bulan (semua status), bukan tab yang sedang dibuka.</Note>
      <Modal open={!!it} title={it ? `${title} · ${emp(it.emp).name}` : ''} onClose={() => setOpen(null)} footer={it?.status === 'Waiting' && <><Btn kind="ghost" onClick={() => { api.decide(col, it.id, false); toast('Pengajuan ditolak'); setOpen(null) }}>Tolak</Btn><Btn onClick={() => { api.decide(col, it.id, true); toast('Disetujui pada level ini') }}>Setujui</Btn></>}>
        {it && <><dl className="dl">{cols.map((c) => <React.Fragment key={c.h}><dt>{c.h}</dt><dd>{c.r ? c.r(it) : it[c.k]}</dd></React.Fragment>)}</dl>
          <h4 className="mt">Approval line</h4><ApprovalLine line={it.line || [{ by: 'HR', status: it.status }]} />
          <Note>Muara akhir selalu HR. Melewati batas waktu = otomatis tidak disetujui + notifikasi.</Note></>}
      </Modal>{t}
    </>
  )
}
export const CutiAdmin = () => <RequestAdmin title="Cuti" dateKey="dari" sub="Approval berjenjang sesuai pengaturan per modul." col="leaves" cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Tanggal', r: (r) => fmtDate(r.dari) + (r.sampai !== r.dari ? ' – ' + fmtDate(r.sampai) : '') }, { h: 'Hari', k: 'hari' }, { h: 'Alasan', k: 'alasan' }]} />
export const LemburAdmin = () => <RequestAdmin title="Lembur" dateKey="tanggal" sub="Masuk otomatis ke remunerasi bulan berjalan setelah disetujui." col="overtimes" cols={[{ h: 'Kegiatan', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Jam', k: 'jam' }, { h: 'Durasi', r: (r) => r.durasi + ' jam' }, { h: 'Tipe', k: 'tipe' }]} />
export const ReimburseAdmin = () => <RequestAdmin title="Reimbursement" dateKey="tanggal" sub="Limit per tahun per jenis. Dibayar bersama gaji." col="reimbursements" cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Judul', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Nominal', right: true, r: (r) => rupiah(r.nominal) }]} />

export function Inventaris() {
  const s = useStore(); const { emp, branch } = useLookup()
  const ex = useExport({ title: 'Inventaris', rows: s.inventories, dateOf: (r) => r.tanggal, branchOf: (r) => emp(r.emp).branch,
    cols: [{ h: 'Karyawan', v: (r) => emp(r.emp).name }, { h: 'Branch', v: (r) => branch(emp(r.emp).branch) }, { h: 'Kategori', v: (r) => r.kategori }, { h: 'Item', v: (r) => r.item }, { h: 'Tanggal serah', v: (r) => fmtDate(r.tanggal) }, { h: 'Status', v: (r) => r.status }] })
  return <><PageHead title="Inventaris" sub="Aset diserahkan admin, diterima karyawan lewat app/web." />{ex.bar}<Card pad={false}><Table rows={ex.filtered} empty="Tidak ada inventaris untuk filter ini." cols={[{ h: 'Karyawan', r: (r) => emp(r.emp).name }, { h: 'Kategori', k: 'kategori' }, { h: 'Item', k: 'item' }, { h: 'Tanggal serah', r: (r) => fmtDate(r.tanggal) }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} /></Card></>
}
export function ResignAdmin() {
  const s = useStore(); const { emp, branch } = useLookup(); const [t, toast] = useToast()
  const ex = useExport({ title: 'Resign', rows: s.resigns, dateOf: (r) => r.lastDay, branchOf: (r) => emp(r.emp).branch,
    cols: [{ h: 'Karyawan', v: (r) => emp(r.emp).name }, { h: 'Branch', v: (r) => branch(emp(r.emp).branch) }, { h: 'Alasan', v: (r) => r.alasan }, { h: 'Hari terakhir', v: (r) => fmtDate(r.lastDay) }, { h: 'Inventaris', v: (r) => r.inventaris }, { h: 'Status', v: (r) => r.status }] })
  return (
    <><PageHead title="Resign" sub={`Akun nonaktif otomatis H+14 dari tanggal resign. Sisa cuti: ${s.setup.sisaCutiResign}.`} />
      {ex.bar}
      <Card pad={false}><Table rows={ex.filtered} empty="Tidak ada pengajuan resign untuk filter ini." cols={[{ h: 'Karyawan', r: (r) => emp(r.emp).name }, { h: 'Alasan', k: 'alasan' }, { h: 'Hari terakhir', r: (r) => fmtDate(r.lastDay) }, { h: 'Pengembalian inventaris', r: (r) => <Badge>{r.inventaris}</Badge> }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }, { h: '', r: (r) => r.status === 'Waiting' && <Btn onClick={() => { api.decide('resigns', r.id, true); toast('Resign disetujui — akun nonaktif H+14') }}>Setujui</Btn> }]} /></Card>
      <Note>Filter Tahun & Bulan pada Resign memakai tanggal hari terakhir bekerja.</Note>{t}</>
  )
}

// ---------- Admin & Izin ----------
export function AdminIzin() {
  const s = useStore(); const [t, toast] = useToast(); const [open, setOpen] = useState(null)
  const a = s.admins.find((x) => x.id === open); const [perms, setPerms] = useState([]); const [br, setBr] = useState([])
  const edit = (x) => { setOpen(x.id); setPerms(x.perms); setBr(x.branches) }
  return (
    <>
      <PageHead title="Admin & Izin" sub="Satu jenis akun admin; superadmin mencentang menu per domain dan Branch yang boleh diakses." />
      <Card pad={false}><Table rows={s.admins} onRow={edit} cols={[{ h: 'Admin', r: (r) => <div className="who"><Avatar name={r.name} size={32} /><div><strong>{r.name}</strong><div className="muted sm">{r.email}</div></div></div> }, { h: 'Menu diizinkan', r: (r) => r.perms.length + ' menu' }, { h: 'Branch', r: (r) => r.branches.map((b) => s.branches.find((x) => x.id === b).name.replace('Branch ', '')).join(', ') }, { h: '', r: () => <Btn kind="ghost">Atur izin</Btn> }]} /></Card>
      <Note>Coba: ubah izin Dewi, lalu masuk sebagai <b>Admin Operasional</b> — sidebar mengikuti centangan ini.</Note>
      <Modal wide open={!!a} title={a ? 'Izin · ' + a.name : ''} onClose={() => setOpen(null)} footer={<Btn onClick={() => { api.setPerms(a.id, perms, br); setOpen(null); toast('Izin tersimpan') }}>Simpan izin</Btn>}>
        <h4>Branch yang ditugaskan</h4>
        <div className="chips mb">{s.branches.map((b) => <label key={b.id} className={`mod ${br.includes(b.id) ? 'on' : ''}`}><input type="checkbox" checked={br.includes(b.id)} onChange={(e) => setBr(e.target.checked ? [...br, b.id] : br.filter((x) => x !== b.id))} />{b.name}</label>)}</div>
        {ADMIN_MENU.map((g) => { const items = g.items.filter(([k]) => !SUPER_ONLY.includes(k)); return items.length ? (
          <div key={g.group} className="mod-group"><strong>{g.group}</strong><div className="mod-row">{items.map(([k, l]) => <label key={k} className={`mod ${perms.includes(k) ? 'on' : ''}`}><input type="checkbox" checked={perms.includes(k)} onChange={(e) => setPerms(e.target.checked ? [...perms, k] : perms.filter((x) => x !== k))} />{l}</label>)}</div></div>) : null })}
      </Modal>{t}
    </>
  )
}
const EMPTY_BRANCH = { skema: '', name: '', customer: '', telp: '', email: '', gateway: '', kota: '', files: { bukti: '', legal1: '', legal2: '' }, accounts: [{ nama: '', divisi: '', telp: '', email: '' }] }
const Upload = ({ label, hint, accept, value, onChange }) => (
  <Field label={label}>
    <span className={`upl ${value ? 'has' : ''}`}><Icon name={value ? 'doc' : 'upload'} size={18} /><span>{value || hint}</span><input type="file" accept={accept} aria-label={label} onChange={(e) => onChange(e.target.files[0]?.name || '')} /></span>
  </Field>
)
export function AkunBranch({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const [q, setQ] = useState(''); const [sort, setSort] = useState('az'); const [del, setDel] = useState(null); const [ok, setOk] = useState(''); const [off, setOff] = useState(null)
  const rows = s.branches.filter((b) => b.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (sort === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)))
  const editId = sub && sub !== 'baru' ? sub : null
  const src = editId && s.branches.find((x) => x.id === editId)
  const d = useDraft('branch:' + (sub || 'none'), src ? structuredClone({ ...EMPTY_BRANCH, ...src, files: { ...EMPTY_BRANCH.files, ...(src.files || {}) }, accounts: src.accounts?.length ? src.accounts : EMPTY_BRANCH.accounts }) : structuredClone(EMPTY_BRANCH))
  const form = sub ? d.value : null; const setForm = d.set
  const set = (k, v) => setForm({ ...form, [k]: v })
  const setAcc = (i, k, v) => setForm({ ...form, accounts: form.accounts.map((a, j) => (j === i ? { ...a, [k]: v } : a)) })
  const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e)
  const valid = form && form.name.trim() && form.customer.trim() && emailOk(form.email) && form.accounts.every((a) => a.nama.trim() && emailOk(a.email))
  const save = () => {
    const data = { name: form.name.trim(), customer: form.customer.trim(), telp: form.telp, email: form.email, gateway: form.gateway, kota: form.kota, files: form.files, accounts: form.accounts }
    if (editId) { api.updateBranch(editId, data); setOk('Data berhasil diperbarui') } else { api.addBranch(data); setOk('Data berhasil ditambahkan') }
    d.clear(); go('akun-branch')
  }
  const used = (id) => s.employees.some((e) => e.branch === id) || s.jobs.some((j) => j.branch === id) || s.admins.some((a) => a.branches.includes(id))
  if (sub) {
    if (editId && !src) return <Empty text="Branch tidak ditemukan." />
    return (
      <>
        <nav className="crumb" aria-label="Breadcrumb"><button onClick={() => go('akun-branch')}>Akun Branch</button><span>›</span><b>{editId ? 'Edit Branch' : 'Create New Branch'}</b></nav>
        <PageHead title={editId ? 'Edit Branch' : 'Create New Branch'} sub="Isian tersimpan otomatis sebagai draft sampai kamu menekan Save." />
        <DraftBar d={d} />
        <Card>
          <div className="form two">
            <Field label="Nama Customer"><input value={form.customer} onChange={(e) => set('customer', e.target.value)} placeholder="Masukkan nama lengkap customer" /></Field>
            <Field label="Instansi"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Masukkan instansi customer" /></Field>
            <Field label="No. Telp/Handphone"><input inputMode="tel" value={form.telp} onChange={(e) => set('telp', e.target.value)} placeholder="Masukkan no. telp/handphone customer" /></Field>
            <Field label="E-mail" hint={form.email && !emailOk(form.email) ? 'Format email belum benar' : ''}><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Masukkan email customer" /></Field>
            <Upload label="Logo instansi" hint="Upload Image (JPG or PNG 10MB)" accept="image/png,image/jpeg" value={form.files.logo} onChange={(v) => set('files', { ...form.files, logo: v })} />
            <Field label="Payment Gateway Menggunakan"><input value={form.gateway} onChange={(e) => set('gateway', e.target.value)} placeholder="Masukkan metode payment gateway" /></Field>
            <Upload label="Proof of Payment" hint="Upload Image (JPG or PNG 10MB)" accept="image/png,image/jpeg" value={form.files.bukti} onChange={(v) => set('files', { ...form.files, bukti: v })} />
            <span />
            <Upload label="Lampiran Legalitas 1" hint="Upload Doc (Doc, Xls or Pdf 75 MB)" accept=".doc,.docx,.xls,.xlsx,.pdf" value={form.files.legal1} onChange={(v) => set('files', { ...form.files, legal1: v })} />
            <Upload label="Lampiran Legalitas 2" hint="Upload Doc (Doc, Xls or Pdf 75 MB)" accept=".doc,.docx,.xls,.xlsx,.pdf" value={form.files.legal2} onChange={(v) => set('files', { ...form.files, legal2: v })} />
          </div>
          <hr />
          <div className="row-end" style={{ justifyContent: 'space-between', marginTop: 0 }}><h4>Account</h4><Btn kind="ghost" icon="plus" onClick={() => setForm({ ...form, accounts: [...form.accounts, { nama: '', divisi: '', telp: '', email: '' }] })}>Tambah akun</Btn></div>
          {form.accounts.map((a, i) => (
            <div key={i} className="acc-row">
              <div className="form two">
                <Field label="Nama Akun"><input value={a.nama} onChange={(e) => setAcc(i, 'nama', e.target.value)} placeholder="Masukkan nama lengkap pemegang akun" /></Field>
                <Field label="Divisi"><input value={a.divisi} onChange={(e) => setAcc(i, 'divisi', e.target.value)} placeholder="Masukkan divisi akun" /></Field>
                <Field label="No. Telp/Handphone"><input inputMode="tel" value={a.telp} onChange={(e) => setAcc(i, 'telp', e.target.value)} placeholder="Masukkan no. telp/handphone" /></Field>
                <Field label="E-mail" hint={a.email && !emailOk(a.email) ? 'Format email belum benar' : ''}><input type="email" value={a.email} onChange={(e) => setAcc(i, 'email', e.target.value)} placeholder="Masukkan email" /></Field>
              </div>
              <button className="icon-btn" aria-label={'Hapus akun ' + (i + 1)} title="Hapus akun" disabled={form.accounts.length === 1} onClick={() => setForm({ ...form, accounts: form.accounts.filter((_, j) => j !== i) })}><Icon name="trash" size={18} /></button>
            </div>))}
          <p className="muted sm">Wajib: Nama Customer, Instansi, E-mail, serta Nama Akun & E-mail tiap akun.</p>
        
          <div className="row-end"><Btn kind="ghost" onClick={() => go('akun-branch')}>Close</Btn><Btn disabled={!valid} onClick={save}>Save</Btn></div>
        </Card>
      </>
    )
  }
  return (
    <>
      <PageHead title="Akun Branch" sub="Akun untuk tiap Branch."><Btn icon="plus" onClick={() => go('akun-branch/baru')}>{drafts.get('branch:baru') ? 'Lanjutkan draft' : 'Create New Branch'}</Btn></PageHead>
      <div className="filters">
        <label className="fsel"><span>Urutkan berdasar</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="az">Nama (A–Z)</option><option value="za">Nama (Z–A)</option></select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Cari di sini" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      <Card pad={false}><Table rows={rows} empty="Branch tidak ditemukan." cols={[
        { h: 'No.', r: (r) => rows.indexOf(r) + 1 },
        { h: 'Nama Instansi', r: (r) => <div className="who"><Avatar name={r.name.replace('Branch ', '')} size={36} /><div><strong>{r.name}</strong><div className="muted sm">{(r.accounts || []).length} akun · {s.employees.filter((e) => e.branch === r.id).length} karyawan</div></div></div> },
        { h: 'Skema Remunerasi', r: (r) => r.skema ? <Badge t={r.skema === 'Khusus' ? 'warn' : 'neutral'}>{r.skema}</Badge> : <span className="muted sm">—</span> },
        { h: 'Action', r: (r) => <div className="row-act">
          <button className="icon-btn" aria-label={'Edit ' + r.name} title="Edit" onClick={() => go('akun-branch/' + r.id)}><Icon name="edit" size={18} /></button>
          <button className="icon-btn" aria-label={'Hapus ' + r.name} title="Hapus" onClick={() => setDel(r)}><Icon name="trash" size={18} /></button>
          <Toggle on={r.aktif !== false} onChange={() => (r.aktif !== false ? setOff(r) : (api.toggleBranch(r.id), toast('Akun Branch diaktifkan')))} label={r.aktif !== false ? 'Aktif' : 'Tidak Aktif'} />
        </div> },
      ]} /></Card>

      <Modal open={!!ok} title="Berhasil" onClose={() => setOk('')} footer={<Btn onClick={() => setOk('')}>Oke</Btn>}><div className="center"><span className="q-ic ok"><Icon name="check" size={30} /></span><p>{ok}</p></div></Modal>
      <Modal open={!!off} title="Konfirmasi" onClose={() => setOff(null)} footer={<><Btn kind="ghost" onClick={() => setOff(null)}>Batal</Btn><Btn onClick={() => { api.toggleBranch(off.id); setOff(null); toast('Akun Branch dinonaktifkan') }}>Yakin</Btn></>}><div className="center"><span className="q-ic">?</span><p>Anda akan menonaktifkan akun <b>{off?.name}</b>.<br />Apakah anda yakin?</p></div></Modal>
      <Modal open={!!del} title="Hapus Branch" onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn>{del && !used(del.id) && <Btn onClick={() => { api.deleteBranch(del.id); setDel(null); toast('Branch dihapus') }}>Hapus</Btn>}</>}>
        {del && (used(del.id) ? <p><b>{del.name}</b> masih punya karyawan, lowongan, atau admin yang ditugaskan, jadi belum bisa dihapus. Nonaktifkan akunnya saja.</p> : <p>Hapus <b>{del.name}</b>? Tindakan ini tidak bisa dibatalkan.</p>)}
      </Modal>{t}
    </>
  )
}

// ---------- Setup Remunerasi ----------
const ADD_F = [['basic', 'Basic Salary'], ['posisi', 'Tunjangan Posisi'], ['company.jkk', 'BPJSTK Iuran JKK'], ['company.jkm', 'BPJSTK Iuran JKM'], ['company.jht', 'BPJSTK Iuran JHT'], ['company.jp', 'BPJSTK Iuran JP'], ['company.kes', 'Premi BPJSKES']]
const DED_F = [['employee.jht', 'BPJSTK Iuran JHT'], ['employee.jp', 'BPJSTK Iuran JP'], ['employee.kes', 'Premi BPJSKES']]
const getP = (o, path) => path.split('.').reduce((a, k) => a?.[k], o)
const setP = (o, path, v) => { const n = structuredClone(o); const ks = path.split('.'); let c = n; ks.slice(0, -1).forEach((k) => { c = c[k] }); c[ks.at(-1)] = v === '' ? '' : Number(v); return n }
const PctCol = ({ value, onChange, idp }) => (
  <>
    <h4 className="c-add">Penambah Gaji</h4>
    {ADD_F.map(([k, l]) => <label key={k} className="pct"><span>{l}</span><span className="pct-in"><input type="number" step="0.01" min="0" aria-label={`${l} ${idp}`} value={getP(value, k)} onChange={(e) => onChange(setP(value, k, e.target.value))} /><i>%</i></span></label>)}
    <label className="pct"><span>Pajak</span><span className="pct-in"><input readOnly value="TER" aria-label={`Pajak ${idp}`} /></span></label>
    <h4 className="c-ded">Pengurang Gaji</h4>
    {DED_F.map(([k, l]) => <label key={k} className="pct"><span>{l}</span><span className="pct-in"><input type="number" step="0.01" min="0" aria-label={`${l} pengurang ${idp}`} value={getP(value, k)} onChange={(e) => onChange(setP(value, k, e.target.value))} /><i>%</i></span></label>)}
  </>
)
const pickPct = (f) => ({ basic: f.basic, posisi: f.posisi, company: { ...f.company }, employee: { ...f.employee } })

export function SetupRemun({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast(); const [f, setF] = useState(s.setup); const [bid, setBid] = useState('')
  if (sub === 'detail') return <EmployeeSetup go={go} />
  const [simThp, setSimThp] = useState(10000000); const [terOpen, setTerOpen] = useState(false)
  const exN = calcRow({ thp: simThp, skema: 'Normal', additions: [], deductions: [] }, { ...f, overrides: {} })
  const exK = calcRow({ thp: simThp, skema: 'Khusus', additions: [], deductions: [] }, { ...f, overrides: {} })
  const ter = f.ter || DEFAULT_SETUP.ter
  const setTer = (i, j, v) => { const n = ter.map((x) => [...x]); n[i][j] = v === '' ? '' : Number(v); setF({ ...f, ter: n }) }
  const sisa = f.sisa || pickPct(f)
  const sumOk = Number(f.basic) + Number(f.posisi) === 100
  const save = () => {
    if (bid) { api.saveSetupBranch(bid, f); toast(`Aturan diterapkan ke semua karyawan ${s.branches.find((b) => b.id === bid).name}`) } else { api.saveSetup(f); toast('Setup tersimpan') }
  }
  return (
    <>
      <PageHead title="Setup Remunerasi" sub="Aturan umum per Branch. Untuk aturan berbeda per karyawan, buka Remuneration Detail."><Btn kind="ghost" icon="users" onClick={() => go('setup-remunerasi/detail')}>Remuneration Detail</Btn></PageHead>
      <div className="filters"><label className="fsel"><span>Branch</span><select value={bid} onChange={(e) => setBid(e.target.value)}><option value="">Semua Branch (aturan umum)</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
      <Card title="Skema Normal & Khusus">
        <div className="pct-cols">
          <div><p className="muted sm">Remunerasi Per Bulan</p><PctCol idp="per bulan" value={f} onChange={setF} /></div>
          <div><p className="muted sm">Remunerasi Sisa Kontrak</p><PctCol idp="sisa kontrak" value={sisa} onChange={(v) => setF({ ...f, sisa: pickPct(v) })} /></div>
        </div>
        {!sumOk && <div className="err mt"><Icon name="dot" size={14} /><p>Basic Salary + Tunjangan Posisi harus berjumlah 100%.</p></div>}
        <p className="muted sm mt">Pajak memakai PPh21 TER (tarif dari tabel TER di bawah, sesuai penghasilan bruto) dan ditanggung perusahaan. Skema Khusus: tanggungan karyawan (JHT, JP, BPJSKES) juga dibayar perusahaan, jadi tidak memotong Nett Salary.</p>
        <div className="simu"><label className="simu-in"><small>Simulasi THP</small><input type="number" min="0" step="100000" value={simThp} onChange={(e) => setSimThp(Number(e.target.value))} aria-label="THP simulasi" /></label>
          <div className="simu-h"><span /><b>Normal</b><b>Khusus</b></div>
          {[['Gaji Pokok', 'gp'], ['Pajak', 'pajak'], ['Nett Salary', 'net'], ['Total Tani 1 Bulan', 'tani']].map(([l, k]) => <div key={k} className="simu-r"><span>{l}{k === 'pajak' ? ` (TER ${exN.rate}% / ${exK.rate}%)` : ''}</span><b>{rupiah(exN[k])}</b><b>{rupiah(exK[k])}</b></div>)}</div>
      </Card>
      <div className="grid2">
        <Card title="Batas UMR & upah BPJS"><div className="form">
          <Field label="Nominal UMR" hint="Gaji Pokok tidak boleh di bawah UMR. Masukkan nominal sesuai UMR daerah masing-masing"><input type="number" min="0" value={f.umr} onChange={(e) => setF({ ...f, umr: Number(e.target.value) })} /></Field>
          <Field label="Batas upah iuran JP" hint="Gaji Pokok di atas batas ini dihitung sebesar batas (perusahaan & karyawan)"><input type="number" min="0" value={f.capJP ?? DEFAULT_SETUP.capJP} onChange={(e) => setF({ ...f, capJP: Number(e.target.value) })} /></Field>
          <Field label="Batas upah premi BPJSKES" hint="Gaji Pokok di atas batas ini dihitung sebesar batas (perusahaan & karyawan)"><input type="number" min="0" value={f.capKes ?? DEFAULT_SETUP.capKes} onChange={(e) => setF({ ...f, capKes: Number(e.target.value) })} /></Field>
        </div></Card>
        <Card title="Setup Absensi">
          <Toggle on={f.deduksiAbsen} onChange={(v) => setF({ ...f, deduksiAbsen: v })} label={f.deduksiAbsen ? 'Aktif' : 'Non Aktif'} />
          <p className="muted sm">Aktifkan jika ingin mengurangi gaji karyawan berdasarkan absensi (di luar cuti). Rumus: (gaji dibayar ÷ hari kerja sebulan) × hari tidak masuk.</p>
          <Field label="Sisa cuti saat resign"><div className="seg">{['Hangus', 'Diuangkan'].map((o) => <button type="button" key={o} className={f.sisaCutiResign === o ? 'on' : ''} onClick={() => setF({ ...f, sisaCutiResign: o })}>{o}</button>)}</div></Field>
        </Card>
        <Card title="Setup THR">
          <div className="form">
            <Field label="Perhitungan Kontrak" lock><input disabled value="Kontrak Bulan Karyawan" /></Field>
            <Field label="Tipe Komponen Pengali Upah"><select value={f.thr.komponen} onChange={(e) => setF({ ...f, thr: { ...f.thr, komponen: e.target.value } })}><option>Gaji Pokok & Tunjangan Posisi</option><option>Gaji Pokok</option></select></Field>
            <Field label="Nominal Pengali Upah (%)"><input type="number" min="0" value={f.thr.pengali} onChange={(e) => setF({ ...f, thr: { ...f.thr, pengali: Number(e.target.value) } })} /></Field>
          </div>
        </Card>
        <Card title="Setup KAK">
          <div className="form">
            <Field label="Perhitungan Kontrak" lock><input disabled value="Kontrak Hari Karyawan" /></Field>
            <Field label="Tipe Komponen Pengali Upah"><select value={f.kak.komponen} onChange={(e) => setF({ ...f, kak: { ...f.kak, komponen: e.target.value } })}><option>Gaji Pokok</option><option>Gaji Pokok & Tunjangan Posisi</option></select></Field>
            <Field label="Nominal Pengali Upah (%)"><input type="number" min="0" value={f.kak.pengali} onChange={(e) => setF({ ...f, kak: { ...f.kak, pengali: Number(e.target.value) } })} /></Field>
          </div>
          <p className="muted sm">THR/KAK diaktifkan per pengajuan lewat checkbox di Remunerasi Branch.</p>
        </Card>
      </div>
      <Card title="Tabel Pajak TER (kategori A)" action={<div className="row-act"><Btn kind="ghost" onClick={() => setTerOpen(!terOpen)}>{terOpen ? 'Tutup' : `Lihat & ubah (${ter.length} lapisan)`}</Btn>{terOpen && <Btn kind="ghost" onClick={() => setF({ ...f, ter: DEFAULT_SETUP.ter })}>Reset ke PMK 168/2023</Btn>}</div>}>
        <p className="muted sm">Tarif dipilih dari lapisan pertama yang batas atasnya ≥ penghasilan bruto. Kosongkan batas atas lapisan terakhir untuk “lebih dari”.</p>
        {terOpen && <div className="ter-t"><div className="ter-r h"><span>No</span><span>Batas atas bruto (Rp)</span><span>Tarif (%)</span><span /></div>
          {ter.map(([m, r], i) => <div key={i} className="ter-r"><span>{i + 1}</span><input type="number" min="0" aria-label={`Batas atas lapisan ${i + 1}`} placeholder="lebih dari" value={m} onChange={(e) => setTer(i, 0, e.target.value)} /><input type="number" min="0" step="0.25" aria-label={`Tarif lapisan ${i + 1}`} value={r} onChange={(e) => setTer(i, 1, e.target.value)} /><button type="button" className="icon-btn" aria-label={`Hapus lapisan ${i + 1}`} onClick={() => setF({ ...f, ter: ter.filter((_, j) => j !== i) })}><Icon name="x" /></button></div>)}
          <Btn kind="ghost" icon="plus" onClick={() => setF({ ...f, ter: [...ter, ['', 0]] })}>Tambah lapisan</Btn></div>}
      </Card>
      <div className="row-end"><Btn disabled={!sumOk} onClick={save}>Save</Btn></div>{t}
    </>
  )
}

function EmployeeSetup({ go }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast()
  const [sel, setSel] = useState([]); const [skema, setSkema] = useState('Normal'); const [q, setQ] = useState(''); const [fb, setFb] = useState(''); const [form, setForm] = useState(null)
  const ov = s.setup.overrides || {}
  const eff = (e) => (ov[e.id] ? { ...s.setup, ...ov[e.id] } : s.setup)
  const rows = s.employees.filter((e) => e.skema === skema && (!fb || e.branch === fb) && e.name.toLowerCase().includes(q.toLowerCase()))
  const allSel = rows.length > 0 && rows.every((r) => sel.includes(r.id))
  const toggleAll = () => setSel(allSel ? sel.filter((x) => !rows.some((r) => r.id === x)) : [...new Set([...sel, ...rows.map((r) => r.id)])])
  const openSet = () => { const first = s.employees.find((e) => e.id === sel[0]); setForm(pickPct(eff(first))) }
  const sumOk = form && Number(form.basic) + Number(form.posisi) === 100
  const cols = [...ADD_F, ['pajak', 'Pajak'], ...DED_F]
  const val = (e, k) => (k === 'pajak' ? 'TER' : getP(eff(e), k) + '%')
  const dl = () => { try { exportExcel({ title: 'Employee Setup - Kirana HRIS', meta: `Skema ${skema} | ${rows.length} karyawan`, cols: ['Nama Karyawan', 'Branch', ...cols.map(([k, l], i) => l + (i > 7 ? ' (pengurang)' : ''))], rows: rows.map((e) => [e.name, branch(e.branch), ...cols.map(([k]) => val(e, k))]), file: `employee-setup_skema-${skema.toLowerCase()}` }); toast('Employee Setup diunduh sebagai Excel') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button onClick={() => go('setup-remunerasi')}>Setup Remunerasi</button><span>›</span><b>Employee Setup</b></nav>
      <PageHead title="Employee Setup" sub="Atur aturan remunerasi berbeda untuk karyawan tertentu. Centang karyawan, lalu klik Settings."><Btn kind="ghost" icon="download" onClick={dl}>Download XLS</Btn></PageHead>
      <div className="filters">
        <span className="review-pill">Total Karyawan: <b>{rows.length} Orang</b></span>
        <label className="chk-l"><input type="checkbox" className="chk" checked={allSel} onChange={toggleAll} />Select All</label>
        <Btn icon="settings" disabled={!sel.length} onClick={openSet}>Settings ({sel.length})</Btn>
        <label className="fsel"><span>Skema</span><select value={skema} onChange={(e) => { setSkema(e.target.value); setSel([]) }}><option value="Normal">Skema Normal</option><option value="Khusus">Skema Khusus</option></select></label>
        <label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Cari..." value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
      </div>
      <Card pad={false}><Table rows={rows} empty="Tidak ada karyawan untuk filter ini." cols={[
        { h: '', r: (r) => <input type="checkbox" className="chk" aria-label={'Pilih ' + r.name} checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} /> },
        { h: 'Nama Karyawan', r: (r) => <div className="who"><Avatar name={r.name} size={30} /><div><strong>{r.name}</strong>{ov[r.id] && <div><Badge t="warn">Aturan khusus</Badge></div>}</div></div> },
        ...cols.map(([k, l], i) => ({ h: l + (i > 7 ? ' (−)' : ''), k: k + i, r: (r) => <span className={`npill ${i > 7 ? 'ded' : 'add'}`}>{val(r, k)}</span> })),
        { h: 'Reset', k: 'reset', r: (r) => ov[r.id] ? <Btn kind="ghost" onClick={() => { api.resetEmpSetup([r.id]); toast('Kembali ke aturan umum') }}>Reset</Btn> : null },
      ]} /></Card>
      <Note>Hijau = penambah gaji, merah muda = pengurang gaji. Karyawan berlabel “Aturan khusus” memakai angka sendiri saat remunerasi dihitung.</Note>
      <Modal wide open={!!form} title="Settings" onClose={() => setForm(null)} footer={<><Btn kind="ghost" onClick={() => setForm(null)}>Close</Btn><Btn disabled={!sumOk} onClick={() => { api.saveEmpSetup(sel, form); setForm(null); toast(`Aturan disimpan untuk ${sel.length} karyawan`); setSel([]) }}>Save</Btn></>}>
        {form && <><p><Badge t="ok">{sel.length} People</Badge> <span className="muted sm">are selected</span></p>
          <div className="pct-cols one"><div><PctCol idp="karyawan terpilih" value={form} onChange={setForm} /></div></div>
          {!sumOk && <div className="err"><Icon name="dot" size={14} /><p>Basic Salary + Tunjangan Posisi harus berjumlah 100%.</p></div>}</>}
      </Modal>{t}
    </>
  )
}

// ---------- Setup Aktivitas ----------
export function SetupAktivitas({ sub, go }) {
  const s = useStore(); const [tab, setTab] = useState({ kalender: 'Kalender', absensi: 'Absensi' }[sub] || 'Approval'); const [t, toast] = useToast()
  if (sub === 'organisasi') return <Organisasi go={go} />
  return (
    <>
      <PageHead title="Setup Aktivitas" sub="Aturan absensi, kalender, cuti, lembur, reimbursement, dan approval line." />
      <Tabs tabs={['Approval', 'Kategori', 'Kalender', 'Absensi', 'Cuti', 'Lembur', 'Reimbursement']} value={tab} onChange={setTab} />
      {tab === 'Approval' && <Card title="Approval line per modul" action={<Btn kind="ghost" icon="users" onClick={() => go('setup-aktivitas/organisasi')}>Atur organisasi</Btn>}>
        {s.approvalLine.map((l) => <div key={l.modul} className="line-row"><div className="grow"><strong>{l.modul}</strong><div className="chips">{l.level.map((x, i) => <Badge key={i} t="neutral">{i + 1}. {x}</Badge>)}</div></div><Toggle on={l.aktif} onChange={() => { if (l.aktif) { api.setLine(l.modul, false); toast(`Approval ${l.modul} dinonaktifkan`) } else { api.setLine(l.modul, true); go('setup-aktivitas/organisasi') } }} label={l.aktif ? 'Approval aktif' : 'Nonaktif'} /></div>)}
        <Note>Saat approval diaktifkan, kamu dibawa ke menu Organisasi untuk mengatur siapa atasan siapa. HR selalu level terakhir. Nonaktif = langsung ke HR.</Note>
      </Card>}
      {tab === 'Kategori' && <KategoriKaryawan />}
      {tab === 'Kalender' && <KalenderKerja />}
      {tab === 'Absensi' && <><SetupAbsen /><h3 className="sec-title">Master shift admin</h3><p className="muted sm" style={{ margin: 0 }}>Daftar shift yang dipilih di Data Karyawan (Set Shift) dan dipakai rekap absensi admin.</p><ShiftSetup /></>}
      {['Cuti', 'Lembur', 'Reimbursement'].includes(tab) && <Card title={'Pengaturan ' + tab}><p>Pengaturan {tab.toLowerCase()} sekarang ada di menu {tab}, mengikuti Figma admin STA.</p><Btn icon="settings" onClick={() => go(tab.toLowerCase() + '/pengaturan')}>Buka Pengaturan {tab}</Btn></Card>}
      {t}
    </>
  )
}

export function SetupDokumen() {
  const docs = ['Offering Letter', 'PKWT (Potongan BPJS)', 'PKWT (Tanpa Potongan BPJS)', 'Amandemen PKWT', 'Kontrak Freelance', 'Kontrak Internship', 'Surat Keterangan Kerja', 'Template Surat Resign (.docx)']
  return (
    <>
      <PageHead title="Setup Dokumen" sub="Template & data penanggung jawab default untuk Send Document." />
      <div className="grid2">
        <Card title="Penanggung jawab default"><div className="form"><Field label="Nama"><input defaultValue="Rani Hapsari" /></Field><Field label="Jabatan"><input defaultValue="HC Operation Manager" /></Field><Field label="Nomor surat kuasa"><input defaultValue="SK/HC/2026/014" /></Field></div></Card>
        <Card title="Template dokumen" pad={false}><Table rows={docs.map((d) => ({ d }))} cols={[{ h: 'Dokumen', k: 'd' }, { h: '', r: () => <Badge t="ok">Aktif</Badge> }]} /></Card>
      </div>
    </>
  )
}
