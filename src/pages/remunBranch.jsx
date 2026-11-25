// Remunerasi Branch (dipindahkan dari desain revisi 16 Nov, 22 Nov 2026):
// Create (periode, THR/KAK, Add to List, Sinkron otomatis, Addition & Deduction, Clear All, Edit, simulasi, file Excel,
// Total Pengeluaran Budget, Request Approval) · Draft · Rejected (catatan + Re-create) · In Review · Approval · halaman
// Addition & Deduction (isi cepat banyak karyawan) · Synchronize Bank Account.
import React, { useMemo, useState } from 'react'
import { useStore, api, uid, getState } from '../services/store.js'
import { calcRow, calcSisa, totals, parsePeriod, rupiah, BULAN, ADD_TYPES, DED_TYPES, needsNote, lineType } from '../services/payrollScala.js'
import { autoLines, mergeLines, workDays, cutOff } from '../services/remunAuto.js'
import { buildRemunXlsx } from '../services/remunXlsx.js'
import { save } from '../services/export.js'
import { Btn, Card, Badge, Modal, Field, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { Sticker } from '../components/Sticker.jsx'
import { useLookup, fmtDate } from './shared.jsx'

const MY = () => getState().myBranch || 'b1'
const JENIS = ['New Hiring', 'Active', 'Salary', 'Duration', 'Renewal', 'Resign']
const LOCKS = { 'New Hiring': [], Active: ['start', 'end', 'role', 'level', 'type', 'thp'], Salary: ['start', 'end', 'role', 'level', 'type'], Duration: ['role', 'level', 'type', 'thp'], Renewal: [], Resign: [] }
const LEVELS = ['CEO/Direktur/Manajer Umum/Manajer Senior', 'Manajer/Asisten Manajer', 'Supervisor/Koordinator', 'Senior', 'Middle', 'Junior', 'Staf (Non Manajemen & Non Supervisor)']
const TYPES = ['Kontrak', 'Freelance', 'Magang']
const TABS = [['', 'Create'], ['draft', 'Draft'], ['rejected', 'Rejected'], ['in-review', 'In Review'], ['approval', 'Approval']]
const STATUS = { draft: 'Draft', rejected: 'Rejected', 'in-review': 'In Review', approval: 'Approved' }
const PER_PAGE = [5, 10, 30, 50]
const FIELDS = [['start', 'Tanggal Masuk', 'date'], ['end', 'Tanggal Keluar', 'date'], ['role', 'Role', 'role'], ['level', 'Level', 'level'], ['type', 'Employee Type', 'type'], ['thp', 'Take Home Pay (THP)', 'money']]

const stamp = () => { const d = new Date(); return d.toISOString().slice(0, 10) + ' ' + d.toTimeString().slice(0, 5) }
const fmtStamp = (t) => { if (!t) return '—'; const [d, h] = t.split(' '); return `${fmtDate(d)} || ${h || '00:00'} WIB` }
const thisMonth = () => { const d = new Date(); return `${BULAN[d.getMonth()]} ${d.getFullYear()}` }
const sum = (arr) => (arr || []).reduce((a, l) => a + (Number(l.nominal) || 0), 0)
const lineErr = (l, kind) => !lineType(l, kind) ? 'Pilih keperluan' : needsNote(lineType(l, kind)) && !String(l.notes || '').trim() ? 'Notes wajib diisi untuk Lain - Lain' : Number(l.nominal) > 0 ? '' : 'Isi nominal'
const rupiahInput = (v, set, label = 'Sebesar') => <span className="rp"><span>Rp</span><input inputMode="numeric" value={Number(v || 0) ? Number(v).toLocaleString('id-ID') : ''} placeholder="0" aria-label={label} onChange={(e) => set(Number(e.target.value.replace(/\D/g, '')) || 0)} /></span>
const newRemun = () => ({ id: uid('r'), branch: MY(), bulan: thisMonth(), status: 'Draft', thr: false, kak: false, files: [], rows: [], createdAt: stamp() })
const download = async (remun, s, branchName, toast) => {
  try { await save(buildRemunXlsx({ remun, s, branchName }), `Remunerasi ${remun.bulan}.xlsx`); toast('File Excel diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') }
}

function BranchLogo({ name }) {
  return <span className="rb-logo" aria-hidden="true">{name.replace('Branch ', '').split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
}

export function Remunerasi({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast()
  const br = s.branches.find((b) => b.id === MY()) || { name: 'Branch' }
  const mine = s.remunerations.filter((r) => r.branch === MY())
  const work = s.remunWork?.[MY()] ? mine.find((r) => r.id === s.remunWork[MY()] && r.status === 'Draft') : null
  const setWork = (id) => api.setWork?.(MY(), id)
  const tab = sub && STATUS[sub] ? sub : sub ? null : ''
  if (sub === 'tambahan') return <AdjPage go={go} work={work} branch={br} />
  if (sub && sub.startsWith('lihat-')) {
    const r = mine.find((x) => x.id === sub.slice(6))
    return r ? <RemunView r={r} go={go} branch={br} /> : <Empty text="Pengajuan tidak ditemukan." />
  }
  return (
    <>
      <PageHead title="Remuneration" sub={`${br.name} · ajukan remunerasi bulanan, simulasikan biaya, lalu minta approval admin.`} />
      <nav className="rb-tabs" role="tablist" aria-label="Status remunerasi">
        {TABS.map(([k, l]) => {
          const n = k ? mine.filter((r) => r.status === STATUS[k]).length : 0
          return <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => go('remunerasi' + (k ? '/' + k : ''))}>{l}{n > 0 && <span className="rb-n">{n}</span>}</button>
        })}
      </nav>
      {tab === '' ? <Create go={go} work={work} setWork={setWork} branch={br} toast={toast} />
        : <RemunList status={STATUS[tab]} list={mine.filter((r) => r.status === STATUS[tab])} go={go} branch={br} toast={toast} setWork={setWork} />}
      {t}
    </>
  )
}

function Create({ go, work, setWork, branch, toast }) {
  const s = useStore(); const { emp } = useLookup()
  const [q, setQ] = useState(''); const [adding, setAdding] = useState(false); const [editing, setEditing] = useState(null); const [removing, setRemoving] = useState(null)
  const [clearing, setClearing] = useState(false); const [per, setPer] = useState(5); const [page, setPage] = useState(1); const [bank, setBank] = useState(false)
  const [syncRes, setSyncRes] = useState(null); const [asking, setAsking] = useState(false); const [detail, setDetail] = useState(false)
  const unsynced = s.employees.filter((e) => e.branch === MY() && e.status !== 'Nonaktif' && !e.bankOk).length
  const W = work
  if (!W) return (
    <Card><div className="rb-start"><Sticker name="kalkulator" size={120} /><div><h2>Mulai remunerasi {thisMonth()}</h2><p className="muted">Pilih karyawan, cek addition & deduction otomatis, buat simulasi, lalu ajukan ke admin. Pekerjaanmu tersimpan otomatis sebagai Draft.</p></div>
      <Btn icon="plus" onClick={() => { const r = newRemun(); api.saveRemun(r); setWork(r.id) }}>Buat baru</Btn></div></Card>
  )
  // setiap perubahan langsung tersimpan sebagai Draft; simulasi lama jadi tidak berlaku
  const upd = (fn) => { const n = structuredClone(W); n.sim = null; fn(n); n.updatedAt = stamp(); api.saveRemun(n) }
  const period = parsePeriod(W.bulan)
  const adj = s.remunAdj?.[`${MY()}|${W.bulan}`] || {}
  const filtered = W.rows.filter((r) => emp(r.emp).name.toLowerCase().includes(q.toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / per)); const pg = Math.min(page, pages)
  const view = filtered.slice((pg - 1) * per, pg * per)
  const problems = W.rows.flatMap((r) => [...(r.additions || []).map((l) => [r, lineErr(l, 'add')]), ...(r.deductions || []).map((l) => [r, lineErr(l, 'ded')]), [r, Number(r.thp) > 0 ? '' : 'THP belum diisi']])
    .filter(([, m]) => m).map(([r, m]) => `${emp(r.emp).name}: ${m}`)
  const tot = W.sim ? totals(W.rows, period, s.setup) : { bulan: 0, sisa: 0 }
  const makeRow = (eid, jenis, extra = {}) => {
    const e = emp(eid)
    const row = { emp: eid, jenis, thp: e.thp, skema: e.skema || 'Normal', start: e.start, end: e.end, endBefore: e.end, role: e.role, level: e.level, type: e.type, additions: [], deductions: [], ...extra }
    const auto = autoLines(s, eid, W.bulan, { thr: W.thr, kak: W.kak, jenis, row })
    return { ...row, ...mergeLines(row, auto, adj[eid]) }
  }
  const sync = () => {
    const meta = []; let n = 0
    upd((d) => {
      d.rows = d.rows.map((r) => { const auto = autoLines(s, r.emp, d.bulan, { thr: d.thr, kak: d.kak, jenis: r.jenis, row: r }); n++; return { ...r, ...mergeLines(r, auto, adj[r.emp]) } })
      d.syncAt = stamp()
    })
    Object.entries(adj).forEach(([eid, a]) => { if (!W.rows.some((r) => r.emp === eid) && (a.additions?.length || a.deductions?.length)) meta.push({ eid, msg: `${emp(eid).name} punya addition/deduction manual tetapi belum ada di daftar.` }) })
    W.rows.forEach((r) => (adj[r.emp]?.additions || []).concat(adj[r.emp]?.deductions || []).forEach((l) => { if (needsNote(l.tipe) && !String(l.notes || '').trim()) meta.push({ eid: r.emp, msg: `${emp(r.emp).name}: Lain - Lain tanpa notes.` }) }))
    setSyncRes({ n, meta, hk: workDays(s, MY(), period), co: cutOff(s, period) })
  }
  const simulate = () => { upd((d) => { d.sim = { at: stamp(), file: `Remunerasi ${d.bulan}.xlsx` } }); toast('Berhasil membuat perhitungan remunerasi') }
  const months = [-1, 0, 1].map((o) => { const d = new Date(); d.setMonth(d.getMonth() + o); return `${BULAN[d.getMonth()]} ${d.getFullYear()}` })
  const addFiles = (list) => upd((d) => { d.files = [...(d.files || []), ...[...list].map((f) => ({ name: f.name, size: f.size }))] })

  return (
    <>
      <section className="card rb-create">
        <div className="rb-top">
          <div className="rb-period">
            <label className="fsel"><span>Periode</span><select value={W.bulan} onChange={(e) => upd((d) => { d.bulan = e.target.value })}>{[...new Set([...months, W.bulan])].map((m) => <option key={m}>{m}</option>)}</select></label>
            <label className="chk-l" title="THR otomatis: masa kerja ≥ 12 bulan = 1× upah, di bawahnya proporsional"><input type="checkbox" className="chk" checked={W.thr} onChange={(e) => upd((d) => { d.thr = e.target.checked })} />Aktifkan THR</label>
            <label className="chk-l"><input type="checkbox" className="chk" checked={W.kak} onChange={(e) => upd((d) => { d.kak = e.target.checked })} />Aktifkan KAK</label>
          </div>
          <div className="rb-bank">
            {unsynced > 0 ? <span className="rb-warn">Terdapat {unsynced} Akun Bank Belum Tersinkronisasi</span> : <span className="rb-ok"><Icon name="checkCircle" size={14} />Semua akun bank tersinkronisasi</span>}
            <Btn kind="ghost" onClick={() => setBank(true)}>Synchronize Bank Account</Btn>
          </div>
        </div>
        <div className="rb-tools">
          <span className="search grow"><Icon name="search" size={16} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Ketikkan Nama" aria-label="Cari nama di daftar" /></span>
          <Btn icon="plus" onClick={() => setAdding(true)}>Add to List</Btn>
          <Btn kind="ghost" icon="refresh" onClick={sync} disabled={!W.rows.length}>Sinkron</Btn>
          <Btn kind="ghost" icon="layers" onClick={() => go('remunerasi/tambahan')}>Addition & Deduction</Btn>
          <Btn kind="ghost" icon="x" disabled={!W.rows.length} onClick={() => setClearing(true)}>Clear All</Btn>
        </div>
        {W.syncAt && <p className="muted sm rb-sync">Terakhir disinkron {fmtStamp(W.syncAt)} · lembur, reimbursement, absensi, cuti tidak dibayar, kliring{W.thr ? ', THR' : ''}{W.kak ? ', KAK' : ''}, dan input halaman Addition & Deduction.</p>}
        {W.rows.length === 0 ? <div className="rb-empty"><Icon name="user" size={28} /><p>Belum ada karyawan di daftar. Klik <b>Add to List</b>.</p></div> : (
          <div className="rb-rows">{view.map((r) => {
            const e = emp(r.emp); const a = sum(r.additions); const dd = sum(r.deductions)
            const autoN = [...r.additions, ...r.deductions].filter((l) => l.auto).length; const bad = problems.some((p) => p.startsWith(e.name + ':'))
            return (
              <article key={r.emp} className={`rb-row ${bad ? 'bad' : ''}`}>
                <div className="who"><Avatar name={e.name} size={40} /><div><strong>{e.name}</strong><div className="muted sm">{r.role || e.role}</div></div></div>
                <dl className="rb-f">
                  <div><dt>Tipe Karyawan</dt><dd>{r.type || e.type}</dd></div>
                  <div><dt>Take Home Pay</dt><dd>{Number(r.thp) ? rupiah(r.thp) : <span className="err-t" style={{ margin: 0 }}>Belum diisi</span>}</dd></div>
                  <div><dt>Tanggal Masuk</dt><dd>{fmtDate(r.start || e.start)}</dd></div>
                  <div><dt>Tanggal Akhir</dt><dd>{fmtDate(r.end || e.end)}</dd></div>
                  <div><dt>Addition</dt><dd className="pos">{a ? '+ ' + rupiah(a) : '—'}</dd></div>
                  <div><dt>Deduction</dt><dd className="neg">{dd ? '− ' + rupiah(dd) : '—'}</dd></div>
                  <div><dt>Jenis Request</dt><dd><select value={r.jenis} aria-label={`Jenis request ${e.name}`} onChange={(ev) => upd((d) => { d.rows.find((x) => x.emp === r.emp).jenis = ev.target.value })}>{JENIS.map((j) => <option key={j}>{j}</option>)}</select></dd></div>
                </dl>
                <div className="rb-act">
                  {autoN > 0 && <span className="rb-auto" title="Addition/deduction otomatis">{autoN} otomatis</span>}
                  <button className="icon-btn" aria-label={`Edit ${e.name}`} onClick={() => setEditing(r.emp)}><Icon name="edit" size={18} /></button>
                  <button className="icon-btn danger" aria-label={`Hapus ${e.name}`} onClick={() => setRemoving(r.emp)}><Icon name="trash" size={18} /></button>
                </div>
              </article>
            )
          })}</div>
        )}
        <div className="rb-pager">
          <label className="fsel inline"><span>Show</span><select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1) }}>{PER_PAGE.map((n) => <option key={n}>{n}</option>)}</select><span>per page</span></label>
          <span className="muted sm">{W.rows.length} karyawan di daftar</span>
          <div className="pager">
            <button className="icon-btn" disabled={pg <= 1} onClick={() => setPage(pg - 1)} aria-label="Halaman sebelumnya">‹</button>
            {Array.from({ length: pages }, (_, i) => <button key={i} className={`pg ${pg === i + 1 ? 'on' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
            <button className="icon-btn" disabled={pg >= pages} onClick={() => setPage(pg + 1)} aria-label="Halaman berikutnya">›</button>
          </div>
        </div>
        <div className="rb-files">
          <span className="field-l">Lampiran pendukung (boleh banyak)</span>
          <div className="row-act">
            {(W.files || []).map((f, i) => <span key={i} className="file-chip"><Icon name="doc" size={14} />{f.name}<button className="icon-btn" aria-label={`Hapus ${f.name}`} onClick={() => upd((d) => { d.files.splice(i, 1) })}><Icon name="x" size={14} /></button></span>)}
            <label className="btn btn-ghost up-btn"><Icon name="upload" size={18} />Lampirkan file<input type="file" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} /></label>
          </div>
        </div>
        {problems.length > 0 && <Note><div><b>Perbaiki dulu sebelum simulasi:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{problems.slice(0, 6).map((p) => <li key={p}>{p}</li>)}</ul></div></Note>}
        <Btn className="rb-sim" disabled={!W.rows.length || problems.length > 0} onClick={simulate}>Create Simulation</Btn>
      </section>

      <section className="card rb-file">
        <span className="rb-xls" aria-hidden="true">X</span>
        <div className="grow"><strong>Remunerasi {W.bulan}</strong><small className="muted">{W.sim ? `Dibuat ${fmtStamp(W.sim.at)} · 5 sheet: Perbulan, Sisa Kontrak, Rincian, Parameter, TER` : 'Buat simulasi untuk menghasilkan file'}</small></div>
        <Btn kind="ghost" icon="eye" disabled={!W.sim} onClick={() => setDetail(true)}>Rincian</Btn>
        <Btn icon="download" disabled={!W.sim} onClick={() => download(W, s, branch.name, toast)}>Download</Btn>
      </section>

      <section className="rb-budget">
        <div className="rb-b-l"><span className="muted sm">Total Pengeluaran Budget:</span>
          <div className="rb-pills"><span className="rb-pill">Total Bulan Ini: <b>{W.sim ? rupiah(tot.bulan) : 'Rp 0'}</b></span><span className="rb-pill">Sisa Kontrak: <b>{W.sim ? rupiah(tot.sisa) : 'Rp 0'}</b></span></div></div>
        <Btn disabled={!W.sim} onClick={() => setAsking(true)}>Request Approval</Btn>
      </section>

      <AddToList open={adding} onClose={() => setAdding(false)} d={W} onAdd={(list) => { upd((d) => { list.forEach(([eid, jenis, extra]) => d.rows.push(makeRow(eid, jenis, extra))) }); setAdding(false); toast(`${list.length} karyawan ditambahkan`) }} />
      {editing && <EditRow row={W.rows.find((r) => r.emp === editing)} e={emp(editing)} onClose={() => setEditing(null)} onSave={(row) => { upd((d) => { d.rows[d.rows.findIndex((r) => r.emp === editing)] = row }); setEditing(null); toast('Perubahan disimpan') }} />}
      <Modal open={!!removing} title="Hapus dari daftar?" onClose={() => setRemoving(null)} footer={<><Btn kind="ghost" onClick={() => setRemoving(null)}>Batal</Btn><Btn onClick={() => { upd((d) => { d.rows = d.rows.filter((r) => r.emp !== removing) }); setRemoving(null); toast('Karyawan dihapus dari daftar') }}>Hapus</Btn></>}>
        <p style={{ margin: 0 }}><b>{removing && emp(removing).name}</b> akan dikeluarkan dari pengajuan {W.bulan}. Data karyawannya tidak terhapus.</p>
      </Modal>
      <Modal open={clearing} title="Clear All?" onClose={() => setClearing(false)} footer={<><Btn kind="ghost" onClick={() => setClearing(false)}>Batal</Btn><Btn onClick={() => { upd((d) => { d.rows = [] }); setClearing(false); toast('Semua data remunerasi berhasil dihapus') }}>Hapus semua</Btn></>}>
        <p style={{ margin: 0 }}>Semua {W.rows.length} karyawan di daftar akan dikeluarkan. Input di halaman Addition & Deduction tetap tersimpan.</p>
      </Modal>
      <Modal open={asking} title="Ajukan remunerasi?" onClose={() => setAsking(false)} footer={<><Btn kind="ghost" onClick={() => setAsking(false)}>Batal</Btn><Btn onClick={() => { const r = { ...structuredClone(W), status: 'In Review', submittedAt: stamp() }; api.saveRemun(r); api.remunNotify(r); setWork(null); setAsking(false); toast('Remunerasi telah diajukan'); go('remunerasi/in-review') }}>Ajukan</Btn></>}>
        <p style={{ margin: 0 }}>Remunerasi <b>{W.bulan}</b> untuk <b>{W.rows.length} karyawan</b> dengan Total Bulan Ini <b>{rupiah(tot.bulan)}</b> akan dikirim ke admin. Selama In Review, pengajuan tidak bisa diubah.</p>
      </Modal>
      <Modal wide open={!!syncRes} title="Sinkron selesai" onClose={() => setSyncRes(null)} footer={<Btn onClick={() => setSyncRes(null)}>Oke</Btn>}>
        {syncRes && <>
          <p style={{ margin: 0 }}><b>{syncRes.n} karyawan</b> diperbarui. Hari kerja {W.bulan}: <b>{syncRes.hk} hari</b>. Periode lembur {fmtDate(syncRes.co[0])} – {fmtDate(syncRes.co[1])}.</p>
          <ul className="hol-list">{['Lembur', 'Reimbursement', 'Absensi', 'Cuti', 'Kliring', 'THR', 'KAK'].map((src) => {
            const n = W.rows.flatMap((r) => [...r.additions, ...r.deductions]).filter((l) => l.auto === src).length
            return <li key={src}><Badge t={n ? 'ok' : 'neutral'}>{n}</Badge><span><b>{src}</b>{n ? `${n} baris otomatis` : 'tidak ada data periode ini'}</span></li>
          })}</ul>
          {syncRes.meta.length > 0 && <Note><div><b>Perlu dicek:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{syncRes.meta.map((m, i) => <li key={i}>{m.msg}</li>)}</ul></div></Note>}
        </>}
      </Modal>
      {bank && <BankSync onClose={() => setBank(false)} go={go} toast={toast} />}
      <Modal wide open={detail} title={`Rincian simulasi ${W.bulan}`} onClose={() => setDetail(false)} footer={<><Btn kind="ghost" onClick={() => setDetail(false)}>Tutup</Btn><Btn icon="download" onClick={() => download(W, s, branch.name, toast)}>Download</Btn></>}>
        {detail && <SimTable r={W} />}
      </Modal>
    </>
  )
}

function SimTable({ r }) {
  const s = useStore(); const { emp } = useLookup(); const period = parsePeriod(r.bulan)
  const rows = r.rows.map((x) => { const c = calcRow(x, s.setup); const e = emp(x.emp); return { ...x, e, c, ss: calcSisa({ ...x, type: x.type || e.type, start: x.start || e.start, end: x.end || e.end }, c, period, s.setup) } })
  const tot = (f) => rows.reduce((a, x) => a + f(x), 0)
  return (
    <div className="tbl-wrap"><table className="tbl sim-t">
      <thead><tr><th>Karyawan</th><th>THP</th><th>Basic</th><th>Addition</th><th>Deduction</th><th title="Iuran BPJS perusahaan">Iuran BPJS</th><th>Pajak</th><th>Nett</th><th>Total TANI</th><th>Sisa Kontrak</th></tr></thead>
      <tbody>{rows.map((x) => <tr key={x.emp}>
        <td><strong>{x.e.name}</strong><div className="muted sm">{x.jenis} · {x.skema}{x.c.ditanggung ? ' · BPJS karyawan ditanggung' : ''}</div></td>
        <td>{rupiah(x.c.thp)}</td><td>{rupiah(x.c.gp)}{x.c.umrApplied && <div className="muted sm">min. UMR</div>}</td>
        <td>{rupiah(x.c.add)}</td><td>{rupiah(x.c.totalPotongan)}</td><td>{rupiah(x.c.compTotal)}</td>
        <td>{rupiah(x.c.pajak)}<div className="muted sm">{x.c.rate}%</div></td><td><b>{rupiah(x.c.net)}</b></td><td><b>{rupiah(x.c.tani)}</b></td>
        <td>{rupiah(x.ss.taniSisa)}<div className="muted sm">{x.ss.sisa} bln</div></td>
      </tr>)}</tbody>
      <tfoot><tr><td>Total</td><td>{rupiah(tot((x) => x.c.thp))}</td><td>{rupiah(tot((x) => x.c.gp))}</td><td>{rupiah(tot((x) => x.c.add))}</td><td>{rupiah(tot((x) => x.c.totalPotongan))}</td><td>{rupiah(tot((x) => x.c.compTotal))}</td><td>{rupiah(tot((x) => x.c.pajak))}</td><td>{rupiah(tot((x) => x.c.net))}</td><td>{rupiah(tot((x) => x.c.tani))}</td><td>{rupiah(tot((x) => x.ss.taniSisa))}</td></tr></tfoot>
    </table></div>
  )
}

function AddToList({ open, onClose, d, onAdd }) {
  const s = useStore(); const [q, setQ] = useState(''); const [sel, setSel] = useState({})
  if (!open) return null
  const inList = new Set(d.rows.map((r) => r.emp))
  const emps = s.employees.filter((e) => e.branch === MY() && e.status !== 'Nonaktif' && !inList.has(e.id) && e.name.toLowerCase().includes(q.toLowerCase()))
  const cands = s.candidates.filter((c) => c.tahap === 5 && (!c.branch || c.branch === MY()) && c.name.toLowerCase().includes(q.toLowerCase()))
  const chosen = Object.entries(sel).filter(([, v]) => v)
  // karyawan yang sudah diajukan di periode yang sama (In Review / Approved)
  const taken = new Set(s.remunerations.filter((r) => r.branch === MY() && r.bulan === d.bulan && r.id !== d.id && ['In Review', 'Approved'].includes(r.status)).flatMap((r) => r.rows.map((x) => x.emp)))
  const close = () => { setSel({}); onClose() }
  return (
    <Modal wide open title="Add to List" onClose={close} footer={<>
      <span className="muted sm grow">Total karyawan terpilih {chosen.length}</span>
      <Btn kind="ghost" onClick={close}>Batal</Btn>
      <Btn disabled={!chosen.length} onClick={() => {
        const list = chosen.map(([k]) => {
          if (k.startsWith('c:')) { const c = s.candidates.find((x) => 'c:' + x.id === k); return [api.addHire(c, MY()), 'New Hiring', { thp: 0, start: '', end: '', role: c.posisi || 'Calon karyawan' }] }
          return [k, 'Active']
        })
        setSel({}); onAdd(list)
      }}>Tambahkan</Btn>
    </>}>
      <span className="search"><Icon name="search" size={16} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketikkan Nama" aria-label="Cari karyawan" /></span>
      <div className="add-grp">
        <div className="row-end"><h4 className="grow">Karyawan aktif ({emps.length})</h4>
          {emps.length > 0 && <button type="button" className="lnk" onClick={() => setSel({ ...sel, ...Object.fromEntries(emps.filter((e) => !taken.has(e.id)).map((e) => [e.id, true])) })}>Pilih semua{taken.size ? ' yang belum diajukan' : ''}</button>}</div>
        {emps.length ? <ul className="add-list">{emps.map((e) => <li key={e.id}><label>
          <input type="checkbox" className="chk" checked={!!sel[e.id]} onChange={(ev) => setSel({ ...sel, [e.id]: ev.target.checked })} />
          <Avatar name={e.name} size={32} /><span className="grow"><strong>{e.name}</strong><small className="muted">{e.role} · {e.type} · {rupiah(e.thp)}</small></span>
          {taken.has(e.id) && <Badge t="bad">Sudah diajukan {d.bulan}</Badge>}{!e.bankOk && <Badge t="warn">Bank belum sinkron</Badge>}
        </label></li>)}</ul> : <p className="muted sm">Semua karyawan aktif sudah ada di daftar.</p>}
      </div>
      <div className="add-grp">
        <h4>Kandidat lolos seleksi · New Hiring ({cands.length})</h4>
        {cands.length ? <ul className="add-list">{cands.map((c) => <li key={c.id}><label>
          <input type="checkbox" className="chk" checked={!!sel['c:' + c.id]} onChange={(ev) => setSel({ ...sel, ['c:' + c.id]: ev.target.checked })} />
          <Avatar name={c.name} size={32} /><span className="grow"><strong>{c.name}</strong><small className="muted">Lolos tahap akhir · THP diisi di Edit</small></span>
        </label></li>)}</ul> : <p className="muted sm">Belum ada kandidat di tahap akhir.</p>}
      </div>
    </Modal>
  )
}

function EditRow({ row, e, onClose, onSave }) {
  const s = useStore(); const [l, setL] = useState(() => structuredClone(row)); const [tried, setTried] = useState(false)
  const locked = LOCKS[l.jenis] || []
  const before = { start: e.start, end: e.end, role: e.role, level: e.level, type: e.type, thp: e.thp }
  const roles = [...new Set([...s.employees.map((x) => x.role), ...s.jobs.map((j) => j.posisi), l.role].filter(Boolean))].sort()
  const setLine = (k, i, patch) => setL({ ...l, [k]: l[k].map((x, j) => j === i ? { ...x, ...patch } : x) })
  const ok = ![...l.additions.map((x) => x.auto || x.fromAdj ? '' : lineErr(x, 'add')), ...l.deductions.map((x) => x.auto || x.fromAdj ? '' : lineErr(x, 'ded'))].filter(Boolean).length && Number(l.thp) > 0 && (!l.start || !l.end || l.end >= l.start)
  const c = calcRow(l, s.setup)
  const input = (k, kind, dis) => kind === 'date' ? <input type="date" disabled={dis} value={l[k] || ''} onChange={(ev) => setL({ ...l, [k]: ev.target.value })} aria-label={'Sesudah ' + k} />
    : kind === 'money' ? <span className="rp"><span>Rp</span><input inputMode="numeric" disabled={dis} value={Number(l.thp || 0).toLocaleString('id-ID')} onChange={(ev) => setL({ ...l, thp: Number(ev.target.value.replace(/\D/g, '')) || 0 })} aria-label="THP sesudah" /></span>
    : <select disabled={dis} value={l[k] || ''} onChange={(ev) => setL({ ...l, [k]: ev.target.value })} aria-label={'Sesudah ' + k}>{(kind === 'role' ? roles : kind === 'level' ? LEVELS : TYPES).map((o) => <option key={o}>{o}</option>)}</select>
  const col = (k, kind, title, types) => (
    <div className="op-col"><h4>{title}</h4>
      {l[k].length === 0 && <p className="muted sm">Belum ada.</p>}
      {l[k].map((x, i) => {
        const fixed = x.auto || x.fromAdj; const err = tried && !fixed ? lineErr(x, kind) : ''
        return <div key={i} className={`op-line ${fixed ? 'auto' : ''}`}>{fixed ? <>
          <div className="op-auto-h"><b>{lineType(x, kind)}</b><Badge t={x.auto ? 'ok' : 'neutral'}>{x.auto ? 'Otomatis · ' + x.auto : 'Addition & Deduction'}</Badge></div>
          <p className="muted sm">{x.notes || x.keperluan}</p><b className="op-amt">{rupiah(x.nominal)}</b>
        </> : <>
          <Field label="Keperluan Pembayaran"><select value={x.tipe || ''} aria-invalid={!!err && !x.tipe} onChange={(ev) => setLine(k, i, { tipe: ev.target.value })}><option value="">{kind === 'add' ? 'Pilih Tipe Penambahan Biaya' : 'Pilih Tipe Pengurangan Biaya'}</option>{types.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label={needsNote(x.tipe) ? 'Notes (wajib)' : 'Notes (Deskripsi Pembayaran)'}><input value={x.notes || ''} aria-invalid={!!err && needsNote(x.tipe) && !String(x.notes || '').trim()} placeholder="Notes (Deskripsi Pembayaran)" onChange={(ev) => setLine(k, i, { notes: ev.target.value })} /></Field>
          <div className="op-amt-row"><Field label="Sebesar">{rupiahInput(x.nominal, (v) => setLine(k, i, { nominal: v }))}</Field>
            <button className="icon-btn danger" aria-label="Hapus baris" onClick={() => setL({ ...l, [k]: l[k].filter((_, j) => j !== i) })}><Icon name="trash" size={16} /></button></div>
          {err && <span className="err-t" style={{ margin: 0 }}>{err}</span>}
        </>}</div>
      })}
      <Btn kind="ghost" icon="plus" onClick={() => setL({ ...l, [k]: [...l[k], { tipe: '', notes: '', nominal: 0 }] })}>{kind === 'add' ? 'Add Addition Payment' : 'Add Deduction Payment'}</Btn>
    </div>
  )
  return (
    <Modal wide open title={`${e.name} – ${l.jenis}`} onClose={onClose} footer={<>
      <span className="muted sm grow">Nett {rupiah(c.net)} · TANI {rupiah(c.tani)}</span>
      <Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn onClick={() => { setTried(true); if (ok) onSave(l) }}>Save</Btn>
    </>}>
      <h3 className="ed-h">Employee Details</h3>
      <div className="jenis-bar" role="radiogroup" aria-label="Jenis request">{JENIS.map((j) => <button key={j} role="radio" aria-checked={l.jenis === j} className={l.jenis === j ? 'on' : ''} onClick={() => setL({ ...l, jenis: j })}>{j}</button>)}</div>
      <div className="ed-grid">
        {FIELDS.map(([k, label, kind]) => {
          const dis = locked.includes(k)
          return <div key={k} className="ed-f"><b>{label}{dis && <Icon name="lock" size={13} />}</b>
            <div className="ed-sb"><div><small>Sebelum</small><div className="ed-before">{k === 'thp' ? rupiah(before[k]) : kind === 'date' ? fmtDate(before[k]) : before[k] || '—'}</div></div><div><small>Sesudah</small>{input(k, kind, dis)}</div></div></div>
        })}
        <div className="ed-f"><b>Skema</b><div className="ed-sb"><div><small>Sebelum</small><div className="ed-before">{e.skema || 'Normal'}</div></div>
          <div><small>Sesudah</small><select value={l.skema} onChange={(ev) => setL({ ...l, skema: ev.target.value })}><option>Normal</option><option>Khusus</option></select></div></div></div>
      </div>
      {tried && l.start && l.end && l.end < l.start && <span className="err-t">Tanggal keluar tidak boleh sebelum tanggal masuk.</span>}
      <hr className="sec-hr" />
      <h3 className="ed-h">Other Payment</h3>
      <div className="op-grid">{col('additions', 'add', 'Addition Payment', ADD_TYPES)}{col('deductions', 'ded', 'Deduction Payment', DED_TYPES)}</div>
      <Note>Baris otomatis berasal dari Lembur, Reimbursement, Absensi, Cuti tidak dibayar, Kliring, THR/KAK, dan halaman Addition & Deduction. Ubah sumbernya lalu tekan Sinkron untuk memperbarui.</Note>
    </Modal>
  )
}

function BankSync({ onClose, go, toast }) {
  const s = useStore(); const [sel, setSel] = useState({}); const [per, setPer] = useState(15); const [page, setPage] = useState(1); const [confirm, setConfirm] = useState(false)
  const all = s.employees.filter((e) => e.branch === MY() && e.status !== 'Nonaktif')
  const pages = Math.max(1, Math.ceil(all.length / per)); const view = all.slice((page - 1) * per, page * per)
  const ids = Object.keys(sel).filter((k) => sel[k])
  const tone = (st) => st === 'Berhasil tersinkronisasi' ? 'ok' : st === 'Belum disinkronisasi' ? 'warn' : 'bad'
  const stOf = (e) => e.bankStatus || (e.bankOk ? 'Berhasil tersinkronisasi' : 'Belum disinkronisasi')
  const pickable = view.filter((e) => !e.bankOk)
  return (
    <Modal wide open title="Synchronize Bank Account" onClose={onClose} footer={<>
      <span className="muted sm grow">Total Karyawan terpilih {ids.length} / {all.length}</span>
      <Btn kind="ghost" onClick={onClose}>Close</Btn><Btn disabled={!ids.length} onClick={() => setConfirm(true)}>Continue</Btn>
    </>}>
      <p className="muted" style={{ margin: 0 }}>Ada beberapa akun yang tidak dapat tersinkronisasi. Mohon diperiksa kembali.</p>
      <div className="tbl-wrap"><table className="tbl tc bank-t">
        <thead><tr><th><input type="checkbox" className="chk" aria-label="Pilih semua" checked={pickable.length > 0 && pickable.every((e) => sel[e.id])} onChange={(ev) => setSel({ ...sel, ...Object.fromEntries(pickable.map((e) => [e.id, ev.target.checked])) })} /></th>
          <th>No.</th><th>Nama</th><th>Nama Bank</th><th>Nomor Akun Bank</th><th>Nama Pemegang Akun Bank</th><th>Catatan</th><th>Action</th></tr></thead>
        <tbody>{view.map((e, i) => <tr key={e.id}>
          <td><input type="checkbox" className="chk" disabled={e.bankOk} checked={!!sel[e.id]} onChange={(ev) => setSel({ ...sel, [e.id]: ev.target.checked })} aria-label={'Pilih ' + e.name} /></td>
          <td>{(page - 1) * per + i + 1}</td><td>{e.name}</td><td>{e.bank || '—'}</td><td>{e.rekening || '—'}</td><td>{e.pemegang || e.name}</td>
          <td><Badge t={tone(stOf(e))}>{stOf(e)}</Badge></td>
          <td><button className="icon-btn" aria-label={`Buka data ${e.name}`} onClick={() => { onClose(); go('data-karyawan/' + e.id) }}><Icon name="user" size={18} /></button></td>
        </tr>)}</tbody>
      </table></div>
      <div className="rb-pager">
        <label className="fsel inline"><span>Show</span><select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1) }}>{[15, 30, 50].map((n) => <option key={n}>{n}</option>)}</select><span>entries</span></label>
        <span className="muted sm">Showing {(page - 1) * per + 1} to {Math.min(page * per, all.length)} of {all.length} entries</span>
        <div className="pager"><button className="icon-btn" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Sebelumnya">‹</button><button className="pg on">{page}</button><button className="icon-btn" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Berikutnya">›</button></div>
      </div>
      <Modal open={confirm} title="Sinkronkan akun bank?" onClose={() => setConfirm(false)} footer={<><Btn kind="ghost" onClick={() => setConfirm(false)}>Batal</Btn><Btn onClick={() => {
        const res = api.syncBankAccounts(ids); setConfirm(false); setSel({})
        const okN = res.filter((r) => r.st === 'Berhasil tersinkronisasi').length
        toast(okN === res.length ? 'Sinkronisasi akun bank berhasil.' : `${okN} berhasil, ${res.length - okN} perlu diperbaiki di Data Karyawan`)
      }}>Sinkronkan</Btn></>}>
        <p style={{ margin: 0 }}>{ids.length} akun akan divalidasi ke payment gateway (nomor rekening dan nama pemegang).</p>
      </Modal>
    </Modal>
  )
}

function RemunList({ status, list, go, branch, toast, setWork }) {
  const [del, setDel] = useState(null); const [note, setNote] = useState(null)
  const sorted = [...list].sort((a, b) => String(b.submittedAt || b.createdAt || '').localeCompare(String(a.submittedAt || a.createdAt || '')))
  return (
    <>
      {status === 'Draft' && <button className="rb-new" onClick={() => { const r = newRemun(); api.saveRemun(r); setWork(r.id); go('remunerasi') }}><Icon name="plus" size={18} />Buat Baru</button>}
      {sorted.length === 0 ? <Card><Empty text={`Tidak ada pengajuan ${status === 'Approved' ? 'yang disetujui' : status}.`} /></Card> : (
        <ul className="rb-list">{sorted.map((r) => <li key={r.id} className="rb-item">
          <BranchLogo name={branch.name} />
          <div className="grow"><strong>{branch.name}</strong><small className="muted">{r.bulan} · {r.rows.length} karyawan</small></div>
          <span className="rb-date">{fmtStamp(r.submittedAt || r.updatedAt || r.createdAt)}</span>
          <div className="rb-act">
            {status === 'Draft' && <>
              <button className="icon-btn" aria-label="Lanjutkan draft" onClick={() => { setWork(r.id); go('remunerasi') }}><Icon name="edit" size={18} /></button>
              <button className="icon-btn danger" aria-label="Hapus draft" onClick={() => setDel(r)}><Icon name="trash" size={18} /></button>
            </>}
            {status === 'Rejected' && <>
              <button className="icon-btn" aria-label="Lihat catatan penolakan" onClick={() => setNote(r)}><Icon name="mail" size={18} /></button>
              <Btn onClick={() => { const n = { ...structuredClone(r), id: uid('r'), status: 'Draft', note: '', sim: null, createdAt: stamp(), recreatedFrom: r.id }; api.saveRemun(n); setWork(n.id); toast('Disalin ke Create. Perbaiki bagian yang ditolak.'); go('remunerasi') }}>Re-create</Btn>
            </>}
            {(status === 'In Review' || status === 'Approved') && <button className="icon-btn" aria-label="Lihat rincian" onClick={() => go('remunerasi/lihat-' + r.id)}><Icon name="eye" size={18} /></button>}
            {status === 'Approved' && <span className="rb-check" aria-label="Disetujui"><Icon name="check" size={14} /></span>}
          </div>
        </li>)}</ul>
      )}
      <Modal open={!!del} title="Hapus draft?" onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn><Btn onClick={() => { api.deleteRemun(del.id); setDel(null); toast('Draft dihapus') }}>Hapus</Btn></>}>
        <p style={{ margin: 0 }}>Draft remunerasi <b>{del?.bulan}</b> ({del?.rows.length} karyawan) akan dihapus permanen.</p>
      </Modal>
      <Modal open={!!note} title="Notes penolakan" onClose={() => setNote(null)} footer={<Btn kind="ghost" onClick={() => setNote(null)}>Tutup</Btn>}>
        <div className="rej-note"><Sticker name="tolak" size={96} /><p style={{ margin: 0 }}>{note?.note || 'Admin tidak menuliskan alasan.'}</p></div>
      </Modal>
    </>
  )
}

function RemunView({ r, go, branch }) {
  const s = useStore(); const [t, toast] = useToast()
  const tot = totals(r.rows, parsePeriod(r.bulan), s.setup)
  const back = r.status === 'Approved' ? 'approval' : r.status === 'In Review' ? 'in-review' : r.status.toLowerCase()
  return (
    <>
      <nav className="crumb"><button onClick={() => go('remunerasi/' + back)}>Remuneration</button><span>›</span><b>{r.bulan}</b></nav>
      <PageHead title={`Remunerasi ${r.bulan}`} sub={`${branch.name} · ${r.rows.length} karyawan · diajukan ${fmtStamp(r.submittedAt || r.createdAt)}`}>
        <Badge>{r.status}</Badge><Btn icon="download" onClick={() => download(r, s, branch.name, toast)}>Download</Btn>
      </PageHead>
      <div className="rb-pills"><span className="rb-pill">Total Bulan Ini: <b>{rupiah(tot.bulan)}</b></span><span className="rb-pill">Sisa Kontrak: <b>{rupiah(tot.sisa)}</b></span></div>
      {(r.files || []).length > 0 && <Card title="Lampiran pendukung"><div className="row-act">{r.files.map((f, i) => <span key={i} className="file-chip"><Icon name="doc" size={14} />{f.name}</span>)}</div></Card>}
      <Card pad={false}><SimTable r={r} /></Card>
      {t}
    </>
  )
}

// Halaman Addition & Deduction: tambahan & potongan manual per karyawan + isi cepat untuk banyak karyawan
function AdjPage({ go, work, branch }) {
  const s = useStore(); const [t, toast] = useToast()
  const bulan = work?.bulan || thisMonth(); const key = `${MY()}|${bulan}`
  const [data, setData] = useState(() => structuredClone(s.remunAdj?.[key] || {}))
  const [q, setQ] = useState(''); const [div, setDiv] = useState(''); const [open, setOpen] = useState(null); const [tried, setTried] = useState(false); const [dirty, setDirty] = useState(false)
  const [bulk, setBulk] = useState({ kind: 'additions', tipe: '', notes: '', nominal: 0 }); const [sel, setSel] = useState({}); const [bulkTried, setBulkTried] = useState(false)
  const emps = s.employees.filter((e) => e.branch === MY() && e.status !== 'Nonaktif')
  const divisi = [...new Set(emps.map((e) => e.divisi).filter(Boolean))]
  const view = emps.filter((e) => (!div || e.divisi === div) && e.name.toLowerCase().includes(q.toLowerCase()))
  const autoOf = useMemo(() => Object.fromEntries(emps.map((e) => [e.id, autoLines(s, e.id, bulan, { thr: work?.thr, kak: work?.kak, jenis: work?.rows.find((r) => r.emp === e.id)?.jenis })])), [s, bulan])
  const edit = (eid, fn) => { const n = structuredClone(data); n[eid] = n[eid] || { additions: [], deductions: [] }; fn(n[eid]); setData(n); setDirty(true) }
  const errs = Object.entries(data).flatMap(([eid, a]) => [...(a.additions || []).map((l) => [eid, lineErr(l, 'add')]), ...(a.deductions || []).map((l) => [eid, lineErr(l, 'ded')])]).filter(([, m]) => m)
  const saveAll = () => {
    setTried(true)
    if (errs.length) { setOpen(errs[0][0]); return toast('Masih ada isian yang belum lengkap') }
    api.saveAdj(key, Object.fromEntries(Object.entries(data).filter(([, a]) => a.additions?.length || a.deductions?.length)))
    setDirty(false); toast('Addition & deduction tersimpan')
  }
  const bulkErr = !bulk.tipe ? 'Pilih keperluan' : needsNote(bulk.tipe) && !bulk.notes.trim() ? 'Notes wajib diisi untuk Lain - Lain' : !(bulk.nominal > 0) ? 'Isi nominal' : Object.values(sel).some(Boolean) ? '' : 'Centang minimal 1 karyawan'
  const applyBulk = () => {
    setBulkTried(true); if (bulkErr) return
    const n = structuredClone(data)
    Object.keys(sel).filter((k) => sel[k]).forEach((eid) => { n[eid] = n[eid] || { additions: [], deductions: [] }; n[eid][bulk.kind].push({ tipe: bulk.tipe, notes: bulk.notes.trim(), nominal: bulk.nominal }) })
    setData(n); setDirty(true); toast(`Ditambahkan ke ${Object.values(sel).filter(Boolean).length} karyawan`); setSel({}); setBulk({ ...bulk, notes: '', nominal: 0 }); setBulkTried(false)
  }
  const typesOf = (k) => k === 'additions' ? ADD_TYPES : DED_TYPES
  const p = parsePeriod(bulan); const co = cutOff(s, p)
  return (
    <>
      <nav className="crumb"><button onClick={() => go('remunerasi')}>Remuneration</button><span>›</span><b>Addition & Deduction</b></nav>
      <PageHead title="Addition & Deduction" sub={`${branch.name} · periode ${bulan}. Isi tambahan & potongan manual; data dari modul lain sudah masuk otomatis.`}>
        <Btn kind="ghost" onClick={() => go('remunerasi')}>Kembali</Btn><Btn icon="check" disabled={!dirty} onClick={saveAll}>Simpan</Btn>
      </PageHead>
      <Note><div>Otomatis dari sistem: <b>Lembur</b> (approved, cut-off {fmtDate(co[0])}–{fmtDate(co[1])}), <b>Reimbursement</b> (approved, belum dibayar), <b>Potongan absen</b> (tidak hadir & cuti tidak dibayar, {workDays(s, MY(), p)} hari kerja), <b>Kliring</b> dari finance{work?.thr ? ', THR' : ''}{work?.kak ? ', KAK' : ''}. Setelah menyimpan, kembali ke Create lalu tekan <b>Sinkron</b>.</div></Note>
      <section className="card adj-bulk">
        <h3>Isi cepat untuk banyak karyawan</h3>
        <div className="adj-bulk-f">
          <Field label="Jenis"><div className="seg">{[['additions', 'Addition'], ['deductions', 'Deduction']].map(([k, l]) => <button key={k} type="button" className={bulk.kind === k ? 'on' : ''} onClick={() => setBulk({ ...bulk, kind: k, tipe: '' })}>{l}</button>)}</div></Field>
          <Field label="Keperluan Pembayaran"><select value={bulk.tipe} aria-invalid={bulkTried && !bulk.tipe} onChange={(e) => setBulk({ ...bulk, tipe: e.target.value })}><option value="">Pilih</option>{typesOf(bulk.kind).map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label={needsNote(bulk.tipe) ? 'Notes (wajib)' : 'Notes'}><input value={bulk.notes} aria-invalid={bulkTried && needsNote(bulk.tipe) && !bulk.notes.trim()} placeholder="Deskripsi pembayaran" onChange={(e) => setBulk({ ...bulk, notes: e.target.value })} /></Field>
          <Field label="Sebesar">{rupiahInput(bulk.nominal, (v) => setBulk({ ...bulk, nominal: v }))}</Field>
          <Btn onClick={applyBulk}>Terapkan ke {Object.values(sel).filter(Boolean).length} terpilih</Btn>
        </div>
        {bulkTried && bulkErr && <span className="err-t" style={{ margin: 0 }}>{bulkErr}</span>}
      </section>
      <div className="filters">
        <label className="fsel"><span>Divisi</span><select value={div} onChange={(e) => setDiv(e.target.value)}><option value="">Semua divisi</option>{divisi.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label className="fsel grow"><span>Cari</span><span className="search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama karyawan" aria-label="Cari nama karyawan" /></span></label>
      </div>
      <section className="card adj-tbl">
        <div className="adj-head">
          <label className="chk-l"><input type="checkbox" className="chk" checked={view.length > 0 && view.every((e) => sel[e.id])} onChange={(ev) => setSel({ ...sel, ...Object.fromEntries(view.map((e) => [e.id, ev.target.checked])) })} />Pilih semua ({view.length})</label>
          <span>Otomatis</span><span>Addition manual</span><span>Deduction manual</span><span />
        </div>
        {view.map((e) => {
          const a = data[e.id] || { additions: [], deductions: [] }; const auto = autoOf[e.id]; const inList = work?.rows.some((r) => r.emp === e.id)
          const nErr = errs.filter(([x]) => x === e.id).length
          return (
            <div key={e.id} className={`adj-row ${open === e.id ? 'open' : ''} ${tried && nErr ? 'bad' : ''}`}>
              <div className="adj-main">
                <label className="chk-l who"><input type="checkbox" className="chk" checked={!!sel[e.id]} onChange={(ev) => setSel({ ...sel, [e.id]: ev.target.checked })} aria-label={'Pilih ' + e.name} />
                  <Avatar name={e.name} size={32} /><span><strong>{e.name}</strong><small className="muted">{e.role} · {e.divisi}{!inList && work ? ' · belum di daftar' : ''}</small></span></label>
                <div className="adj-chips">
                  {[...auto.additions.map((l) => ['+', l]), ...auto.deductions.map((l) => ['−', l])].map(([sg, l], i) => <span key={i} className={`adj-chip ${sg === '+' ? 'pos' : 'neg'}`} title={l.notes}>{sg} {l.tipe === 'Potongan Absen' ? 'Absen' : l.tipe} {rupiah(l.nominal)}</span>)}
                  {!auto.additions.length && !auto.deductions.length && <span className="muted sm">—</span>}
                </div>
                <span className="pos">{sum(a.additions) ? '+ ' + rupiah(sum(a.additions)) : '—'}</span>
                <span className="neg">{sum(a.deductions) ? '− ' + rupiah(sum(a.deductions)) : '—'}</span>
                <Btn kind="ghost" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>{open === e.id ? 'Tutup' : 'Atur'}{nErr > 0 && tried && <Badge t="bad">{nErr}</Badge>}</Btn>
              </div>
              {open === e.id && <div className="adj-edit">{['additions', 'deductions'].map((k) => (
                <div key={k} className="adj-col"><h4>{k === 'additions' ? 'Addition Payment' : 'Deduction Payment'}</h4>
                  {(a[k] || []).length === 0 && <p className="muted sm">Belum ada.</p>}
                  {(a[k] || []).map((l, i) => {
                    const err = tried ? lineErr(l, k === 'additions' ? 'add' : 'ded') : ''
                    const set = (patch) => edit(e.id, (x) => { x[k][i] = { ...x[k][i], ...patch } })
                    return <div key={i} className="adj-line">
                      <select value={l.tipe} aria-label="Keperluan pembayaran" aria-invalid={!!err && !l.tipe} onChange={(ev) => set({ tipe: ev.target.value })}><option value="">Pilih keperluan</option>{typesOf(k).map((o) => <option key={o}>{o}</option>)}</select>
                      <input value={l.notes} placeholder={needsNote(l.tipe) ? 'Notes wajib' : 'Notes'} aria-label="Notes" aria-invalid={!!err && needsNote(l.tipe) && !String(l.notes || '').trim()} onChange={(ev) => set({ notes: ev.target.value })} />
                      {rupiahInput(l.nominal, (v) => set({ nominal: v }))}
                      <button className="icon-btn danger" aria-label="Hapus baris" onClick={() => edit(e.id, (x) => { x[k].splice(i, 1) })}><Icon name="trash" size={16} /></button>
                      {err && <span className="err-t adj-err">{err}</span>}
                    </div>
                  })}
                  <Btn kind="ghost" icon="plus" onClick={() => edit(e.id, (x) => { x[k].push({ tipe: '', notes: '', nominal: 0 }) })}>{k === 'additions' ? 'Tambah addition' : 'Tambah deduction'}</Btn>
                </div>
              ))}</div>}
            </div>
          )
        })}
      </section>
      <div className="row-end"><Btn kind="ghost" onClick={() => go('remunerasi')}>Kembali ke Create</Btn><Btn icon="check" disabled={!dirty} onClick={saveAll}>Simpan</Btn></div>
      {t}
    </>
  )
}
