// Komponen bersama Talent Pool & Mitra: Quick Summary, aturan kerja sama, buat akun mitra, detail mitra, permintaan (job requisition).
// Dipakai Superadmin, Root (Owner Kirana), Mitra, dan Branch.
import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { Btn, Card, Badge, Table, Modal, Field, useToast, Icon, Avatar, Note, usePerm } from '../components/ui.jsx'
import { useLookup, fmtDate } from './shared.jsx'
import { TP_STATUS, ATURAN_MITRA, ALUR_MITRA, KEPEMILIKAN, BILLING } from '../data/talentPool.js'

const p2 = (n) => String(n).padStart(2, '0')
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }
const diff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5)
export const tpActive = (p) => p.status !== 'Nonaktif' && p.aktif !== false
export const mitraOf = (s, name) => s.mitras.find((m) => m.name === name)
export const PERJ_T = { Aktif: 'ok', 'Menunggu persetujuan': 'warn', Berakhir: 'bad' }

// ---------- Quick Summary ----------
export function QuickSummary({ list, role, value, onPick, title = 'Quick Summary', sub }) {
  const sts = role === 'branch' ? TP_STATUS.filter((x) => x[4]) : TP_STATUS
  const act = list.filter(tpActive)
  return (
    <section className="tp-qs" aria-label={title}>
      <div className="tp-qs-h"><b>{title}</b>{sub && <span className="muted sm">{sub}</span>}</div>
      <div className={`rk-tiles ${sts.length === 3 ? 'three' : ''}`} role="group" aria-label={title}>{sts.map(([st, l, def, c]) => { const n = act.filter((p) => p.status === st); const on = value === st; return (
        <button key={st} className={`rk-tile ${on ? 'on' : ''}`} style={{ borderTopColor: c }} aria-pressed={on} title={def} onClick={() => onPick && onPick(on ? '' : st)}>
          <span className="rk-h">{l}</span><b>{n.length}</b><small>{def}</small>
          <small className="rk-br">{n.filter((p) => p.mitra && p.mitra !== '—').length} via mitra · {n.filter((p) => !p.mitra || p.mitra === '—').length} daftar sendiri</small>
        </button>) })}</div>
      <p className="muted sm tp-qs-n">Talent nonaktif tidak dihitung ({list.length - act.length}).{role === 'branch' ? ' Branch melihat talent yang belum masuk proses seleksi; Talent in Hiring Process & Hired dipantau di menu Seleksi Kandidat.' : ''}</p>
    </section>
  )
}

// ---------- Permintaan (Job Requisition) ----------
export function reqInfo(s, r) {
  const sub = s.pool.filter((p) => p.req === r.id); const hired = sub.filter((p) => p.status === 'Hired').length
  const tenggat = addDays(r.dikirim, r.sla); const sisa = diff(todayISO(), tenggat)
  const status = r.selesai ? 'Selesai' : sub.length >= r.kuota ? 'Kuota terpenuhi' : sisa < 0 ? 'Lewat SLA' : 'Berjalan'
  return { sub, n: sub.length, hired, tenggat, sisa, status }
}
const REQ_T = { Selesai: 'ok', 'Kuota terpenuhi': 'ok', 'Lewat SLA': 'bad', Berjalan: 'warn' }
export function ReqTable({ rows, showMitra, onOpen }) {
  const s = useStore(); const { job, branch } = useLookup()
  return <Table rows={rows} empty="Belum ada permintaan." onRow={onOpen} cols={[
    { h: 'Lowongan', r: (r) => <div><strong>{job(r.job)?.posisi || r.job}</strong><div className="muted sm">{branch(job(r.job)?.branch)}</div></div> },
    ...(showMitra ? [{ h: 'Mitra', r: (r) => s.mitras.find((m) => m.id === r.mitra)?.name }] : []),
    { h: 'Kuota', right: true, r: (r) => r.kuota },
    { h: 'Disubmit', right: true, r: (r) => { const x = reqInfo(s, r); return <b>{x.n}/{r.kuota}</b> } },
    { h: 'Hired', right: true, r: (r) => reqInfo(s, r).hired },
    { h: 'SLA', r: (r) => { const x = reqInfo(s, r); return <span className="sm nowrap">{r.sla} hari · s.d. {fmtDate(x.tenggat)}{x.status === 'Berjalan' && <span className="muted" style={{ display: 'block' }}>sisa {x.sisa} hari</span>}</span> } },
    { h: 'Status', r: (r) => { const x = reqInfo(s, r); return <Badge t={REQ_T[x.status]}>{x.status}</Badge> } },
  ]} />
}
export function ReqModal({ open, onClose, mitras, defMitra }) {
  const s = useStore(); const [t, toast] = useToast(); const { branch } = useLookup()
  const [f, setF] = useState({ mitra: defMitra || '', job: '', kuota: 2, sla: '', kualifikasi: '' })
  const m = s.mitras.find((x) => x.id === (f.mitra || defMitra))
  const jobs = s.jobs.filter((j) => j.status === 'Active')
  const ok = m && m.perjanjian?.status === 'Aktif' && f.job && f.kuota > 0 && f.kualifikasi.trim()
  const close = () => { setF({ mitra: defMitra || '', job: '', kuota: 2, sla: '', kualifikasi: '' }); onClose() }
  return <>
    <Modal open={open} title="Teruskan lowongan ke mitra" onClose={close} footer={<><Btn kind="ghost" perm="r" onClick={close}>Batal</Btn><Btn perm="c" disabled={!ok} onClick={() => { api.sendRequisition({ mitra: m.id, job: f.job, kuota: Number(f.kuota), sla: Number(f.sla || m.perjanjian.sla.submit), kualifikasi: f.kualifikasi.trim() }); toast('Permintaan terkirim ke ' + m.name); close() }}>Kirim permintaan</Btn></>}>
      <div className="form">
        <p className="muted sm">Langkah 1 alur kerja sama: kebutuhan tenaga kerja diteruskan ke mitra lengkap dengan kualifikasi, kuota, dan SLA.</p>
        {!defMitra && <Field label="Mitra"><select value={f.mitra} onChange={(e) => setF({ ...f, mitra: e.target.value })}><option value="">Pilih mitra</option>{mitras.map((x) => <option key={x.id} value={x.id} disabled={x.perjanjian?.status !== 'Aktif'}>{x.name}{x.perjanjian?.status !== 'Aktif' ? ' (perjanjian belum aktif)' : ''}</option>)}</select></Field>}
        <Field label="Lowongan"><select value={f.job} onChange={(e) => setF({ ...f, job: e.target.value })}><option value="">Pilih lowongan aktif</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.posisi} · {branch(j.branch)}</option>)}</select></Field>
        <div className="grid2"><Field label="Kuota kandidat"><input type="number" min="1" value={f.kuota} onChange={(e) => setF({ ...f, kuota: e.target.value })} /></Field>
          <Field label="SLA submit (hari)" hint={m ? `Default perjanjian: ${m.perjanjian.sla.submit} hari` : ''}><input type="number" min="1" value={f.sla} placeholder={m ? String(m.perjanjian.sla.submit) : ''} onChange={(e) => setF({ ...f, sla: e.target.value })} /></Field></div>
        <Field label="Kualifikasi"><textarea rows={3} value={f.kualifikasi} onChange={(e) => setF({ ...f, kualifikasi: e.target.value })} placeholder="Pendidikan, pengalaman, lokasi, syarat khusus" /></Field>
        {m && m.perjanjian?.status !== 'Aktif' && <Note>Perjanjian {m.name} belum disetujui mitra. Permintaan baru bisa dikirim setelah aturan kerja sama disepakati.</Note>}
      </div>
    </Modal>{t}</>
}

// ---------- Aturan kerja sama ----------
export function AturanCard({ m, title = 'Aturan kerja sama', compact }) {
  const P = m?.perjanjian || {}
  const val = { pdp: 'Consent wajib untuk setiap kandidat (versi PDP v1.2)', milik: KEPEMILIKAN.find((x) => x[0] === P.kepemilikan)?.[1], billing: P.billing ? `${BILLING.find((x) => x[0] === P.billing)?.[1]} · ${P.nilai}` : '', api: P.api ? (P.api.aktif ? `Aktif · Client ID ${P.api.clientId}` : 'Tidak dipakai (input manual / CSV)') : '' }
  return (
    <Card title={title} action={m && <Badge t={PERJ_T[P.status] || 'neutral'}>{P.status}</Badge>}>
      <ol className="tp-rules">{ATURAN_MITRA.map(([k, l, d]) => <li key={k}><b>{l}</b><p className="muted sm">{d}</p>{m && val[k] && <p className="tp-val"><Icon name="check" size={14} />{val[k]}</p>}</li>)}</ol>
      {m && <p className="muted sm">Masa kerja sama {fmtDate(P.mulai)} – {fmtDate(P.sampai)} · SLA submit {P.sla?.submit} hari, feedback klien {P.sla?.feedback} hari{P.disetujui ? ` · disepakati ${P.disetujui.at} oleh ${P.disetujui.oleh} & ${P.disetujui.mitra}` : ' · belum disetujui mitra'}</p>}
      {!compact && <><h4 className="mt">Alur kerja (end-to-end)</h4><ol className="tp-flow">{ALUR_MITRA.map(([l, d], i) => <li key={l}><span>{i + 1}</span><div><b>{l}</b><p className="muted sm">{d}</p></div></li>)}</ol></>}
    </Card>
  )
}

// ---------- Buat akun mitra (dengan aturan kerja sama) ----------
export function MitraCreate({ open, onClose, owner, customers }) {
  const [t, toast] = useToast()
  const blank = { name: '', email: '', pic: '', telp: '', klien: owner ? [] : ['c1'], kepemilikan: 'Mitra', billing: 'Revenue sharing', nilai: '', api: false, webhook: '', submit: 7, feedback: 3, mulai: todayISO(), sampai: addDays(todayISO(), 364), ack: false }
  const [f, setF] = useState(blank); const [step, setStep] = useState(0)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ok0 = f.name.trim() && /^\S+@\S+\.\S+$/.test(f.email) && f.pic.trim() && (!owner || f.klien.length)
  const ok1 = f.nilai.trim() && f.ack && (!f.api || /^https:\/\//.test(f.webhook))
  const close = () => { setF(blank); setStep(0); onClose() }
  return <>
    <Modal wide open={open} title={`Create Mitra Account${owner ? ' · kerja sama Owner Kirana' : ''}`} onClose={close} footer={<>
      {step > 0 && <Btn kind="ghost" perm="r" onClick={() => setStep(0)}>Kembali</Btn>}<Btn kind="ghost" perm="r" onClick={close}>Batal</Btn>
      {step === 0 ? <Btn perm="r" disabled={!ok0} onClick={() => setStep(1)}>Lanjut: aturan kerja sama</Btn>
        : <Btn perm="c" disabled={!ok1} onClick={() => { api.addMitra({ name: f.name.trim(), email: f.email.trim(), pic: f.pic.trim(), telp: f.telp, mitraDengan: owner ? 'Owner Kirana' : 'Superadmin', customer: owner ? '' : 'c1', klien: f.klien,
          perjanjian: { status: 'Menunggu persetujuan', mulai: f.mulai, sampai: f.sampai, kepemilikan: f.kepemilikan, billing: f.billing, nilai: f.nilai.trim(), api: { aktif: f.api, webhook: f.webhook }, sla: { submit: Number(f.submit), feedback: Number(f.feedback) }, disetujui: null } }, owner ? 'Putri Amalia (Owner Kirana)' : 'Rani Hapsari'); toast('Akun mitra dibuat · password & aturan kerja sama dikirim ke e-mail mitra untuk disetujui'); close() }}>Buat akun & kirim aturan</Btn>}</>}>
      <ol className="stepper">{['Data mitra', 'Aturan kerja sama'].map((x, i) => <li key={x} className={i < step ? 'done' : i === step ? 'on' : ''}><span>{i + 1}</span>{x}</li>)}</ol>
      {step === 0 && <div className="form two">
        <Field label="Nama mitra"><input value={f.name} onChange={set('name')} placeholder="PT ..." /></Field>
        <Field label="E-mail akun mitra"><input type="email" value={f.email} onChange={set('email')} placeholder="nama@perusahaan.id" /></Field>
        <Field label="Nama PIC mitra"><input value={f.pic} onChange={set('pic')} /></Field>
        <Field label="No. telp"><input inputMode="tel" value={f.telp} onChange={set('telp')} /></Field>
        {owner && <Field label="Klien yang dilayani" hint="Customer Kirana yang boleh menerima kandidat dari mitra ini"><div className="mod-row">{customers.map((c) => <label key={c.id} className={`mod ${f.klien.includes(c.id) ? 'on' : ''}`}><input type="checkbox" checked={f.klien.includes(c.id)} onChange={(e) => setF({ ...f, klien: e.target.checked ? [...f.klien, c.id] : f.klien.filter((x) => x !== c.id) })} />{c.nama}</label>)}</div></Field>}
      </div>}
      {step === 1 && <div className="form">
        <Note><div>Aturan ini ditampilkan saat membuat akun dan <b>selalu tampil di akun mitra</b> sepanjang kerja sama. Akun aktif setelah mitra menyetujui aturan di menu Kerja Sama.</div></Note>
        <div className="tp-rule-f"><b>1. Kepatuhan data (UU PDP)</b><p className="muted sm">{ATURAN_MITRA[0][2]}</p><p className="tp-val"><Icon name="lock" size={14} />Consent kandidat wajib, dicek sistem sebelum kandidat diproses</p></div>
        <div className="tp-rule-f"><b>2. Kepemilikan database kandidat</b><p className="muted sm">{ATURAN_MITRA[1][2]}</p>
          <div className="mod-row">{KEPEMILIKAN.map(([v, l]) => <label key={v} className={`mod ${f.kepemilikan === v ? 'on' : ''}`}><input type="radio" name="milik" checked={f.kepemilikan === v} onChange={() => setF({ ...f, kepemilikan: v })} />{l}</label>)}</div></div>
        <div className="tp-rule-f"><b>3. Skema komersial & billing</b><p className="muted sm">{ATURAN_MITRA[2][2]}</p>
          <div className="mod-row">{BILLING.map(([v, l]) => <label key={v} className={`mod ${f.billing === v ? 'on' : ''}`}><input type="radio" name="bill" checked={f.billing === v} onChange={() => setF({ ...f, billing: v })} />{l}</label>)}</div>
          <Field label="Nilai / tarif"><input value={f.nilai} onChange={set('nilai')} placeholder={f.billing === 'Subscription' ? 'Rp 25.000 per talent aktif per bulan' : f.billing === 'Referral' ? 'Rp 750.000 per kandidat hired' : '10% dari gaji bulan pertama'} /></Field></div>
        <div className="tp-rule-f"><b>4. Integrasi sistem (API/Webhook)</b><p className="muted sm">{ATURAN_MITRA[3][2]}</p>
          <label className="chk-l"><input type="checkbox" className="chk" checked={f.api} onChange={(e) => setF({ ...f, api: e.target.checked })} />Mitra memakai sistem sendiri — buatkan Client ID & Secret</label>
          {f.api && <Field label="URL webhook mitra" hint="Wajib https://"><input value={f.webhook} onChange={set('webhook')} placeholder="https://..." /></Field>}</div>
        <div className="grid2"><Field label="SLA submit kandidat (hari)"><input type="number" min="1" value={f.submit} onChange={set('submit')} /></Field><Field label="SLA feedback klien (hari)"><input type="number" min="1" value={f.feedback} onChange={set('feedback')} /></Field></div>
        <div className="grid2"><Field label="Mulai kerja sama"><input type="date" value={f.mulai} onChange={set('mulai')} /></Field><Field label="Berakhir"><input type="date" value={f.sampai} onChange={set('sampai')} /></Field></div>
        <label className="chk-l"><input type="checkbox" className="chk" checked={f.ack} onChange={(e) => setF({ ...f, ack: e.target.checked })} />Aturan di atas sudah dibahas dengan mitra dan akan dikirim untuk disetujui</label>
      </div>}
    </Modal>{t}</>
}

// ---------- Detail mitra ----------
export function MitraDetail({ m, onBack, backLabel, canSend = true, root }) {
  const s = useStore(); const [t, toast] = useToast(); const pm = usePerm(); const canU = !pm || pm.can('u')
  const [pick, setPick] = useState(''); const [req, setReq] = useState(false)
  const mine = s.pool.filter((p) => p.mitra === m.name)
  const reqs = s.requisitions.filter((r) => r.mitra === m.id)
  const fees = (s.mitraFees || []).filter((f) => f.mitra === m.id)
  const cust = (id) => s.root.customers.find((c) => c.id === id)?.nama || id
  const P = m.perjanjian || {}
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button onClick={onBack}>{backLabel}</button><span>›</span><b>{m.name}</b></nav>
      <Card><div className="who"><Avatar name={m.name} size={56} /><div className="bio-grid three grow">
        {[['Nama mitra', m.name], ['E-mail', m.email], ['PIC', `${m.pic} · ${m.telp}`], ['Kerja sama dengan', m.mitraDengan === 'Owner Kirana' ? 'Owner Kirana (platform)' : `Superadmin ${cust(m.customer)}`], ['Klien dilayani', (m.klien || []).map(cust).join(', ')], ['Status perjanjian', <Badge t={PERJ_T[P.status]}>{P.status}</Badge>]].map(([l, v]) => <div key={l} className="ro"><span className="ro-l">{l}</span><span className="ro-v">{v}</span></div>)}
      </div></div></Card>
      <Card title="Profil perusahaan mitra"><div className="bio-grid three">{[['Alamat', m.alamat], ['NPWP', m.npwp], ['Rekening bank', m.bank], ['Website', m.web], ['Password diubah', m.pwChanged || '—'], ['Penempatan aktif', `${(s.placements || []).filter((x) => x.mitra === m.id && x.tahap === 'Hired').length} talent di ${new Set((s.placements || []).filter((x) => x.mitra === m.id && x.tahap === 'Hired').map((x) => x.branch)).size} Branch`]].map(([l, v]) => <div key={l} className="ro"><span className="ro-l">{l}</span><span className="ro-v">{v || '—'}</span></div>)}</div>
        <h4 className="mt">Riwayat perubahan profil (dilaporkan otomatis)</h4>
        <Table rows={(m.profilLog || []).map((x, i) => ({ ...x, id: i }))} empty="Belum ada perubahan profil." cols={[{ h: 'Waktu', k: 'at' }, { h: 'Oleh', k: 'oleh' }, { h: 'Data', k: 'field' }, { h: 'Sebelum → sesudah', r: (x) => x.field === 'Foto/logo' ? 'Foto diperbarui' : <>{x.dari || '—'} → <b>{x.ke || '—'}</b></> }]} /></Card>
      <QuickSummary list={mine} value={pick} onPick={setPick} title="Pipeline talent mitra" sub={`${mine.length} talent · ${mine.filter((p) => !p.consent).length} belum consent`} />
      <div className="grid2">
        <AturanCard m={m} compact />
        <Card title="Integrasi API / webhook">{P.api?.aktif ? <dl className="dl">{[['Client ID', <code>{P.api.clientId}</code>], ['Client secret', <code>{P.api.secret}</code>], ['Webhook', <code className="sm">{P.api.webhook}</code>], ['Sinkron terakhir', P.api.sync || '—']].map(([a, b]) => <React.Fragment key={a}><dt>{a}</dt><dd>{b}</dd></React.Fragment>)}</dl> : <p className="muted">Mitra tidak memakai API. Kandidat diinput manual atau lewat CSV di akun mitra.</p>}
          {P.api?.aktif && <Btn kind="ghost" perm="u" icon="refresh" onClick={() => { api.regenSecret(m.id); toast('Client secret baru dibuat & dikirim ke PIC mitra') }}>Buat ulang secret</Btn>}
          {fees.length > 0 && <><h4 className="mt">Tagihan / pendapatan kerja sama</h4><Table rows={fees} cols={[{ h: 'Bulan', k: 'bulan' }, { h: 'Skema', k: 'jenis' }, { h: 'Nominal', right: true, r: (f) => 'Rp ' + Math.round(f.nominal).toLocaleString('id-ID') }, { h: 'Keterangan', k: 'ket' }]} /></>}
        </Card>
      </div>
      <Card title={`Permintaan kandidat (job requisition) · ${reqs.length}`} action={canSend && <Btn perm="c" icon="send" disabled={P.status !== 'Aktif'} onClick={() => setReq(true)}>Teruskan lowongan</Btn>} pad={false}><ReqTable rows={reqs} /></Card>
      <Card title={`Talent dari mitra${pick ? ' · ' + TP_STATUS.find((x) => x[0] === pick)?.[1] : ''}`} pad={false}><TalentTable rows={mine.filter((p) => !pick || p.status === pick)} /></Card>
      <ReqModal open={req} onClose={() => setReq(false)} mitras={[m]} defMitra={m.id} />{t}
    </>
  )
}

export function TalentTable({ rows, link }) {
  const s = useStore(); const { job } = useLookup()
  return <Table rows={rows} empty="Belum ada talent." cols={[
    { h: 'Talent', r: (r) => <div className="who"><Avatar name={r.name} size={30} /><div>{link ? <a className="link" href={link(r)}>{r.name}</a> : <strong>{r.name}</strong>}<div className="muted sm">{r.spesialisasi} · {r.pendidikan}</div></div></div> },
    { h: 'Status', r: (r) => <Badge t={r.status === 'Nonaktif' ? 'neutral' : undefined}>{TP_STATUS.find((x) => x[0] === r.status)?.[1] || r.status}</Badge> },
    { h: 'Skor', right: true, r: (r) => r.skor ?? '—' },
    { h: 'Permintaan / lowongan', r: (r) => (r.job ? job(r.job)?.posisi || r.job : '—') },
    { h: 'Consent PDP', r: (r) => (r.consent ? <span className="sm"><Badge t="ok">Ada</Badge> <span className="muted">{r.consent.at.slice(0, 10)}</span></span> : <Badge t="bad">Belum</Badge>) },
    { h: 'Terdaftar', r: (r) => (r.daftar ? fmtDate(r.daftar) : '—') },
  ]} />
}
