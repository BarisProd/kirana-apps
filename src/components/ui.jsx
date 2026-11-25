import React, { createContext, useContext, useEffect, useState } from 'react'
import { Sticker } from './Sticker.jsx'

export const Icon = ({ name, size = 20 }) => {
  const p = ICONS[name] || ICONS.dot
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p}</svg>
}

const ICONS = {
  key: <><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2" /></>,
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

// Izin aksi halaman untuk akun Admin (null = semua boleh). Nilai: { can: (aksi) => boolean, label }
export const PermCtx = createContext(null)
export const usePerm = () => useContext(PermCtx)
const txt = (c) => (c == null || c === false ? '' : typeof c === 'string' || typeof c === 'number' ? String(c) : Array.isArray(c) ? c.map(txt).join('') : c.props ? txt(c.props.children) : '')
const R_RX = /^(download|unduh|excel|pdf|detail|lihat|see |history|all log|rekap|close|tutup|batal|cancel|kembali|back|next|oke|ok$|buka|cari|filter|share|bagikan|mulai|buang draft|pengaturan|atur|talent setting|master kategori|remuneration detail|lihat)/i
const D_RX = /^(hapus|delete|keluarkan|kosongkan)/i
const S_RX = /^(simpan|save)/i
const C_RX = /^(new|add|tambah|create|buat|offer|kirim|send|submit|manual|upload|koreksi|bayar gaji|lanjutkan draft|\+)/i
const U_RX = /^(edit|ubah|setujui|approve|accept|tolak|reject|aktifkan|nonaktif|settings|setelan|reset|update|proceed|terapkan|salin|re-?upload|synchronize)/i
const ICON_ACT = { trash: 'd', plus: 'c', upload: 'c', send: 'c', edit: 'u', settings: 'u', check: 'u', x: 'u' }
export function actOf(icon, children) {
  const t = txt(children).trim()
  if (t) { if (R_RX.test(t)) return 'r'; if (D_RX.test(t)) return 'd'; if (S_RX.test(t)) return 'cu'; if (C_RX.test(t)) return 'c'; if (U_RX.test(t)) return 'u' }
  return ICON_ACT[icon] || 'r'
}
const ACT_NAME = { c: 'menambah', u: 'mengubah', d: 'menghapus', cu: 'menyimpan' }
export const Btn = ({ kind = 'primary', icon, children, className = '', perm, ...p }) => {
  const pc = useContext(PermCtx); const a = perm || actOf(icon, children)
  const deny = pc && a !== 'r' && !pc.can(a)
  return <button className={`btn btn-${kind} ${className}${deny ? ' no-perm' : ''}`} data-l={txt(children)} data-act={a} {...p} disabled={p.disabled || deny} title={deny ? `Akunmu tidak punya izin ${ACT_NAME[a]} data di ${pc.label}` : p.title}>{icon && <Icon name={deny ? 'lock' : icon} size={18} />}{children}</button>
}

export const Card = ({ title, action, children, className = '', pad = true }) => (
  <section className={`card ${className}`}>
    {(title || action) && <header className="card-h"><h3>{title}</h3>{action}</header>}
    <div className={pad ? 'card-b' : ''}>{children}</div>
  </section>
)

const tone = (v = '') => {
  const s = String(v).toLowerCase()
  if (/(approved|aktif|active|hadir|completed|success|full signed|accepted|diterima|lolos|hired|berhasil|terpilih|sudah)/.test(s)) return 'ok'
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
export function Table({ cols, rows, empty = 'Belum ada data.', onRow, center, paged = true, size: size0 = 25 }) {
  const [page, setPage] = useState(1); const [size, setSize] = useState(size0)
  useEffect(() => { setPage(1) }, [rows.length])
  if (!rows.length) return <Empty text={empty} />
  const usePg = paged && rows.length > size0
  const pages = Math.max(1, Math.ceil(rows.length / size)); const p = Math.min(page, pages)
  const view = usePg ? rows.slice((p - 1) * size, p * size) : rows
  const cells = view.map((r) => cols.map((c) => (c.r ? c.r(r) : r[c.k])))
  const who = cols.map((c, i) => cells.some((row) => hasWho(row[i])))
  const align = (c, i) => (who[i] ? undefined : center || c.c ? 'center' : c.right ? 'right' : 'left')
  return (
    <>
    <div className="tbl-wrap">
      <table className={`tbl ${center ? 'tc' : ''} ${cols.length > 8 ? 'dense' : ''}`}>
        <thead><tr>{cols.map((c, i) => <th key={c.k || c.h || i} className={who[i] ? 'col-who' : undefined} style={{ textAlign: who[i] ? 'center' : align(c, i) }}>{c.h}</th>)}</tr></thead>
        <tbody>{view.map((r, ri) => (
          <tr key={r.id || ri} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? 'clickable' : ''}>
            {cols.map((c, i) => <td key={c.k || c.h || i} data-h={c.h} className={who[i] ? 'col-who' : undefined} style={{ textAlign: align(c, i) }}>{cells[ri][i]}</td>)}
          </tr>))}
        </tbody>
      </table>
    </div>
    {usePg && <div className="tbl-pg"><Pager total={rows.length} page={p} size={size} onPage={setPage} onSize={setSize} sizes={[...new Set([size0, 50, 100, 250])].sort((a, b) => a - b)} /></div>}
    </>
  )
}

// ---------- Pagination (dipakai tabel panjang) ----------
export function Pager({ total, page, size, onPage, onSize, sizes = [10, 25, 50, 100], label = 'baris' }) {
  const pages = Math.max(1, Math.ceil(total / size)); const p = Math.min(page, pages)
  const nums = [...new Set([1, p - 1, p, p + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const from = total ? (p - 1) * size + 1 : 0, to = Math.min(total, p * size)
  return (
    <nav className="pager" aria-label="Halaman">
      <span className="muted sm">Menampilkan <b>{from}–{to}</b> dari <b>{total.toLocaleString('id-ID')}</b> {label}</span>
      <label className="pager-size"><span className="muted sm">Per halaman</span><select value={size} onChange={(e) => { onSize(+e.target.value); onPage(1) }} aria-label="Baris per halaman">{sizes.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
      <div className="pager-nav">
        <button className="pg" disabled={p <= 1} onClick={() => onPage(p - 1)} aria-label="Halaman sebelumnya">‹</button>
        {nums.map((n, i) => <React.Fragment key={n}>{i > 0 && n - nums[i - 1] > 1 && <span className="pg-gap">…</span>}<button className={'pg' + (n === p ? ' on' : '')} aria-current={n === p ? 'page' : undefined} onClick={() => onPage(n)}>{n}</button></React.Fragment>)}
        <button className="pg" disabled={p >= pages} onClick={() => onPage(p + 1)} aria-label="Halaman berikutnya">›</button>
      </div>
    </nav>
  )
}
export const Empty = ({ text }) => <div className="empty"><Sticker name="mikir" size={84} /><p>{text}</p></div>

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
      <div className={`modal ${wide ? 'wide' : ''} ${wide === 'full' ? 'full' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
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

export const Toggle = ({ on, onChange, label }) => { const pc = useContext(PermCtx); const deny = pc && !pc.can('u'); return (
  <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} disabled={deny} title={deny ? `Akunmu tidak punya izin mengubah data di ${pc.label}` : undefined}>
    <span className="knob" /><span>{label}</span>
  </button>
) }

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

export const PageHead = ({ title, sub, children }) => (
  <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="page-actions">{children}</div></div>
)

export const Note = ({ children }) => <div className="note"><Icon name="dot" size={14} />{children}</div>
