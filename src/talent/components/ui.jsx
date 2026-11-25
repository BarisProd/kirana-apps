import { Sticker } from './Sticker.jsx'
import React, { useEffect, useState } from 'react'

export const Icon = ({ name, size = 20 }) => {
  const p = ICONS[name] || ICONS.dot
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p}</svg>
}

const ICONS = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  fingerprint: <><path d="M12 11v3a6 6 0 0 0 1.2 3.6" /><path d="M8.5 9.5A3.5 3.5 0 0 1 15.5 11v1.5" /><path d="M6 12.5V11a6 6 0 0 1 10.8-3.6" /><path d="M9 14.5c0 2.3.8 4.4 2.2 6" /><path d="M18 12v1.5a9 9 0 0 1-.6 3.3" /><path d="M4.2 8A9.5 9.5 0 0 1 12 3.5a9.5 9.5 0 0 1 5.4 1.7" /></>,
  shield: <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" />,
  bellRing: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /><path d="M3 7.5a9 9 0 0 1 2-3.5M21 7.5a9 9 0 0 0-2-3.5" /></>,
  more: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  smartphone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  wifiOff: <><path d="M3 3l18 18" /><path d="M8.5 16.4a5 5 0 0 1 7 0" /><path d="M5 12.9a10 10 0 0 1 5.2-2.8M14.3 10.3A10 10 0 0 1 19 12.9" /><path d="M2 9.3a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 9.3" /><circle cx="12" cy="19.5" r="1" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 21v-5h-5" /></>,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.5M8.2 13.2l7.6 4.5" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" /></>,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  dot: <circle cx="12" cy="12" r="3" />,
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 14.6c2.6.1 4.5 1.8 5.3 4.9" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="M8 12.3l2.8 2.8L16.5 9.5" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h2.5M3 9.5h18" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  doc: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5h6v2M3 12h18" /></>,
  approval: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  door: <><path d="M5 21V4h10v17" /><path d="M15 6h4v15M11.5 12.5h.01" /></>,
  box: <><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" /></>,
  bell: <><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  send: <><path d="M21 3L10 14" /><path d="M21 3l-7 18-4-7-7-4z" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1.5 2.5h5L16 13h5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  logout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z" />,
  handshake: <><path d="M2 12l4-4 4 2 4-3 4 3 4 2" /><path d="M6 8l-2 9h3l3-3 3 3 3-3 3 3h1l-2-9" /></>,
  test: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 001.7 3h10.6a2 2 0 001.7-3l-5-9V3" /><path d="M7.5 15h9" /></>,
  megaphone: <><path d="M3 10v4h4l8 5V5L7 10z" /><path d="M18 9a4 4 0 010 6" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  upload: <><path d="M12 15V4M7 9l5-5 5 5" /><path d="M4 15v5h16v-5" /></>,
  download: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 15v5h16v-5" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5L12 13l8.5-6.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.2-7 8-7s7 2.5 8 7" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></>,
}

export const Btn = ({ kind = 'primary', icon, children, className = '', ...p }) => (
  <button className={`btn btn-${kind} ${className}`} {...p}>{icon && <Icon name={icon} size={18} />}{children}</button>
)

export const Card = ({ title, action, children, className = '', pad = true }) => (
  <section className={`card ${className}`}>
    {(title || action) && <header className="card-h"><h3>{title}</h3>{action}</header>}
    <div className={pad ? 'card-b' : ''}>{children}</div>
  </section>
)

const tone = (v = '') => {
  const s = String(v).toLowerCase()
  if (/(approved|aktif|active|hadir|completed|full signed|accepted|diterima|lolos|hired|berhasil|terpilih|sudah)/.test(s)) return 'ok'
  if (/(reject|ditolak|failed|expired|non-active|nonaktif|terlambat|belum|overdue|tidak)/.test(s)) return 'bad'
  if (/(waiting|menunggu|review|process|pending|requested|draft|sent|signed|confirmed|transfer|reviewed|in hiring|cuti)/.test(s)) return 'warn'
  return 'neutral'
}
export const Badge = ({ children, t }) => <span className={`badge b-${t || tone(children)}`}>{children}</span>

export const Stat = ({ label, value, hint, icon }) => (
  <div className="stat">
    {icon && <span className="stat-i"><Icon name={icon} /></span>}
    <div><div className="stat-v">{value}</div><div className="stat-l">{label}</div>{hint && <div className="stat-h">{hint}</div>}</div>
  </div>
)

// Kolom berisi foto + nama (class "who") ditandai supaya judulnya rata tengah tapi isinya tetap rata kiri.
const hasWho = (n, d = 0) => {
  if (!n || d > 4 || typeof n !== 'object') return false
  if (Array.isArray(n)) return n.some((x) => hasWho(x, d + 1))
  if (typeof n.props?.className === 'string' && n.props.className.split(' ').includes('who')) return true
  return hasWho(n.props?.children, d + 1)
}
export function Table({ cols, rows, empty = 'Belum ada data.', onRow, center }) {
  if (!rows.length) return <Empty text={empty} />
  const cells = rows.map((r) => cols.map((c) => (c.r ? c.r(r) : r[c.k])))
  const who = cols.map((c, i) => cells.some((row) => hasWho(row[i])))
  const align = (c, i) => (who[i] ? undefined : center || c.c ? 'center' : c.right ? 'right' : 'left')
  return (
    <div className="tbl-wrap">
      <table className={`tbl ${center ? 'tc' : ''} ${cols.length > 8 ? 'dense' : ''}`}>
        <thead><tr>{cols.map((c, i) => <th key={c.k || c.h || i} className={who[i] ? 'col-who' : undefined} style={{ textAlign: who[i] ? 'center' : align(c, i) }}>{c.h}</th>)}</tr></thead>
        <tbody>{rows.map((r, ri) => (
          <tr key={r.id || ri} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? 'clickable' : ''}>
            {cols.map((c, i) => <td key={c.k || c.h || i} data-h={c.h} className={who[i] ? 'col-who' : undefined} style={{ textAlign: align(c, i) }}>{cells[ri][i]}</td>)}
          </tr>))}
        </tbody>
      </table>
    </div>
  )
}

// Di aplikasi karyawan, keadaan kosong dibuat lebih ramah: ikon lembut + judul + penjelasan + langkah berikutnya.
// Web tetap memakai stiker seperti sebelumnya.
const APP_EMPTY = {
  'Belum ada absen di antrean.': { icon: 'checkCircle', title: 'Semua absen sudah terkirim', hint: 'Absen yang tersimpan di HP saat sinyal lemah akan muncul di sini sampai berhasil dikirim.' },
  'Belum ada payslip.': { icon: 'wallet', title: 'Slip gaji belum terbit', hint: 'Slip gaji muncul di sini setelah HR menerbitkannya untuk periode gajimu.' },
  'Belum ada dokumen kontrak.': { icon: 'doc', title: 'Dokumen kontrak belum diunggah', hint: 'HR akan mengunggah kontrakmu di sini. Bila sudah tanda tangan tapi belum muncul, tanyakan ke HR.', label: 'Kirim pesan ke HR', go: 'inbox' },
  'Kamu belum memegang barang kantor.': { icon: 'box', title: 'Belum ada barang kantor', hint: 'Barang yang dipinjamkan kantor, misalnya laptop atau ID card, akan tercatat di sini.' },
  'Belum ada pesan.': { icon: 'inbox', title: 'Kotak masuk masih kosong', hint: 'Pesan dari HR dan rekan kerja akan muncul di sini.' },
  'Belum ada pesan terkirim.': { icon: 'send', title: 'Belum ada pesan terkirim', hint: 'Pesan yang kamu kirim ke HR atau rekan kerja akan tersimpan di sini.' },
  'Menu ini belum tersedia untuk akunmu.': { icon: 'lock', title: 'Menu belum tersedia', hint: 'Menu ini belum dibuka untuk akunmu. Hubungi HR bila kamu merasa seharusnya bisa mengaksesnya.', label: 'Ke Beranda', go: 'beranda' },
  'Pengajuan tidak ditemukan.': { icon: 'search', title: 'Pengajuan tidak ditemukan', hint: 'Mungkin sudah dihapus atau tautannya salah.', label: 'Ke Pengajuan', go: 'pengajuan' },
}
function AppEmpty({ text, title, hint, icon, action }) {
  const m = APP_EMPTY[text] || {}
  const head = title || m.title || text
  const body = hint !== undefined ? hint : m.hint
  const act = action || (m.go && { label: m.label, onClick: () => window.__kiranaGo?.(m.go) })
  return (
    <div className="app-empty" role="status">
      <span className="app-empty-ic" aria-hidden="true"><Icon name={icon || m.icon || 'calendar'} size={30} /></span>
      <strong>{head}</strong>{body && <p>{body}</p>}
      {act && <button type="button" className={`btn ${act.ghost ? 'btn-ghost' : 'btn-primary'}`} onClick={act.onClick}>{act.label}</button>}
    </div>
  )
}
export const Empty = (p) => (typeof window !== 'undefined' && window.KIRANA_APP) ? <AppEmpty {...p} />
  : <div className="empty"><Sticker name="mikir" size={84} /><p>{p.text}</p></div>

export function Tabs({ tabs, value, onChange }) {
  return <div className="tabs" role="tablist">{tabs.map((t) => {
    const v = typeof t === 'string' ? t : t.v; const l = typeof t === 'string' ? t : t.l
    return <button key={v} role="tab" aria-selected={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
  })}</div>
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open])
  if (!open) return null
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="modal-h"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Tutup"><Icon name="x" /></button></header>
        <div className="modal-b">{children}</div>
        {footer && <footer className="modal-f">{footer}</footer>}
      </div>
    </div>
  )
}

export const Field = ({ label, hint, children, lock }) => (
  <label className={`field ${lock ? 'locked' : ''}`}>
    <span className="field-l">{label}{lock && <span className="lock"><Icon name="lock" size={13} /> terkunci</span>}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
)

export const Toggle = ({ on, onChange, label }) => (
  <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
    <span className="knob" /><span>{label}</span>
  </button>
)

export function useToast() {
  const [msg, setMsg] = useState(null)
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2600); return () => clearTimeout(t) }, [msg])
  const node = msg ? <div className="toast" role="status"><Icon name="checkCircle" />{msg}</div> : null
  return [node, setMsg]
}

export const Avatar = ({ name = '?', size = 36 }) => {
  const ini = name.split(' ').map((x) => x[0]).slice(0, 2).join('')
  const hues = ['#0a5950', '#c1d276', '#f9d730', '#3c8d7f', '#7aa64a']
  const bg = hues[name.length % hues.length]
  return <span className="avatar" style={{ width: size, height: size, background: bg, color: bg === '#f9d730' || bg === '#c1d276' ? '#0b2b27' : '#fff', fontSize: size * 0.38 }}>{ini}</span>
}

// Mode aplikasi karyawan (APK/PWA): judul pindah ke top bar, aksi utama jadi tombol melayang (lihat app/app.css)
const APP_MODE = typeof window !== 'undefined' && !!window.KIRANA_APP
export const AppHead = ({ title, sub, children }) => {
  useEffect(() => { window.__kiranaSetTitle?.(title) }, [title])
  return (sub || children) ? <div className="app-head">{sub && <p className="app-sub">{sub}</p>}{children && <div className="app-acts">{children}</div>}</div> : null
}
export const PageHead = ({ title, sub, children }) => APP_MODE ? <AppHead title={title} sub={sub}>{children}</AppHead> : (
  <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="page-actions">{children}</div></div>
)

export const Note = ({ children }) => <div className="note"><Icon name="dot" size={14} />{children}</div>
