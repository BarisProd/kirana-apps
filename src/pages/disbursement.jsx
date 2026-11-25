// Disbursement (Superadmin) — alur mengikuti Figma Scala "Payroll Disbursement", tampilan tema Kirana.
// Payment gateway belum diintegrasikan: pembayaran diproses langsung (direct) dan selalu berhasil.
import React, { useEffect, useMemo, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { calcRemunRow, rupiah } from '../services/payroll.js'
import { exportXlsx } from '../services/export.js'
import { Btn, Card, Badge, Modal, Field, Icon, Avatar, PageHead, Empty, useToast, Stat, Table, Note } from '../components/ui.jsx'
import { HBars, Columns, SegBar } from '../components/charts.jsx'

export const DSB_STATUS = ['Waiting for Transfer', 'Scheduled', 'Disbursement Process', 'Success', 'Failed', 'Canceled']
export const BANKS = [
  { kode: 'BWS', nama: 'Bank Woori Saudara', warna: '#1f5aa6' },
  { kode: 'BCA', nama: 'Bank Central Asia (BCA)', warna: '#0b4ea2' },
  { kode: 'BNI', nama: 'Bank Negara Indonesia (BNI)', warna: '#e2662b' },
  { kode: 'MDR', nama: 'Bank Mandiri', warna: '#103a6e' },
]
const bankOf = (kode) => BANKS.find((b) => b.kode === kode) || BANKS[0]
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const BLS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const todayISO = () => iso(new Date())
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const tglPanjang = (s) => { const d = new Date(s); return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}` }
const tgl = (s) => { const d = new Date(s); return `${d.getDate()} ${BLS[d.getMonth()]} ${d.getFullYear()}` }
const jam = (s) => { const d = new Date(s); return `${tgl(s)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
export const empNo = (e) => '0324230940' + String(e?.id || '').replace(/\D/g, '').padStart(2, '0') // Employee ID
const BankMark = ({ kode, size = 'm' }) => { const b = bankOf(kode); return <span className={'bank-mark ' + size} style={{ '--bk': b.warna }} aria-hidden="true">{b.kode}</span> }

// Jadwal pembayaran: Today, Tomorrow, +2 … +8 Days
const jadwalOpts = () => { const t = new Date(); return Array.from({ length: 9 }, (_, i) => { const d = new Date(t); d.setDate(t.getDate() + i); return { v: iso(d), h: i, l: `${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `+${i} Days`} - ${tglPanjang(d)}` } }) }
const hLabel = (d) => `H+${d.h ?? 0} - ${tgl(d.jadwal)}`

// Nominal yang dibayar = hasil hitung remunerasi (Nett Salary) atau THR
export function payItems(remun, tipe, s) {
  return remun.rows.map((row) => {
    const e = s.employees.find((x) => x.id === row.emp) || {}
    const c = calcRemunRow(row, s.setup, tipe === 'THR' ? { ...remun, thr: true } : remun, e)
    return { emp: row.emp, e, type: row.type || e.type, amount: Math.round(tipe === 'THR' ? c.add.THR : c.net) }
  })
}
const LIVE = ['Success', 'Scheduled'] // sudah dibayar atau sudah dijadwalkan
export const ST_T = { Success: 'ok', Scheduled: 'warn', 'Waiting for Transfer': 'warn', 'Disbursement Process': 'warn', Failed: 'bad', Canceled: 'neutral' }
const paidBefore = (s, empId, bulan, tipe) => s.disbursements.some((d) => LIVE.includes(d.status) && d.bulan === bulan && (d.tipe || 'Payroll') === tipe && d.items?.some((i) => i.emp === empId))

export function Disbursement({ sub, go }) {
  // Cek jadwal: disbursement Scheduled yang tanggalnya sudah tiba otomatis ditransfer (Success)
  useEffect(() => { api.settleDisb(); const t = setInterval(api.settleDisb, 60000); return () => clearInterval(t) }, [])
  if (sub === 'create') return <CreateDisbursement go={go} />
  if (sub === 'va') return <VAList go={go} />
  if (sub === 'dashboard') return <DisbDashboard go={go} />
  if (sub && sub.startsWith('d-')) return <DisbDetail id={sub.slice(2)} go={go} />
  return <DisbList go={go} />
}

// ---------------- Daftar ----------------
function DisbList({ go }) {
  const s = useStore(); const [t, toast] = useToast()
  const [fb, setFb] = useState(''); const [fs, setFs] = useState(''); const [fv, setFv] = useState(''); const [fd, setFd] = useState(''); const [q, setQ] = useState('')
  const [per, setPer] = useState(10); const [page, setPage] = useState(1); const [help, setHelp] = useState(false); const [va, setVa] = useState(false)
  const br = (id) => s.branches.find((b) => b.id === id)?.name || '—'
  const vaName = (id) => s.virtualAccounts.find((v) => v.id === id)?.nama || '—'
  const rows = s.disbursements.filter((d) => (!fb || d.branch === fb) && (!fs || d.status === fs) && (!fv || d.va === fv) && (!fd || d.jadwal === fd)
    && (!q || [d.kode, d.bulan, br(d.branch), d.deskripsi].join(' ').toLowerCase().includes(q.toLowerCase())))
  const pages = Math.max(1, Math.ceil(rows.length / per)); const pg = Math.min(page, pages)
  const view = rows.slice((pg - 1) * per, pg * per)
  const reset = (fn) => (v) => { fn(v); setPage(1) }
  return (
    <>
      <PageHead title="Payroll Disbursement" sub="Pembayaran gaji karyawan dari remunerasi yang sudah di-approve. Payment gateway belum terhubung: proses langsung tanpa kondisi gagal, transfer dijalankan sesuai Payment Schedule dan payslip terbit saat transfer.">
        <div className="row-act"><Btn kind="ghost" icon="chart" onClick={() => go('disbursement/dashboard')}>Dashboard</Btn><Btn kind="ghost" icon="wallet" onClick={() => go('disbursement/va')}>Daftar VA ({s.virtualAccounts.length})</Btn><Btn kind="ghost" icon="plus" onClick={() => setVa(true)}>Create Virtual Account</Btn><Btn icon="send" onClick={() => go('disbursement/create')}>Create Disbursement</Btn></div>
      </PageHead>
      <div className="filters">
        <label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => reset(setFb)(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="fsel"><span>Status</span><select value={fs} onChange={(e) => reset(setFs)(e.target.value)}><option value="">All Disbursement Status</option>{DSB_STATUS.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="fsel"><span>Virtual Account</span><select value={fv} onChange={(e) => reset(setFv)(e.target.value)}><option value="">All Virtual Account Label</option>{s.virtualAccounts.map((v) => <option key={v.id} value={v.id}>{v.nama}</option>)}</select></label>
        <label className="fsel"><span>Payment schedule</span><input type="date" value={fd} onChange={(e) => reset(setFd)(e.target.value)} /></label>
        <div className="help-wrap"><button type="button" className="icon-btn help-btn" aria-label="Penjelasan status disbursement" aria-expanded={help} onClick={() => setHelp(!help)}>?</button>
          {help && <div className="help-pop" role="note"><strong>Status disbursement</strong>{[['Waiting for Transfer', 'menunggu dana masuk ke VA'], ['Scheduled', 'dijadwalkan sesuai Payment Schedule'], ['Disbursement Process', 'sedang ditransfer ke rekening karyawan'], ['Success', 'gaji diterima, payslip terbit'], ['Failed', 'transfer gagal'], ['Canceled', 'dibatalkan admin']].map(([a, b]) => <div key={a}><Badge>{a}</Badge> {b}</div>)}<small>Payment gateway belum terhubung: proses langsung tanpa kondisi gagal. Jadwal hari ini langsung Success; jadwal ke depan Scheduled lalu otomatis Success saat tanggalnya tiba.</small></div>}</div>
        <label className="search grow-s"><Icon name="search" size={18} /><input placeholder="Cari ID, periode, branch" value={q} onChange={(e) => reset(setQ)(e.target.value)} /></label>
      </div>
      <Card pad={false}>
        {view.length === 0 ? <Empty text="Belum ada disbursement yang cocok dengan filter." /> : (
          <div className="tbl-wrap"><table className="tbl dsb-t">
            <thead><tr>{['No', 'Disbursement ID', 'Payroll Period', 'Payment Schedule', 'Created by', 'Type', 'VA Label', 'Transfer Schedule', 'Total Employee', 'Total', 'Disbursement', 'Details'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{view.map((d, i) => (
              <tr key={d.id}>
                <td data-h="No">{(pg - 1) * per + i + 1}</td>
                <td data-h="Disbursement ID" className="mono">{d.kode}</td>
                <td data-h="Payroll Period"><div>{d.bulan}</div><div className="muted sm">{br(d.branch)}</div></td>
                <td data-h="Payment Schedule"><button className="linkish" onClick={() => go('disbursement/d-' + d.id)}>{hLabel(d)}</button></td>
                <td data-h="Created by"><div className="fw7">{d.createdBy}</div><div className="muted sm">{jam(d.createdAt)}</div></td>
                <td data-h="Type">{d.tipe === 'THR' ? 'THR' : 'Salary'}</td>
                <td data-h="VA Label">{vaName(d.va)}</td>
                <td data-h="Transfer Schedule">{tgl(d.jadwal)}</td>
                <td data-h="Total Employee" className="c">{d.items.length}</td>
                <td data-h="Total" className="n">{rupiah(d.total)}</td>
                <td data-h="Disbursement"><Badge t={ST_T[d.status]}>{d.status}</Badge></td>
                <td data-h="Details"><Btn kind="ghost" icon="eye" onClick={() => go('disbursement/d-' + d.id)}>See Details</Btn></td>
              </tr>))}
            </tbody></table></div>)}
        <div className="pager">
          <label className="pager-show">Show <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1) }} aria-label="Jumlah baris">{[10, 25, 50].map((n) => <option key={n}>{n}</option>)}</select> entries</label>
          <nav className="pager-nav" aria-label="Halaman">
            <button className="icon-btn" disabled={pg <= 1} onClick={() => setPage(pg - 1)} aria-label="Sebelumnya"><Icon name="back" size={16} /></button>
            {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, pg - 3), Math.max(0, pg - 3) + 5).map((n) => <button key={n} className={'pg' + (n === pg ? ' on' : '')} aria-current={n === pg ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>)}
            <button className="icon-btn flip" disabled={pg >= pages} onClick={() => setPage(pg + 1)} aria-label="Berikutnya"><Icon name="back" size={16} /></button>
          </nav>
          <span className="muted sm">Showing {rows.length ? (pg - 1) * per + 1 : 0} to {Math.min(pg * per, rows.length)} of {rows.length} entries</span>
        </div>
      </Card>
      <CreateVA open={va} onClose={() => setVa(false)} onDone={(n) => { setVa(false); toast(`Virtual Account "${n}" dibuat`) }} />
      {t}
    </>
  )
}

function CreateVA({ open, onClose, onDone }) {
  const [f, setF] = useState({ nama: '', bank: '', deskripsi: '' })
  const ok = f.nama.trim() && f.bank && f.deskripsi.trim()
  const close = () => { setF({ nama: '', bank: '', deskripsi: '' }); onClose() }
  return (
    <Modal open={open} title="Create Virtual Account" onClose={close} footer={<><Btn kind="ghost" onClick={close}>Cancel</Btn><Btn disabled={!ok} onClick={() => { api.addVA({ ...f, nama: f.nama.trim(), deskripsi: f.deskripsi.trim() }); onDone(f.nama.trim()); setF({ nama: '', bank: '', deskripsi: '' }) }}>Create</Btn></>}>
      <div className="form">
        <Field label="Nama Virtual Account"><input placeholder="Masukkan Nama Virtual Account" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></Field>
        <Field label="Pilih Bank yang akan digunakan"><select value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })}><option value="">Pilih Bank</option>{BANKS.map((b) => <option key={b.kode} value={b.kode}>{b.nama}</option>)}</select></Field>
        <Field label="Deskripsi"><input placeholder="Masukkan Deskripsi Virtual Account" value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}

// ---------------- Create Disbursement (Setup → Review → Confirmation) ----------------
function CreateDisbursement({ go }) {
  const s = useStore()
  const [step, setStep] = useState(0)
  const [branch, setBranch] = useState('')
  const [f, setF] = useState({ tipe: 'Payroll', remun: '', jadwal: '', deskripsi: '' })
  const [kat, setKat] = useState(''); const [showPaid, setShowPaid] = useState(false); const [q, setQ] = useState('')
  const [sel, setSel] = useState({}); const [removed, setRemoved] = useState({})
  const [ask, setAsk] = useState(null); const [vaId, setVaId] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(null)
  const opts = useMemo(jadwalOpts, [])
  const br = (id) => s.branches.find((b) => b.id === id)?.name || '—'
  const remuns = s.remunerations.filter((r) => r.status === 'Approved' && (!branch || r.branch === branch))
  const remun = s.remunerations.find((r) => r.id === f.remun)
  const jd = opts.find((o) => o.v === f.jadwal)
  const all = useMemo(() => (remun ? payItems(remun, f.tipe, s).map((x) => ({ ...x, paid: paidBefore(s, x.emp, remun.bulan, f.tipe) })) : []), [remun, f.tipe, s.setup, s.disbursements])
  const list = all.filter((x) => !removed[x.emp] && (showPaid || !x.paid) && (!kat || x.type === kat) && (!q || (x.e.name || '').toLowerCase().includes(q.toLowerCase())))
  const chosen = all.filter((x) => sel[x.emp] && !removed[x.emp] && (showPaid || !x.paid))
  const total = chosen.reduce((a, x) => a + x.amount, 0)
  const paidChosen = chosen.filter((x) => x.paid).length
  const unsynced = chosen.filter((x) => x.e.bankOk === false); const unsyncedAll = all.filter((x) => x.e.bankOk === false)
  const setupOk = f.remun && f.jadwal && f.deskripsi.trim()
  const label = remun ? `${br(remun.branch)} - ${remun.bulan}` : ''
  const toReview = () => { const m = {}; all.forEach((x) => { if (!x.paid && x.amount > 0) m[x.emp] = true }); setSel(m); setRemoved({}); setStep(1) }
  const toConfirm = () => { if (paidChosen) setAsk('paid'); else goConfirm() }
  const goConfirm = () => { setAsk(null); const k = [...new Set(chosen.map((x) => x.type))]; const act = s.virtualAccounts.filter((v) => v.aktif !== false); const m = k.length === 1 && act.find((v) => v.nama.includes(k[0])); setVaId(vaId || (m || act[0])?.id || ''); setStep(2) }
  const pay = () => {
    setAsk(null); setBusy(true)
    setTimeout(() => {
      const id = api.disburse({ branch: remun.branch, remun: remun.id, bulan: remun.bulan, tipe: f.tipe, jadwal: f.jadwal, h: jd?.h ?? 0, deskripsi: f.deskripsi.trim(), va: vaId, items: chosen.map((x) => ({ emp: x.emp, amount: x.amount, type: x.type })), total })
      setBusy(false); setDone({ id, total, n: chosen.length, sched: f.jadwal > todayISO() })
    }, 1200)
  }
  const allSel = list.length > 0 && list.every((x) => sel[x.emp])
  const steps = ['Setup', 'Review', 'Confirmation']
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button className="linkish" onClick={() => go('disbursement')}>Disbursement</button><span>›</span><span>Create Disbursement</span></nav>
      <Card>
        <div className="dsb-head">
          <h2 className="dsb-title">Create Disbursement</h2>
          <label className="fsel"><span>Branch</span><select value={branch} disabled={step > 0} onChange={(e) => { setBranch(e.target.value); setF({ ...f, remun: '' }) }}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        </div>
        <ol className="stepper dsb-steps">{steps.map((x, i) => <li key={x} className={i < step ? 'done' : i === step ? 'on' : ''}><span>{i < step ? <Icon name="check" size={14} /> : String(i + 1).padStart(2, '0')}</span>{x}</li>)}</ol>

        {step === 0 && <div className="dsb-body">
          <h3>Pengaturan Run Payroll</h3><p className="muted">Masukkan rincian periode penggajian saat ini.</p>
          <fieldset className="radio-row"><legend>Pilih tipe Payroll</legend>{['Payroll', 'THR'].map((x) => <label key={x} className="chk-l"><input type="radio" name="tipe" className="chk" checked={f.tipe === x} onChange={() => setF({ ...f, tipe: x })} />{x}</label>)}</fieldset>
          <Field label="Remunerasi" hint={remuns.length ? 'Hanya remunerasi yang sudah di-approve Superadmin.' : 'Belum ada remunerasi Approved untuk Branch ini.'}><select value={f.remun} onChange={(e) => setF({ ...f, remun: e.target.value })}><option value="">Pilih remunerasi</option>{remuns.map((r) => { const n = s.disbursements.filter((d) => d.remun === r.id && (d.tipe || 'Payroll') === f.tipe && LIVE.includes(d.status)).length; return <option key={r.id} value={r.id}>{br(r.branch)} - {r.bulan}{n ? ' (sudah dibayarkan/dijadwalkan)' : ''}</option> })}</select></Field>
          {remun && unsyncedAll.length > 0 && <div className="alert warn" role="status"><Icon name="bell" size={18} />{unsyncedAll.length} karyawan di remunerasi ini belum sinkron rekening bank: {unsyncedAll.map((x) => x.e.name).join(', ')}. Transfer ke mereka berisiko gagal.</div>}
          <Field label="Jadwal Pembayaran"><select value={f.jadwal} onChange={(e) => setF({ ...f, jadwal: e.target.value })}><option value="">Pilih waktu untuk melakukan Jadwal Pembayaran</option>{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></Field>
          <Field label="Deskripsi"><input placeholder="Masukkan Deskripsi" value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} /></Field>
          <div className="row-end"><Btn kind="ghost" onClick={() => go('disbursement')}>Cancel</Btn><Btn disabled={!setupOk} onClick={toReview}>Next</Btn></div>
        </div>}

        {step === 1 && <div className="dsb-body">
          <h3>Tinjauan data Disbursement</h3><p className="muted">Pastikan kembali data payroll dan jumlah karyawan sudah sesuai.</p>
          <div className="dsb-sum">
            <div><strong>Default ({tgl(f.jadwal)})</strong><small>Payment Schedule</small></div>
            <div><strong>{chosen.length} Employees</strong><small>Employee</small></div>
            <div><strong>{rupiah(total)}</strong><small>Total Disbursement</small></div>
          </div>
          {unsynced.length > 0 && <div className="alert warn unsync" role="status"><Icon name="bell" size={18} /><span><b>{unsynced.length} karyawan belum sinkron rekening bank</b> ({unsynced.map((x) => `${x.e.name} · ${x.e.bank || 'bank ?'}`).join(', ')}). Transfer ke rekening ini bisa gagal. Minta Branch menyinkronkan dulu, atau keluarkan dari disbursement ini.</span><Btn kind="ghost" onClick={() => { const r = { ...removed }; const m = { ...sel }; unsynced.forEach((x) => { r[x.emp] = true; m[x.emp] = false }); setRemoved(r); setSel(m) }}>Keluarkan {unsynced.length} karyawan</Btn></div>}
          <div className="filters">
            <label className="fsel"><span>Kategori karyawan</span><select value={kat} onChange={(e) => setKat(e.target.value)}><option value="">Semua kategori</option>{[...new Set(all.map((x) => x.type))].map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className="chk-l"><input type="checkbox" className="chk" checked={showPaid} onChange={(e) => setShowPaid(e.target.checked)} />Tunjukkan karyawan yang sudah pernah dibayarkan bulan ini</label>
            <label className="search"><Icon name="search" size={18} /><input placeholder="Cari..." value={q} onChange={(e) => setQ(e.target.value)} /></label>
          </div>
          {list.length === 0 ? <Empty text={all.some((x) => x.paid) && !showPaid ? 'Semua karyawan di remunerasi ini sudah dibayarkan bulan ini. Centang "Tunjukkan karyawan yang sudah pernah dibayarkan" untuk melihatnya.' : 'Tidak ada karyawan.'} /> : (
            <div className="tbl-wrap"><table className="tbl dsb-t">
              <thead><tr><th>No</th><th><input type="checkbox" className="chk" aria-label="Pilih semua" checked={allSel} onChange={(e) => { const m = { ...sel }; list.forEach((x) => { m[x.emp] = e.target.checked }); setSel(m) }} /></th><th>Employee</th><th>Employee ID</th><th>Kategori</th><th>Branch</th><th>Payment Schedule</th><th>Total</th><th>Action</th></tr></thead>
              <tbody>{list.map((x, i) => <tr key={x.emp} className={x.paid ? 'paid' : ''}>
                <td data-h="No">{i + 1}</td>
                <td data-h="Pilih"><input type="checkbox" className="chk" aria-label={'Pilih ' + x.e.name} checked={!!sel[x.emp]} onChange={(e) => setSel({ ...sel, [x.emp]: e.target.checked })} /></td>
                <td data-h="Employee"><div className="who"><Avatar name={x.e.name} size={28} /><div><span className="fw7">{x.e.name}</span>{x.paid && <div className="muted sm">Sudah dibayarkan/dijadwalkan {f.tipe} {remun.bulan}</div>}{x.e.bankOk === false && <div className="txt-warn sm">Rekening {x.e.bank} belum sinkron</div>}</div></div></td>
                <td data-h="Employee ID" className="mono">{empNo(x.e)}</td><td data-h="Kategori">{x.type}</td><td data-h="Branch">{br(x.e.branch)}</td>
                <td data-h="Payment Schedule">{jd ? `+${jd.h} Days - ${tglPanjang(f.jadwal)}` : ''}</td>
                <td data-h="Total" className="n">{rupiah(x.amount)}</td>
                <td data-h="Action"><button className="icon-btn rm" aria-label={'Keluarkan ' + x.e.name} onClick={() => { setRemoved({ ...removed, [x.emp]: true }); setSel({ ...sel, [x.emp]: false }) }}><Icon name="x" size={16} /></button></td>
              </tr>)}</tbody></table></div>)}
          {Object.keys(removed).some((k) => removed[k]) && <div className="chips mt">{all.filter((x) => removed[x.emp]).map((x) => <button key={x.emp} className="chip-btn" onClick={() => setRemoved({ ...removed, [x.emp]: false })}>↺ Kembalikan {x.e.name}</button>)}</div>}
          <div className="row-end"><Btn kind="ghost" onClick={() => setStep(0)}>Back</Btn><Btn disabled={!chosen.length} onClick={toConfirm}>Next</Btn></div>
        </div>}

        {step === 2 && <div className="dsb-body">
          <h3>Konfirmasi data Disbursement</h3><p className="muted">Pastikan kembali data payroll dan jumlah karyawan sebelum melakukan pembayaran.</p>
          <dl className="dl dsb-dl">
            <dt>Tipe Payroll</dt><dd>{f.tipe}</dd>
            <dt>Remunerasi</dt><dd>{label}</dd>
            <dt>Jadwal Pembayaran</dt><dd>{tglPanjang(f.jadwal)}</dd>
            <dt>Deskripsi</dt><dd>{f.deskripsi}</dd>
            <dt>Total Karyawan</dt><dd>{done ? done.n : chosen.length} Karyawan</dd>
            <dt>Total Disbursement</dt><dd>{rupiah(done ? done.total : total)}</dd>
          </dl>
          <h3 className="mt">Bank yang Digunakan</h3>
          <div className="va-list" role="radiogroup" aria-label="Bank yang digunakan">
            {s.virtualAccounts.filter((v) => v.aktif !== false).map((v) => <label key={v.id} className={'va-card' + (vaId === v.id ? ' on' : '')}>
              <input type="radio" name="va" checked={vaId === v.id} onChange={() => setVaId(v.id)} />
              <BankMark kode={v.bank} /><span className="va-txt"><strong>{v.nama}</strong><small>{bankOf(v.bank).nama}</small><small>{v.deskripsi}</small></span>
            </label>)}
          </div>
          <div className="row-end"><Btn kind="ghost" onClick={() => setStep(1)}>Back</Btn><Btn disabled={!vaId} onClick={() => setAsk('pay')}>Proceed for Payment</Btn></div>
        </div>}
      </Card>

      <Modal open={ask === 'paid'} title="Konfirmasi" onClose={() => setAsk(null)} footer={<><Btn kind="ghost" onClick={() => setAsk(null)}>Batal</Btn><Btn onClick={goConfirm}>Approve</Btn></>}>
        <div className="ask"><span className="ask-i">?</span><p>Ada <b>{paidChosen} orang</b> yang sudah <b>dibayarkan {f.tipe === 'THR' ? 'THR' : 'payroll'}-nya</b>. Anda yakin ingin melanjutkan?</p></div>
      </Modal>
      <Modal open={ask === 'pay'} title="Konfirmasi pembayaran" onClose={() => setAsk(null)} footer={<><Btn kind="ghost" onClick={() => setAsk(null)}>Batal</Btn><Btn onClick={pay}>Approve</Btn></>}>
        <div className="ask"><span className="ask-i">?</span><p>Pastikan data yang dimasukkan sudah <b>Akurat</b>. Anda tidak dapat <b>mengubah data</b> setelah menyetujui dokumen ini.</p><p className="muted sm">{chosen.length} karyawan · {rupiah(total)} · {s.virtualAccounts.find((v) => v.id === vaId)?.nama}</p>{unsynced.length > 0 && <p className="txt-warn sm">Perhatian: {unsynced.length} karyawan belum sinkron rekening bank ({unsynced.map((x) => x.e.name).join(', ')}).</p>}</div>
      </Modal>
      <Modal open={busy} title="Memproses pembayaran" onClose={() => {}}>
        <div className="ask"><span className="spin" aria-hidden="true" /><p>{f.jadwal > todayISO() ? `Menjadwalkan transfer ${rupiah(total)} untuk ${chosen.length} karyawan…` : `Mengirim ${rupiah(total)} ke ${chosen.length} rekening karyawan…`}</p></div>
      </Modal>
      <Modal open={!!done} title={done?.sched ? 'Disbursement dijadwalkan' : 'Pembayaran berhasil'} onClose={() => go('disbursement')} footer={<><Btn kind="ghost" onClick={() => go('disbursement')}>Kembali ke daftar</Btn><Btn icon="eye" onClick={() => go('disbursement/d-' + done.id)}>Lihat detail</Btn></>}>
        <div className="ask"><span className="ask-i ok"><Icon name={done?.sched ? 'calendar' : 'check'} size={26} /></span>{done?.sched
          ? <p><b>{rupiah(done?.total)}</b> untuk <b>{done?.n} karyawan</b> berstatus <b>Scheduled</b> dan akan ditransfer otomatis pada <b>{tglPanjang(f.jadwal)}</b>. Payslip terbit saat transfer selesai.</p>
          : <p><b>{rupiah(done?.total)}</b> sudah ditransfer ke <b>{done?.n} karyawan</b>. Status disbursement <b>Success</b> dan payslip sudah terbit untuk setiap karyawan.</p>}</div>
      </Modal>
    </>
  )
}

// ---------------- Detail ----------------
function DisbDetail({ id, go }) {
  const s = useStore(); const [t, toast] = useToast(); const [q, setQ] = useState('')
  const d = s.disbursements.find((x) => x.id === id)
  if (!d) return <Card><Empty text="Disbursement tidak ditemukan." /><div className="row-end"><Btn kind="ghost" onClick={() => go('disbursement')}>Kembali</Btn></div></Card>
  const br = (bid) => s.branches.find((b) => b.id === bid)?.name || '—'
  const v = s.virtualAccounts.find((x) => x.id === d.va) || {}
  const emp = (eid) => s.employees.find((e) => e.id === eid) || { name: '—' }
  const items = d.items.filter((x) => !q || emp(x.emp).name.toLowerCase().includes(q.toLowerCase()))
  const dl = () => {
    try {
      const H = (h) => ({ v: h, fill: '0A5950', color: 'FFFFFF', bold: true, align: 'center', wrap: true, border: true })
      const head = ['No', 'Employee', 'Employee ID', 'Kategori', 'Branch', 'Payment Schedule', 'Total', 'Status'].map(H)
      const rows = d.items.map((x, i) => [i + 1, emp(x.emp).name, empNo(emp(x.emp)), x.type || emp(x.emp).type, br(emp(x.emp).branch), { v: d.jadwal, fmt: 'date', align: 'center' }, { v: x.amount, fmt: 'num', bold: true, color: '0A5950' }, d.status].map((c) => (typeof c === 'object' ? { ...c, border: true } : { v: c, border: true })))
      exportXlsx({ sheets: [{ name: 'Disbursement ' + d.kode, rows: [head, ...rows], widths: [5, 24, 16, 12, 22, 14, 16, 12], freeze: 1, heights: { 0: 30 } }], file: `Disbursement_${d.kode}` })
      toast('Excel disbursement diunduh')
    } catch (e) { toast('Unduhan diblokir di pratinjau ini') }
  }
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button className="linkish" onClick={() => go('disbursement')}>Disbursement</button><span>›</span><span>{d.kode}</span></nav>
      <PageHead title={`Disbursement ${d.kode}`} sub={`${br(d.branch)} · ${d.bulan} · ${d.tipe === 'THR' ? 'THR' : 'Salary'}`}><div className="row-act"><Badge t={ST_T[d.status]}>{d.status}</Badge><Btn kind="ghost" icon="download" onClick={dl}>Download Excel</Btn></div></PageHead>
      <div className="dsb-sum wide">
        <div><strong>{hLabel(d)}</strong><small>Payment Schedule</small></div>
        <div><strong>{d.items.length} Employees</strong><small>Employee</small></div>
        <div><strong>{rupiah(d.total)}</strong><small>Total Disbursement</small></div>
      </div>
      <div className="dsb-grid">
        <Card title="Informasi"><dl className="dl dsb-dl">
          <dt>Tipe Payroll</dt><dd>{d.tipe}</dd><dt>Remunerasi</dt><dd>{br(d.branch)} - {d.bulan}</dd><dt>Jadwal Pembayaran</dt><dd>{tglPanjang(d.jadwal)}</dd>
          <dt>Transfer</dt><dd>{d.paidAt ? jam(d.paidAt) : d.status === 'Scheduled' ? `Menunggu jadwal · otomatis ditransfer ${tglPanjang(d.jadwal)}` : d.status}</dd><dt>Deskripsi</dt><dd>{d.deskripsi}</dd>{d.alasan && <><dt>Keterangan status</dt><dd>{d.alasan}</dd></>}<dt>Dibuat oleh</dt><dd>{d.createdBy} · {jam(d.createdAt)}</dd>
        </dl></Card>
        <Card title="Bank yang Digunakan"><div className="va-card on static"><BankMark kode={v.bank} /><span className="va-txt"><strong>{v.nama}</strong><small>{bankOf(v.bank).nama}</small><small>{v.deskripsi}</small></span></div></Card>
      </div>
      <Card title="Karyawan dibayarkan" action={<label className="search"><Icon name="search" size={18} /><input placeholder="Cari karyawan" value={q} onChange={(e) => setQ(e.target.value)} /></label>} pad={false}>
        <div className="tbl-wrap"><table className="tbl dsb-t">
          <thead><tr>{['No', 'Employee', 'Employee ID', 'Kategori', 'Branch', 'Payment Schedule', 'Total', 'Status'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{items.map((x, i) => <tr key={x.emp}><td data-h="No">{i + 1}</td><td data-h="Employee"><div className="who"><Avatar name={emp(x.emp).name} size={28} /><span className="fw7">{emp(x.emp).name}</span></div></td><td data-h="Employee ID" className="mono">{empNo(emp(x.emp))}</td><td data-h="Kategori">{x.type || emp(x.emp).type}</td><td data-h="Branch">{br(emp(x.emp).branch)}</td><td data-h="Payment Schedule">{hLabel(d)}</td><td data-h="Total" className="n fw8">{rupiah(x.amount)}</td><td data-h="Status"><Badge t={d.status === 'Success' ? 'ok' : 'warn'}>{d.status}</Badge></td></tr>)}</tbody>
        </table></div>
      </Card>
      {t}
    </>
  )
}

// ---------------- Daftar Virtual Account ----------------
const vaUsage = (s, id) => { const ds = s.disbursements.filter((d) => d.va === id); const ok = ds.filter((d) => d.status === 'Success'); return { n: ds.length, ok: ok.length, rp: ok.reduce((a, d) => a + d.total, 0), emp: new Set(ok.flatMap((d) => d.items.map((x) => x.emp))).size, last: ds.map((d) => d.jadwal).sort().pop() } }
function VAList({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const [va, setVa] = useState(false); const [q, setQ] = useState(''); const [fb, setFb] = useState('')
  const rows = s.virtualAccounts.filter((v) => (!fb || v.bank === fb) && (!q || [v.nama, v.nomor, v.deskripsi].join(' ').toLowerCase().includes(q.toLowerCase()))).map((v) => ({ ...v, u: vaUsage(s, v.id) }))
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button className="linkish" onClick={() => go('disbursement')}>Disbursement</button><span>›</span><span>Daftar Virtual Account</span></nav>
      <PageHead title="Daftar Virtual Account" sub="Rekening penampung dana payroll. VA nonaktif tidak bisa dipilih saat membuat disbursement."><div className="row-act"><Btn kind="ghost" icon="chart" onClick={() => go('disbursement/dashboard')}>Dashboard</Btn><Btn icon="plus" onClick={() => setVa(true)}>Create Virtual Account</Btn></div></PageHead>
      <div className="filters">
        <label className="fsel"><span>Bank</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua bank</option>{BANKS.map((b) => <option key={b.kode} value={b.kode}>{b.nama}</option>)}</select></label>
        <label className="search grow-s"><Icon name="search" size={18} /><input placeholder="Cari nama, nomor VA" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      <Card pad={false}><Table rows={rows} empty="Belum ada Virtual Account." cols={[
        { h: 'Virtual Account', r: (v) => <div className="who"><BankMark kode={v.bank} size="s" /><div><strong>{v.nama}</strong><div className="muted sm">{bankOf(v.bank).nama}</div></div></div> },
        { h: 'Nomor VA', r: (v) => <span className="mono nowrap">{v.nomor || '—'}</span> },
        { h: 'Deskripsi', r: (v) => <span className="sm">{v.deskripsi}</span> },
        { h: 'Dipakai', right: true, r: (v) => <div className="nowrap">{v.u.n} disbursement<div className="muted sm">{v.u.emp} karyawan</div></div> },
        { h: 'Total tersalurkan', right: true, r: (v) => <b className="nowrap">{rupiah(v.u.rp)}</b> },
        { h: 'Terakhir dipakai', r: (v) => v.u.last ? <span className="nowrap">{tgl(v.u.last)}</span> : <span className="muted">Belum pernah</span> },
        { h: 'Status', r: (v) => <Badge t={v.aktif === false ? 'neutral' : 'ok'}>{v.aktif === false ? 'Nonaktif' : 'Aktif'}</Badge> },
        { h: '', r: (v) => <Btn kind="ghost" onClick={() => { api.toggleVA(v.id); toast(v.aktif === false ? 'VA diaktifkan' : 'VA dinonaktifkan') }}>{v.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}</Btn> },
      ]} /></Card>
      <CreateVA open={va} onClose={() => setVa(false)} onDone={(n) => { setVa(false); toast(`Virtual Account "${n}" dibuat`) }} />
      {t}
    </>
  )
}

// ---------------- Dashboard Disbursement ----------------
const BLN_I = Object.fromEntries(BLN.map((b, i) => [b, i]))
function DisbDashboard({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const [y, setY] = useState('2026'); const [fb, setFb] = useState('')
  const br = (id) => s.branches.find((b) => b.id === id)?.name || '—'
  const emp = (id) => s.employees.find((e) => e.id === id) || { name: '—' }
  const ds = s.disbursements.filter((d) => d.jadwal.startsWith(y) && (!fb || d.branch === fb))
  const ok = ds.filter((d) => d.status === 'Success')
  // 1. Tanggal kirim
  const byDate = Object.values(ds.filter((d) => d.status !== 'Canceled').reduce((m, d) => { const k = d.jadwal; m[k] = m[k] || { tgl: k, n: 0, emp: 0, rp: 0, st: {} }; m[k].n++; m[k].emp += d.items.length; m[k].rp += d.total; m[k].st[d.status] = (m[k].st[d.status] || 0) + 1; return m }, {})).sort((a, b) => b.tgl.localeCompare(a.tgl))
  const perDay = Array.from({ length: 31 }, (_, i) => ({ l: String(i + 1), full: `Tanggal ${i + 1}`, v: ds.filter((d) => d.status !== 'Canceled' && Number(d.jadwal.slice(8)) === i + 1).length }))
  const topDays = perDay.filter((p) => p.v).sort((a, b) => b.v - a.v).slice(0, 3)
  // 2. Karyawan dikirim > 1x dalam bulan & tahun yang sama (bulan transfer)
  const tx = ds.filter((d) => d.status !== 'Canceled').flatMap((d) => d.items.map((x) => ({ ...x, d })))
  const grp = Object.values(tx.reduce((m, x) => { const k = x.emp + '|' + x.d.jadwal.slice(0, 7); (m[k] = m[k] || { emp: x.emp, bln: x.d.jadwal.slice(0, 7), list: [] }).list.push(x); return m }, {})).filter((g) => g.list.length > 1)
    .map((g) => { const live = g.list.filter((x) => LIVE.includes(x.d.status)); const pay = live.filter((x) => (x.d.tipe || 'Payroll') === 'Payroll'); const jenis = pay.length > 1 ? 'Payroll lebih dari 1x' : g.list.some((x) => x.d.status === 'Failed') ? 'Gagal lalu dikirim ulang' : live.some((x) => x.d.tipe === 'THR') ? 'Payroll + THR' : 'Lainnya'; return { ...g, jenis, rp: live.reduce((a, x) => a + x.amount, 0) } })
    .sort((a, b) => (a.jenis === 'Payroll lebih dari 1x' ? -1 : 0) - (b.jenis === 'Payroll lebih dari 1x' ? -1 : 0) || b.bln.localeCompare(a.bln))
  const JT = { 'Payroll lebih dari 1x': 'bad', 'Gagal lalu dikirim ulang': 'warn', 'Payroll + THR': 'neutral', Lainnya: 'neutral' }
  // 3. VA
  const vas = s.virtualAccounts.map((v) => { const d = ds.filter((x) => x.va === v.id); const o = d.filter((x) => x.status === 'Success'); return { v, n: d.length, ok: o.length, rp: o.reduce((a, x) => a + x.total, 0), emp: o.reduce((a, x) => a + x.items.length, 0) } }).sort((a, b) => b.rp - a.rp)
  const totRp = ok.reduce((a, d) => a + d.total, 0)
  // 4. Status
  const stat = DSB_STATUS.map((st) => { const d = ds.filter((x) => x.status === st); return { st, n: d.length, emp: d.reduce((a, x) => a + x.items.length, 0), rp: d.reduce((a, x) => a + x.total, 0) } })
  const SC = { Success: '#2f8f4e', Scheduled: '#2a78d6', 'Waiting for Transfer': '#eda100', 'Disbursement Process': '#6250d6', Failed: '#c0452a', Canceled: '#8f9893' }
  // 5. Rekening belum sinkron
  const uns = s.employees.filter((e) => e.bankOk === false && (!fb || e.branch === fb) && e.status !== 'Resign')
  const pending = (e) => s.disbursements.filter((d) => ['Scheduled', 'Waiting for Transfer'].includes(d.status) && d.items.some((x) => x.emp === e.id))
  const blnLabel = (k) => `${BLN[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`
  const xls = () => { try { exportXlsx({ sheets: [
    { name: 'Tanggal kirim', rows: [['Tanggal', 'Disbursement', 'Karyawan', 'Total'], ...byDate.map((r) => [r.tgl, r.n, r.emp, r.rp])] },
    { name: 'Dikirim lebih 1x', rows: [['Karyawan', 'Bulan transfer', 'Jenis', 'Rincian'], ...grp.map((g) => [emp(g.emp).name, blnLabel(g.bln), g.jenis, g.list.map((x) => `${x.d.tipe} ${x.d.bulan} ${x.d.jadwal} ${x.amount} ${x.d.status}`).join(' | ')])] },
    { name: 'Virtual Account', rows: [['VA', 'Bank', 'Transaksi', 'Berhasil', 'Karyawan', 'Total tersalurkan'], ...vas.map((r) => [r.v.nama, r.v.bank, r.n, r.ok, r.emp, r.rp])] },
    { name: 'Status', rows: [['Status', 'Transaksi', 'Karyawan', 'Nominal'], ...stat.map((r) => [r.st, r.n, r.emp, r.rp])] },
    { name: 'Rekening belum sinkron', rows: [['Karyawan', 'Branch', 'Bank'], ...uns.map((e) => [e.name, br(e.branch), e.bank])] },
  ].map((x) => ({ ...x, freeze: 1 })), file: `Dashboard-disbursement-${y}` }); toast('Excel diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button className="linkish" onClick={() => go('disbursement')}>Disbursement</button><span>›</span><span>Dashboard</span></nav>
      <PageHead title="Dashboard Disbursement" sub="Ringkasan pengiriman payroll: tanggal kirim, kiriman ganda, pemakaian Virtual Account, status transaksi, dan rekening karyawan."><div className="row-act"><Btn kind="ghost" icon="wallet" onClick={() => go('disbursement/va')}>Daftar VA</Btn><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn></div></PageHead>
      <div className="filters">
        <label className="fsel"><span>Tahun</span><select value={y} onChange={(e) => setY(e.target.value)}>{['2026', '2025'].map((v) => <option key={v}>{v}</option>)}</select></label>
        <label className="fsel"><span>Branch</span><select value={fb} onChange={(e) => setFb(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      {uns.length > 0 && <div className="alert warn" role="status"><Icon name="bell" size={18} />{uns.length} karyawan belum sinkron rekening bank. Mereka juga ditandai saat membuat disbursement.</div>}
      <div className="stats">
        <Stat icon="wallet" label="Tersalurkan" value={rupiah(totRp)} hint={`${ok.length} disbursement berhasil`} />
        <Stat icon="send" label="Transaksi" value={ds.length} hint={`${tx.length} transfer ke karyawan`} />
        <Stat icon="users" label="Dikirim > 1x sebulan" value={new Set(grp.map((g) => g.emp)).size} hint={`${grp.filter((g) => g.jenis === 'Payroll lebih dari 1x').length} kasus payroll ganda`} />
        <Stat icon="lock" label="Rekening belum sinkron" value={uns.length} hint="karyawan aktif" />
      </div>
      <div className="dgrid two">
        <Card title="Payroll dikirim per tanggal" action={<span className="muted sm">jumlah disbursement per tanggal bulan</span>}>
          <Columns label="Jumlah disbursement per tanggal" points={perDay} height={180} />
          <p className="muted sm mt">Paling sering: {topDays.map((p) => `tanggal ${p.l} (${p.v}×)`).join(', ') || '—'}.</p>
        </Card>
        <Card title="Status transaksi" action={<span className="muted sm">{ds.length} disbursement</span>}>
          <SegBar label="Jumlah disbursement per status" parts={stat.filter((x) => x.n).map((x) => ({ l: x.st, v: x.n, c: SC[x.st] }))} />
        </Card>
      </div>
      <div className="dgrid two">
        <Card title="Virtual Account paling sering dipakai" action={<span className="muted sm">total tersalurkan (Rp juta)</span>}>
          <HBars label="Total rupiah per Virtual Account (juta)" rows={vas.filter((r) => r.rp).map((r) => ({ l: r.v.nama.replace(/^Kantor Cabang:\s*(Karyawan\s*)?/, 'VA '), v: Math.round(r.rp / 1e6) }))} />
          <p className="muted sm mt">Dalam juta rupiah, dari disbursement berstatus Success.</p>
        </Card>
        <Card title="Rincian status" pad={false}><Table rows={stat} cols={[
          { h: 'Status', r: (r) => <Badge t={ST_T[r.st]}>{r.st}</Badge> }, { h: 'Transaksi', right: true, k: 'n' }, { h: 'Karyawan', right: true, k: 'emp' }, { h: 'Nominal', right: true, r: (r) => <span className="nowrap">{rupiah(r.rp)}</span> },
        ]} /></Card>
      </div>
      <Card title={`Tanggal pengiriman payroll ${y}`} pad={false}><Table rows={byDate} empty="Belum ada pengiriman." cols={[
        { h: 'Tanggal transfer', r: (r) => <strong className="nowrap">{tglPanjang(r.tgl)}</strong> }, { h: 'Disbursement', right: true, k: 'n' }, { h: 'Karyawan', right: true, k: 'emp' },
        { h: 'Total', right: true, r: (r) => <span className="nowrap">{rupiah(r.rp)}</span> },
        { h: 'Status', r: (r) => <div className="chips">{Object.entries(r.st).map(([k, v]) => <Badge key={k} t={ST_T[k]}>{k}{v > 1 ? ` ×${v}` : ''}</Badge>)}</div> },
      ]} /></Card>
      <Card title={<span>Karyawan dikirim lebih dari 1x di bulan yang sama <span className="muted sm">· {grp.length} kasus</span></span>} pad={false}><Table rows={grp} empty="Tidak ada karyawan yang dikirim lebih dari sekali dalam sebulan." cols={[
        { h: 'Karyawan', r: (g) => <div className="who"><Avatar name={emp(g.emp).name} size={28} /><div><strong>{emp(g.emp).name}</strong><div className="muted sm">{br(emp(g.emp).branch)}</div></div></div> },
        { h: 'Bulan transfer', r: (g) => <span className="nowrap">{blnLabel(g.bln)}</span> },
        { h: 'Jenis', r: (g) => <Badge t={JT[g.jenis]}>{g.jenis}</Badge> },
        { h: 'Rincian kiriman', r: (g) => <ul className="dd-l">{g.list.map((x, i) => <li key={i}><button className="linkish" onClick={() => go('disbursement/d-' + x.d.id)}>{x.d.kode}</button> · {x.d.tipe} {x.d.bulan} · {tgl(x.d.jadwal)} · <b>{rupiah(x.amount)}</b> <Badge t={ST_T[x.d.status]}>{x.d.status}</Badge></li>)}</ul> },
        { h: 'Total diterima', right: true, r: (g) => <b className="nowrap">{rupiah(g.rp)}</b> },
      ]} /></Card>
      <Card title="Pemakaian Virtual Account" pad={false}><Table rows={vas} cols={[
        { h: 'Virtual Account', r: (r) => <div className="who"><BankMark kode={r.v.bank} size="s" /><div><strong>{r.v.nama}</strong><div className="muted sm mono">{r.v.nomor}</div></div></div> },
        { h: 'Transaksi', right: true, r: (r) => `${r.n}${r.n !== r.ok ? ` (${r.ok} berhasil)` : ''}` }, { h: 'Transfer karyawan', right: true, k: 'emp' },
        { h: 'Total tersalurkan', right: true, r: (r) => <b className="nowrap">{rupiah(r.rp)}</b> }, { h: 'Porsi', right: true, r: (r) => `${totRp ? Math.round((r.rp / totRp) * 100) : 0}%` },
      ]} /></Card>
      <Card title={<span>Rekening bank belum sinkron <span className="muted sm">· {uns.length} karyawan</span></span>} pad={false}>
        {uns.length ? <Table rows={uns} cols={[
          { h: 'Karyawan', r: (e) => <div className="who"><Avatar name={e.name} size={28} /><div><strong>{e.name}</strong><div className="muted sm">{e.role} · {e.type}</div></div></div> },
          { h: 'Branch', r: (e) => br(e.branch) }, { h: 'Bank', r: (e) => e.bank || '—' },
          { h: 'Disbursement mendatang', r: (e) => pending(e).length ? pending(e).map((d) => <div key={d.id} className="txt-warn sm">{d.bulan} · {tgl(d.jadwal)} ({d.status})</div>) : <span className="muted">—</span> },
          { h: '', r: (e) => <Btn kind="ghost" icon="send" onClick={() => { api.remindBankSync(e.branch, 1); toast(`Pengingat sinkronisasi dikirim ke ${br(e.branch)}`) }}>Ingatkan Branch</Btn> },
        ]} /> : <Empty text="Semua rekening karyawan sudah sinkron." />}
      </Card>
      <Note>Data contoh berisi beberapa status (gagal, menunggu dana, dibatalkan) untuk simulasi. Saat ini payment gateway belum terhubung, sehingga disbursement baru selalu berhasil sesuai jadwal.</Note>
      {t}
    </>
  )
}
