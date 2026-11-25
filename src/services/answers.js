// Jawaban pre-test contoh untuk prototipe (deterministik per kandidat). Di produksi diambil dari Firestore + Storage.
export const PREVIEWABLE = ['video', 'pdf', 'image'] // bisa dibuka di tab baru oleh browser
const EXT = { video: 'MP4', pdf: 'PDF', xlsx: 'XLSX', rar: 'RAR', zip: 'ZIP', docx: 'DOCX', link: 'LINK', image: 'JPG' }
export const extOf = (f) => EXT[f.tipe] || f.tipe.toUpperCase()

// Rangkaian yang dikerjakan kandidat: mengikuti spesialisasinya, selain itu rangkaian aktif
export function modulesFor(s, p) {
  const by = (id) => s.pretestSets.find((x) => x.id === id)
  const set = /backend|developer|engineer/i.test(p.spesialisasi) ? by('pt3') : /admin/i.test(p.spesialisasi) ? by('pt2') : s.pretestSets.find((x) => x.aktif) || by('pt1')
  return set ? set.modul : []
}
const seedOf = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7)
const slug = (n) => n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')
const tgl = (p, i) => `2026-11-${String(10 + ((seedOf(p.id) + i) % 6)).padStart(2, '0')}`

export function answersFor(p, m) {
  const r = seedOf(p.id + m.id)
  if (m.tipe === 'Live Recording') return m.soal.map((q, i) => ({ q: q.q, files: [{ tipe: 'video', nama: `Pertanyaan ${i + 1}_${p.name}.mp4`, ukuran: `${12 + ((r + i * 7) % 20)} MB`, durasi: `0${1 + ((r + i) % 3)}:${String((r * (i + 3)) % 60).padStart(2, '0')}`, tanggal: tgl(p, i) }] }))
  if (m.tipe === 'Upload Dokumen') {
    const coding = /coding/i.test(m.judul)
    return m.soal.map((q, i) => ({ q: q.q, files: coding
      ? [{ tipe: 'link', nama: `github.com/${slug(p.name)}/latihan-kirana`, url: `https://github.com/${slug(p.name)}/latihan-kirana`, tanggal: tgl(p, i) }, { tipe: 'rar', nama: `Source code_${p.name}.rar`, ukuran: '4,2 MB', tanggal: tgl(p, i) }]
      : [{ tipe: 'xlsx', nama: `${m.judul}_${p.name}.xlsx`, ukuran: '86 KB', tanggal: tgl(p, i) }, { tipe: 'pdf', nama: `Penjelasan rumus_${p.name}.pdf`, ukuran: '210 KB', tanggal: tgl(p, i) }] }))
  }
  if (m.tipe === 'Pilihan Ganda') return m.soal.map((q, i) => ({ q: q.q, opsi: q.opsi, benar: q.benar, jawab: (r + i * 3) % 4 === 0 ? (q.benar + 1) % q.opsi.length : q.benar }))
  // Essay
  return m.soal.map((q) => ({ q: q.q, teks: `Saat menangani migrasi data pelanggan, kami menemukan duplikasi sekitar 12% data karena format nomor telepon berbeda-beda. Saya memetakan pola duplikasi, membuat aturan normalisasi bersama tim, lalu menjalankan pembersihan bertahap per wilayah dengan pengecekan sampel di setiap tahap.\n\nHasilnya duplikasi turun di bawah 1% dan proses penagihan tidak terganggu. Pelajaran terbesar: libatkan pengguna data sejak awal, dan selalu siapkan rencana kembali (rollback) sebelum menjalankan perubahan besar.` }))
}

export const pgSummary = (ans) => { const benar = ans.filter((a) => a.jawab === a.benar).length; return { benar, salah: ans.length - benar, total: ans.length, nilai: Math.round((benar / Math.max(1, ans.length)) * 100) } }
