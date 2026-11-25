import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db } from './services/db.js'

// ---------- data hook ----------
export function useDb() {
  const [, force] = useState(0)
  useEffect(() => db.subscribe(() => force((n) => n + 1)), [])
  return db
}

// ---------- icons (2D sederhana, stroke) ----------
const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  doc: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6',
  money: 'M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v.01M18 14v.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.3-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  exit: 'M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 16l4-4-4-4M14 12H4',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  brief: 'M3 8h18v12H3zM8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 13h18',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  chev: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  pin: 'M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  handshake: 'M2 12l4-4 4 2 3-2 5 1 4 4-5 5-3-1-3 2-4-3zM8 13l3 3M11 11l3 3',
  pen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  chat: 'M4 5h16v11H8l-4 4z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  test: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
  megaphone: 'M3 10v4h4l7 4V6L7 10zM18 9a4 4 0 0 1 0 6',
}
export function Icon({ name, size = 20, stroke = 2, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[name] || P.doc} />
    </svg>
  )
}

// ---------- toast ----------
const ToastCtx = createContext(() => {})
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((text, tone = 'ok') => {
    const id = Math.random()
    setItems((x) => [...x, { id, text, tone }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast ${t.tone}`}><Icon name={t.tone === 'ok' ? 'check' : 'x'} size={18} />{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

// ---------- primitives ----------
export const Btn = ({ kind = 'primary', icon, children, ...p }) => (
  <button type="button" className={`btn ${kind}`} {...p}>{icon && <Icon name={icon} size={18} />}{children}</button>
)
export const Badge = ({ tone = 'neutral', children }) => <span className={`badge ${tone}`}>{children}</span>

const toneMap = {
  Approved: 'good', Completed: 'good', 'Full Signed': 'good', Accepted: 'good', Hadir: 'good', Active: 'good', Complete: 'good', Hired: 'good', 'Active Pool': 'good', Diterima: 'good',
  Waiting: 'warn', 'In Review': 'warn', 'Waiting Transfer': 'warn', Process: 'warn', Sent: 'warn', 'Employee Signed': 'warn', Terlambat: 'warn', Requested: 'warn', Draft: 'neutral', Menunggu: 'warn', 'Pending Assessment': 'warn', 'In Hiring Process': 'info', Processing: 'info', Cuti: 'info', Offered: 'info',
  Rejected: 'bad', Failed: 'bad', Expired: 'bad', 'Non-Active': 'neutral', None: 'neutral', Incomplete: 'bad', Ditolak: 'bad', Registered: 'neutral',
}
export const Status = ({ s }) => <Badge tone={toneMap[s] || 'neutral'}>{s}</Badge>

export function Card({ title, action, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && <header className="card-h"><h3>{title}</h3>{action}</header>}
      <div className={pad ? 'card-b' : ''}>{children}</div>
    </section>
  )
}

export function PageHead({ title, sub, actions }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {actions && <div className="row gap">{actions}</div>}
    </div>
  )
}

export function Stats({ items }) {
  return (
    <div className="stats">
      {items.map((s) => (
        <div className={`stat ${s.tone || ''}`} key={s.label} title={s.hint}>
          <span className="stat-l">{s.label}</span>
          <strong className="stat-v">{s.value}</strong>
          {s.hint && <span className="stat-h">{s.hint}</span>}
        </div>
      ))}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => {
        const id = typeof t === 'string' ? t : t.id
        const label = typeof t === 'string' ? t : t.label
        return <button key={id} type="button" role="tab" aria-selected={value === id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>{label}</button>
      })}
    </div>
  )
}

// Tabel responsif: di layar kecil berubah jadi kartu.
export function Table({ cols, rows, empty = 'Belum ada data.', onRow }) {
  if (!rows.length) return <div className="empty"><Icon name="box" size={28} /><p>{empty}</p></div>
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr>{cols.map((c) => <th key={c.k}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? 'click' : ''}>
              {cols.map((c) => <td key={c.k} data-l={c.label}>{c.render ? c.render(r) : r[c.k]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="modal-h"><h3>{title}</h3><button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><Icon name="x" /></button></header>
        <div className="modal-b">{children}</div>
        {footer && <footer className="modal-f">{footer}</footer>}
      </div>
    </div>
  )
}

export function Confirm({ open, text, onYes, onNo, yes = 'Ya, lanjutkan' }) {
  return (
    <Modal open={open} title="Konfirmasi" onClose={onNo} footer={<><Btn kind="ghost" onClick={onNo}>Batal</Btn><Btn onClick={onYes}>{yes}</Btn></>}>
      <p>{text}</p>
    </Modal>
  )
}

export function Field({ label, hint, children, id }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-l">{label}</span>
      {children}
      {hint && <span className="field-h">{hint}</span>}
    </label>
  )
}
export const Input = (p) => <input className="inp" {...p} />
export const Select = ({ options, ...p }) => (
  <select className="inp" {...p}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
)
export function Toggle({ checked, onChange, label, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track"><span className="knob" /></span>
      <span>{label}</span>
    </label>
  )
}

export function Stepper({ steps, at }) {
  return (
    <ol className="stepper">
      {steps.map((s, i) => <li key={s} className={i < at ? 'done' : i === at ? 'on' : ''}><span>{i < at ? '✓' : i + 1}</span>{s}</li>)}
    </ol>
  )
}

export const Avatar = ({ name, size = 36 }) => {
  const ini = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 4
  return <span className={`avatar h${hue}`} style={{ width: size, height: size }} aria-hidden="true">{ini}</span>
}

export const fmtDate = (s) => {
  if (!s || s === '—') return '—'
  const d = new Date(s)
  if (isNaN(d)) return s
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
