// Data dummy prototipe (nama fiktif). Di produksi data ini berasal dari Firestore lewat src/services/.
const N = ['Annisa Rahma', 'Kevin Pratama', 'Sara Wulandari', 'Gavin Hartono', 'Dimas Saputra', 'Putri Amalia', 'Rizky Maulana', 'Nadia Kusuma', 'Bagas Wicaksono', 'Laras Ayuningtyas', 'Fajar Nugroho', 'Citra Lestari', 'Hendra Kurniawan', 'Mega Pratiwi', 'Yoga Ramadhan', 'Intan Permata', 'Raka Aditya']

// Riwayat absensi contoh Putri (e5) Agustus–November 2026 untuk filter & rangkuman di Attendance log.
// September sengaja lebih banyak terlambat; Alpha hanya sebelum November supaya simulasi remunerasi November tidak berubah.
function riwayatPutri() {
  const out = []; const skip = ['2026-11-10', '2026-11-11', '2026-08-17']
  for (let d = new Date('2026-08-03T00:00:00Z'); d <= new Date('2026-11-19T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = d.getUTCDay(); const t = d.toISOString().slice(0, 10); if (wd === 0 || wd === 6 || skip.includes(t)) continue
    const n = d.getUTCDate(); const m = d.getUTCMonth() + 1; const r = (n * 7 + m * 3) % 20
    if (m < 11 && r === 0) { out.push({ emp: 'e5', tanggal: t, masuk: '—', pulang: '—', status: 'Alpha', lokasi: '—' }); continue }
    const telat = m === 9 ? r < 12 : r >= 16
    const mm = String((n * 13) % 50 + 2).padStart(2, '0')
    out.push(telat ? { emp: 'e5', tanggal: t, masuk: '09:' + mm, pulang: '17:' + String(30 + (n % 25)), status: 'Terlambat', lokasi: n % 4 ? 'Kantor Jakarta' : 'WFA', verif: 'Approved' }
      : { emp: 'e5', tanggal: t, masuk: '08:' + String(30 + (n % 28)).padStart(2, '0'), pulang: '17:' + String(31 + (n % 27)), status: 'Hadir', lokasi: n % 4 ? 'Kantor Jakarta' : 'WFA' })
  }
  return out.reverse()
}

export const BRANCHES = [
  { id: 'b1', skema: 'Normal', name: 'Branch Jakarta Digital', kota: 'Jakarta', aktif: true, customer: 'Rama Wijaya', telp: '021-5550101', email: 'jakarta@kirana.id', gateway: 'Transfer bank', files: { bukti: 'Bukti pembayaran.jpg', legal1: 'Akta pendirian.pdf', legal2: 'NIB.pdf' }, accounts: [{ nama: 'Rama Wijaya', divisi: 'Human Capital', telp: '0812-5550-101', email: 'rama@kirana.id' }] },
  { id: 'b2', skema: 'Normal', name: 'Branch Bandung Tech', kota: 'Bandung', aktif: true, customer: 'Sinta Maharani', telp: '022-5550102', email: 'bandung@kirana.id', gateway: 'Transfer bank', files: { bukti: 'Bukti pembayaran.jpg', legal1: 'Akta pendirian.pdf', legal2: '' }, accounts: [{ nama: 'Sinta Maharani', divisi: 'Operasional', telp: '0812-5550-102', email: 'sinta@kirana.id' }] },
  { id: 'b3', skema: 'Khusus', name: 'Branch Surabaya Ops', kota: 'Surabaya', aktif: true, customer: 'Yusuf Hakim', telp: '031-5550103', email: 'surabaya@kirana.id', gateway: 'Virtual account', files: { bukti: '', legal1: 'Akta pendirian.pdf', legal2: '' }, accounts: [{ nama: 'Yusuf Hakim', divisi: 'Human Capital', telp: '0812-5550-103', email: 'yusuf@kirana.id' }] },
]

const GENDER = ['Perempuan', 'Laki-laki', 'Perempuan', 'Laki-laki', 'Laki-laki', 'Perempuan', 'Laki-laki', 'Perempuan', 'Laki-laki', 'Perempuan', 'Laki-laki', 'Perempuan', 'Laki-laki', 'Perempuan', 'Laki-laki', 'Perempuan', 'Laki-laki']
const emp = (i, o) => ({ id: 'e' + i, name: N[i], kelamin: GENDER[i], branch: 'b1', role: 'Staff', level: 'Junior', type: 'Kontrak', skema: 'Normal', thp: 8000000, start: '2025-01-06', end: '2026-12-31', jalur: 'Selection', doc: 'Full Signed', shift: 'Shift 1', divisi: 'Team Product', bank: 'BCA', rekening: String(5410000000 + i * 1379), pemegang: N[i], bankOk: true, bankStatus: 'Berhasil tersinkronisasi', status: 'Aktif', ...o })

// Rangkaian soal pre-test (maks 5, hanya 1 aktif; tiap rangkaian maks 3 modul)
const md = (id, tipe, judul, kategori, durasi, icon, soal, instruksi) => ({ id, tipe, judul, kategori, durasi, icon, instruksi: instruksi || 'Baca setiap pertanyaan dengan teliti, lalu jawab sesuai kemampuanmu.', soal })
const HRD = ['Perkenalkan dirimu secara singkat.', 'Apa motivasimu melamar pekerjaan ini?', 'Apa kelebihan dan kekuranganmu?'].map((q) => ({ q }))
const pg = (q, opsi, benar) => ({ q, opsi, benar })
const M = {
  interview: (id) => md(id, 'Live Recording', 'Interview Dasar', 'Wawancara Mandiri', 30, 'video', HRD, 'Rekam dirimu menjawab tiap pertanyaan. Kamu punya 3 kali kesempatan rekam, lalu pilih 1 video per pertanyaan.'),
  tpa: (id) => md(id, 'Pilihan Ganda', 'Tes Potensi Akademik', 'Tes Kepribadian', 45, 'otak', [pg('Deret berikutnya dari 2, 4, 8, 16 adalah ...', ['18', '24', '32', '64'], 2), pg('Lawan kata "efisien" adalah ...', ['Boros', 'Cepat', 'Hemat', 'Tepat'], 0),
    pg('Jika 3 pekerja menyelesaikan tugas dalam 6 hari, 6 pekerja menyelesaikannya dalam ...', ['2 hari', '3 hari', '4 hari', '12 hari'], 1), pg('Sinonim "akurat" adalah ...', ['Tepat', 'Cepat', 'Lambat', 'Ragu'], 0),
    pg('25% dari 240 adalah ...', ['48', '60', '64', '72'], 1), pg('Buku : Perpustakaan = Lukisan : ...', ['Kuas', 'Galeri', 'Kanvas', 'Pelukis'], 1),
    pg('Deret 5, 10, 20, 35, ... berikutnya adalah ...', ['45', '50', '55', '60'], 2), pg('Semua manajer hadir rapat. Rina manajer. Maka ...', ['Rina hadir rapat', 'Rina tidak hadir', 'Belum pasti', 'Rina pemimpin rapat'], 0),
    pg('Antonim "transparan" adalah ...', ['Jelas', 'Tertutup', 'Terbuka', 'Bening'], 1), pg('Harga Rp80.000 diskon 15%, harga akhir ...', ['Rp64.000', 'Rp66.000', 'Rp68.000', 'Rp70.000'], 2)]),
  excel: (id) => md(id, 'Upload Dokumen', 'Tes Excel', 'Tes Kompetensi', 60, 'angka', [{ q: 'Buat rekap penjualan bulanan dengan pivot table dari data terlampir, lalu unggah filenya.' }]),
  essay: (id) => md(id, 'Essay', 'Studi Kasus', 'Tes Kompetensi', 60, 'pensil', [{ q: 'Ceritakan satu masalah kerja tersulit yang pernah kamu selesaikan dan bagaimana caramu menyelesaikannya.' }]),
  coding: (id) => md(id, 'Upload Dokumen', 'Tes Coding', 'Tes Kompetensi', 90, 'coding', [{ q: 'Kerjakan soal pada repositori latihan, lalu kirim tautan repositori jawabanmu.' }]),
  disc: (id) => md(id, 'Pilihan Ganda', 'Psikotes DISC', 'Tes Kepribadian', 30, 'love', [pg('Saat bekerja dalam tim, kamu paling sering ...', ['Memimpin arah', 'Mencairkan suasana', 'Menjaga kekompakan', 'Memeriksa detail'], 0)]),
}
const PRETEST_SETS = [
  { id: 'pt1', nama: 'Rangkaian Umum Talent Pool', dibuat: '2026-09-01', aktif: true, modul: [M.interview('m11'), M.tpa('m12'), M.essay('m13')] },
  { id: 'pt2', nama: 'Rangkaian Admin Support', dibuat: '2026-09-14', aktif: false, modul: [M.interview('m21'), M.disc('m22'), M.excel('m23')] },
  { id: 'pt3', nama: 'Rangkaian Developer', dibuat: '2026-10-02', aktif: false, modul: [M.interview('m31'), M.tpa('m32'), M.coding('m33')] },
  { id: 'pt4', nama: 'Rangkaian Magang', dibuat: '2026-10-20', aktif: false, modul: [M.interview('m41'), M.essay('m42')] },
  { id: 'pt5', nama: 'Rangkaian Kepribadian', dibuat: '2026-11-03', aktif: false, modul: [M.disc('m51'), M.tpa('m52')] },
]

export const talentSeedRaw = () => ({
  pretestSets: structuredClone(PRETEST_SETS),
  setup: null,
  branches: BRANCHES,
  employees: [
    emp(0, { role: 'Product Designer', level: 'Middle', thp: 12000000 }),
    emp(1, { role: 'Backend Engineer', level: 'Senior', thp: 15000000 }),
    emp(2, { role: 'Admin Support', type: 'Magang', thp: 4500000, skema: 'Khusus', bank: 'Mandiri', pemegang: 'Sara W', bankOk: false, bankStatus: 'Nama Akun Bank tidak sesuai' }),
    emp(3, { role: 'Data Analyst', thp: 9500000, end: '2026-11-30', bank: 'BNI', rekening: 'X0021', bankOk: false, bankStatus: 'Akun Bank tidak terdaftar' }),
    emp(4, { role: 'QA Engineer', type: 'Freelance', thp: 7000000, bankOk: false, bankStatus: 'Belum disinkronisasi', end: '2026-12-15' }),
    emp(5, { role: 'UI/UX Designer', thp: 10000000, branch: 'b1' }),
    emp(6, { role: 'Frontend Developer', branch: 'b2', thp: 11000000 }),
    emp(7, { role: 'Business Analyst', branch: 'b2', thp: 9000000, doc: 'Employee Signed' }),
    emp(8, { role: 'IT Support', branch: 'b3', thp: 6500000, jalur: 'Non-Selection', doc: 'Sent' }),
    // Tambahan dummy Branch Bandung (b2) & Surabaya (b3)
    emp(9, { role: 'Product Owner', branch: 'b2', level: 'Senior', thp: 16000000, divisi: 'Team Product', start: '2024-08-01', end: '2027-07-31' }),
    emp(10, { role: 'Backend Engineer', branch: 'b2', level: 'Middle', thp: 12500000, divisi: 'Team Engineering', shift: 'Shift 2' }),
    emp(11, { role: 'HR Officer', branch: 'b2', thp: 7500000, divisi: 'Human Capital', type: 'Kontrak', end: '2027-02-28' }),
    emp(12, { role: 'Operations Lead', branch: 'b3', level: 'Senior', thp: 13000000, divisi: 'Operasional', start: '2024-03-01', end: '2027-02-28' }),
    emp(13, { role: 'Customer Service', branch: 'b3', thp: 5200000, divisi: 'Operasional', shift: 'Shift 2' }),
    emp(14, { role: 'Finance Staff', branch: 'b3', thp: 6800000, divisi: 'Finance', doc: 'Employee Signed' }),
    emp(15, { role: 'Sales Executive', branch: 'b3', type: 'Freelance', thp: 5500000, divisi: 'Sales', end: '2026-12-31' }),
    emp(16, { role: 'Graphic Designer', branch: 'b2', type: 'Magang', skema: 'Khusus', thp: 3500000, divisi: 'Team Product', end: '2027-01-31' }),
  ],
  jobs: [
    { id: 'j1', branch: 'b1', posisi: 'Backend Engineer', jenis: 'Kontrak', tingkat: 'Middle', kuota: 2, gaji: '12–15 jt', lokasi: 'Jakarta · Hybrid', status: 'Active', approval: 'Approved', pelamar: 18, posted: '2026-10-20', buka: '2026-10-20', tutup: '2026-11-20', kerjaDari: '2026-12-01', kerjaSampai: '2027-11-30', pengalaman: 'Min. 2 tahun sampai 4 tahun', spesialisasi: 'Backend Developer', pendidikan: 'Sarjana S1, Sertifikat Profesional', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j2', branch: 'b1', posisi: 'Marketing Staff', jenis: 'Kontrak', tingkat: 'Junior', kuota: 3, gaji: '6–7,5 jt', lokasi: 'Jakarta · WFO', status: 'Active', approval: 'Approved', pelamar: 42, posted: '2026-10-28', buka: '2026-10-28', tutup: '2026-11-28', kerjaDari: '2026-12-01', kerjaSampai: '2028-11-30', pengalaman: 'Min. 0 tahun sampai 2 tahun', spesialisasi: 'Digital Marketing', pendidikan: 'SMA/SMK, Sarjana S1, Sertifikat Profesional', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j3', branch: 'b2', posisi: 'Data Engineer', jenis: 'Kontrak', tingkat: 'Senior', kuota: 1, gaji: '16–20 jt', lokasi: 'Bandung · Hybrid', status: 'Requested', approval: 'Waiting', pelamar: 0, posted: '2026-11-09', buka: '2026-11-15', tutup: '2026-12-15', kerjaDari: '2027-01-04', kerjaSampai: '2028-01-03', pengalaman: 'Min. 4 tahun sampai 6 tahun', spesialisasi: 'Data Engineering', pendidikan: 'Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR, KAK' },
    { id: 'j4', branch: 'b1', posisi: 'Content Creative', jenis: 'Magang', tingkat: 'Junior', kuota: 2, gaji: '3–4 jt', lokasi: 'Jakarta · WFH', status: 'Requested', approval: 'Waiting', pelamar: 0, posted: '2026-11-10', buka: '2026-11-17', tutup: '2026-12-10', kerjaDari: '2027-01-04', kerjaSampai: '2027-07-03', pengalaman: 'Min. 0 tahun sampai 2 tahun', spesialisasi: 'Konten Kreatif', pendidikan: 'SMA/SMK, Diploma/Sarjana S1', benefit: 'Uang saku, Sertifikat magang' },
    { id: 'j5', branch: 'b3', posisi: 'UI/UX Designer', jenis: 'Kontrak', tingkat: 'Middle', kuota: 1, gaji: '9–12 jt', lokasi: 'Surabaya · Hybrid', status: 'Rejected', approval: 'Rejected', catatan: 'Rentang gaji belum sesuai standar level Middle. Mohon disesuaikan lalu ajukan ulang.', pelamar: 0, posted: '2026-11-05', buka: '2026-11-12', tutup: '2026-12-12', kerjaDari: '2027-01-04', kerjaSampai: '2028-01-03', pengalaman: 'Min. 2 tahun sampai 4 tahun', spesialisasi: 'UI/UX Designer', pendidikan: 'Diploma/Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j6', branch: 'b2', posisi: 'Admin Support', jenis: 'Freelance', tingkat: 'Junior', kuota: 4, gaji: '4–5 jt', lokasi: 'Bandung · WFO', status: 'Rejected', approval: 'Rejected', catatan: 'Deskripsi pekerjaan masih kosong.', pelamar: 0, posted: '2026-11-07', buka: '2026-11-14', tutup: '2026-12-05', kerjaDari: '2026-12-15', kerjaSampai: '2027-06-14', pengalaman: 'Min. 0 tahun sampai 2 tahun', spesialisasi: 'Admin Support', pendidikan: 'SMA/SMK', benefit: 'BPJS Ketenagakerjaan' },
    { id: 'j7', branch: 'b2', posisi: 'Frontend Developer', jenis: 'Kontrak', tingkat: 'Middle', kuota: 2, gaji: '10–13 jt', lokasi: 'Bandung · Hybrid', status: 'Requested', approval: 'Waiting', pelamar: 0, posted: '2026-11-12', buka: '2026-11-12', tutup: '2026-12-20', kerjaDari: '2027-01-04', kerjaSampai: '2027-12-31', pengalaman: 'Min. 2 tahun sampai 4 tahun', spesialisasi: 'Frontend Developer', pendidikan: 'Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j8', branch: 'b3', posisi: 'Customer Service', jenis: 'Kontrak', tingkat: 'Junior', kuota: 5, gaji: '4,5–5,5 jt', lokasi: 'Surabaya · WFO', status: 'Requested', approval: 'Waiting', pelamar: 0, posted: '2026-11-13', buka: '2026-11-13', tutup: '2026-12-20', kerjaDari: '2027-01-04', kerjaSampai: '2027-12-31', pengalaman: 'Min. 0 tahun sampai 2 tahun', spesialisasi: 'Customer Service', pendidikan: 'SMA/SMK, Diploma', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j9', branch: 'b1', posisi: 'Product Manager', jenis: 'Kontrak', tingkat: 'Senior', kuota: 1, gaji: '20–25 jt', lokasi: 'Jakarta · Hybrid', status: 'Active', approval: 'Approved', pelamar: 12, posted: '2026-10-15', buka: '2026-10-15', tutup: '2026-12-20', kerjaDari: '2027-01-04', kerjaSampai: '2027-12-31', pengalaman: 'Min. 5 tahun sampai 8 tahun', spesialisasi: 'Product Management', pendidikan: 'Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j10', branch: 'b2', posisi: 'QA Engineer', jenis: 'Kontrak', tingkat: 'Junior', kuota: 2, gaji: '7–9 jt', lokasi: 'Bandung · WFO', status: 'Active', approval: 'Approved', pelamar: 12, posted: '2026-10-18', buka: '2026-10-18', tutup: '2026-12-20', kerjaDari: '2027-01-04', kerjaSampai: '2027-12-31', pengalaman: 'Min. 1 tahun sampai 3 tahun', spesialisasi: 'Quality Assurance', pendidikan: 'Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j11', branch: 'b3', posisi: 'Sales Executive', jenis: 'Kontrak', tingkat: 'Junior', kuota: 4, gaji: '5–7 jt + insentif', lokasi: 'Surabaya · WFO', status: 'Active', approval: 'Approved', pelamar: 12, posted: '2026-10-22', buka: '2026-10-22', tutup: '2026-12-20', kerjaDari: '2027-01-04', kerjaSampai: '2027-12-31', pengalaman: 'Min. 0 tahun sampai 2 tahun', spesialisasi: 'Sales', pendidikan: 'Diploma, Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j12', branch: 'b1', posisi: 'HR Generalist', jenis: 'Kontrak', tingkat: 'Middle', kuota: 1, gaji: '9–11 jt', lokasi: 'Jakarta · WFO', status: 'Requested', approval: 'Waiting', pelamar: 0, posted: '2026-11-14', buka: '2026-11-14', tutup: '2026-12-20', kerjaDari: '2027-01-04', kerjaSampai: '2027-12-31', pengalaman: 'Min. 2 tahun sampai 4 tahun', spesialisasi: 'Human Resources', pendidikan: 'Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j13', branch: 'b3', posisi: 'Graphic Designer', jenis: 'Freelance', tingkat: 'Junior', kuota: 2, gaji: '5–6 jt', lokasi: 'Surabaya · WFH', status: 'Rejected', approval: 'Rejected', catatan: 'Lampiran portofolio wajib belum dicantumkan di kualifikasi.', pelamar: 0, posted: '2026-11-06', buka: '2026-11-06', tutup: '2026-12-20', kerjaDari: '2027-01-04', kerjaSampai: '2027-12-31', pengalaman: 'Min. 1 tahun sampai 3 tahun', spesialisasi: 'Desain Grafis', pendidikan: 'Diploma, Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
    { id: 'j14', branch: 'b2', posisi: 'Data Analyst', jenis: 'Kontrak', tingkat: 'Middle', kuota: 1, gaji: '11–14 jt', lokasi: 'Bandung · Hybrid', status: 'Active', approval: 'Approved', pelamar: 12, posted: '2026-11-02', buka: '2026-11-02', tutup: '2026-12-20', kerjaDari: '2027-01-04', kerjaSampai: '2027-12-31', pengalaman: 'Min. 2 tahun sampai 4 tahun', spesialisasi: 'Data Analysis', pendidikan: 'Sarjana S1', benefit: 'BPJS Kesehatan, BPJS Ketenagakerjaan, THR' },
  ],
  candidates: [
    { id: 'c1', name: 'Rina Oktaviani', job: 'j1', tahap: 1, skor: 82 },
    { id: 'c2', name: 'Yoga Prasetyo', job: 'j1', tahap: 2, skor: 77 },
    { id: 'c3', name: 'Melati Sari', job: 'j1', tahap: 4, skor: 88 },
    { id: 'c4', name: 'Hendra Gunawan', job: 'j2', tahap: 3, skor: 71 },
    { id: 'c5', name: 'Tiara Anjani', job: 'j2', tahap: 5, skor: 90 },
    // Akun demo talent kandidat (pool = id di talent pool; riwayat = tanggal lolos tiap tahap)
    { id: 'c6', name: 'Salsa Nabila', pool: 'p2', job: 'j2', tahap: 1, skor: 78, dilamar: '2026-11-16', riwayat: [] },
    { id: 'c7', name: 'Rendi Firmansyah', pool: 'p5', job: 'j1', tahap: 4, skor: 74, dilamar: '2026-10-22', riwayat: ['2026-10-29', '2026-11-05', '2026-11-13'] },
  ],
  interviews: [
    { id: 'iv1', talent: 'p5', job: 'j1', status: 'Terkonfirmasi', tanggal: '2026-11-24', jam: '10:00', selesai: '11:00', mode: 'Online', link: 'https://meet.google.com/kir-rnd-int', pewawancara: 'Annisa Rahma (Head of Product) & Kevin Pratama (Engineering Manager)', catatan: 'Siapkan contoh penanganan tiket IT yang pernah kamu kerjakan. Kamera wajib menyala.' },
  ],
  pretestDone: {}, // { [talentId]: [id modul selesai] } — diisi di store untuk kandidat yang sudah dinilai
  pool: [
    { id: 'p1', name: 'Arya Mahendra', kelamin: 'Laki-laki', pendidikan: 'S1', pengalaman: '2–4 tahun', spesialisasi: 'Backend Developer', skor: 85, status: 'Active Pool', mitra: '—', ekspektasi: 11000000 },
    { id: 'p2', name: 'Salsa Nabila', kelamin: 'Perempuan', pendidikan: 'D3', pengalaman: '0–2 tahun', spesialisasi: 'Admin Support', skor: 78, status: 'Active Pool', mitra: 'Mitra Karya Talenta', ekspektasi: 5500000 },
    { id: 'p3', name: 'Bima Aditya', kelamin: 'Laki-laki', pendidikan: 'S1', pengalaman: '4–6 tahun', spesialisasi: 'Data Analyst', skor: null, status: 'Pending Assessment', mitra: 'Mitra Karya Talenta', ekspektasi: 12000000 },
    { id: 'p4', name: 'Kirana Putri', kelamin: 'Perempuan', pendidikan: 'S1', pengalaman: '0–2 tahun', spesialisasi: 'UI/UX Designer', skor: null, status: 'Registered', mitra: '—', ekspektasi: 8000000 },
    { id: 'p5', name: 'Rendi Firmansyah', kelamin: 'Laki-laki', pendidikan: 'SMA/SMK', pengalaman: '2–4 tahun', spesialisasi: 'IT Support', skor: 74, status: 'In Hiring Process', mitra: '—', ekspektasi: 6000000 },
    { id: 'p6', name: 'Wulan Sari', kelamin: 'Perempuan', pendidikan: 'S2', pengalaman: '>6 tahun', spesialisasi: 'Project Manager', skor: 92, status: 'Hired', mitra: 'Mitra Karya Talenta', ekspektasi: 20000000 },
    { id: 'p7', name: 'Dewa Saputra', kelamin: 'Laki-laki', pendidikan: 'S1', pengalaman: '2–4 tahun', spesialisasi: 'Backend Developer', skor: null, status: 'Pending Assessment', mitra: '—', ekspektasi: 13000000 },
    { id: 'p8', name: 'Anisa Fitri', kelamin: 'Perempuan', pendidikan: 'D3', pengalaman: '0–2 tahun', spesialisasi: 'Admin Support', skor: null, status: 'Pending Assessment', mitra: 'Mitra Karya Talenta', ekspektasi: 5000000 },
  ],
  penilaian: {}, // { [poolId]: { [modulId]: nilai 1–100 } }
  offers: [{ id: 'o1', talent: 'p1', job: 'j1', status: 'Menunggu jawaban', batas: '2026-11-19' }, { id: 'o2', talent: 'p2', job: 'j11', status: 'Menunggu jawaban', batas: '2026-11-27', dari: 'Branch Surabaya Ops' }],
  remunerations: [
    { id: 'r0', branch: 'b2', bulan: 'Oktober 2026', status: 'Approved', createdAt: '2026-10-19 10:00', submittedAt: '2026-10-19 15:00', thr: false, kak: false, files: ['Permohonan perpanjangan.pdf'], rows: [
      { emp: 'e6', jenis: 'Active', thp: 11000000, skema: 'Normal', additions: [], deductions: [] },
      { emp: 'e7', jenis: 'Renewal', thp: 9500000, skema: 'Normal', start: '2026-11-01', end: '2027-10-31', additions: [], deductions: [] }] },
    { id: 'r8', branch: 'b1', bulan: 'Oktober 2026', status: 'Approved', createdAt: '2026-10-20 14:00', submittedAt: '2026-10-21 09:30', thr: false, kak: false, files: ['Permohonan kontrak baru.pdf'], rows: [
      { emp: 'e1', jenis: 'Renewal', thp: 15000000, skema: 'Normal', start: '2026-12-01', end: '2027-11-30', additions: [], deductions: [] },
      { emp: 'e2', jenis: 'New Hiring', thp: 9000000, skema: 'Normal', start: '2026-12-01', end: '2027-11-30', additions: [], deductions: [] },
      { emp: 'e3', jenis: 'Salary', thp: 10500000, skema: 'Normal', additions: [], deductions: [] },
      { emp: 'e4', jenis: 'New Hiring', thp: 7000000, skema: 'Khusus', start: '2026-12-01', end: '2027-05-31', additions: [], deductions: [] },
      { emp: 'e5', jenis: 'Active', thp: 12000000, skema: 'Normal', additions: [{ tipe: 'Lembur', notes: 'Lembur Hari Kerja 8/10 · 3 jam', nominal: 254335, auto: 'Lembur' }, { tipe: 'Reimburse', notes: 'Kesehatan · Kacamata 6/10', nominal: 350000, auto: 'Reimbursement' }], deductions: [] }] },
    { id: 'r7', branch: 'b1', bulan: 'September 2026', status: 'Rejected', note: 'THP Dimas belum sesuai amandemen terbaru, mohon cek ulang lalu ajukan kembali.', createdAt: '2026-09-18 10:00', submittedAt: '2026-09-18 15:00', thr: false, kak: false, files: [], rows: [
      { emp: 'e4', jenis: 'Salary', thp: 7500000, skema: 'Normal', additions: [], deductions: [] }] },
    { id: 'r1', branch: 'b3', bulan: 'November 2026', status: 'In Review', createdAt: '2026-11-14 11:00', submittedAt: '2026-11-15 08:45', thr: false, kak: false, files: [], rows: [
      { emp: 'e8', jenis: 'Salary', thp: 7000000, skema: 'Normal', additions: [{ keperluan: 'Lembur', nominal: 350000, auto: true }], deductions: [] }] },
  ],
  docPJ: { nama: 'Rani Hapsari', level: 'Manager', role: 'HC Operation', nomorKuasa: 'SK/HC/2026/014', tanggalKuasa: '2026-01-05' },
  docTemplates: {}, // { [jenis dokumen]: { file, text } } — kosong = pakai template bawaan
  docSeq: 14,
  docMessage: { judul: 'Dokumen kontrak menunggu tanda tanganmu', isi: 'Halo! HR mengirim dokumen kontrak untukmu. Buka menu Kontrak, baca dokumennya, tanda tangani, lalu unggah kembali. Hubungi HR bila ada yang tidak sesuai.' },
  contractAgreed: {}, // { [empId]: 'tanggal jam' } persetujuan disclaimer menu Kontrak
  docBatches: [
    { id: 'd5', remun: null, branch: 'b1', bulan: 'Oktober 2025', setelan: 'New Contract Template', status: 'Complete', items: [
      { emp: 'e5', jenis: 'New Hiring', dokumen: 'Offering Letter', setelan: 'New Contract Template', nomor: '021/HC/OL/X/2025', status: 'Full Signed', agreed: true, ready: true, log: { Sent: { file: 'Offering Letter Putri Amalia.pdf', at: '2025-10-17 09:00' }, 'Employee Signed': { file: 'Offering Letter Putri Amalia sign.pdf', at: '2025-10-17 17:00' }, 'Full Signed': { file: 'Offering Letter Putri Amalia full signed.pdf', at: '2025-10-19 13:30' } } },
      { emp: 'e5', jenis: 'New Hiring', dokumen: 'PKWT (Potongan BPJS)', setelan: 'New Contract Template', nomor: '022/HC/PKWT/X/2025', status: 'Full Signed', agreed: true, ready: true, log: { Sent: { file: 'PKWT Putri Amalia.pdf', at: '2025-10-20 14:00' }, 'Employee Signed': { file: 'PKWT Putri Amalia sign.pdf', at: '2025-10-20 21:00' }, 'Full Signed': { file: 'PKWT Putri Amalia full signed.pdf', at: '2025-10-25 09:00' } } }] },
    { id: 'd2', remun: 'r8', branch: 'b1', bulan: 'Oktober 2026', setelan: '', status: 'Process', items: [
      { emp: 'e1', jenis: 'Renewal', dokumen: 'PKWT (Potongan BPJS)', setelan: 'New Contract Template', status: 'None', agreed: false },
      { emp: 'e2', jenis: 'New Hiring', dokumen: 'Offering Letter', setelan: 'New Contract Template', status: 'None', agreed: false },
      { emp: 'e3', jenis: 'Salary', dokumen: 'Amandemen PKWT', setelan: 'New Contract Template', status: 'None', agreed: false },
      { emp: 'e4', jenis: 'New Hiring', dokumen: 'Kontrak Freelance', setelan: 'New Contract Manual', status: 'None', agreed: false }] },
    { id: 'd0', remun: 'r0', branch: 'b2', bulan: 'Oktober 2026', setelan: 'New Contract Template', status: 'Process', items: [
      { emp: 'e7', jenis: 'Renewal', dokumen: 'PKWT (Potongan BPJS)', setelan: 'New Contract Template', nomor: '012/HC/PKWT/X/2026', status: 'Employee Signed', agreed: true, ready: true, log: { Sent: { file: 'PKWT (Potongan BPJS).pdf', at: '2026-10-20 09:00' }, 'Employee Signed': { file: 'PKWT - ttd karyawan.pdf', at: '2026-10-22 10:00' } } }] },
    { id: 'd1', remun: null, branch: 'b1', bulan: 'Oktober 2026', setelan: 'New Contract Template', status: 'Process', items: [
      { emp: 'e5', jenis: 'Salary', dokumen: 'Amandemen PKWT', setelan: 'New Contract Template', nomor: '013/HC/AMD/X/2026', status: 'Sent', agreed: false, ready: true, log: { Sent: { file: 'Amandemen PKWT.pdf', at: '2026-10-25 14:00' } } },
      { emp: 'e0', jenis: 'New Hiring', dokumen: 'Offering Letter', setelan: 'Existing Contract', nomor: '009/HC/OL/X/2026', status: 'Full Signed', agreed: true, ready: true, log: { Sent: { file: 'Offering Letter.pdf', at: '2026-10-02 09:00' }, 'Employee Signed': { file: 'Offering Letter - ttd karyawan.pdf', at: '2026-10-03 11:20' }, 'Full Signed': { file: 'Offering Letter - full signed.pdf', at: '2026-10-04 15:00' } } },
      { emp: 'e6', jenis: 'Renewal', dokumen: 'PKWT (Potongan BPJS)', setelan: 'Existing Contract', nomor: '010/HC/PKWT/X/2026', status: 'Full Signed', agreed: true, ready: true, log: { 'Full Signed': { file: 'PKWT - full signed.pdf', at: '2026-10-06 13:30' } } }] },
  ],
  disbursements: [
    { id: 'x1', branch: 'b2', bulan: 'Oktober 2026', total: 24850000, orang: 2, status: 'Completed' },
    { id: 'x2', branch: 'b1', bulan: 'Oktober 2026', total: 98400000, orang: 6, status: 'Processing' },
  ],
  payslips: [
    { id: 'ps1', emp: 'e5', branch: 'b1', bulan: 'Oktober 2026', thp: 10000000 },
    { id: 'ps2', emp: 'e5', branch: 'b1', bulan: 'September 2026', thp: 10000000 },
    // kontrak sebelumnya (perusahaan lain yang juga memakai Kirana): payslip tetap tersimpan per perusahaan
    { id: 'ps3', emp: 'e5', branch: 'b3', bulan: 'Desember 2024', thp: 7500000 },
    { id: 'ps4', emp: 'e5', branch: 'b3', bulan: 'November 2024', thp: 7500000 },
    { id: 'ps5', emp: 'e5', branch: 'b3', bulan: 'Oktober 2024', thp: 7500000 },
  ],
  attendance: [ // id diisi otomatis di bawah (ATT)
    { emp: 'e5', tanggal: '2026-11-11', masuk: '08:52', pulang: '17:41', status: 'Hadir', lokasi: 'Kantor Jakarta' },
    { emp: 'e5', tanggal: '2026-11-10', masuk: '09:14', pulang: '17:30', status: 'Terlambat', lokasi: 'Kantor Jakarta' },
    { emp: 'e0', tanggal: '2026-11-11', masuk: '08:40', pulang: '17:35', status: 'Hadir', lokasi: 'WFA' },
    { emp: 'e1', tanggal: '2026-11-11', masuk: '—', pulang: '—', status: 'Cuti', lokasi: '—' },
    { emp: 'e3', tanggal: '2026-11-04', masuk: '—', pulang: '—', status: 'Alpha', lokasi: '—' },
    { emp: 'e3', tanggal: '2026-11-05', masuk: '—', pulang: '—', status: 'Alpha', lokasi: '—' },
    ...riwayatPutri(),
  ],
  // Pengaturan Cuti (Figma admin STA): tab Plan / Active / Carry Over / Inactive dihitung dari tanggal aktif + durasi + carry over
  leaveTypes: [
    { id: 'lt1', name: 'Cuti Tahunan', kuota: 12, durasi: 2026, carry: 3, pakai: 'bulanan', aktifSetelah: 0, penerima: '', mulai: '2026-01-01' },
    { id: 'lt2', name: 'Cuti Sakit', kuota: 8, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: '', mulai: '2026-01-01' },
    { id: 'lt3', name: 'Cuti Menikah', kuota: 3, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 3, penerima: '', mulai: '2026-01-01' },
    { id: 'lt4', name: 'Cuti Ibadah', kuota: 5, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 12, penerima: '', mulai: '2026-01-01' },
    { id: 'lt5', name: 'Cuti Melahirkan', kuota: 90, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: 'g:P', mulai: '2026-01-01' },
    { id: 'lt6', name: 'Cuti Tahunan 2027', kuota: 12, durasi: 2027, carry: 3, pakai: 'bulanan', aktifSetelah: 0, penerima: '', mulai: '2027-01-01' },
    { id: 'lt7', name: 'Cuti Tahunan 2025', kuota: 12, durasi: 2025, carry: 12, pakai: 'bulanan', aktifSetelah: 0, penerima: '', mulai: '2025-01-01' },
    { id: 'lt9', name: 'Cuti Tidak Dibayar', kuota: 30, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: '', mulai: '2026-01-01', dibayar: false },
    { id: 'lt8', name: 'Cuti Tahunan 2024', kuota: 12, durasi: 2024, carry: 3, pakai: 'bulanan', aktifSetelah: 0, penerima: '', mulai: '2024-01-01' },
  ],
  leaveTenure: { masa: 2, tambahan: 4 },
  leavePolicy: 'aturan-kebijakan-penggunaan-cuti-012.pdf',
  leaveAdjust: [], // log Talent Setting: { emp, kategori, kuota, terpakai, at, by }
  leaves: [
    { id: 'l1', emp: 'e0', jenis: 'Cuti Tahunan', dari: '2026-11-20', sampai: '2026-11-21', hari: 2, alasan: 'Acara keluarga', status: 'Waiting', line: [{ by: 'Atasan', status: 'Approved' }, { by: 'HR', status: 'Waiting' }] },
    { id: 'l3', emp: 'e0', jenis: 'Cuti Tidak Dibayar', dari: '2026-11-16', sampai: '2026-11-17', hari: 2, alasan: 'Urusan keluarga di luar kota', status: 'Approved', line: [{ by: 'Atasan', status: 'Approved' }, { by: 'HR', status: 'Approved' }] },
    { id: 'l2', emp: 'e5', jenis: 'Cuti Sakit', dari: '2026-10-14', sampai: '2026-10-14', hari: 1, alasan: 'Demam', status: 'Approved', line: [{ by: 'Atasan', status: 'Approved' }, { by: 'HR', status: 'Approved' }] },
  ],
  overtimeTypes: [
    { id: 'ov1', name: 'Lembur Hari Kerja', maks: 40, komponen: 'Persentase Gaji Pokok', nominal: 0, shift: ['Shift 1', 'Shift 2'], hari: 'Hari Kerja', pengali: [{ dari: 1, sampai: 1, x: 1.5 }, { dari: 2, sampai: 8, x: 2 }] },
    { id: 'ov2', name: 'Lembur Hari Libur', maks: 40, komponen: 'Persentase Gaji Pokok', nominal: 0, shift: ['Shift 1', 'Shift 2'], hari: 'Hari Libur', pengali: [{ dari: 1, sampai: 8, x: 2 }, { dari: 9, sampai: 9, x: 3 }, { dari: 10, sampai: 12, x: 4 }] },
    { id: 'ov3', name: 'Lembur Libur Nasional & Cuti Bersama', maks: 40, komponen: 'Nominal Pengali Upah', nominal: 50000, shift: ['Shift 1'], hari: 'Libur Nasional & Cuti Bersama', pengali: [{ dari: 1, sampai: 8, x: 2 }] },
  ],
  // Kliring dari finance (mis. kelebihan bayar bulan lalu) → deduction otomatis di remunerasi periode tsb
  kliring: [{ id: 'k1', emp: 'e1', bulan: 'November 2026', nominal: 250000, notes: 'Kelebihan bayar lembur Oktober 2026' }],
  remunAdj: { 'b1|November 2026': { e0: { additions: [{ tipe: 'Bonus', notes: 'Bonus kinerja Q3', nominal: 1500000 }], deductions: [] } } },
  overtimeSetup: { cutDari: 21, cutSampai: 20, aturan: 'aturan-lembur-2026.pdf' },
  overtimes: [
    { id: 'ot1', emp: 'e5', judul: 'Rilis aplikasi v2', tanggal: '2026-11-08', jam: '19:00–22:00', durasi: 3, tipe: 'Lembur Hari Kerja', status: 'Approved' },
    { id: 'ot2', emp: 'e1', judul: 'Migrasi server', tanggal: '2026-11-09', jam: '20:00–23:00', durasi: 3, tipe: 'Lembur Hari Libur', status: 'Waiting' },
  ],
  reimburseTypes: [
    { id: 'rt1', name: 'Kesehatan', limit: 5000000, penerima: '', bukti: true },
    { id: 'rt2', name: 'Kacamata', limit: 2500000, penerima: '', bukti: true },
    { id: 'rt3', name: 'Perjalanan Dinas', limit: 20000000, penerima: '', bukti: true },
  ],
  reimburseSetup: { tahun: 2026, aturan: '' },
  reimbursements: [
    { id: 'rb1', emp: 'e5', jenis: 'Kesehatan', judul: 'Periksa dokter', tanggal: '2026-11-03', nominal: 350000, status: 'Approved' },
    { id: 'rb2', emp: 'e0', jenis: 'Kacamata', judul: 'Lensa baru', tanggal: '2026-11-05', nominal: 1200000, status: 'Waiting' },
  ],
  invCategories: [{ id: 'ic1', name: 'Alat Kerja' }, { id: 'ic2', name: 'Transportasi' }, { id: 'ic3', name: 'Tunjangan Kantor' }],
  inventories: [
    { id: 'i1', nomor: 'INV-2026-0002', emp: 'e5', kategori: 'Alat Kerja', item: 'Laptop 14"', seri: 'SN-LPT-48213', jumlah: 1, kebutuhan: 'Perangkat kerja harian', tanggal: '2026-10-05', status: 'Accepted', diterima: '2026-10-06', kondisiTerima: 'Baik', catatanAdmin: 'Gunakan untuk keperluan kerja. Jangan pasang aplikasi bajakan.' },
    { id: 'i2', nomor: 'INV-2026-0003', emp: 'e5', kategori: 'Alat Kerja', item: 'Headset', seri: 'SN-HS-77102', jumlah: 1, kebutuhan: 'Rapat daring', tanggal: '2026-11-10', status: 'Waiting', catatanAdmin: 'Dikirim lewat kurir kantor. Cek kelengkapan kabel sebelum menerima.' },
    { id: 'i3', nomor: 'INV-2026-0001', emp: 'e1', kategori: 'Transportasi', item: 'Motor operasional', seri: 'SN-MTR-11902', jumlah: 1, kebutuhan: 'Kunjungan klien', tanggal: '2026-09-14', status: 'Accepted', diterima: '2026-09-15', kondisiTerima: 'Baik' },
    { id: 'i4', nomor: 'INV-2026-0004', emp: 'e3', kategori: 'Alat Kerja', item: 'Laptop 13"', seri: 'SN-LPT-50077', jumlah: 1, kebutuhan: 'Perangkat kerja harian', tanggal: '2026-03-02', status: 'Proses pengembalian', diterima: '2026-03-03', kondisiTerima: 'Baik' },
  ],
  empCategories: [{ id: 'ec1', name: 'Tim Shift Malam', members: ['e4', 'e8'] }],
  org: {
    divisi: [{ id: 'dv1', name: 'Human Capital' }, { id: 'dv2', name: 'Team Product' }, { id: 'dv3', name: 'Engineering' }],
    nodes: [
      { id: 'o0', jabatan: 'Direktur Utama', divisi: '', emp: 'e12', parent: null },
      { id: 'o1', jabatan: 'Head of Human Capital', divisi: 'dv1', emp: 'e7', parent: 'o0' },
      { id: 'o2', jabatan: 'Head of Product', divisi: 'dv2', emp: 'e0', parent: 'o0' },
      { id: 'o3', jabatan: 'Engineering Manager', divisi: 'dv3', emp: 'e1', parent: 'o0' },
      { id: 'o4', jabatan: 'UI/UX Designer', divisi: 'dv2', emp: 'e5', parent: 'o2' },
      { id: 'o5', jabatan: 'Data Analyst', divisi: 'dv2', emp: 'e3', parent: 'o2' },
      { id: 'o6', jabatan: 'Frontend Developer', divisi: 'dv3', emp: 'e6', parent: 'o3' },
      { id: 'o7', jabatan: 'QA Engineer', divisi: 'dv3', emp: 'e4', parent: 'o3' },
      { id: 'o8', jabatan: 'HR Admin Support', divisi: 'dv1', emp: 'e2', parent: 'o1' },
    ],
  },
  resigns: [{ id: 'rs1', emp: 'e3', alasan: 'Melanjutkan studi', diajukan: '2026-11-07', lastDay: '2026-12-12', inventaris: 'Belum lengkap', catatan: 'Ingin fokus kuliah S2 mulai Januari.', lampiran: 'Surat resign.pdf', status: 'Waiting',
    returns: [{ inv: 'i4', kondisi: 'Baik', catatan: 'Lengkap dengan charger dan tas.', fotoKondisi: 'laptop-kondisi.jpg', fotoSeri: 'laptop-seri.jpg', cek: 'Menunggu pemeriksaan' }] }],
  messages: [
    { id: 'm0a', from: 'e5', to: 'e2', judul: 'Bahan rapat Kamis', html: '<p>Kak Sara, bahan rapat Kamis sudah siap belum? Aku mau review dulu ya 🙏</p>', waktu: '2026-11-17 09:05', dibaca: true },
    { id: 'm0b', from: 'e2', to: 'e5', judul: 'Bahan rapat Kamis', html: '<p>Belum, Put. Siang ini aku kabari ya.</p>', waktu: '2026-11-17 09:40', dibaca: true },
    { id: 'm0c', from: 'e9', to: 'e5', judul: 'Desain dashboard Bandung', html: '<p>Halo Putri, boleh minta file Figma dashboard kemarin? Tim Bandung mau pakai sebagai acuan.</p>', waktu: '2026-11-16 13:12', dibaca: true },
    { id: 'm0d', from: 'e5', to: 'e9', judul: 'Desain dashboard Bandung', html: '<p>Boleh banget, sudah aku share ke e-mail kamu ya.</p><ul><li>Dashboard v2</li><li>Komponen tabel</li></ul>', waktu: '2026-11-16 13:30', dibaca: true },
    { id: 'm1', from: 'e2', to: 'e5', judul: 'Bahan rapat Kamis', html: '<p>Hai Putri, bahan rapat Kamis sudah aku taruh di folder tim ya. Tolong cek <b>bagian 3</b> sebelum rapat.</p>', waktu: '2026-11-17 15:20', dibaca: false },
  ],
  feedbacks: [],
  talentAccess: { lowongan: { aktif: 'kunci', resign: true }, jadwal: { aktif: 'kunci', resign: true }, pretest: { aktif: 'kunci', resign: true } },
  talentDemo: {}, // simulasi fase talent di prototipe: { e5: 'resign' | 'selesai' }
  holidays: [
    { tanggal: '2026-12-25', nama: 'Hari Raya Natal' }, { tanggal: '2026-12-24', nama: 'Cuti Bersama Natal' }, { tanggal: '2027-01-01', nama: 'Tahun Baru 2027' },
  ],
  blackout: [{ dari: '2026-11-26', sampai: '2026-11-27', nama: 'Tutup buku kuartal' }],
  // Event (menu Event admin). gambar = data URL hasil crop 1:1, null = belum ada gambar
  events: [
    { id: 'ev1', branch: 'b1', tanggal: '2026-11-18', mulai: '09:15', selesai: '10:45', judul: 'Kickoff proyek integrasi HRIS', gambar: null, peserta: 'all', kategori: 'In Office', link: '', deskripsi: 'Menyamakan tujuan, pembagian peran, dan target tiga bulan pertama proyek.' },
    { id: 'ev2', branch: 'b1', tanggal: '2026-11-19', mulai: '14:00', selesai: '15:30', judul: 'Review kuartal: strategi produk & metrik', gambar: null, peserta: ['e1', 'e2', 'e3'], kategori: 'Online', link: 'https://meet.google.com/abc-defg-hij', deskripsi: 'Membahas capaian Q3, metrik utama, dan rencana Q4.' },
    { id: 'ev3', branch: 'b1', tanggal: '2026-11-19', mulai: '16:00', selesai: '17:00', judul: 'Pelatihan desain API', gambar: null, peserta: ['e1', 'e2'], kategori: 'Online', link: 'https://meet.google.com/xyz-uvwx-yzz', deskripsi: 'Prinsip desain API, praktik integrasi, dan keamanan koneksi antar layanan.' },
    { id: 'ev4', branch: 'all', tanggal: '2026-11-25', mulai: '10:00', selesai: '11:00', judul: 'Townhall Q4 2026 (semua Branch)', gambar: null, peserta: 'all', kategori: 'Online', link: 'https://meet.google.com/twn-hall-q4', deskripsi: 'Update perusahaan dan sesi tanya jawab bersama manajemen.' },
    { id: 'ev5', branch: 'b2', tanggal: '2026-11-20', mulai: '13:00', selesai: '14:30', judul: 'Workshop DevOps', gambar: null, peserta: 'all', kategori: 'In Office', link: '', deskripsi: 'Praktik CI/CD dan pemantauan layanan.' },
    { id: 'ev6', branch: 'b1', tanggal: '2026-12-10', mulai: '15:00', selesai: '16:30', judul: 'Tech talk: AI untuk tim operasional', gambar: null, peserta: 'all', kategori: 'Online', link: 'https://meet.google.com/ait-alkx-opr', deskripsi: 'Berbagi contoh pemakaian AI dalam pekerjaan sehari-hari.' },
  ],
  // Master Calendar per Branch per tahun (Setup Aktivitas › Kalender)
  calendars: Object.fromEntries(['b1', 'b2', 'b3'].map((b) => [b, {
    2026: { libur: ['Sabtu', 'Minggu'], nasional: [{ tanggal: '2026-12-24', nama: 'Cuti Bersama Natal' }, { tanggal: '2026-12-25', nama: 'Hari Raya Natal' }], blackout: [{ tanggal: '2026-11-26', nama: 'Tutup buku kuartal' }, { tanggal: '2026-11-27', nama: 'Tutup buku kuartal' }] },
    2027: { libur: ['Sabtu', 'Minggu'], nasional: [{ tanggal: '2027-01-01', nama: 'Tahun Baru 2027' }], blackout: [] },
  }])),
  // Setup Absen per Branch (Setup Aktivitas › Absensi), mengikuti alur Scala admin /absensi/setup
  absenSetup: Object.fromEntries([['b1', 'Kantor Jakarta', -6.2246, 106.8466, 'Jl. Dr. Saharjo No. 222, Menteng Dalam, Tebet, Jakarta Selatan'], ['b2', 'Kantor Bandung', -6.9147, 107.6098, 'Jl. Asia Afrika No. 8, Sumur Bandung, Kota Bandung'], ['b3', 'Kantor Surabaya', -7.2575, 112.7521, 'Jl. Pemuda No. 31, Embong Kaliasin, Surabaya']].map(([b, nama, lat, lng, alamat]) => [b, {
    mode: { WFO: true, WFA: b !== 'b3' },
    lokasi: [{ id: b + 'l1', nama, aktif: true, lat, lng, alamat, radius: 100 }],
    shifts: [{ id: b + 's1', nama: 'Shift 1', aktif: true, masukDari: '08:30', masukSampai: '09:00', pulangDari: '17:00', pulangSampai: '17:59' }, { id: b + 's2', nama: 'Shift 2', aktif: b === 'b1', masukDari: '10:00', masukSampai: '10:30', pulangDari: '18:30', pulangSampai: '18:59' }],
    kesehatan: [{ id: b + 'h1', nama: 'Sehat', aktif: true }, { id: b + 'h2', nama: 'Sakit', aktif: true }, { id: b + 'h3', nama: 'Kurang Fit', aktif: true }],
  }])),
  approvalLine: [
    { modul: 'Cuti', aktif: true, level: ['Atasan langsung', 'HR'] },
    { modul: 'Lembur', aktif: true, level: ['Atasan langsung', 'HR'] },
    { modul: 'Reimbursement', aktif: true, level: ['Atasan langsung', 'Manager', 'HR'] },
    { modul: 'Koreksi Absensi', aktif: false, level: ['HR'] },
    { modul: 'Resign', aktif: true, level: ['Atasan langsung', 'HR'] },
  ],
  admins: [
    { id: 'a1', adminId: '0000506701', divisi: 'Human Capital', jabatan: 'Staff', aktif: true, name: 'Dewi Anggraini', email: 'dewi@kirana.id', role: 'Admin Operasional', branches: ['b1', 'b2'], perms: ['dashboard', 'talent-pool', 'pretest', 'penilaian', 'data-karyawan', 'absensi', 'cuti', 'lembur', 'reimbursement'] },
    { id: 'a2', adminId: '0000506702', divisi: 'Finance', jabatan: 'Staff', aktif: true, name: 'Bayu Santoso', email: 'bayu@kirana.id', role: 'Admin Operasional', branches: ['b3'], perms: ['dashboard', 'approval-remunerasi', 'send-document', 'disbursement', 'payslip-admin'] },
  ],
  masters: Object.fromEntries(Object.entries({ 'Keuntungan dari Perusahaan': ['BPJS Kesehatan', 'BPJS Ketenagakerjaan', 'THR', 'Laptop kerja'], 'Lokasi Kerja': ['Jakarta Selatan, DKI Jakarta', 'Bandung, Jawa Barat', 'Surabaya, Jawa Timur'], Pendidikan: ['SMA/SMK', 'Diploma/Sarjana S1', 'Sarjana S2/S3', 'Sertifikat Keahlian'], Pengalaman: ['0–2 tahun', '2–4 tahun', '4–6 tahun', 'Lebih dari 6 tahun'], 'Spesialisasi Pekerjaan': ['Backend Developer', 'Admin Support', 'UI/UX Designer', 'Data Analyst', 'Digital Marketing'], 'Tingkat Pekerjaan': ['Staf (Non Manajemen & Non Supervisor)', 'Supervisor', 'Manajer'] }).map(([k, v]) => [k, v.map((name, i) => ({ id: k[0] + k.length + i, name, aktif: true }))])),
  mitras: [
    { id: 'm1', name: 'Mitra Karya Talenta', pic: 'Hana Prameswari', telp: '0812-5550-144', email: 'hana@karyatalenta.id', talent: 3, diundang: 2, diproses: 1, terpilih: 1 },
  ],
  pretests: [
    { spesialisasi: 'Backend Developer', modul: ['Interview Dasar', 'Tes Potensi Akademik', 'Tes Coding'] },
    { spesialisasi: 'Admin Support', modul: ['Interview Dasar', 'Psikotes DISC', 'Tes Excel'] },
    { spesialisasi: 'UI/UX Designer', modul: ['Interview User', 'Tes Photoshop'] },
  ],
  blasts: [{ id: 'bl0', isi: 'Kantor libur cuti bersama 24–26 Desember 2026.', judul: 'Pengumuman Cuti Bersama Akhir Tahun', ke: 'Semua', tanggal: '2026-11-10' }],
  inbox: [
    { id: 'n0a', to: 'admin', judul: 'Resign: cek pengembalian barang', isi: 'Rizky Pratama mengajukan resign (hari terakhir 2026-12-12). 1 barang perlu diperiksa saat pengembalian.', waktu: '2026-11-07 10:12', link: 'resign/rs1' },
    { id: 'n0b', to: 'branch', branch: 'b1', judul: 'Resign: cek pengembalian barang', isi: 'Rizky Pratama mengajukan resign (hari terakhir 2026-12-12). 1 barang perlu diperiksa saat pengembalian.', waktu: '2026-11-07 10:12', link: 'data-karyawan' },
    { id: 'n1', to: 'talent', judul: 'Payslip Oktober 2026 sudah terbit', isi: 'Silakan cek menu Payslip.', waktu: '2026-11-01 10:00' },
    { id: 'n2', to: 'talent', judul: 'Pengingat clock in', isi: 'Jangan lupa clock in sebelum 09:00 ya!', waktu: '2026-11-12 07:45' },
    // Notifikasi akun kandidat (emp = id talent penerima; tanpa emp = karyawan)
    { id: 'n-s1', to: 'talent', emp: 'p2', judul: 'Tawaran baru: Sales Executive', isi: 'Branch Surabaya Ops menawarkan posisi Sales Executive dari Talent Pool. Jawab sebelum 27 Nov 2026.', waktu: '2026-11-18 10:05', menu: 'lowongan' },
    { id: 'n-s2', to: 'talent', emp: 'p2', judul: 'Lamaran terkirim: Marketing Staff', isi: 'Lamaranmu di Branch Jakarta Digital sedang di tahap Tes tulis.', waktu: '2026-11-16 19:20', menu: 'lowongan' },
    { id: 'n-r1', to: 'talent', emp: 'p5', judul: 'Jadwal wawancara terkonfirmasi', isi: 'Backend Engineer · Selasa, 24 Nov 2026 pukul 10:00 WIB (online). Link meeting ada di menu Jadwal Wawancara.', waktu: '2026-11-14 09:30', menu: 'jadwal' },
    { id: 'n-r2', to: 'talent', emp: 'p5', judul: 'Selamat, kamu lolos ke tahap 4', isi: 'Lamaran Backend Engineer di Branch Jakarta Digital masuk tahap Wawancara & penilaian.', waktu: '2026-11-13 16:10', menu: 'lowongan' },
  ],
  clock: { in: null, out: null },
})
