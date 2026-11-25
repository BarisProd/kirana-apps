// Event (Figma: Admin - Setting Event). List per bulan dengan kalender, Create/Edit, lihat, hapus.
// Tiap event milik satu Branch; peserta dipilih dari karyawan Branch itu. Gambar di-crop 1:1.
import React, { useEffect, useRef, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { Btn, Card, Badge, Modal, Field, useToast, PageHead, Note, Icon, Empty } from '../components/ui.jsx'

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const panjang = (t) => { if (!t) return ''; const [y, m, d] = t.split('-').map(Number); return `${HARI[new Date(y, m - 1, d).getDay()]}, ${d} ${BULAN[m - 1]} ${y}` }
const pendek = (t) => { if (!t) return ''; const [y, m, d] = t.split('-').map(Number); return `${d} ${BULAN[m - 1].slice(0, 3)} ${y}` }
const blank = (branch, tanggal = '') => ({ branch, tanggal, mulai: '', selesai: '', judul: '', gambar: null, peserta: [], kategori: '', link: '', deskripsi: '' })

export function EventAdmin({ sub, go }) {
  const s = useStore()
  const [br, setBr] = useState(''); const now = new Date()
  const [ym, setYm] = useState({ y: 2026, m: now.getFullYear() === 2026 ? now.getMonth() : 10 }); const [flash, setFlash] = useState(false)
  if (sub === 'baru') return <EventForm go={go} init={blank(br || s.branches[0].id)} />
  if (sub && sub.startsWith('ubah-')) { const ev = s.events.find((x) => x.id === sub.slice(5)); return ev ? <EventForm go={go} init={ev} /> : <Missing go={go} /> }
  if (sub) { const ev = s.events.find((x) => x.id === sub); return ev ? <EventView go={go} ev={ev} onDeleted={() => { setFlash(true); go('event') }} /> : <Missing go={go} /> }
  return <EventList go={go} br={br} setBr={setBr} ym={ym} setYm={setYm} flash={flash} setFlash={setFlash} />
}
const Missing = ({ go }) => <><nav className="crumb"><button onClick={() => go('event')}>Event</button><span>›</span><b>Tidak ditemukan</b></nav><Empty text="Event tidak ditemukan atau sudah dihapus." /></>

// ---------- List per bulan ----------
function EventList({ go, br, setBr, ym, setYm, flash, setFlash }) {
  const s = useStore(); const [t, toast] = useToast(); const [del, setDel] = useState(null); const done = flash; const setDone = setFlash; const [pick, setPick] = useState('')
  const { y, m } = ym; const dim = new Date(y, m + 1, 0).getDate(); const first = new Date(y, m, 1).getDay()
  const prefix = iso(y, m, 1).slice(0, 7)
  const list = s.events.filter((e) => (!br || e.branch === br || e.branch === 'all') && e.tanggal.startsWith(prefix)).sort((a, b) => (a.tanggal + a.mulai).localeCompare(b.tanggal + b.mulai))
  const days = [...new Set(list.map((e) => e.tanggal))]
  const shown = pick ? list.filter((e) => e.tanggal === pick) : list
  const groups = [...new Set(shown.map((e) => e.tanggal))].map((d) => [d, shown.filter((e) => e.tanggal === d)])
  const todayIso = iso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const move = (d) => { setPick(''); const n = new Date(y, m + d, 1); setYm({ y: n.getFullYear(), m: n.getMonth() }) }
  const bn = (id) => (id === 'all' ? 'Semua Branch' : s.branches.find((b) => b.id === id)?.name || '—')
  return (
    <>
      <PageHead title="Event" sub="Agenda kantor per Branch. Kalender hanya menampilkan event di bulan yang sedang dibuka.">
        <Btn icon="plus" onClick={() => go('event/baru')}>Buat event</Btn>
      </PageHead>
      <div className="ev-layout">
        <aside className="ev-side">
          <label className="fsel"><span>Branch</span><select value={br} onChange={(e) => { setBr(e.target.value); setPick('') }}><option value="">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <div className="mcal">
            <div className="mcal-h"><button type="button" className="icon-btn" aria-label="Bulan sebelumnya" onClick={() => move(-1)}><Icon name="back" size={18} /></button><strong>{BULAN[m]} {y}</strong><button type="button" className="icon-btn" aria-label="Bulan berikutnya" onClick={() => move(1)}><Icon name="arrowRight" size={18} /></button></div>
            <div className="mcal-g">{HARI.map((h) => <span key={h}>{h.slice(0, 3)}</span>)}
              {Array.from({ length: first }, (_, i) => <i key={'e' + i} />)}
              {Array.from({ length: dim }, (_, i) => { const k = iso(y, m, i + 1); const has = days.includes(k); return has
                ? <button type="button" key={k} className={`ev-day ${pick === k ? 'sel' : ''} ${k === todayIso ? 'today' : ''}`} aria-pressed={pick === k} aria-label={`${pendek(k)}, ${list.filter((e) => e.tanggal === k).length} event`} onClick={() => setPick(pick === k ? '' : k)}>{i + 1}</button>
                : <i key={k} className={k === todayIso ? 'today' : ''}>{i + 1}</i> })}</div>
            <div className="mcal-legend"><span><i style={{ border: '2px solid var(--g)' }} />Ada event</span><span><i style={{ background: 'var(--g)' }} />Dipilih</span><span><i style={{ border: '2px solid var(--y)' }} />Hari ini</span></div>
          </div>
          <p className="muted sm" style={{ margin: 0 }}>{list.length ? `${list.length} event di ${BULAN[m]} ${y}. Klik tanggal untuk memfilter.` : `Belum ada event di ${BULAN[m]} ${y}.`}</p>
        </aside>
        <section className="ev-main">
          {pick && <div className="row-end" style={{ marginTop: 0, justifyContent: 'space-between' }}><span className="muted">Menampilkan {panjang(pick)}</span><Btn kind="ghost" onClick={() => setPick('')}>Tampilkan semua di {BULAN[m]}</Btn></div>}
          {groups.length ? groups.map(([d, evs]) => (
            <Card key={d}><div className="ev-group"><h3 className="ev-date">{panjang(d)}</h3>
              {evs.map((e) => (
                <article key={e.id} className="ev-item">
                  <button type="button" className="ev-thumb" onClick={() => go('event/' + e.id)} aria-label={`Lihat ${e.judul}`}>{e.gambar ? <img src={e.gambar} alt="" /> : <Icon name="calendar" size={22} />}</button>
                  <div className="grow ev-body"><button type="button" className="ev-title" onClick={() => go('event/' + e.id)}>{e.judul}</button>
                    <p>{e.deskripsi || 'Tanpa deskripsi.'}</p>
                    <div className="chips"><Badge t={e.kategori === 'Online' ? 'neutral' : 'ok'}>{e.kategori}</Badge>{(!br || e.branch === 'all') && <Badge t="neutral">{bn(e.branch)}</Badge>}<Badge t="neutral">{e.peserta === 'all' ? 'Semua karyawan' : `${e.peserta.length} peserta`}</Badge></div></div>
                  <div className="ev-time" aria-label="Waktu"><b>{e.mulai}</b><span>s.d.</span><b>{e.selesai}</b></div>
                  <div className="ev-acts"><button type="button" className="icon-btn" aria-label={`Ubah ${e.judul}`} title="Ubah" onClick={() => go('event/ubah-' + e.id)}><Icon name="edit" size={18} /></button>
                    <button type="button" className="icon-btn danger" aria-label={`Hapus ${e.judul}`} title="Hapus" onClick={() => setDel(e)}><Icon name="trash" size={18} /></button></div>
                </article>))}
            </div></Card>)) : <Card><Empty text={`Belum ada event${br ? ' untuk ' + bn(br) : ''} di ${BULAN[m]} ${y}.`} /><div style={{ display: 'grid', justifyItems: 'center', paddingBottom: 20 }}><Btn kind="ghost" icon="plus" onClick={() => go('event/baru')}>Buat event</Btn></div></Card>}
        </section>
      </div>
      <DeleteDialogs ev={del} onCancel={() => setDel(null)} onDone={() => { setDel(null); setDone(true) }} />
      <Modal open={done} title="Terhapus" onClose={() => setDone(false)} footer={<Btn onClick={() => setDone(false)}>OK</Btn>}><div className="center"><Icon name="checkCircle" size={44} /><p style={{ margin: 0 }}>Event berhasil dihapus.</p></div></Modal>
      {t}
    </>
  )
}

const DeleteDialogs = ({ ev, onCancel, onDone }) => (
  <Modal open={!!ev} title="Hapus event" onClose={onCancel} footer={<><Btn kind="ghost" onClick={onCancel}>Batal</Btn><Btn onClick={() => { api.deleteEvent(ev.id); onDone() }}>Ya, hapus</Btn></>}>
    {ev && <p style={{ margin: 0 }}>Anda akan menghapus event <b>“{ev.judul}”</b> pada {pendek(ev.tanggal)}. Event yang dihapus tidak bisa dikembalikan.</p>}
  </Modal>
)

// ---------- Lihat (read-only, tombol Close / Edit seperti Figma "saved") ----------
function EventView({ go, ev, onDeleted }) {
  const s = useStore(); const [del, setDel] = useState(null)
  const emp = ev.branch === 'all' ? s.employees : s.employees.filter((e) => e.branch === ev.branch)
  const bname = ev.branch === 'all' ? 'Semua Branch' : s.branches.find((b) => b.id === ev.branch)?.name
  const names = ev.peserta === 'all' ? `Semua karyawan ${bname} (${emp.length} orang)` : ev.peserta.map((id) => s.employees.find((e) => e.id === id)?.name).filter(Boolean).join(', ')
  const rows = [['Branch', bname], ['Tanggal & waktu', `${panjang(ev.tanggal)} · ${ev.mulai}–${ev.selesai}`], ['Judul', ev.judul], ['Peserta', names || '—'], ['Kategori', ev.kategori], ['Link', ev.link ? <a href={ev.link} target="_blank" rel="noopener">{ev.link}</a> : '—'], ['Deskripsi', ev.deskripsi || '—']]
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button onClick={() => go('event')}>Event</button><span>›</span><b>{ev.judul}</b></nav>
      <Card><div className="ev-view">
        <div className="ev-img-lg">{ev.gambar ? <img src={ev.gambar} alt={`Gambar ${ev.judul}`} /> : <span className="muted"><Icon name="calendar" size={40} /><br />Tanpa gambar</span>}</div>
        <dl className="dl ev-dl">{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
      </div>
        <div className="row-end"><Btn kind="ghost" icon="trash" onClick={() => setDel(ev)}>Hapus</Btn><Btn kind="ghost" onClick={() => go('event')}>Close</Btn><Btn icon="edit" onClick={() => go('event/ubah-' + ev.id)}>Edit</Btn></div>
      </Card>
      <DeleteDialogs ev={del} onCancel={() => setDel(null)} onDone={onDeleted} />
    </>
  )
}

// ---------- Create / Edit ----------
function EventForm({ go, init }) {
  const s = useStore(); const edit = !!init.id
  const [f, setF] = useState(() => structuredClone(init)); const [tried, setTried] = useState(false); const [ask, setAsk] = useState(false); const [ok, setOk] = useState(null); const [crop, setCrop] = useState(null); const [imgErr, setImgErr] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const emps = f.branch === 'all' ? s.employees : s.employees.filter((e) => e.branch === f.branch)
  const err = {}
  if (!f.branch) err.branch = 'Pilih Branch.'
  if (!f.tanggal) err.tanggal = 'Pilih tanggal.'
  if (!f.mulai || !f.selesai) err.jam = 'Isi jam mulai dan selesai.'
  else if (f.mulai >= f.selesai) err.jam = 'Jam selesai harus setelah jam mulai.'
  if (!f.judul.trim()) err.judul = 'Judul wajib diisi.'
  if (f.peserta !== 'all' && !f.peserta.length) err.peserta = 'Pilih minimal satu peserta.'
  if (!f.kategori) err.kategori = 'Pilih kategori.'
  if (f.kategori === 'Online' && !/^https?:\/\/\S+\.\S+/.test(f.link.trim())) err.link = 'Event online butuh link meeting yang valid (diawali https://).'
  const bad = (k) => tried && !!err[k]
  const onFile = (e) => {
    const file = e.target.files[0]; e.target.value = ''; setImgErr(''); if (!file) return
    if (!/^image\/(jpe?g|png)$/.test(file.type)) return setImgErr('Gunakan gambar JPG atau PNG.')
    if (file.size > 2 * 1024 * 1024) return setImgErr('Ukuran gambar maksimal 2 MB.')
    const r = new FileReader(); r.onload = () => setCrop(r.result); r.readAsDataURL(file)
  }
  const reset = () => { setF(structuredClone(init)); setTried(false); setImgErr('') }
  const submit = () => { setTried(true); if (Object.keys(err).length) return; setAsk(true) }
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button onClick={() => go('event')}>Event</button><span>›</span><b>{edit ? 'Edit event' : 'Buat event'}</b></nav>
      <PageHead title={edit ? 'Edit event' : 'Buat event'} sub="Peserta akan menerima undangan di inbox aplikasi." />
      <Card><div className="ev-form">
        <Field label="Branch" hint={bad('branch') ? err.branch : f.branch === 'all' ? 'Event untuk semua Branch. Peserta bisa dipilih dari seluruh karyawan.' : 'Peserta diambil dari karyawan Branch ini.'}><select value={f.branch} aria-invalid={bad('branch')} onChange={(e) => setF({ ...f, branch: e.target.value, peserta: f.peserta === 'all' ? 'all' : [] })}><option value="">Pilih Branch</option><option value="all">Semua Branch</option>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <div className="ev-when">
          <Field label="Tanggal" hint={bad('tanggal') ? err.tanggal : undefined}><input type="date" value={f.tanggal} aria-invalid={bad('tanggal')} onChange={(e) => set('tanggal', e.target.value)} /></Field>
          <Field label="Mulai" hint={bad('jam') ? err.jam : undefined}><input type="time" value={f.mulai} aria-invalid={bad('jam')} onChange={(e) => set('mulai', e.target.value)} /></Field>
          <Field label="Selesai"><input type="time" value={f.selesai} aria-invalid={bad('jam')} onChange={(e) => set('selesai', e.target.value)} /></Field>
        </div>
        <Field label="Judul event" hint={bad('judul') ? err.judul : undefined}><input value={f.judul} maxLength={80} placeholder="Contoh: Townhall Q4 2026" aria-invalid={bad('judul')} onChange={(e) => set('judul', e.target.value)} /></Field>
        <div className="field"><span className="field-l">Gambar event <span className="muted sm" style={{ fontWeight: 600 }}>opsional · rasio 1:1</span></span>
          <div className="ev-upload">
            <div className="ev-img">{f.gambar ? <img src={f.gambar} alt="Pratinjau gambar event" /> : <Icon name="camera" size={28} />}</div>
            <div style={{ display: 'grid', gap: 8, alignContent: 'center' }}>
              <label className="btn btn-ghost up-btn"><Icon name="upload" size={18} />{f.gambar ? 'Ganti gambar' : 'Unggah gambar'}<input type="file" accept="image/png,image/jpeg" aria-label="Unggah gambar event" onChange={onFile} /></label>
              {f.gambar && <Btn kind="ghost" icon="trash" onClick={() => set('gambar', null)}>Hapus gambar</Btn>}
              <span className={imgErr ? 'err-t' : 'muted sm'} style={{ margin: 0 }}>{imgErr || 'JPG/PNG maks. 2 MB. Setelah dipilih, kamu bisa geser & zoom untuk crop 1:1.'}</span>
            </div></div></div>
        <Field label="Peserta" hint={bad('peserta') ? err.peserta : !f.branch ? 'Pilih Branch dulu.' : undefined}><Peserta emps={emps} value={f.peserta} onChange={(v) => set('peserta', v)} disabled={!f.branch} invalid={bad('peserta')} /></Field>
        <div className="field"><span className="field-l">Kategori</span>
          <div className="mode-pick" role="radiogroup" aria-label="Kategori">{[['In Office', 'Tatap muka di kantor'], ['Online', 'Lewat Google Meet / Zoom']].map(([k, h]) => <label key={k} className={f.kategori === k ? 'on' : ''}><input type="radio" name="kat" checked={f.kategori === k} onChange={() => set('kategori', k)} /><span><span>{k}</span><small>{h}</small></span></label>)}</div>
          {bad('kategori') && <span className="err-t" style={{ margin: 0 }}>{err.kategori}</span>}</div>
        <Field label={f.kategori === 'Online' ? 'Link meeting' : 'Link (opsional)'} hint={bad('link') ? err.link : undefined}><input type="url" value={f.link} placeholder="https://meet.google.com/…" aria-invalid={bad('link')} onChange={(e) => set('link', e.target.value)} /></Field>
        <Field label="Deskripsi"><textarea rows={4} value={f.deskripsi} maxLength={500} placeholder="Agenda singkat, apa yang perlu disiapkan peserta" onChange={(e) => set('deskripsi', e.target.value)} /></Field>
      </div>
        {tried && Object.keys(err).length > 0 && <Note>Masih ada {Object.keys(err).length} isian yang perlu dicek.</Note>}
        <div className="row-end"><Btn kind="ghost" onClick={() => (edit ? go('event/' + init.id) : go('event'))}>Batal</Btn><Btn kind="ghost" onClick={reset}>Reset</Btn><Btn onClick={submit}>Save</Btn></div>
      </Card>
      {crop && <Cropper src={crop} onCancel={() => setCrop(null)} onDone={(url) => { set('gambar', url); setCrop(null) }} />}
      <Modal open={ask} title={edit ? 'Simpan perubahan' : 'Buat event'} onClose={() => setAsk(false)} footer={<><Btn kind="ghost" onClick={() => setAsk(false)}>Batal</Btn><Btn onClick={() => { const id = api.saveEvent({ ...f, judul: f.judul.trim(), link: f.link.trim() }); setAsk(false); setOk(id) }}>Lanjutkan</Btn></>}>
        <p style={{ margin: 0 }}>Anda akan {edit ? 'menyimpan perubahan event' : 'membuat event'} <b>“{f.judul.trim()}”</b> pada <b>{pendek(f.tanggal)}</b>, {f.mulai}–{f.selesai}. Peserta akan menerima {edit ? 'pemberitahuan perubahan' : 'undangan'}. Lanjutkan?</p>
      </Modal>
      <Modal open={!!ok} title="Tersimpan" onClose={() => go('event/' + ok)} footer={<Btn onClick={() => go('event/' + ok)}>OK</Btn>}><div className="center"><Icon name="checkCircle" size={44} /><p style={{ margin: 0 }}>Event berhasil {edit ? 'diperbarui' : 'dibuat'}.</p></div></Modal>
    </>
  )
}

// Dropdown peserta multi-pilih dengan pencarian dan "Semua karyawan"
function Peserta({ emps, value, onChange, disabled, invalid }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const ref = useRef(null)
  useEffect(() => { if (!open) return; const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [open])
  const all = value === 'all'; const sel = all ? emps.map((e) => e.id) : value
  const label = all ? `Semua karyawan (${emps.length})` : sel.length ? emps.filter((e) => sel.includes(e.id)).map((e) => e.name).join(', ') : 'Pilih peserta'
  const toggle = (id) => { const cur = all ? emps.map((e) => e.id) : value; const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; onChange(next.length === emps.length && emps.length ? 'all' : next) }
  const list = emps.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="ms" ref={ref}>
      <button type="button" className={`ms-btn ${sel.length ? '' : 'ph'}`} disabled={disabled} aria-expanded={open} aria-invalid={invalid} onClick={() => setOpen(!open)}><span>{label}</span><Icon name="arrowRight" size={16} /></button>
      {open && <div className="ms-pop" role="listbox" aria-multiselectable="true">
        <label className="search" style={{ maxWidth: 'none', margin: 8 }}><Icon name="search" size={16} /><input autoFocus placeholder="Cari nama" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari peserta" /></label>
        <label className="ms-opt all"><input type="checkbox" className="chk" checked={all} onChange={() => onChange(all ? [] : 'all')} />Semua karyawan</label>
        {list.map((e) => <label key={e.id} className="ms-opt"><input type="checkbox" className="chk" checked={sel.includes(e.id)} onChange={() => toggle(e.id)} /><span className="grow">{e.name}<small>{e.role}</small></span></label>)}
        {!list.length && <p className="muted sm" style={{ padding: '8px 14px', margin: 0 }}>Nama tidak ditemukan.</p>}
        <div className="ms-foot"><span className="muted sm">{sel.length} dipilih</span><Btn onClick={() => setOpen(false)}>Selesai</Btn></div>
      </div>}
    </div>
  )
}

// Crop 1:1: geser gambar dan atur zoom, hasil 600×600 JPG
function Cropper({ src, onCancel, onDone }) {
  const V = 300; const [img, setImg] = useState(null); const [z, setZ] = useState(1); const [pos, setPos] = useState({ x: 0, y: 0 }); const drag = useRef(null)
  useEffect(() => { const i = new Image(); i.onload = () => { setImg(i); const sc = V / Math.min(i.width, i.height); setPos({ x: (V - i.width * sc) / 2, y: (V - i.height * sc) / 2 }) }; i.src = src }, [src])
  if (!img) return null
  const base = V / Math.min(img.width, img.height); const sc = base * z; const W = img.width * sc, H = img.height * sc
  const clamp = (p, w = W, h = H) => ({ x: Math.min(0, Math.max(V - w, p.x)), y: Math.min(0, Math.max(V - h, p.y)) })
  const zoom = (nz) => { const ns = base * nz; const cx = (V / 2 - pos.x) / sc, cy = (V / 2 - pos.y) / sc; setZ(nz); setPos(clamp({ x: V / 2 - cx * ns, y: V / 2 - cy * ns }, img.width * ns, img.height * ns)) }
  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y } }
  const moveP = (e) => { if (drag.current) setPos(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })) }
  const key = (e) => { const d = { ArrowLeft: [10, 0], ArrowRight: [-10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[e.key]; if (d) { e.preventDefault(); setPos(clamp({ x: pos.x + d[0], y: pos.y + d[1] })) } }
  const done = () => { const c = document.createElement('canvas'); c.width = c.height = 600; const ctx = c.getContext('2d'); ctx.drawImage(img, -pos.x / sc, -pos.y / sc, V / sc, V / sc, 0, 0, 600, 600); onDone(c.toDataURL('image/jpeg', 0.86)) }
  return (
    <Modal open title="Crop gambar 1:1" onClose={onCancel} footer={<><Btn kind="ghost" onClick={onCancel}>Batal</Btn><Btn icon="check" onClick={done}>Pakai gambar</Btn></>}>
      <div className="crop-box" style={{ width: V, height: V }} onPointerDown={down} onPointerMove={moveP} onPointerUp={() => { drag.current = null }} onKeyDown={key} tabIndex={0} role="application" aria-label="Area crop. Seret atau pakai tombol panah untuk menggeser gambar.">
        <img src={src} alt="" draggable={false} style={{ width: W, height: H, transform: `translate(${pos.x}px, ${pos.y}px)` }} />
        <span className="crop-grid" aria-hidden="true" />
      </div>
      <label className="crop-zoom"><Icon name="search" size={16} /><input type="range" min="1" max="3" step="0.01" value={z} onChange={(e) => zoom(Number(e.target.value))} aria-label="Zoom" /><span className="muted sm">{Math.round(z * 100)}%</span></label>
      <p className="muted sm" style={{ margin: 0, textAlign: 'center' }}>Seret gambar untuk mengatur posisi. Bagian di dalam kotak yang akan dipakai.</p>
    </Modal>
  )
}
