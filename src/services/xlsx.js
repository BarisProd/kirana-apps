// Penulis file .xlsx minimal (tanpa library): beberapa sheet, sel gabungan, warna, format angka/persen/tanggal.
// sheet = { name, rows: [[cell]], merges: ['A1:C1'], widths: [n], freeze: rowCount }
// cell  = null | angka | teks | { v, fill:'RRGGBB', bold, color:'RRGGBB', fmt:'num'|'pct'|'date'|'int', align:'center'|'right', wrap, size, border }

const enc = new TextEncoder()
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const colName = (i) => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26) } return s }

// ---- ZIP (stored, tanpa kompresi) ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function zip(files) {
  const parts = [], central = []; let off = 0
  for (const [name, text] of files) {
    const data = enc.encode(text), nm = enc.encode(name), crc = crc32(data)
    const h = new DataView(new ArrayBuffer(30))
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true)
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true)
    parts.push(new Uint8Array(h.buffer), nm, data)
    const c = new DataView(new ArrayBuffer(46))
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(14, 0x21, true)
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true)
    central.push(new Uint8Array(c.buffer), nm)
    off += 30 + nm.length + data.length
  }
  const csize = central.reduce((a, b) => a + b.length, 0)
  const e = new DataView(new ArrayBuffer(22))
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true)
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// ---- Gaya sel ----
const FMT = { num: 3, int: 1, pct: 164, date: 165 }
function styles() {
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], fonts = [], xfs = []
  const fi = new Map(), fo = new Map(), xi = new Map()
  const font = (bold, color, size) => { const k = `${bold}|${color}|${size}`; if (!fo.has(k)) { fo.set(k, fonts.length); fonts.push(`<font>${bold ? '<b/>' : ''}<sz val="${size || 10}"/><color rgb="FF${color || '0B1F1C'}"/><name val="Nunito"/></font>`) } return fo.get(k) }
  const fill = (c) => { if (!c) return 0; if (!fi.has(c)) { fi.set(c, fills.length); fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`) } return fi.get(c) }
  font(false)
  xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>')
  const get = (c) => {
    if (!c || typeof c !== 'object') return 0
    const k = [c.fill, c.bold, c.color, c.fmt, c.align, c.wrap, c.size, c.border].join('|')
    if (!xi.has(k)) {
      const f = font(c.bold, c.color, c.size), fl = fill(c.fill), nf = FMT[c.fmt] || 0
      const al = c.align || c.wrap ? `<alignment${c.align ? ` horizontal="${c.align}"` : ''} vertical="center"${c.wrap ? ' wrapText="1"' : ''}/>` : ''
      xi.set(k, xfs.length)
      xfs.push(`<xf numFmtId="${nf}" fontId="${f}" fillId="${fl}" borderId="${c.border ? 1 : 0}" xfId="0"${nf ? ' applyNumberFormat="1"' : ''} applyFont="1"${fl ? ' applyFill="1"' : ''}${c.border ? ' applyBorder="1"' : ''}${al ? ' applyAlignment="1"' : ''}>${al}</xf>`)
    }
    return xi.get(k)
  }
  const xml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="0.00%"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  return { get, xml }
}

const dateSerial = (d) => { const t = new Date(d); return isNaN(t) ? null : Math.round((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Date.UTC(1899, 11, 30)) / 86400000) }

function sheetXml(sh, st) {
  const rows = sh.rows.map((row, ri) => {
    const cells = (row || []).map((c, ci) => {
      if (c == null || c === '' || (typeof c === 'object' && (c.v == null || c.v === '') && !c.fill)) return ''
      const o = typeof c === 'object' ? c : { v: c }
      const ref = colName(ci) + (ri + 1), s = st.get(o), sa = s ? ` s="${s}"` : ''
      let v = o.v
      if (o.fmt === 'date' && v) { const n = dateSerial(v); if (n != null) return `<c r="${ref}"${sa}><v>${n}</v></c>` }
      if (v == null || v === '') return `<c r="${ref}"${sa}/>`
      if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${sa}><v>${Math.round(v * 1e6) / 1e6}</v></c>`
      return `<c r="${ref}"${sa} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
    }).join('')
    const ht = sh.heights?.[ri] ? ` ht="${sh.heights[ri]}" customHeight="1"` : ''
    return `<row r="${ri + 1}"${ht}>${cells}</row>`
  }).join('')
  const cols = sh.widths ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
  const pane = sh.freeze ? `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${sh.freezeCols || 0}" ySplit="${sh.freeze}" topLeftCell="${colName(sh.freezeCols || 0)}${sh.freeze + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>` : ''
  const merges = sh.merges?.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${rows}</sheetData>${merges}</worksheet>`
}

export function buildXlsx(sheets) {
  const st = styles()
  const safe = sheets.map((s, i) => ({ ...s, name: (s.name || 'Sheet' + (i + 1)).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) }))
  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${safe.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${safe.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${safe.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${safe.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
  ]
  const sheetFiles = safe.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s, st)])
  return zip([...files, ['xl/styles.xml', st.xml()], ...sheetFiles])
}
