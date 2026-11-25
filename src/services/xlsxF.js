// Penulis .xlsx minimal tanpa library: inline string, angka, tanggal, dan RUMUS Excel (dihitung ulang saat dibuka).
import { makeZip } from './docs.js'

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const colName = (i) => { let s = ''; i += 1; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26) } return s }
export const excelDate = (iso) => { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5 }

// gaya sel: 0 biasa, 1 header, 2 angka, 3 persen, 4 tanggal, 5 total angka, 6 total teks, 7 judul, 8 teks pudar, 9 angka input (kuning)
export const ST = { text: 0, head: 1, num: 2, pct: 3, date: 4, totNum: 5, totText: 6, title: 7, muted: 8, input: 9 }
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="0.00%"/><numFmt numFmtId="166" formatCode="dd mmm yyyy"/></numFmts>
<fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="13"/><color rgb="FF0A5950"/><name val="Arial"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A5950"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF5FC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF4CC"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFD8DBD0"/></left><right style="thin"><color rgb="FFD8DBD0"/></right><top style="thin"><color rgb="FFD8DBD0"/></top><bottom style="thin"><color rgb="FFD8DBD0"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
<xf numFmtId="164" fontId="0" fillId="4" borderId="1" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
</cellXfs></styleSheet>`

// cell: null | number | string | { v, f, s }   (f = rumus tanpa '=')
function cellXml(c, ref) {
  if (c == null || c === '') return ''
  const o = typeof c === 'object' ? c : { v: c }
  const s = o.s != null ? ` s="${o.s}"` : (typeof o.v === 'number' ? ` s="${ST.num}"` : '')
  if (o.f) return `<c r="${ref}"${s}><f>${esc(o.f)}</f></c>`
  if (typeof o.v === 'number' && isFinite(o.v)) return `<c r="${ref}"${s}><v>${o.v}</v></c>`
  if (o.v == null || o.v === '') return o.s != null ? `<c r="${ref}"${s}/>` : ''
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(o.v)}</t></is></c>`
}
function sheetXml(sh) {
  const cols = (sh.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}"${sh.headRow === ri + 1 ? ' ht="42" customHeight="1"' : ''}>${r.map((c, ci) => cellXml(c, colName(ci) + (ri + 1))).join('')}</row>`).join('')
  const pane = sh.freeze ? `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${sh.freeze[0]}" ySplit="${sh.freeze[1]}" topLeftCell="${colName(sh.freeze[0])}${sh.freeze[1] + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${rows}</sheetData></worksheet>`
}

export function buildXlsx(sheets) {
  const enc = new TextEncoder(); const f = (path, text) => ({ path, data: enc.encode(text) })
  const ns = 'http://schemas.openxmlformats.org/'
  return makeZip([
    f('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
    f('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    f('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}spreadsheetml/2006/main" xmlns:r="${ns}officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`),
    f('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${ns}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${ns}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    f('xl/styles.xml', STYLES),
    ...sheets.map((s, i) => f(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s))),
  ])
}
