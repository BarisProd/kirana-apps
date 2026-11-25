import React, { useState } from 'react'
import { useStore, api, uid, getState } from '../services/store.js'
import { rupiah, calcRow, ADD_KAT, DED_KAT, katOf } from '../services/payroll.js'
import { exportExcel, exportPdf } from '../services/export.js'
import { Btn, Card, Badge, Stat, Table, Tabs, Modal, Field, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { Sticker, ArtHead } from '../components/Sticker.jsx'
import { useLookup, fmtDate, RemunSummary, Pager, pageOf, demoRemunRows } from './shared.jsx'
import { ModulList, ModulCard, kata } from './pretest.jsx'
import { TalentPoolView, DataKaryawan } from './admin.jsx'

const MY = () => getState().myBranch || 'b1'

function DashboardLama({ go }) {
  const s = useStore()
  const mine = s.employees.filter((e) => e.branch === MY())
  return (
    <>
      <PageHead title="Halo, Branch Jakarta Digital!" sub="Kamis, 12 November 2026" />
      <div className="stats">
        <Stat icon="users" label="Karyawan aktif" value={mine.filter((e) => e.status === 'Aktif').length} />
        <Stat icon="calendar" label="Kontrak habis bulan ini" value={mine.filter((e) => e.end.startsWith('2026-11')).length} />
        <Stat icon="calendar" label="Kontrak habis bulan depan" value={mine.filter((e) => e.end.startsWith('2026-12')).length} />
        <Stat icon="briefcase" label="Lowongan aktif" value={s.jobs.filter((j) => j.branch === MY() && j.status === 'Active').length} />
      </div>
      <div className="grid2">
        <Card title="Kontrak segera berakhir" action={<Btn kind="ghost" onClick={() => go('remunerasi')}>Ajukan Renewal</Btn>}>
          <Table rows={mine.filter((e) => e.end <= '2026-12-31')} cols={[{ h: 'Karyawan', r: (r) => r.name }, { h: 'Berakhir', r: (r) => fmtDate(r.end) }]} />
        </Card>
        <Card title="Lowongan" action={<Btn kind="ghost" icon="plus" onClick={() => go('lowongan')}>Buat</Btn>}>
          <Table rows={s.jobs.filter((j) => j.branch === MY())} cols={[{ h: 'Posisi', k: 'posisi' }, { h: 'Pelamar', k: 'pelamar' }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} />
        </Card>
      </div>
    </>
  )
}

export { BranchDashboard as Dashboard } from './branchDash.jsx'
export { Remunerasi } from './remunBranch.jsx'

// ---------- Lowongan ----------
export function Lowongan() {
  const s = useStore(); const [t, toast] = useToast(); const [open, setOpen] = useState(false); const [step, setStep] = useState(0); const [stop, setStop] = useState(null)
  const blank = { posisi: '', jenis: 'Kontrak', tingkat: 'Junior', kuota: 1, gaji: '', lokasi: 'Jakarta · Hybrid', pengalaman: '0–2 tahun', pendidikan: 'S1', deskripsi: '', pretest: [] }
  const [f, setF] = useState(blank)
  const steps = ['Isi detail', 'Set Pre-Test', 'Preview', 'Publish']
  return (
    <>
      <PageHead title="Lowongan" sub="Buat lowongan → approval admin → tayang & bisa dibagikan."><Btn icon="plus" onClick={() => { setOpen(true); setStep(0); setF(blank) }}>Buat lowongan</Btn></PageHead>
      <Card pad={false}><Table rows={s.jobs.filter((j) => j.branch === MY())} cols={[
        { h: 'Posisi', r: (r) => <div><strong>{r.posisi}</strong><div className="muted sm">{r.jenis} · {r.tingkat} · {r.lokasi}</div></div> },
        { h: 'Kuota', k: 'kuota' }, { h: 'Gaji', k: 'gaji' }, { h: 'Pelamar', k: 'pelamar' }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> },
        { h: '', r: (r) => r.status === 'Active' && <div className="row-act"><button className="icon-btn" aria-label="Bagikan" title="Salin link lamaran" onClick={() => toast('Link lamaran disalin')}><Icon name="send" /></button><Btn kind="ghost" onClick={() => setStop(r)}>Hentikan</Btn></div> },
      ]} /></Card>
      <Modal open={!!stop} title="Hentikan lowongan lebih awal?" onClose={() => setStop(null)} footer={<><Btn kind="ghost" onClick={() => setStop(null)}>Batal</Btn><Btn onClick={() => { api.stopJob(stop.id); setStop(null); toast('Lowongan dihentikan') }}>Ya, hentikan</Btn></>}>
        <p>Lowongan <b>{stop?.posisi}</b> tidak akan menerima pelamar baru. Kandidat yang sedang diseleksi tetap bisa diproses.</p>
      </Modal>
      <Modal wide open={open} title="Buat lowongan" onClose={() => setOpen(false)} footer={<>
        {step > 0 && <Btn kind="ghost" onClick={() => setStep(step - 1)}>Kembali</Btn>}
        {step < 3 ? <Btn disabled={!f.posisi || kata(f.deskripsi) > 10000} onClick={() => setStep(step + 1)}>Lanjut</Btn> : <Btn onClick={() => { api.createJob({ ...f, branch: MY(), gaji: f.gaji || '—' }); setOpen(false); toast('Lowongan diajukan ke admin') }}>Ajukan approval</Btn>}</>}>
        <ol className="stepper">{steps.map((x, i) => <li key={x} className={i < step ? 'done' : i === step ? 'on' : ''}><span>{i < step ? <Icon name="check" size={14} /> : i + 1}</span>{x}</li>)}</ol>
        {step === 0 && <div className="form two">
          <Field label="Posisi"><input value={f.posisi} onChange={(e) => setF({ ...f, posisi: e.target.value })} placeholder="Contoh: Backend Engineer" /></Field>
          <Field label="Jenis"><select value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}><option>Kontrak</option><option>Freelance</option><option>Magang</option></select></Field>
          <Field label="Tingkat"><select value={f.tingkat} onChange={(e) => setF({ ...f, tingkat: e.target.value })}>{['Junior', 'Middle', 'Senior', 'Supervisor', 'Manager'].map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Jumlah kandidat"><input type="number" min="1" value={f.kuota} onChange={(e) => setF({ ...f, kuota: e.target.value })} /></Field>
          <Field label="Pengalaman"><select value={f.pengalaman} onChange={(e) => setF({ ...f, pengalaman: e.target.value })}>{['0–2 tahun', '2–4 tahun', '4–6 tahun', '>6 tahun'].map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Pendidikan"><select value={f.pendidikan} onChange={(e) => setF({ ...f, pendidikan: e.target.value })}>{['SMA/SMK', 'D3', 'S1', 'S2'].map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Lokasi & tipe"><input value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} /></Field>
          <Field label="Rentang gaji"><input value={f.gaji} onChange={(e) => setF({ ...f, gaji: e.target.value })} placeholder="8–10 jt" /></Field>
          <Field label="Deskripsi pekerjaan" hint={<span className={kata(f.deskripsi) > 10000 ? 'over' : ''}>{kata(f.deskripsi).toLocaleString('id-ID')} / 10.000 kata</span>}><textarea rows={6} value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} placeholder="Tanggung jawab, kualifikasi, dan hal lain yang perlu diketahui pelamar" /></Field>
        </div>}
        {step === 1 && <>
          <p className="muted">Pre-test ini menempel hanya pada lowongan ini. Maksimal 3 modul.</p>
          {s.pretestSets.find((x) => x.aktif) && <div className="mb"><Btn kind="ghost" icon="layers" onClick={() => { setF({ ...f, pretest: structuredClone(s.pretestSets.find((x) => x.aktif).modul).map((m, i) => ({ ...m, id: 'jm' + Date.now() + i })) }); toast('Modul disalin dari rangkaian aktif admin. Silakan ubah sesuai kebutuhan') }}>Salin dari rangkaian aktif admin</Btn></div>}
          <ModulList modul={f.pretest} onChange={(pretest) => setF({ ...f, pretest })} />
        </>}
        {step === 2 && <div className="preview-job"><h3>{f.posisi}</h3><p className="muted">{f.jenis} · {f.tingkat} · {f.lokasi} · {f.gaji || 'gaji dirahasiakan'}</p><p>{f.deskripsi || 'Belum ada deskripsi.'}</p><p className="prewrap">{''}</p>{f.pretest.length ? f.pretest.map((m) => <ModulCard key={m.id} m={m} />) : <p className="muted">Tanpa pre-test.</p>}</div>}
        {step === 3 && <div className="center"><Icon name="checkCircle" size={48} /><p>Lowongan siap diajukan. Setelah admin menyetujui, lowongan tayang dan link lamaran bisa dibagikan.</p></div>}
      </Modal>{t}
    </>
  )
}

// ---------- Seleksi ----------
const TAHAP = ['Tes tulis', 'Berkas & psikotes', 'Atur jadwal', 'Wawancara & penilaian', 'Seleksi akhir']
export function Seleksi() {
  const s = useStore(); const { job } = useLookup(); const [t, toast] = useToast(); const [tab, setTab] = useState('Selection'); const [jobId, setJobId] = useState('j1')
  const jobs = s.jobs.filter((j) => j.branch === MY() && j.status !== 'Requested')
  const list = s.candidates.filter((c) => c.job === jobId)
  return (
    <>
      <PageHead title="Seleksi Kandidat" sub="Kandidat yang tidak lolos otomatis masuk Talent Pool." />
      <Tabs tabs={['Selection', 'Non-Selection']} value={tab} onChange={setTab} />
      {tab === 'Selection' ? <>
        <div className="filters"><Field label="Lowongan"><select value={jobId} onChange={(e) => setJobId(e.target.value)}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.posisi}</option>)}</select></Field></div>
        <div className="kanban">{TAHAP.map((th, i) => (
          <div key={th} className="kcol"><header><span>Tahap {i + 1}</span><b>{th}</b></header>
            {list.filter((c) => c.tahap === i + 1).map((c) => (
              <div key={c.id} className="kcard"><div className="who"><Avatar name={c.name} size={30} /><div><strong>{c.name}</strong><div className="muted sm">Skor {c.skor}</div></div></div>
                <div className="row-act">
                  <Btn kind="ghost" onClick={() => { api.failCandidate(c.id); toast(c.name + ' masuk Talent Pool') }}>Tidak lolos</Btn>
                  {i < 4 ? <Btn onClick={() => api.moveCandidate(c.id, 1)}>Lolos</Btn> : <Badge t="ok">Siap New Hiring</Badge>}
                </div>
              </div>))}
            {!list.some((c) => c.tahap === i + 1) && <p className="muted sm pad">Kosong</p>}
          </div>))}
        </div>
        <Note>Kandidat Tahap 5 bisa diajukan lewat Remunerasi dengan jenis <b>New Hiring</b>.</Note>
      </> : <Card title="Non-Selection (unggah CSV)">
        <ol className="stepper"><li className="on"><span>1</span>Unggah</li><li><span>2</span>Kelengkapan data</li><li><span>3</span>Data lengkap</li></ol>
        <div className="drop"><Icon name="upload" size={28} /><p>Tarik file CSV ke sini atau pilih file</p><input type="file" accept=".csv" aria-label="Unggah CSV" onChange={() => toast('CSV diterima — 3 data belum lengkap')} /></div>
        <div className="row-act"><Btn kind="ghost" icon="download" onClick={() => toast('Template CSV disiapkan')}>Template CSV</Btn><Btn kind="ghost">Lanjut dengan pre-test (formalitas)</Btn><Btn>Lanjut tanpa pre-test</Btn></div>
        <Note>Karyawan migrasi tetap wajib punya kontrak bertanda tangan (unggah lewat Existing Contract di Send Document).</Note>
      </Card>}{t}
    </>
  )
}

export const TalentPoolBranch = (p) => <TalentPoolView {...p} />
export const DataKaryawanBranch = (p) => <DataKaryawan {...p} />

// ---------- Remunerasi ----------
const JENIS = ['New Hiring', 'Active', 'Salary', 'Duration', 'Renewal', 'Resign']
const FIELDS = [['start', 'Tanggal masuk', 'date'], ['end', 'Tanggal keluar', 'date'], ['role', 'Role', 'text'], ['level', 'Level', 'text'], ['type', 'Employee type', 'select'], ['thp', 'Take Home Pay', 'number']]
const LOCKS = { 'New Hiring': [], Active: ['start', 'end', 'role', 'level', 'type', 'thp'], Salary: ['start', 'end', 'role', 'level', 'type'], Duration: ['role', 'level', 'type', 'thp'], Renewal: [], Resign: [] }

function RemunerasiLama() { // diganti pages/remunBranch.jsx (22 Nov)
  const s = useStore(); const { emp } = useLookup(); const [t, toast] = useToast()
  const [tab, setTab] = useState('Buat'); const [draft, setDraft] = useState(null); const [edit, setEdit] = useState(null); const [pick, setPick] = useState(false); const [sim, setSim] = useState(false)
  const [rq, setRq] = useState(''); const [rp, setRp] = useState(1); const [rs, setRs] = useState(10); const [chosen, setChosen] = useState([]); const [pq, setPq] = useState('')
  const mine = s.remunerations.filter((r) => r.branch === MY())
  const start = (base) => { setDraft(base || { id: uid('r'), branch: MY(), bulan: 'November 2026', status: 'Draft', thr: false, kak: false, files: [], rows: [] }); setSim(false); setTab('Buat') }
  const d = draft
  const setD = (fn) => { const n = structuredClone(d); fn(n); setDraft(n); setSim(false) }
  const autoFor = (eid) => {
    const e = emp(eid); const gp = (e.thp || 0) * s.setup.basic / 100
    const ot = s.overtimes.filter((o) => o.emp === eid && o.status === 'Approved').map((o) => ({ keperluan: `Lembur ${fmtDate(o.tanggal)} (${o.durasi} jam)`, kategori: 'Overtime', nominal: Math.round(gp / 173 * 2 * o.durasi), auto: true }))
    const rb = s.reimbursements.filter((o) => o.emp === eid && o.status === 'Approved').map((o) => ({ keperluan: `Reimburse ${o.jenis}`, kategori: 'Lain-lain', nominal: o.nominal, auto: true }))
    return ot.concat(rb)
  }
  const addEmp = (eid) => setD((n) => { const e = emp(eid); n.rows.push({ emp: eid, jenis: 'Active', thp: e.thp, skema: e.skema, start: e.start, end: e.end, role: e.role, level: e.level, type: e.type, additions: autoFor(eid), deductions: [] }) })
  const candidates = s.candidates.filter((c) => c.tahap === 5)
  const who = (r) => r.demo || emp(r.emp)
  const hasDemo = !!d?.rows.some((r) => r.demo)
  const avail = s.employees.filter((e) => e.branch === MY() && e.status === 'Aktif' && !d?.rows.some((r) => r.emp === e.id))
  const availF = avail.filter((e) => (e.name + ' ' + e.role).toLowerCase().includes(pq.toLowerCase()))
  const allOn = availF.length > 0 && availF.every((e) => chosen.includes(e.id))
  const toggleAll = () => setChosen(allOn ? chosen.filter((x) => !availF.some((e) => e.id === x)) : [...new Set([...chosen, ...availF.map((e) => e.id)])])
  const openPick = () => { setChosen([]); setPq(''); setPick(true) }
  const addChosen = () => { setD((n) => { chosen.forEach((eid) => { const e = emp(eid); n.rows.push({ emp: eid, jenis: 'Active', thp: e.thp, skema: e.skema, start: e.start, end: e.end, role: e.role, level: e.level, type: e.type, additions: autoFor(eid), deductions: [] }) }) }); toast(`${chosen.length} karyawan ditambahkan`); setPick(false) }
  const rowsF = d ? d.rows.filter((r) => !rq || who(r).name.toLowerCase().includes(rq.toLowerCase())) : []
  const unsynced = s.employees.filter((e) => e.branch === MY() && !e.bankOk).length

  return (
    <>
      <PageHead title="Remunerasi" sub="Jenis request menentukan kolom yang bisa diubah. Selain Active, dokumen otomatis dibuat di Send Document." />
      <Tabs tabs={['Buat', 'Draft', 'Rejected', 'In Review', 'Approved']} value={tab} onChange={setTab} />
      {tab === 'Buat' && (!d ? <Card><div className="center"><Icon name="wallet" size={40} /><p>Mulai pengajuan remunerasi bulan November 2026.</p><Btn icon="plus" onClick={() => start()}>Buat pengajuan</Btn></div></Card> : <>
        {unsynced > 0 && <div className="warnbar"><Icon name="bell" />{unsynced} akun bank belum tersinkronisasi<Btn kind="ghost" onClick={() => { api.syncBank(); toast('Rekening tervalidasi via payment gateway') }}>Synchronize Bank Account</Btn></div>}
        <Card title={`Pengajuan ${d.bulan}`} action={<div className="row-act">
          <label className="chk-l" title="THR otomatis: masa kerja ≥ 12 bulan = 1× upah, di bawahnya proporsional"><input type="checkbox" className="chk" checked={d.thr} onChange={(e) => setD((n) => { n.thr = e.target.checked })} />Aktifkan THR</label>
          <label className="chk-l" title="KAK otomatis: masa kontrak (bulan) ÷ 12 × upah"><input type="checkbox" className="chk" checked={d.kak} onChange={(e) => setD((n) => { n.kak = e.target.checked })} />Aktifkan KAK</label>
          <Btn kind="ghost" icon="plus" onClick={openPick}>Add to list</Btn></div>}>
          {hasDemo && <div className="warnbar"><Icon name="eye" />Berisi {d.rows.filter((r) => r.demo).length} karyawan contoh untuk pratinjau tabel besar — tidak bisa disimpan atau diajukan.<Btn kind="ghost" onClick={() => { setD((n) => { n.rows = n.rows.filter((r) => !r.demo) }); setRp(1); toast('Data contoh dihapus') }}>Hapus data contoh</Btn></div>}
          {d.rows.length > 10 && <div className="filters"><label className="fsel grow"><span>Cari di daftar ({d.rows.length.toLocaleString('id-ID')} karyawan)</span><span className="search"><Icon name="search" size={18} /><input placeholder="Nama karyawan" value={rq} onChange={(e) => { setRq(e.target.value); setRp(1) }} /></span></label></div>}
          {d.rows.length === 0 ? <><Empty text="Belum ada karyawan. Klik Add to list." /><p className="center"><button className="linkish sm" onClick={() => { setD((n) => { n.rows = demoRemunRows(300) }); setRp(1); toast('300 karyawan contoh dimuat') }}>Muat 300 karyawan contoh (pratinjau tabel besar)</button></p></> : <><Table paged={false} rows={pageOf(rowsF, rp, rs)} empty="Tidak ada karyawan yang cocok." cols={[
            { h: 'Karyawan', r: (r) => <div className="who"><Avatar name={who(r).name} size={30} /><div><strong>{who(r).name}</strong><div className="muted sm">{r.type} · {fmtDate(r.start)} – {fmtDate(r.end)}</div></div></div> },
            { h: 'Jenis request', r: (r) => <select value={r.jenis} aria-label="Jenis request" onChange={(e) => setD((n) => { n.rows.find((x) => x.emp === r.emp).jenis = e.target.value })}>{JENIS.map((j) => <option key={j}>{j}</option>)}</select> },
            { h: 'THP', right: true, r: (r) => rupiah(r.thp) },
            { h: 'Tambahan', right: true, r: (r) => rupiah(r.additions.reduce((a, b) => a + Number(b.nominal || 0), 0)) },
            { h: '', r: (r) => <div className="row-act"><button className="icon-btn" aria-label="Edit" onClick={() => setEdit(r.emp)}><Icon name="settings" /></button><button className="icon-btn" aria-label="Hapus" onClick={() => setD((n) => { n.rows = n.rows.filter((x) => x.emp !== r.emp) })}><Icon name="x" /></button></div> },
          ]} />{rowsF.length > 10 && <Pager total={rowsF.length} page={rp} size={rs} onPage={setRp} onSize={setRs} label="karyawan" />}</>}
          <Field label="Lampiran pendukung (boleh banyak)"><input type="file" multiple onChange={(e) => { const names = [...e.target.files].map((f) => f.name); setD((n) => { n.files = [...n.files, ...names] }) }} /></Field>
          {d.files.length > 0 && <div className="chips">{d.files.map((f) => <Badge key={f} t="neutral">📎 {f}</Badge>)}</div>}
          <div className="row-end"><Btn kind="ghost" disabled={hasDemo} onClick={() => { api.saveRemun({ ...d, status: 'Draft' }); toast('Tersimpan di Draft') }}>Simpan draft</Btn><Btn kind="ghost" disabled={!d.rows.length} onClick={() => setSim(true)}>Create simulation</Btn><Btn disabled={!sim || hasDemo} onClick={() => { api.saveRemun({ ...d, status: 'In Review' }); setDraft(null); setTab('In Review'); toast('Diajukan ke admin') }}>Request approval</Btn></div>
        </Card>
        {sim && <Card title="Simulasi perhitungan"><RemunSummary remun={d} /></Card>}
      </>)}
      {tab !== 'Buat' && <RemunList list={mine.filter((r) => r.status === (tab === 'Approved' ? 'Approved' : tab))} tab={tab} onOpen={(r) => start(structuredClone(r))} onRecreate={(r) => { start({ ...structuredClone(r), id: uid('r'), status: 'Draft', note: '' }); toast('Disalin — perbaiki bagian yang salah') }} />}

      <Modal open={pick} title="Tambah karyawan" onClose={() => setPick(false)} footer={<><span className="muted sm pick-n">{chosen.length} dipilih</span><Btn kind="ghost" onClick={() => setPick(false)}>Batal</Btn><Btn disabled={!chosen.length} onClick={addChosen}>Tambah {chosen.length || ''} karyawan</Btn></>}>
        <h4>Karyawan aktif</h4>
        {avail.length ? <>
          <label className="fsel grow"><span className="sr-only">Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Cari nama atau role" value={pq} onChange={(e) => setPq(e.target.value)} /></span></label>
          <div className="pick-bar"><label className="chk-l"><input type="checkbox" className="chk" checked={allOn} ref={(el) => { if (el) el.indeterminate = !allOn && availF.some((e) => chosen.includes(e.id)) }} onChange={toggleAll} disabled={!availF.length} />{allOn ? 'Unselect all' : 'Select all'} ({availF.length})</label>
            {chosen.length > 0 && <button className="linkish sm" onClick={() => setChosen([])}>Kosongkan pilihan</button>}</div>
          <div className="pick-list">{availF.map((e) => { const on = chosen.includes(e.id); return <label key={e.id} className={'pick chk-pick' + (on ? ' on' : '')}><input type="checkbox" className="chk" checked={on} onChange={() => setChosen(on ? chosen.filter((x) => x !== e.id) : [...chosen, e.id])} /><Avatar name={e.name} size={30} /><div><strong>{e.name}</strong><small>{e.role} · {rupiah(e.thp)}</small></div></label> })}
            {!availF.length && <p className="muted sm">Tidak ada yang cocok.</p>}</div>
        </> : <p className="muted sm">Semua karyawan aktif sudah ada di daftar.</p>}
        <h4 className="mt">Kandidat lolos (New Hiring)</h4>
        {candidates.length ? <div className="pick-list">{candidates.map((c) => <button key={c.id} className="pick" onClick={() => { const id = api.addHire(c, MY()); setPick(false); setD((n) => { n.rows.push({ emp: id, jenis: 'New Hiring', thp: 0, skema: 'Normal', start: '2026-12-01', end: '2027-11-30', role: 'Calon karyawan', level: 'Junior', type: 'Kontrak', additions: [], deductions: [] }) }) }}><Avatar name={c.name} size={30} /><div><strong>{c.name}</strong><small>Lolos Tahap 5</small></div></button>)}</div> : <p className="muted sm">Belum ada kandidat di Tahap 5.</p>}
      </Modal>
      {edit && d && <EditRow row={d.rows.find((r) => r.emp === edit)} e={emp(edit)} onClose={() => setEdit(null)} onSave={(row) => { setD((n) => { const i = n.rows.findIndex((x) => x.emp === edit); n.rows[i] = row }); setEdit(null) }} />}
      {t}
    </>
  )
}

function EditRow({ row, e, onClose, onSave }) {
  const [r, setR] = useState(structuredClone(row))
  const locked = LOCKS[r.jenis]
  const before = { start: e.start, end: e.end, role: e.role, level: e.level, type: e.type, thp: e.thp }
  const upd = (k, v) => setR({ ...r, [k]: k === 'thp' ? Number(v) : v })
  const addLine = (k) => setR({ ...r, [k]: [...r[k], { keperluan: '', kategori: k === 'additions' ? 'Rapel' : 'Potongan Absen', nominal: 0 }] })
  const s = useStore(); const kats = (k) => (k === 'additions' ? ADD_KAT : DED_KAT.filter((x) => x !== 'Potongan Absen' || s.setup.deduksiAbsen !== false))
  return (
    <Modal wide open title={`${e.name} — ${r.jenis}`} onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn onClick={() => onSave(r)}>Simpan</Btn></>}>
      <div className="jenis-bar">{JENIS.map((j) => <button key={j} className={r.jenis === j ? 'on' : ''} onClick={() => setR({ ...r, jenis: j })}>{j}</button>)}</div>
      <div className="cmp">
        <div className="cmp-h"><span /><b>Sebelum</b><b>Sesudah</b></div>
        {FIELDS.map(([k, l, type]) => {
          const lock = locked.includes(k)
          return <div key={k} className={`cmp-r ${lock ? 'locked' : ''}`}><span>{l}{lock && <Icon name="lock" size={13} />}</span><span className="muted">{k === 'thp' ? rupiah(before[k]) : type === 'date' ? fmtDate(before[k]) : before[k] || '—'}</span>
            {type === 'select' ? <select disabled={lock} value={r[k]} onChange={(ev) => upd(k, ev.target.value)}><option>Kontrak</option><option>Freelance</option><option>Magang</option></select>
              : <input disabled={lock} type={type} value={r[k] ?? ''} onChange={(ev) => upd(k, ev.target.value)} />}</div>
        })}
      </div>
      <Field label="Skema"><select value={r.skema} onChange={(ev) => setR({ ...r, skema: ev.target.value })}><option>Normal</option><option>Khusus</option></select></Field>
      {['additions', 'deductions'].map((k) => (
        <div key={k} className="pay-lines"><div className="row-end"><h4>{k === 'additions' ? 'Addition payment' : 'Deduction payment'}</h4><Btn kind="ghost" icon="plus" onClick={() => addLine(k)}>Tambah</Btn></div>
          {r[k].length === 0 && <p className="muted sm">Belum ada.</p>}
          {r[k].map((a, i) => <div key={i} className="pay-line kat"><select aria-label="Kategori" disabled={a.auto} value={katOf(a, k === 'additions' ? 'add' : 'ded')} onChange={(ev) => { const n = [...r[k]]; n[i] = { ...a, kategori: ev.target.value }; setR({ ...r, [k]: n }) }}>{kats(k).map((o) => <option key={o}>{o}</option>)}</select><input placeholder="Keperluan" disabled={a.auto} value={a.keperluan} onChange={(ev) => { const n = [...r[k]]; n[i] = { ...a, keperluan: ev.target.value }; setR({ ...r, [k]: n }) }} /><input type="number" disabled={a.auto} value={a.nominal} onChange={(ev) => { const n = [...r[k]]; n[i] = { ...a, nominal: Number(ev.target.value) }; setR({ ...r, [k]: n }) }} />{a.auto ? <Badge t="ok">Otomatis</Badge> : <button className="icon-btn" aria-label="Hapus baris" onClick={() => setR({ ...r, [k]: r[k].filter((_, j) => j !== i) })}><Icon name="x" /></button>}</div>)}
        </div>))}
      <Note>Kategori mengikuti kolom Excel remunerasi: Penambah = Overtime, Rapel, Bonus, Lain-lain; Pengurang = Potongan Absen, Kliring, Lain-lain. Lembur & reimbursement masuk otomatis dari data STA. THR dan KAK dihitung otomatis lewat checkbox pengajuan.</Note>
    </Modal>
  )
}

function RemunList({ list, tab, onOpen, onRecreate }) {
  const [open, setOpen] = useState(null)
  return (
    <>
      <Card pad={false}><Table rows={list} empty={`Tidak ada pengajuan ${tab}.`} cols={[{ h: 'Bulan', k: 'bulan' }, { h: 'Karyawan', r: (r) => r.rows.length + ' orang' }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> },
        { h: '', r: (r) => <div className="row-act">
          {tab === 'Draft' && <Btn kind="ghost" onClick={() => onOpen(r)}>Lanjutkan</Btn>}
          {tab === 'Rejected' && <><span className="muted sm">{r.note}</span><Btn kind="ghost" onClick={() => onRecreate(r)}>Re-create</Btn></>}
          {(tab === 'In Review' || tab === 'Approved') && <Btn kind="ghost" icon="eye" onClick={() => setOpen(r)}>Lihat</Btn>}</div> }]} /></Card>
      <Modal wide open={!!open} title={open?.bulan} onClose={() => setOpen(null)}>{open && <RemunSummary remun={open} />}</Modal>
    </>
  )
}

export function PayslipBranch() {
  const s = useStore(); const { emp } = useLookup(); const [t, toast] = useToast()
  const [cat, setCat] = useState(''); const [per, setPer] = useState(''); const [q, setQ] = useState(''); const [yr, setYr] = useState('')
  const my = MY()
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const key = (b) => { const [m, y] = b.split(' '); return `${y}-${String(BLN.indexOf(m) + 1).padStart(2, '0')}` }
  const slips = s.payslips.filter((p) => emp(p.emp).branch === my)
  const sends = s.payslipSends.filter((x) => x.branch === my)
  // Status kirim per karyawan per periode
  const rows = slips.map((p) => {
    const ss = sends.filter((x) => x.periode === p.bulan && (x.tipe || 'Payroll') === (p.tipe || 'Payroll') && x.emp.includes(p.emp)).sort((a, b) => a.at.localeCompare(b.at))
    const failedLast = ss.length && (ss[ss.length - 1].gagalEmp || ss[ss.length - 1].emp.slice(0, ss[ss.length - 1].gagal || 0)).includes(p.emp)
    const status = !ss.length ? 'Belum dikirim' : failedLast ? 'Gagal terkirim' : 'Terkirim'
    return { ...p, e: emp(p.emp), ss, n: ss.length, status, last: ss[ss.length - 1]?.at || '' }
  })
  // Periode: dari payslip yang ada + remunerasi Branch (yang belum terbit)
  const rem = s.remunerations.filter((r) => r.branch === my && r.status !== 'Rejected')
  const periods = [...new Set([...rows.map((r) => r.bulan), ...rem.map((r) => r.bulan)])].sort((a, b) => key(b).localeCompare(key(a)))
  const perStat = periods.map((b) => {
    const l = rows.filter((r) => r.bulan === b); const rr = rem.filter((r) => r.bulan === b)
    const st = !l.length ? (rr.some((r) => r.status === 'Approved') ? 'Menunggu pembayaran' : rr.length ? `Belum terbit (remunerasi ${rr.map((r) => r.status).join(' & ')})` : 'Belum terbit') : l.every((r) => r.status === 'Terkirim') ? 'Terkirim semua' : l.some((r) => r.status === 'Terkirim') ? 'Sebagian belum terkirim' : 'Belum dikirim'
    return { b, l, st, sent: l.filter((r) => r.status === 'Terkirim').length, gagal: l.filter((r) => r.status === 'Gagal terkirim').length, belum: l.filter((r) => r.status === 'Belum dikirim').length, ulang: l.filter((r) => r.n > 1).length, total: l.reduce((a, r) => a + r.thp, 0), kirim: sends.filter((x) => x.periode === b).length, lastAt: sends.filter((x) => x.periode === b).map((x) => x.at).sort().pop() || '' }
  })
  const years = [...new Set(periods.map((b) => b.split(' ')[1]))].sort().reverse()
  const CATS = [['', 'Semua payslip', 'receipt', '#0a5950', () => true], ['Terkirim', 'Terkirim', 'check', '#2f8f4e', (r) => r.status === 'Terkirim'], ['Gagal terkirim', 'Gagal terkirim', 'x', '#c0452a', (r) => r.status === 'Gagal terkirim'], ['Belum dikirim', 'Belum dikirim', 'clock', '#d9a400', (r) => r.status === 'Belum dikirim'], ['ulang', 'Dikirim > 1×', 'send', '#7a5af5', (r) => r.n > 1]]
  const inYear = rows.filter((r) => !yr || r.bulan.endsWith(yr))
  const fn = (CATS.find((c) => c[0] === cat) || CATS[0])[4]
  const list = inYear.filter((r) => fn(r) && (!per || r.bulan === per) && (r.e.name + ' ' + (r.e.divisi || '') + ' ' + r.bulan).toLowerCase().includes(q.toLowerCase())).sort((a, b) => key(b.bulan).localeCompare(key(a.bulan)) || a.e.name.localeCompare(b.e.name))
  const toList = () => setTimeout(() => document.getElementById('ps-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  const tgl = (at) => (at ? `${fmtDate(at.slice(0, 10))} ${at.slice(11, 16)}` : '—')
  const ST_T = { Terkirim: 'ok', 'Gagal terkirim': 'bad', 'Belum dikirim': 'warn' }
  const dl = (kind) => {
    const payload = { title: `Payslip ${s.branches.find((b) => b.id === my)?.name || ''} - Kirana HRIS`, meta: `${list.length} baris | ${cat ? (CATS.find((c) => c[0] === cat) || [])[1] : 'Semua status'}${per ? ' | ' + per : ''}${yr ? ' | ' + yr : ''}`,
      cols: ['Karyawan', 'Divisi', 'Periode', 'Tipe', 'Net dibayar', 'Status kirim', 'Jumlah kirim', 'Terakhir dikirim'],
      rows: list.map((r) => [r.e.name, r.e.divisi || '', r.bulan, r.tipe || 'Payroll', r.thp, r.status, r.n, tgl(r.last)]), file: `payslip_${my}_${per || yr || 'semua'}`.replace(/\s+/g, '-') }
    try { kind === 'xls' ? exportExcel(payload) : exportPdf(payload); toast(`${list.length} baris diunduh sebagai ${kind === 'xls' ? 'Excel' : 'PDF'}`) } catch (e) { toast('Unduhan diblokir di pratinjau ini') }
  }
  return (
    <>
      <PageHead title="Payslip" sub="Payslip karyawan Branch-mu, terbit setelah transfer selesai. Rekap pengiriman per bulan & karyawan." />
      <div className="filters"><label className="fsel"><span>Tahun</span><select value={yr} onChange={(e) => { setYr(e.target.value); setPer('') }}><option value="">Semua tahun</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label></div>
      <div className="rk-tiles" role="group" aria-label="Rekap status payslip">{CATS.map(([k, l, ic, c, f]) => { const lst = inYear.filter(f); const on = cat === k; return (
        <button key={l} className={`rk-tile ${on ? 'on' : ''}`} style={{ borderTopColor: c }} aria-pressed={on} onClick={() => { setCat(k); toList() }}>
          <span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{lst.length.toLocaleString('id-ID')}</b>
          <small>{new Set(lst.map((r) => r.e.id)).size} karyawan · {rupiah(lst.reduce((a, r) => a + r.thp, 0))}</small>
          <small className="rk-br">{[...new Set(lst.map((r) => r.bulan))].sort((a, b) => key(b).localeCompare(key(a))).slice(0, 3).map((b) => `${b.slice(0, 3)} ${lst.filter((r) => r.bulan === b).length}`).join(' · ') || '—'}</small>
        </button>) })}</div>

      <Card title="Status pengiriman per bulan" pad={false}>
        <Table paged={false} rows={perStat.filter((x) => !yr || x.b.endsWith(yr)).map((x) => ({ ...x, id: x.b }))} empty="Belum ada periode." onRow={(x) => { setPer(x.b); setCat(''); toList() }} cols={[
          { h: 'Periode', r: (x) => <strong>{x.b}</strong> },
          { h: 'Status', r: (x) => <Badge t={x.st === 'Terkirim semua' ? 'ok' : x.st.startsWith('Sebagian') ? 'bad' : x.st.startsWith('Belum dikirim') ? 'warn' : 'neutral'}>{x.st}</Badge> },
          { h: 'Payslip', right: true, r: (x) => x.l.length || '—' },
          { h: 'Terkirim', right: true, r: (x) => (x.l.length ? x.sent : '—') },
          { h: 'Gagal / belum', right: true, r: (x) => (x.gagal + x.belum ? <b className="vd-warn">{x.gagal + x.belum}</b> : x.l.length ? 0 : '—') },
          { h: 'Dikirim > 1×', right: true, r: (x) => (x.ulang ? <Badge t="warn">{x.ulang} karyawan</Badge> : x.l.length ? 0 : '—') },
          { h: 'Kali kirim', right: true, r: (x) => x.kirim || '—' },
          { h: 'Terakhir dikirim', r: (x) => <span className="sm nowrap">{tgl(x.lastAt)}</span> },
          { h: 'Total net', right: true, r: (x) => (x.total ? rupiah(x.total) : '—') },
        ]} />
        <p className="muted sm vd-note">Klik baris periode untuk melihat payslip-nya di bawah. "Dikirim &gt; 1×" = karyawan yang menerima payslip periode yang sama lebih dari sekali (kirim ulang/revisi).</p>
      </Card>

      <div id="ps-list" className="anchor" />
      <div className="filters">
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input placeholder="Nama karyawan, divisi, atau bulan" value={q} onChange={(e) => setQ(e.target.value)} /></span></label>
        <label className="fsel"><span>Periode</span><select value={per} onChange={(e) => setPer(e.target.value)}><option value="">Semua periode</option>{periods.filter((b) => (!yr || b.endsWith(yr)) && rows.some((r) => r.bulan === b)).map((b) => <option key={b}>{b}</option>)}</select></label>
        <label className="fsel"><span>Status</span><select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map(([k, l]) => <option key={l} value={k}>{l}</option>)}</select></label>
        <div className="row-act"><Btn kind="ghost" icon="download" onClick={() => dl('xls')}>Download Excel</Btn><Btn kind="ghost" icon="download" onClick={() => dl('pdf')}>Download PDF</Btn></div>
      </div>
      <p className="muted sm">{list.length.toLocaleString('id-ID')} payslip{cat || per || q ? <> · <button className="linkish" onClick={() => { setCat(''); setPer(''); setQ('') }}>Reset filter</button></> : ''}</p>
      <Card pad={false}><Table rows={list} empty="Tidak ada payslip untuk filter ini." cols={[
        { h: 'Karyawan', r: (r) => <div><strong>{r.e.name}</strong><div className="muted sm">{r.e.divisi || r.e.role}</div></div> },
        { h: 'Periode', r: (r) => <span className="nowrap">{r.bulan}<span className="muted sm" style={{ display: 'block' }}>{r.tipe || 'Payroll'}</span></span> },
        { h: 'Net dibayar', right: true, r: (r) => rupiah(r.thp) },
        { h: 'Status kirim', r: (r) => <Badge t={ST_T[r.status]}>{r.status}</Badge> },
        { h: 'Dikirim', r: (r) => (r.n > 1 ? <Badge t="warn">{r.n}× kirim</Badge> : r.n ? '1×' : '—') },
        { h: 'Terakhir dikirim', r: (r) => <span className="sm nowrap">{tgl(r.last)}{r.ss.length ? <span className="muted" style={{ display: 'block' }}>{r.ss[r.ss.length - 1].mode} · {r.ss[r.ss.length - 1].oleh}</span> : null}</span> },
      ]} /></Card>
      {t}
    </>
  )
}
