// Contoh Branch besar: PT. Hamparan Alam (Pontianak) dengan 300 karyawan — untuk melihat tampilan data banyak.
export const HA_ID = 'b4'
export const HA_BRANCH = {
  id: HA_ID, name: 'PT. Hamparan Alam', kota: 'Pontianak', aktif: true, customer: 'Rahmat Hidayat', telp: '0561-555-0104', email: 'pontianak@hamparanalam.co.id', gateway: 'Virtual account',
  files: { bukti: 'Bukti pembayaran.jpg', legal1: 'Akta pendirian.pdf', legal2: 'NIB.pdf' },
  accounts: [{ nama: 'Rahmat Hidayat', divisi: 'Human Capital', telp: '0812-5550-104', email: 'rahmat@hamparanalam.co.id' }],
}

const F = ['Agus', 'Ahmad', 'Aisyah', 'Andi', 'Ani', 'Ayu', 'Bambang', 'Bayu', 'Budi', 'Cahya', 'Dedi', 'Desi', 'Dewi', 'Dian', 'Eko', 'Endang', 'Fajar', 'Fitri', 'Hendra', 'Ika', 'Irfan', 'Joko', 'Kurnia', 'Lina', 'Lia', 'Mega', 'Muhammad', 'Nur', 'Putu', 'Ratna', 'Rudi', 'Sari', 'Siti', 'Slamet', 'Sri', 'Tono', 'Tri', 'Wati', 'Yanto', 'Yuni']
const L = ['Abdullah', 'Gunawan', 'Halim', 'Hasibuan', 'Irawan', 'Kurniawan', 'Lubis', 'Nasution', 'Nugraha', 'Purnomo', 'Putra', 'Putri', 'Rahman', 'Santoso', 'Siregar', 'Sitompul', 'Suryadi', 'Susanto', 'Syahputra', 'Utami', 'Wibowo', 'Yusuf']
const PEREMPUAN = new Set(['Aisyah', 'Ani', 'Ayu', 'Desi', 'Dewi', 'Dian', 'Endang', 'Fitri', 'Ika', 'Lina', 'Lia', 'Mega', 'Ratna', 'Sari', 'Siti', 'Sri', 'Wati', 'Yuni', 'Nur'])
// [divisi, role, thp dasar, porsi]
const JOB = [
  ['Kebun', 'Pemanen Sawit', 3600000, 70], ['Kebun', 'Perawatan Tanaman', 3500000, 45], ['Kebun', 'Mandor Kebun', 5400000, 14],
  ['Pabrik', 'Operator Pabrik', 4300000, 40], ['Pabrik', 'Teknisi Mesin', 5600000, 18], ['Pabrik', 'Quality Control', 5200000, 10],
  ['Logistik', 'Driver Truk', 4400000, 24], ['Logistik', 'Admin Gudang', 4200000, 14],
  ['K3 & Umum', 'Petugas K3', 4600000, 10], ['K3 & Umum', 'Security', 3900000, 18],
  ['Finance', 'Staff Keuangan', 6200000, 12], ['Human Capital', 'Staff HR', 6000000, 10], ['Manajemen', 'Asisten Manajer', 9800000, 10], ['Manajemen', 'Manajer Estate', 15500000, 5],
]
const ROLES = JOB.flatMap(([d, r, t, n]) => Array(n).fill([d, r, t]))
const BANKS = ['BNI', 'MDR', 'BCA', 'BNI', 'MDR', 'BWS']

export function seedHamparan(s, emp) {
  if (!s.branches.some((b) => b.id === HA_ID)) s.branches.push(HA_BRANCH)
  s.workCal[HA_ID] = { hari: [1, 2, 3, 4, 5, 6], cutiBersama: 'libur' }
  const used = new Set()
  const list = ROLES.slice(0, 300).map(([divisi, role, base], i) => {
    let f = F[(i * 7) % F.length], l = L[(i * 5 + Math.floor(i / F.length)) % L.length], name = `${f} ${l}`, k = 0
    while (used.has(name)) { k++; name = `${f} ${L[(i * 5 + k * 3) % L.length]}` }
    used.add(name)
    const y = 2019 + (i % 7); const m = ((i * 5) % 12) + 1; const tetap = ['Manajemen', 'Finance', 'Human Capital'].includes(divisi) || i % 4 === 0
    const start = `${y}-${String(m).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`
    const end = tetap ? '2027-12-31' : `${2026 + (i % 3 === 0 ? 0 : 1)}-${String(((i * 3) % 12) + 1).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`
    const shift = ['Kebun', 'Pabrik', 'Logistik', 'K3 & Umum'].includes(divisi) ? 'Shift Pagi Ops' : 'Shift 1'
    return emp(0, {
      id: 'h' + i, name, kelamin: PEREMPUAN.has(f) ? 'Perempuan' : 'Laki-laki', branch: HA_ID, role, divisi, level: base >= 9000000 ? 'Senior' : base >= 5400000 ? 'Middle' : 'Junior',
      type: i % 23 === 5 ? 'Magang' : i % 31 === 7 ? 'Freelance' : 'Kontrak', skema: i % 9 === 4 ? 'Khusus' : 'Normal',
      thp: base + ((i * 13) % 8) * 150000, start, end: end < '2026-11-21' ? '2027-06-30' : end, shift, bank: BANKS[i % BANKS.length], bankOk: i % 37 !== 11,
      jalur: i % 6 === 0 ? 'Non-Selection' : 'Selection', doc: i % 29 === 3 ? 'Need Signed' : 'Full Signed', email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@hamparanalam.co.id`,
    })
  })
  // Beberapa kontrak berakhir dalam 60 hari (untuk alert & tabel kontrak)
  ;[['h14', '2026-11-30'], ['h105', '2026-11-27'], ['h28', '2026-12-05'], ['h41', '2026-12-12'], ['h118', '2026-12-15'], ['h56', '2026-12-20'], ['h73', '2026-12-31'], ['h91', '2027-01-10'], ['h150', '2027-01-15']].forEach(([id, end]) => { const e = list.find((x) => x.id === id); if (e) { e.end = end; e.type = 'Kontrak' } })
  s.employees.push(...list)
  // Pengajuan remunerasi November 2026 untuk seluruh 300 karyawan (In Review di Superadmin)
  const row = (e, i) => ({ emp: e.id, jenis: i % 50 === 7 ? 'Renewal' : i % 60 === 13 ? 'Salary' : 'Active', thp: e.thp, skema: e.skema, start: e.start, end: e.end, role: e.role, level: e.level, type: e.type,
    additions: e.divisi === 'Kebun' && i % 3 === 0 ? [{ kategori: 'Overtime', keperluan: 'Premi panen', nominal: 250000 + (i % 4) * 75000 }] : e.divisi === 'Pabrik' && i % 4 === 1 ? [{ kategori: 'Overtime', keperluan: 'Lembur shift malam', nominal: 320000 }] : [],
    deductions: i % 41 === 9 ? [{ kategori: 'Lain-lain', keperluan: 'Cicilan koperasi', nominal: 200000 }] : [] })
  const idx = (e) => list.indexOf(e)
  const by = (divs) => list.filter((e) => divs.includes(e.divisi))
  s.remunerations.push({ id: 'rha-11', branch: HA_ID, bulan: 'November 2026', status: 'In Review', diajukan: '2026-11-12', thr: false, kak: false, files: ['Rekap premi panen November.xlsx', 'Absensi kebun November.pdf'], rows: by(['Kebun', 'Pabrik']).map((e) => row(e, idx(e))) })
  { const r = s.remunerations.find((x) => x.id === 'rha-11'); const w = r.rows.find((x) => x.emp === 'h41'); if (w) { w.jenis = 'Renewal'; w.end = '2027-12-11' } }
  s.remunerations.push({ id: 'rha-11b', branch: HA_ID, bulan: 'November 2026', status: 'Draft', thr: false, kak: false, files: [], rows: by(['Logistik', 'K3 & Umum']).map((e) => row(e, idx(e))) })
  ;[['06', 'Juni'], ['07', 'Juli'], ['08', 'Agustus'], ['09', 'September']].forEach(([mm, b]) => s.remunerations.push({ id: 'rha-' + mm, branch: HA_ID, bulan: b + ' 2026', status: 'Approved', diajukan: `2026-${mm}-14`, thr: false, kak: false, files: [`Rekap premi panen ${b}.xlsx`], rows: list.filter((e) => e.start < `2026-${mm}-01`).map((e) => row(e, idx(e))) }))
  s.remunerations.push({ id: 'rha-10', branch: HA_ID, bulan: 'Oktober 2026', status: 'Approved', diajukan: '2026-10-14', thr: false, kak: false, files: ['Rekap premi panen Oktober.xlsx'], rows: list.filter((e) => e.start < '2026-10-01').map(row) })
  // Aktivitas contoh untuk Dashboard Branch (November 2026)
  const ln = (st) => [{ by: 'Atasan', status: st === 'Waiting' ? 'Approved' : st }, { by: 'HR', status: st }]
  const LV = (emp, jenis, dari, sampai, status, alasan, diajukan) => ({ id: 'lha-' + emp + dari, emp, jenis, dari, sampai, hari: 0, alasan, status, diajukan, line: ln(status) })
  s.leaves.push(
    LV('h3', 'Cuti Tahunan', '2026-11-19', '2026-11-21', 'Approved', 'Pulang kampung ke Sanggau', '2026-11-09'),
    LV('h17', 'Cuti Sakit', '2026-11-20', '2026-11-20', 'Approved', 'Demam, surat dokter terlampir', '2026-11-20'),
    LV('h45', 'Cuti Tahunan', '2026-11-18', '2026-11-24', 'Approved', 'Pernikahan saudara', '2026-11-02'),
    LV('h88', 'Cuti Ibadah', '2026-11-16', '2026-11-25', 'Approved', 'Umrah', '2026-10-20'),
    LV('h120', 'Cuti Sakit', '2026-11-20', '2026-11-21', 'Approved', 'Cedera ringan saat panen', '2026-11-20'),
    LV('h201', 'Cuti Tahunan', '2026-11-20', '2026-11-20', 'Approved', 'Urusan keluarga', '2026-11-13'),
    LV('h9', 'Cuti Tahunan', '2026-11-05', '2026-11-06', 'Approved', 'Acara keluarga', '2026-10-29'),
    LV('h60', 'Cuti Sakit', '2026-11-11', '2026-11-12', 'Approved', 'Tifus', '2026-11-11'),
    LV('h12', 'Cuti Tahunan', '2026-11-25', '2026-11-27', 'Waiting', 'Liburan keluarga', '2026-11-14'),
    LV('h33', 'Cuti Menikah', '2026-12-01', '2026-12-03', 'Waiting', 'Menikah', '2026-11-10'),
    LV('h77', 'Cuti Tahunan', '2026-11-23', '2026-11-23', 'Waiting', 'Mengurus SIM', '2026-11-18'),
    LV('h140', 'Cuti Sakit', '2026-11-19', '2026-11-19', 'Waiting', 'Sakit gigi (pengajuan susulan)', '2026-11-19'),
    LV('h230', 'Cuti Tahunan', '2026-11-28', '2026-11-28', 'Waiting', 'Acara adat', '2026-11-17'),
    LV('h12', 'Cuti Tahunan', '2026-06-22', '2026-06-24', 'Approved', 'Mudik keluarga ke Sambas', '2026-06-08'),
    LV('h12', 'Cuti Sakit', '2026-09-14', '2026-09-15', 'Approved', 'Demam, surat dokter terlampir', '2026-09-14'),
    LV('h12', 'Izin Resmi', '2026-03-20', '2026-03-20', 'Approved', 'Mengurus administrasi Kartu Keluarga', '2026-03-16'),
    LV('h99', 'Cuti Tahunan', '2026-11-14', '2026-11-15', 'Rejected', 'Bertepatan jadwal panen raya', '2026-11-11'),
  )
  s.leaves.forEach((l) => { if (l.id.startsWith('lha-') && !l.hari) { const a = new Date(l.dari), b = new Date(l.sampai); l.hari = Math.round((b - a) / 86400000) + 1 } })
  const j1 = s.jobs.find((j) => j.id === 'j1')
  s.jobs.push({ ...j1, id: 'jha1', branch: HA_ID, posisi: 'Pemanen Sawit', jenis: 'Kontrak', tingkat: 'Junior', kuota: 15, gaji: '3,6–4 jt', lokasi: 'Kubu Raya · Kebun', status: 'Active', approval: 'Approved', pelamar: 64, posted: '2026-11-02', buka: '2026-11-02', tutup: '2026-11-30', pengalaman: 'Tidak wajib', spesialisasi: 'Perkebunan', pendidikan: 'SMA/SMK' },
    { ...j1, id: 'jha2', branch: HA_ID, posisi: 'Teknisi Mesin Pabrik', jenis: 'Kontrak', tingkat: 'Middle', kuota: 2, gaji: '5,5–6,5 jt', lokasi: 'Kubu Raya · Pabrik', status: 'Active', approval: 'Approved', pelamar: 12, posted: '2026-11-09', buka: '2026-11-09', tutup: '2026-12-09', pengalaman: 'Min. 2 tahun', spesialisasi: 'Mekanik', pendidikan: 'SMK/D3 Teknik Mesin' },
    { ...j1, id: 'jha3', branch: HA_ID, posisi: 'Staff Keuangan', jenis: 'Kontrak', tingkat: 'Junior', kuota: 1, gaji: '6–6,5 jt', lokasi: 'Pontianak · Kantor', status: 'Requested', approval: 'Waiting', pelamar: 0, posted: '2026-11-18', buka: '2026-11-25', tutup: '2026-12-25', pengalaman: 'Min. 1 tahun', spesialisasi: 'Akuntansi', pendidikan: 'S1 Akuntansi' })
  s.overtimes.push(
    { id: 'otha1', emp: 'h5', judul: 'Panen raya blok C', tanggal: '2026-11-15', jam: '16:00–20:00', durasi: 4, tipe: 'Lembur Hari Kerja', status: 'Waiting' },
    { id: 'otha2', emp: 'h22', judul: 'Perbaikan boiler pabrik', tanggal: '2026-11-16', jam: '07:00–13:00', durasi: 6, tipe: 'Lembur Hari Libur', status: 'Waiting' },
    { id: 'otha3', emp: 'h48', judul: 'Bongkar muat TBS', tanggal: '2026-11-17', jam: '17:00–21:00', durasi: 4, tipe: 'Lembur Hari Kerja', status: 'Waiting' },
    { id: 'otha4', emp: 'h130', judul: 'Stock opname gudang pupuk', tanggal: '2026-11-12', jam: '16:00–19:00', durasi: 3, tipe: 'Lembur Hari Kerja', status: 'Waiting' },
    { id: 'otha5', emp: 'h260', judul: 'Pengawalan truk CPO', tanggal: '2026-11-18', jam: '18:00–23:00', durasi: 5, tipe: 'Lembur Hari Kerja', status: 'Waiting' },
    { id: 'otha7', emp: 'h12', judul: 'Panen raya blok B', tanggal: '2026-05-16', jam: '15:00–19:00', durasi: 4, tipe: 'Lembur Hari Kerja', status: 'Approved' },
    { id: 'otha8', emp: 'h12', judul: 'Panen raya blok B', tanggal: '2026-08-08', jam: '15:00–18:00', durasi: 3, tipe: 'Lembur Hari Kerja', status: 'Approved' },
    { id: 'otha9', emp: 'h12', judul: 'Kejar target TBS akhir bulan', tanggal: '2026-10-24', jam: '15:00–19:00', durasi: 4, tipe: 'Lembur Hari Kerja', status: 'Approved' },
    { id: 'otha10', emp: 'h12', judul: 'Panen hari Minggu blok A', tanggal: '2026-11-08', jam: '06:00–11:00', durasi: 5, tipe: 'Lembur Hari Libur', status: 'Approved' },
    { id: 'otha11', emp: 'h12', judul: 'Angkut TBS ke pabrik', tanggal: '2026-11-18', jam: '15:00–17:00', durasi: 2, tipe: 'Lembur Hari Kerja', status: 'Waiting' },
    { id: 'otha6', emp: 'h7', judul: 'Panen raya blok A', tanggal: '2026-11-10', jam: '16:00–19:00', durasi: 3, tipe: 'Lembur Hari Kerja', status: 'Approved' },
  )
  s.reimbursements.push(
    { id: 'rbha1', emp: 'h11', jenis: 'Kesehatan', judul: 'Rawat jalan klinik', tanggal: '2026-11-08', nominal: 450000, status: 'Waiting' },
    { id: 'rbha2', emp: 'h70', jenis: 'Kacamata', judul: 'Kacamata kerja', tanggal: '2026-11-13', nominal: 900000, status: 'Waiting' },
    { id: 'rbha3', emp: 'h180', jenis: 'Transport', judul: 'Perjalanan dinas ke Ketapang', tanggal: '2026-11-06', nominal: 1250000, status: 'Waiting' },
    { id: 'rbha4', emp: 'h2', jenis: 'Kesehatan', judul: 'Obat & vitamin', tanggal: '2026-11-04', nominal: 300000, status: 'Approved' },
  )
  s.resigns.push(
    { id: 'rsha1', emp: 'h25', alasan: 'Pindah domisili', diajukan: '2026-11-05', lastDay: '2026-12-05', inventaris: 'Belum lengkap', catatan: 'Ikut suami pindah ke Balikpapan.', lampiran: 'Surat resign.pdf', status: 'Waiting' },
    { id: 'rsha2', emp: 'h190', alasan: 'Melanjutkan studi', diajukan: '2026-11-16', lastDay: '2026-12-16', inventaris: 'Lengkap', catatan: '', lampiran: 'Surat resign.pdf', status: 'Waiting' },
    { id: 'rsha3', emp: 'h66', alasan: 'Pindah ke perusahaan lain', diajukan: '2026-10-28', lastDay: '2026-11-27', inventaris: 'Belum lengkap', catatan: 'Motor operasional & HT belum dikembalikan.', lampiran: 'Surat resign.pdf', status: 'Approved' },
  )
  // Inventaris contoh Hamparan Alam (ikut jadi register Audit Aset)
  const INV = [
    ['h66', 'Transportasi', 'Motor operasional kebun', 'Patroli blok kebun', '2026-03-10', 'Accepted'], ['h66', 'Elektronik Kantor', 'Handy talky Motorola', 'Komunikasi lapangan', '2026-03-10', 'Accepted'],
    ['h14', 'Transportasi', 'Motor operasional kebun', 'Pengawasan panen', '2026-02-02', 'Accepted'], ['h126', 'Transportasi', 'Motor operasional kebun', 'Mandor blok D', '2026-04-15', 'Accepted'],
    ['h197', 'Transportasi', 'Mobil pickup operasional', 'Angkut pupuk & logistik', '2025-11-20', 'Accepted'], ['h210', 'Elektronik Kantor', 'Handy talky Motorola', 'Komunikasi gudang', '2026-06-01', 'Accepted'],
    ['h129', 'Alat Kerja', 'Tool kit mekanik', 'Perawatan mesin pabrik', '2026-01-12', 'Accepted'], ['h147', 'Alat Kerja', 'Tool kit mekanik', 'Perawatan boiler', '2026-05-20', 'Accepted'],
    ['h0', 'Perlengkapan K3', 'Helm safety', 'APD panen', '2026-08-01', 'Accepted'], ['h1', 'Perlengkapan K3', 'Sepatu boot safety', 'APD panen', '2026-08-01', 'Accepted'],
    ['h2', 'Perlengkapan K3', 'Helm safety', 'APD panen', '2026-08-01', 'Accepted'], ['h70', 'Perlengkapan K3', 'Rompi reflektif', 'APD perawatan tanaman', '2026-09-03', 'Accepted'],
    ['h245', 'Perlengkapan K3', 'APAR 6 kg', 'Pos K3 pabrik', '2026-02-18', 'Accepted'], ['h250', 'Perlengkapan K3', 'Helm safety', 'Petugas K3', '2026-11-17', 'Waiting'],
    ['h268', 'Alat Kerja', 'Laptop 14" Finance', 'Pembukuan & payroll', '2026-01-08', 'Accepted'], ['h275', 'Alat Kerja', 'Laptop 14" HR', 'Administrasi karyawan', '2026-03-03', 'Accepted'],
    ['h290', 'Alat Kerja', 'ThinkPad T14 manajer', 'Laporan estate', '2025-12-01', 'Accepted'], ['h280', 'Elektronik Kantor', 'Printer kantor estate', 'Cetak dokumen kebun', '2026-02-10', 'Accepted'],
    ['h25', 'Perlengkapan K3', 'Sepatu boot safety', 'APD panen', '2026-04-04', 'Accepted'], ['h190', 'Alat Kerja', 'Laptop 14" admin gudang', 'Input stok', '2026-05-05', 'Returned'],
    ['h300x', 'Furnitur', 'Kursi kantor', 'Kantor estate', '2026-01-05', 'Accepted'], ['h285', 'Tunjangan Kantor', 'Kartu akses kantor estate', 'Akses gedung', '2026-01-05', 'Accepted'],
    ['h33', 'Perlengkapan K3', 'Rompi reflektif', 'APD panen', '2026-11-18', 'Waiting'], ['h12', 'Perlengkapan K3', 'Sepatu boot safety', 'APD panen', '2026-08-01', 'Accepted'], ['h12', 'Alat Kerja', 'Egrek panen', 'Alat panen tandan buah segar', '2026-11-19', 'Waiting'], ['h160', 'Elektronik Kantor', 'Kamera inspeksi QC', 'Dokumentasi mutu CPO', '2026-07-07', 'Accepted'],
  ].filter(([e]) => list.some((x) => x.id === e))
  INV.forEach(([emp, kategori, item, kebutuhan, tanggal, status], i) => s.inventories.push({ id: 'iha' + i, nomor: `INV-HA-${String(i + 1).padStart(4, '0')}`, emp, kategori, item, kebutuhan, tanggal, status, ...(status === 'Returned' ? { tanggalKembali: '2026-11-16', kondisi: 'Baik', catatanKembali: 'Dikembalikan sebelum resign' } : {}) }))

}

// Absensi "hari ini" untuk Hamparan Alam: rekap contoh dibangkitkan s.d. DATA_SAMPAI, jadi hari setelahnya diisi di sini.
export function seedHamparanToday(s, rnd, isWorkday, upto) {
  seedHamparanToday2(s, rnd, isWorkday, upto)
  // Log absensi harian (5 hari kerja terakhir) dari rekap, untuk menu Absensi
  const emps = s.employees.filter((e) => e.branch === HA_ID && e.status === 'Aktif'); const end = upto > '2026-11-20' ? upto : '2026-11-20'
  const days = []; const d = new Date(end + 'T00:00:00'); let g = 0
  while (days.length < 5 && g++ < 20) { const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; if (isWorkday(s, HA_ID, iso)) days.push(iso); d.setDate(d.getDate() - 1) }
  const LOK = { Kebun: 'Kebun Kubu Raya', Pabrik: 'Pabrik Kelapa Sawit', Logistik: 'Gudang Kubu Raya', 'K3 & Umum': 'Pabrik Kelapa Sawit' }
  const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  let n = 0
  days.forEach((day) => { const r = rnd('hlog' + day); const y = +day.slice(0, 4), mo = +day.slice(5, 7)
    const leave = new Set(s.leaves.filter((l) => l.status === 'Approved' && l.dari <= day && (l.sampai || l.dari) >= day).map((l) => l.emp))
    emps.forEach((e) => { if (leave.has(e.id)) return
      const rec = s.attRecap.find((x) => x.emp === e.id && x.y === y && x.m === mo); if (rec?.alpa.includes(day)) return
      const t = rec?.telat.find(([x]) => x === day); const ops = e.shift === 'Shift Pagi Ops'; const batas = ops ? 7 * 60 + 15 : 9 * 60
      const masuk = t ? batas + t[1] : batas - 5 - Math.floor(r() * 35); const pulang = (ops ? 15 * 60 : 17 * 60) + Math.floor(r() * 50)
      s.attendance.push({ id: 'ah' + ++n, emp: e.id, tanggal: day, masuk: hm(masuk), pulang: day === end ? '' : hm(pulang), status: t ? 'Terlambat' : 'Hadir', lokasi: LOK[e.divisi] || 'Kantor Estate Pontianak' }) }) })
}
function seedHamparanToday2(s, rnd, isWorkday, upto) {
  const d = new Date('2026-11-20T00:00:00'); const end = upto > '2026-11-20' ? upto : '2026-11-20'
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  const emps = s.employees.filter((e) => e.branch === HA_ID && e.status === 'Aktif')
  for (; iso(d) <= end && iso(d) <= '2026-12-31'; d.setDate(d.getDate() + 1)) {
    const day = iso(d); if (!isWorkday(s, HA_ID, day)) continue
    const r = rnd('ha' + day); const y = d.getFullYear(), m = d.getMonth() + 1
    const onLeave = new Set(s.leaves.filter((l) => l.status === 'Approved' && l.dari <= day && (l.sampai || l.dari) >= day).map((l) => l.emp))
    emps.forEach((e, i) => {
      if (onLeave.has(e.id)) return
      let rec = s.attRecap.find((x) => x.emp === e.id && x.y === y && x.m === m); if (!rec) { rec = { emp: e.id, y, m, alpa: [], telat: [] }; s.attRecap.push(rec) }
      if (rec.alpa.includes(day) || rec.telat.some(([x]) => x === day)) return
      const v = r()
      if (v < 0.009) rec.alpa.push(day)
      else if (v < 0.06) { const x = r(); rec.telat.push([day, 3 + Math.floor(x * x * 85)]) }
    })
  }
}
