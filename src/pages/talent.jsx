import React, { useEffect, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { rupiah, calcRow } from '../services/payroll.js'
import { Btn, Card, Badge, Stat, Table, Tabs, Modal, Field, useToast, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { aktifCuti, useLookup, fmtDate, ApprovalLine } from './shared.jsx'

const ME = 'e5'
const useNow = () => { const [n, setN] = useState(new Date()); useEffect(() => { const t = setInterval(() => setN(new Date()), 1000); return () => clearInterval(t) }, []); return n }

export function Beranda({ go }) {
  const s = useStore(); const now = useNow(); const [t, toast] = useToast(); const [cam, setCam] = useState(null)
  const holiday = s.holidays.some((h) => h.tanggal === now.toISOString().slice(0, 10)) || now.getDay() === 0 || now.getDay() === 6
  const used = s.leaves.filter((l) => l.emp === ME && l.status === 'Approved' && l.jenis === 'Cuti Tahunan').reduce((a, b) => a + b.hari, 0)
  const quick = [['absensi', 'Absensi', 'clock'], ['cuti', 'Cuti', 'calendar'], ['lembur', 'Lembur', 'star'], ['reimbursement', 'Reimburse', 'receipt'], ['payslip', 'Payslip', 'wallet'], ['kontrak', 'Kontrak', 'doc'], ['inventaris', 'Inventaris', 'box'], ['resign', 'Resign', 'door']]
  return (
    <>
      <div className="hello"><div><h1>Hi, Putri!</h1><p className="muted"><Icon name="pin" size={14} /> Kantor Jakarta · Shift 1 (08:30–17:59)</p></div></div>
      <section className="clock-card">
        <div><div className="clock-t">{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}<small> WIB</small></div><div className="clock-d">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="clock-s">{s.clock.in ? <>Masuk <b>{s.clock.in}</b>{s.clock.out && <> · Pulang <b>{s.clock.out}</b></>}</> : holiday ? 'Hari libur — bebas absen 🎉' : 'Belum absen hari ini'}</div></div>
        {holiday && !s.clock.in ? <span className="clock-btn off" aria-disabled="true"><Icon name="calendar" size={28} /></span>
          : !s.clock.out && <button className="clock-btn" onClick={() => setCam(s.clock.in ? 'out' : 'in')} aria-label={s.clock.in ? 'Clock out' : 'Clock in'}><Icon name="camera" size={28} /><span>{s.clock.in ? 'Clock out' : 'Clock in'}</span></button>}
      </section>
      <div className="quick">{quick.map(([k, l, ic]) => <button key={k} onClick={() => go(k)}><span><Icon name={ic} /></span>{l}</button>)}</div>
      <div className="grid2">
        <Card title="Saldo cuti"><div className="ring-row">{aktifCuti(s, ME).slice(0, 3).map((lt) => { const u = lt.name === 'Cuti Tahunan' ? used : 0; return <div key={lt.name} className="ring" style={{ '--p': (1 - u / lt.kuota) * 100 }}><b>{lt.kuota - u}</b><small>{lt.name.replace('Cuti ', '')}</small></div> })}</div></Card>
        <Card title="Pengumuman">{s.blasts.slice(0, 3).map((b) => <div key={b.judul} className="ann"><Icon name="megaphone" /><div><strong>{b.judul}</strong><small>{fmtDate(b.tanggal)}</small></div></div>)}</Card>
      </div>
      <Modal open={!!cam} title={cam === 'in' ? 'Clock in' : 'Clock out'} onClose={() => setCam(null)} footer={<Btn onClick={() => { api.clock(cam); setCam(null); toast(cam === 'in' ? 'Selamat bekerja! 💪' : 'Kerja bagus, terima kasih untuk hari ini!') }}>Konfirmasi {cam === 'in' ? 'masuk' : 'pulang'}</Btn>}>
        <div className="selfie"><Icon name="camera" size={40} /><p>Ambil selfie</p><input type="file" accept="image/*" capture="user" aria-label="Ambil selfie" /></div>
        <dl className="dl"><dt>Lokasi</dt><dd>Kantor Jakarta (dalam radius 100 m)</dd><dt>Batas clock in</dt><dd>08:30–09:00</dd><dt>Status</dt><dd>{cam === 'in' && new Date().toTimeString().slice(0, 5) > '09:00' ? <Badge t="bad">Terlambat</Badge> : <Badge t="ok">Tepat waktu</Badge>}</dd></dl>
      </Modal>{t}
    </>
  )
}

export function AbsensiT() {
  const s = useStore()
  return <><PageHead title="Attendance log" sub="Riwayat absen dari web & app." /><Card pad={false}><Table rows={s.attendance.filter((a) => a.emp === ME)} cols={[{ h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Masuk', k: 'masuk' }, { h: 'Pulang', k: 'pulang' }, { h: 'Lokasi', k: 'lokasi' }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} /></Card></>
}

function RequestPage({ title, sub, col, modul, cols, form, validate, summary }) {
  const s = useStore(); const [t, toast] = useToast(); const [open, setOpen] = useState(false); const [tab, setTab] = useState('All'); const [detail, setDetail] = useState(null); const [err, setErr] = useState('')
  const [f, setF] = useState(form.init)
  const rows = s[col].filter((x) => x.emp === ME && (tab === 'All' || x.status === tab))
  return (
    <>
      <PageHead title={title} sub={sub}><Btn icon="plus" onClick={() => { setOpen(true); setErr(''); setF(form.init) }}>Ajukan</Btn></PageHead>
      {summary}
      <Tabs tabs={['All', 'Approved', 'Waiting', 'Rejected']} value={tab} onChange={setTab} />
      <Card pad={false}><Table rows={rows} onRow={setDetail} empty="Belum ada pengajuan." cols={[...cols, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} /></Card>
      <Modal open={open} title={'Ajukan ' + title.toLowerCase()} onClose={() => setOpen(false)} footer={<Btn disabled={!f.agree} onClick={() => { const e = validate ? validate(f, s) : ''; if (e) return setErr(e); api.request(col, { emp: ME, ...form.map(f) }, modul); setOpen(false); toast('Pengajuan terkirim — menunggu approval') }}>Submit</Btn>}>
        <div className="form">{form.render(f, setF, s)}
          <label className="chk-l"><input type="checkbox" className="chk" checked={!!f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />Saya menyetujui aturan & kebijakan yang berlaku</label>
          {err && <div className="err" role="alert"><Icon name="x" size={16} /><div><b>Maaf ya!</b><p>{err}</p></div></div>}
        </div>
      </Modal>
      <Modal open={!!detail} title={title + ' · detail'} onClose={() => setDetail(null)}>{detail && <><dl className="dl">{cols.map((c) => <React.Fragment key={c.h}><dt>{c.h}</dt><dd>{c.r ? c.r(detail) : detail[c.k]}</dd></React.Fragment>)}</dl><h4 className="mt">Approval line</h4><ApprovalLine line={detail.line || [{ by: 'HR', status: detail.status }]} /></>}</Modal>
      {t}
    </>
  )
}

const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1
export function CutiT() {
  const s = useStore()
  const usedOf = (n) => s.leaves.filter((l) => l.emp === ME && l.jenis === n && l.status !== 'Rejected').reduce((a, b) => a + b.hari, 0)
  return <RequestPage title="Cuti" sub="Tanpa cuti setengah hari. Kalender menandai libur & blackout dates." col="leaves" modul="Cuti"
    summary={<div className="stats">{aktifCuti(s, ME).filter((lt) => !lt.tanpaKuota && (lt.kelompok || 'Cuti') === 'Cuti').map((lt) => <Stat key={lt.name} label={lt.name} value={`${lt.kuota - usedOf(lt.name)}/${lt.kuota}`} hint="sisa hari" />)}</div>}
    cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Tanggal', r: (r) => fmtDate(r.dari) + (r.sampai !== r.dari ? ' – ' + fmtDate(r.sampai) : '') }, { h: 'Hari', k: 'hari' }, { h: 'Alasan', k: 'alasan' }]}
    form={{ init: { jenis: 'Cuti Tahunan', dari: '2026-11-26', sampai: '2026-11-27', alasan: '' }, map: (f) => ({ jenis: f.jenis, dari: f.dari, sampai: f.sampai, hari: days(f.dari, f.sampai), alasan: f.alasan }),
      render: (f, setF, st) => <>
        <Field label="Jenis cuti / izin" hint={(() => { const lt = aktifCuti(st, ME).find((l) => l.name === f.jenis); return lt?.bukti ? `Wajib lampirkan: ${lt.bukti}` : '' })()}><select value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}>{['Cuti', 'Izin'].map((g) => <optgroup key={g} label={g}>{aktifCuti(st, ME).filter((l) => (l.kelompok || 'Cuti') === g).map((l) => <option key={l.name}>{l.name}</option>)}</optgroup>)}</select></Field>
        <div className="form two"><Field label="Dari"><input type="date" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })} /></Field><Field label="Sampai"><input type="date" value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} /></Field></div>
        <div className="mini-cal">{[...st.holidays, ...st.blackout.map((b) => ({ tanggal: b.dari + ' – ' + b.sampai, nama: b.nama + ' (blackout)' }))].map((h) => <div key={h.tanggal}><b>{h.tanggal.includes('–') ? h.tanggal.split(' – ').map(fmtDate).join(' – ') : fmtDate(h.tanggal)}</b><span>{h.nama}</span></div>)}</div>
        <Field label="Alasan"><textarea rows={2} value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} /></Field>
        <Field label="Lampiran (opsional)"><input type="file" /></Field></> }}
    validate={(f, st) => {
      if (f.sampai < f.dari) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
      if (st.blackout.some((b) => !(f.sampai < b.dari || f.dari > b.sampai))) return 'Tanggal yang kamu pilih masuk periode blackout days perusahaan. Pilih tanggal lain ya.'
      if (st.holidays.some((h) => h.tanggal >= f.dari && h.tanggal <= f.sampai)) return 'Ada hari libur nasional di rentang itu — tidak perlu ambil cuti di hari libur.'
      const lt = aktifCuti(st, ME).find((l) => l.name === f.jenis); if (!lt.tanpaKuota && usedOf(f.jenis) + days(f.dari, f.sampai) > lt.kuota) return 'Kuota cutimu tidak cukup untuk rentang tanggal ini.'
      if (f.sampai > st.employees.find((e) => e.id === ME).end) return 'Cuti tidak boleh melewati tanggal akhir kontrak.'
      return ''
    }} />
}

export function LemburT() {
  const s = useStore()
  const total = s.overtimes.filter((o) => o.emp === ME && o.status === 'Approved').reduce((a, b) => a + b.durasi, 0)
  return <RequestPage title="Lembur" sub="Lembur yang disetujui otomatis masuk remunerasi bulan berjalan." col="overtimes" modul="Lembur"
    summary={<div className="stats"><Stat icon="star" label="Lembur bulan ini" value={total + ' jam'} /></div>}
    cols={[{ h: 'Kegiatan', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Jam', k: 'jam' }, { h: 'Durasi', r: (r) => r.durasi + ' jam' }, { h: 'Tipe', k: 'tipe' }]}
    form={{ init: { tipe: 'Lembur Hari Kerja', tanggal: '2026-11-12', mulai: '18:00', selesai: '21:00', judul: '' }, map: (f) => ({ tipe: f.tipe, tanggal: f.tanggal, jam: f.mulai + '–' + f.selesai, durasi: Math.max(0, (Number(f.selesai.slice(0, 2)) * 60 + Number(f.selesai.slice(3)) - Number(f.mulai.slice(0, 2)) * 60 - Number(f.mulai.slice(3))) / 60), judul: f.judul || 'Lembur' }),
      render: (f, setF, st) => <>
        <Field label="Tipe lembur"><select value={f.tipe} onChange={(e) => setF({ ...f, tipe: e.target.value })}>{st.overtimeTypes.map((o) => <option key={o.name}>{o.name}</option>)}</select></Field>
        <Field label="Tanggal"><input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field>
        <div className="form two"><Field label="Mulai"><input type="time" value={f.mulai} onChange={(e) => setF({ ...f, mulai: e.target.value })} /></Field><Field label="Selesai"><input type="time" value={f.selesai} onChange={(e) => setF({ ...f, selesai: e.target.value })} /></Field></div>
        <Field label="Deskripsi"><input value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} placeholder="Contoh: Rilis aplikasi" /></Field></> }}
    validate={(f) => (f.selesai <= f.mulai ? 'Jam selesai harus setelah jam mulai.' : '')} />
}

export function ReimburseT() {
  const s = useStore()
  const used = (n) => s.reimbursements.filter((r) => r.emp === ME && r.jenis === n && r.status !== 'Rejected').reduce((a, b) => a + b.nominal, 0)
  return <RequestPage title="Reimbursement" sub="Limit per tahun. Dibayar bersama gaji setelah disetujui." col="reimbursements" modul="Reimbursement"
    summary={<div className="stats">{s.reimburseTypes.map((r) => <Stat key={r.name} label={r.name} value={rupiah(r.limit - used(r.name))} hint={'sisa dari ' + rupiah(r.limit)} />)}</div>}
    cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Judul', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Nominal', right: true, r: (r) => rupiah(r.nominal) }]}
    form={{ init: { jenis: 'Kesehatan', judul: '', tanggal: '2026-11-12', nominal: '' }, map: (f) => ({ jenis: f.jenis, judul: f.judul || f.jenis, tanggal: f.tanggal, nominal: Number(f.nominal) }),
      render: (f, setF, st) => <>
        <Field label="Jenis klaim"><select value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}>{st.reimburseTypes.map((o) => <option key={o.name}>{o.name}</option>)}</select></Field>
        <Field label="Judul"><input value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} /></Field>
        <div className="form two"><Field label="Tanggal"><input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field><Field label="Nominal (Rp)"><input type="number" value={f.nominal} onChange={(e) => setF({ ...f, nominal: e.target.value })} /></Field></div>
        <Field label="Bukti (wajib)"><input type="file" multiple /></Field></> }}
    validate={(f, st) => { const lim = st.reimburseTypes.find((r) => r.name === f.jenis).limit; if (!Number(f.nominal)) return 'Isi nominal klaim dulu.'; if (used(f.jenis) + Number(f.nominal) > lim) return 'Nominal melebihi sisa limit tahun ini.'; return '' }} />
}

export function PayslipT() {
  const s = useStore(); const [ok, setOk] = useState(false); const [pw, setPw] = useState(''); const [open, setOpen] = useState(null)
  const me = s.employees.find((e) => e.id === ME)
  if (!ok) return (<><PageHead title="Payslip" /><Card><form className="form narrow" onSubmit={(e) => { e.preventDefault(); if (pw) setOk(true) }}><div className="center"><Icon name="lock" size={36} /><p>Masukkan password login untuk membuka payslip.</p></div><Field label="Password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field><Btn disabled={!pw}>Buka payslip</Btn></form></Card></>)
  const c = calcRow({ thp: me.thp, skema: me.skema, additions: [], deductions: [] }, s.setup)
  return (
    <>
      <PageHead title="Payslip" sub="Terbit setelah gaji selesai ditransfer." />
      <Card pad={false}><Table rows={s.payslips.filter((p) => p.emp === ME)} onRow={setOpen} cols={[{ h: 'Periode', k: 'bulan' }, { h: 'Net dibayar', right: true, r: (r) => rupiah(r.thp) }, { h: '', r: () => <Btn kind="ghost" icon="eye">Detail</Btn> }]} /></Card>
      <Modal open={!!open} title={'Payslip · ' + open?.bulan} onClose={() => setOpen(null)} footer={<Btn kind="ghost" icon="download">Unduh PDF</Btn>}>
        <div className="slip"><h4>Pendapatan</h4>{[['Gaji Pokok', c.gp], ['Tunjangan Posisi', c.tp]].map(([k, v]) => <div key={k}><span>{k}</span><b>{rupiah(v)}</b></div>)}
          <h4>Potongan</h4>{[['BPJS Kesehatan (1%)', c.emp.kes], ['JHT (2%)', c.emp.jht], ['JP (1%)', c.emp.jp]].map(([k, v]) => <div key={k}><span>{k}</span><b>− {rupiah(v)}</b></div>)}
          <div className="slip-total"><span>Take home pay</span><b>{rupiah(c.net)}</b></div>
          <h4>Ditanggung perusahaan</h4>{[['PPh21 (TER ' + c.rate + '%)', c.pajak], ['JKK + JKM', c.comp.jkk + c.comp.jkm], ['JHT + JP perusahaan', c.comp.jht + c.comp.jp], ['BPJS Kesehatan perusahaan', c.comp.kes]].map(([k, v]) => <div key={k}><span>{k}</span><b>{rupiah(v)}</b></div>)}</div>
      </Modal>
    </>
  )
}

export function LowonganT() {
  const s = useStore(); const { job, pool } = useLookup(); const [t, toast] = useToast()
  return (
    <>
      <PageHead title="Lowongan & Tawaran" sub="Tawaran dari talent pool: kamu yang memutuskan lanjut atau tidak." />
      <Card title="Tawaran untukmu">
        {s.offers.length === 0 && <Empty text="Belum ada tawaran." />}
        {s.offers.map((o) => <div key={o.id} className="offer"><div className="grow"><strong>{job(o.job).posisi}</strong><div className="muted sm">{job(o.job).gaji} · {job(o.job).lokasi} · untuk {pool(o.talent).name}</div><div className="muted sm">Jawab sebelum {fmtDate(o.batas)}</div></div>
          {o.status === 'Menunggu jawaban' ? <div className="row-act"><Btn kind="ghost" onClick={() => { api.answerOffer(o.id, false); toast('Tawaran ditolak') }}>Tolak</Btn><Btn onClick={() => { api.answerOffer(o.id, true); toast('Kamu masuk seleksi tahap 1!') }}>Lanjut seleksi</Btn></div> : <Badge>{o.status}</Badge>}</div>)}
        <Note>Demo: tawaran ditampilkan untuk talent pool (contoh akun di kolom "untuk").</Note>
      </Card>
      <Card title="Lowongan terbuka" pad={false}><Table rows={s.jobs.filter((j) => j.status === 'Active')} cols={[{ h: 'Posisi', r: (r) => <div><strong>{r.posisi}</strong><div className="muted sm">{r.jenis} · {r.lokasi}</div></div> }, { h: 'Gaji', k: 'gaji' }, { h: '', r: () => <Btn kind="ghost" onClick={() => toast('Lamaran terkirim — kerjakan pre-test ya')}>Lamar</Btn> }]} /></Card>{t}
    </>
  )
}

export function JadwalT() {
  const [t, toast] = useToast(); const [slot, setSlot] = useState(''); const [sent, setSent] = useState(false)
  const slots = ['Sen, 16 Nov · 10:00', 'Sen, 16 Nov · 14:00', 'Rab, 18 Nov · 09:00', 'Kam, 19 Nov · 13:00']
  return (
    <><PageHead title="Jadwal Wawancara" sub="Pilih slot yang disediakan Branch. Branch yang konfirmasi & mengisi link meeting." />
      <Card title="Backend Engineer · Branch Jakarta Digital">
        <div className="slots">{slots.map((x) => <button key={x} className={slot === x ? 'on' : ''} onClick={() => setSlot(x)} disabled={sent}>{x}</button>)}</div>
        {sent ? <Note>Request terkirim untuk <b>{slot}</b> — menunggu konfirmasi Branch. Link meeting akan muncul di sini.</Note> : <Btn disabled={!slot} onClick={() => { setSent(true); toast('Request jadwal terkirim') }}>Request jadwal</Btn>}
      </Card>{t}</>
  )
}

export function PretestT() {
  const [run, setRun] = useState(null); const [done, setDone] = useState([]); const [t, toast] = useToast()
  const mods = [['Interview Dasar', 'Live recording · 5 soal', '25:00'], ['Tes Potensi Akademik', 'Pilihan ganda · 20 soal', '30:00'], ['Tes Excel', 'Upload dokumen · 3 soal', '20:00']]
  return (
    <><PageHead title="Pre-test" sub="Pastikan koneksi internet stabil sebelum mulai." />
      <div className="mods">{mods.map(([n, d, w]) => <Card key={n}><div className="batch-row"><Icon name="test" /><div className="grow"><strong>{n}</strong><div className="muted sm">{d} · {w}</div></div>{done.includes(n) ? <Badge t="ok">Selesai</Badge> : <Btn onClick={() => setRun(n)}>Mulai</Btn>}</div></Card>)}</div>
      <Modal open={!!run} title={run} onClose={() => setRun(null)} footer={<Btn onClick={() => { setDone([...done, run]); setRun(null); toast('Jawaban tersimpan') }}>Selesai</Btn>}>
        <div className="timer">Sisa waktu 24:59</div><p><b>Soal 1.</b> Ceritakan singkat tentang dirimu dan pengalaman kerja terakhirmu.</p>
        <div className="drop"><Icon name="upload" size={26} /><p>Unggah rekaman / jawaban</p><input type="file" aria-label="Unggah jawaban" /></div>
      </Modal>{t}</>
  )
}

export function KontrakT() {
  const s = useStore(); const [t, toast] = useToast(); const [agree, setAgree] = useState(null); const [chk, setChk] = useState(false)
  const mine = s.docBatches.flatMap((b) => b.items.filter((i) => i.emp === ME && i.status !== 'None').map((i) => ({ ...i, batch: b.id, bulan: b.bulan })))
  return (
    <><PageHead title="Kontrak" sub="Dokumen dari HR. Unduh, tanda tangani, lalu unggah kembali." />
      {mine.length === 0 ? <Empty text="Belum ada dokumen." /> : mine.map((d) => <Card key={d.batch}><div className="batch-row"><Icon name="doc" /><div className="grow"><strong>{d.dokumen}</strong><div className="muted sm">{d.jenis} · {d.bulan}</div></div><Badge>{d.status}</Badge>
        {d.status === 'Sent' && <Btn onClick={() => { if (!d.agreed) { setAgree(d); setChk(false) } }}>Tanda tangani</Btn>}</div></Card>)}
      <Modal open={!!agree} title="Pernyataan sebelum tanda tangan" onClose={() => setAgree(null)} footer={<Btn disabled={!chk} onClick={() => { api.signDoc(agree.batch, ME); setAgree(null); toast('Dokumen terkirim ke HR untuk ditandatangani') }}>Setuju & unggah</Btn>}>
        <p>Saya menyatakan bahwa dokumen yang akan saya isi sudah benar dan sesuai. Saya memahami, menyetujui, dan bersedia jika sewaktu-waktu diperlukan untuk dikonfirmasi terkait kesepakatan kerja yang telah disepakati di kemudian hari.</p>
        <div className="drop"><Icon name="upload" size={26} /><p>Unggah dokumen yang sudah ditandatangani</p><input type="file" accept=".pdf" aria-label="Unggah dokumen" /></div>
        <label className="chk-l"><input type="checkbox" className="chk" checked={chk} onChange={(e) => setChk(e.target.checked)} />Saya menyetujui pernyataan di atas</label>
      </Modal>{t}</>
  )
}

export function BiodataT() {
  const [t, toast] = useToast()
  const berkas = [['CV', true], ['Pas foto 4x6', true], ['KTP', true], ['Kartu Keluarga', true], ['NPWP', false], ['BPJS Kes & TK', false]]
  return (
    <><PageHead title="Biodata & Berkas" sub="Satu akun untuk melamar dan bekerja." />
      <div className="grid2">
        <Card title="Data diri"><form className="form two" onSubmit={(e) => { e.preventDefault(); toast('Biodata tersimpan') }}>
          {[['Nama lengkap', 'Putri Amalia'], ['Tempat, tanggal lahir', 'Bandung, 12 Mei 1998'], ['E-mail', 'putri.amalia@contoh.id'], ['No. HP', '0812xxxxxxx'], ['Status PTKP', 'TK/0'], ['NIK', '3273xxxxxxxxxxxx'], ['Bank', 'BCA'], ['No. rekening', 'xxxxxx1234']].map(([l, v]) => <Field key={l} label={l}><input defaultValue={v} /></Field>)}
          <Btn>Simpan</Btn></form></Card>
        <Card title="Berkas lampiran (maks 3MB)">{berkas.map(([n, ok]) => <div key={n} className="file-row"><Icon name="doc" /><span className="grow">{n}</span><Badge t={ok ? 'ok' : 'neutral'}>{ok ? 'Terunggah' : 'Belum'}</Badge><label className="icon-btn" aria-label={'Unggah ' + n}><Icon name="upload" /><input type="file" hidden onChange={() => toast(n + ' terunggah')} /></label></div>)}</Card>
      </div>{t}</>
  )
}

export function InventarisT() {
  const s = useStore(); const [t, toast] = useToast(); const [open, setOpen] = useState(null); const [chk, setChk] = useState(false)
  return (
    <><PageHead title="Inventaris" sub="Aset kantor yang kamu pegang." />
      <Card pad={false}><Table rows={s.inventories.filter((i) => i.emp === ME)} cols={[{ h: 'Item', k: 'item' }, { h: 'Kategori', k: 'kategori' }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }, { h: '', r: (r) => r.status === 'Waiting' && <Btn onClick={() => { setOpen(r); setChk(false) }}>Terima</Btn> }]} /></Card>
      <Modal open={!!open} title={'Terima ' + open?.item} onClose={() => setOpen(null)} footer={<Btn disabled={!chk} onClick={() => { api.acceptInventory(open.id); setOpen(null); toast('Aset diterima') }}>Terima aset</Btn>}>
        <p>Pastikan aset sudah kamu terima dalam kondisi baik.</p><label className="chk-l"><input type="checkbox" className="chk" checked={chk} onChange={(e) => setChk(e.target.checked)} />Saya menyetujui aturan & kebijakan penerimaan inventaris</label>
      </Modal>{t}</>
  )
}

export function ResignT() {
  const s = useStore(); const [t, toast] = useToast(); const [f, setF] = useState({ lastDay: '', alasan: '', agree: false }); const [err, setErr] = useState('')
  const mine = s.resigns.filter((r) => r.emp === ME)
  const minDay = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  return (
    <><PageHead title="Resign" sub="Ajukan paling lambat 30 hari sebelum hari kerja terakhir." />
      {mine.length > 0 && <Card title="Status pengajuan">{mine.map((r) => <div key={r.id} className="batch-row"><Icon name="door" /><div className="grow"><strong>Hari terakhir {fmtDate(r.lastDay)}</strong><div className="muted sm">{r.alasan}</div></div><Badge>{r.status}</Badge></div>)}</Card>}
      <div className="grid2">
        <Card title="Form resign"><div className="form">
          <Field label="Hari kerja terakhir" hint={'Paling cepat ' + fmtDate(minDay)}><input type="date" min={minDay} value={f.lastDay} onChange={(e) => setF({ ...f, lastDay: e.target.value })} /></Field>
          <Field label="Alasan (opsional)"><textarea rows={3} value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} /></Field>
          <Field label="Surat resign"><input type="file" accept=".pdf,.docx" /></Field>
          <Btn kind="ghost" icon="download" onClick={() => toast('Template surat resign (.docx) disiapkan')}>Template surat resign</Btn>
          <label className="chk-l"><input type="checkbox" className="chk" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />Saya akan mengembalikan seluruh inventaris kantor</label>
          {err && <div className="err" role="alert"><Icon name="x" size={16} /><p>{err}</p></div>}
          <Btn disabled={!f.agree || !f.lastDay} onClick={() => { if (f.lastDay < minDay) return setErr('Hari terakhir minimal 30 hari dari hari ini.'); api.request('resigns', { emp: ME, alasan: f.alasan || '—', lastDay: f.lastDay, inventaris: 'Belum lengkap' }, 'Resign'); setErr(''); toast('Pengajuan resign terkirim') }}>Ajukan resign</Btn>
        </div></Card>
        <Card title="Inventaris yang harus dikembalikan">{s.inventories.filter((i) => i.emp === ME).map((i) => <div key={i.id} className="file-row"><Icon name="box" /><span className="grow">{i.item}</span><Badge t="neutral">{i.kategori}</Badge></div>)}</Card>
      </div>{t}</>
  )
}

export function InboxT() {
  const s = useStore()
  return <><PageHead title="Inbox" sub="Notifikasi dari HR & sistem (juga dikirim lewat e-mail)." /><Card>{s.inbox.map((n) => <div key={n.id} className="ann"><Icon name="bell" /><div><strong>{n.judul}</strong><small>{n.isi} · {n.waktu}</small></div></div>)}</Card></>
}
