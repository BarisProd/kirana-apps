// Layanan pihak ketiga yang dipakai platform Kirana (role Root). Contoh: Mailtrap & Google Maps Platform.
// Tarif mengikuti halaman harga publik vendor (dicek Nov 2026); angka pemakaian & tagihan = data dummy.
export const KURS = 16650 // Rp per USD, kurs perkiraan untuk konversi tampilan
export const BULAN6 = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
export const TROUBLE_TK = ['Tinggi', 'Sedang', 'Rendah']

// Biaya per bulan (USD) — Mailtrap flat; Google Maps dihitung dari pemakaian di atas free cap per SKU.
export const costOf = (v, bln) => {
  if (v.model !== 'Pay-as-you-go') { const inv = v.invoices.find((i) => i.periode === bln); return inv ? inv.usd : v.biayaUsd }
  return +v.skus.reduce((a, k) => a + Math.max(0, (k.pakai[bln] || 0) - k.cap) * k.tarif / 1000, 0).toFixed(2)
}

const mt = {
  id: 'v-mailtrap', nama: 'Mailtrap', produk: 'Email API/SMTP', kategori: 'E-mail transaksional', warna: '#22a06b',
  status: 'Aktif', paket: 'Basic', model: 'Langganan bulanan', biayaUsd: 15,
  mulai: '2025-02-15', periodeMulai: '2026-11-15', berakhir: '2026-12-14', autoRenew: true,
  kuota: { label: 'e-mail / bulan', max: 10000, harian: null },
  dipakai: ['Kirim payslip', 'Blast notifikasi (e-mail)', 'Undangan & reset password', 'Notifikasi approval', 'Laporan terjadwal Root'],
  akun: 'ops@kirana.id', pic: 'Reza Mahendra (DevOps)', domain: 'mail.kirana.id (SPF, DKIM, DMARC terverifikasi)',
  kontak: 'Tiket support dari dashboard Mailtrap · status: status.mailtrap.io',
  bayar: { metode: 'Kartu kredit', detail: 'Visa korporat •••• 4821', exp: '2027-08', siklus: 'Otomatis tiap tanggal 15', mataUang: 'USD' },
  invoices: [
    ['2026-06', 'MT-2606-0193', '2026-06-15'], ['2026-07', 'MT-2607-0201', '2026-07-15'], ['2026-08', 'MT-2608-0188', '2026-08-15'],
    ['2026-09', 'MT-2609-0214', '2026-09-15'], ['2026-10', 'MT-2610-0207', '2026-10-15'], ['2026-11', 'MT-2611-0219', '2026-11-15'],
  ].map(([periode, no, tgl]) => ({ periode, no, tgl, usd: 15, status: 'Lunas' })),
  pakai: { '2026-06': 6240, '2026-07': 7080, '2026-08': 6810, '2026-09': 7930, '2026-10': 8420, '2026-11': 9130 },
  perCustomer: [['c1', 2240], ['c2', 1860], ['c3', 780], ['c4', 1650], ['c5', 2600]],
  troubles: [
    { id: 'tr-m1', mulai: '2026-08-01T07:27', selesai: '2026-08-01T09:04', judul: 'Downtime Sending API & SMTP (vendor)', sumber: 'Status page vendor', tingkat: 'Tinggi', status: 'Selesai', dampak: 'Payslip Juli 3 customer tertunda ±1,5 jam', tindakan: 'Antrean retry mengirim ulang otomatis setelah layanan pulih; tidak ada e-mail hilang.' },
    { id: 'tr-m2', mulai: '2026-10-27T10:15', selesai: '2026-10-28T16:00', judul: 'Bounce rate naik ke 4,8%', sumber: 'Internal', tingkat: 'Sedang', status: 'Selesai', dampak: 'E-mail undangan ke domain perusahaan c2 ditolak', tindakan: 'Bersihkan alamat tidak valid, minta IT c2 whitelist mail.kirana.id.' },
    { id: 'tr-m3', mulai: '2026-11-18T09:00', selesai: '', judul: 'Pemakaian 91% kuota bulanan', sumber: 'Internal', tingkat: 'Sedang', status: 'Investigasi', dampak: 'Risiko e-mail payslip akhir bulan tertahan bila kuota habis', tindakan: 'Bandingkan biaya naik paket vs batasi blast e-mail saja.' },
  ],
  maint: [
    { id: 'mn-m1', mulai: '2026-10-10T22:00', selesai: '2026-10-10T23:30', judul: 'Migrasi pengiriman SMTP → Email API', jenis: 'Internal', dampak: 'Tidak ada (antrean ditahan 90 menit)', status: 'Selesai' },
    { id: 'mn-m2', mulai: '2026-11-28T23:00', selesai: '2026-11-29T00:30', judul: 'Rotasi API token & kunci DKIM', jenis: 'Internal', dampak: 'Pengiriman e-mail jeda ±30 menit', status: 'Terjadwal' },
    { id: 'mn-m3', mulai: '2026-12-05T21:00', selesai: '2026-12-05T22:00', judul: 'Evaluasi & naik paket sebelum payroll Desember', jenis: 'Internal', dampak: 'Tidak ada', status: 'Terjadwal' },
  ],
  notes: [
    { at: '2026-11-18T09:20', oleh: 'Reza Mahendra', isi: 'Pemakaian November sudah 9.130 dari 10.000. Penyumbang terbesar: payslip & blast e-mail Medika Sehat.' },
    { at: '2026-10-28T16:10', oleh: 'Nadia Putri', isi: 'Kasus bounce c2 selesai. Tambahkan cek format e-mail di form Data Karyawan.' },
    { at: '2026-08-01T09:30', oleh: 'Putri Amalia', isi: 'Downtime vendor 1 Agustus tercatat di status page. Tidak perlu klaim kredit; tidak ada data hilang.' },
  ],
}

const gm = {
  id: 'v-gmaps', nama: 'Google Maps Platform', produk: 'Maps JavaScript, Geocoding, Geolocation, Places', kategori: 'Peta & lokasi', warna: '#2a78d6',
  status: 'Aktif', paket: 'Pay-as-you-go (Essentials)', model: 'Pay-as-you-go', biayaUsd: null,
  mulai: '2025-01-10', periodeMulai: '2026-11-01', berakhir: '2026-11-30', autoRenew: true,
  kuota: null,
  dipakai: ['Peta clock in/out & geofence absensi', 'Titik lokasi Branch', 'Autocomplete alamat karyawan', 'Lokasi kerja di lowongan'],
  akun: 'Billing account Kirana Platform (ID ••••-7A21)', pic: 'Reza Mahendra (DevOps)', domain: 'API key dibatasi HTTP referrer *.kirana.id',
  kontak: 'Google Cloud Console › Support · status.cloud.google.com',
  bayar: { metode: 'Kartu kredit (Google Cloud Billing)', detail: 'Mastercard korporat •••• 7713', exp: '2026-12', siklus: 'Tagihan otomatis awal bulan untuk pemakaian bulan lalu', mataUang: 'USD' },
  // cap = free usage per SKU per bulan (Essentials 10.000); tarif = USD per 1.000 event di atas cap (perkiraan)
  skus: [
    { sku: 'Dynamic Maps (Maps JavaScript)', cat: 'Essentials', cap: 10000, tarif: 7, fitur: 'Peta di halaman clock in & setup Branch', pakai: { '2026-06': 11800, '2026-07': 12400, '2026-08': 13100, '2026-09': 12900, '2026-10': 14600, '2026-11': 15200 } },
    { sku: 'Geocoding', cat: 'Essentials', cap: 10000, tarif: 5, fitur: 'Ubah alamat Branch/karyawan jadi koordinat', pakai: { '2026-06': 6100, '2026-07': 6500, '2026-08': 7200, '2026-09': 6900, '2026-10': 7400, '2026-11': 7800 } },
    { sku: 'Geolocation', cat: 'Essentials', cap: 10000, tarif: 5, fitur: 'Posisi perangkat saat clock in (fallback GPS)', pakai: { '2026-06': 9200, '2026-07': 10300, '2026-08': 10900, '2026-09': 11200, '2026-10': 11600, '2026-11': 12100 } },
    { sku: 'Autocomplete – Per Request', cat: 'Essentials (Legacy)', cap: 10000, tarif: 2.83, fitur: 'Isian alamat di form karyawan & lowongan', pakai: { '2026-06': 8400, '2026-07': 9100, '2026-08': 10700, '2026-09': 9800, '2026-10': 11300, '2026-11': 11900 } },
  ],
  troubles: [
    { id: 'tr-g1', mulai: '2026-09-12T08:05', selesai: '2026-09-12T08:45', judul: 'API key ditolak setelah rotasi', sumber: 'Internal', tingkat: 'Tinggi', status: 'Selesai', dampak: 'Peta clock in tidak tampil 40 menit, clock in tetap jalan via GPS', tindakan: 'Tambahkan referrer app.kirana.id yang terlewat; checklist rotasi diperbarui.' },
    { id: 'tr-g2', mulai: '2026-10-21T13:30', selesai: '2026-10-21T15:10', judul: 'Lonjakan Geocoding dari impor massal', sumber: 'Internal', tingkat: 'Rendah', status: 'Selesai', dampak: 'Biaya Oktober naik ±US$ 5', tindakan: 'Hasil geocoding alamat kini di-cache 30 hari.' },
    { id: 'tr-g3', mulai: '2026-11-19T07:40', selesai: '', judul: 'Akurasi lokasi rendah di gudang Surabaya', sumber: 'Laporan customer', tingkat: 'Sedang', status: 'Terbuka', dampak: 'Beberapa clock in ditolak geofence (radius 100 m)', tindakan: 'Uji radius 150 m khusus Branch gudang; cek Wi-Fi scan di perangkat.' },
  ],
  maint: [
    { id: 'mn-g1', mulai: '2026-11-25T22:00', selesai: '2026-11-25T22:30', judul: 'Rotasi API key & batasi referrer', jenis: 'Internal', dampak: 'Peta jeda ±5 menit', status: 'Terjadwal' },
    { id: 'mn-g2', mulai: '2026-12-01T10:00', selesai: '2026-12-01T10:30', judul: 'Ganti kartu kredit sebelum kedaluwarsa 12/2026', jenis: 'Pembayaran', dampak: 'Tidak ada', status: 'Terjadwal' },
    { id: 'mn-g3', mulai: '2026-12-15T21:00', selesai: '2026-12-15T23:00', judul: 'Migrasi Autocomplete Legacy → Places API (New)', jenis: 'Internal', dampak: 'Autocomplete alamat nonaktif ±2 jam', status: 'Terjadwal' },
    { id: 'mn-g4', mulai: '2026-09-12T08:00', selesai: '2026-09-12T08:10', judul: 'Rotasi API key berkala', jenis: 'Internal', dampak: 'Lihat gangguan 12 Sep', status: 'Selesai' },
  ],
  notes: [
    { at: '2026-11-19T08:10', oleh: 'Nadia Putri', isi: 'Medika Sehat & Maju Logistik lapor clock in ditolak di gudang. Dicatat sebagai gangguan.' },
    { at: '2026-11-03T10:00', oleh: 'Putri Amalia', isi: 'Kartu Mastercard •••• 7713 berakhir 12/2026. Finance siapkan kartu pengganti sebelum 1 Des.' },
    { at: '2025-03-01T09:00', oleh: 'Reza Mahendra', isi: 'Sejak Maret 2025 kredit US$ 200/bulan diganti free usage cap per SKU. Pantau SKU yang lewat 10.000.' },
  ],
}
gm.invoices = BULAN6.map((p, i) => ({ periode: p, no: `GCP-${p.replace('-', '')}-${4410 + i * 7}`, tgl: p === '2026-11' ? '' : `${p}-28`.replace(/-28$/, '-30'), usd: costOf(gm, p), status: p === '2026-11' ? 'Berjalan' : 'Lunas' }))
gm.invoices.forEach((x) => { if (x.tgl) { const [y, m] = x.periode.split('-').map(Number); const n = new Date(y, m, 2); x.tgl = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-02` } })

export const seedVendors = () => [mt, gm]
