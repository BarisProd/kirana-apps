// Penilaian pre-test (Figma: HC Product - Detail Mode Upload Dokumen / Pilihan Ganda / Modul Essay / Wawancara Mandiri)
import React, { useEffect, useMemo, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { Btn, Card, Badge, Table, Tabs, Modal, useToast, Avatar, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { modulesFor, answersFor, pgSummary, PREVIEWABLE, extOf } from '../services/answers.js'
import { save } from '../services/export.js'
import { textPdf } from '../services/docs.js'
import { Logo } from './Landing.jsx'

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const tgl = (t) => { const [y, m, d] = t.split('-').map(Number); return `${d} ${BULAN[m - 1]} ${y}` }
const TIPE = { 'Live Recording': 'Wawancara mandiri (video)', 'Pilihan Ganda': 'Pilihan ganda', 'Upload Dokumen': 'Upload dokumen', Essay: 'Essay' }
const fileUrl = (pid, mid, qi, fi) => `#/berkas/${pid}/${mid}/${qi}/${fi}`

export function Penilaian({ sub, go }) {
  const s = useStore(); const [t, toast] = useToast(); const [tab, setTab] = useState('Belum Dinilai')
  if (sub) { const [pid, mid] = sub.split('~'); const p = s.pool.find((x) => x.id === pid); const m = p && modulesFor(s, p).find((x) => x.id === mid); return p && m ? <ModulDetail p={p} m={m} go={go} /> : <Empty text="Modul tidak ditemukan." /> }
  const rows = s.pool.filter((p) => (tab === 'Belum Dinilai' ? p.status === 'Pending Assessment' : p.skor != null))
  return (
    <>
      <PageHead title="Penilaian Pre-test" sub="Buka Detail tiap modul untuk melihat jawaban dan memberi nilai 1–100. Pilihan ganda dinilai otomatis." />
      <Tabs tabs={['Belum Dinilai', 'Sudah Dinilai']} value={tab} onChange={setTab} />
      {rows.length === 0 && <Card><Empty text={tab === 'Belum Dinilai' ? 'Semua pre-test sudah dinilai.' : 'Belum ada yang dinilai.'} /></Card>}
      {rows.map((p) => <ScoreCard key={p.id} p={p} done={tab !== 'Belum Dinilai'} go={go} onSave={(avg) => { api.scorePool(p.id, avg); toast(`Nilai ${p.name} tersimpan. Masuk Active Pool.`) }} />)}
      {t}
    </>
  )
}

export const nilaiModul = (s, p, m) => (m.tipe === 'Pilihan Ganda' ? pgSummary(answersFor(p, m)).nilai : s.penilaian[p.id]?.[m.id] ?? (p.skor != null ? p.skor : null))

function ScoreCard({ p, done, go, onSave }) {
  const s = useStore(); const mods = modulesFor(s, p)
  const nilai = mods.map((m) => nilaiModul(s, p, m)); const lengkap = nilai.every((v) => v != null)
  const avg = lengkap ? Math.round(nilai.reduce((a, b) => a + Number(b), 0) / nilai.length) : null
  return (
    <Card title={<span className="who"><Avatar name={p.name} size={32} /><span><strong>{p.name}</strong><small className="muted" style={{ display: 'block', fontWeight: 600 }}>{p.spesialisasi} · {p.pendidikan}</small></span></span>} action={<Badge>{done ? 'Skor ' + p.skor : `${nilai.filter((v) => v != null).length}/${mods.length} modul dinilai`}</Badge>}>
      <Table center rows={mods} cols={[
        { h: 'Modul', r: (m) => <strong>{m.judul}</strong> }, { h: 'Tipe', r: (m) => TIPE[m.tipe] }, { h: 'Durasi', r: (m) => m.durasi + ' menit' },
        { h: 'Skor', r: (m) => { const v = nilai[mods.indexOf(m)]; return v == null ? <Badge t="warn">Belum dinilai</Badge> : <b>{v}{m.tipe === 'Pilihan Ganda' && <small className="muted"> otomatis</small>}</b> } },
        { h: 'Detail', r: (m) => <Btn kind="ghost" icon="eye" onClick={() => go(`penilaian/${p.id}~${m.id}`)}>Detail</Btn> }]} />
      {!done && <div className="row-end"><span className="muted">Average score: <b>{avg ?? '—'}</b></span><Btn disabled={!lengkap} onClick={() => onSave(avg)}>Simpan nilai</Btn></div>}
    </Card>
  )
}

// ---------- Detail per modul ----------
function ModulDetail({ p, m, go }) {
  const s = useStore(); const [t, toast] = useToast(); const ans = useMemo(() => answersFor(p, m), [p.id, m.id])
  const saved = s.penilaian[p.id]?.[m.id]
  const [sc, setSc] = useState(() => ans.map(() => (saved != null ? String(saved) : p.skor != null ? String(p.skor) : '')))
  const [dl, setDl] = useState(null)
  const valid = sc.every((v) => v !== '' && Number(v) >= 1 && Number(v) <= 100)
  const back = () => go('penilaian')
  const simpan = () => { const avg = Math.round(sc.reduce((a, b) => a + Number(b), 0) / sc.length); api.setModScore(p.id, m.id, avg); toast(`Nilai ${m.judul} tersimpan: ${avg}`); setTimeout(back, 600) }
  const score = (i) => <label className="score-row"><span>Score</span><input type="number" min="1" max="100" inputMode="numeric" placeholder="Masukkan nilai 1–100" value={sc[i]} aria-invalid={sc[i] !== '' && (Number(sc[i]) < 1 || Number(sc[i]) > 100)} onChange={(e) => setSc(sc.map((v, j) => (j === i ? e.target.value : v)))} aria-label={`Nilai soal ${i + 1}`} /></label>
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb"><button onClick={back}>Penilaian</button><span>›</span><span>{p.name}</span><span>›</span><b>{m.judul}</b></nav>
      <PageHead title={m.judul} sub={`${p.name} · ${TIPE[m.tipe]} · ${m.durasi} menit`} />
      {m.tipe === 'Pilihan Ganda' ? <PgView ans={ans} /> : <>
        <h2 className="sec-title">Soal dan Jawaban</h2>
        <div className="qa-list">{ans.map((a, i) => (
          <article key={i} className="qa">
            <p className="qa-q"><b>{i + 1}.</b> {a.q}</p>
            {a.files && <div className="qa-files">{a.files.map((f, fi) => <FileRow key={fi} f={f} href={fileUrl(p.id, m.id, i, fi)} onDownload={() => setDl(f)} />)}</div>}
            {a.teks != null && <div className="qa-essay"><h3>Jawaban</h3><p>{a.teks}</p></div>}
            {score(i)}
          </article>))}</div>
        <div className="row-end"><Btn kind="ghost" onClick={back}>Kembali</Btn><Btn disabled={!valid} onClick={simpan}>Save</Btn></div>
      </>}
      {m.tipe === 'Pilihan Ganda' && <div className="row-end"><Btn kind="ghost" onClick={back}>Kembali</Btn><Btn onClick={() => { api.setModScore(p.id, m.id, pgSummary(ans).nilai); toast('Nilai otomatis tersimpan'); setTimeout(back, 600) }}>Save</Btn></div>}
      <DownloadAsk f={dl} onClose={() => setDl(null)} toast={toast} />{t}
    </>
  )
}

// Baris berkas jawaban: video & PDF dibuka di tab baru; tautan luar dibuka di tab baru; file lain diunduh dengan konfirmasi
function FileRow({ f, href, onDownload }) {
  const canOpen = PREVIEWABLE.includes(f.tipe)
  return (
    <div className="file-ans">
      <span className={`ft ft-${f.tipe}`}>{extOf(f)}</span>
      <div className="grow"><strong>{f.nama}</strong><small className="muted">{f.tipe === 'link' ? 'Tautan dari kandidat · dibuka di tab baru' : `${f.ukuran}${f.durasi ? ' · ' + f.durasi : ''}`} · {tgl(f.tanggal)}</small></div>
      <div className="row-act nowrap">
        {f.tipe === 'link' && <a className="btn btn-ghost" href={f.url} target="_blank" rel="noopener noreferrer"><Icon name="arrowRight" size={18} />Buka tautan</a>}
        {canOpen && <a className="btn btn-ghost" href={href} target="_blank" rel="noopener"><Icon name="eye" size={18} />{f.tipe === 'video' ? 'Putar' : 'Lihat'}</a>}
        {f.tipe !== 'link' && <button type="button" className="icon-btn" title={canOpen ? 'Unduh' : 'Unduh (tidak bisa dipratinjau)'} aria-label={'Unduh ' + f.nama} onClick={onDownload}><Icon name="download" size={18} /></button>}
      </div>
    </div>
  )
}

function DownloadAsk({ f, onClose, toast }) {
  if (!f) return null
  const preview = PREVIEWABLE.includes(f.tipe)
  const go = async () => { onClose(); try { const blob = f.tipe === 'pdf' ? new Blob([textPdf(`${f.nama}\n\nBerkas contoh dari prototipe Kirana.`)], { type: 'application/pdf' }) : new Blob([`Berkas contoh: ${f.nama}`], { type: 'application/octet-stream' }); await save(blob, f.nama); toast('Mengunduh ' + f.nama) } catch (e) { toast('Unduhan diblokir di pratinjau ini. Di website/app berkas asli akan terunduh.') } }
  return (
    <Modal open title="Unduh berkas" onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn icon="download" onClick={go}>Unduh {f.ukuran ? `(${f.ukuran})` : ''}</Btn></>}>
      <div className="file-ans" style={{ border: 0, padding: 0 }}><span className={`ft ft-${f.tipe}`}>{extOf(f)}</span><div className="grow"><strong>{f.nama}</strong><small className="muted">{f.ukuran}</small></div></div>
      {preview ? <p style={{ margin: 0 }}>Berkas ini juga bisa dilihat langsung tanpa mengunduh lewat tombol {f.tipe === 'video' ? 'Putar' : 'Lihat'}.</p>
        : <Note><div>Berkas <b>.{f.tipe}</b> tidak bisa dibuka langsung di browser, jadi perlu diunduh. Pastikan perangkatmu punya aplikasi untuk membukanya ({f.tipe === 'rar' || f.tipe === 'zip' ? 'mis. WinRAR / 7-Zip' : f.tipe === 'xlsx' ? 'mis. Excel / Google Sheets' : 'aplikasi yang sesuai'}). Berkas dari kandidat sebaiknya dipindai antivirus sebelum dibuka.</div></Note>}
    </Modal>
  )
}

// Pilihan ganda: jawaban peserta vs kunci, total benar/salah, nilai akhir
function PgView({ ans }) {
  const sum = pgSummary(ans); const L = 'ABCD'
  return (
    <div className="pg-wrap">
      <Card pad={false}><Table center rows={ans.map((a, i) => ({ ...a, i }))} cols={[
        { h: 'No', r: (a) => a.i + 1 },
        { h: 'Soal', r: (a) => <span className="pg-q">{a.q}</span> },
        { h: 'Jawaban Peserta', r: (a) => <span className={`pg-a ${a.jawab === a.benar ? 'ok' : 'bad'}`}><Icon name={a.jawab === a.benar ? 'check' : 'x'} size={16} />{L[a.jawab]}. {a.opsi[a.jawab]}</span> },
        { h: 'Jawaban Soal', r: (a) => <span>{L[a.benar]}. {a.opsi[a.benar]}</span> }]} /></Card>
      <aside className="pg-sum">
        <div><small>Total Jawaban Salah</small><b className="c-ded">{sum.salah}/{sum.total}</b></div>
        <div><small>Total Jawaban Benar</small><b className="c-add">{sum.benar}/{sum.total}</b></div>
        <div className="pg-final"><small>Nilai Akhir</small><strong>{sum.nilai}</strong></div>
        <p className="muted sm" style={{ margin: 0 }}>Dihitung otomatis: jawaban benar ÷ jumlah soal × 100.</p>
      </aside>
    </div>
  )
}

// ---------- Halaman berkas di tab baru ----------
export function FileViewer({ pid, mid, qi, fi }) {
  const s = useStore(); const p = s.pool.find((x) => x.id === pid); const m = p && modulesFor(s, p).find((x) => x.id === mid)
  const f = m && answersFor(p, m)[Number(qi)]?.files?.[Number(fi)]
  const [url, setUrl] = useState('')
  useEffect(() => { if (f?.tipe !== 'pdf') return; const u = URL.createObjectURL(new Blob([textPdf(`${f.nama}\n\nKandidat: ${p.name}\nModul: ${m.judul}\n\nIsi berkas asli kandidat tampil di sini setelah integrasi penyimpanan berkas.`)], { type: 'application/pdf' })); setUrl(u); return () => URL.revokeObjectURL(u) }, [f?.nama]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (f) document.title = f.nama + ' · Kirana' }, [f])
  return (
    <div className="viewer">
      <header className="viewer-h"><a href="#/" className="brand"><Logo /></a><div className="grow" style={{ minWidth: 0 }}><strong className="viewer-name">{f ? f.nama : 'Berkas tidak ditemukan'}</strong>{f && <small className="muted">{p.name} · {m.judul} · {f.ukuran}</small>}</div>
        <Btn kind="ghost" onClick={() => window.close()}>Tutup tab</Btn></header>
      <main className="viewer-b">
        {!f ? <Empty text="Berkas tidak ditemukan." /> : f.tipe === 'video'
          ? <div className="video-ph" role="img" aria-label={'Rekaman ' + f.nama}><span className="play"><Icon name="arrowRight" size={34} /></span><p>Rekaman jawaban · {f.durasi}</p><small>Di prototipe belum ada video asli. Versi rilis memutar video kandidat dari penyimpanan.</small></div>
          : f.tipe === 'pdf' ? (url ? <iframe title={f.nama} src={url} className="pdf-frame" /> : null) : <Empty text="Berkas ini perlu diunduh." />}
      </main>
    </div>
  )
}
