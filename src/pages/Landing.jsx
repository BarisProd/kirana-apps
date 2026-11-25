import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/ui.jsx'
import { Sticker } from '../components/Sticker.jsx'
import { useNavigate } from '../lib/router.jsx'
import laptopImg from '../assets/workspace-laptop.png'
import handL from '../assets/hand-left.png'
import handR from '../assets/hand-right.png'
import sleeveL from '../assets/sleeve-left.png'
import sleeveR from '../assets/sleeve-right.png'
import wordmark from '../assets/logo-wordmark.png'

// Karakter per peran (sama dengan halaman Masuk). Root belum punya stiker khusus → pakai "kerja".
export const ROLE_STK = { Root: 'kerja', Superadmin: 'role_superadmin', 'Admin Operasional': 'role_admin', Branch: 'role_branch', Talent: 'role_talent', 'Mitra Talent Pool': 'role_mitra' }

const TASKS = [
  { k: 'rekrutmen', label: 'Rekrutmen', icon: 'briefcase', done: 'Lowongan terisi' },
  { k: 'approval', label: 'Approval', icon: 'approval', done: 'Semua approval beres' },
  { k: 'absensi', label: 'Absensi', icon: 'clock', done: 'Absen tercatat rapi' },
  { k: 'cuti', label: 'Cuti', icon: 'calendar', done: 'Cuti tersetujui' },
  { k: 'lembur', label: 'Lembur', icon: 'star', done: 'Lembur terhitung' },
  { k: 'reimburse', label: 'Reimburse', icon: 'receipt', done: 'Klaim tercairkan' },
  { k: 'payroll', label: 'Payroll', icon: 'wallet', done: 'Gaji terkirim' },
  { k: 'kontrak', label: 'Kontrak', icon: 'doc', done: 'Kontrak ditandatangani' },
  { k: 'resign', label: 'Resign', icon: 'door', done: 'Offboarding mulus' },
]

// posisi kertas berantakan (persen terhadap meja) + posisi tumpukan rapi
const MESS = [
  { x: 14, y: 18, r: -18, c: 'paper' }, { x: 70, y: 14, r: 14, c: 'paper' }, { x: 80, y: 52, r: -9, c: 'sticky-y' },
  { x: 6, y: 52, r: 22, c: 'sticky-g' }, { x: 26, y: 70, r: -30, c: 'paper' }, { x: 58, y: 70, r: 26, c: 'receipt' },
  { x: 38, y: 8, r: 8, c: 'paper' }, { x: 86, y: 30, r: 32, c: 'sticky-y' }, { x: 2, y: 30, r: -12, c: 'paper' },
]

export default function Landing() {
  const nav = useNavigate()
  const [done, setDone] = useState([])
  const [pop, setPop] = useState(null)
  const timer = useRef()
  const all = done.length === TASKS.length

  const finish = (t) => {
    if (done.includes(t.k)) return
    setDone((d) => [...d, t.k])
    setPop(t)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setPop(null), 1900)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="landing">
      <nav className="l-nav"><div className="l-nav-in">
        <a href="#/" className="brand" aria-label="Kirana beranda"><Logo /></a>
        <div className="l-links">
          <a href="#fitur" onClick={(e) => { e.preventDefault(); document.getElementById('fitur').scrollIntoView({ behavior: 'smooth' }) }}>Fitur</a>
          <a href="#peran" onClick={(e) => { e.preventDefault(); document.getElementById('peran').scrollIntoView({ behavior: 'smooth' }) }}>Peran</a>
          <a href="#alur" onClick={(e) => { e.preventDefault(); document.getElementById('alur').scrollIntoView({ behavior: 'smooth' }) }}>Alur</a>
        </div>
        <button className="btn btn-primary pill" onClick={() => nav('/login')}>Masuk</button>
      </div></nav>

      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Kirana · HRIS dari rekrutmen sampai resign</span>
          <h1>Semua urusan orang, <em>rapi di satu meja.</em></h1>
          <p>Mejamu penuh tugas HR? Klik tugas yang berputar di sekitar meja, biar Kirana yang membereskannya satu per satu.</p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg pill" onClick={() => nav('/login')}>Coba demo <Icon name="arrowRight" size={18} /></button>
            <span className="progress-pill" aria-live="polite">{done.length}/{TASKS.length} tugas beres</span>
          </div>
        </div>

        <div className="stage-wrap">
          <div className={`stage ${all ? 'all-done' : ''}`}>
            <div className="orbit" aria-label="Tugas HR di sekitar meja">
              {TASKS.map((t, i) => {
                const a = (360 / TASKS.length) * i
                const isDone = done.includes(t.k)
                return (
                  <div className="orbit-slot" key={t.k} style={{ '--a': a + 'deg' }}>
                    <button className={`task ${isDone ? 'done' : ''}`} onClick={() => finish(t)} aria-pressed={isDone} aria-label={`${t.label}${isDone ? ' — sudah beres' : ' — klik untuk membereskan'}`}>
                      <span className="task-ic"><Icon name={isDone ? 'check' : t.icon} size={24} /></span>
                      <span className="task-l">{t.label}</span>
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="desk">
              {MESS.map((m, i) => {
                const tidy = i < done.length
                return <span key={i} className={`mess ${m.c} ${tidy ? 'tidy' : ''}`} style={{ '--x': m.x + '%', '--y': m.y + '%', '--r': m.r + 'deg', '--i': i }} />
              })}
              <span className="mug" /><span className="plant" />
              <Workspace />
            </div>

            {pop && (
              <div className="done-pop" key={pop.k} role="status">
                <svg viewBox="0 0 80 80" className="done-check" aria-hidden="true"><circle cx="40" cy="40" r="34" /><path d="M24 41l11 11 21-23" /></svg>
                <strong>Done with Kirana!</strong>
                <span>{pop.done}</span>
              </div>
            )}
            {all && !pop && (
              <div className="done-pop final" role="status">
                <svg viewBox="0 0 80 80" className="done-check" aria-hidden="true"><circle cx="40" cy="40" r="34" /><path d="M24 41l11 11 21-23" /></svg>
                <strong>Tugas selesai!</strong>
                <span>Semua pekerjaan beres.</span>
                <button className="btn btn-ghost-light" onClick={() => setDone([])}>Ulangi</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section id="fitur" className="l-sec white">
        <span className="eyebrow">Fitur</span>
        <h2>Satu platform untuk urusan semua</h2>
        <div className="feat-grid">
          {[
            ['kaca', 'Rekrutmen & Talent Pool', 'Job post, seleksi 5 tahap, pre-test, dan kandidat yang tidak lolos otomatis masuk talent pool.'],
            ['kontrak', 'Kontrak digital', 'Offering letter, PKWT, dan amandemen terbuat otomatis lalu dilacak sampai Full Signed.'],
            ['masuk', 'Absensi selfie & GPS', 'WFO atau WFA, shift fleksibel, dan rekap otomatis per bulan.'],
            ['libur', 'Cuti, lembur, reimburse', 'Pengajuan dari web atau app, approval berjenjang, HR selalu jadi muara akhir.'],
            ['kalkulator', 'Remunerasi & payroll', 'BPJS, PPh21 TER, THR, KAK, dan lembur dihitung otomatis lalu ditransfer ke rekening.'],
            ['resign', 'Offboarding', 'Resign, pengembalian inventaris, dan akun nonaktif otomatis H+14.'],
          ].map(([ic, t, d]) => <article key={t} className="feat feat-stk"><Sticker name={ic} size={112} className="feat-img" /><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section id="peran" className="l-sec dark">
        <span className="eyebrow">Peran</span>
        <h2>Enam peran, satu alur</h2>
        <div className="role-row">
          {[['Root', 'Pemilik Kirana: mendaftarkan customer, memantau data & aktivitasnya.'], ['Superadmin', 'Grup customer: mengatur Branch, akun, izin, master data, setup remunerasi.'], ['Admin Operasional', 'Mengelola menu yang diizinkan, khusus Branch yang ditugaskan.'], ['Branch', 'Membuka lowongan, menyeleksi kandidat, mengajukan remunerasi.'], ['Talent', 'Melamar, tanda tangan kontrak, absen, cuti, dan cek payslip.'], ['Mitra Talent Pool', 'Menyalurkan kandidat dan memantau progresnya.']].map(([r, d]) => (
            <div key={r} className="role-card role-stk"><span className="role-img role-av lg"><Sticker name={ROLE_STK[r]} size={150} /></span><div><h3>{r}</h3><p>{d}</p></div></div>
          ))}
        </div>
      </section>

      <section id="alur" className="l-sec">
        <span className="eyebrow">Alur</span>
        <h2>Dari lamaran sampai perpisahan</h2>
        <ol className="flow">
          {['Lowongan', 'Seleksi', 'Kontrak', 'Siap kerja', 'Aktivitas harian', 'Gaji bulanan', 'Perpanjangan', 'Resign'].map((s, i) => <li key={s} className={i < 4 ? 'on' : ''}><span>{i + 1}</span>{s}</li>)}
        </ol>
      </section>

      <section className="l-cta">
        <Sticker name="tim" size={150} className="cta-img" />
        <h2>Siap merapikan meja HR-mu?</h2>
        <button className="btn btn-primary btn-lg pill" onClick={() => nav('/login')}>Masuk ke demo <Icon name="arrowRight" size={18} /></button>
      </section>
      <footer className="l-foot">© 2026 Kirana HRIS · Prototipe untuk validasi desain · Ilustrasi laptop: <a href="https://www.freepik.com" target="_blank" rel="noopener">Designed by Freepik</a></footer>
    </div>
  )
}

export const Logo = () => <img className="logo-wm" src={wordmark} alt="Kirana" />

function Workspace() {
  // Aset ilustrasi: "Flat project management concept with laptop" — Designed by Freepik (freepik.com)
  return (
    <div className="workspace" aria-hidden="true">
      <img src={laptopImg} alt="" draggable="false" />
      <div className="arm arm-l">
        <img src={sleeveL} alt="" draggable="false" />
        <img className="hand hand-l" src={handL} alt="" draggable="false" />
      </div>
      <div className="arm arm-r">
        <img src={sleeveR} alt="" draggable="false" />
        <img className="hand hand-r" src={handR} alt="" draggable="false" />
      </div>
    </div>
  )
}
