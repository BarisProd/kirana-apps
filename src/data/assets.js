// Audit aset inventaris: register aset (barang masuk / pembelian), pergerakan (serah, kembali, rusak, servis, hilang).
// Setiap barang yang diserahkan ke karyawan (s.inventories) terhubung ke satu aset lewat field `asset`.

const PRICE = [[/MacBook Pro/, 32000000], [/MacBook Air/, 18500000], [/iPad Air/, 11500000], [/iPad/, 7500000], [/Monitor 27/, 8500000], [/Monitor 24/, 2600000], [/Headset/, 2400000],
  [/ThinkPad T14/, 21000000], [/ThinkPad/, 14500000], [/Laptop/, 11500000], [/Kartu akses/, 75000], [/Kartu parkir/, 50000], [/e-toll/, 50000], [/Mobil/, 245000000], [/Motor operasional/, 21500000],
  [/Handy talky/, 2800000], [/Scanner/, 4500000], [/Kursi/, 2100000], [/Meja/, 1800000], [/Printer/, 4800000], [/Proyektor/, 7200000], [/Helm/, 350000], [/Rompi/, 150000], [/Sepatu/, 650000],
  [/APAR/, 1250000], [/Tool kit/, 1900000], [/Router/, 3200000], [/Kamera/, 9800000]]
export const hargaOf = (item) => (PRICE.find(([rx]) => rx.test(item)) || [0, 1000000])[1]
const VENDOR = { 'Alat Kerja': 'PT Datascrip (Bhinneka)', Transportasi: 'Dealer Resmi Astra', 'Tunjangan Kantor': 'Pengelola Gedung', 'Elektronik Kantor': 'Erafone Business', Furnitur: 'Informa Business', 'Perlengkapan K3': 'Toko Safety Jaya' }
const p2 = (n) => String(n).padStart(2, '0')
const minusDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }

export const ASSET_ST = ['Tersedia', 'Dipakai', 'Dalam servis', 'Rusak', 'Hilang']
export const KONDISI = ['Baik', 'Rusak ringan', 'Rusak sedang', 'Rusak berat']
// Status tampil: hilang/rusak tak terpakai/servis menimpa; selain itu Dipakai bila masih dipegang karyawan
export const holderOf = (s, a) => s.inventories.find((i) => i.asset === a.id && i.status !== 'Returned')
export const statusOf = (s, a) => (['Hilang', 'Rusak', 'Dalam servis'].includes(a.status) ? a.status : holderOf(s, a) ? 'Dipakai' : 'Tersedia')

export function seedAssets(s) {
  let n = 0, ev = 0
  const assets = [], events = []
  const E = (o) => events.push({ id: 'ae' + ++ev, oleh: 'Rani Hapsari', ...o })
  const A = (o) => { const k = ++n; const a = { id: 'as' + k, kode: 'AST-' + String(k).padStart(4, '0'), kondisi: 'Baik', status: 'Tersedia', vendor: VENDOR[o.kategori] || 'Vendor umum', ...o }; assets.push(a); E({ asset: a.id, tgl: a.tglBeli, jenis: 'Masuk', nilai: a.harga, ket: `Pembelian dari ${a.vendor}` }); return a }
  const br = (emp) => s.employees.find((e) => e.id === emp)?.branch || 'b1'
  // 1) Aset dari barang yang sudah diserahkan ke karyawan
  s.inventories.slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal)).forEach((inv, i) => {
    const a = A({ nama: inv.item, kategori: inv.kategori, branch: br(inv.emp), harga: hargaOf(inv.item), tglBeli: minusDays(inv.tanggal, 3 + (i % 9)) })
    inv.asset = a.id
    E({ asset: a.id, tgl: inv.tanggal, jenis: 'Serah', emp: inv.emp, ket: `${inv.nomor} · ${inv.kebutuhan || 'diserahkan ke karyawan'}` })
    if (inv.status === 'Returned') { E({ asset: a.id, tgl: inv.tanggalKembali, jenis: 'Kembali', emp: inv.emp, ket: `Kondisi ${inv.kondisi?.toLowerCase()}${inv.catatanKembali ? ' · ' + inv.catatanKembali : ''}` }); if (inv.kondisi && inv.kondisi !== 'Baik') a.kondisi = inv.kondisi }
  })
  const byName = (rx) => assets.find((a) => rx.test(a.nama))
  // 2) Stok aset yang belum diserahkan
  const stock = [
    ['Printer Epson L6270', 'Elektronik Kantor', 'b1', '2025-02-10'], ['Proyektor Epson EB-X51', 'Elektronik Kantor', 'b1', '2025-02-10'], ['Router Mikrotik RB4011', 'Elektronik Kantor', 'b2', '2025-03-05'],
    ['Kamera Sony ZV-E10 (konten)', 'Elektronik Kantor', 'b2', '2026-02-16'], ['Printer Epson L3250', 'Elektronik Kantor', 'b3', '2025-04-14'],
    ['Kursi ergonomis #K-01', 'Furnitur', 'b1', '2025-01-08'], ['Kursi ergonomis #K-02', 'Furnitur', 'b1', '2025-01-08'], ['Kursi ergonomis #K-03', 'Furnitur', 'b2', '2025-03-05'], ['Meja kerja lipat #M-01', 'Furnitur', 'b2', '2025-03-05'], ['Meja kerja lipat #M-02', 'Furnitur', 'b3', '2026-01-19'],
    ['Helm safety #H-01', 'Perlengkapan K3', 'b3', '2025-03-03'], ['Helm safety #H-02', 'Perlengkapan K3', 'b3', '2025-03-03'], ['Helm safety #H-03', 'Perlengkapan K3', 'b3', '2025-03-03'], ['Rompi reflektif #R-01', 'Perlengkapan K3', 'b3', '2025-03-03'],
    ['Sepatu safety #S-01', 'Perlengkapan K3', 'b3', '2026-05-04'], ['APAR 3 kg #F-01', 'Perlengkapan K3', 'b3', '2025-03-03'], ['APAR 3 kg #F-02', 'Perlengkapan K3', 'b1', '2025-01-08'],
    ['iPad 9 cadangan · SN DMPX11', 'Alat Kerja', 'b1', '2025-06-02'], ['Laptop 14" Lenovo cadangan · SN PF9Q01', 'Alat Kerja', 'b2', '2026-03-09'], ['Scanner barcode Zebra #2', 'Alat Kerja', 'b3', '2025-03-03'],
    ['Laptop 14" ASUS (pengadaan Q4) · SN M9T501', 'Alat Kerja', 'b1', '2026-11-03'], ['Monitor 24" Dell (pengadaan Q4)', 'Alat Kerja', 'b1', '2026-11-03'], ['Kursi ergonomis #K-04', 'Furnitur', 'b1', '2026-11-03'],
  ].map(([nama, kategori, branch, tglBeli]) => A({ nama, kategori, branch, harga: hargaOf(nama), tglBeli }))
  // 3) Rusak, servis, hilang
  const lenovo = byName(/Lenovo · SN PF3K22/); if (lenovo) {
    E({ asset: lenovo.id, tgl: '2026-09-02', jenis: 'Rusak', tingkat: 'Rusak ringan', bisaDipakai: true, pj: 'e2', ket: 'Engsel layar longgar saat dikembalikan' })
    E({ asset: lenovo.id, tgl: '2026-09-04', jenis: 'Servis', vendor: 'Lenovo Service Center Jakarta', biaya: 650000, ket: 'Ganti engsel layar' })
    E({ asset: lenovo.id, tgl: '2026-09-10', jenis: 'Selesai servis', ket: 'Kembali normal, masuk stok' }); lenovo.kondisi = 'Baik'
  }
  const proj = byName(/Proyektor/); E({ asset: proj.id, tgl: '2026-06-18', jenis: 'Rusak', tingkat: 'Rusak berat', bisaDipakai: false, pj: 'e15', ket: 'Lampu putus dan mainboard terbakar setelah listrik padam' })
  E({ asset: proj.id, tgl: '2026-06-22', jenis: 'Servis', vendor: 'Epson Service Center', biaya: 250000, ket: 'Pemeriksaan: perbaikan Rp 4,5 jt, tidak ekonomis' }); proj.kondisi = 'Rusak berat'; proj.status = 'Rusak'
  const mobil = byName(/Mobil operasional/); if (mobil) [['2026-01-15', 1650000, 'Servis berkala 40.000 km'], ['2026-04-14', 1850000, 'Servis berkala 50.000 km + ganti oli'], ['2026-07-13', 3250000, 'Ganti ban depan & kampas rem'], ['2026-10-12', 2400000, 'Servis berkala 70.000 km']].forEach(([tgl, biaya, ket]) => { E({ asset: mobil.id, tgl, jenis: 'Servis', vendor: 'Auto2000 Surabaya', biaya, ket }); E({ asset: mobil.id, tgl, jenis: 'Selesai servis', ket: 'Selesai hari yang sama' }) })
  ;[/Motor operasional$/, /Motor operasional B 4421/].forEach((rx, i) => { const m = byName(rx); if (m) { E({ asset: m.id, tgl: ['2026-07-20', '2026-05-18'][i], jenis: 'Servis', vendor: 'AHASS resmi', biaya: [650000, 480000][i], ket: 'Servis rutin + ganti oli' }); E({ asset: m.id, tgl: ['2026-07-20', '2026-05-18'][i], jenis: 'Selesai servis', ket: 'Selesai' }) } })
  const printer = byName(/Printer Epson L6270/); E({ asset: printer.id, tgl: '2026-08-11', jenis: 'Servis', vendor: 'Epson Service Center', biaya: 350000, ket: 'Head cleaning & ganti roller' }); E({ asset: printer.id, tgl: '2026-08-13', jenis: 'Selesai servis', ket: 'Normal' })
  const mon = byName(/Monitor 24" Samsung/); if (mon) { E({ asset: mon.id, tgl: '2026-09-21', jenis: 'Rusak', tingkat: 'Rusak ringan', bisaDipakai: true, pj: 'e6', ket: 'Dead pixel di pojok kanan, masih bisa dipakai' }); mon.kondisi = 'Rusak ringan' }
  const ht = byName(/Handy talky/); if (ht) { E({ asset: ht.id, tgl: '2026-10-03', jenis: 'Rusak', tingkat: 'Rusak sedang', bisaDipakai: true, pj: 'e10', ket: 'Antena patah, jangkauan berkurang' }); E({ asset: ht.id, tgl: '2026-11-12', jenis: 'Servis', vendor: 'Motorola Solutions Surabaya', biaya: 450000, ket: 'Ganti antena & cek baterai (masih proses)' }); ht.kondisi = 'Rusak sedang'; ht.status = 'Dalam servis' }
  const kursi = byName(/Kursi ergonomis #K-02/); E({ asset: kursi.id, tgl: '2026-03-23', jenis: 'Rusak', tingkat: 'Rusak sedang', bisaDipakai: false, pj: 'e15', ket: 'Hidrolik bocor, kursi turun sendiri' }); E({ asset: kursi.id, tgl: '2026-03-25', jenis: 'Servis', vendor: 'Informa Service', biaya: 375000, ket: 'Ganti hidrolik (garansi tidak berlaku)' }); E({ asset: kursi.id, tgl: '2026-03-30', jenis: 'Selesai servis', ket: 'Normal kembali' })
  const apar = byName(/APAR 3 kg #F-01/); E({ asset: apar.id, tgl: '2026-03-02', jenis: 'Servis', vendor: 'Toko Safety Jaya', biaya: 180000, ket: 'Isi ulang & cek tekanan tahunan' }); E({ asset: apar.id, tgl: '2026-03-02', jenis: 'Selesai servis', ket: 'Selesai' })
  const helm = byName(/Helm safety #H-03/); E({ asset: helm.id, tgl: '2026-05-12', jenis: 'Hilang', pj: 'e13', ket: 'Tertinggal di lokasi bongkar muat pelabuhan, tidak ditemukan', gantiRugi: 0 }); helm.status = 'Hilang'
  const ipad = byName(/iPad 9 cadangan/); E({ asset: ipad.id, tgl: '2026-08-20', jenis: 'Hilang', pj: 'e15', ket: 'Dipinjam untuk presentasi tanpa tercatat, tidak kembali ke ruang GA', gantiRugi: 0 }); ipad.status = 'Hilang'
  const sc2 = byName(/Scanner barcode Zebra #2/); E({ asset: sc2.id, tgl: '2026-10-28', jenis: 'Hilang', pj: 'e10', ket: 'Hilang saat stock opname malam, diduga terbawa truk ekspedisi', gantiRugi: 1500000 }); sc2.status = 'Hilang'
  const kp = byName(/Kartu parkir Bandung #P-77/); if (kp) { E({ asset: kp.id, tgl: '2026-10-14', jenis: 'Hilang', pj: 'e6', ket: 'Dompet karyawan hilang, kartu diblokir', gantiRugi: 50000 }); kp.status = 'Hilang'; const inv = s.inventories.find((i) => i.asset === kp.id); if (inv) Object.assign(inv, { status: 'Returned', tanggalKembali: '2026-10-14', kondisi: 'Hilang', catatanKembali: 'Dilaporkan hilang, biaya ganti Rp 50.000 dibebankan karyawan' }) }
  // Pengadaan Q4 sudah diserahkan sebagian ke karyawan baru
  s.assets = assets; s.assetEvents = events.sort((a, b) => b.tgl.localeCompare(a.tgl) || b.id.localeCompare(a.id))
  void stock
}
