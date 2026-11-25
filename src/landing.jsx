import { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'
import { go } from './router.js'

const TASKS = [
  { id: 'rekrut', label: 'Rekrutmen', icon: 'search', color: '#0a5950' },
  { id: 'approval', label: 'Approval', icon: 'check', color: '#3f7d2c' },
  { id: 'kontrak', label: 'Kontrak', icon: 'pen', color: '#0a5950' },
  { id: 'absen', label: 'Absensi', icon: 'clock', color: '#8a6d00' },
  { id: 'cuti', label: 'Cuti', icon: 'sun', color: '#3f7d2c' },
  { id: 'lembur', label: 'Lembur', icon: 'moon', color: '#0a5950' },
  { id: 'reimburse', label: 'Reimburse', icon: 'receipt', color: '#8a6d00' },
  { id: 'payroll', label: 'Payroll', icon: 'money', color: '#3f7d2c' },
  { id: 'talent', label: 'Talent Pool', icon: 'users', color: '#0a5950' },
  { id: 'resign', label: 'Resign', icon: 'exit', color: '#8a6d00' },
]

// Kertas berantakan di meja; tiap kertas hilang saat satu urusan dibereskan.
const PAPERS = [
  { x: 38, y: 40, r: -14, w: 92, h: 118, c: '#ffffff' },
  { x: 120, y: 30, r: 9, w: 86, h: 110, c: '#fffdf3' },
  { x: 470, y: 46, r: 12, w: 96, h: 120, c: '#ffffff' },
  { x: 540, y: 150, r: -8, w: 80, h: 100, c: '#f9d730' },
  { x: 60, y: 190, r: 6, w: 70, h: 70, c: '#f9d730' },
  { x: 415, y: 205, r: -18, w: 90, h: 112, c: '#ffffff' },
  { x: 180, y: 215, r: -4, w: 64, h: 64, c: '#c1d276' },
  { x: 520, y: 25, r: -6, w: 62, h: 62, c: '#c1d276' },
  { x: 140, y: 140, r: 18, w: 88, h: 108, c: '#ffffff' },
  { x: 350, y: 30, r: -10, w: 84, h: 104, c: '#fffdf3' },
]

function Desk({ done }) {
  const tidy = done >= TASKS.length
  return (
    <svg className={`desk ${tidy ? 'tidy' : ''}`} viewBox="0 0 640 330" role="img" aria-label="Meja kerja HR dilihat dari atas, dengan tangan yang sedang menulis">
      <defs>
        <linearGradient id="wood" x1="0" x2="1"><stop offset="0" stopColor="#0d6a5f" /><stop offset="1" stopColor="#0a5950" /></linearGradient>
      </defs>
      <rect x="8" y="8" width="624" height="314" rx="28" fill="url(#wood)" />
      <rect x="8" y="8" width="624" height="314" rx="28" fill="none" stroke="#063f39" strokeWidth="3" />
      {/* lampu & tanaman */}
      <circle cx="590" cy="280" r="26" fill="#c1d276" /><circle cx="578" cy="268" r="12" fill="#9fb35a" /><circle cx="602" cy="286" r="10" fill="#9fb35a" />
      {/* kertas berantakan */}
      {PAPERS.map((p, i) => (
        <g key={i} className={`paper ${i < done ? 'gone' : ''}`} transform={`translate(${p.x + p.w / 2} ${p.y + p.h / 2}) rotate(${p.r})`}>
          <rect x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} rx="4" fill={p.c} stroke="#063f39" strokeOpacity=".18" />
          {p.h > 80 && [0, 1, 2, 3].map((l) => <rect key={l} x={-p.w / 2 + 10} y={-p.h / 2 + 14 + l * 14} width={p.w - 24 - (l % 2) * 18} height="4" rx="2" fill="#0a5950" opacity=".22" />)}
        </g>
      ))}
      {/* kopi */}
      <g transform="translate(520 255)"><circle r="24" fill="#f5f5eb" stroke="#063f39" strokeOpacity=".3" /><circle r="16" fill="#6b4a2b" /><path d="M22 -6 q14 6 0 14" fill="none" stroke="#f5f5eb" strokeWidth="6" /></g>
      {/* buku catatan di tengah tempat tangan menulis */}
      <g transform="translate(320 168)">
        <rect x="-120" y="-78" width="240" height="156" rx="8" fill="#ffffff" stroke="#063f39" strokeOpacity=".25" />
        <line x1="0" y1="-78" x2="0" y2="78" stroke="#063f39" strokeOpacity=".15" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5].map((l) => <line key={l} x1="-104" x2="-16" y1={-52 + l * 20} y2={-52 + l * 20} stroke="#0a5950" strokeOpacity=".15" />)}
        {[0, 1, 2, 3, 4, 5].map((l) => <line key={'r' + l} x1="16" x2="104" y1={-52 + l * 20} y2={-52 + l * 20} stroke="#0a5950" strokeOpacity=".15" />)}
        <path className="scribble" d="M24 -54 q8 -6 16 0 t16 0 t16 0 t16 0 M24 -34 q8 -6 16 0 t16 0 t16 0 M24 -14 q8 -6 16 0 t16 0 t16 0 t16 0" fill="none" stroke="#0a5950" strokeWidth="2.4" strokeLinecap="round" />
        <g className="checks">{[0, 1, 2].map((l) => <path key={l} d={`M-100 ${-56 + l * 20} l5 5 l9 -10`} fill="none" stroke="#3f7d2c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}</g>
      </g>
      {/* tangan kiri menahan buku */}
      <g className="hand-left" transform="translate(150 250)">
        <rect x="-40" y="40" width="80" height="60" rx="18" fill="#f9d730" />
        <ellipse cx="0" cy="18" rx="38" ry="30" fill="#e7b48a" />
        {[-24, -8, 8, 24].map((fx, i) => <rect key={i} x={fx - 7} y={-22 + Math.abs(i - 1.5) * 4} width="14" height="34" rx="7" fill="#e7b48a" />)}
        <rect x="30" y="2" width="30" height="13" rx="6.5" fill="#e7b48a" transform="rotate(-25 30 8)" />
      </g>
      {/* tangan kanan menulis */}
      <g className="hand-right">
        <g transform="translate(410 228)">
          <rect x="-44" y="44" width="88" height="62" rx="18" fill="#f9d730" />
          <ellipse cx="0" cy="22" rx="40" ry="32" fill="#e7b48a" />
          <rect x="-58" y="6" width="34" height="14" rx="7" fill="#e7b48a" transform="rotate(20 -40 12)" />
          <g transform="rotate(-38)"><rect x="-6" y="-78" width="9" height="74" rx="3" fill="#000" /><path d="M-6 -78 l4.5 -12 l4.5 12z" fill="#f9d730" /></g>
          {[-22, -8, 6].map((fx, i) => <rect key={i} x={fx - 7} y={-18 + i * 3} width="14" height="30" rx="7" fill="#d9a479" />)}
        </g>
      </g>
    </svg>
  )
}

function Scene() {
  const [done, setDone] = useState([])
  const [burst, setBurst] = useState(null)
  const wrap = useRef(null)
  const refs = useRef([])
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const el = wrap.current
      if (el) {
        const w = el.clientWidth, h = el.clientHeight
        const rx = w * 0.46, ry = h * 0.44
        const t = reduce ? 0 : (now - t0) / 1000
        refs.current.forEach((b, i) => {
          if (!b) return
          const a = (i / TASKS.length) * Math.PI * 2 + t * 0.12
          const bob = reduce ? 0 : Math.sin(t * 1.6 + i) * 5
          b.style.transform = `translate(${w / 2 + Math.cos(a) * rx}px, ${h / 2 + Math.sin(a) * ry + bob}px) translate(-50%, -50%)`
        })
      }
      if (!reduce) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onR = () => reduce && tick(performance.now())
    window.addEventListener('resize', onR)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR) }
  }, [reduce])

  const finish = (task) => {
    if (done.includes(task.id)) return
    setDone((d) => [...d, task.id])
    setBurst({ ...task, key: Math.random() })
  }
  useEffect(() => {
    if (!burst) return
    const t = setTimeout(() => setBurst(null), 1900)
    return () => clearTimeout(t)
  }, [burst])

  const all = done.length === TASKS.length
  return (
    <div className="scene">
      <div className="orbit" ref={wrap}>
        <div className="desk-box"><Desk done={done.length} /></div>
        {TASKS.map((t, i) => {
          const isDone = done.includes(t.id)
          return (
            <button key={t.id} ref={(el) => (refs.current[i] = el)} type="button" className={`task ${isDone ? 'done' : ''}`} onClick={() => finish(t)} aria-label={isDone ? `${t.label} sudah beres` : `Bereskan ${t.label}`} aria-pressed={isDone}>
              <span className="task-dot" style={{ color: t.color }}><Icon name={isDone ? 'check' : t.icon} size={22} /></span>
              <span className="task-l">{t.label}</span>
            </button>
          )
        })}
        {burst && (
          <div className="burst" key={burst.key} aria-hidden="true">
            <svg viewBox="0 0 120 120" className="burst-check"><circle cx="60" cy="60" r="52" /><path d="M36 62l16 16 32-34" /></svg>
            <strong>Done with Kirana!</strong>
            <span>{burst.label} beres</span>
          </div>
        )}
      </div>
      <div className="scene-foot" aria-live="polite">
        {all ? (
          <>
            <p className="tidy-msg">Semua urusan orang, rapi di satu meja.</p>
            <button type="button" className="link-btn" onClick={() => setDone([])}>Acak lagi mejanya</button>
          </>
        ) : (
          <p className="hint"><span className="pill">{done.length}/{TASKS.length} beres</span> Klik urusan yang berputar untuk membereskannya</p>
        )}
      </div>
    </div>
  )
}

const ROLES = [
  { n: 'Superadmin', d: 'Atur akun, master data, setup remunerasi, dan jadi muara akhir semua approval.', i: 'shield' },
  { n: 'Admin Operasional', d: 'Pegang menu sesuai izin dan Branch yang ditugaskan: kontrak, absensi, payroll.', i: 'gear' },
  { n: 'Branch', d: 'Pasang lowongan, seleksi kandidat, ajukan remunerasi, pantau karyawan.', i: 'brief' },
  { n: 'Talent', d: 'Melamar, tanda tangan kontrak, lalu absen, cuti, lembur, dan reimburse dari web atau app.', i: 'users' },
  { n: 'Mitra Talent Pool', d: 'Menyetor kandidat ke talent pool dan memantau progresnya di tiap lowongan.', i: 'handshake' },
]
const FLOW = ['Lowongan dibuka', 'Pelamar & pre-test', 'Seleksi 5 tahap', 'Remunerasi disetujui', 'Kontrak ditandatangani', 'Absen & cuti harian', 'Gaji cair via VA', 'Perpanjang atau resign']

export default function Landing() {
  return (
    <div className="landing">
      <nav className="lnav">
        <a className="brand" href="#/"><span className="logo-mark">K</span>Kirana</a>
        <div className="lnav-links"><a href="#peran" onClick={(e) => { e.preventDefault(); document.getElementById('peran').scrollIntoView({ behavior: 'smooth' }) }}>Peran</a><a href="#alur" onClick={(e) => { e.preventDefault(); document.getElementById('alur').scrollIntoView({ behavior: 'smooth' }) }}>Alur</a></div>
        <button type="button" className="btn primary sm" onClick={() => go('/login')}>Masuk</button>
      </nav>
      <header className="hero">
        <p className="eyebrow">HRIS dari rekrutmen sampai resign</p>
        <h1>Meja HR berantakan? <span>Kirana</span> jadi tangan kananmu.</h1>
        <p className="lead">Lowongan, kontrak, absensi, sampai payroll diurus di satu tempat untuk admin, Branch, talent, dan mitra.</p>
        <div className="row gap center wrap">
          <button type="button" className="btn primary lg" onClick={() => go('/login')}>Coba prototipe</button>
          <button type="button" className="btn ghost lg" onClick={() => document.getElementById('alur').scrollIntoView({ behavior: 'smooth' })}>Lihat alurnya</button>
        </div>
      </header>
      <Scene />
      <section className="lsec" id="peran">
        <h2>Lima peran, satu meja</h2>
        <div className="role-grid">
          {ROLES.map((r) => <article key={r.n} className="role-card"><span className="role-ic"><Icon name={r.i} /></span><h3>{r.n}</h3><p>{r.d}</p></article>)}
        </div>
      </section>
      <section className="lsec" id="alur">
        <h2>Perjalanan satu orang di Kirana</h2>
        <ol className="flow">{FLOW.map((f, i) => <li key={f}><span>{String(i + 1).padStart(2, '0')}</span>{f}</li>)}</ol>
      </section>
      <section className="cta-band">
        <h2>Semua urusan orang, rapi di satu meja.</h2>
        <button type="button" className="btn yellow lg" onClick={() => go('/login')}>Masuk ke prototipe</button>
      </section>
      <footer className="lfoot">Kirana HRIS · prototipe 2026 · data di dalamnya contoh</footer>
    </div>
  )
}
