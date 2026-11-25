import { useMemo, useState } from 'react'
import { useDb, Icon, Btn, Status, Badge, Card, PageHead, Stats, Tabs, Table, Modal, Confirm, Field, Input, Select, Toggle, Avatar, useToast, fmtDate } from '../ui.jsx'
import { hitung, rupiah, editableBy, needsDocument, defaultSetup } from '../services/payroll.js'

export const empOf = (db, id) => db.get('employees', id) || { nama: '—' }
const DOCS = ['Offering Letter', 'PKWT (Potongan BPJS)', 'PKWT (Tanpa Potongan BPJS)', 'Amandemen PKWT', 'Kontrak Freelance', 'Kontrak Internship']
const MODES = ['New Contract Manual', 'New Contract Template', 'Existing Contract']

// ---------------- Dashboard ----------------
function Dashboard({ role }) {
  const db = useDb()
  const emps = db.list('employees')
  const waitRem = db.list('remunerations').filter((r) => r.status === 'In Review').length
  const waitJob = db.list('jobApprovals').filter((r) => r.status === 'Waiting').length
  const waitAct = ['leaves', 'overtimes', 'reimburses', 'resigns'].reduce((a, c) => a + db.list(c).filter((x) => x.status === 'Waiting').length, 0)
  const ending = emps.filter((e) => e.keluar.startsWith('2026-11') || e.keluar.startsWith('2026-12'))
  return (
    <>
      <PageHead title="Selamat siang, tim HR" sub="Kamis, 12 November 2026 · ringkasan semua Branch" />
      <Stats items={[
        { label: 'Karyawan aktif', value: emps.filter((e) => e.aktif).length },
        { label: 'Perlu approval', value: waitRem + waitJob + waitAct, tone: 'warn', hint: 'Job post, remunerasi, cuti, lembur, reimburse, resign' },
        { label: 'Talent pool aktif', value: db.list('talents').filter((t) => t.status === 'Active Pool').length },
        { label: 'Kontrak berakhir ≤ 2 bln', value: ending.length, tone: ending.length ? 'bad' : '' },
      ]} />
      <div className="grid2">
        <Card title="Perlu tindakan" action={<a className="link" href={`#/${role}/approval`}>Buka approval</a>}>
          <ul className="todo">
            {db.list('jobApprovals').filter((j) => j.status === 'Waiting').map((j) => <li key={j.id}><Icon name="brief" /><span><strong>Job post {db.get('jobs', j.job)?.posisi}</strong><small>{j.branch} · {j.diajukan}</small></span><Status s="Waiting" /></li>)}
            {db.list('remunerations').filter((r) => r.status === 'In Review').map((r) => <li key={r.id}><Icon name="money" /><span><strong>Remunerasi {r.bulan}</strong><small>{r.branch} · {r.rows.length} karyawan</small></span><Status s="In Review" /></li>)}
            {db.list('leaves').filter((l) => l.status === 'Waiting').map((l) => <li key={l.id}><Icon name="sun" /><span><strong>Cuti {empOf(db, l.emp).nama}</strong><small>{l.kategori} · {l.hari} hari</small></span><Status s="Waiting" /></li>)}
            {db.list('resigns').filter((l) => l.status === 'Waiting').map((l) => <li key={l.id}><Icon name="exit" /><span><strong>Resign {empOf(db, l.emp).nama}</strong><small>Hari terakhir {fmtDate(l.lastDay)}</small></span><Status s="Waiting" /></li>)}
          </ul>
        </Card>
        <Card title="Kehadiran hari ini">
          <ul className="todo">
            {db.list('attendance').map((a) => <li key={a.id}><Avatar name={empOf(db, a.emp).nama} size={32} /><span><strong>{empOf(db, a.emp).nama}</strong><small>{a.masuk !== '—' ? `Masuk ${a.masuk} · ${a.lokasi}` : 'Tidak absen'}</small></span><Status s={a.status} /></li>)}
          </ul>
        </Card>
        <Card title="Kontrak segera berakhir">
          <Table cols={[{ k: 'nama', label: 'Nama' }, { k: 'branch', label: 'Branch' }, { k: 'keluar', label: 'Berakhir', render: (e) => fmtDate(e.keluar) }]} rows={ending} empty="Tidak ada kontrak yang berakhir dalam 2 bulan." />
        </Card>
        <Card title="Disbursement">
          <ul className="todo">{db.list('disbursements').map((d) => <li key={d.id}><Icon name="money" /><span><strong>{d.branch} · {d.bulan}</strong><small>{rupiah(d.total)} · {d.orang} orang</small></span><Status s={d.status} /></li>)}</ul>
        </Card>
      </div>
    </>
  )
}

// ---------------- Approval ----------------
function RemunDetail({ rem, onClose }) {
  const db = useDb()
  const toast = useToast()
  const [note, setNote] = useState('')
  const [ask, setAsk] = useState(null)
  if (!rem) return null
  const rows = rem.rows.map((r) => {
    const e = empOf(db, r.emp)
    const thp = r.baru?.thp ?? e.thp
    const add = r.addition.reduce((a, b) => a + b.nominal, 0)
    const ded = r.deduction.reduce((a, b) => a + b.nominal, 0)
    const sisa = Math.max(1, Math.round((new Date(r.baru?.keluar || e.keluar) - new Date('2026-12-01')) / 2.6e9))
    return { ...r, e, thp, calc: hitung({ thp, skema: e.skema, addition: add, deduction: ded, sisaBulan: sisa }) }
  })
  const total = rows.reduce((a, r) => a + r.calc.tani, 0)
  const sisa = rows.reduce((a, r) => a + r.calc.sisaKontrak, 0)
  const decide = (status) => {
    db.update('remunerations', rem.id, { status, note: status === 'Rejected' ? note : undefined })
    if (status === 'Approved') {
      const docRows = rows.map((r) => ({ emp: r.emp, jenis: r.jenis, dokumen: needsDocument(r.jenis) ? '' : '—', status: needsDocument(r.jenis) ? 'None' : 'Tidak perlu dokumen' }))
      if (docRows.some((d) => d.dokumen !== '—')) db.add('docBatches', { branch: rem.branch, bulan: rem.bulan, setelan: '', status: 'Process', rows: docRows })
      toast('Remunerasi disetujui. Dokumen masuk ke Send Document.')
    } else toast('Remunerasi ditolak dan dikembalikan ke Branch.', 'bad')
    setAsk(null); onClose()
  }
  return (
    <Modal open title={`Remunerasi ${rem.bulan} · ${rem.branch}`} onClose={onClose} wide footer={rem.status === 'In Review' && <><Btn kind="ghost" onClick={() => setAsk('Rejected')}>Tolak</Btn><Btn onClick={() => setAsk('Approved')}>Setujui</Btn></>}>
      <div className="row gap wrap mb">
        <Status s={rem.status} />{rem.thr && <Badge tone="info">THR aktif</Badge>}{rem.kak && <Badge tone="info">KAK aktif</Badge>}
        {rem.files.map((f) => <Badge key={f}><Icon name="doc" size={14} /> {f}</Badge>)}
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Karyawan</th><th>Jenis</th><th>THP</th><th>Tambahan</th><th>Potongan</th><th>Net</th><th>TANI</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.emp}>
                <td data-l="Karyawan"><strong>{r.e.nama}</strong><br /><small className="muted">{r.e.tipe} · skema {r.e.skema}</small></td>
                <td data-l="Jenis"><Badge tone={r.jenis === 'Active' ? 'neutral' : 'info'}>{r.jenis}</Badge></td>
                <td data-l="THP">{r.baru?.thp ? <><s className="muted">{rupiah(r.e.thp)}</s><br />{rupiah(r.thp)}</> : rupiah(r.thp)}</td>
                <td data-l="Tambahan">{r.addition.map((a) => <div key={a.ket}><small>{a.ket}{a.auto && ' · otomatis'}</small><br />{rupiah(a.nominal)}</div>)}{!r.addition.length && '—'}</td>
                <td data-l="Potongan">{r.deduction.map((a) => <div key={a.ket}><small>{a.ket}</small><br />{rupiah(a.nominal)}</div>)}{!r.deduction.length && '—'}</td>
                <td data-l="Net">{rupiah(r.calc.net)}</td>
                <td data-l="TANI">{rupiah(r.calc.tani)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sumrow"><span>Total bulan ini <strong>{rupiah(total)}</strong></span><span>Sisa kontrak <strong>{rupiah(sisa)}</strong></span></div>
      <p className="fine">Estimasi: TANI = net + iuran BPJS karyawan & perusahaan + PPh21 TER. Rumus final menunggu tim finance.</p>
      {rem.note && <p className="note bad">Catatan penolakan: {rem.note}</p>}
      <Modal open={ask === 'Rejected'} title="Tolak remunerasi" onClose={() => setAsk(null)} footer={<><Btn kind="ghost" onClick={() => setAsk(null)}>Batal</Btn><Btn kind="danger" disabled={!note.trim()} onClick={() => decide('Rejected')}>Tolak & kirim catatan</Btn></>}>
        <Field label="Alasan penolakan (wajib)" id="rej"><textarea id="rej" className="inp" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: lampiran surat permohonan belum ada" /></Field>
      </Modal>
      <Confirm open={ask === 'Approved'} text={`Setujui remunerasi ${rem.bulan} untuk ${rows.length} karyawan? Jenis selain Active akan dibuatkan dokumen di Send Document.`} onYes={() => decide('Approved')} onNo={() => setAsk(null)} yes="Setujui" />
    </Modal>
  )
}

function Approval() {
  const db = useDb()
  const toast = useToast()
  const [tab, setTab] = useState('remun')
  const [open, setOpen] = useState(null)
  return (
    <>
      <PageHead title="Approval" sub="Satu level, langsung ke admin HR" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'remun', label: 'Remunerasi' }, { id: 'job', label: 'Job Post' }]} />
      {tab === 'remun' && (
        <Card pad={false}>
          <Table onRow={(r) => setOpen(r)} cols={[
            { k: 'branch', label: 'Branch' }, { k: 'bulan', label: 'Periode' },
            { k: 'n', label: 'Karyawan', render: (r) => r.rows.length },
            { k: 'jenis', label: 'Jenis request', render: (r) => [...new Set(r.rows.map((x) => x.jenis))].join(', ') },
            { k: 'status', label: 'Status', render: (r) => <Status s={r.status} /> },
            { k: 'go', label: '', render: () => <Icon name="chev" /> },
          ]} rows={db.list('remunerations').filter((r) => r.status !== 'Draft')} />
        </Card>
      )}
      {tab === 'job' && (
        <Card pad={false}>
          <Table cols={[
            { k: 'p', label: 'Posisi', render: (r) => db.get('jobs', r.job)?.posisi },
            { k: 'branch', label: 'Branch' }, { k: 'diajukan', label: 'Diajukan' },
            { k: 'status', label: 'Status', render: (r) => <Status s={r.status} /> },
            { k: 'a', label: 'Aksi', render: (r) => r.status === 'Waiting' ? <div className="row gap"><Btn kind="ghost" onClick={() => { db.update('jobApprovals', r.id, { status: 'Rejected' }); toast('Job post ditolak', 'bad') }}>Tolak</Btn><Btn onClick={() => { db.update('jobApprovals', r.id, { status: 'Approved' }); db.update('jobs', r.job, { status: 'Active' }); toast('Lowongan tayang') }}>Setujui</Btn></div> : '—' },
          ]} rows={db.list('jobApprovals')} />
        </Card>
      )}
      <RemunDetail rem={open && db.get('remunerations', open.id)} onClose={() => setOpen(null)} />
    </>
  )
}

// ---------------- Send Document ----------------
function DocForm({ row, emp, onSave, onClose }) {
  const [mode, setMode] = useState(row.mode || 'New Contract Template')
  const c = hitung({ thp: emp.thp })
  return (
    <Modal open title={`${row.dokumen} · ${emp.nama}`} onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn onClick={() => onSave(mode)}>Simpan dokumen</Btn></>}>
      <Field label="Cara pembuatan" id="mode"><Select id="mode" value={mode} onChange={(e) => setMode(e.target.value)} options={MODES} /></Field>
      {mode === 'New Contract Template' && (
        <div className="form-grid">
          <Field label="Nomor surat" id="ns"><Input id="ns" defaultValue={`KRN/${row.dokumen.split(' ')[0].toUpperCase()}/XI/2026/014`} /></Field>
          <Field label="Tanggal surat" id="tg"><Input id="tg" type="date" defaultValue="2026-11-12" /></Field>
          <Field label="Mulai kontrak" id="mk"><Input id="mk" type="date" defaultValue={emp.masuk} /></Field>
          <Field label="Akhir kontrak" id="ak"><Input id="ak" type="date" defaultValue={emp.keluar} /></Field>
          <Field label="Take home pay (dari remunerasi)" id="thp"><Input id="thp" readOnly value={rupiah(emp.thp)} /></Field>
          <Field label="Gaji pokok 80% · tunjangan posisi 20%" id="gp"><Input id="gp" readOnly value={`${rupiah(c.gp)} · ${rupiah(c.tp)}`} /></Field>
          <Field label="Penanggung jawab (dari Setup › Document)" id="pj"><Input id="pj" defaultValue="Nadia Kusuma · HR Manager" /></Field>
          <Field label="Fasilitas (dari lowongan)" id="fs"><Input id="fs" defaultValue="BPJS Kesehatan, BPJS Ketenagakerjaan, THR" /></Field>
        </div>
      )}
      {mode !== 'New Contract Template' && (
        <div className="stack">
          {(mode === 'Existing Contract' ? ['Sent (opsional)', 'Employee Signed (opsional)', 'Full Signed (wajib)'] : ['Dokumen buatan sendiri']).map((s) => (
            <label key={s} className="drop"><Icon name="upload" /><span><strong>{s}</strong><small>PDF, maks. 2 MB</small></span><input type="file" accept=".pdf" /></label>
          ))}
        </div>
      )}
    </Modal>
  )
}

function Track({ row, emp, onClose }) {
  const stages = ['Sent', 'Employee Signed', 'Full Signed']
  const at = stages.indexOf(row.status)
  return (
    <Modal open title={`Track dokumen · ${emp.nama}`} onClose={onClose}>
      <p className="muted">{row.dokumen} · {row.mode}</p>
      <ol className="track">
        {stages.map((s, i) => <li key={s} className={i <= at ? 'done' : ''}><span className="dotc">{i <= at ? '✓' : i + 1}</span><div><strong>{s}</strong><small>{i <= at ? `${row.dokumen} ${emp.nama}.pdf · 12 Nov 2026` : 'Belum ada file'}</small></div><Btn kind="ghost" icon="upload">{i <= at ? 'Unggah ulang' : 'Unggah'}</Btn></li>)}
      </ol>
      <div className="row gap wrap"><Btn kind="ghost" icon="eye">Bukti persetujuan T&C talent</Btn><Btn kind="ghost" icon="chat">Kirim pengingat</Btn></div>
    </Modal>
  )
}

function SendDoc() {
  const db = useDb()
  const toast = useToast()
  const [open, setOpen] = useState(null)
  const [setelan, setSetelan] = useState(false)
  const [form, setForm] = useState(null)
  const [track, setTrack] = useState(null)
  const batch = open && db.get('docBatches', open)
  const setRow = (i, patch) => db.update('docBatches', batch.id, { rows: batch.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })
  if (batch) {
    const ready = batch.rows.filter((r) => r.dokumen !== '—')
    const allMade = ready.every((r) => r.made || r.status !== 'None')
    return (
      <>
        <button type="button" className="link-btn mb" onClick={() => setOpen(null)}><Icon name="back" size={18} />Semua batch</button>
        <PageHead title={`${batch.branch} · ${batch.bulan}`} sub={batch.setelan ? `Setelan pembuatan: ${batch.setelan}` : 'Pilih setelan pembuatan dokumen dulu'} actions={<><Btn kind="ghost" icon="gear" onClick={() => setSetelan(true)}>Setelan batch</Btn><Btn icon="send" disabled={!batch.setelan || !allMade || batch.status === 'Complete'} onClick={() => { db.update('docBatches', batch.id, { status: 'Complete', rows: batch.rows.map((r) => (r.dokumen !== '—' && r.status === 'None' ? { ...r, status: 'Sent' } : r)) }); toast('Terkirim ke Track Document, Inbox, dan email talent') }}>Send all</Btn></>} />
        {!batch.setelan && <p className="note warn">Tombol aksi terkunci sampai setelan batch dipilih.</p>}
        <Card pad={false}>
          <Table cols={[
            { k: 'p', label: 'Karyawan', render: (r) => <span className="who"><Avatar name={empOf(db, r.emp).nama} size={32} /><span><strong>{empOf(db, r.emp).nama}</strong><small>{r.jenis}</small></span></span> },
            { k: 'd', label: 'Dokumen', render: (r) => r.dokumen === '—' ? <span className="muted">Active · tanpa dokumen</span> : <select className="inp sm" aria-label="Jenis dokumen" disabled={!batch.setelan} value={r.dokumen} onChange={(e) => setRow(batch.rows.indexOf(r), { dokumen: e.target.value })}><option value="">Pilih dokumen</option>{DOCS.map((d) => <option key={d}>{d}</option>)}</select> },
            { k: 'a', label: 'Aksi', render: (r) => r.dokumen === '—' ? '—' : <div className="row gap"><Btn kind="ghost" icon="pen" disabled={!batch.setelan || !r.dokumen} onClick={() => setForm(batch.rows.indexOf(r))}>{r.made || r.status !== 'None' ? 'Edit' : 'Buat'}</Btn><button type="button" className="icon-btn" aria-label="Track dokumen" disabled={r.status === 'None'} onClick={() => setTrack(batch.rows.indexOf(r))}><Icon name="flag" /></button></div> },
            { k: 's', label: 'Status', render: (r) => r.dokumen === '—' ? <Badge>Tidak perlu</Badge> : <Status s={r.made && r.status === 'None' ? 'Draft' : r.status} /> },
          ]} rows={batch.rows} />
        </Card>
        <Modal open={setelan} title="Setelan pembuatan dokumen" onClose={() => setSetelan(false)}>
          <div className="stack">
            {[['Semua', 'Tiap karyawan di batch boleh beda cara pembuatan'], ['New Contract Manual', 'Karyawan baru, dokumen tidak sesuai template'], ['New Contract Template', 'Karyawan baru, dokumen dibuat dari template'], ['Existing Contract', 'Karyawan lama, dokumen sudah ditandatangani kedua pihak']].map(([k, d]) => (
              <button key={k} type="button" className={`opt ${batch.setelan === k ? 'on' : ''}`} onClick={() => { db.update('docBatches', batch.id, { setelan: k, rows: batch.rows.map((r) => ({ ...r, mode: k === 'Semua' ? r.mode || 'New Contract Template' : k })) }); setSetelan(false); toast(`Setelan: ${k}`) }}><strong>{k}</strong><small>{d}</small></button>
            ))}
          </div>
        </Modal>
        {form !== null && <DocForm row={batch.rows[form]} emp={empOf(db, batch.rows[form].emp)} onClose={() => setForm(null)} onSave={(mode) => { setRow(form, { made: true, mode }); setForm(null); toast('Dokumen tersimpan') }} />}
        {track !== null && <Track row={batch.rows[track]} emp={empOf(db, batch.rows[track].emp)} onClose={() => setTrack(null)} />}
      </>
    )
  }
  return (
    <>
      <PageHead title="Send Document" sub="Muncul otomatis setelah remunerasi disetujui" actions={<Btn kind="ghost" icon="download">Download semua Full Signed (.zip)</Btn>} />
      <div className="cards">
        {db.list('docBatches').map((b) => (
          <button type="button" key={b.id} className="batch" onClick={() => setOpen(b.id)}>
            <span className="batch-ic"><Icon name="doc" /></span>
            <span className="batch-t"><strong>{b.branch}</strong><small>{b.bulan} · {b.rows.length} karyawan · {b.setelan || 'setelan belum dipilih'}</small></span>
            <Status s={b.status} />
          </button>
        ))}
      </div>
    </>
  )
}

// ---------------- Disbursement ----------------
function Disbursement() {
  const db = useDb()
  const toast = useToast()
  const [fix, setFix] = useState(null)
  const flow = ['Draft', 'Reviewed', 'Confirmed', 'Waiting Transfer', 'Processing', 'Completed']
  return (
    <>
      <PageHead title="Disbursement" sub="Transfer gaji lewat Virtual Account (Midtrans)" />
      <p className="flowline">{flow.map((f) => <span key={f}>{f}</span>)}</p>
      <Card pad={false}>
        <Table cols={[
          { k: 'branch', label: 'Branch' }, { k: 'bulan', label: 'Periode' },
          { k: 'total', label: 'Total', render: (r) => rupiah(r.total) }, { k: 'orang', label: 'Orang' },
          { k: 'va', label: 'Nomor VA' },
          { k: 'status', label: 'Status', render: (r) => <><Status s={r.status} />{r.alasan && <small className="block muted">{r.alasan}</small>}</> },
          { k: 'a', label: 'Aksi', render: (r) => r.status === 'Failed' ? <Btn kind="ghost" onClick={() => setFix(r)}>Perbaiki & kirim ulang</Btn> : r.status === 'Waiting Transfer' ? <Btn onClick={() => { db.update('disbursements', r.id, { status: 'Completed' }); toast('Transfer selesai. Payslip terbit otomatis.') }}>Tandai selesai</Btn> : '—' },
        ]} rows={db.list('disbursements')} />
      </Card>
      <Modal open={!!fix} title="Perbaiki rekening" onClose={() => setFix(null)} footer={<><Btn kind="ghost" onClick={() => setFix(null)}>Batal</Btn><Btn onClick={() => { db.update('disbursements', fix.id, { status: 'Processing', alasan: undefined }); setFix(null); toast('Dikirim ulang') }}>Validasi & kirim ulang</Btn></>}>
        <p className="muted">{fix?.alasan}</p>
        <div className="form-grid">
          <Field label="Bank" id="bk"><Select id="bk" options={['BCA', 'BNI', 'BRI', 'Mandiri', 'Bank DKI']} /></Field>
          <Field label="Nomor rekening" id="nr"><Input id="nr" inputMode="numeric" defaultValue="1234567890" /></Field>
          <Field label="Nama pemilik rekening" id="np"><Input id="np" defaultValue="Teguh Santika" /></Field>
        </div>
      </Modal>
    </>
  )
}

// ---------------- Data Employee / Data Talent ----------------
function EmployeeTable({ scope }) {
  const db = useDb()
  const [q, setQ] = useState('')
  const [br, setBr] = useState('Semua Branch')
  const [st, setSt] = useState('Semua status')
  const [open, setOpen] = useState(null)
  const rows = db.list('employees').filter((e) => (!scope || e.branch === scope) && (br === 'Semua Branch' || e.branch === br) && (st === 'Semua status' || e.status === st) && e.nama.toLowerCase().includes(q.toLowerCase()))
  const counts = ['None', 'Sent', 'Employee Signed', 'Full Signed'].map((s) => ({ label: s, value: db.list('employees').filter((e) => e.status === s && (!scope || e.branch === scope)).length }))
  return (
    <>
      <Stats items={counts} />
      <div className="filters">
        <label className="search"><Icon name="search" size={18} /><input aria-label="Cari nama" placeholder="Cari nama" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {!scope && <Select aria-label="Branch" value={br} onChange={(e) => setBr(e.target.value)} options={['Semua Branch', ...db.list('branches').map((b) => b.nama)]} />}
        <Select aria-label="Status berkas" value={st} onChange={(e) => setSt(e.target.value)} options={['Semua status', 'None', 'Sent', 'Employee Signed', 'Full Signed']} />
      </div>
      <Card pad={false}>
        <Table onRow={setOpen} cols={[
          { k: 'nama', label: 'Karyawan', render: (e) => <span className="who"><Avatar name={e.nama} size={32} /><span><strong>{e.nama}</strong><small>{e.jabatan}</small></span></span> },
          { k: 'branch', label: 'Branch' },
          { k: 'berkas', label: 'Berkas' },
          { k: 'status', label: 'Status berkas', render: (e) => <Status s={e.status} /> },
          { k: 'jalur', label: 'Jalur' },
          { k: 'tipe', label: 'Tipe', render: (e) => <Badge tone={e.tipe === 'Kontrak' ? 'good' : e.tipe === 'Freelance' ? 'info' : 'warn'}>{e.tipe}</Badge> },
        ]} rows={rows} />
      </Card>
      <Modal open={!!open} title={open?.nama} onClose={() => setOpen(null)}>
        {open && <dl className="dl">
          {[['Jabatan', open.jabatan], ['Divisi', open.divisi], ['Branch', open.branch], ['Tipe karyawan', open.tipe], ['Skema remunerasi', open.skema], ['Shift', open.shift], ['Mulai kontrak', fmtDate(open.masuk)], ['Akhir kontrak', fmtDate(open.keluar)], ['Take home pay', rupiah(open.thp)], ['Dokumen terakhir', `${open.berkas} · ${open.status}`]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>}
      </Modal>
    </>
  )
}
function Employee() {
  const [tab, setTab] = useState('emp')
  return (
    <>
      <PageHead title="Data Employee" sub="Data Talent memakai tampilan yang sama" actions={<Btn kind="ghost" icon="download">Download semua</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'emp', label: 'Data Employee' }, { id: 'tal', label: 'Data Talent' }]} />
      <EmployeeTable />
    </>
  )
}

// ---------------- Talent Pool ----------------
export function TalentPool({ canOffer = true }) {
  const db = useDb()
  const toast = useToast()
  const [sel, setSel] = useState([])
  const [offer, setOffer] = useState(false)
  const [job, setJob] = useState('')
  const [st, setSt] = useState('Semua')
  const t = db.list('talents')
  const c = (s) => t.filter((x) => x.status === s).length
  const rows = t.filter((x) => st === 'Semua' || x.status === st)
  const send = () => {
    sel.forEach((id) => { db.add('offers', { talent: id, job, status: 'Menunggu', batas: '19 Nov 2026' }); db.update('talents', id, { status: 'Offered' }) })
    toast(`Tawaran terkirim ke ${sel.length} talent. Mereka yang memilih lanjut atau tidak.`)
    setSel([]); setOffer(false); setJob('')
  }
  return (
    <>
      <PageHead title="Talent Pool" sub="Kandidat yang belum lolos lowongan otomatis masuk ke sini" />
      <Stats items={[
        { label: 'Registered', value: c('Registered'), hint: 'Baru daftar, belum pre-test' },
        { label: 'Pending Assessment', value: c('Pending Assessment'), hint: 'Pre-test belum dinilai', tone: 'warn' },
        { label: 'Active Pool', value: c('Active Pool'), hint: 'Siap ditawari lowongan', tone: 'good' },
        { label: 'Offered', value: c('Offered'), hint: 'Menunggu jawaban talent' },
        { label: 'In Hiring', value: c('In Hiring Process'), hint: 'Sedang ikut seleksi' },
        { label: 'Hired', value: c('Hired') },
      ]} />
      <div className="filters">
        <Select aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)} options={['Semua', 'Registered', 'Pending Assessment', 'Active Pool', 'Offered', 'In Hiring Process', 'Hired']} />
        {canOffer && <Btn icon="send" disabled={!sel.length} onClick={() => setOffer(true)}>Offer to talent ({sel.length})</Btn>}
      </div>
      <div className="cards">
        {rows.map((x) => {
          const can = canOffer && x.status === 'Active Pool'
          return (
            <label key={x.id} className={`tcard ${sel.includes(x.id) ? 'on' : ''}`}>
              {can && <input type="checkbox" checked={sel.includes(x.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, x.id] : s.filter((i) => i !== x.id)))} aria-label={`Pilih ${x.nama}`} />}
              <Avatar name={x.nama} size={44} />
              <span className="tcard-b"><strong>{x.nama}</strong><small>{x.spesialisasi} · {x.pendidikan} · {x.pengalaman}</small><small>Ekspektasi {rupiah(x.ekspektasi)}{x.skor ? ` · skor ${x.skor}` : ''}{x.mitra !== '—' ? ` · ${x.mitra}` : ''}</small>{x.catatan && <small className="muted">{x.catatan}</small>}</span>
              <Status s={x.status} />
            </label>
          )
        })}
      </div>
      <Modal open={offer} title="Tawarkan lowongan" onClose={() => setOffer(false)} footer={<><Btn kind="ghost" onClick={() => setOffer(false)}>Batal</Btn><Btn disabled={!job} onClick={send}>Kirim tawaran</Btn></>}>
        <p className="muted">Talent mendapat notifikasi app & email, lalu memilih menerima atau menolak sampai batas waktu.</p>
        <div className="stack">
          {db.list('jobs').filter((j) => j.status === 'Active').map((j) => (
            <button key={j.id} type="button" className={`opt ${job === j.id ? 'on' : ''}`} onClick={() => setJob(j.id)}><strong>{j.posisi}</strong><small>{j.branch} · {rupiah(j.gaji[0])} – {rupiah(j.gaji[1])}</small></button>
          ))}
        </div>
      </Modal>
    </>
  )
}

// ---------------- Mitra ----------------
function Mitra() {
  const db = useDb()
  const toast = useToast()
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ nama: '', pic: '', email: '', telp: '' })
  return (
    <>
      <PageHead title="Mitra Talent Pool" sub="Penyedia talent. Password dikirim ke e-mail mitra." actions={<Btn icon="plus" onClick={() => setAdd(true)}>Buat akun mitra</Btn>} />
      <Card pad={false}>
        <Table cols={[
          { k: 'nama', label: 'Mitra', render: (m) => <span className="who"><Avatar name={m.nama} size={32} /><span><strong>{m.nama}</strong><small>{m.email}</small></span></span> },
          { k: 'pic', label: 'PIC' }, { k: 'telp', label: 'Telepon' },
          { k: 'talent', label: 'Talent' }, { k: 'diundang', label: 'Diundang' }, { k: 'diproses', label: 'Diproses' }, { k: 'terpilih', label: 'Terpilih' },
        ]} rows={db.list('mitra')} />
      </Card>
      <Modal open={add} title="Buat akun mitra" onClose={() => setAdd(false)} footer={<><Btn kind="ghost" onClick={() => setAdd(false)}>Batal</Btn><Btn disabled={!f.nama || !f.email} onClick={() => { db.add('mitra', { ...f, talent: 0, diundang: 0, diproses: 0, terpilih: 0 }); setAdd(false); setF({ nama: '', pic: '', email: '', telp: '' }); toast('Akun dibuat. Password dikirim ke e-mail mitra.') }}>Simpan</Btn></>}>
        <div className="form-grid">
          {[['nama', 'Nama mitra'], ['pic', 'Nama PIC'], ['email', 'E-mail'], ['telp', 'No. telepon']].map(([k, l]) => <Field key={k} label={l} id={`m-${k}`}><Input id={`m-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} type={k === 'email' ? 'email' : 'text'} /></Field>)}
        </div>
      </Modal>
    </>
  )
}

// ---------------- Pre-test ----------------
function Pretest() {
  const db = useDb()
  const toast = useToast()
  const [tab, setTab] = useState('modul')
  const [add, setAdd] = useState(false)
  const [scores, setScores] = useState({})
  const cats = ['Wawancara Mandiri', 'Tes Kepribadian', 'Tes Kompetensi']
  return (
    <>
      <PageHead title="Pre-test" sub="Dirangkai per lowongan; pre-test talent pool kelak juga bisa per lowongan" actions={tab === 'modul' && <Btn icon="plus" onClick={() => setAdd(true)}>Modul baru</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'modul', label: 'Modul tes' }, { id: 'nilai', label: 'Penilaian' }]} />
      {tab === 'modul' && cats.map((c) => (
        <section key={c} className="mb">
          <h2 className="h2">{c}</h2>
          <div className="mods">
            {db.list('pretests').filter((p) => p.kategori === c).map((p) => (
              <article key={p.id} className={`mod ${p.aktif ? 'on' : ''}`}>
                <Icon name={p.tipe === 'Live Recording' ? 'camera' : p.tipe === 'Upload Dokumen' ? 'upload' : p.tipe === 'Essay' ? 'pen' : 'test'} size={26} />
                <strong>{p.nama}</strong><small>{p.tipe} · {p.soal} soal · {p.durasi} menit</small>
                <Toggle id={`pt-${p.id}`} checked={p.aktif} onChange={(v) => db.update('pretests', p.id, { aktif: v })} label={p.aktif ? 'Dipakai' : 'Tidak dipakai'} />
              </article>
            ))}
          </div>
        </section>
      ))}
      {tab === 'nilai' && (
        <Card title="Belum dinilai · Business Team Staff">
          {db.list('candidates').filter((c) => c.tahap === 1 || c.skor === null).concat(db.list('talents').filter((t) => t.status === 'Pending Assessment')).map((c) => (
            <div key={c.id} className="grade">
              <span className="who"><Avatar name={c.nama} size={36} /><strong>{c.nama}</strong></span>
              <div className="grade-rows">
                {[['Tes Potensi Akademik', 'Otomatis', 82], ['Wawancara Mandiri', 'Manual'], ['Tes Excel', 'Manual']].map(([m, t, auto]) => (
                  <label key={m} className="grade-row"><span>{m}<small>{t}</small></span>{auto ? <strong>{auto}</strong> : <input className="inp sm" type="number" min="1" max="100" placeholder="1–100" aria-label={`Nilai ${m}`} value={scores[c.id + m] || ''} onChange={(e) => setScores({ ...scores, [c.id + m]: e.target.value })} />}</label>
                ))}
              </div>
              <Btn onClick={() => { if (c.status) db.update('talents', c.id, { status: 'Active Pool', skor: 80 }); else db.update('candidates', c.id, { skor: 80 }); toast(`Nilai ${c.nama} tersimpan`) }}>Simpan nilai</Btn>
            </div>
          ))}
        </Card>
      )}
      <Modal open={add} title="Modul tes baru" onClose={() => setAdd(false)} footer={<><Btn kind="ghost" onClick={() => setAdd(false)}>Batal</Btn><Btn onClick={() => { db.add('pretests', { nama: 'Modul baru', kategori: 'Tes Kompetensi', tipe: 'Pilihan Ganda', durasi: 20, soal: 10, aktif: false }); setAdd(false); toast('Modul dibuat') }}>Buat modul</Btn></>}>
        <div className="form-grid">
          <Field label="Judul tes" id="pj"><Input id="pj" placeholder="Contoh: Tes Coding Dasar" /></Field>
          <Field label="Jenis modul" id="pm"><Select id="pm" options={['Pilihan Ganda', 'Essay', 'Live Recording', 'Upload Dokumen']} /></Field>
          <Field label="Kategori" id="pk"><Select id="pk" options={cats} /></Field>
          <Field label="Durasi (menit)" id="pd"><Input id="pd" type="number" defaultValue={20} /></Field>
        </div>
      </Modal>
    </>
  )
}

// ---------------- Aktivitas (STA) ----------------
function ApproveCell({ col, r }) {
  const db = useDb()
  const toast = useToast()
  if (r.status !== 'Waiting') return <Status s={r.status} />
  return <div className="row gap"><Btn kind="ghost" onClick={() => { db.update(col, r.id, { status: 'Rejected' }); toast('Ditolak', 'bad') }}>Tolak</Btn><Btn onClick={() => { db.update(col, r.id, { status: 'Approved' }); toast('Disetujui (HR, approval akhir)') }}>Setujui</Btn></div>
}
function Aktivitas() {
  const db = useDb()
  const [tab, setTab] = useState('absen')
  const name = (r) => <span className="who"><Avatar name={empOf(db, r.emp).nama} size={30} /><strong>{empOf(db, r.emp).nama}</strong></span>
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
  const T = {
    absen: { col: 'attendance', cols: [{ k: 'e', label: 'Karyawan', render: name }, { k: 'masuk', label: 'Masuk' }, { k: 'pulang', label: 'Pulang' }, { k: 'lokasi', label: 'Lokasi' }, { k: 'status', label: 'Status', render: (r) => <Status s={r.status} /> }] },
    cuti: { col: 'leaves', cols: [{ k: 'e', label: 'Karyawan', render: name }, { k: 'kategori', label: 'Kategori' }, { k: 'tgl', label: 'Tanggal', render: (r) => `${fmtDate(r.dari)} – ${fmtDate(r.sampai)}` }, { k: 'hari', label: 'Hari' }, { k: 'line', label: 'Approval line', render: (r) => r.line.map((l) => `${l.level}: ${l.status}`).join(' → ') }, { k: 's', label: 'Status', render: (r) => <ApproveCell col="leaves" r={r} /> }] },
    lembur: { col: 'overtimes', cols: [{ k: 'e', label: 'Karyawan', render: name }, { k: 'judul', label: 'Pekerjaan' }, { k: 'tanggal', label: 'Tanggal', render: (r) => fmtDate(r.tanggal) }, { k: 'jam', label: 'Jam' }, { k: 'durasi', label: 'Durasi', render: (r) => `${r.durasi} jam` }, { k: 's', label: 'Status', render: (r) => <ApproveCell col="overtimes" r={r} /> }] },
    reimburse: { col: 'reimburses', cols: [{ k: 'e', label: 'Karyawan', render: name }, { k: 'jenis', label: 'Jenis' }, { k: 'judul', label: 'Keperluan' }, { k: 'nominal', label: 'Nominal', render: (r) => rupiah(r.nominal) }, { k: 's', label: 'Status', render: (r) => <ApproveCell col="reimburses" r={r} /> }] },
    inventory: { col: 'inventories', cols: [{ k: 'e', label: 'Karyawan', render: name }, { k: 'kategori', label: 'Kategori' }, { k: 'item', label: 'Item' }, { k: 'tanggal', label: 'Diserahkan', render: (r) => fmtDate(r.tanggal) }, { k: 'status', label: 'Status', render: (r) => <Status s={r.status} /> }] },
    resign: { col: 'resigns', cols: [{ k: 'e', label: 'Karyawan', render: name }, { k: 'alasan', label: 'Alasan' }, { k: 'lastDay', label: 'Hari terakhir', render: (r) => fmtDate(r.lastDay) }, { k: 'non', label: 'Akun nonaktif', render: (r) => `${fmtDate(addDays(r.lastDay, 14))} (H+14)` }, { k: 'inventory', label: 'Inventaris', render: (r) => <Status s={r.inventory} /> }, { k: 's', label: 'Status', render: (r) => <ApproveCell col="resigns" r={r} /> }] },
  }
  const cur = T[tab]
  return (
    <>
      <PageHead title="Aktivitas karyawan" sub="Absensi, cuti, lembur, reimburse, inventaris, resign" actions={<Btn kind="ghost" icon="download">Unduh rekap</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'absen', label: 'Absensi' }, { id: 'cuti', label: 'Cuti' }, { id: 'lembur', label: 'Lembur' }, { id: 'reimburse', label: 'Reimburse' }, { id: 'inventory', label: 'Inventaris' }, { id: 'resign', label: 'Resign' }]} />
      {tab === 'absen' && <p className="note">Input manual lewat sheet hanya untuk koreksi saat sistem bermasalah.</p>}
      <Card pad={false}><Table cols={cur.cols} rows={db.list(cur.col)} /></Card>
    </>
  )
}

// ---------------- Payslip ----------------
export function PayslipView({ emp }) {
  const c = hitung({ thp: emp.thp, skema: emp.skema })
  const normal = emp.skema === 'Normal'
  const earn = [['Gaji pokok', c.gp], ['Tunjangan posisi', c.tp], ...(normal ? [] : [])]
  const ded = normal ? [['BPJS Kesehatan (1%)', c.emp.kes], ['JHT karyawan (2%)', c.emp.jht], ['JP karyawan (1%)', c.emp.jp]] : []
  const ben = [['PPh 21 (TER ' + c.rate + '%)', c.pajak], ['JKK', c.co.jkk], ['JKM', c.co.jkm], ['JHT perusahaan', c.co.jht], ['JP perusahaan', c.co.jp], ['BPJS Kesehatan perusahaan', c.co.kes]]
  const sum = (a) => a.reduce((x, [, v]) => x + v, 0)
  return (
    <div className="slip">
      <header><strong>Slip gaji · November 2026</strong><span>{emp.nama} · {emp.jabatan} · {emp.tipe} · skema {emp.skema}</span></header>
      <div className="slip-g">
        <div><h4>Pendapatan</h4>{earn.map(([k, v]) => <p key={k}><span>{k}</span><span>{rupiah(v)}</span></p>)}<p className="tot"><span>Total</span><span>{rupiah(sum(earn))}</span></p></div>
        <div><h4>Potongan</h4>{ded.length ? ded.map(([k, v]) => <p key={k}><span>{k}</span><span>{rupiah(v)}</span></p>) : <p className="muted">Iuran ditanggung perusahaan (skema Khusus)</p>}<p className="tot"><span>Total</span><span>{rupiah(sum(ded))}</span></p></div>
      </div>
      <p className="thp"><span>Take home pay</span><strong>{rupiah(sum(earn) - sum(ded))}</strong></p>
      <div><h4>Ditanggung perusahaan (tidak masuk THP)</h4>{ben.map(([k, v]) => <p key={k}><span>{k}</span><span>{rupiah(v)}</span></p>)}</div>
      <p className="fine">Dokumen dibuat otomatis oleh sistem. Estimasi pajak memakai TER kategori A.</p>
    </div>
  )
}
function Payslip() {
  const db = useDb()
  const [open, setOpen] = useState(null)
  return (
    <>
      <PageHead title="Payslip" sub="Terbit otomatis setelah disbursement selesai" />
      <Card pad={false}><Table onRow={setOpen} cols={[{ k: 'nama', label: 'Karyawan', render: (e) => <span className="who"><Avatar name={e.nama} size={30} /><strong>{e.nama}</strong></span> }, { k: 'branch', label: 'Branch' }, { k: 'p', label: 'Periode', render: () => 'November 2026' }, { k: 'thp', label: 'THP', render: (e) => rupiah(e.thp) }, { k: 'g', label: '', render: () => <Icon name="eye" /> }]} rows={db.list('employees')} /></Card>
      <Modal open={!!open} title="Pratinjau payslip" onClose={() => setOpen(null)}>{open && <PayslipView emp={open} />}</Modal>
    </>
  )
}

// ---------------- Blast ----------------
function Blast() {
  const db = useDb()
  const toast = useToast()
  const [f, setF] = useState({ judul: '', isi: '', kepada: 'Semua Branch' })
  return (
    <>
      <PageHead title="Blast notification" sub="Pengumuman ke app & e-mail karyawan" />
      <div className="grid2">
        <Card title="Pesan baru">
          <div className="stack">
            <Field label="Kirim ke" id="bk"><Select id="bk" value={f.kepada} onChange={(e) => setF({ ...f, kepada: e.target.value })} options={['Semua Branch', ...db.list('branches').map((b) => b.nama)]} /></Field>
            <Field label="Judul" hint={`${40 - f.judul.length} karakter tersisa`} id="bj"><Input id="bj" maxLength={40} value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} /></Field>
            <Field label="Isi pesan" hint={`${160 - f.isi.length} karakter tersisa`} id="bi"><textarea id="bi" className="inp" rows={4} maxLength={160} value={f.isi} onChange={(e) => setF({ ...f, isi: e.target.value })} /></Field>
            <Btn icon="megaphone" disabled={!f.judul || !f.isi} onClick={() => { db.add('announcements', { ...f, tanggal: '2026-11-12' }); setF({ judul: '', isi: '', kepada: 'Semua Branch' }); toast('Pesan terkirim') }}>Kirim</Btn>
          </div>
        </Card>
        <Card title="Riwayat">
          <ul className="todo">{db.list('announcements').map((a) => <li key={a.id}><Icon name="megaphone" /><span><strong>{a.judul}</strong><small>{a.kepada} · {fmtDate(a.tanggal)}</small></span></li>)}</ul>
        </Card>
      </div>
    </>
  )
}

// ---------------- Setup ----------------
const PERM_GROUPS = {
  Rekrutmen: [['approval', 'Approval job post & remunerasi'], ['talentpool', 'Talent pool'], ['mitra', 'Mitra'], ['pretest', 'Pre-test & penilaian']],
  'Aktivitas karyawan': [['employee', 'Data employee'], ['aktivitas', 'Absensi, cuti, lembur, reimburse, inventaris, resign']],
  Payroll: [['senddoc', 'Send document'], ['disbursement', 'Disbursement'], ['payslip', 'Payslip']],
  Umum: [['dashboard', 'Dashboard'], ['blast', 'Blast notification'], ['setup', 'Setup']],
}
function Setup() {
  const db = useDb()
  const toast = useToast()
  const [tab, setTab] = useState('remun')
  const [s, setS] = useState(defaultSetup)
  const [admin, setAdmin] = useState(null)
  const co = (k, v) => setS({ ...s, co: { ...s.co, [k]: v } })
  const em = (k, v) => setS({ ...s, emp: { ...s.emp, [k]: v } })
  return (
    <>
      <PageHead title="Setup" sub="Pengaturan per Branch" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'remun', label: 'Remunerasi' }, { id: 'appr', label: 'Approval' }, { id: 'kal', label: 'Kalender & cuti' }, { id: 'admin', label: 'Admin & izin' }]} />
      {tab === 'remun' && (
        <div className="grid2">
          <Card title="Komponen gaji (%)">
            <div className="form-grid">
              <Field label="Basic salary" id="s1"><Input id="s1" type="number" value={s.basic} onChange={(e) => setS({ ...s, basic: +e.target.value, posisi: 100 - e.target.value })} /></Field>
              <Field label="Tunjangan posisi" id="s2"><Input id="s2" type="number" value={s.posisi} readOnly /></Field>
            </div>
            <h4 className="h4">Ditanggung perusahaan</h4>
            <div className="form-grid three">{Object.entries(s.co).map(([k, v]) => <Field key={k} label={k.toUpperCase()} id={`co-${k}`}><Input id={`co-${k}`} type="number" step="0.01" value={v} onChange={(e) => co(k, +e.target.value)} /></Field>)}</div>
            <h4 className="h4">Potongan karyawan (skema Normal)</h4>
            <div className="form-grid three">{Object.entries(s.emp).map(([k, v]) => <Field key={k} label={k.toUpperCase()} id={`em-${k}`}><Input id={`em-${k}`} type="number" step="0.01" value={v} onChange={(e) => em(k, +e.target.value)} /></Field>)}</div>
            <p className="fine">Skema Khusus: iuran karyawan ditanggung perusahaan. Persentase bisa di-override per karyawan.</p>
          </Card>
          <Card title="THR, KAK, absensi, dan resign">
            <div className="stack">
              <Field label="Batas UMR daerah" id="umr"><Input id="umr" value={rupiah(s.umr)} readOnly /></Field>
              <Field label="THR · komponen pengali" id="thr"><Select id="thr" value={s.thr.komponen} onChange={(e) => setS({ ...s, thr: { ...s.thr, komponen: e.target.value } })} options={['Gaji Pokok & Tunjangan Posisi', 'Gaji Pokok']} /></Field>
              <Field label="KAK · komponen pengali" id="kak"><Select id="kak" value={s.kak.komponen} onChange={(e) => setS({ ...s, kak: { ...s.kak, komponen: e.target.value } })} options={['Gaji Pokok', 'Gaji Pokok & Tunjangan Posisi']} /></Field>
              <Toggle id="ded" checked={s.deduksiAbsen} onChange={(v) => setS({ ...s, deduksiAbsen: v })} label="Potong gaji jika tidak masuk tanpa izin" />
              <p className="fine">Potongan = gaji dibayar ÷ hari kerja sebulan × hari tidak masuk.</p>
              <fieldset className="radio-set"><legend>Sisa cuti saat resign</legend>
                {[['hangus', 'Hangus'], ['diuangkan', 'Diuangkan']].map(([k, l]) => <label key={k}><input type="radio" name="sisa" checked={s.sisaCuti === k} onChange={() => setS({ ...s, sisaCuti: k })} />{l}</label>)}
              </fieldset>
              <Btn onClick={() => toast('Setup remunerasi tersimpan')}>Simpan</Btn>
            </div>
          </Card>
        </div>
      )}
      {tab === 'appr' && (
        <Card title="Approval per modul" action={<small className="muted">Muara akhir selalu admin HR</small>}>
          <div className="stack">
            {db.list('approvalSettings').map((a) => (
              <div key={a.id} className="appr">
                <Toggle id={`ap-${a.id}`} checked={a.aktif} onChange={(v) => db.update('approvalSettings', a.id, { aktif: v })} label={<strong>{a.id}</strong>} />
                <span className="chain">{a.levels.map((l, i) => <span key={l}>{i > 0 && <Icon name="chev" size={14} />}{l}</span>)}</span>
                <label className="inline">Batas <input className="inp sm" type="number" value={a.batas} onChange={(e) => db.update('approvalSettings', a.id, { batas: +e.target.value })} aria-label={`Batas hari ${a.id}`} /> hari</label>
              </div>
            ))}
          </div>
          <p className="fine">Tanpa auto-approve. Lewat batas waktu = otomatis tidak disetujui dan pengaju diberi notifikasi.</p>
        </Card>
      )}
      {tab === 'kal' && (
        <div className="grid2">
          <Card title="Libur & blackout dates">
            <ul className="todo">{db.list('holidays').map((h) => <li key={h.tanggal}><Icon name="cal" /><span><strong>{h.nama}</strong><small>{fmtDate(h.tanggal)}</small></span>{h.blackout && <Badge tone="bad">Tidak boleh cuti</Badge>}</li>)}</ul>
          </Card>
          <Card title="Kategori cuti">
            <Table cols={[{ k: 'id', label: 'Kategori' }, { k: 'kuota', label: 'Kuota/tahun' }, { k: 'carry', label: 'Carry over (bln)' }]} rows={db.list('leaveTypes')} />
            <p className="fine">Tanpa cuti setengah hari. Kuota prorata sisa kontrak; cuti tidak boleh melewati tanggal akhir kontrak.</p>
          </Card>
          <Card title="Jenis reimbursement">
            <Table cols={[{ k: 'id', label: 'Jenis' }, { k: 'limit', label: 'Limit per tahun', render: (r) => rupiah(r.limit) }]} rows={db.list('reimburseTypes')} />
          </Card>
        </div>
      )}
      {tab === 'admin' && (
        <Card pad={false} title="Akun admin" action={<Btn icon="plus">Tambah admin</Btn>}>
          <Table onRow={setAdmin} cols={[{ k: 'nama', label: 'Nama', render: (a) => <span className="who"><Avatar name={a.nama} size={30} /><span><strong>{a.nama}</strong><small>{a.email}</small></span></span> }, { k: 'role', label: 'Peran' }, { k: 'branches', label: 'Branch', render: (a) => a.branches.join(', ') }, { k: 'p', label: 'Menu', render: (a) => a.perms.includes('*') ? 'Semua' : `${a.perms.length} menu` }]} rows={db.list('admins')} />
        </Card>
      )}
      <Modal open={!!admin} title={`Izin menu · ${admin?.nama}`} onClose={() => setAdmin(null)} footer={<Btn onClick={() => { setAdmin(null); toast('Izin tersimpan') }}>Simpan</Btn>}>
        {admin && Object.entries(PERM_GROUPS).map(([g, items]) => (
          <fieldset key={g} className="perm"><legend>{g}</legend>
            {items.map(([k, l]) => <label key={k}><input type="checkbox" defaultChecked={admin.perms.includes('*') || admin.perms.includes(k)} disabled={admin.role === 'Superadmin'} />{l}</label>)}
          </fieldset>
        ))}
      </Modal>
    </>
  )
}

export const adminRoutes = [
  { id: 'dashboard', label: 'Dashboard', short: 'Beranda', icon: 'home', C: Dashboard, mobile: true },
  { id: 'approval', label: 'Approval', icon: 'check', C: Approval, mobile: true },
  { id: 'senddoc', label: 'Send Document', short: 'Dokumen', icon: 'send', C: SendDoc, mobile: true },
  { id: 'disbursement', label: 'Disbursement', icon: 'money', C: Disbursement },
  { id: 'employee', label: 'Data Employee', short: 'Karyawan', icon: 'users', C: Employee, mobile: true },
  { id: 'talentpool', label: 'Talent Pool', icon: 'star', C: () => <TalentPool /> },
  { id: 'mitra', label: 'Mitra', icon: 'handshake', C: Mitra },
  { id: 'pretest', label: 'Pre-test', icon: 'test', C: Pretest },
  { id: 'aktivitas', label: 'Aktivitas', icon: 'clock', C: Aktivitas },
  { id: 'payslip', label: 'Payslip', icon: 'receipt', C: Payslip },
  { id: 'blast', label: 'Blast notification', icon: 'megaphone', C: Blast },
  { id: 'setup', label: 'Setup', icon: 'gear', C: Setup },
]
export { EmployeeTable }
