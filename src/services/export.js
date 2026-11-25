// Ekspor data tabel ke Excel (.xls, tabel HTML yang dibuka Excel) dan PDF (penulis PDF minimal, tanpa library).
// Dipusatkan di services agar nanti bisa diganti ekspor dari server/Cloud Function.
import { buildXlsx } from './xlsx.js'
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function saveLocal(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
// Di dalam artifact Claude, unduhan harus lewat capability "downloads" (pengguna mengonfirmasi dulu).
// Di luar itu (website / app hasil build) pakai unduhan browser biasa.
const viaHost = async () => { try { return window.claude?.use ? await window.claude.use('downloads') : null } catch (e) { return null } }
export async function save(blob, name) {
  const host = await viaHost()
  if (host) { try { await host.save({ filename: name, data: blob }) } catch (e) { /* ditolak pengguna atau tidak tersedia */ } return }
  saveLocal(blob, name)
}
const csvCell = (v) => { const t = String(v ?? ''); return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t }

export function exportExcel({ title, meta = '', cols, rows, file }) {
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><tr><th colspan="${cols.length}">${esc(title)}</th></tr><tr><td colspan="${cols.length}">${esc(meta)}</td></tr><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table></body></html>`
  if (window.claude?.use) { // artifact hanya menerima csv/xlsx, bukan .xls
    const csv = [[title], [meta], cols, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
    return save(new Blob(['\ufeff' + csv], { type: 'text/csv' }), file + '.csv')
  }
  save(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }), file + '.xls')
}

const pdfText = (v) => String(v ?? '').replace(/[^\x20-\x7e]/g, (ch) => ({ '–': '-', '—': '-', '·': '-' }[ch] || '?')).replace(/([\\()])/g, '\\$1')

export function exportPdf({ title, meta = '', cols, rows, file }) {
  const W = 842, H = 595, M = 36, LH = 16
  const colW = (W - M * 2) / cols.length
  const fit = (v) => { const max = Math.floor(colW / 5.2); const t = String(v ?? ''); return t.length > max ? t.slice(0, max - 1) + '.' : t }
  const perPage = Math.floor((H - M * 2 - 60) / LH)
  const pages = []
  for (let i = 0; i < Math.max(1, rows.length); i += perPage) pages.push(rows.slice(i, i + perPage))
  const objs = []
  const add = (body) => { objs.push(body); return objs.length }
  const fontR = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
  const pagesId = objs.length + pages.length * 2 + 1
  const kids = []
  pages.forEach((chunk, pi) => {
    let y = H - M
    let c = `BT /F2 14 Tf ${M} ${y - 6} Td (${pdfText(title)}) Tj ET\n`
    c += `BT /F1 9 Tf ${M} ${y - 22} Td (${pdfText(meta + '  |  Halaman ' + (pi + 1) + '/' + pages.length)}) Tj ET\n`
    y -= 46
    cols.forEach((h, i) => { c += `BT /F2 9 Tf ${M + i * colW} ${y} Td (${pdfText(fit(h))}) Tj ET\n` })
    c += `${M} ${y - 5} m ${W - M} ${y - 5} l S\n`
    chunk.forEach((r) => { y -= LH; r.forEach((v, i) => { c += `BT /F1 9 Tf ${M + i * colW} ${y} Td (${pdfText(fit(v))}) Tj ET\n` }) })
    const content = add(`<< /Length ${c.length} >>\nstream\n${c}endstream`)
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${content} 0 R /Resources << /Font << /F1 ${fontR} 0 R /F2 ${fontB} 0 R >> >> >>`))
  })
  add(`<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`)
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  let out = '%PDF-1.4\n'; const offs = []
  objs.forEach((b, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${b}\nendobj\n` })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`
  save(new Blob([out], { type: 'application/pdf' }), file + '.pdf')
}

// Excel asli (.xlsx) dengan beberapa sheet, warna, dan sel gabungan — berlaku di artifact maupun website/app.
export function exportXlsx({ sheets, file }) { return save(buildXlsx(sheets), file + '.xlsx') }
