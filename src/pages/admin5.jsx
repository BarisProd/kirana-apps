// Revisi 16 Nov sore: Approval Remunerasi (detail = halaman), Send Document (alur penuh), Setup Dokumen (template bertanda).
import React, { useRef, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { rupiah, calcRow, totals, parsePeriod } from '../services/payrollScala.js'
import { Btn, Card, Badge, Table, Tabs, Modal, Field, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { Sticker, ArtHead } from '../components/Sticker.jsx'
import { useLookup, fmtDate } from './shared.jsx'
import { exportExcel, save } from '../services/export.js'
import { buildRemunXlsx } from '../services/remunXlsx.js'
import { RichEditor, DocView } from './docEditor.jsx'
import { DOC_TYPES, DATA_FIELDS, PJ_FIELDS, ALL_FIELDS, DEFAULT_TEMPLATES, toHtml, tokensIn, fill, fieldValues, isDownloadable, downloadContracts, textPdf, readTemplateFile, nomorSurat } from '../services/docs.js'

const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const Crumb = ({ items }) => <nav className="crumb" aria-label="Breadcrumb">{items.map((x, i) => (i < items.length - 1 ? <React.Fragment key={i}><button onClick={x[1]}>{x[0]}</button><span>›</span></React.Fragment> : <b key={i}>{x[0]}</b>))}</nav>
const Sel = ({ label, value, onChange, all, opts }) => <label className="fsel"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{all && <option value="">{all}</option>}{opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select></label>
const Search = ({ value, onChange, ph }) => <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={18} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} aria-label={ph} /></span></label>
const tplText = (s, d) => s.docTemplates[d]?.text || DEFAULT_TEMPLATES[d] || ''

// =====================================================================
// Approval Remunerasi
// =====================================================================
export function ApprovalRemun({ go, sub }) {
  const s = useStore(); const { branch, emp } = useLookup(); const [t, toast] = useToast()
  const [fy, setFy] = useState(''); const [fm, setFm] = useState(''); const [fb, setFb] = useState(''); const [fs, setFs] = useState('')
  const xls = (x) => { try { exportExcel({ title: `Remunerasi ${branch(x.branch)} - ${x.bulan}`, meta: `${x.rows.length} karyawan | status ${x.status}`, cols: ['Nama', 'Tipe', 'Jenis Request', 'Take Home Pay', 'Tanggal Masuk', 'Tanggal Akhir'], rows: x.rows.map((w) => [emp(w.emp).name, w.type || emp(w.emp).type, w.jenis, w.thp, w.start || emp(w.emp).start, w.end || emp(w.emp).end]), file: `remunerasi_${x.branch}_${(x.bulan || '').replace(' ', '-')}` }); toast('Excel remunerasi diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  if (sub) { const r = s.remunerations.find((x) => x.id === sub); return r ? <RemunDetail r={r} go={go} xls={xls} toast={toast} t={t} /> : <><Crumb items={[['Approval Remunerasi', () => go('approval-remunerasi')], ['Tidak ditemukan']]} /><Empty text="Pengajuan tidak ditemukan." /></> }
  const all = s.remunerations.filter((r) => r.status !== 'Draft')
  const years = [...new Set(all.map((r) => (r.bulan || '').split(' ')[1]).filter(Boolean))]
  const rows = all.filter((r) => (!fy || (r.bulan || '').endsWith(fy)) && (!fm || (r.bulan || '').startsWith(fm)) && (!fb || r.branch === fb) && (!fs || r.status === fs)).sort((a, b) => (a.status === 'In Review' ? 0 : 1) - (b.status === 'In Review' ? 0 : 1))
  const disb = (x) => s.disbursements.find((d) => d.branch === x.branch && d.bulan === x.bulan)
  return (
    <>
      <PageHead title="Approval Remunerasi" sub="Setelah disetujui: jenis selain Active otomatis masuk Send Document, dan pembayaran masuk Disbursement."><span className="review-pill">Perlu ditinjau: <b>{all.filter((x) => x.status === 'In Review').length}</b></span></PageHead>
      <div className="filters">
        <Sel label="Tahun" value={fy} onChange={setFy} all="Semua tahun" opts={years} /><Sel label="Bulan" value={fm} onChange={setFm} all="Semua bulan" opts={BLN} />
        <Sel label="Branch" value={fb} onChange={setFb} all="Semua Branch" opts={s.branches.map((x) => [x.id, x.name])} /><Sel label="Status" value={fs} onChange={setFs} all="Semua status" opts={['In Review', 'Approved', 'Rejected']} />
      </div>
      <Card pad={false}><Table center rows={rows} empty="Tidak ada pengajuan untuk filter ini." cols={[{ h: 'Branch', r: (x) => <div className="who"><Avatar name={branch(x.branch).replace('Branch ', '')} size={32} /><strong>{branch(x.branch)}</strong></div> }, { h: 'Bulan', k: 'bulan' }, { h: 'Karyawan', r: (x) => x.rows.length + ' orang' }, { h: 'THR/KAK', r: (x) => [x.thr && 'THR', x.kak && 'KAK'].filter(Boolean).join(' · ') || '—' }, { h: 'Lampiran', r: (x) => x.files?.length || 0 }, { h: 'Status', r: (x) => <Badge>{x.status}</Badge> },
        { h: 'Action', r: (x) => <div className="row-act">
          <button className="icon-btn" title="Unduh Excel" aria-label="Unduh Excel" onClick={() => xls(x)}><Icon name="download" size={18} /></button>
          <Btn kind="ghost" onClick={() => go('approval-remunerasi/' + x.id)}>Detail</Btn>
          {x.status === 'Approved' && (() => { const ok = disb(x)?.status === 'Completed'; return <Btn kind="ghost" className={ok ? 'btn-ok' : 'btn-warn'} icon={ok ? 'checkCircle' : 'clock'} title={ok ? 'Disbursement selesai' : 'Disbursement belum selesai'} onClick={() => go('disbursement')}>Disbursement</Btn> })()}</div> }]} /></Card>{t}
    </>
  )
}

function RemunDetail({ r, go, xls, toast, t }) {
  const s = useStore(); const { branch, emp } = useLookup()
  const [q, setQ] = useState(''); const [att, setAtt] = useState(false); const [eye, setEye] = useState(null); const [note, setNote] = useState(''); const [rej, setRej] = useState(false); const [yes, setYes] = useState(false)
  const [bulan, tahun] = (r.bulan || '').split(' ')
  const rows = r.rows.map((w) => ({ ...w, e: emp(w.emp), c: calcRow(w, s.setup) }))
  const list = rows.filter((w) => w.e.name.toLowerCase().includes(q.toLowerCase()))
  const total = rows.reduce((a, w) => a + w.c.tani, 0)
  const sisa = totals(r.rows.map((w) => ({ ...w, type: w.type || emp(w.emp).type, start: w.start || emp(w.emp).start, end: w.end || emp(w.emp).end })), parsePeriod(r.bulan), s.setup).sisa
  const batch = s.docBatches.find((b) => b.remun === r.id)
  const file = `remunerasi_${r.branch}_${(r.bulan || '').replace(' ', '-')}.xlsx`
  return (
    <>
      <Crumb items={[['Approval Remunerasi', () => go('approval-remunerasi')], [`${branch(r.branch)} · ${r.bulan}`]]} />
      <PageHead title="Approval Remunerasi – Detail" sub={branch(r.branch)}><Badge>{r.status}</Badge></PageHead>
      <div className="filters">
        <label className="fsel"><span>Tahun</span><input value={tahun || ''} readOnly /></label><label className="fsel"><span>Bulan</span><input value={bulan || ''} readOnly /></label>
        <span className="review-pill">Total Karyawan: <b>{r.rows.length} Orang</b></span>
        <Btn kind="ghost" icon="doc" onClick={() => setAtt(true)}>Attached ({r.files?.length || 0})</Btn>
        <Search value={q} onChange={setQ} ph="Cari nama karyawan" />
      </div>
      {r.note && <Note>Catatan penolakan: {r.note}</Note>}
      <Card pad={false}><Table center rows={list} empty="Tidak ada karyawan dengan nama itu." cols={[
        { h: 'Karyawan', r: (w) => <div className="who"><Avatar name={w.e.name} size={34} /><strong>{w.e.name}</strong></div> },
        { h: 'Tipe Karyawan', r: (w) => w.type || w.e.type }, { h: 'Take Home Pay', r: (w) => rupiah(w.c.thp) },
        { h: 'Tanggal Masuk', r: (w) => fmtDate(w.start || w.e.start) }, { h: 'Tanggal Akhir', r: (w) => fmtDate(w.end || w.e.end) },
        { h: 'Jenis Request', r: (w) => <Badge t="neutral">{w.jenis}</Badge> },
        { h: 'Rincian', r: (w) => <button className="icon-btn" title="Lihat rincian" aria-label={'Lihat rincian ' + w.e.name} onClick={() => setEye(w)}><Icon name="eye" size={18} /></button> }]} /></Card>
      <div className="grid2">
        <Card title="Total Pengeluaran Budget"><div className="budget"><div><small>Bulan Ini</small><strong>{rupiah(total)}</strong></div><div><small>Sisa Kontrak</small><strong>{rupiah(sisa)}</strong></div><p className="muted sm">Rumus sama dengan simulasi Branch (diturunkan dari file Scala). Sisa Kontrak = biaya rutin × sisa bulan + estimasi KAK.</p></div></Card>
        <Card title="Dokumen Rincian Remunerasi"><div className="batch-row"><span className="file-ic">XLS</span><div className="grow"><strong>Remunerasi {r.bulan}.xlsx</strong><div className="muted sm">{r.rows.length} karyawan · file simulasi yang sama dengan milik Branch (Perbulan, Sisa Kontrak, Rincian, Parameter, TER)</div></div><Btn kind="ghost" icon="download" onClick={async () => { try { await save(buildRemunXlsx({ remun: r, s, branchName: branch(r.branch) }), `Remunerasi ${branch(r.branch)} ${r.bulan}.xlsx`); toast('File simulasi diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }}>Download</Btn></div></Card>
      </div>
      <div className="page-foot">
        <Btn kind="ghost" onClick={() => go('approval-remunerasi')}>Kembali</Btn>
        {r.status === 'In Review' && <><Btn kind="ghost" icon="x" onClick={() => setRej(true)}>Reject</Btn><Btn icon="check" onClick={() => setYes(true)}>Accept</Btn></>}
        {r.status === 'Approved' && <>{batch && <Btn kind="ghost" icon="send" onClick={() => go('send-document/' + batch.id)}>Send Document</Btn>}<Btn kind="ghost" onClick={() => go('disbursement')}>Disbursement</Btn></>}
      </div>
      <Modal open={att} title="Attached" onClose={() => setAtt(false)} footer={<Btn kind="ghost" onClick={() => setAtt(false)}>Close</Btn>}>{r.files?.length ? <div className="batch-list">{r.files.map((f) => <div key={f} className="batch-row"><Icon name="doc" /><strong className="grow">{f}</strong></div>)}</div> : <Empty text="Branch tidak melampirkan dokumen." />}</Modal>
      <Modal open={!!eye} title={eye ? eye.e.name : ''} onClose={() => setEye(null)} footer={<Btn kind="ghost" onClick={() => setEye(null)}>Close</Btn>}>
        {eye && <><dl className="dl"><dt>Posisi</dt><dd>{eye.e.role}</dd><dt>Jenis Request</dt><dd>{eye.jenis}</dd><dt>Skema</dt><dd>{eye.skema || 'Normal'}</dd><dt>Take Home Pay</dt><dd>{rupiah(eye.c.thp)}</dd><dt>Gaji Pokok</dt><dd>{rupiah(eye.c.gp)}</dd><dt>Tunjangan Posisi</dt><dd>{rupiah(eye.c.tp)}</dd><dt>Tambahan</dt><dd>{rupiah(eye.c.add)}</dd><dt>Potongan</dt><dd>{rupiah(eye.c.ded + (eye.skema === 'Khusus' ? 0 : eye.c.empTotal))}</dd><dt>Net dibayar</dt><dd>{rupiah(eye.c.net)}</dd><dt>TANI</dt><dd>{rupiah(eye.c.tani)}</dd></dl>
          {[...(eye.additions || []).map((a) => ['+', a]), ...(eye.deductions || []).map((a) => ['−', a])].map(([sg, a], i) => <p key={i} className="muted sm">{sg} {a.keperluan}: {rupiah(a.nominal)}</p>)}</>}
      </Modal>
      <Modal open={yes} title="Konfirmasi" onClose={() => setYes(false)} footer={<><Btn kind="ghost" onClick={() => setYes(false)}>Batal</Btn><Btn onClick={() => { api.decideRemun(r.id, true); setYes(false); toast('Disetujui. Dokumen & disbursement dibuat') }}>Yakin</Btn></>}><div className="center"><span className="q-ic">?</span><p>Anda akan menyetujui pengajuan remunerasi ini.<br />Anda yakin?</p></div></Modal>
      <Modal open={rej} title="Notes" onClose={() => setRej(false)} footer={<Btn disabled={!note.trim()} onClick={() => { api.decideRemun(r.id, false, note.trim()); setRej(false); setNote(''); toast('Pengajuan dikembalikan ke Branch') }}>Submit</Btn>}>
        <Field label="Catatan penolakan" hint="Wajib diisi. Catatan ini dibaca Branch pengaju."><textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>{t}
    </>
  )
}

// =====================================================================
// Send Document
// =====================================================================
const SETELAN = [
  ['Semua', 'Setelan ditentukan per orang di tabel.'],
  ['New Contract Manual', 'Dokumen dibuat di luar sistem, lalu diunggah per orang.'],
  ['New Contract Template', 'Dokumen dibuat otomatis dari template di Setup Dokumen.'],
  ['Existing Contract', 'Kontrak sudah berjalan: cukup unggah dokumen yang sudah ditandatangani.'],
]
const modeOf = (b, it) => (b.setelan === 'Semua' ? it.setelan || 'New Contract Template' : b.setelan)
const STAGES = [['Sent', 'optional'], ['Employee Signed', 'optional'], ['Full Signed', 'required']]

function useDocs() {
  const s = useStore(); const { branch, emp } = useLookup()
  const textOf = (b, it) => { if (it.text) return it.text; const remun = s.remunerations.find((r) => r.id === b.remun); const e = emp(it.emp); return fill(tplText(s, it.dokumen), { ...fieldValues({ e, row: remun?.rows.find((r) => r.emp === it.emp), pj: s.docPJ, nomor: it.nomor || '(belum ada nomor)', today: new Date().toISOString().slice(0, 10), setup: s.setup }), ...(it.override || {}) }) }
  const signed = (batches) => batches.flatMap((b) => b.items.filter((it) => it.status === 'Full Signed' && isDownloadable(it.dokumen)).map((it) => ({ folder: `${branch(b.branch)} - ${b.bulan}`, nama: emp(it.emp).name, dokumen: it.dokumen, text: textOf(b, it) })))
  return { s, branch, emp, textOf, signed }
}

export function SendDocument({ go, sub }) {
  const { s, branch, signed } = useDocs(); const [t, toast] = useToast()
  const [fy, setFy] = useState(''); const [fm, setFm] = useState(''); const [fb, setFb] = useState(''); const [fd, setFd] = useState(''); const [fs, setFs] = useState('')
  const zip = async (batches, name) => { const e = signed(batches); if (!e.length) return toast('Belum ada Offering Letter / PKWT yang Full Signed'); try { await downloadContracts(e, name); toast(`${e.length} dokumen Full Signed diunduh (zip per folder)`) } catch (err) { toast('Unduhan diblokir di pratinjau ini') } }
  if (sub) { const b = s.docBatches.find((x) => x.id === sub); return b ? <BatchPage b={b} go={go} zip={zip} toast={toast} t={t} /> : <><Crumb items={[['Send Document', () => go('send-document')], ['Tidak ditemukan']]} /><Empty text="Batch tidak ditemukan." /></> }
  const years = [...new Set(s.docBatches.map((b) => b.bulan.split(' ')[1]))]
  const list = s.docBatches.filter((b) => (!fy || b.bulan.endsWith(fy)) && (!fm || b.bulan.startsWith(fm)) && (!fb || b.branch === fb) && (!fs || b.status === fs) && (!fd || b.items.some((i) => i.dokumen === fd)))
  return (
    <>
      <ArtHead art="kontrak" title="Send Document" sub="Remunerasi disetujui → atur setelan → pilih tipe dokumen → Generate All → review sampling → Send All → lacak tanda tangan.">
        <span className="review-pill">Perlu Ditinjau: <b>{s.docBatches.filter((b) => b.status === 'Process').length}</b></span>
        <Btn icon="download" onClick={() => zip(list, 'kontrak-full-signed')}>Download All</Btn>
      </ArtHead>
      <div className="filters">
        <Sel label="Tahun" value={fy} onChange={setFy} all="Semua tahun" opts={years} /><Sel label="Bulan" value={fm} onChange={setFm} all="Semua bulan" opts={BLN} />
        <Sel label="Branch" value={fb} onChange={setFb} all="Semua Branch" opts={s.branches.map((x) => [x.id, x.name])} /><Sel label="Berkas" value={fd} onChange={setFd} all="Semua berkas" opts={DOC_TYPES} /><Sel label="Status" value={fs} onChange={setFs} all="Semua status" opts={['Process', 'Complete']} />
      </div>
      <p className="muted sm">Download All hanya mengambil dokumen <b>Full Signed</b> berjenis Offering Letter & PKWT, dibungkus zip dengan satu folder per batch dan per karyawan.</p>
      {list.length === 0 ? <Empty text="Tidak ada batch untuk filter ini." /> : <div className="batch-list">{list.map((b) => { const done = b.items.filter((i) => i.status === 'Full Signed').length; return (
        <Card key={b.id}><div className="batch-row">
          <Avatar name={branch(b.branch).replace('Branch ', '')} size={40} />
          <div className="grow"><strong>{branch(b.branch)} · {b.bulan}</strong><div className="muted sm">{b.items.length} dokumen · {done} Full Signed · setelan: {b.setelan || 'belum diatur'}</div></div>
          <Badge t="ok">Approved</Badge><Badge>{b.status}</Badge>
          {b.remun && s.remunerations.some((r) => r.id === b.remun) && <button className="icon-btn" title="Lihat remunerasi" aria-label="Lihat remunerasi" onClick={() => go('approval-remunerasi/' + b.remun)}><Icon name="eye" size={18} /></button>}
          <button className="icon-btn" title="Unduh Full Signed (zip)" aria-label="Unduh Full Signed" onClick={() => zip([b], `kontrak_${branch(b.branch)}_${b.bulan}`)}><Icon name="download" size={18} /></button>
          <Btn onClick={() => go('send-document/' + b.id)}>Buka</Btn>
        </div></Card>) })}</div>}{t}
    </>
  )
}

function BatchPage({ b, go, zip, toast, t }) {
  const { s, branch, emp, textOf } = useDocs()
  const [set, setSet] = useState(!b.setelan); const [pick, setPick] = useState(b.setelan || 'New Contract Template'); const [edit, setEdit] = useState(null); const [track, setTrack] = useState(null); const [samp, setSamp] = useState(null); const [send, setSend] = useState(false); const [msg, setMsg] = useState(false); const [out, setOut] = useState(null); const [add, setAdd] = useState(null)
  const others = s.employees.filter((x) => x.branch === b.branch && !b.items.some((i) => i.emp === x.id))
  const pending = b.items.filter((i) => i.status === 'None'); const tplItems = pending.filter((i) => modeOf(b, i) === 'New Contract Template')
  const ready = pending.filter((i) => i.ready); const notReady = pending.filter((i) => !i.ready)
  const sentAny = b.items.some((i) => i.status !== 'None')
  const step = !b.setelan ? 0 : tplItems.some((i) => !i.generated) ? 2 : pending.length && !b.reviewed ? 3 : pending.length ? 4 : 5
  const STEPS = ['Setelan batch', 'Tipe dokumen per orang', 'Generate All', 'Review sampling', 'Send All', 'Lacak tanda tangan']
  const sample = () => { const pool = pending.filter((i) => i.ready); const n = Math.min(pool.length, Math.max(3, Math.ceil(pool.length * 0.1))); const sh = [...pool].sort(() => Math.random() - 0.5).slice(0, n); setSamp({ list: sh.map((i) => i.emp), at: 0, ok: false }) }
  const cols = [
    { h: 'Profil', r: (i) => <div className="who"><Avatar name={emp(i.emp).name} size={34} /><div><strong>{emp(i.emp).name}</strong><div className="muted sm">{emp(i.emp).role} · {i.jenis}</div></div></div> },
    ...(b.setelan === 'Semua' ? [{ h: 'Setelan', r: (i) => <select aria-label="Setelan dokumen" disabled={i.status !== 'None'} value={i.setelan || 'New Contract Template'} onChange={(e) => api.editDoc(b.id, i.emp, { setelan: e.target.value, ready: false, generated: false, text: '' })}>{SETELAN.slice(1).map((x) => <option key={x[0]}>{x[0]}</option>)}</select> }] : []),
    { h: 'Dokumen', r: (i) => <select aria-label="Tipe dokumen" disabled={i.status !== 'None'} value={i.dokumen} onChange={(e) => api.editDoc(b.id, i.emp, { dokumen: e.target.value, ready: false, generated: false, text: '', nomor: '' })}>{DOC_TYPES.map((d) => <option key={d}>{d}</option>)}</select> },
    { h: 'Tombol Aksi', r: (i) => <div className="row-act nowrap">
      <button className="icon-btn" title={i.status === 'None' ? 'Buat / edit dokumen' : 'Lihat dokumen'} aria-label={'Dokumen ' + emp(i.emp).name} onClick={() => setEdit(i.emp)}><Icon name={i.status === 'None' ? 'edit' : 'eye'} size={18} /></button>
      <button className="icon-btn" title="Track document" aria-label={'Track ' + emp(i.emp).name} onClick={() => setTrack(i.emp)}><Icon name="clock" size={18} /></button>
      <button className="icon-btn" title="Kirim pengingat" aria-label={'Pengingat ' + emp(i.emp).name} disabled={i.status !== 'Sent'} onClick={() => toast('Pengingat dikirim ke inbox ' + emp(i.emp).name.split(' ')[0])}><Icon name="mail" size={18} /></button>
      <button className="icon-btn" title="Keluarkan dari batch" aria-label={'Keluarkan ' + emp(i.emp).name} disabled={i.status !== 'None'} onClick={() => setOut(i.emp)}><Icon name="x" size={18} /></button></div> },
    { h: 'Status', r: (i) => (i.status === 'None' ? <Badge t={i.ready ? 'ok' : 'warn'}>{i.ready ? 'Siap dikirim' : 'Belum dibuat'}</Badge> : <Badge>{i.status}</Badge>) },
  ]
  return (
    <>
      <Crumb items={[['Send Document', () => go('send-document')], [`${branch(b.branch)} · ${b.bulan}`]]} />
      <PageHead title={`${branch(b.branch)} · ${b.bulan}`} sub={`${b.items.length} dokumen · setelan: ${b.setelan || 'belum diatur'}`}>
        <Badge t="ok">Approved</Badge><Badge>{b.status}</Badge>
        {b.remun && s.remunerations.some((r) => r.id === b.remun) && <button className="icon-btn" title="Lihat remunerasi" aria-label="Lihat remunerasi" onClick={() => go('approval-remunerasi/' + b.remun)}><Icon name="eye" size={18} /></button>}
        <button className="icon-btn" title="Setelan batch" aria-label="Setelan batch" disabled={sentAny && !pending.length} onClick={() => { setPick(b.setelan || 'New Contract Template'); setSet(true) }}><Icon name="settings" size={18} /></button>
        <button className="icon-btn" title="Template pesan" aria-label="Template pesan" onClick={() => setMsg(true)}><Icon name="mail" size={18} /></button>
        <button className="icon-btn" title="Unduh Full Signed (zip)" aria-label="Unduh Full Signed" onClick={() => zip([b], `kontrak_${branch(b.branch)}_${b.bulan}`)}><Icon name="download" size={18} /></button>
      </PageHead>
      <ol className="sflow">{STEPS.map((x, i) => <li key={x} className={i < step ? 'done' : i === step ? 'now' : ''}><i>{i < step ? '✓' : i + 1}</i><span>{x}</span></li>)}</ol>
      <div className="sflow-act">
        <Btn kind={step === 2 ? 'primary' : 'ghost'} icon="layers" disabled={!b.setelan || !tplItems.length} onClick={() => { api.generateAll(b.id); api.setBatch(b.id, (x) => { x.reviewed = false }); toast(`${tplItems.length} dokumen dibuat dari template`) }}>Generate All Document</Btn>
        <Btn kind={step === 3 ? 'primary' : 'ghost'} icon="eye" disabled={!ready.length} onClick={sample}>Review Sampling</Btn>
        <Btn kind={step === 4 ? 'primary' : 'ghost'} icon="send" disabled={!ready.length || !b.reviewed} onClick={() => setSend(true)}>Send All</Btn>
        <Btn kind="ghost" icon="plus" disabled={!others.length} onClick={() => setAdd({ emp: others[0].id, dokumen: DOC_TYPES[0] })}>Add Document</Btn>
      </div>
      {b.setelan && notReady.length > 0 && <Note>{notReady.length} dokumen belum siap. {notReady.some((i) => modeOf(b, i) === 'New Contract Template') ? 'Tekan Generate All Document untuk yang berbasis template. ' : ''}{notReady.some((i) => modeOf(b, i) !== 'New Contract Template') ? 'Yang Manual / Existing Contract perlu diunggah lewat tombol dokumen di barisnya.' : ''}</Note>}
      {ready.length > 0 && !b.reviewed && <Note>Tinjau sampel dulu sebelum Send All, supaya salah isi ketahuan sebelum sampai ke karyawan.</Note>}
      <Card pad={false}><Table center rows={b.items} empty="Semua orang sudah dikeluarkan dari batch ini." cols={cols} /></Card>

      <Modal open={set} title="Setelan pembuatan dokumen" onClose={() => setSet(false)} footer={<><Btn kind="ghost" onClick={() => setSet(false)}>Batal</Btn><Btn onClick={() => { api.setBatch(b.id, (x) => { if (x.setelan !== pick) { x.setelan = pick; x.reviewed = false; x.items.forEach((i) => { if (i.status === 'None') { i.ready = false; i.generated = false; i.text = '' } }) } }); setSet(false); toast('Setelan batch: ' + pick) }}>Terapkan</Btn></>}>
        <p className="muted">Berlaku untuk dokumen di batch ini yang belum dikirim.</p>
        <div className="opt-list">{SETELAN.map(([v, d]) => <label key={v} className={`opt ${pick === v ? 'on' : ''}`}><input type="radio" name="setelan" checked={pick === v} onChange={() => setPick(v)} /><span><strong>{v}</strong><small>{d}</small></span></label>)}</div>
      </Modal>
      {edit && <DocEditor b={b} empId={edit} onClose={() => setEdit(null)} toast={toast} />}
      {track && <TrackModal b={b} empId={track} onClose={() => setTrack(null)} toast={toast} />}
      <Modal wide open={!!samp} title="Review sampling" onClose={() => setSamp(null)} footer={samp && <><Btn kind="ghost" onClick={sample}>Acak sampel lain</Btn><Btn kind="ghost" icon="edit" onClick={() => { const e = samp.list[samp.at]; setSamp(null); setEdit(e) }}>Edit dokumen ini</Btn><Btn disabled={!samp.ok} onClick={() => { api.setBatch(b.id, (x) => { x.reviewed = true }); setSamp(null); toast('Sampel ditandai sudah ditinjau. Send All aktif') }}>Sampel sudah benar</Btn></>}>
        {samp && (() => { const it = b.items.find((i) => i.emp === samp.list[samp.at]); if (!it) return <Empty text="Sampel tidak tersedia." />; return <>
          <p className="muted">Sistem mengambil {samp.list.length} dari {ready.length} dokumen siap kirim secara acak. Cek nama, nomor surat, nominal, dan tanggalnya.</p>
          <Tabs tabs={samp.list.map((e, i) => ({ v: String(i), l: emp(e).name.split(' ')[0] }))} value={String(samp.at)} onChange={(v) => setSamp({ ...samp, at: Number(v) })} />
          <div className="muted sm">{it.dokumen} · {modeOf(b, it)}{it.file ? ' · berkas: ' + it.file : ''}</div>
          {modeOf(b, it) === 'New Contract Template' ? <DocView html={textOf(b, it)} /> : <Note>Dokumen ini diunggah manual ({it.file || 'belum ada berkas'}), jadi isinya tidak bisa dipratinjau di sini.</Note>}
          <label className="chk-l"><input type="checkbox" className="chk" checked={samp.ok} onChange={(e) => setSamp({ ...samp, ok: e.target.checked })} />Saya sudah meninjau sampel dan isinya sesuai</label></> })()}
      </Modal>
      <Modal open={send} title="Send All" onClose={() => setSend(false)} footer={<><Btn kind="ghost" onClick={() => setSend(false)}>Batal</Btn><Btn icon="send" onClick={() => { api.sendAllDocs(b.id); setSend(false); toast(`${ready.length} dokumen terkirim. Masuk ke menu Kontrak & inbox karyawan`) }}>Kirim {ready.length} dokumen</Btn></>}>
        <ul className="plain"><li><b>{ready.length} dokumen</b> langsung masuk ke menu <b>Kontrak</b> tiap karyawan.</li><li>Karyawan menerima pesan inbox yang mengarahkan ke menu Kontrak (lihat Template pesan).</li><li>Notifikasi e-mail dikirim supaya karyawan membuka platform ini.</li>{notReady.length > 0 && <li>{notReady.length} dokumen yang belum siap <b>tidak ikut terkirim</b>.</li>}</ul>
        <Note>Batas jumlah penerima e-mail per kirim belum ditetapkan (menunggu pengecekan Mbak Putri). Di prototipe ini e-mail belum benar-benar dikirim.</Note>
      </Modal>
      <Modal open={!!add} title="Add Document" onClose={() => setAdd(null)} footer={<><Btn kind="ghost" onClick={() => setAdd(null)}>Batal</Btn><Btn onClick={() => { api.setBatch(b.id, (x) => { x.items.push({ emp: add.emp, jenis: 'Tambahan', dokumen: add.dokumen, setelan: 'New Contract Template', status: 'None', agreed: false }); x.status = 'Process' }); setAdd(null); toast('Dokumen ditambahkan ke batch') }}>Tambah</Btn></>}>
        {add && <div className="form"><Field label="Karyawan" hint="Hanya karyawan Branch ini yang belum ada di batch."><select value={add.emp} onChange={(e) => setAdd({ ...add, emp: e.target.value })}>{others.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Berkas"><select value={add.dokumen} onChange={(e) => setAdd({ ...add, dokumen: e.target.value })}>{DOC_TYPES.map((d) => <option key={d}>{d}</option>)}</select></Field></div>}
      </Modal>
      <MsgModal open={msg} onClose={() => setMsg(false)} toast={toast} />
      <Modal open={!!out} title="Keluarkan dari batch" onClose={() => setOut(null)} footer={<><Btn kind="ghost" onClick={() => setOut(null)}>Batal</Btn><Btn onClick={() => { api.removeDocItem(b.id, out); setOut(null); toast('Dikeluarkan dari batch') }}>Keluarkan</Btn></>}><p>{out && emp(out).name} tidak akan dikirimi dokumen dari batch ini. Lanjutkan?</p></Modal>{t}
    </>
  )
}

function MsgModal({ open, onClose, toast }) {
  const s = useStore(); const [m, setM] = useState(s.docMessage)
  return (
    <Modal open={open} title="Template pesan" onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn disabled={!m.judul.trim() || !m.isi.trim()} onClick={() => { api.setKey('docMessage', m); onClose(); toast('Template pesan tersimpan') }}>Simpan</Btn></>}>
      <p className="muted">Pesan ini masuk ke inbox karyawan (dan jadi isi notifikasi e-mail) setiap Send All.</p>
      <div className="form"><Field label="Judul"><input value={m.judul} onChange={(e) => setM({ ...m, judul: e.target.value })} /></Field><Field label="Isi pesan"><textarea rows={6} value={m.isi} onChange={(e) => setM({ ...m, isi: e.target.value })} /></Field></div>
    </Modal>
  )
}

// Edit dokumen per orang: isi field template, atau unggah berkas untuk Manual / Existing
function DocEditor({ b, empId, onClose, toast }) {
  const { s, emp, textOf } = useDocs(); const it = b.items.find((i) => i.emp === empId); const e = emp(empId); const mode = modeOf(b, it); const locked = it.status !== 'None'
  const remun = s.remunerations.find((r) => r.id === b.remun); const tpl = tplText(s, it.dokumen)
  const base = fieldValues({ e, row: remun?.rows.find((r) => r.emp === empId), pj: s.docPJ, nomor: it.nomor || nomorSurat(s.docSeq + 1, it.dokumen), today: new Date().toISOString().slice(0, 10), setup: s.setup })
  const fields = tokensIn(tpl)
  const [v, setV] = useState({ ...base, ...(it.override || {}) }); const [tab, setTab] = useState(locked ? 'Pratinjau' : 'Isi'); const [file, setFile] = useState(it.file || ''); const [nomor, setNomor] = useState(it.nomor || '')
  const saveTpl = () => { const override = {}; fields.forEach((f) => { if (v[f] !== base[f]) override[f] = v[f] }); const nomorBaru = v['Nomor Surat'] || base['Nomor Surat']; api.editDoc(b.id, empId, { override, nomor: nomorBaru, text: fill(tpl, v), ready: true, generated: true }); if (!it.nomor) api.setKey('docSeq', s.docSeq + 1); api.setBatch(b.id, (x) => { x.reviewed = false }); onClose(); toast('Dokumen ' + e.name.split(' ')[0] + ' tersimpan') }
  const saveFile = () => { api.editDoc(b.id, empId, { file, nomor, ready: true }); api.setBatch(b.id, (x) => { x.reviewed = false }); onClose(); toast('Berkas ' + e.name.split(' ')[0] + ' tersimpan') }
  const dl = async () => { try { await save(new Blob([textPdf(locked ? textOf(b, it) : fill(tpl, v))], { type: 'application/pdf' }), `${it.dokumen} - ${e.name}.pdf`); toast('PDF diunduh') } catch (err) { toast('Unduhan diblokir di pratinjau ini') } }
  if (mode !== 'New Contract Template') return (
    <Modal open title={`${it.dokumen} · ${e.name}`} onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>{locked ? 'Close' : 'Batal'}</Btn>{!locked && <Btn disabled={!file} onClick={saveFile}>Simpan</Btn>}</>}>
      <p className="muted">{mode === 'Existing Contract' ? 'Kontrak sudah berjalan. Unggah dokumen yang sudah ditandatangani.' : 'Dokumen dibuat di luar sistem. Unggah berkas final untuk orang ini.'}</p>
      <div className="form"><Field label="Nomor surat"><input value={nomor} disabled={locked} onChange={(x) => setNomor(x.target.value)} placeholder="mis. 015/HC/PKWT/XI/2026" /></Field>
        {!locked && <div className="drop"><Icon name="upload" size={26} /><p>{file || 'Unggah berkas (.pdf / .docx)'}</p><input type="file" accept=".pdf,.docx" aria-label="Unggah berkas dokumen" onChange={(x) => setFile(x.target.files[0]?.name || '')} /></div>}
        {locked && <p><b>Berkas:</b> {it.file || '—'}</p>}</div>
    </Modal>)
  return (
    <Modal wide open title={`${it.dokumen} · ${e.name}`} onClose={onClose} footer={<><Btn kind="ghost" icon="download" onClick={dl}>Unduh PDF</Btn><Btn kind="ghost" onClick={onClose}>{locked ? 'Close' : 'Batal'}</Btn>{!locked && <Btn onClick={saveTpl}>Simpan dokumen</Btn>}</>}>
      {!locked && <Tabs tabs={['Isi', 'Pratinjau']} value={tab} onChange={setTab} />}
      {tab === 'Isi' && !locked ? <>
        <p className="muted">Nilai di bawah terisi otomatis dari data karyawan dan Setup Dokumen. Ubah hanya bila orang ini perlu berbeda.</p>
        {fields.length === 0 ? <Note>Template dokumen ini belum punya penanda. Tandai dulu di Setup Dokumen.</Note> : <div className="form two">{fields.map((f) => <Field key={f} label={f} hint={PJ_FIELDS.some((p) => p[0] === f) ? 'Default dari Setup Dokumen' : v[f] !== base[f] ? 'Diubah manual' : undefined}><input value={v[f] ?? ''} onChange={(x) => setV({ ...v, [f]: x.target.value })} /></Field>)}</div>}
      </> : <DocView html={locked ? textOf(b, it) : fill(tpl, v)} />}
    </Modal>
  )
}

function TrackModal({ b, empId, onClose, toast }) {
  const { s, emp, textOf } = useDocs(); const it = b.items.find((i) => i.emp === empId); const e = emp(empId); const agreed = s.contractAgreed[empId]; const [tnc, setTnc] = useState(false)
  const up = (stage) => (x) => { const f = x.target.files[0]; if (!f) return; api.uploadStage(b.id, empId, stage, f.name); toast(`${stage}: ${f.name} tersimpan`); x.target.value = '' }
  const dl = async () => { try { await save(new Blob([textPdf(textOf(b, it))], { type: 'application/pdf' }), `${it.dokumen} - ${e.name}.pdf`); toast('PDF diunduh') } catch (err) { toast('Unduhan diblokir di pratinjau ini') } }
  const [d, jam] = (agreed || '').split(' ')
  return (
    <Modal wide open title={`Track Document · ${e.name}`} onClose={onClose} footer={<><Btn kind="ghost" onClick={() => setTnc(!tnc)}>Terms and Condition Agreement</Btn><Btn kind="ghost" icon="download" onClick={dl}>Download</Btn><Btn kind="ghost" onClick={onClose}>Close</Btn></>}>
      <div className="batch-row"><Icon name="doc" /><div className="grow"><strong>{it.dokumen}</strong><div className="muted sm">Periode {b.bulan} · No. {it.nomor || 'belum ada'}</div></div><Badge>{it.status === 'None' ? 'Belum dikirim' : it.status}</Badge></div>
      {tnc && <Note><div>{agreed ? <>{e.name} telah menyetujui pernyataan menu Kontrak pada tanggal {fmtDate(d)} pukul {jam}.</> : <>{e.name} belum menyetujui pernyataan menu Kontrak.</>}<br /><span className="muted sm">"{DISCLAIMER[0]}"</span></div></Note>}
      <div className="track">{STAGES.map(([st, req]) => { const l = it.log?.[st]; return (
        <div key={st} className={`track-row ${l ? 'on' : ''}`}><i>{l ? '✓' : ''}</i>
          <div className="grow"><strong>{st}</strong> <span className="muted sm">({req})</span><div className="muted sm">{l ? `${l.file} · ${fmtDate(l.at.split(' ')[0])} ${l.at.split(' ')[1] || ''}` : 'Belum ada berkas'}</div></div>
          <label className="btn btn-ghost up-btn"><Icon name="upload" size={18} />{l ? 'Re-upload' : 'Upload'}<input type="file" accept=".pdf,.docx" aria-label={`${l ? 'Re-upload' : 'Upload'} ${st}`} onChange={up(st)} /></label></div>) })}</div>
      <p className="muted sm">Dokumen yang perlu diganti cukup di-re-upload di sini. Tanggal dan jam unggahan terakhir yang dicatat.</p>
    </Modal>
  )
}

// Pernyataan menu Kontrak (draf Jeyyi, perlu ditinjau legal)
export const DISCLAIMER = [
  'Saya menyatakan bahwa setiap dokumen yang saya unggah di menu Kontrak adalah dokumen asli, benar, dan saya tanda tangani sendiri tanpa paksaan dari pihak mana pun.',
  'Saya sudah membaca dan memahami seluruh isi dokumen sebelum menandatanganinya, dan saya bertanggung jawab atas kebenaran berkas yang saya unggah.',
  'Saya setuju tanda tangan pada dokumen yang saya unggah berlaku sebagai persetujuan saya, dan saya bersedia dikonfirmasi kembali terkait kesepakatan kerja ini di kemudian hari.',
  'Saya memahami bahwa waktu persetujuan ini dan waktu setiap unggahan dicatat oleh sistem.',
]

// =====================================================================
// Setup Dokumen
// =====================================================================
export function SetupDokumen({ go, sub }) {
  const s = useStore(); const [t, toast] = useToast(); const [pj, setPj] = useState(s.docPJ)
  if (sub != null && DOC_TYPES[Number(sub)]) return <TemplateEditor doc={DOC_TYPES[Number(sub)]} go={go} />
  const dirty = JSON.stringify(pj) !== JSON.stringify(s.docPJ)
  const rows = DOC_TYPES.map((d, i) => ({ d, i, tpl: s.docTemplates[d], tags: tokensIn(tplText(s, d)) }))
  return (
    <>
      <PageHead title="Setup Dokumen" sub="Unggah template, tandai bagian yang berubah per orang, dan isi data penanggung jawab. Semua ini dipakai saat Generate All di Send Document." />
      <Card title="Penanggung jawab" action={<Btn disabled={!dirty || PJ_FIELDS.some(([, k]) => !String(pj[k] || '').trim())} onClick={() => { api.setDocPJ(pj); toast('Data penanggung jawab tersimpan') }}>Simpan</Btn>}>
        <p className="muted">Diisi sekali di sini. Setiap penanda penanggung jawab di template akan terisi dari kolom ini.</p>
        <div className="form two">{PJ_FIELDS.map(([l, k]) => <Field key={k} label={l}><input type={k === 'tanggalKuasa' ? 'date' : 'text'} value={pj[k] || ''} onChange={(e) => setPj({ ...pj, [k]: e.target.value })} /></Field>)}</div>
      </Card>
      <Card title="Template dokumen" pad={false}><Table center rows={rows} cols={[
        { h: 'Dokumen', r: (r) => <strong>{r.d}</strong> }, { h: 'Sumber', r: (r) => (r.tpl?.file ? <span className="file-chip" title={r.tpl.file}><Icon name="doc" size={14} /> {r.tpl.file}</span> : <span className="muted">Template bawaan</span>) },
        { h: 'Penanda', r: (r) => <Badge t={r.tags.length ? 'ok' : 'warn'}>{r.tags.length} bagian ditandai</Badge> },
        { h: 'Action', r: (r) => <Btn kind="ghost" icon="edit" onClick={() => go('setup-dokumen/' + r.i)}>Atur template</Btn> }]} /></Card>{t}
    </>
  )
}

function TemplateEditor({ doc, go }) {
  const s = useStore(); const [t, toast] = useToast(); const ref = useRef(null)
  const saved = s.docTemplates[doc]; const initial = toHtml(saved?.text || DEFAULT_TEMPLATES[doc] || '')
  const [html, setHtml] = useState(initial); const [file, setFile] = useState(saved?.file || ''); const [tab, setTab] = useState('Edit'); const [busy, setBusy] = useState(false); const [ver, setVer] = useState(0); const [dirty, setDirty] = useState(false)
  const tags = tokensIn(html); const unknown = tags.filter((f) => !ALL_FIELDS.includes(f))
  const e = s.employees[0]; const sampleVals = fieldValues({ e, row: null, pj: s.docPJ, nomor: nomorSurat(s.docSeq + 1, doc), today: new Date().toISOString().slice(0, 10), setup: s.setup })
  const replace = (h) => { setHtml(h); setVer((v) => v + 1); setDirty(true); setTab('Edit') }
  const upload = async (x) => { const f = x.target.files[0]; if (!f) return; setBusy(true); try { const tx = await readTemplateFile(f); replace(toHtml(tx)); setFile(f.name); toast('Isi ' + f.name + ' terbaca. Rapikan formatnya, lalu tandai bagian yang berubah per orang') } catch (err) { setFile(f.name); setDirty(true); toast('Berkas tersimpan, tetapi isinya belum bisa dibaca di prototipe. Isi di editor tetap dipakai') } setBusy(false); x.target.value = '' }
  const mark = (f) => { if (tab !== 'Edit') return; ref.current?.insertToken(f) }
  const chip = (f) => <button key={f} type="button" className={`tag-btn ${tags.includes(f) ? 'on' : ''}`} onMouseDown={(x) => x.preventDefault()} onClick={() => mark(f)} disabled={tab !== 'Edit'}><i>{tags.includes(f) ? '✓' : '+'}</i>{f}</button>
  return (
    <>
      <Crumb items={[['Setup Dokumen', () => go('setup-dokumen')], [doc]]} />
      <PageHead title={doc} sub="Rapikan dokumen dengan toolbar dan penggaris. Blok teks yang berubah per orang, lalu klik nama kolomnya: bagian itu jadi penanda dan terisi otomatis saat Generate All.">
        <Btn kind="ghost" onClick={() => { replace(toHtml(DEFAULT_TEMPLATES[doc] || '')); setFile(''); toast('Kembali ke template bawaan (belum disimpan)') }}>Pakai bawaan</Btn>
        <Btn disabled={!dirty} onClick={() => { api.saveTemplate(doc, { text: html, file }); setDirty(false); toast('Template tersimpan') }}>Simpan template</Btn>
      </PageHead>
      <div className="tpl-grid">
        <div className="tpl-main">
          <Card><div className="batch-row"><Icon name="upload" /><div className="grow"><strong>{file || 'Belum ada berkas diunggah'}</strong><div className="muted sm">.docx dan .txt dibaca isinya (teks saja, format dirapikan ulang di editor). Format lain disimpan namanya saja.</div></div>
            <label className="btn btn-ghost up-btn">{busy ? 'Membaca…' : file ? 'Ganti berkas' : 'Unggah template'}<input type="file" accept=".docx,.txt,.pdf,.doc" aria-label="Unggah template" onChange={upload} /></label></div></Card>
          <Card pad={false}><div className="tpl-tabs"><Tabs tabs={['Edit', 'Pratinjau']} value={tab} onChange={setTab} /></div>
            <div className="tpl-body">{tab === 'Edit' ? <RichEditor key={ver} ref={ref} html={html} fields={[['Data karyawan', DATA_FIELDS], ['Penanggung jawab', PJ_FIELDS.map((x) => x[0])]]} onChange={(h) => { setHtml(h); setDirty(true) }} /> : <><p className="muted sm">Contoh hasil dengan data {e.name}.</p><DocView html={fill(html, sampleVals)} /></>}</div></Card>
        </div>
        <aside className="tpl-side">
          <Card title="Data karyawan"><p className="muted sm">Terisi dari data orangnya.</p><div className="tag-list">{DATA_FIELDS.map(chip)}</div></Card>
          <Card title="Penanggung jawab"><p className="muted sm">Terisi dari kolom di Setup Dokumen.</p><div className="tag-list">{PJ_FIELDS.map(([f]) => chip(f))}</div></Card>
          <Card title="Tips"><ul className="plain sm"><li><b>Tab</b> menyisipkan tab. Klik penggaris untuk menambah tab stop, seret untuk menggeser, klik ganda untuk menghapus.</li><li>Segitiga atas = indent baris pertama, segitiga bawah = indent kiri, segitiga kanan = indent kanan.</li><li>Penanda bisa diberi format (tebal, huruf besar, dll.). Hasil isiannya ikut formatnya.</li></ul></Card>
          {unknown.length > 0 && <Note>Penanda tidak dikenal: {unknown.join(', ')}. Bagian ini tidak akan terisi otomatis.</Note>}
        </aside>
      </div>{t}
    </>
  )
}
