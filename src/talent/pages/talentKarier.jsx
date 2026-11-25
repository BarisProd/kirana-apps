// Halaman karier talent yang terhubung ke data masing-masing akun (karyawan maupun kandidat):
// Beranda kandidat, Lowongan & Tawaran (tawaran, lamaran saya + tahap seleksi, lamar), Jadwal Wawancara, Kontrak kandidat.
import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { ME } from '../services/session.js'
import { Btn, Card, Badge, Modal, useToast, Note, Icon, Empty } from '../components/ui.jsx'
import { Sticker, ArtHead } from '../components/Sticker.jsx'
import { useLookup, fmtDate } from './shared.jsx'
import { save } from '../services/export.js'

export const TAHAP = ['Tes tulis', 'Berkas & psikotes', 'Atur jadwal', 'Wawancara & penilaian', 'Seleksi akhir']
const today = () => new Date().toISOString().slice(0, 10)
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const tglPanjang = (d) => { const x = new Date(d + 'T00:00:00'); return `${HARI[x.getDay()]}, ${fmtDate(d)}` }
const usePerson = () => { const s = useStore(); return s.employees.find((e) => e.id === ME) || s.pool.find((p) => p.id === ME) || { name: 'Talent' } }
const first = (n) => (n || 'Talent').split(' ')[0]

// Langkah seleksi 5 tahap: selesai (centang + tanggal), sedang berjalan, belum
export function TahapSeleksi({ c }) {
  return (
    <ol className="tahap" aria-label="Tahap seleksi">{TAHAP.map((t, i) => {
      const st = i + 1 < c.tahap ? 'done' : i + 1 === c.tahap ? 'now' : 'next'
      return <li key={t} className={st} aria-current={st === 'now' ? 'step' : undefined}><span className="tp-dot">{st === 'done' ? <Icon name="check" size={14} /> : i + 1}</span><span className="tp-t"><b>{t}</b><small>{st === 'done' ? (c.riwayat?.[i] ? 'Lolos ' + fmtDate(c.riwayat[i]) : 'Lolos') : st === 'now' ? 'Sedang berjalan' : 'Menunggu'}</small></span></li>
    })}</ol>
  )
}

const nextStep = (c, iv) => c.tahap === 1 ? 'Hasil tes tulis sedang direview Branch.'
  : c.tahap === 2 ? 'Berkas & psikotes sedang diperiksa. Pastikan berkas di Biodata sudah lengkap.'
  : c.tahap === 3 ? (iv ? 'Permintaan jadwalmu menunggu konfirmasi Branch.' : 'Pilih jadwal wawancara yang cocok untukmu.')
  : c.tahap === 4 ? (iv?.status === 'Terkonfirmasi' ? `Wawancara ${tglPanjang(iv.tanggal)} pukul ${iv.jam} WIB.` : 'Branch sedang menyiapkan jadwal wawancara.')
  : 'Kamu di seleksi akhir. Offering letter akan dikirim ke menu Kontrak bila diterima.'

// ============================ Lowongan & Tawaran ============================
export function KarierLowongan({ go }) {
  const s = useStore(); const { job, branch } = useLookup(); const [t, toast] = useToast()
  const [q, setQ] = useState(''); const [ask, setAsk] = useState(null); const [tolak, setTolak] = useState(null)
  const offers = s.offers.filter((o) => o.talent === ME)
  const mine = s.candidates.filter((c) => c.pool === ME)
  const applied = (id) => mine.some((c) => c.job === id)
  const open = s.jobs.filter((j) => j.status === 'Active' && j.approval === 'Approved' && (!j.tutup || j.tutup >= today()) && (j.posisi + ' ' + branch(j.branch) + ' ' + j.lokasi).toLowerCase().includes(q.toLowerCase()))
  const ivOf = (c) => s.interviews.find((i) => i.talent === ME && i.job === c.job && i.status !== 'Dibatalkan')
  return (
    <>
      <ArtHead art="kaca" title="Lowongan & Tawaran" sub="Tawaran dari Branch, lamaran yang sedang berjalan, dan lowongan yang bisa kamu lamar." />
      <Card title={`Tawaran untukmu${offers.filter((o) => o.status === 'Menunggu jawaban').length ? ' · ' + offers.filter((o) => o.status === 'Menunggu jawaban').length + ' menunggu' : ''}`}>
        {offers.length === 0 ? <p className="muted kd-empty">Belum ada tawaran. Tawaran muncul saat Branch memilihmu dari Talent Pool.</p>
          : <div className="kr-list">{offers.map((o) => { const j = job(o.job); return (
            <div key={o.id} className="kr-item"><span className="pf-ic"><Icon name="briefcase" size={18} /></span>
              <div className="grow"><strong>{j.posisi}</strong><small className="muted">{branch(j.branch)} · {j.lokasi} · {j.gaji}</small>{o.status === 'Menunggu jawaban' && <small className="kr-warn">Jawab sebelum {fmtDate(o.batas)}</small>}</div>
              {o.status === 'Menunggu jawaban' ? <div className="row-act"><Btn kind="ghost" onClick={() => setTolak(o)}>Tolak</Btn><Btn onClick={() => { api.answerOffer(o.id, true); toast('Kamu masuk seleksi tahap 1!') }}>Lanjut seleksi</Btn></div> : <Badge>{o.status}</Badge>}
            </div>) })}</div>}
      </Card>

      <Card title={`Lamaran saya${mine.length ? ' · ' + mine.length : ''}`}>
        {mine.length === 0 ? <p className="muted kd-empty">Belum ada lamaran. Pilih lowongan di bawah lalu klik Lamar.</p>
          : <div className="kr-apps">{mine.map((c) => { const j = job(c.job); const iv = ivOf(c); return (
            <article key={c.id} className="kr-app">
              <header><div className="grow"><strong>{j.posisi}</strong><small className="muted">{branch(j.branch)} · dilamar {c.dilamar ? fmtDate(c.dilamar) : '—'}</small></div><Badge t={c.tahap === 5 ? 'ok' : 'warn'}>Tahap {c.tahap}: {TAHAP[c.tahap - 1]}</Badge></header>
              <TahapSeleksi c={c} />
              <div className="kr-next"><Icon name="arrowRight" size={16} /><span className="grow">{nextStep(c, iv)}</span>
                {(c.tahap === 3 || c.tahap === 4) && <Btn kind="ghost" icon="calendar" onClick={() => go('jadwal')}>{c.tahap === 3 && !iv ? 'Pilih jadwal' : 'Lihat jadwal'}</Btn>}</div>
            </article>) })}</div>}
      </Card>

      <Card title="Lowongan terbuka">
        <label className="fsel grow" style={{ marginBottom: 12 }}><span>Cari</span><span className="search"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Posisi, Branch, atau kota" aria-label="Cari lowongan" /></span></label>
        {open.length === 0 ? <p className="muted kd-empty">Tidak ada lowongan yang cocok.</p> : <div className="kr-list">{open.map((j) => (
          <div key={j.id} className="kr-item"><span className="pf-ic"><Icon name="building" size={18} /></span>
            <div className="grow"><strong>{j.posisi}</strong><small className="muted">{branch(j.branch)} · {j.jenis} · {j.lokasi}</small><small className="muted">{j.gaji} · tutup {fmtDate(j.tutup)}</small></div>
            <a className="btn btn-ghost" href={'#/lowongan/' + j.id} target="_blank" rel="noopener noreferrer"><Icon name="eye" size={16} />Detail</a>
            {applied(j.id) ? <Badge t="ok">Sudah dilamar</Badge> : <Btn onClick={() => setAsk(j)}>Lamar</Btn>}
          </div>))}</div>}
      </Card>

      <Modal open={!!ask} title={ask ? 'Lamar ' + ask.posisi + '?' : ''} onClose={() => setAsk(null)} footer={<><Btn kind="ghost" onClick={() => setAsk(null)}>Batal</Btn><Btn onClick={() => { api.applyJob(ME, ask.id); setAsk(null); toast('Lamaran terkirim. Pantau tahapnya di Lamaran saya') }}>Kirim lamaran</Btn></>}>
        {ask && <p style={{ margin: 0 }}>Biodata, berkas, dan hasil pre-test-mu akan dikirim ke <b>{branch(ask.branch)}</b>. Lamaran langsung masuk tahap <b>Tes tulis</b>.</p>}
      </Modal>
      <Modal open={!!tolak} title="Tolak tawaran ini?" onClose={() => setTolak(null)} footer={<><Btn kind="ghost" onClick={() => setTolak(null)}>Batal</Btn><Btn onClick={() => { api.answerOffer(tolak.id, false); setTolak(null); toast('Tawaran ditolak') }}>Tolak tawaran</Btn></>}>
        {tolak && <p style={{ margin: 0 }}>Tawaran <b>{job(tolak.job).posisi}</b> dari {branch(job(tolak.job).branch)} akan ditolak dan tidak bisa dibuka lagi.</p>}
      </Modal>{t}
    </>
  )
}

// ============================ Jadwal Wawancara ============================
const slotList = () => { const out = []; const d = new Date(); while (out.length < 6) { d.setDate(d.getDate() + 1); if (d.getDay() === 0 || d.getDay() === 6) continue; const iso = d.toISOString().slice(0, 10); out.push(`${tglPanjang(iso)} · 10:00`, `${tglPanjang(iso)} · 14:00`) } return out.slice(0, 6) }
export function KarierJadwal({ go }) {
  const s = useStore(); const { job, branch } = useLookup(); const [t, toast] = useToast(); const [pick, setPick] = useState({})
  const mine = s.candidates.filter((c) => c.pool === ME && c.tahap >= 3)
  const ivs = s.interviews.filter((i) => i.talent === ME)
  const ics = async (iv) => { const j = job(iv.job); const z = (h) => iv.tanggal.replace(/-/g, '') + 'T' + h.replace(':', '') + '00'; const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kirana HRIS//ID', 'BEGIN:VEVENT', 'UID:' + iv.id + '@kirana', 'DTSTART;TZID=Asia/Jakarta:' + z(iv.jam), 'DTEND;TZID=Asia/Jakarta:' + z(iv.selesai || iv.jam), 'SUMMARY:Wawancara ' + j.posisi + ' · ' + branch(j.branch), iv.link ? 'URL:' + iv.link : '', 'LOCATION:' + (iv.mode || 'Online'), 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n'); try { await save(new Blob([txt], { type: 'text/calendar' }), 'Wawancara ' + j.posisi + '.ics'); toast('Jadwal ditambahkan ke file kalender') } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  return (
    <><ArtHead art="kalender" title="Jadwal Wawancara" sub="Pilih slot yang disediakan Branch. Branch yang mengonfirmasi dan mengirim link meeting." />
      {mine.length === 0 && ivs.length === 0 ? <Card><Empty text="Belum ada jadwal wawancara. Jadwal muncul saat lamaranmu sampai tahap Atur jadwal." /><div className="row-end"><Btn kind="ghost" onClick={() => go('lowongan')}>Lihat lamaran</Btn></div></Card>
        : mine.map((c) => { const j = job(c.job); const iv = ivs.find((i) => i.job === c.job); return (
          <Card key={c.id} title={`${j.posisi} · ${branch(j.branch)}`}>
            {iv?.status === 'Terkonfirmasi' ? <div className="iv-box">
              <div className="iv-date"><b>{new Date(iv.tanggal + 'T00:00:00').getDate()}</b><span>{fmtDate(iv.tanggal).split(' ')[1]}</span></div>
              <div className="grow"><Badge t="ok">Terkonfirmasi</Badge><h3>{tglPanjang(iv.tanggal)} · {iv.jam}–{iv.selesai} WIB</h3>
                <dl className="dl"><dt>Mode</dt><dd>{iv.mode}</dd><dt>Pewawancara</dt><dd>{iv.pewawancara}</dd>{iv.catatan && <><dt>Catatan</dt><dd>{iv.catatan}</dd></>}</dl>
                <div className="evd-act">{iv.link && <a className="btn btn-primary" href={iv.link} target="_blank" rel="noopener noreferrer"><Icon name="send" size={16} />Gabung meeting</a>}<Btn kind="ghost" icon="calendar" onClick={() => ics(iv)}>Tambah ke kalender</Btn></div></div>
            </div> : iv ? <Note><div>Permintaan jadwal <b>{iv.slot}</b> terkirim {iv.diminta ? 'pada ' + iv.diminta : ''}. Menunggu konfirmasi Branch, link meeting akan muncul di sini.</div></Note>
              : <><p className="muted" style={{ marginTop: 0 }}>Pilih satu slot yang paling cocok:</p>
                <div className="slots">{slotList().map((x) => <button key={x} className={pick[c.id] === x ? 'on' : ''} onClick={() => setPick({ ...pick, [c.id]: x })}>{x}</button>)}</div>
                <div className="row-end"><Btn disabled={!pick[c.id]} onClick={() => { api.requestInterview(ME, c.job, pick[c.id]); toast('Request jadwal terkirim') }}>Request jadwal</Btn></div></>}
          </Card>) })}
      {t}</>
  )
}

// ============================ Kontrak (kandidat) ============================
export function KontrakKandidat({ go }) {
  const s = useStore(); const { job, branch } = useLookup()
  const best = s.candidates.filter((c) => c.pool === ME).sort((a, b) => b.tahap - a.tahap)[0]
  return (
    <><ArtHead art="kontrak" title="Kontrak" sub="Offering letter dan kontrak kerja akan muncul di sini." />
      <Card><div className="kk">
        <Sticker name="mikir" size={110} />
        <div className="grow"><h3>Belum ada kontrak</h3>
          <p className="muted">{best ? (best.tahap === 5 ? `Kamu di seleksi akhir ${job(best.job).posisi} (${branch(job(best.job).branch)}). Bila diterima, HR mengirim offering letter dan PKWT ke sini untuk ditandatangani.` : `Lamaran ${job(best.job).posisi} di ${branch(job(best.job).branch)} sedang di tahap ${best.tahap}: ${TAHAP[best.tahap - 1]}. Kontrak dikirim setelah kamu lolos seleksi akhir.`) : 'Lamar lowongan dulu ya. Kontrak dikirim setelah kamu lolos seleksi akhir.'}</p>
          <Btn kind="ghost" onClick={() => go('lowongan')}>{best ? 'Lihat lamaran' : 'Cari lowongan'}</Btn></div>
      </div></Card></>
  )
}

// ============================ Beranda (kandidat) ============================
export function BerandaKandidat({ go }) {
  const s = useStore(); const { job, branch } = useLookup(); const me = usePerson()
  const mine = s.candidates.filter((c) => c.pool === ME)
  const offers = s.offers.filter((o) => o.talent === ME && o.status === 'Menunggu jawaban')
  const iv = s.interviews.filter((i) => i.talent === ME && i.status === 'Terkonfirmasi' && i.tanggal >= today()).sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0]
  const act = s.pretestSets.find((x) => x.aktif); const done = (s.pretestDone[ME] || []).length; const total = act?.modul.length || 0
  const hiring = mine.some((c) => c.tahap >= 3)
  const jam = new Date().getHours(); const salam = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam'
  const sapa = me.kelamin === 'Laki-laki' ? 'hai_l' : 'hai_p'
  const quick = [['lowongan', 'Lowongan', 'briefcase'], ['jadwal', 'Wawancara', 'calendar'], ['pretest', 'Pre-test', 'test'], ['kontrak', 'Kontrak', 'doc'], ['biodata', 'Biodata', 'user'], ['inbox', 'Inbox', 'inbox']]
  return (
    <>
      <section className="hello-hero"><div className="grow"><h1>{salam}, {first(me.name)}!</h1>
        <p className="hello-sub">{hiring ? 'Lamaranmu sedang diproses. Semangat, sedikit lagi!' : mine.length ? 'Lamaranmu sudah terkirim. Sambil menunggu, cek lowongan lain yuk.' : 'Yuk mulai cari lowongan yang cocok untukmu.'}</p></div>
        <div className="hello-art"><Sticker name={sapa} size={150} className="hello-img" /></div></section>
      <section className="kb-stats">
        <button type="button" onClick={() => go('lowongan')}><Icon name="briefcase" size={20} /><b>{mine.length}</b><span>Lamaran aktif</span></button>
        <button type="button" onClick={() => go('lowongan')} className={offers.length ? 'hot' : ''}><Icon name="star" size={20} /><b>{offers.length}</b><span>Tawaran menunggu</span></button>
        <button type="button" onClick={() => go('jadwal')}><Icon name="calendar" size={20} /><b>{iv ? fmtDate(iv.tanggal).split(' ').slice(0, 2).join(' ') : '—'}</b><span>Wawancara terdekat</span></button>
        <button type="button" onClick={() => go('pretest')}><Icon name="test" size={20} /><b>{done}/{total}</b><span>Modul pre-test</span></button>
      </section>
      {iv && <Card title="Wawancara terdekat"><div className="kr-item"><span className="pf-ic"><Icon name="calendar" size={18} /></span><div className="grow"><strong>{job(iv.job).posisi} · {branch(job(iv.job).branch)}</strong><small className="muted">{tglPanjang(iv.tanggal)} · {iv.jam}–{iv.selesai} WIB · {iv.mode}</small></div><Btn kind="ghost" onClick={() => go('jadwal')}>Detail</Btn></div></Card>}
      {offers.length > 0 && <Card title="Tawaran menunggu jawabanmu">{offers.map((o) => <div key={o.id} className="kr-item"><span className="pf-ic"><Icon name="star" size={18} /></span><div className="grow"><strong>{job(o.job).posisi}</strong><small className="muted">{branch(job(o.job).branch)} · jawab sebelum {fmtDate(o.batas)}</small></div><Btn onClick={() => go('lowongan')}>Lihat tawaran</Btn></div>)}</Card>}
      {mine.length > 0 && <Card title="Progres lamaran">{mine.map((c) => <div key={c.id} className="kb-app"><div className="kb-app-h"><strong>{job(c.job).posisi}</strong><small className="muted">{branch(job(c.job).branch)}</small></div><TahapSeleksi c={c} /></div>)}</Card>}
      <div className="quick">{quick.map(([k, l, ic]) => <button key={k} onClick={() => go(k)}><span><Icon name={ic} /></span>{l}</button>)}</div>
      {!mine.length && <Note><div>Lengkapi <b>Biodata & Berkas</b> dulu supaya lamaranmu lebih cepat diproses Branch.</div></Note>}
    </>
  )
}
