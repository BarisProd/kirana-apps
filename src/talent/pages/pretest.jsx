// Pre-test: rangkaian soal (maks 5, hanya 1 aktif), tiap rangkaian maks 3 modul.
// Dipakai di Admin › Pre-test, Branch › New Job Post (menempel per lowongan), dan Talent › Pre-test.
import React, { useEffect, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { Btn, Card, Badge, Modal, Field, Toggle, useToast, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { SelfInterview } from '../components/SelfInterview.jsx'
import { fmtDate } from './shared.jsx'

export const MAX_SET = 5
export const MAX_MODUL = 3
export const MAX_ESSAY = 20000 // kata
export const MAX_UPLOAD_MB = 800
export const TIPE = ['Live Recording', 'Pilihan Ganda', 'Upload Dokumen', 'Essay']
export const KATEGORI = ['Wawancara Mandiri', 'Tes Kepribadian', 'Tes Kompetensi']
const DUR_LIVE = [30, 60, 90, 120]
const DUR = [30, 45, 60, 75, 90, 105, 120]
const TIPE_HINT = {
  'Live Recording': 'Self interview: talent merekam dirinya menjawab tiap pertanyaan. 3 kali kesempatan rekam, pilih 1 video per pertanyaan.',
  'Pilihan Ganda': 'Tiap pertanyaan punya 4 pilihan jawaban. Tandai jawaban yang benar.',
  'Upload Dokumen': `Talent menjawab dengan tautan atau unggah file, maksimal ${MAX_UPLOAD_MB} MB.`,
  Essay: `Talent menulis jawaban, maksimal ${MAX_ESSAY.toLocaleString('id-ID')} kata.`,
}

// 10 ikon modul sesuai Figma "Pilih Logo"
const P = {
  otak: <><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V7a3 3 0 0 0-3-3z" /><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 0" /></>,
  video: <><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3z" /></>,
  setting: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  kuas: <><path d="M20 4l-9 9" /><path d="M11 13c-3 0-5 2-5 5 0 1-1 2-2 2 4 1 9 0 9-5z" /></>,
  coding: <><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
  buku: <><path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M9 7h7M9 11h7" /></>,
  angka: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10v5M10 10h2v2.5h-2V15h2M15 10h2v5h-2M15 12.5h2" /></>,
  pensil: <><path d="M12 3l5 11-5 7-5-7z" /><path d="M12 14v7M9.5 9h5" /></>,
  picture: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 9" /></>,
  love: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
}
export const IKON = Object.keys(P)
const IKON_LABEL = { otak: 'Otak', video: 'Video', setting: 'Setting', kuas: 'Kuas', coding: 'Coding', buku: 'Buku', angka: 'Angka', pensil: 'Ujung pensil', picture: 'Picture', love: 'Love' }
export const ModIcon = ({ name, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name] || P.buku}</svg>
)
export const kata = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)
const newId = (p) => p + Math.random().toString(36).slice(2, 8)
const soalBaru = (tipe) => (tipe === 'Pilihan Ganda' ? { q: '', opsi: ['', '', '', ''], benar: 0 } : { q: '' })
export const modulBaru = (tipe) => ({ id: newId('md'), tipe, judul: '', instruksi: '', kategori: '', durasi: '', icon: '', soal: [soalBaru(tipe)] })
const modulValid = (m) => m.judul.trim() && m.instruksi.trim() && m.kategori && m.durasi && m.icon && m.soal.length > 0 &&
  m.soal.every((x) => x.q.trim() && (m.tipe !== 'Pilihan Ganda' || x.opsi.every((o) => o.trim())))

// ---------- Form satu modul (urutan mengikuti Figma) ----------
export function ModulForm({ value, onSave, onClose }) {
  const [m, setM] = useState(value)
  useEffect(() => setM(value), [value])
  if (!m) return null
  const set = (k, v) => setM({ ...m, [k]: v })
  const setSoal = (i, patch) => set('soal', m.soal.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const dur = m.tipe === 'Live Recording' ? DUR_LIVE : DUR
  return (
    <Modal wide open title={'Modul ' + m.tipe} onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn icon="check" disabled={!modulValid(m)} onClick={() => onSave(m)}>Save</Btn></>}>
      <p className="muted">Silahkan atur soal yang akan diujikan. {TIPE_HINT[m.tipe]} Semua isian wajib diisi.</p>
      <Field label="Judul Tes"><input value={m.judul} onChange={(e) => set('judul', e.target.value)} placeholder="Masukkan judul nama tes" /></Field>
      <Field label="Instruksi Tes"><textarea rows={3} value={m.instruksi} onChange={(e) => set('instruksi', e.target.value)} placeholder="Masukkan deskripsi soal" /></Field>
      <div className="form two">
        <Field label="Kategori"><select value={m.kategori} onChange={(e) => set('kategori', e.target.value)}><option value="">Pilih kategori</option>{KATEGORI.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Durasi Waktu"><select value={m.durasi} onChange={(e) => set('durasi', Number(e.target.value) || '')}><option value="">Pilih durasi waktu</option>{dur.map((d) => <option key={d} value={d}>{d} menit</option>)}</select></Field>
      </div>
      <Field label="Pilih Logo"><div className="ikon-row" role="radiogroup" aria-label="Pilih logo">{IKON.map((k) => (
        <button type="button" key={k} role="radio" aria-checked={m.icon === k} title={IKON_LABEL[k]} aria-label={IKON_LABEL[k]} className={`ikon ${m.icon === k ? 'on' : ''}`} onClick={() => set('icon', k)}><ModIcon name={k} /></button>))}</div></Field>
      <hr />
      {m.soal.map((x, i) => (
        <div key={i} className="soal">
          <div className="soal-h"><strong>Pertanyaan {i + 1}</strong><button type="button" className="icon-btn" title="Hapus pertanyaan" aria-label={`Hapus pertanyaan ${i + 1}`} disabled={m.soal.length === 1} onClick={() => set('soal', m.soal.filter((_, j) => j !== i))}><Icon name="trash" size={18} /></button></div>
          <textarea rows={2} value={x.q} onChange={(e) => setSoal(i, { q: e.target.value })} placeholder="Masukkan pertanyaan" aria-label={`Pertanyaan ${i + 1}`} />
          {m.tipe === 'Pilihan Ganda' && <div className="opsi-grid">{x.opsi.map((o, k) => (
            <label key={k} className={`opsi ${x.benar === k ? 'on' : ''}`}><input type="radio" name={`benar-${m.id}-${i}`} checked={x.benar === k} onChange={() => setSoal(i, { benar: k })} aria-label={`Tandai pilihan ${'ABCD'[k]} sebagai jawaban benar`} />
              <b>{'ABCD'[k]}.</b><input value={o} onChange={(e) => setSoal(i, { opsi: x.opsi.map((y, z) => (z === k ? e.target.value : y)) })} placeholder={`Pilihan ganda ${k + 1}`} aria-label={`Pilihan ${'ABCD'[k]}`} /></label>))}
            <span className="muted sm">Pilih bulatan di kiri untuk menandai jawaban yang benar. Jawaban benar: <b>{'ABCD'[x.benar]}</b></span></div>}
        </div>))}
      <div className="center"><Btn kind="ghost" icon="plus" onClick={() => set('soal', [...m.soal, soalBaru(m.tipe)])}>Tambah Pertanyaan</Btn></div>
    </Modal>
  )
}

// ---------- Kartu modul + editor rangkaian (dipakai admin & branch) ----------
export const ModulCard = ({ m, onEdit, onDelete }) => (
  <div className="modul-card">
    <span className="modul-ic"><ModIcon name={m.icon} size={26} /></span>
    <div className="grow"><strong>{m.judul || 'Modul tanpa judul'}</strong><div className="muted sm">{m.tipe} · {m.kategori} · {m.durasi} menit · {m.soal.length} pertanyaan</div></div>
    {onEdit && <button type="button" className="icon-btn" title="Edit modul" aria-label={'Edit ' + m.judul} onClick={onEdit}><Icon name="edit" size={18} /></button>}
    {onDelete && <button type="button" className="icon-btn" title="Hapus modul" aria-label={'Hapus ' + m.judul} onClick={onDelete}><Icon name="trash" size={18} /></button>}
  </div>
)
export function ModulList({ modul, onChange }) {
  const [edit, setEdit] = useState(null); const [tipe, setTipe] = useState('')
  const full = modul.length >= MAX_MODUL
  const save = (m) => { onChange(modul.some((x) => x.id === m.id) ? modul.map((x) => (x.id === m.id ? m : x)) : [...modul, m]); setEdit(null) }
  return (
    <>
      <div className="filters">
        <label className="fsel grow"><span>Buat modul baru ({modul.length}/{MAX_MODUL})</span><select value={tipe} disabled={full} onChange={(e) => setTipe(e.target.value)}><option value="">Pilih jenis modul</option>{TIPE.map((x) => <option key={x}>Modul {x}</option>)}</select></label>
        <Btn icon="plus" disabled={full || !tipe} onClick={() => { setEdit(modulBaru(tipe.replace('Modul ', ''))); setTipe('') }}>Create</Btn>
      </div>
      {full && <p className="muted sm">Satu rangkaian maksimal {MAX_MODUL} modul. Hapus salah satu untuk menggantinya.</p>}
      {KATEGORI.map((k) => { const l = modul.filter((m) => m.kategori === k); return (
        <div key={k} className="kat"><strong>Kategori: {k}</strong>{l.length ? l.map((m) => <ModulCard key={m.id} m={m} onEdit={() => setEdit(m)} onDelete={() => onChange(modul.filter((x) => x.id !== m.id))} />) : <p className="muted sm">Belum ada modul di kategori ini.</p>}</div>) })}
      <ModulForm value={edit} onSave={save} onClose={() => setEdit(null)} />
    </>
  )
}

// ---------- Admin › Pre-test ----------
export function PretestAdmin() {
  const s = useStore(); const [t, toast] = useToast()
  const [ed, setEd] = useState(null); const [view, setView] = useState(null); const [del, setDel] = useState(null)
  const sets = s.pretestSets; const full = sets.length >= MAX_SET
  return (
    <>
      <PageHead title="Pre-test" sub={`Maksimal ${MAX_SET} rangkaian soal, dan hanya satu yang boleh aktif. Rangkaian aktif itulah yang dikerjakan talent.`}>
        <Btn icon="plus" disabled={full} onClick={() => setEd({ id: null, nama: '', modul: [] })}>Buat rangkaian soal</Btn>
      </PageHead>
      {full && <Note>Sudah ada {MAX_SET} rangkaian soal. Hapus salah satu untuk membuat yang baru.</Note>}
      {sets.length === 0 ? <Card><Empty text="Belum ada rangkaian soal." /></Card> : <div className="set-list">{sets.map((x) => (
        <div key={x.id} className={`set-card ${x.aktif ? 'on' : ''}`}>
          <Toggle on={x.aktif} onChange={() => { api.activatePretestSet(x.id); toast(x.aktif ? 'Rangkaian dinonaktifkan' : `"${x.nama}" aktif. Rangkaian lain otomatis nonaktif`) }} label={x.aktif ? 'Aktif' : 'Nonaktif'} />
          <div className="grow"><strong>{x.nama}</strong><div className="muted sm">Dibuat {fmtDate(x.dibuat)} · {x.modul.length} modul</div>
            <div className="chips">{x.modul.map((m) => <Badge key={m.id} t="neutral">{m.judul}</Badge>)}</div></div>
          <div className="row-act">
            <Btn kind="ghost" icon="eye" onClick={() => setView(x)}>Lihat rincian</Btn>
            <button className="icon-btn" title="Edit rangkaian" aria-label={'Edit ' + x.nama} onClick={() => setEd(structuredClone(x))}><Icon name="edit" size={20} /></button>
            <button className="icon-btn" title="Hapus rangkaian" aria-label={'Hapus ' + x.nama} onClick={() => setDel(x)}><Icon name="trash" size={20} /></button>
          </div>
        </div>))}</div>}
      <Modal wide open={!!ed} title={ed?.id ? 'Edit Rangkaian Tes' : 'Modul Rangkaian Tes'} onClose={() => setEd(null)} footer={<><Btn kind="ghost" onClick={() => setEd(null)}>Batal</Btn><Btn icon="check" disabled={!ed?.nama.trim() || !ed?.modul.length} onClick={() => { api.savePretestSet(ed.id, { nama: ed.nama.trim(), modul: ed.modul }); setEd(null); toast('Rangkaian soal tersimpan') }}>Save</Btn></>}>
        {ed && <><p className="muted">Silahkan atur soal yang akan diujikan Pre-Test bagi calon karyawan.</p>
          <Field label="Nama rangkaian soal"><input value={ed.nama} onChange={(e) => setEd({ ...ed, nama: e.target.value })} placeholder="Ketikkan nama modul rangkaian tes" /></Field>
          <ModulList modul={ed.modul} onChange={(modul) => setEd({ ...ed, modul })} /></>}
      </Modal>
      <Modal wide open={!!view} title={view ? view.nama : ''} onClose={() => setView(null)} footer={<Btn kind="ghost" onClick={() => setView(null)}>Close</Btn>}>
        {view && <><p className="muted">Dibuat {fmtDate(view.dibuat)} · <Badge t={view.aktif ? 'ok' : 'neutral'}>{view.aktif ? 'Aktif' : 'Nonaktif'}</Badge></p>
          {view.modul.map((m) => <div key={m.id} className="kat"><ModulCard m={m} /><p>{m.instruksi}</p>
            <ol className="soal-view">{m.soal.map((q, i) => <li key={i}>{q.q}{m.tipe === 'Pilihan Ganda' && <ul>{q.opsi.map((o, k) => <li key={k} className={q.benar === k ? 'benar' : ''}>{'ABCD'[k]}. {o}{q.benar === k ? ' ✓ jawaban benar' : ''}</li>)}</ul>}</li>)}</ol></div>)}</>}
      </Modal>
      <Modal open={!!del} title="Konfirmasi" onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn><Btn onClick={() => { api.deletePretestSet(del.id); setDel(null); toast('Rangkaian soal dihapus') }}>Hapus</Btn></>}>
        <div className="center"><span className="q-ic">?</span><p>Hapus rangkaian <b>{del?.nama}</b>? {del?.aktif ? 'Rangkaian ini sedang aktif, jadi talent tidak akan punya pre-test sampai rangkaian lain diaktifkan.' : 'Tindakan ini tidak bisa dibatalkan.'}</p></div>
      </Modal>{t}
    </>
  )
}

// ---------- Talent: mengerjakan modul ----------
const mmss = (d) => `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`
function Runner({ m, onDone, onClose }) {
  const [left, setLeft] = useState(m.durasi * 60); const [ans, setAns] = useState({}); const [rec, setRec] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { const i = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(i) }, [])
  useEffect(() => { if (!rec) return; const i = setTimeout(() => { setAns((a) => { const cur = a[rec.i] || { takes: [], pick: null }; const takes = [...cur.takes, `Rekaman ${cur.takes.length + 1}`]; return { ...a, [rec.i]: { takes, pick: cur.pick ?? 0 } } }); setRec(null) }, 2500); return () => clearTimeout(i) }, [rec])
  const set = (i, v) => setAns({ ...ans, [i]: v })
  const filled = (i) => { const a = ans[i]; if (m.tipe === 'Live Recording') return a && a.pick != null; if (m.tipe === 'Pilihan Ganda') return a != null; if (m.tipe === 'Essay') return a && kata(a) > 0 && kata(a) <= MAX_ESSAY; return a && (a.link?.trim() || a.file) }
  const all = m.soal.every((_, i) => filled(i))
  return (
    <Modal wide open title={m.judul} onClose={onClose} footer={<><span className="muted sm grow">{m.soal.filter((_, i) => filled(i)).length}/{m.soal.length} pertanyaan terjawab</span><Btn disabled={!all || left === 0} onClick={onDone}>Kirim jawaban</Btn></>}>
      <div className={`timer ${left < 300 ? 'low' : ''}`} role="timer">Sisa waktu {mmss(left)}</div>
      {left === 0 && <div className="err"><p>Waktu habis. Jawaban tidak bisa dikirim lagi.</p></div>}
      <p>{m.instruksi}</p>
      {m.soal.map((q, i) => { const a = ans[i]; return (
        <div key={i} className="soal">
          <strong>Pertanyaan {i + 1}</strong><p>{q.q}</p>
          {m.tipe === 'Live Recording' && <>
            <div className="takes">{(a?.takes || []).map((tk, k) => <label key={k} className={`opsi ${a.pick === k ? 'on' : ''}`}><input type="radio" name={`take-${i}`} checked={a.pick === k} onChange={() => set(i, { ...a, pick: k })} /><ModIcon name="video" size={18} />{tk}{a.pick === k ? ' · dikirim' : ''}</label>)}</div>
            {rec?.i === i ? <div className="rec" role="status"><span className="rec-dot" />Merekam…</div>
              : <Btn kind="ghost" icon="camera" disabled={(a?.takes.length || 0) >= 3 || !!rec} onClick={() => setRec({ i })}>{(a?.takes.length || 0) >= 3 ? 'Kesempatan rekam habis' : `Rekam (${3 - (a?.takes.length || 0)} kesempatan lagi)`}</Btn>}
            <span className="muted sm">Maksimal 3 kali rekam. Pilih 1 video yang dikirim untuk pertanyaan ini.</span></>}
          {m.tipe === 'Pilihan Ganda' && <div className="opsi-grid">{q.opsi.map((o, k) => <label key={k} className={`opsi ${a === k ? 'on' : ''}`}><input type="radio" name={`pg-${i}`} checked={a === k} onChange={() => set(i, k)} /><b>{'ABCD'[k]}.</b> {o}</label>)}</div>}
          {m.tipe === 'Essay' && <><textarea rows={5} value={a || ''} onChange={(e) => set(i, e.target.value)} placeholder="Tulis jawabanmu di sini" aria-label={`Jawaban pertanyaan ${i + 1}`} />
            <span className={`muted sm ${kata(a || '') > MAX_ESSAY ? 'over' : ''}`}>{kata(a || '').toLocaleString('id-ID')} / {MAX_ESSAY.toLocaleString('id-ID')} kata</span></>}
          {m.tipe === 'Upload Dokumen' && <>
            <Field label="Tautan dokumen"><input type="url" value={a?.link || ''} onChange={(e) => set(i, { ...a, link: e.target.value })} placeholder="https://..." /></Field>
            <span className={`upl ${a?.file ? 'has' : ''}`}><Icon name="upload" size={18} /><span>{a?.file || `atau unggah file (maks ${MAX_UPLOAD_MB} MB)`}</span><input type="file" aria-label={`Unggah jawaban pertanyaan ${i + 1}`} onChange={(e) => { const f = e.target.files[0]; if (!f) return; if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { setErr(`"${f.name}" lebih dari ${MAX_UPLOAD_MB} MB. Kecilkan filenya atau kirim sebagai tautan.`); e.target.value = ''; return } setErr(''); set(i, { ...a, file: f.name }) }} /></span>
            {err && <div className="err"><p>{err}</p></div>}</>}
        </div>) })}
    </Modal>
  )
}
// who = id talent yang login: modul selesai disimpan per talent di store (pretestDone). Tanpa who (pre-test publik) cukup di memori halaman.
export function PretestTalent({ modul, title, who } = {}) {
  const s = useStore(); const [t, toast] = useToast(); const [run, setRun] = useState(null); const [local, setLocal] = useState([])
  const done = who ? (s.pretestDone[who] || []) : local
  const setDone = (l) => { if (who) l.filter((x) => !done.includes(x)).forEach((id) => api.finishPretest(who, id)); else setLocal(l) }
  const aktif = s.pretestSets.find((x) => x.aktif)
  const set = modul ? { nama: title || 'Pre-test lowongan', modul } : aktif
  if (run && run.tipe === 'Live Recording') return <><SelfInterview m={run} onExit={() => setRun(null)} onDone={() => { setDone([...done, run.id]); setRun(null); toast('Jawaban self interview terkirim') }} />{t}</>
  return (
    <>
      <PageHead title={title || 'Pre-test'} sub="Kerjakan semua modul. Pastikan koneksi internet stabil sebelum mulai." />
      {!set ? <Card><Empty text="Belum ada pre-test yang perlu dikerjakan." /></Card> : <>
        <p className="muted">Rangkaian: <b>{set.nama}</b> · {set.modul.filter((m) => done.includes(m.id)).length}/{set.modul.length} modul selesai</p>
        {who && set.modul.every((m) => done.includes(m.id)) && <Note><div>Semua modul sudah kamu kerjakan 🎉 Hasilnya dinilai HR dan dipakai Branch saat menyeleksi lamaranmu.{s.pool.find((p) => p.id === who)?.skor ? <> Skor rata-rata: <b>{s.pool.find((p) => p.id === who).skor}</b>.</> : ''}</div></Note>}
        <div className="mods">{set.modul.map((m) => (
          <Card key={m.id}><div className="batch-row"><span className="modul-ic"><ModIcon name={m.icon} size={26} /></span>
            <div className="grow"><strong>{m.judul}</strong><div className="muted sm">{m.tipe === 'Live Recording' ? 'Self Interview' : m.tipe} · {m.soal.length} pertanyaan · {m.durasi} menit</div></div>
            {done.includes(m.id) ? <Badge t="ok">Selesai</Badge> : <Btn onClick={() => setRun(m)}>Mulai</Btn>}</div></Card>))}</div>
        <Note>Self Interview memakai kamera & mikrofon perangkatmu. Izinkan akses saat browser meminta. Rekaman di prototipe hanya tersimpan selama halaman terbuka.</Note></>}
      {run && run.tipe !== 'Live Recording' && <Runner m={run} onClose={() => setRun(null)} onDone={() => { setDone([...done, run.id]); setRun(null); toast('Jawaban terkirim') }} />}{t}
    </>
  )
}
