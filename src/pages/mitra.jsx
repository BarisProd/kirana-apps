// Role Mitra (penyedia talent / outsourcing). Revisi 21 Nov: Quick Summary 5 status, permintaan klien + SLA,
// consent UU PDP wajib saat input kandidat, dan menu Kerja Sama (aturan yang disepakati + API).
import React, { useState } from 'react'
import { useStore, api, getState } from '../services/store.js'
import { Btn, Card, Badge, Table, Modal, Field, useToast, Avatar, PageHead, Note, Icon } from '../components/ui.jsx'
import { useLookup, fmtDate } from './shared.jsx'
import { QuickSummary, ReqTable, reqInfo, AturanCard, TalentTable, tpActive, PERJ_T, todayISO } from './talentPoolUI.jsx'
import { TP_STATUS } from '../data/talentPool.js'
import { exportExcel } from '../services/export.js'
import { Tabs } from '../components/ui.jsx'
import { Sticker, ArtHead } from '../components/Sticker.jsx'

const useMe = () => { const s = useStore(); return s.mitras.find((m) => m.id === (s.myMitra || 'm1')) || s.mitras[0] }
const Pending = ({ m, go }) => m.perjanjian?.status !== 'Aktif' ? <div className="warnbar"><Icon name="bell" />Aturan kerja sama belum kamu setujui. Akun baru bisa mengirim kandidat setelah aturan disepakati.<Btn kind="ghost" onClick={() => go('kerjasama')}>Buka Kerja Sama</Btn></div> : null

export function Dashboard({ go }) {
  const s = useStore(); const m = useMe(); const mine = s.pool.filter((p) => p.mitra === m.name)
  const reqs = s.requisitions.filter((r) => r.mitra === m.id)
  const urgent = reqs.filter((r) => { const x = reqInfo(s, r); return x.status === 'Lewat SLA' || (x.status === 'Berjalan' && x.sisa <= 3) })
  return (
    <>
      <ArtHead art="jempol" title={`Halo, ${m.name}!`} sub="Pantau talent yang kamu salurkan dan permintaan dari klien."><Btn icon="plus" disabled={m.perjanjian?.status !== 'Aktif'} onClick={() => go('talent')}>Tambah talent</Btn></ArtHead>
      <Pending m={m} go={go} />
      {urgent.length > 0 && <div className="warnbar bad"><Icon name="clock" />{urgent.length} permintaan klien mendekati / lewat SLA. Segera submit kandidat.<Btn kind="ghost" onClick={() => go('lowongan')}>Lihat permintaan</Btn></div>}
      <QuickSummary list={mine} value="" onPick={(v) => go('talent' + (v ? '/' + encodeURIComponent(v) : ''))} sub={`${mine.filter(tpActive).length} talent aktif · ${mine.filter((p) => !p.consent && tpActive(p)).length} belum consent PDP`} />
      <Card title="Permintaan klien" action={<Btn kind="ghost" onClick={() => go('lowongan')}>Lihat semua</Btn>} pad={false}><ReqTable rows={reqs.slice(0, 5)} onOpen={() => go('lowongan')} /></Card>
      <AturanCard m={m} title="Aturan kerja sama yang berlaku" compact />
    </>
  )
}

export function Lowongan({ go }) {
  const s = useStore(); const m = useMe(); const [open, setOpen] = useState(null); const { job, branch } = useLookup()
  const reqs = s.requisitions.filter((r) => r.mitra === m.id)
  const x = open && reqInfo(s, open)
  return (
    <>
      <PageHead title="Permintaan Klien" sub="Job requisition dari klien: kualifikasi, kuota, dan SLA submit kandidat. Klik baris untuk melihat pipeline kandidatmu." />
      <Pending m={m} go={go} />
      <Card pad={false}><ReqTable rows={reqs} onOpen={setOpen} /></Card>
      <Modal wide open={!!open} title={open ? `${job(open.job)?.posisi} · ${branch(job(open.job)?.branch)}` : ''} onClose={() => setOpen(null)} footer={<Btn kind="ghost" onClick={() => setOpen(null)}>Tutup</Btn>}>{open && <>
        <dl className="dl">{[['Kualifikasi', open.kualifikasi], ['Kuota', `${open.kuota} kandidat · sudah submit ${x.n}`], ['SLA', `${open.sla} hari · tenggat ${fmtDate(x.tenggat)}`], ['Dikirim', `${fmtDate(open.dikirim)} oleh ${open.oleh}`], ['Status', <Badge>{x.status}</Badge>]].map(([a, b]) => <React.Fragment key={a}><dt>{a}</dt><dd>{b}</dd></React.Fragment>)}</dl>
        <h4 className="mt">Pipeline kandidat</h4><TalentTable rows={x.sub} /></>}
      </Modal>
    </>
  )
}

export function TalentMitra({ sub, go }) {
  const s = useStore(); const m = useMe(); const [t, toast] = useToast(); const { job } = useLookup()
  const [mode, setMode] = useState(null); const [step, setStep] = useState(0); const [q, setQ] = useState('')
  const pick = sub ? decodeURIComponent(sub) : ''
  const blank = { name: '', email: '', spesialisasi: 'Admin Support', pendidikan: 'S1', pengalaman: '0–2 tahun', req: '', consent: false, consentFile: '' }
  const [f, setF] = useState(blank)
  const mine = s.pool.filter((p) => p.mitra === m.name)
  const rows = mine.filter((p) => (!pick ? tpActive(p) : p.status === pick) && p.name.toLowerCase().includes(q.toLowerCase()))
  const reqs = s.requisitions.filter((r) => r.mitra === m.id && ['Berjalan', 'Lewat SLA'].includes(reqInfo(s, r).status))
  const aktif = m.perjanjian?.status === 'Aktif'
  const close = () => { setMode(null); setStep(0); setF(blank) }
  return (
    <>
      <PageHead title="Talent Saya" sub="Daftarkan kandidat manual, CSV, atau otomatis lewat API. Consent UU PDP wajib untuk setiap kandidat."><Btn icon="plus" disabled={!aktif} onClick={() => { setMode('pilih'); setStep(0) }}>Tambah talent</Btn></PageHead>
      <Pending m={m} go={go} />
      <QuickSummary list={mine} value={pick} onPick={(v) => go('talent' + (v ? '/' + encodeURIComponent(v) : ''))} />
      <div className="filters"><label className="search"><Icon name="search" size={18} /><input placeholder="Cari talent" value={q} onChange={(e) => setQ(e.target.value)} /></label><span className="muted sm">{rows.length} talent{pick ? ` · ${TP_STATUS.find((x) => x[0] === pick)?.[1]}` : ''}</span></div>
      <Card pad={false}><TalentTable rows={rows} /></Card>
      <Modal open={mode === 'pilih'} title="Tambah talent" onClose={close}>
        <div className="pick-list"><button className="pick" onClick={() => setMode('manual')}><Icon name="user" /><div><strong>Daftar manual</strong><small>Isi form kandidat 3 langkah + bukti consent</small></div></button>
          <label className="pick"><Icon name="upload" /><div><strong>Upload CSV</strong><small>Kolom consent_at & consent_file wajib terisi</small></div><input type="file" accept=".csv" hidden onChange={() => { close(); toast('CSV diterima — baris tanpa consent ditolak, sisanya masuk status Registered Talent') }} /></label>
          <button className="pick" onClick={() => toast('Template CSV disiapkan')}><Icon name="download" /><div><strong>Template dokumen</strong><small>Unduh format CSV (termasuk kolom consent)</small></div></button>
          {m.perjanjian?.api?.aktif && <div className="pick"><Icon name="layers" /><div><strong>Sinkron API aktif</strong><small>Kandidat dari sistemmu masuk otomatis · terakhir {m.perjanjian.api.sync || '—'}</small></div></div>}</div>
      </Modal>
      <Modal open={mode === 'manual'} title="Form kandidat" onClose={close} footer={<>{step > 0 && <Btn kind="ghost" onClick={() => setStep(step - 1)}>Kembali</Btn>}{step < 2 ? <Btn disabled={!f.name || !/^\S+@\S+\.\S+$/.test(f.email) || (step === 1 && !f.consent)} onClick={() => setStep(step + 1)}>Lanjut</Btn> : <Btn onClick={() => { api.mitraAddTalent({ name: f.name.trim(), email: f.email, spesialisasi: f.spesialisasi, pendidikan: f.pendidikan, pengalaman: f.pengalaman, mitra: m.name, kelamin: '—', ekspektasi: null, req: f.req || undefined, job: f.req ? s.requisitions.find((r) => r.id === f.req)?.job : undefined, consent: { at: new Date().toISOString().slice(0, 16).replace('T', ' '), versi: 'PDP v1.2', file: f.consentFile } }); close(); toast('Talent terdaftar · e-mail aktivasi & pre-test dikirim') }}>Publish</Btn>}</>}>
        <ol className="stepper">{['Data kandidat', 'Consent PDP', 'Publish'].map((x, i) => <li key={x} className={i < step ? 'done' : i === step ? 'on' : ''}><span>{i + 1}</span>{x}</li>)}</ol>
        {step === 0 && <div className="form two"><Field label="Nama lengkap"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="E-mail (untuk akun talent)"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Spesialisasi"><select value={f.spesialisasi} onChange={(e) => setF({ ...f, spesialisasi: e.target.value })}>{['Admin Support', 'Backend Developer', 'Data Analyst', 'UI/UX Designer', 'IT Support', 'Sales Executive', 'Pemanen Sawit', 'Teknisi Mesin'].map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Pendidikan"><select value={f.pendidikan} onChange={(e) => setF({ ...f, pendidikan: e.target.value })}>{['SMA/SMK', 'D3', 'S1', 'S2'].map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Untuk permintaan klien (opsional)"><select value={f.req} onChange={(e) => setF({ ...f, req: e.target.value })}><option value="">Masuk talent pool umum</option>{reqs.map((r) => <option key={r.id} value={r.id}>{job(r.job)?.posisi} · kuota {r.kuota}</option>)}</select></Field>
          <Field label="Berkas (CV, KTP, foto, …)"><input type="file" multiple /></Field></div>}
        {step === 1 && <div className="form"><Note><div><b>UU Pelindungan Data Pribadi.</b> Data kandidat akan dibagikan ke klien melalui platform Kirana. Unggah bukti persetujuan eksplisit dari kandidat (formulir bertanda tangan atau persetujuan digital).</div></Note>
          <Field label="Bukti consent kandidat"><input type="file" accept=".pdf,image/*" onChange={(e) => setF({ ...f, consentFile: e.target.files?.[0]?.name || '' })} /></Field>
          <label className="chk-l"><input type="checkbox" className="chk" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />Kandidat sudah memberi persetujuan eksplisit atas pembagian data pribadinya</label></div>}
        {step === 2 && <><dl className="dl">{[['Nama', f.name], ['E-mail', f.email], ['Spesialisasi', f.spesialisasi], ['Pendidikan', f.pendidikan], ['Permintaan', f.req ? job(s.requisitions.find((r) => r.id === f.req)?.job)?.posisi : 'Talent pool umum'], ['Consent', 'Ada (PDP v1.2)']].map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
          <p className="muted sm">Talent menerima e-mail aktivasi akun lalu mengerjakan pre-test (status Registered Talent → Talent Pending Assessment).</p></>}
      </Modal>{t}
    </>
  )
}

export function KerjaSama() {
  const s = useStore(); const m = useMe(); const [t, toast] = useToast(); const [ok, setOk] = useState(false)
  const P = m.perjanjian || {}
  return (
    <>
      <PageHead title="Kerja Sama" sub="Aturan kerja sama yang disepakati dengan klien/Kirana. Berlaku sepanjang kerja sama berlangsung." />
      {P.status !== 'Aktif' && <Card title="Persetujuan aturan kerja sama"><p>Superadmin/Owner Kirana sudah mengirim aturan kerja sama di bawah. Baca dengan teliti, lalu setujui untuk mengaktifkan akunmu.</p>
        <label className="chk-l"><input type="checkbox" className="chk" checked={ok} onChange={(e) => setOk(e.target.checked)} />Saya, {m.pic}, mewakili {m.name}, menyetujui seluruh aturan kerja sama ini</label>
        <div className="row-end"><Btn disabled={!ok} onClick={() => { api.mitraAgree(m.id, m.pic); toast('Aturan disetujui — akun mitra aktif') }}>Setujui aturan</Btn></div></Card>}
      <AturanCard m={m} />
      <Card title="Integrasi API / webhook">{P.api?.aktif ? <dl className="dl">{[['Client ID', <code>{P.api.clientId}</code>], ['Client secret', <code>{P.api.secret}</code>], ['Webhook', <code>{P.api.webhook}</code>], ['Sinkron terakhir', P.api.sync || '—']].map(([a, b]) => <React.Fragment key={a}><dt>{a}</dt><dd>{b}</dd></React.Fragment>)}</dl> : <p className="muted">Kerja sama ini tidak memakai API. Kandidat diinput manual atau lewat CSV di menu Talent Saya.</p>}</Card>
      {t}
    </>
  )
}

// ---------- Inbox: dari & ke Superadmin dan Talent (hired maupun kandidat) ----------
const talentKind = (s, name) => { const p = s.pool.find((x) => x.name === name); return p?.status === 'Hired' ? 'Hired' : 'Kandidat' }
export function InboxMitra() {
  const s = useStore(); const m = useMe(); const [t, toast] = useToast()
  const [tab, setTab] = useState('Semua'); const [arah, setArah] = useState(''); const [q, setQ] = useState('')
  const [sel, setSel] = useState(null); const [comp, setComp] = useState(null)
  const all = (s.mitraMsgs || []).filter((x) => x.mitra === m.id).sort((a, b) => b.waktu.localeCompare(a.waktu))
  const kind = (x) => x.dengan === 'Superadmin' ? 'Superadmin' : 'Talent ' + talentKind(s, x.who)
  const list = all.filter((x) => (tab === 'Semua' || (tab === 'Superadmin' ? x.dengan === 'Superadmin' : x.dengan === 'Talent' && (tab === 'Talent' || kind(x) === tab)))
    && (!arah || x.arah === arah) && (!q || (x.who + x.judul + x.isi).toLowerCase().includes(q.toLowerCase())))
  const cnt = (f) => all.filter(f).length
  const tabs = [['Semua', () => true], ['Superadmin', (x) => x.dengan === 'Superadmin'], ['Talent Hired', (x) => x.dengan === 'Talent' && talentKind(s, x.who) === 'Hired'], ['Talent Kandidat', (x) => x.dengan === 'Talent' && talentKind(s, x.who) === 'Kandidat']]
  const mine = s.pool.filter((p) => p.mitra === m.name && p.status !== 'Nonaktif')
  const open = (x) => { setSel(x); if (!x.dibaca) api.mitraReadMsg(x.id) }
  const reply = (x) => setComp({ dengan: x.dengan, who: x.who, judul: x.judul.startsWith('Re: ') ? x.judul : 'Re: ' + x.judul, isi: '' })
  const send = () => { api.mitraSendMsg({ mitra: m.id, ...comp }); setComp(null); setTab('Semua'); setArah('keluar'); toast(comp.dengan === 'Superadmin' ? 'Pesan terkirim ke Superadmin (masuk ke lonceng notifikasinya)' : 'Pesan terkirim ke ' + comp.who) }
  return (
    <><PageHead title="Inbox" sub="Pesan masuk & terkirim dengan Superadmin dan talent milikmu (hired maupun kandidat)."><Btn icon="send" onClick={() => setComp({ dengan: 'Superadmin', who: 'Rani Hapsari', judul: '', isi: '' })}>Tulis pesan</Btn></PageHead>
      <div className="rk-tiles four" role="group" aria-label="Rekap inbox">{tabs.map(([l, f]) => { const n = cnt(f); const un = cnt((x) => f(x) && !x.dibaca && x.arah === 'masuk'); return (
        <button key={l} className={`rk-tile ${tab === l ? 'on' : ''}`} aria-pressed={tab === l} onClick={() => setTab(l)}><span className="rk-h"><Icon name={l === 'Superadmin' ? 'lock' : l === 'Semua' ? 'inbox' : 'users'} size={18} />{l}</span><b>{n}</b><small>{un ? `${un} belum dibaca` : 'Semua sudah dibaca'} · {cnt((x) => f(x) && x.arah === 'keluar')} terkirim</small></button>) })}</div>
      <Card pad={false}>
        <div className="filters ib-f"><Tabs tabs={[{ v: '', l: 'Semua arah' }, { v: 'masuk', l: 'Masuk' }, { v: 'keluar', l: 'Terkirim' }]} value={arah} onChange={setArah} /><input className="search" placeholder="Cari nama, judul, isi…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pesan" /></div>
        <ul className="ib-list">{list.length ? list.map((x) => <li key={x.id} className={!x.dibaca && x.arah === 'masuk' ? 'un' : ''}><button onClick={() => open(x)}>
          <Avatar name={x.who} size={36} /><span className="ib-m"><span className="ib-top"><b>{x.arah === 'keluar' ? 'Ke: ' : 'Dari: '}{x.who}</b><Badge t={x.dengan === 'Superadmin' ? 'info' : talentKind(s, x.who) === 'Hired' ? 'ok' : 'warn'}>{kind(x)}</Badge><Badge t={x.arah === 'keluar' ? 'neutral' : 'info'}>{x.arah === 'keluar' ? 'Terkirim' : 'Masuk'}</Badge><em>{x.waktu}</em></span><strong>{x.judul}</strong><small>{x.isi}</small></span></button></li>) : <li className="nb-e">Tidak ada pesan untuk filter ini.</li>}</ul>
      </Card>
      <Modal open={!!sel} title={sel?.judul} onClose={() => setSel(null)} footer={<><Btn kind="ghost" perm="r" onClick={() => setSel(null)}>Tutup</Btn><Btn icon="send" onClick={() => { reply(sel); setSel(null) }}>Balas</Btn></>}>
        {sel && <div className="ib-detail"><p className="muted sm">{sel.arah === 'keluar' ? 'Dikirim ke' : 'Dari'} <b>{sel.who}</b> ({kind(sel)}) · {sel.waktu}</p><p>{sel.isi}</p></div>}
      </Modal>
      <Modal open={!!comp} title="Tulis pesan" onClose={() => setComp(null)} footer={<><Btn kind="ghost" perm="r" onClick={() => setComp(null)}>Batal</Btn><Btn icon="send" disabled={!comp?.judul || !comp?.isi || !comp?.who} onClick={send}>Kirim</Btn></>}>
        {comp && <div className="form">
          <Field label="Kepada"><select value={comp.dengan === 'Superadmin' ? 'SA' : comp.who} onChange={(e) => setComp({ ...comp, ...(e.target.value === 'SA' ? { dengan: 'Superadmin', who: 'Rani Hapsari' } : { dengan: 'Talent', who: e.target.value }) })}>
            <option value="SA">Superadmin · Rani Hapsari</option>
            <optgroup label="Talent hired">{mine.filter((p) => p.status === 'Hired').map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</optgroup>
            <optgroup label="Kandidat">{mine.filter((p) => p.status !== 'Hired').map((p) => <option key={p.id} value={p.name}>{p.name} · {TP_STATUS.find((x) => x[0] === p.status)?.[1] || p.status}</option>)}</optgroup>
          </select></Field>
          <Field label="Judul"><input value={comp.judul} onChange={(e) => setComp({ ...comp, judul: e.target.value })} /></Field>
          <Field label="Pesan"><textarea rows={4} value={comp.isi} onChange={(e) => setComp({ ...comp, isi: e.target.value })} /></Field>
          {comp.dengan === 'Superadmin' && <Note>Pesan ke Superadmin juga muncul di lonceng notifikasi Superadmin.</Note>}
        </div>}
      </Modal>{t}</>
  )
}

// ---------- Klien (Branch) & penempatan ----------
const dur = (a, b) => { if (!a) return '—'; const d1 = new Date(a), d2 = b ? new Date(b) : new Date(todayISO()); const mo = Math.max(0, Math.round((d2 - d1) / 2629800000)); return mo >= 12 ? `${Math.floor(mo / 12)} th ${mo % 12} bln` : `${mo} bln` }
const TAHAP = [['Hired', 'Penempatan aktif', 'ok', '#0e7a5f'], ['Selesai', 'Selesai kontrak', 'neutral', '#5b6b68'], ['Proses seleksi', 'Proses seleksi', 'info', '#2a6fb0'], ['Tidak lolos', 'Tidak lolos', 'bad', '#c0452a']]
const tahapT = (t) => TAHAP.find((x) => x[0] === t)?.[2] || 'neutral'
export function Klien() {
  const s = useStore(); const m = useMe(); const [t, toast] = useToast()
  const [tile, setTile] = useState(''); const [br, setBr] = useState(''); const [q, setQ] = useState(''); const [yr, setYr] = useState('')
  const brName = (id) => s.branches.find((b) => b.id === id)?.name || id
  const tal = (id) => s.pool.find((p) => p.id === id)
  const all = (s.placements || []).filter((x) => x.mitra === m.id).map((x) => ({ ...x, nama: tal(x.talent)?.name || x.talent, brn: brName(x.branch) })).sort((a, b) => (b.mulai || '').localeCompare(a.mulai || ''))
  const years = [...new Set(all.map((x) => x.mulai?.slice(0, 4)))].sort().reverse()
  const inY = all.filter((x) => !yr || x.mulai?.startsWith(yr))
  const perTal = Object.values(inY.reduce((a, x) => { (a[x.talent] ||= { id: x.talent, nama: x.nama, rows: [] }).rows.push(x); return a }, {})).map((r) => ({ ...r, brs: [...new Set(r.rows.filter((x) => ['Hired', 'Selesai'].includes(x.tahap)).map((x) => x.branch))], daftar: [...new Set(r.rows.map((x) => x.branch))] }))
  const multi = perTal.filter((r) => r.daftar.length > 1)
  const clients = [...new Set(inY.map((x) => x.branch))]
  const TILES = [['klien', 'Branch klien', 'building', '#0b4f45', clients.length, `${clients.filter((b) => inY.some((x) => x.branch === b && x.tahap === 'Hired')).length} Branch sedang memakai talent`],
    ...TAHAP.map(([k, l, , c]) => [k, l, k === 'Hired' ? 'check' : k === 'Selesai' ? 'clock' : k === 'Proses seleksi' ? 'approval' : 'x', c, inY.filter((x) => x.tahap === k).length, `${new Set(inY.filter((x) => x.tahap === k).map((x) => x.talent)).size} talent`]),
    ['multi', 'Talent di >1 Branch', 'users', '#8a5a00', multi.length, `dari ${perTal.length} talent tercatat`]]
  const rows = inY.filter((x) => (!br || x.branch === br) && (!tile || tile === 'klien' || tile === 'multi' ? true : x.tahap === tile) && (tile !== 'multi' || multi.some((r) => r.id === x.talent)) && (!q || (x.nama + x.posisi + x.brn).toLowerCase().includes(q.toLowerCase())))
  const perBr = clients.map((b) => { const l = inY.filter((x) => x.branch === b); const h = l.filter((x) => ['Hired', 'Selesai'].includes(x.tahap)).map((x) => x.mulai).sort()
    return { id: b, nama: brName(b), total: l.length, hired: l.filter((x) => x.tahap === 'Hired').length, selesai: l.filter((x) => x.tahap === 'Selesai').length, proses: l.filter((x) => x.tahap === 'Proses seleksi').length, gagal: l.filter((x) => x.tahap === 'Tidak lolos').length, talent: new Set(l.map((x) => x.talent)).size, first: h[0], last: h[h.length - 1] } }).sort((a, b) => b.total - a.total)
  const toList = () => setTimeout(() => document.getElementById('kl-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  const dl = () => { try { exportExcel({ title: `Penempatan talent ${m.name}`, meta: `${br ? brName(br) : 'Semua Branch'} · ${yr || 'Semua tahun'} · ${rows.length} baris`, cols: ['Talent', 'Branch', 'Posisi', 'Tahap', 'Mulai / tgl hired', 'Selesai', 'Durasi'], rows: rows.map((x) => [x.nama, x.brn, x.posisi, x.tahap, x.mulai || '', x.selesai || '', ['Hired', 'Selesai'].includes(x.tahap) ? dur(x.mulai, x.tahap === 'Hired' ? null : x.selesai) : '']), file: 'penempatan-talent-' + m.id }); toast('Rekap penempatan diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  const tglH = (x) => ['Hired', 'Selesai'].includes(x.tahap) ? 'Hired' : x.tahap === 'Proses seleksi' ? 'Diajukan' : 'Diajukan'
  return (
    <><PageHead title="Klien & Penempatan" sub="Branch yang meng-hire talentmu: kapan di-hire, kapan selesai, dan berapa Branch tiap talent terdaftar."><Btn kind="ghost" icon="download" perm="r" onClick={dl}>Download Excel</Btn></PageHead>
      <div className="filters"><label className="fsel"><span>Tahun mulai</span><select value={yr} onChange={(e) => setYr(e.target.value)}><option value="">Semua tahun</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="fsel"><span>Branch</span><select value={br} onChange={(e) => setBr(e.target.value)}><option value="">Semua Branch</option>{clients.map((b) => <option key={b} value={b}>{brName(b)}</option>)}</select></label></div>
      <div className="rk-tiles six" role="group" aria-label="Rekap penempatan">{TILES.map(([k, l, ic, c, n, sub]) => (
        <button key={k} className={`rk-tile ${tile === k ? 'on' : ''}`} style={{ borderTopColor: c }} aria-pressed={tile === k} onClick={() => { setTile(tile === k ? '' : k); if (k === 'klien') setTimeout(() => document.getElementById('kl-br')?.scrollIntoView({ behavior: 'smooth' }), 50); else if (k === 'multi') setTimeout(() => document.getElementById('kl-tal')?.scrollIntoView({ behavior: 'smooth' }), 50); else toList() }}>
          <span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{n}</b><small>{sub}</small></button>))}</div>

      <div id="kl-br" />
      <Card title="Rekap per Branch klien" pad={false}>
        <Table paged={false} rows={perBr} onRow={(r) => { setBr(br === r.id ? '' : r.id); setTile(''); toList() }} empty="Belum ada Branch klien." cols={[
          { h: 'Branch', r: (r) => <><strong>{r.nama}</strong>{r.id === 'b4' && <Badge t="ok">Klien utama</Badge>}{br === r.id && <Badge t="info">Difilter</Badge>}</> },
          { h: 'Talent', r: (r) => r.talent, right: true }, { h: 'Aktif', r: (r) => r.hired, right: true }, { h: 'Selesai', r: (r) => r.selesai, right: true }, { h: 'Proses', r: (r) => r.proses, right: true }, { h: 'Tidak lolos', r: (r) => r.gagal, right: true },
          { h: 'Hired pertama', r: (r) => r.first ? fmtDate(r.first) : '—' }, { h: 'Hired terakhir', r: (r) => r.last ? fmtDate(r.last) : '—' },
        ]} />
        <div className="tbl-total"><span>Total {perBr.length} Branch</span><span>{inY.length} catatan · {inY.filter((x) => x.tahap === 'Hired').length} aktif · {inY.filter((x) => x.tahap === 'Selesai').length} selesai</span></div>
      </Card>

      <div id="kl-list" />
      <Card title={`Daftar penempatan & lamaran${tile && !['klien', 'multi'].includes(tile) ? ' · ' + tile : ''}${tile === 'multi' ? ' · talent di >1 Branch' : ''}${br ? ' · ' + brName(br) : ''}`} action={(tile || br || q) ? <Btn kind="ghost" perm="r" onClick={() => { setTile(''); setBr(''); setQ('') }}>Reset filter</Btn> : null} pad={false}>
        <div className="filters ib-f"><input className="search" placeholder="Cari talent, posisi, Branch…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari penempatan" /></div>
        <Table rows={rows} empty="Tidak ada data untuk filter ini." cols={[
          { h: 'Talent', r: (x) => <strong>{x.nama}</strong> }, { h: 'Branch', r: (x) => x.brn }, { h: 'Posisi', k: 'posisi' },
          { h: 'Tahap', r: (x) => <Badge t={tahapT(x.tahap)}>{x.tahap === 'Hired' ? 'Aktif bekerja' : x.tahap}</Badge> },
          { h: 'Tgl hired / diajukan', r: (x) => <>{fmtDate(x.mulai)}<small className="muted sm" style={{ display: 'block' }}>{tglH(x)}</small></> },
          { h: 'Selesai', r: (x) => x.selesai ? <>{fmtDate(x.selesai)}{x.tahap === 'Hired' && <small className="muted sm" style={{ display: 'block' }}>akhir kontrak</small>}</> : '—' },
          { h: 'Durasi', r: (x) => ['Hired', 'Selesai'].includes(x.tahap) ? dur(x.mulai, x.tahap === 'Hired' ? null : x.selesai) : '—' },
        ]} />
        <div className="tbl-total"><span>Total</span><span>{rows.length} baris · {new Set(rows.map((x) => x.talent)).size} talent</span></div>
      </Card>

      <div id="kl-tal" />
      <Card title="Rekap talent: terdaftar di berapa Branch" pad={false}>
        <Table rows={(tile === 'multi' ? multi : perTal).filter((r) => !q || r.nama.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.daftar.length - a.daftar.length || a.nama.localeCompare(b.nama))} cols={[
          { h: 'Talent', r: (r) => <strong>{r.nama}</strong> },
          { h: 'Terdaftar di', r: (r) => <b>{r.daftar.length} Branch</b>, right: true },
          { h: 'Pernah/sedang bekerja', r: (r) => r.brs.length + ' Branch', right: true },
          { h: 'Riwayat per Branch', r: (r) => <div className="kl-chips">{r.rows.map((x) => <span key={x.id} className={`kl-chip t-${tahapT(x.tahap)}`}>{brName(x.branch).replace('PT. ', '')} · {x.tahap}{x.mulai ? ' · ' + x.mulai.slice(0, 7) : ''}</span>)}</div> },
        ]} />
      </Card>{t}</>
  )
}

// ---------- Profil & Akun ----------
const PF = [['name', 'Nama perusahaan'], ['pic', 'PIC'], ['email', 'Email'], ['telp', 'No. telp'], ['alamat', 'Alamat'], ['npwp', 'NPWP'], ['bank', 'Rekening bank'], ['web', 'Website']]
export function Profil() {
  const m = useMe(); const [t, toast] = useToast()
  const [f, setF] = useState(() => Object.fromEntries([...PF, ['foto']].map(([k]) => [k, m[k] || ''])))
  const [pw, setPw] = useState({ old: '', n1: '', n2: '' }); const [show, setShow] = useState(false)
  const changes = [...PF, ['foto', 'Foto/logo']].filter(([k]) => (f[k] || '') !== (m[k] || '')).map(([key, label]) => ({ key, label, dari: m[key] || '', ke: f[key] }))
  const info = changes.filter((c) => c.key !== 'foto')
  const save = () => { api.mitraUpdateProfil(m.id, changes, m.pic || m.name); toast(info.length ? 'Profil disimpan · Superadmin & Root sudah diberi tahu' : 'Foto profil diperbarui') }
  const rules = [[pw.n1.length >= 8, 'Minimal 8 karakter'], [/[A-Z]/.test(pw.n1) && /[a-z]/.test(pw.n1), 'Huruf besar & kecil'], [/\d/.test(pw.n1), 'Mengandung angka'], [pw.n1 && pw.n1 === pw.n2, 'Konfirmasi sama'], [pw.n1 && pw.n1 !== pw.old, 'Beda dari password lama']]
  const okPw = pw.old && rules.every((r) => r[0])
  const pick = (e) => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => setF({ ...f, foto: r.result }); r.readAsDataURL(file) }
  const img = f.foto && f.foto.startsWith('data:') ? f.foto : null
  return (
    <><PageHead title="Profil & Akun" sub="Data perusahaan mitra dan keamanan akun." />
      <div className="pf-grid">
        <Card title="Profil perusahaan">
          <div className="pf-photo">{img ? <img src={img} alt="Logo mitra" /> : <Avatar name={f.name} size={72} />}
            <div><strong>Foto / logo</strong><small className="muted sm" style={{ display: 'block' }}>Perubahan foto tidak perlu dilaporkan.</small><label className="btn btn-ghost pf-up"><Icon name="upload" size={16} />Unggah foto<input type="file" accept="image/*" onChange={pick} hidden /></label>{f.foto && <button className="linkish sm" onClick={() => setF({ ...f, foto: '' })}>Hapus</button>}</div></div>
          <div className="form two">{PF.map(([k, l]) => <Field key={k} label={l}>{k === 'alamat' ? <textarea rows={2} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /> : <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}</Field>)}</div>
          {info.length > 0 && <div className="warnbar"><Icon name="bell" />Perubahan {info.map((c) => c.label).join(', ')} terkait kerja sama, jadi akan diinformasikan ke Superadmin & Root saat disimpan.</div>}
          <div className="pf-act"><Btn kind="ghost" perm="r" disabled={!changes.length} onClick={() => setF(Object.fromEntries([...PF, ['foto']].map(([k]) => [k, m[k] || ''])))}>Batalkan</Btn><Btn icon="check" disabled={!changes.length || !f.name || !f.email} onClick={save}>Simpan perubahan</Btn></div>
        </Card>
        <Card title="Ubah password">
          <div className="form">
            <Field label="Password lama"><input type={show ? 'text' : 'password'} value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} autoComplete="current-password" /></Field>
            <Field label="Password baru"><input type={show ? 'text' : 'password'} value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} autoComplete="new-password" /></Field>
            <Field label="Konfirmasi password baru"><input type={show ? 'text' : 'password'} value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} autoComplete="new-password" /></Field>
            <label className="chk-l"><input className="chk" type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Tampilkan password</label>
            <ul className="pw-rules">{rules.map(([ok, l]) => <li key={l} className={ok ? 'ok' : ''}><Icon name={ok ? 'check' : 'dot'} size={14} />{l}</li>)}</ul>
            <Btn icon="key" disabled={!okPw} onClick={() => { api.mitraChangePassword(m.id); setPw({ old: '', n1: '', n2: '' }); toast('Password berhasil diubah') }}>Ubah password</Btn>
            <small className="muted sm">{m.pwChanged ? 'Terakhir diubah ' + m.pwChanged : 'Password belum pernah diubah sejak akun dibuat.'}</small>
          </div>
        </Card>
      </div>
      <Card title="Riwayat perubahan profil" pad={false}>
        <Table rows={(m.profilLog || []).map((x, i) => ({ ...x, id: i }))} empty="Belum ada perubahan." cols={[
          { h: 'Waktu', k: 'at' }, { h: 'Oleh', k: 'oleh' }, { h: 'Data', k: 'field' },
          { h: 'Sebelum → sesudah', r: (x) => x.field === 'Foto/logo' ? 'Foto diperbarui' : <>{x.dari || '—'} → <b>{x.ke || '—'}</b></> },
          { h: 'Diinformasikan', r: (x) => x.field === 'Foto/logo' ? <Badge t="neutral">Tidak perlu</Badge> : <Badge t="ok">Superadmin & Root</Badge> },
        ]} />
      </Card>{t}</>
  )
}
