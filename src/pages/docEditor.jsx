// Editor dokumen sederhana untuk Setup Dokumen: format teks, paragraf, daftar, penggaris (indent + tab stop), dan penanda data.
// Dibuat tanpa library supaya build tetap statis. Hasil disimpan sebagai HTML (lihat services/docs.js).
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../components/ui.jsx'
import { tokenHtml, TAB_HTML, tabsOf, DEFAULT_TABS } from '../services/docs.js'

// 10 font umum. Tersedia bila terpasang di perangkat; versi produksi sebaiknya membundel padanan gratisnya
// (Liberation/Tinos/Arimo/Cousine, EB Garamond, dsb.) supaya tampilan sama di semua perangkat.
export const FONTS = [
  ['Times New Roman', '"Times New Roman", Tinos, "Liberation Serif", Times, serif'],
  ['Arial', 'Arial, Arimo, "Liberation Sans", Helvetica, sans-serif'],
  ['Tahoma', 'Tahoma, "DejaVu Sans", Verdana, sans-serif'],
  ['Verdana', 'Verdana, "DejaVu Sans", Geneva, sans-serif'],
  ['Georgia', 'Georgia, "Gelasio", serif'],
  ['Garamond', 'Garamond, "EB Garamond", "Cormorant Garamond", serif'],
  ['Trebuchet MS', '"Trebuchet MS", "Fira Sans", sans-serif'],
  ['Courier New', '"Courier New", Cousine, "Liberation Mono", monospace'],
  ['Book Antiqua', '"Book Antiqua", "Palatino Linotype", Palatino, "TeX Gyre Pagella", serif'],
  ['Calibri', 'Calibri, Carlito, "Segoe UI", sans-serif'],
]
const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36]
const LINE = [['1', '1.0'], ['1.15', '1.15'], ['1.5', '1.5'], ['2', '2.0'], ['2.5', '2.5'], ['3', '3.0']]
const LETTER = [['-0.5px', '-0,5'], ['0px', '0'], ['0.5px', '0,5'], ['1px', '1'], ['2px', '2'], ['3px', '3']]
const PARA = [['0pt', '0 pt'], ['6pt', '6 pt'], ['10pt', '10 pt'], ['12pt', '12 pt'], ['18pt', '18 pt'], ['24pt', '24 pt']]
const CASES = [['none', 'Aa  Normal'], ['uppercase', 'AA  HURUF BESAR'], ['lowercase', 'aa  huruf kecil'], ['capitalize', 'Aa  Awal Kata Besar']]
const TRIM = [['', 'Standar'], ['trim-both cap alphabetic', 'Cap height ke baseline']]
const LISTS = [['none', 'Tanpa daftar'], ['disc', '• Bulat'], ['circle', '◦ Lingkaran'], ['square', '▪ Kotak'], ['decimal', '1. 2. 3.'], ['lower-alpha', 'a. b. c.'], ['upper-alpha', 'A. B. C.'], ['lower-roman', 'i. ii. iii.']]
const CM = 37.795 // px per cm
const DEF_TAB = 48 // tab bawaan 1,27 cm
export const PAGE_W = 794, MARGIN = 96, CONTENT_W = PAGE_W - MARGIN * 2

// Atur ulang lebar setiap tab agar tulisan sesudahnya jatuh tepat di tab stop berikutnya.
export function relayoutTabs(root, stops) {
  if (!root) return
  const s = [...(stops || [])].sort((a, b) => a - b)
  const rr = root.getBoundingClientRect(); const left = rr.left + parseFloat(getComputedStyle(root).paddingLeft || 0)
  root.querySelectorAll('span.tab').forEach((t) => {
    t.style.width = '0px'
    const x = t.getBoundingClientRect().left - left
    const next = s.find((v) => v > x + 1) ?? (Math.floor(x / DEF_TAB) + 1) * DEF_TAB
    t.style.width = Math.max(4, next - x) + 'px'
  })
}

// Tampilan dokumen jadi (pratinjau, review sampling, menu Kontrak talent)
export function DocView({ html }) {
  const ref = useRef(null)
  useLayoutEffect(() => { const el = ref.current?.querySelector('.kdoc'); relayoutTabs(el, tabsOf(html)) }, [html])
  return <div className="doc-scroll"><div className="doc-page" ref={ref} dangerouslySetInnerHTML={{ __html: html }} /></div>
}

const BLOCKS = 'P,DIV,LI,H1,H2,H3,H4,BLOCKQUOTE'
const unwrap = (html) => { const m = /^\s*<div class="kdoc"[^>]*>([\s\S]*)<\/div>\s*$/.exec(html); return m ? m[1] : html }

export const RichEditor = forwardRef(function RichEditor({ html, onChange, fields = [] }, ref) {
  const ed = useRef(null); const saved = useRef(null)
  const [stops, setStops] = useState(() => tabsOf(html))
  const [ind, setInd] = useState({ left: 0, first: 0, right: 0 })
  const [fmt, setFmt] = useState({ font: 'Times New Roman', size: '12', b: false, i: false, u: false, align: 'left', list: 'none', line: '1.5' })
  const stopsRef = useRef(stops); stopsRef.current = stops

  const emit = useCallback(() => { const el = ed.current; if (!el) return; relayoutTabs(el, stopsRef.current); onChange(`<div class="kdoc" data-tabs="${stopsRef.current.map((v) => Math.round(v)).join(',')}">${el.innerHTML}</div>`) }, [onChange])

  useEffect(() => {
    const el = ed.current; el.innerHTML = unwrap(html) || '<p><br></p>'
    try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch (e) {}
    relayoutTabs(el, stops)
    const onSel = () => { const sel = window.getSelection(); if (sel.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer)) { saved.current = sel.getRangeAt(0).cloneRange(); readState() } }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const firstRun = useRef(true)
  useEffect(() => { relayoutTabs(ed.current, stops); if (firstRun.current) { firstRun.current = false; return } emit() }, [stops]) // eslint-disable-line react-hooks/exhaustive-deps

  const restore = () => {
    const el = ed.current; const sel = window.getSelection()
    if (document.activeElement === el && sel.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer)) return sel.getRangeAt(0)
    el.focus({ preventScroll: true })
    if (saved.current && el.contains(saved.current.commonAncestorContainer)) { sel.removeAllRanges(); sel.addRange(saved.current) }
    else { const r = document.createRange(); r.selectNodeContents(el.lastElementChild || el); r.collapse(false); sel.removeAllRanges(); sel.addRange(r) }
    return sel.getRangeAt(0)
  }
  const blockOf = (n) => { const el = ed.current; while (n && n !== el) { if (n.nodeType === 1 && BLOCKS.split(',').includes(n.nodeName) && (n.parentNode === el || n.nodeName === 'LI')) return n; n = n.parentNode } return null }
  const blocksIn = (r) => {
    const el = ed.current; const a = blockOf(r.startContainer); const z = blockOf(r.endContainer)
    if (!a) return []
    const all = [...el.querySelectorAll(BLOCKS.split(',').map((t) => t.toLowerCase()).join(','))].filter((b) => b.parentNode === el || b.nodeName === 'LI').filter((b) => !(b.nodeName !== 'LI' && b.querySelector('li')))
    const i = all.indexOf(a); const j = all.indexOf(z)
    return i < 0 ? [a] : all.slice(i, (j < 0 ? i : j) + 1)
  }
  function readState() {
    const r = saved.current; if (!r) return
    const node = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode
    const cs = getComputedStyle(node); const b = blockOf(r.startContainer); const bs = b ? getComputedStyle(b) : null
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()
    const f = FONTS.find(([n, stack]) => n === fam || stack.split(',')[0].replace(/["']/g, '').trim() === fam)
    const list = node.closest?.('ul,ol')
    setFmt({ font: f ? f[0] : '', size: String(Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2), b: document.queryCommandState('bold'), i: document.queryCommandState('italic'), u: document.queryCommandState('underline'),
      align: bs ? (bs.textAlign === 'start' ? 'left' : bs.textAlign) : 'left', list: list ? (list.style.listStyleType || (list.nodeName === 'OL' ? 'decimal' : 'disc')) : 'none',
      line: bs ? String(Math.round((parseFloat(bs.lineHeight) / parseFloat(bs.fontSize)) * 100) / 100 || '') : '' })
    if (bs) setInd({ left: parseFloat(bs.paddingLeft) || 0, first: parseFloat(bs.textIndent) || 0, right: parseFloat(bs.paddingRight) || 0 })
  }
  const done = () => { emit(); const sel = window.getSelection(); if (sel.rangeCount) saved.current = sel.getRangeAt(0).cloneRange(); readState() }

  const cmd = (c, v) => { restore(); document.execCommand('styleWithCSS', false, true); document.execCommand(c, false, v); done() }
  // Bungkus teks terpilih dengan gaya inline (dipakai untuk ukuran, huruf besar/kecil, letter spacing, font)
  const inline = (style) => {
    const r = restore(); const el = ed.current
    const wrap = (rg) => {
      if (rg.collapsed) return null
      const frag = rg.extractContents()
      frag.querySelectorAll('[style]').forEach((x) => Object.keys(style).forEach((k) => { x.style[k] = '' }))
      const sp = document.createElement('span'); Object.assign(sp.style, style); sp.appendChild(frag); rg.insertNode(sp); return sp
    }
    let first = null, last = null
    if (r.collapsed) {
      const sp = document.createElement('span'); Object.assign(sp.style, style); sp.textContent = '​'; r.insertNode(sp)
      const nr = document.createRange(); nr.setStart(sp.firstChild, 1); nr.collapse(true); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(nr); done(); return
    }
    const bl = blocksIn(r)
    if (bl.length <= 1) first = last = wrap(r)
    else bl.forEach((b, k) => { const sub = document.createRange(); sub.selectNodeContents(b); if (k === 0) sub.setStart(r.startContainer, r.startOffset); if (k === bl.length - 1) sub.setEnd(r.endContainer, r.endOffset); const sp = wrap(sub); if (sp) { first = first || sp; last = sp } })
    if (first) { const nr = document.createRange(); nr.setStartBefore(first); nr.setEndAfter(last); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(nr) }
    el.normalize(); done()
  }
  const block = (fn) => { const r = restore(); let bl = blocksIn(r); if (!bl.length) { document.execCommand('formatBlock', false, 'p'); bl = blocksIn(window.getSelection().getRangeAt(0)) } bl.forEach(fn); done() }
  const setList = (type) => {
    restore(); const sel = window.getSelection(); const node = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentNode
    let list = node?.closest?.('ul,ol'); const ordered = ['decimal', 'lower-alpha', 'upper-alpha', 'lower-roman'].includes(type)
    if (type === 'none') { if (list) document.execCommand(list.nodeName === 'OL' ? 'insertOrderedList' : 'insertUnorderedList'); return done() }
    if (!list || (list.nodeName === 'OL') !== ordered) document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList')
    const n2 = window.getSelection().anchorNode; list = (n2?.nodeType === 1 ? n2 : n2?.parentNode)?.closest?.('ul,ol')
    if (list) list.style.listStyleType = type
    done()
  }
  const insertHtml = (h) => {
    const r = restore(); r.deleteContents()
    const tpl = document.createElement('template'); tpl.innerHTML = h; const node = tpl.content.firstChild
    r.insertNode(node)
    let after = node.nextSibling
    if (!after || (after.nodeType === 3 && !after.data)) { after = document.createTextNode('​'); node.after(after) }
    const nr = document.createRange(); if (after.nodeType === 3) nr.setStart(after, after.data === '​' ? 1 : 0); else nr.setStartAfter(node); nr.collapse(true)
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(nr); done()
  }
  useImperativeHandle(ref, () => ({ insertToken: (f) => insertHtml(tokenHtml(f)) }))

  const onKey = (e) => {
    if (e.key === 'Tab') { e.preventDefault(); insertHtml(TAB_HTML) }
    else if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); cmd({ b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]) }
  }

  // ---------- penggaris ----------
  const setIndent = (k, v) => block((b) => {
    const cur = { left: parseFloat(b.style.paddingLeft) || 0, first: parseFloat(b.style.textIndent) || 0, right: parseFloat(b.style.paddingRight) || 0 }
    if (k === 'left') { const abs = cur.left + cur.first; b.style.paddingLeft = v + 'px'; b.style.textIndent = (abs - v) + 'px' }
    if (k === 'first') b.style.textIndent = (v - cur.left) + 'px'
    if (k === 'right') b.style.paddingRight = v + 'px'
  })
  const sel = (label, value, opts, on, w) => <label className="rt-sel" style={w ? { width: w } : undefined}><span className="sr">{label}</span><select aria-label={label} title={label} value={value} onMouseDown={() => { const s = window.getSelection(); if (s.rangeCount && ed.current.contains(s.getRangeAt(0).commonAncestorContainer)) saved.current = s.getRangeAt(0).cloneRange() }} onChange={(e) => on(e.target.value)}>{opts}</select></label>
  const tb = (icon, label, on, active) => <button type="button" className={`rt-btn ${active ? 'on' : ''}`} title={label} aria-label={label} aria-pressed={active || undefined} onMouseDown={(e) => e.preventDefault()} onClick={on}>{icon}</button>
  const o = (arr) => arr.map(([v, l]) => <option key={v} value={v}>{l}</option>)

  return (
    <div className="rt">
      <div className="rt-bar" role="toolbar" aria-label="Format dokumen">
        <div className="rt-grp">
          {sel('Font', fmt.font, <>{!fmt.font && <option value="">Font campuran</option>}{FONTS.map(([n, st]) => <option key={n} value={n} style={{ fontFamily: st }}>{n}</option>)}</>, (v) => { const f = FONTS.find((x) => x[0] === v); if (f) inline({ fontFamily: f[1] }) }, 172)}
          {sel('Ukuran font', SIZES.map(String).includes(fmt.size) ? fmt.size : '', <>{!SIZES.map(String).includes(fmt.size) && <option value="">{fmt.size || '–'}</option>}{SIZES.map((z) => <option key={z} value={z}>{String(z).replace('.', ',')} pt</option>)}</>, (v) => inline({ fontSize: v + 'pt' }), 92)}
        </div>
        <div className="rt-grp">
          {tb(<b>B</b>, 'Bold (Ctrl+B)', () => cmd('bold'), fmt.b)}
          {tb(<i>I</i>, 'Italic (Ctrl+I)', () => cmd('italic'), fmt.i)}
          {tb(<u>U</u>, 'Underline (Ctrl+U)', () => cmd('underline'), fmt.u)}
          {sel('Case', '', <><option value="" disabled>Aa</option>{o(CASES)}</>, (v) => inline({ textTransform: v }), 74)}
        </div>
        <div className="rt-grp">
          {[['left', 'Rata kiri', 'justifyLeft'], ['center', 'Rata tengah', 'justifyCenter'], ['right', 'Rata kanan', 'justifyRight'], ['justify', 'Rata kiri-kanan', 'justifyFull']].map(([a, l, c]) => tb(<AlignIc a={a} />, l, () => cmd(c), fmt.align === a))}
        </div>
        {fields.length > 0 && <div className="rt-grp">
          {sel('Sisipkan penanda data', '', <><option value="" disabled>＋ Sisipkan data</option>{fields.map(([g, list]) => <optgroup key={g} label={g}>{list.map((f) => <option key={f} value={f}>{f}</option>)}</optgroup>)}</>, (v) => insertHtml(tokenHtml(v)), 168)}
        </div>}
        <div className="rt-grp">
          {sel('Daftar (list style)', fmt.list, o(LISTS), setList, 132)}
          {sel('Line height', LINE.some((x) => x[0] === fmt.line) ? fmt.line : '', <><option value="" disabled>↕ Baris</option>{o(LINE.map(([v, l]) => [v, '↕ ' + l]))}</>, (v) => block((b) => { b.style.lineHeight = v }), 120)}
          {sel('Paragraph spacing', '', <><option value="" disabled>¶ Paragraf</option>{o(PARA.map(([v, l]) => [v, '¶ ' + l]))}</>, (v) => block((b) => { b.style.marginBottom = v }), 140)}
          {sel('Letter spacing', '', <><option value="" disabled>A↔A Huruf</option>{o(LETTER.map(([v, l]) => [v, 'A↔A ' + l]))}</>, (v) => inline({ letterSpacing: v }), 140)}
          {sel('Vertical trim', '', <><option value="" disabled>Vertical trim</option>{o(TRIM.map(([v, l]) => [v || 'standar', l]))}</>, (v) => block((b) => { b.style.setProperty('text-box', v === 'standar' ? '' : v) }), 128)}
        </div>
      </div>
      <div className="doc-scroll">
        <div className="doc-stack">
          <Ruler ind={ind} stops={stops} setStops={setStops} setIndent={setIndent} />
          <div className="doc-page edit">
            <div ref={ed} className="kdoc" contentEditable suppressContentEditableWarning spellCheck={false} role="textbox" aria-multiline="true" aria-label="Isi template" onKeyDown={onKey} onInput={() => { emit() }} onMouseUp={readState} onKeyUp={readState} />
          </div>
        </div>
      </div>
    </div>
  )
})

const AlignIc = ({ a }) => {
  const L = { left: [[4, 18], [4, 14], [4, 18], [4, 12]], center: [[3, 18], [6, 12], [3, 18], [7, 10]], right: [[2, 18], [6, 14], [2, 18], [8, 12]], justify: [[3, 18], [3, 18], [3, 18], [3, 18]] }[a]
  return <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true">{L.map(([x, w], i) => <rect key={i} x={x} y={4 + i * 4} width={w} height="2" rx="1" fill="currentColor" />)}</svg>
}

// Penggaris: penanda indent (baris pertama, kiri, kanan) dan tab stop. Klik penggaris = tambah tab, seret = geser, seret keluar / klik ganda = hapus.
function Ruler({ ind, stops, setStops, setIndent }) {
  const bar = useRef(null); const [drag, setDrag] = useState(null)
  const snap = (x) => Math.max(0, Math.min(CONTENT_W, Math.round(x / (CM / 4)) * (CM / 4)))
  const xOf = (e) => e.clientX - bar.current.getBoundingClientRect().left - MARGIN
  const start = (kind, i) => (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); setDrag({ kind, i, x: null, out: false, y0: e.clientY }) }
  const move = (e) => { if (!drag) return; setDrag({ ...drag, x: snap(xOf(e)), out: drag.kind === 'tab' && Math.abs(e.clientY - drag.y0) > 28 }) }
  const end = () => {
    if (!drag) return
    if (drag.x != null) {
      if (drag.kind === 'tab') setStops(drag.out ? stops.filter((_, k) => k !== drag.i) : stops.map((v, k) => (k === drag.i ? drag.x : v)).sort((a, b) => a - b))
      else if (drag.kind === 'right') setIndent('right', CONTENT_W - drag.x)
      else setIndent(drag.kind, drag.x)
    }
    setDrag(null)
  }
  const add = (e) => { if (drag) return; const x = snap(xOf(e)); if (x <= 0 || x >= CONTENT_W || stops.some((v) => Math.abs(v - x) < 6)) return; setStops([...stops, x].sort((a, b) => a - b)) }
  const pos = (kind, v, i) => (drag && drag.kind === kind && (kind !== 'tab' || drag.i === i) && drag.x != null ? drag.x : v)
  const ticks = []
  for (let c = 0; c * CM <= CONTENT_W + 1; c += 0.25) ticks.push(<i key={c} className={c % 1 === 0 ? 'cm' : c % 0.5 === 0 ? 'half' : ''} style={{ left: MARGIN + c * CM }}>{c % 1 === 0 && c > 0 ? c : ''}</i>)
  return (
    <div className="ruler-wrap">
      <div className="ruler" ref={bar} onPointerMove={move} onPointerUp={end} onPointerCancel={() => setDrag(null)}>
        <div className="ruler-track" style={{ left: MARGIN, width: CONTENT_W }} onClick={add} title="Klik untuk menambah tab stop" />
        {ticks}
        <button type="button" className="rm first" title="Indent baris pertama" aria-label="Indent baris pertama" style={{ left: MARGIN + pos('first', ind.left + ind.first) }} onPointerDown={start('first')} />
        <button type="button" className="rm left" title="Indent kiri" aria-label="Indent kiri" style={{ left: MARGIN + pos('left', ind.left) }} onPointerDown={start('left')} />
        <button type="button" className="rm right" title="Indent kanan" aria-label="Indent kanan" style={{ left: MARGIN + pos('right', CONTENT_W - ind.right) }} onPointerDown={start('right')} />
        {stops.map((v, i) => <button key={i} type="button" className={`rt-tab ${drag?.kind === 'tab' && drag.i === i && drag.out ? 'out' : ''}`} title={`Tab stop ${(v / CM).toFixed(2).replace('.', ',')} cm. Seret untuk geser, seret keluar atau klik ganda untuk hapus`} aria-label={`Tab stop ${(v / CM).toFixed(2)} cm`} style={{ left: MARGIN + pos('tab', v, i) }} onPointerDown={start('tab', i)} onDoubleClick={() => setStops(stops.filter((_, k) => k !== i))} />)}
      </div>
    </div>
  )
}

export { DEFAULT_TABS }
