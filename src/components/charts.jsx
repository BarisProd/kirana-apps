// Grafik ringan tanpa library (SVG/HTML), tema Kirana. Mengikuti panduan dataviz:
// satu sumbu, tanda tipis, ujung bar membulat 4px, grid samar, tooltip saat hover/fokus, label teks memakai warna teks (bukan warna seri).
import React, { useEffect, useRef, useState } from 'react'

const fmt = (v) => Number(v).toLocaleString('id-ID')
function useWidth() {
  const ref = useRef(null); const [w, setW] = useState(600)
  useEffect(() => { if (!ref.current) return; const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width))); ro.observe(ref.current); return () => ro.disconnect() }, [])
  return [ref, w]
}
const niceMax = (m) => { if (m <= 4) return 4; const p = 10 ** Math.floor(Math.log10(m)); const n = Math.ceil(m / p); return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p }

// Garis + area, satu seri. points: [{ l: label, v: nilai }]
export function LineArea({ points, unit = '', height = 220, label }) {
  const [ref, W] = useWidth(); const [hi, setHi] = useState(null)
  const H = height, L = 34, R = 12, T = 14, B = 26
  const max = niceMax(Math.max(1, ...points.map((p) => p.v)))
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, points.length - 1)
  const y = (v) => T + (H - T - B) * (1 - v / max)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  const area = `${d}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`
  const ticks = [0, max / 2, max]
  const every = Math.ceil(points.length / Math.max(2, Math.floor((W - L) / 64)))
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left - L) / (W - L - R)) * (points.length - 1)); setHi(Math.max(0, Math.min(points.length - 1, i))) }
  return (
    <div ref={ref} className="ch" style={{ height: H }}>
      <svg width={W} height={H} role="img" aria-label={label} onMouseMove={move} onMouseLeave={() => setHi(null)} onTouchStart={(e) => move(e.touches[0] && { currentTarget: e.currentTarget, clientX: e.touches[0].clientX })}>
        <defs><linearGradient id="ch-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ch-1)" stopOpacity=".22" /><stop offset="1" stopColor="var(--ch-1)" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="ch-grid" /><text x={L - 8} y={y(t) + 4} className="ch-ax" textAnchor="end">{fmt(t)}</text></g>)}
        {points.map((p, i) => ((i % every === 0 && points.length - 1 - i >= every * 0.75) || i === points.length - 1) && <text key={i} x={x(i)} y={H - 6} className="ch-ax" textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{p.l}</text>)}
        <path d={area} fill="url(#ch-area)" /><path d={d} className="ch-line" />
        {hi != null && <><line x1={x(hi)} x2={x(hi)} y1={T} y2={y(0)} className="ch-cross" /><circle cx={x(hi)} cy={y(points[hi].v)} r="5" className="ch-dot" /></>}
      </svg>
      {hi != null && <div className="ch-tip" style={{ left: Math.min(W - 140, Math.max(0, x(hi) - 70)), top: 0 }}><b>{fmt(points[hi].v)}{unit}</b><span>{points[hi].full || points[hi].l}</span></div>}
    </div>
  )
}

// Kolom vertikal, satu seri
export function Columns({ points, unit = '', height = 200, label }) {
  const [hi, setHi] = useState(null)
  const max = niceMax(Math.max(1, ...points.map((p) => p.v)))
  return (
    <div className="ch-cols" style={{ height }} role="img" aria-label={label}>
      <div className="ch-cols-ax"><span>{fmt(max)}</span><span>{fmt(max / 2)}</span><span>0</span></div>
      <div className="ch-cols-plot">
        {[0, 50, 100].map((g) => <i key={g} className="ch-hgrid" style={{ bottom: g + '%' }} />)}
        {points.map((p, i) => (
          <button key={i} className={'ch-col' + (hi === i ? ' on' : '')} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(i)} onBlur={() => setHi(null)} aria-label={`${p.full || p.l}: ${fmt(p.v)}${unit}`}>
            <span className="ch-col-bar" style={{ height: `${(p.v / max) * 100}%` }} />
            <span className="ch-col-l">{p.l}</span>
            {hi === i && <span className={'ch-tip up' + (i >= points.length - 2 ? ' r' : i <= 1 ? ' l' : '')}><b>{fmt(p.v)}{unit}</b><span>{p.full || p.l}</span></span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// Bar segmen tinggi (bagian dari satu keseluruhan), legenda selalu ada dengan angka & persen
export function SegBar({ parts, label }) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1
  return (
    <div className="ch-seg" role="img" aria-label={label}>
      <div className="ch-seg-bar">{parts.filter((p) => p.v).map((p) => <span key={p.l} style={{ flex: p.v, background: p.c }} title={`${p.l}: ${p.v}`} />)}</div>
      <ul className="ch-leg">{parts.map((p) => <li key={p.l}><i style={{ background: p.c }} /><span>{p.l}</span><b>{p.v}</b><small>{Math.round((p.v / tot) * 100)}%</small></li>)}</ul>
    </div>
  )
}

// Bar horizontal (perbandingan antar kategori), label nilai di ujung
export function HBars({ rows, unit = '', label }) {
  const max = Math.max(1, ...rows.map((r) => r.v))
  return (
    <ul className="ch-hb" role="img" aria-label={label}>
      {rows.map((r) => <li key={r.l} title={`${r.l}: ${fmt(r.v)}${unit}`}><span className="ch-hb-l">{r.l}</span><span className="ch-hb-t"><i style={{ width: `${(r.v / max) * 100}%` }} /></span><b>{fmt(r.v)}{unit}</b></li>)}
    </ul>
  )
}

// Heatmap: baris × kolom, satu hue terang→gelap
const RAMP = ['#eef4f1', '#cfe3da', '#9cc6b5', '#5d9e88', '#2c7563', '#0a5950']
export function Heatmap({ rows, cols, value, label }) {
  const max = Math.max(1, ...rows.flatMap((r) => cols.map((c) => value(r, c))))
  const [hi, setHi] = useState(null)
  const col = (v) => (v === 0 ? RAMP[0] : RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(((v - 1) / Math.max(1, max - 1)) * (RAMP.length - 2) + 0.0001))])
  return (
    <div className="ch-hm" role="img" aria-label={label}>
      <div className="ch-hm-grid" style={{ gridTemplateColumns: `minmax(110px,1.2fr) repeat(${cols.length}, minmax(34px,1fr))` }}>
        <span />{cols.map((c) => <span key={c.k} className="ch-hm-ch">{c.l}</span>)}
        {rows.map((r) => <React.Fragment key={r.k}><span className="ch-hm-rh">{r.l}</span>{cols.map((c) => { const v = value(r, c); const on = hi === r.k + c.k; return (
          <button key={c.k} className={'ch-hm-c' + (on ? ' on' : '')} style={{ background: col(v), color: v / max > 0.5 ? '#fff' : 'var(--k)' }} onMouseEnter={() => setHi(r.k + c.k)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(r.k + c.k)} onBlur={() => setHi(null)} aria-label={`${r.l} · ${c.l}: ${v}`}>
            {v || ''}{on && <span className="ch-tip up"><b>{v} aktivitas</b><span>{r.l} · {c.l}</span></span>}
          </button>) })}</React.Fragment>)}
      </div>
      <div className="ch-hm-key"><span>Sedikit</span>{RAMP.map((c) => <i key={c} style={{ background: c }} />)}<span>Banyak</span></div>
    </div>
  )
}

// Bar bertumpuk horizontal per baris (komposisi tiap baris), legenda selalu tampil, tooltip per segmen
export function StackRows({ rows, keys, fmtV = fmt, label, onRow }) {
  const max = Math.max(1, ...rows.map((r) => keys.reduce((a, k) => a + (r.v[k.k] || 0), 0)))
  const [hi, setHi] = useState(null)
  return (
    <div className="ch-sr" role="img" aria-label={label}>
      <ul className="ch-leg row">{keys.map((k) => <li key={k.k}><i style={{ background: k.c }} /><span>{k.l}</span></li>)}</ul>
      {rows.map((r) => { const tot = keys.reduce((a, k) => a + (r.v[k.k] || 0), 0); return (
        <div key={r.k} className={'ch-sr-r' + (onRow ? ' click' : '')} onClick={onRow ? () => onRow(r) : undefined}>
          <span className="ch-sr-l" title={r.l}>{r.l}{r.sub && <small>{r.sub}</small>}</span>
          <span className="ch-sr-t"><span className="ch-sr-bar" style={{ width: `${(tot / max) * 100}%` }}>{keys.map((k) => { const v = r.v[k.k] || 0; const id = r.k + k.k; return v ? (
            <button key={k.k} style={{ flex: v, background: k.c }} className={hi === id ? 'on' : ''} onMouseEnter={() => setHi(id)} onMouseLeave={() => setHi(null)} onFocus={() => setHi(id)} onBlur={() => setHi(null)} aria-label={`${r.l} · ${k.l}: ${fmtV(v)}`}>
              {hi === id && <span className="ch-tip up"><b>{fmtV(v)}</b><span>{k.l} · {Math.round((v / tot) * 100)}%</span></span>}
            </button>) : null })}</span></span>
          <b className="ch-sr-v">{fmtV(tot)}</b>
        </div>) })}
    </div>
  )
}
