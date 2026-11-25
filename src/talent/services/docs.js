// Dokumen kontrak: template dengan penanda <<Nama Field>>, pengisian otomatis, PDF sederhana, dan zip.
// Semua murni di sisi klien supaya build tetap statis (website / Android / iOS).
import { save } from './export.js'
import { calcRow, rupiah } from './payroll.js'

export const DOC_TYPES = ['Offering Letter', 'PKWT (Potongan BPJS)', 'PKWT (Tanpa Potongan BPJS)', 'Amandemen PKWT', 'Kontrak Freelance', 'Kontrak Internship', 'Surat Keterangan Kerja']
// Hanya dua jenis ini yang ikut "Download data kontrak"
export const isDownloadable = (d) => d === 'Offering Letter' || d.startsWith('PKWT')

// Field yang terisi dari data karyawan/remunerasi
export const DATA_FIELDS = ['Nomor Surat', 'Nama', 'Tanggal Hari Ini', 'Take Home Pay', 'Gaji Pokok', 'Tunjangan Posisi', 'Durasi Kontrak', 'Posisi', 'Awal Kontrak', 'Akhir Kontrak']
// Field penanggung jawab: diisi sekali di Setup Dokumen
export const PJ_FIELDS = [['Nama Penanggung Jawab', 'nama'], ['Level Penanggung Jawab', 'level'], ['Role Penanggung Jawab', 'role'], ['Nomor Surat Kuasa Penanggung Jawab', 'nomorKuasa'], ['Tanggal Surat Kuasa Penanggung Jawab', 'tanggalKuasa']]
export const ALL_FIELDS = [...DATA_FIELDS, ...PJ_FIELDS.map((f) => f[0])]
export const token = (f) => `<<${f}>>`
// ---------- Template HTML (hasil editor Setup Dokumen) ----------
// Penanda disimpan sebagai <span class="tok" data-f="Nama">, tab sebagai <span class="tab">, tab stop di data-tabs pembungkus.
export const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const unesc = (v) => String(v).replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
export const isHtml = (t) => /<(p|div|span|br|ul|ol|li|b|i|u)[\s>/]/i.test(String(t || ''))
export const tokenHtml = (f) => `<span class="tok" data-f="${esc(f)}" contenteditable="false">${esc(f)}</span>`
export const TAB_HTML = '<span class="tab" contenteditable="false"></span>'
export const DEFAULT_TABS = [151, 340] // 4 cm dan 9 cm dari margin kiri
const isTitle = (l) => l.length > 3 && !/[\t\d<]/.test(l) && /^[A-Z][A-Z .,&-]+$/.test(l)
export function toHtml(text) {
  const t = String(text || '')
  if (isHtml(t)) return /class="kdoc"/.test(t) ? t : `<div class="kdoc" data-tabs="${DEFAULT_TABS.join(',')}">${t}</div>`
  const lines = t.split('\n')
  const body = lines.map((l, i) => {
    if (!l.trim()) return '<p><br></p>'
    const inner = esc(l).replace(/&lt;&lt;([^<>]+?)&gt;&gt;/g, (m, f) => tokenHtml(unesc(f))).replace(/\t/g, TAB_HTML)
    const center = isTitle(l.trim()) || (/^(No\.|Nomor)/.test(l) && i < 6)
    return center ? `<p style="text-align: center;"><b>${inner}</b></p>` : `<p>${inner}</p>`
  }).join('')
  return `<div class="kdoc" data-tabs="${DEFAULT_TABS.join(',')}">${body}</div>`
}
export const tabsOf = (html) => { const m = /data-tabs="([^"]*)"/.exec(String(html || '')); return m ? m[1].split(',').map(Number).filter((x) => x > 0) : DEFAULT_TABS }
export const tokensIn = (text) => { const t = String(text || ''); return [...new Set([...[...t.matchAll(/data-f="([^"]*)"/g)].map((m) => unesc(m[1])), ...[...t.matchAll(/<<([^<>]+)>>/g)].map((m) => m[1]), ...[...t.matchAll(/&lt;&lt;(.+?)&gt;&gt;/g)].map((m) => unesc(m[1]))])] }
export function htmlToText(html) {
  return unesc(String(html || '')
    .replace(/<span\b[^>]*class="tab"[^>]*>[\s\S]*?<\/span>/g, '\t')
    .replace(/<span\b[^>]*data-f="([^"]*)"[^>]*>[\s\S]*?<\/span>/g, (m, f) => `<<${unesc(f)}>>`.replace(/</g, '\u0001').replace(/>/g, '\u0002'))
    .replace(/<br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/\u0001/g, '<').replace(/\u0002/g, '>').replace(/​/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

const BL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
export const tglPanjang = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : `${d.getDate()} ${BL[d.getMonth()]} ${d.getFullYear()}` }
const CODE = { 'Offering Letter': 'OL', 'PKWT (Potongan BPJS)': 'PKWT', 'PKWT (Tanpa Potongan BPJS)': 'PKWT', 'Amandemen PKWT': 'AMD', 'Kontrak Freelance': 'FRL', 'Kontrak Internship': 'INT', 'Surat Keterangan Kerja': 'SKK' }
export const nomorSurat = (seq, docType, date = new Date()) => `${String(seq).padStart(3, '0')}/HC/${CODE[docType] || 'DOC'}/${ROMAN[date.getMonth()]}/${date.getFullYear()}`
const bulanAntara = (a, b) => { const x = new Date(a), y = new Date(b); if (isNaN(x) || isNaN(y)) return 12; return Math.max(1, Math.round((y - x) / (1000 * 60 * 60 * 24 * 30.44))) }

// Nilai tiap field untuk satu karyawan pada satu baris remunerasi
export function fieldValues({ e, row, pj, nomor, today, setup }) {
  const thp = Number(row?.thp ?? e.thp) || 0
  const c = calcRow({ ...(row || {}), emp: e.id, thp, skema: row?.skema || e.skema || 'Normal', additions: [], deductions: [] }, setup)
  const start = row?.start || e.start; const end = row?.end || e.end
  return {
    'Nomor Surat': nomor, Nama: e.name, 'Tanggal Hari Ini': tglPanjang(today), 'Take Home Pay': rupiah(thp), 'Gaji Pokok': rupiah(c.gp), 'Tunjangan Posisi': rupiah(c.tp),
    'Durasi Kontrak': bulanAntara(start, end) + ' bulan', Posisi: row?.role || e.role, 'Awal Kontrak': tglPanjang(start), 'Akhir Kontrak': tglPanjang(end),
    'Nama Penanggung Jawab': pj.nama, 'Level Penanggung Jawab': pj.level, 'Role Penanggung Jawab': pj.role, 'Nomor Surat Kuasa Penanggung Jawab': pj.nomorKuasa, 'Tanggal Surat Kuasa Penanggung Jawab': tglPanjang(pj.tanggalKuasa),
  }
}
// Mengisi penanda dengan data. Hasilnya selalu HTML; penanda yang datanya kosong dibiarkan tampil sebagai penanda.
export const fill = (text, values) => toHtml(text).replace(/<span\b[^>]*data-f="([^"]*)"[^>]*>[\s\S]*?<\/span>/g, (m, f) => { const v = values[unesc(f)]; return v != null && v !== '' ? `<span class="tokv">${esc(v)}</span>` : m })

// ---------- Template bawaan (bisa diganti lewat unggah di Setup Dokumen) ----------
const kop = 'PT KIRANA KARYA DIGITAL\n'
export const DEFAULT_TEMPLATES = {
  'Offering Letter': `${kop}SURAT PENAWARAN KERJA\nNo. <<Nomor Surat>>\n\nKepada Yth.\n<<Nama>>\n\nSehubungan dengan lamaran Saudara, dengan ini kami memberikan kesempatan kerja dengan kondisi sebagai berikut:\n\nPosisi\t: <<Posisi>>\nTake Home Pay\t: <<Take Home Pay>> per bulan\nDurasi\t: <<Durasi Kontrak>>\nMasa kerja\t: <<Awal Kontrak>> s.d. <<Akhir Kontrak>>\n\nSelain ketentuan di atas, Saudara wajib tunduk pada ketentuan perusahaan yang berlaku.\n\nJakarta, <<Tanggal Hari Ini>>\n\n\n<<Nama Penanggung Jawab>>\n<<Level Penanggung Jawab>> <<Role Penanggung Jawab>>\n\nMenyetujui,\n<<Nama>>`,
  'PKWT (Potongan BPJS)': `${kop}PERJANJIAN KERJA WAKTU TERTENTU\nNomor: <<Nomor Surat>>\n\nPada hari ini, <<Tanggal Hari Ini>>, yang bertanda tangan di bawah ini:\n\n1. <<Nama Penanggung Jawab>>, <<Level Penanggung Jawab>> <<Role Penanggung Jawab>>, bertindak berdasarkan Surat Kuasa Nomor <<Nomor Surat Kuasa Penanggung Jawab>> tanggal <<Tanggal Surat Kuasa Penanggung Jawab>>, selanjutnya disebut PIHAK PERTAMA.\n2. <<Nama>>, selanjutnya disebut PIHAK KEDUA.\n\nPasal 1 - Jabatan dan Jangka Waktu\nPIHAK KEDUA bekerja sebagai <<Posisi>> selama <<Durasi Kontrak>>, terhitung sejak <<Awal Kontrak>> sampai dengan <<Akhir Kontrak>>.\n\nPasal 2 - Upah\nTake Home Pay sebesar <<Take Home Pay>> per bulan, terdiri atas Gaji Pokok <<Gaji Pokok>> dan Tunjangan Posisi <<Tunjangan Posisi>>. Iuran BPJS bagian karyawan dipotong dari upah.\n\nPIHAK PERTAMA\t\tPIHAK KEDUA\n\n\n<<Nama Penanggung Jawab>>\t\t<<Nama>>`,
  'Amandemen PKWT': `${kop}AMANDEMEN PERJANJIAN KERJA WAKTU TERTENTU\nNomor: <<Nomor Surat>>\n\nPada hari ini, <<Tanggal Hari Ini>>, <<Nama Penanggung Jawab>> (<<Level Penanggung Jawab>> <<Role Penanggung Jawab>>), berdasarkan Surat Kuasa Nomor <<Nomor Surat Kuasa Penanggung Jawab>> tanggal <<Tanggal Surat Kuasa Penanggung Jawab>>, dan <<Nama>> sepakat mengubah perjanjian kerja sebagai berikut:\n\n1. Jabatan: <<Posisi>>\n2. Take Home Pay baru: <<Take Home Pay>> per bulan (Gaji Pokok <<Gaji Pokok>>, Tunjangan Posisi <<Tunjangan Posisi>>)\n3. Jangka waktu: <<Durasi Kontrak>>, <<Awal Kontrak>> s.d. <<Akhir Kontrak>>\n\nKetentuan lain dalam perjanjian sebelumnya tetap berlaku.\n\n<<Nama Penanggung Jawab>>\t\t<<Nama>>`,
  'Kontrak Freelance': `${kop}PERJANJIAN KERJA LEPAS\nNo. <<Nomor Surat>>\n\nKepada Yth. <<Nama>>\n\nKami menunjuk Saudara sebagai <<Posisi>> (pekerja lepas) dengan imbalan <<Take Home Pay>> per bulan selama <<Durasi Kontrak>>, <<Awal Kontrak>> s.d. <<Akhir Kontrak>>.\n\nJakarta, <<Tanggal Hari Ini>>\n\n<<Nama Penanggung Jawab>>\n<<Level Penanggung Jawab>> <<Role Penanggung Jawab>>`,
  'Kontrak Internship': `${kop}PERJANJIAN MAGANG\nNo. <<Nomor Surat>>\n\n<<Nama>> diterima sebagai peserta magang pada posisi <<Posisi>> selama <<Durasi Kontrak>>, <<Awal Kontrak>> s.d. <<Akhir Kontrak>>, dengan uang saku <<Take Home Pay>> per bulan.\n\nJakarta, <<Tanggal Hari Ini>>\n\n<<Nama Penanggung Jawab>>\n<<Level Penanggung Jawab>> <<Role Penanggung Jawab>>`,
  'Surat Keterangan Kerja': `${kop}SURAT KETERANGAN KERJA\nNo. <<Nomor Surat>>\n\nYang bertanda tangan di bawah ini, <<Nama Penanggung Jawab>>, <<Level Penanggung Jawab>> <<Role Penanggung Jawab>>, menerangkan bahwa <<Nama>> benar bekerja sebagai <<Posisi>> sejak <<Awal Kontrak>> sampai dengan <<Akhir Kontrak>>.\n\nJakarta, <<Tanggal Hari Ini>>\n\n<<Nama Penanggung Jawab>>`,
}
DEFAULT_TEMPLATES['PKWT (Tanpa Potongan BPJS)'] = DEFAULT_TEMPLATES['PKWT (Potongan BPJS)'].replace('Iuran BPJS bagian karyawan dipotong dari upah.', 'Iuran BPJS bagian karyawan ditanggung perusahaan.')

// ---------- PDF teks sederhana (A4) ----------
const pdfSafe = (v) => String(v ?? '').replace(/[^\x20-\x7e]/g, (ch) => ({ '–': '-', '—': '-', '·': '-', '“': '"', '”': '"', '’': "'" }[ch] || '?')).replace(/([\\()])/g, '\\$1')
const wrap = (line, max = 92) => { const out = []; let cur = ''; for (const w of line.split(' ')) { if ((cur + ' ' + w).trim().length > max) { out.push(cur); cur = w } else cur = (cur + ' ' + w).trim() } out.push(cur); return out }
export function textPdf(text) {
  text = (isHtml(text) ? htmlToText(text) : String(text)).replace(/\t/g, '    ')
  const W = 595, H = 842, M = 56, LH = 15
  const lines = String(text).split('\n').flatMap((l) => (l.length ? wrap(l) : ['']))
  const per = Math.floor((H - M * 2) / LH); const pages = []
  for (let i = 0; i < Math.max(1, lines.length); i += per) pages.push(lines.slice(i, i + per))
  const objs = []; const add = (b) => { objs.push(b); return objs.length }
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); const pagesId = objs.length + pages.length * 2 + 1; const kids = []
  pages.forEach((chunk) => {
    let c = ''; chunk.forEach((l, i) => { c += `BT /F1 10.5 Tf ${M} ${H - M - i * LH} Td (${pdfSafe(l)}) Tj ET\n` })
    const content = add(`<< /Length ${c.length} >>\nstream\n${c}endstream`)
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${content} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>`))
  })
  add(`<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`)
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  let out = '%PDF-1.4\n'; const offs = []
  objs.forEach((b, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${b}\nendobj\n` })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(out)
}

// ---------- ZIP tanpa kompresi (cukup untuk membungkus folder per karyawan) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
export function makeZip(files) { // files: [{ path: 'Folder/Nama.pdf', data: Uint8Array }]
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0
  const u16 = (n) => [n & 255, (n >> 8) & 255]; const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]
  files.forEach((f) => {
    const name = enc.encode(f.path); const crc = crc32(f.data); const size = f.data.length
    const local = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)])
    parts.push(local, name, f.data)
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name)
    offset += local.length + name.length + size
  })
  const cdSize = central.reduce((a, b) => a + b.length, 0)
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)])
  return new Blob([...parts, ...central, end], { type: 'application/zip' })
}
const safeName = (v) => String(v).replace(/[\\/:*?"<>|]/g, '-').trim()
// Zip per folder karyawan, hanya dokumen Full Signed (Offering Letter & PKWT)
export function downloadContracts(entries, fileName) { // entries: [{ folder, nama, dokumen, text }]
  const files = entries.map((x) => ({ path: `${safeName(x.folder)}/${safeName(x.nama)}/${safeName(x.dokumen)} - Full Signed.pdf`, data: textPdf(x.text) }))
  return save(makeZip(files), safeName(fileName) + '.zip')
}

// ---------- Baca teks dari file template yang diunggah (.txt atau .docx) ----------
async function inflateRaw(u8) {
  const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(u8); w.close()
  return new Uint8Array(await new Response(ds.readable).arrayBuffer())
}
async function docxText(buf) {
  const u8 = new Uint8Array(buf); const dv = new DataView(buf); let i = u8.length - 22
  while (i >= 0 && dv.getUint32(i, true) !== 0x06054b50) i--
  if (i < 0) throw new Error('bukan docx')
  let p = dv.getUint32(i + 16, true); const n = dv.getUint16(i + 10, true); const dec = new TextDecoder()
  for (let k = 0; k < n; k++) {
    const method = dv.getUint16(p + 10, true); const csize = dv.getUint32(p + 20, true); const nl = dv.getUint16(p + 28, true); const el = dv.getUint16(p + 30, true); const cl = dv.getUint16(p + 32, true); const lo = dv.getUint32(p + 42, true)
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl))
    if (name === 'word/document.xml') {
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true); const raw = u8.subarray(start, start + csize)
      const xml = dec.decode(method === 8 ? await inflateRaw(raw) : raw)
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, '\n\n').trim()
    }
    p += 46 + nl + el + cl
  }
  throw new Error('isi dokumen tidak ditemukan')
}
export async function readTemplateFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'txt') return await file.text()
  if (ext === 'docx') return await docxText(await file.arrayBuffer())
  throw new Error('format belum bisa dibaca')
}
