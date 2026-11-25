import { seedTalentPool, seedMitraExtra } from './talentPool.js'
import { mergeTalent, payslipBranch } from './talentSeed.js'
import { seedHamparan, seedHamparanToday } from './hamparan.js'
import { rnd as rndH } from './rootSeed.js'
import { isWorkday as isWdH } from '../services/attendance.js'
import { seedBlasts } from './blasts.js'
import { calcRemunRow, DEFAULT_SETUP } from '../services/payroll.js'
import { rootSeed } from './rootSeed.js'
import { auditSeed, enrich } from './rootAudit.js'
import { seedAttendanceYear } from '../services/attendance.js'
import { seedAssets } from './assets.js'
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


// ---------- Contoh pengajuan remunerasi Branch Jakarta Digital (7 per status) ----------
const EB = { // data dasar karyawan b1 (sama dengan employees di bawah)
  e0: { thp: 12000000, skema: 'Normal', type: 'Kontrak', role: 'Product Designer', level: 'Middle', start: '2025-01-06', end: '2026-12-31' },
  e1: { thp: 15000000, skema: 'Normal', type: 'Kontrak', role: 'Backend Engineer', level: 'Senior', start: '2025-01-06', end: '2026-12-31' },
  e2: { thp: 4500000, skema: 'Khusus', type: 'Magang', role: 'Admin Support', level: 'Junior', start: '2025-01-06', end: '2026-12-31' },
  e3: { thp: 9500000, skema: 'Normal', type: 'Kontrak', role: 'Data Analyst', level: 'Junior', start: '2025-01-06', end: '2026-11-30' },
  e4: { thp: 7000000, skema: 'Normal', type: 'Freelance', role: 'QA Engineer', level: 'Junior', start: '2025-01-06', end: '2026-12-15' },
  e5: { thp: 10000000, skema: 'Normal', type: 'Kontrak', role: 'UI/UX Designer', level: 'Junior', start: '2025-01-06', end: '2026-12-31' },
  e9: { thp: 13500000, skema: 'Normal', type: 'Kontrak', role: 'Backend Engineer', level: 'Middle', start: '2025-01-06', end: '2027-01-05' },
  e14: { thp: 8500000, skema: 'Normal', type: 'Kontrak', role: 'Finance Staff', level: 'Junior', start: '2025-01-06', end: '2026-12-31' },
}
const A = (kategori, keperluan, nominal) => ({ kategori, keperluan, nominal })
const W = (emp, jenis, o = {}) => ({ emp, jenis, ...EB[emp], additions: [], deductions: [], ...o })
const RB = (id, bulan, status, rows, o = {}) => ({ id, branch: 'b1', bulan, status, thr: false, kak: false, files: [], rows, ...o })
const REMUN_B1 = [
  // Approved
  RB('r3', 'April 2026', 'Approved', [W('e0', 'Active'), W('e1', 'Active'), W('e5', 'Active')], { files: ['Rekap absensi April.pdf'] }),
  RB('r4', 'Mei 2026', 'Approved', [W('e0', 'Active', { additions: [A('Overtime', 'Lembur rilis versi 2.1 (6 jam)', 416185)] }), W('e1', 'Active'), W('e2', 'Active'), W('e5', 'Active')]),
  RB('r5', 'Juni 2026', 'Approved', [W('e0', 'Active'), W('e1', 'Salary', { thp: 16500000 }), W('e3', 'Active'), W('e5', 'Active')], { files: ['Memo kenaikan gaji Kevin.pdf'] }),
  RB('r6', 'Juli 2026', 'Approved', [W('e0', 'Active'), W('e1', 'Active', { thp: 16500000 }), W('e2', 'Active'), W('e4', 'Active', { deductions: [A('Potongan Absen', 'Alpa 2 hari', 636364)] }), W('e9', 'Active'), W('e14', 'Active')]),
  RB('r7', 'Agustus 2026', 'Approved', [W('e0', 'Active', { additions: [A('Bonus', 'Bonus proyek dashboard', 2000000)] }), W('e3', 'Active'), W('e5', 'Active'), W('e9', 'Active'), W('e14', 'Active')]),
  RB('r8', 'September 2026', 'Approved', [W('e0', 'Active'), W('e1', 'Active', { thp: 16500000 }), W('e2', 'Active'), W('e3', 'Active'), W('e5', 'Active', { additions: [A('Rapel', 'Rapel kekurangan gaji Agustus', 750000)] }), W('e9', 'Active'), W('e14', 'Active')]),
  RB('r9', 'Oktober 2026', 'Approved', [W('e0', 'Active'), W('e1', 'Active', { thp: 16500000 }), W('e2', 'Active'), W('e3', 'Active'), W('e4', 'Active'), W('e5', 'Salary', { thp: 11000000 }), W('e9', 'Active'), W('e14', 'Active')], { files: ['Rekap absensi Oktober.pdf', 'Memo kenaikan gaji Putri.pdf'] }),
  // Rejected
  RB('r10', 'Mei 2026', 'Rejected', [W('e1', 'Salary', { thp: 18000000 })], { note: 'Kenaikan gaji 20% belum disertai memo persetujuan direksi.' }),
  RB('r11', 'Juni 2026', 'Rejected', [W('e4', 'Renewal', { start: '2026-07-01', end: '2027-06-30' })], { note: 'Tanggal mulai kontrak baru tumpang tindih dengan kontrak berjalan.' }),
  RB('r12', 'Juli 2026', 'Rejected', [W('e0', 'Active', { additions: [A('Bonus', 'Bonus kinerja Q2', 5000000)] }), W('e5', 'Active')], { note: 'Bonus kinerja Q2 belum masuk anggaran Branch. Ajukan ulang tanpa bonus.' }),
  RB('r13', 'Agustus 2026', 'Rejected', [W('e3', 'Duration', { end: '2027-05-31' })], { note: 'Perpanjangan durasi butuh lampiran evaluasi kinerja.' }),
  RB('r14', 'September 2026', 'Rejected', [W('e2', 'Active', { additions: [A('Overtime', 'Lembur akhir pekan (16 jam)', 520000)] })], { note: 'Lembur akhir pekan belum di-approve di menu Lembur.' }),
  RB('r15', 'Oktober 2026', 'Rejected', [W('e4', 'Resign', { end: '2026-10-31', deductions: [A('Kliring', 'Pengembalian laptop belum diterima', 1500000)] })], { note: 'Surat resign belum ditandatangani. Lampirkan dokumen resign.' }),
  RB('r16', 'November 2026', 'Rejected', [W('e0', 'Active'), W('e1', 'Active', { thp: 16500000, deductions: [A('Potongan Absen', 'Terlambat 6 kali', 300000)] })], { note: 'Potongan absen tidak sesuai rekap absensi (seharusnya 4 kali terlambat).' }),
  // In Review
  RB('r17', 'November 2026', 'In Review', [W('e0', 'Active'), W('e1', 'Active', { thp: 16500000 }), W('e2', 'Active'), W('e5', 'Active', { thp: 11000000 })], { files: ['Rekap absensi November.pdf'] }),
  RB('r18', 'November 2026', 'In Review', [W('e3', 'Renewal', { start: '2026-12-01', end: '2027-11-30', thp: 10000000 })], { kak: true, files: ['Evaluasi kinerja Gavin.pdf'] }),
  RB('r19', 'November 2026', 'In Review', [W('e4', 'Duration', { end: '2027-03-31' })]),
  RB('r20', 'November 2026', 'In Review', [W('e0', 'Active', { additions: [A('Rapel', 'Rapel lembur Oktober', 480000)] }), W('e5', 'Active', { thp: 11000000, additions: [A('Lain-lain', 'Tunjangan pulsa', 200000)] })]),
  RB('r21', 'November 2026', 'In Review', [W('e1', 'Salary', { thp: 17500000 })], { files: ['Memo kenaikan gaji Kevin 2026.pdf'] }),
  RB('r22', 'Desember 2026', 'In Review', [W('e0', 'Active'), W('e1', 'Active', { thp: 16500000 }), W('e2', 'Active'), W('e5', 'Active', { thp: 11000000 })], { thr: true }),
  RB('r23', 'Desember 2026', 'In Review', [W('e0', 'Active'), W('e5', 'Active', { thp: 11000000 })], { kak: true, files: ['Rekap masa kontrak.pdf'] }),
  // Draft
  RB('r24', 'November 2026', 'Draft', [W('e2', 'Active', { additions: [A('Overtime', 'Lembur stock opname (4 jam)', 83237)] })]),
  RB('r25', 'November 2026', 'Draft', [W('e0', 'Active', { additions: [A('Bonus', 'Bonus desain ulang aplikasi', 1500000)] })]),
  RB('r26', 'Desember 2026', 'Draft', [W('e0', 'Active'), W('e1', 'Active', { thp: 16500000 }), W('e5', 'Active', { thp: 11000000 })]),
  RB('r27', 'Desember 2026', 'Draft', [W('e3', 'Resign', { end: '2026-12-31', deductions: [A('Kliring', 'Sisa pinjaman koperasi', 750000)] })]),
  RB('r28', 'Desember 2026', 'Draft', [W('e4', 'Renewal', { start: '2026-12-16', end: '2027-12-15', thp: 7500000 })], { kak: true }),
  RB('r29', 'Desember 2026', 'Draft', [W('e2', 'Salary', { thp: 5000000 }), W('e5', 'Active', { thp: 11000000, deductions: [A('Potongan Absen', 'Izin tanpa keterangan 1 hari', 500000)] })]),
  RB('r30', 'Januari 2027', 'Draft', [W('e0', 'Active'), W('e1', 'Active', { thp: 16500000 }), W('e2', 'Active'), W('e5', 'Active', { thp: 11000000 })], { thr: true }),
]

const baseSeed = () => ({
  pretestSets: structuredClone(PRETEST_SETS),
  setup: null,
  branches: BRANCHES,
  employees: [
    emp(0, { role: 'Product Designer', level: 'Middle', thp: 12000000 }),
    emp(1, { role: 'Backend Engineer', level: 'Senior', thp: 15000000 }),
    emp(2, { role: 'Admin Support', type: 'Magang', thp: 4500000, skema: 'Khusus', bankOk: false }),
    emp(3, { role: 'Data Analyst', thp: 9500000, end: '2026-11-30' }),
    emp(4, { role: 'QA Engineer', type: 'Freelance', thp: 7000000, bankOk: false, end: '2026-12-15' }),
    emp(5, { role: 'UI/UX Designer', thp: 10000000, branch: 'b1' }),
    emp(6, { role: 'Frontend Developer', branch: 'b2', thp: 11000000, shift: 'Shift 2' }),
    emp(7, { role: 'Business Analyst', branch: 'b2', thp: 9000000, doc: 'Employee Signed' }),
    emp(8, { role: 'IT Support', branch: 'b3', thp: 6500000, shift: 'Shift Pagi Ops', jalur: 'Non-Selection', doc: 'Sent' }),
    emp(9, { name: 'M. Atharrazka', kelamin: 'Laki-laki', role: 'Backend Engineer', level: 'Middle', thp: 13500000, end: '2027-01-05', divisi: 'Engineering' }),
    emp(10, { name: 'Yuriansyah', kelamin: 'Laki-laki', role: 'Teknisi Gudang', branch: 'b3', thp: 6000000, shift: 'Shift Pagi Ops', divisi: 'Operasional', bank: 'MDR' }),
    emp(11, { name: 'Dewi Amalia', kelamin: 'Perempuan', role: 'HR Generalist', branch: 'b2', thp: 8800000, divisi: 'Human Capital', bank: 'BNI' }),
    emp(12, { name: 'Dhini Anastasya', kelamin: 'Perempuan', role: 'Digital Marketing', branch: 'b2', thp: 7800000, start: '2026-02-02', end: '2027-02-01', divisi: 'Team Product', bankOk: false }),
    emp(13, { name: 'Rudi Hartanta', kelamin: 'Laki-laki', role: 'Supervisor Operasional', level: 'Senior', branch: 'b3', thp: 9800000, shift: 'Shift Pagi Ops', divisi: 'Operasional', bank: 'MDR' }),
    emp(14, { name: 'Novi Permatasari', kelamin: 'Perempuan', role: 'Finance Staff', thp: 8500000, divisi: 'Human Capital', bank: 'BCA' }),
    emp(15, { name: 'Sekar Ayu Larasati', kelamin: 'Perempuan', role: 'General Affairs (pengelola aset)', thp: 8200000, divisi: 'Human Capital' }),
    emp(16, { name: 'Fajar Ramadhan', kelamin: 'Laki-laki', role: 'Driver Operasional', branch: 'b3', thp: 5600000, shift: 'Shift Pagi Ops', divisi: 'Operasional', bank: 'MDR' }),
    emp(17, { name: 'Hendra Gunawan', kelamin: 'Laki-laki', role: 'IT Support', branch: 'b2', thp: 7600000, start: '2026-04-06', end: '2027-04-05', divisi: 'Engineering', bank: 'BNI' }),
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
      { emp: 'e7', jenis: 'Renewal', thp: 9500000, skema: 'Normal', start: '2026-11-01', end: '2027-10-31', additions: [], deductions: [] },
      { emp: 'e11', jenis: 'Active', thp: 8800000, skema: 'Normal', additions: [], deductions: [] },
      { emp: 'e12', jenis: 'Active', thp: 7800000, skema: 'Normal', additions: [{ kategori: 'Overtime', keperluan: 'Lembur kampanye 11.11 (4 jam)', nominal: 280000 }], deductions: [] }] },
    { id: 'r1', branch: 'b3', bulan: 'November 2026', status: 'In Review', thr: false, kak: false, files: [], rows: [
      { emp: 'e8', jenis: 'Salary', thp: 7000000, skema: 'Normal', additions: [{ keperluan: 'Lembur', nominal: 350000, auto: true }], deductions: [] },
      { emp: 'e10', jenis: 'Active', thp: 6000000, skema: 'Normal', additions: [], deductions: [] },
      { emp: 'e13', jenis: 'Active', thp: 9800000, skema: 'Normal', additions: [{ kategori: 'Overtime', keperluan: 'Lembur stock opname', nominal: 520000 }], deductions: [] }] },
    { id: 'rx1', branch: 'b2', bulan: 'November 2026', status: 'In Review', thr: false, kak: false, files: ['Rekap lembur November.pdf'], rows: [
      { emp: 'e6', jenis: 'Active', thp: 11000000, skema: 'Normal', additions: [{ kategori: 'Overtime', keperluan: 'Lembur rilis aplikasi (5 jam)', nominal: 400000 }], deductions: [] },
      { emp: 'e7', jenis: 'Active', thp: 9500000, skema: 'Normal', additions: [], deductions: [] },
      { emp: 'e11', jenis: 'Active', thp: 8800000, skema: 'Normal', additions: [], deductions: [] },
      { emp: 'e12', jenis: 'Active', thp: 7800000, skema: 'Normal', additions: [], deductions: [] }] },
    { id: 'rx2', branch: 'b2', bulan: 'September 2026', status: 'Rejected', thr: false, kak: false, files: [], note: 'Lembur 12 jam belum dilampiri rekap lembur yang disetujui atasan.', rows: [
      { emp: 'e6', jenis: 'Active', thp: 11000000, skema: 'Normal', additions: [{ kategori: 'Overtime', keperluan: 'Lembur 12 jam', nominal: 960000 }], deductions: [] }] },
    { id: 'rx3', branch: 'b2', bulan: 'Desember 2026', status: 'Approved', thr: false, kak: false, files: [], rows: [
      { emp: 'e6', jenis: 'Active', thp: 11000000, skema: 'Normal', additions: [], deductions: [] },
      { emp: 'e7', jenis: 'Active', thp: 9500000, skema: 'Normal', additions: [], deductions: [] }] },
    { id: 'rx4', branch: 'b3', bulan: 'Agustus 2026', status: 'Rejected', thr: false, kak: false, files: [], note: 'Nominal lembur tidak sesuai rekap absensi Agustus.', rows: [
      { emp: 'e8', jenis: 'Active', thp: 6500000, skema: 'Normal', additions: [{ kategori: 'Overtime', keperluan: 'Lembur shift pagi', nominal: 750000 }], deductions: [] }] },
    { id: 'rx5', branch: 'b3', bulan: 'Desember 2026', status: 'In Review', thr: false, kak: false, files: [], rows: [
      { emp: 'e8', jenis: 'Active', thp: 6500000, skema: 'Normal', additions: [], deductions: [{ kategori: 'Potongan Absen', keperluan: 'Alpa 1 hari', nominal: 250000 }] }] },
    ...structuredClone(REMUN_B1),
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
  // Virtual Account untuk pengiriman gaji (kategori pengiriman, sesuai Figma Scala)
  virtualAccounts: [
    { id: 'va1', nomor: '8808 1200 0001 001', aktif: true, dibuat: '2026-01-05', nama: 'Kantor Pusat', bank: 'BWS', deskripsi: 'Cabang: Jakarta · Menerima transfer dari bank selain Bank Woori' },
    { id: 'va2', nomor: '3901 0877 2201 002', aktif: true, dibuat: '2026-01-05', nama: 'Kantor Cabang: Karyawan Kontrak', bank: 'BCA', deskripsi: 'Cabang: Bandung, Surabaya, Jakarta · Menerima transfer dari bank selain BCA' },
    { id: 'va3', nomor: '9881 2201 5501 003', aktif: true, dibuat: '2026-01-05', nama: 'Kantor Cabang: Karyawan Magang', bank: 'BNI', deskripsi: 'Cabang: Bandung, Surabaya, Jakarta · Menerima transfer dari bank selain BNI' },
    { id: 'va4', nomor: '8900 8877 6601 004', aktif: true, dibuat: '2026-01-05', nama: 'Kantor Cabang: Karyawan Freelance', bank: 'MDR', deskripsi: 'Cabang: Bandung, Surabaya, Jakarta · Menerima transfer dari bank selain Bank Mandiri' },
  ],
  disbursements: [], // diisi otomatis dari remunerasi Approved (lihat seed() di bawah)
  payslips: [], // diisi otomatis dari disbursement yang Success (lihat seed() di bawah)
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
    { id: 'lt1', name: 'Cuti Tahunan', kuota: 12, maksBerturut: 3, durasi: 2026, carry: 3, pakai: 'bulanan', aktifSetelah: 0, penerima: '', mulai: '2026-01-01' },
    { id: 'lt2', kelompok: 'Izin', bukti: 'Surat dokter', name: 'Cuti Sakit', kuota: 8, maksBerturut: 3, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: '', mulai: '2026-01-01' },
    { id: 'lt3', name: 'Cuti Menikah', kuota: 3, maksBerturut: 3, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 3, penerima: '', mulai: '2026-01-01' },
    { id: 'lt4', name: 'Cuti Ibadah', kuota: 5, maksBerturut: 10, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 12, penerima: '', mulai: '2026-01-01' },
    { id: 'lt5', name: 'Cuti Melahirkan', kuota: 90, maksBerturut: 90, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: 'g:P', mulai: '2026-01-01' },
    { id: 'lt9', kelompok: 'Izin', bukti: '', name: 'Izin Sakit (tanpa surat dokter)', kuota: 6, maksBerturut: 1, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: '', mulai: '2026-01-01' },
    { id: 'lt10', kelompok: 'Izin', bukti: 'Surat/undangan resmi', name: 'Izin Resmi', kuota: 3, maksBerturut: 3, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: '', mulai: '2026-01-01' },
    { id: 'lt11', kelompok: 'Izin', bukti: 'Surat tugas', tanpaKuota: true, name: 'Dinas Luar', kuota: 0, maksBerturut: 0, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: '', mulai: '2026-01-01' },
    { id: 'lt12', kelompok: 'Izin', bukti: '', name: 'Cuti Tidak Dibayar', kuota: 30, maksBerturut: 30, durasi: 2026, carry: 0, pakai: 'sekaligus', aktifSetelah: 0, penerima: '', mulai: '2026-01-01', dibayar: false }, // gaji dipotong (Remunerasi › Sinkron)
    { id: 'lt6', name: 'Cuti Tahunan 2027', kuota: 12, maksBerturut: 3, durasi: 2027, carry: 3, pakai: 'bulanan', aktifSetelah: 0, penerima: '', mulai: '2027-01-01' },
    { id: 'lt7', name: 'Cuti Tahunan 2025', kuota: 12, maksBerturut: 3, durasi: 2025, carry: 12, pakai: 'bulanan', aktifSetelah: 0, penerima: '', mulai: '2025-01-01' },
    { id: 'lt8', name: 'Cuti Tahunan 2024', kuota: 12, maksBerturut: 3, durasi: 2024, carry: 3, pakai: 'bulanan', aktifSetelah: 0, penerima: '', mulai: '2024-01-01' },
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
  invCategories: [{ id: 'ic1', name: 'Alat Kerja' }, { id: 'ic2', name: 'Transportasi' }, { id: 'ic3', name: 'Tunjangan Kantor' }, { id: 'ic4', name: 'Elektronik Kantor' }, { id: 'ic5', name: 'Furnitur' }, { id: 'ic6', name: 'Perlengkapan K3' }],
  inventories: [
    { id: 'i1', nomor: 'INV-2026-0002', emp: 'e5', kategori: 'Alat Kerja', item: 'Laptop 14"', kebutuhan: 'Perangkat kerja harian', tanggal: '2026-10-05', status: 'Accepted' },
    { id: 'i2', nomor: 'INV-2026-0003', emp: 'e5', kategori: 'Alat Kerja', item: 'Headset', kebutuhan: 'Rapat daring', tanggal: '2026-11-10', status: 'Waiting' },
    { id: 'i3', nomor: 'INV-2026-0001', emp: 'e1', kategori: 'Transportasi', item: 'Motor operasional', kebutuhan: 'Kunjungan klien', tanggal: '2026-09-14', status: 'Accepted' },
    { id: 'i4', nomor: 'INV-2026-0004', emp: 'e0', kategori: 'Alat Kerja', item: 'MacBook Air 13" · SN C02X91', kebutuhan: 'Desain produk', tanggal: '2026-02-03', status: 'Accepted' },
    { id: 'i5', nomor: 'INV-2026-0005', emp: 'e0', kategori: 'Alat Kerja', item: 'Monitor 24" Dell', kebutuhan: 'Layar kedua untuk desain', tanggal: '2026-02-03', status: 'Returned', tanggalKembali: '2026-08-14', kondisi: 'Baik', catatanKembali: 'Diganti monitor 27"' },
    { id: 'i6', nomor: 'INV-2026-0006', emp: 'e0', kategori: 'Alat Kerja', item: 'Monitor 27" LG UltraFine', kebutuhan: 'Review desain resolusi tinggi', tanggal: '2026-08-14', status: 'Accepted' },
    { id: 'i7', nomor: 'INV-2026-0007', emp: 'e0', kategori: 'Tunjangan Kantor', item: 'Kartu akses gedung #A-0198', kebutuhan: 'Akses kantor Jakarta', tanggal: '2026-02-03', status: 'Accepted' },
    { id: 'i8', nomor: 'INV-2026-0008', emp: 'e0', kategori: 'Alat Kerja', item: 'iPad 10 + Apple Pencil', kebutuhan: 'Sketsa & uji prototipe', tanggal: '2026-11-17', status: 'Waiting' },
    { id: 'i9', nomor: 'INV-2026-0009', emp: 'e2', kategori: 'Alat Kerja', item: 'Laptop 14" Lenovo · SN PF3K22', kebutuhan: 'Perangkat magang', tanggal: '2026-03-02', status: 'Returned', tanggalKembali: '2026-09-02', kondisi: 'Rusak ringan', catatanKembali: 'Engsel layar longgar, sudah diservis' },
    { id: 'i10', nomor: 'INV-2026-0010', emp: 'e3', kategori: 'Alat Kerja', item: 'Laptop 14" ASUS · SN M7N0A1', kebutuhan: 'Analisis data', tanggal: '2026-01-12', status: 'Accepted' },
    { id: 'i11', nomor: 'INV-2026-0011', emp: 'e3', kategori: 'Transportasi', item: 'Kartu e-toll operasional', kebutuhan: 'Perjalanan ke klien', tanggal: '2026-04-20', status: 'Returned', tanggalKembali: '2026-10-01', kondisi: 'Baik' },
    { id: 'i13', nomor: 'INV-2026-0013', emp: 'e4', kategori: 'Alat Kerja', item: 'Laptop 14" HP ProBook · SN 5CD2231', kebutuhan: 'Perangkat QA', tanggal: '2026-01-12', status: 'Accepted' },
    { id: 'i14', nomor: 'INV-2026-0014', emp: 'e4', kategori: 'Tunjangan Kantor', item: 'Kartu akses gedung #A-0211', kebutuhan: 'Akses kantor Jakarta', tanggal: '2026-01-12', status: 'Accepted' },
    { id: 'i15', nomor: 'INV-2026-0015', emp: 'e8', kategori: 'Alat Kerja', item: 'Laptop ThinkPad E14 · SN PF4X09', kebutuhan: 'Perangkat IT Support', tanggal: '2025-02-03', status: 'Accepted' },
    { id: 'i16', nomor: 'INV-2026-0016', emp: 'e8', kategori: 'Transportasi', item: 'Motor operasional B 4421 SBY', kebutuhan: 'Kunjungan gudang', tanggal: '2025-06-10', status: 'Accepted' },
    { id: 'i17', nomor: 'INV-2026-0017', emp: 'e7', kategori: 'Alat Kerja', item: 'Laptop 14" Acer · SN NXA77', kebutuhan: 'Analisis bisnis', tanggal: '2025-03-01', status: 'Returned', tanggalKembali: '2026-11-16', kondisi: 'Baik', catatanKembali: 'Dikembalikan saat notice period resign' },
    { id: 'i18', nomor: 'INV-2026-0018', emp: 'e6', kategori: 'Alat Kerja', item: 'Monitor 24" Samsung', kebutuhan: 'Layar kedua', tanggal: '2026-04-06', status: 'Accepted' },
    { id: 'i19', nomor: 'INV-2026-0019', emp: 'e6', kategori: 'Tunjangan Kantor', item: 'Kartu parkir Bandung #P-77', kebutuhan: 'Parkir kantor', tanggal: '2026-04-06', status: 'Accepted' },
    { id: 'i20', nomor: 'INV-2026-0020', emp: 'e9', kategori: 'Alat Kerja', item: 'MacBook Pro 14" · SN C02Z77', kebutuhan: 'Pengembangan backend', tanggal: '2025-01-13', status: 'Accepted' },
    { id: 'i21', nomor: 'INV-2026-0021', emp: 'e14', kategori: 'Alat Kerja', item: 'Laptop 14" Lenovo · SN PF5R12', kebutuhan: 'Rekap keuangan', tanggal: '2025-01-13', status: 'Accepted' },
    { id: 'i22', nomor: 'INV-2026-0022', emp: 'e14', kategori: 'Tunjangan Kantor', item: 'Kartu akses gedung #A-0230', kebutuhan: 'Akses kantor Jakarta', tanggal: '2025-01-13', status: 'Accepted' },
    { id: 'i23', nomor: 'INV-2026-0023', emp: 'e11', kategori: 'Alat Kerja', item: 'Laptop 14" ASUS · SN M8K221', kebutuhan: 'Administrasi HR', tanggal: '2025-02-03', status: 'Accepted' },
    { id: 'i24', nomor: 'INV-2026-0024', emp: 'e12', kategori: 'Alat Kerja', item: 'iPad Air + Pencil', kebutuhan: 'Konten media sosial', tanggal: '2026-11-17', status: 'Waiting' },
    { id: 'i25', nomor: 'INV-2026-0025', emp: 'e12', kategori: 'Alat Kerja', item: 'Laptop 14" Acer · SN NXB12', kebutuhan: 'Perangkat kerja', tanggal: '2026-02-02', status: 'Accepted' },
    { id: 'i26', nomor: 'INV-2026-0026', emp: 'e10', kategori: 'Alat Kerja', item: 'Handy talky Motorola #HT-07', kebutuhan: 'Koordinasi gudang', tanggal: '2025-03-03', status: 'Accepted' },
    { id: 'i27', nomor: 'INV-2026-0027', emp: 'e10', kategori: 'Alat Kerja', item: 'Scanner barcode Zebra', kebutuhan: 'Stock opname', tanggal: '2025-03-03', status: 'Accepted' },
    { id: 'i28', nomor: 'INV-2026-0028', emp: 'e13', kategori: 'Transportasi', item: 'Mobil operasional L 1820 XY', kebutuhan: 'Supervisi lapangan', tanggal: '2025-01-20', status: 'Accepted' },
    { id: 'i29', nomor: 'INV-2026-0029', emp: 'e13', kategori: 'Alat Kerja', item: 'Laptop ThinkPad T14 · SN PF2W33', kebutuhan: 'Laporan operasional', tanggal: '2025-01-20', status: 'Accepted' },
    { id: 'i30', nomor: 'INV-2026-0030', emp: 'e11', kategori: 'Tunjangan Kantor', item: 'Kartu parkir Bandung #P-81', kebutuhan: 'Parkir kantor', tanggal: '2025-02-03', status: 'Returned', tanggalKembali: '2026-07-01', kondisi: 'Baik', catatanKembali: 'Pindah pakai transportasi umum' },
    { id: 'i31', nomor: 'INV-2026-0031', emp: 'e15', kategori: 'Alat Kerja', item: 'Laptop 14" HP 240 · SN 5CG3301', kebutuhan: 'Administrasi aset & GA', tanggal: '2025-01-13', status: 'Accepted' },
    { id: 'i32', nomor: 'INV-2026-0032', emp: 'e15', kategori: 'Furnitur', item: 'Kursi ergonomis #K-05', kebutuhan: 'Meja GA', tanggal: '2025-01-13', status: 'Accepted' },
    { id: 'i33', nomor: 'INV-2026-0033', emp: 'e16', kategori: 'Transportasi', item: 'Motor operasional W 2210 KL', kebutuhan: 'Antar dokumen & barang', tanggal: '2025-02-17', status: 'Accepted' },
    { id: 'i34', nomor: 'INV-2026-0034', emp: 'e16', kategori: 'Perlengkapan K3', item: 'Helm safety #H-04', kebutuhan: 'Area gudang', tanggal: '2025-02-17', status: 'Accepted' },
    { id: 'i35', nomor: 'INV-2026-0035', emp: 'e17', kategori: 'Alat Kerja', item: 'Laptop ThinkPad E14 · SN PF7Y21', kebutuhan: 'Support IT Bandung', tanggal: '2026-04-06', status: 'Accepted' },
    { id: 'i36', nomor: 'INV-2026-0036', emp: 'e17', kategori: 'Elektronik Kantor', item: 'Tool kit jaringan Fluke', kebutuhan: 'Perbaikan jaringan kantor', tanggal: '2026-04-06', status: 'Accepted' },
    { id: 'i37', nomor: 'INV-2026-0037', emp: 'e9', kategori: 'Furnitur', item: 'Kursi ergonomis #K-06', kebutuhan: 'WFO Jakarta', tanggal: '2026-05-04', status: 'Accepted' },
    { id: 'i38', nomor: 'INV-2026-0038', emp: 'e13', kategori: 'Perlengkapan K3', item: 'Rompi reflektif #R-02', kebutuhan: 'Supervisi lapangan', tanggal: '2025-03-10', status: 'Accepted' },
    { id: 'i12', nomor: 'INV-2026-0012', emp: 'e4', kategori: 'Alat Kerja', item: 'Headset Jabra Evolve2', kebutuhan: 'Panggilan customer', tanggal: '2026-11-18', status: 'Waiting' },
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
  resigns: [
    { id: 'rs1', emp: 'e3', alasan: 'Melanjutkan studi', diajukan: '2026-11-07', lastDay: '2026-12-12', inventaris: 'Belum lengkap', catatan: 'Ingin fokus kuliah S2 mulai Januari.', lampiran: 'Surat resign.pdf', status: 'Waiting' },
    { id: 'rs2', emp: 'e4', alasan: 'Pindah ke perusahaan lain', diajukan: '2026-11-02', lastDay: '2026-12-02', inventaris: 'Belum lengkap', catatan: 'Serah terima tugas QA ke tim Jakarta.', lampiran: 'Surat resign.pdf', status: 'Approved' },
    { id: 'rs3', emp: 'e7', alasan: 'Ikut pasangan pindah kota', diajukan: '2026-10-29', lastDay: '2026-11-28', inventaris: 'Lengkap', catatan: 'Semua aset sudah dikembalikan.', lampiran: 'Surat resign.pdf', status: 'Approved' },
    { id: 'rs4', emp: 'e2', alasan: 'Program magang selesai lebih awal', diajukan: '2026-11-18', lastDay: '2026-11-30', inventaris: 'Lengkap', catatan: 'Kampus memanggil kembali untuk skripsi.', lampiran: 'Surat kampus.pdf', status: 'Waiting' },
    { id: 'rs5', emp: 'e6', alasan: 'Tawaran kerja di luar negeri', diajukan: '2026-10-05', lastDay: '2026-10-20', inventaris: 'Lengkap', catatan: 'Ditolak: masih terikat perjanjian ikatan dinas sampai Maret 2027.', lampiran: 'Surat resign.pdf', status: 'Rejected' },
    { id: 'rs7', emp: 'e10', alasan: 'Kembali ke kampung halaman', diajukan: '2026-11-09', lastDay: '2026-12-09', inventaris: 'Belum lengkap', catatan: 'Serah terima gudang ke Rudi Hartanta.', lampiran: 'Surat resign.pdf', status: 'Approved' },
    { id: 'rs6', emp: 'e8', alasan: 'Fokus usaha keluarga', diajukan: '2026-11-16', lastDay: '2027-01-15', inventaris: 'Belum lengkap', catatan: 'Notice 2 bulan sesuai permintaan Branch.', lampiran: 'Surat resign.pdf', status: 'Approved' },
  ],
  // Kalender kerja: libur nasional & cuti bersama sesuai SKB 3 Menteri 2025 dan 2026, plus libur perusahaan per Branch
  holidays: [
    { id: 'h1', tanggal: '2025-01-01', nama: 'Tahun Baru 2025 Masehi', jenis: 'Libur nasional', branches: [] },
    { id: 'h2', tanggal: '2025-01-27', nama: 'Isra Mikraj Nabi Muhammad saw.', jenis: 'Libur nasional', branches: [] },
    { id: 'h3', tanggal: '2025-01-28', nama: 'Tahun Baru Imlek 2576 Kongzili', jenis: 'Cuti bersama', branches: [] },
    { id: 'h4', tanggal: '2025-01-29', nama: 'Tahun Baru Imlek 2576 Kongzili', jenis: 'Libur nasional', branches: [] },
    { id: 'h5', tanggal: '2025-03-28', nama: 'Hari Suci Nyepi (Tahun Baru Saka 1947)', jenis: 'Cuti bersama', branches: [] },
    { id: 'h6', tanggal: '2025-03-29', nama: 'Hari Suci Nyepi (Tahun Baru Saka 1947)', jenis: 'Libur nasional', branches: [] },
    { id: 'h7', tanggal: '2025-03-31', nama: 'Idulfitri 1446 H', jenis: 'Libur nasional', branches: [] },
    { id: 'h8', tanggal: '2025-04-01', nama: 'Idulfitri 1446 H', jenis: 'Libur nasional', branches: [] },
    { id: 'h9', tanggal: '2025-04-02', nama: 'Idulfitri 1446 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h10', tanggal: '2025-04-03', nama: 'Idulfitri 1446 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h11', tanggal: '2025-04-04', nama: 'Idulfitri 1446 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h12', tanggal: '2025-04-07', nama: 'Idulfitri 1446 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h13', tanggal: '2025-04-18', nama: 'Wafat Yesus Kristus', jenis: 'Libur nasional', branches: [] },
    { id: 'h14', tanggal: '2025-04-20', nama: 'Kebangkitan Yesus Kristus (Paskah)', jenis: 'Libur nasional', branches: [] },
    { id: 'h15', tanggal: '2025-05-01', nama: 'Hari Buruh Internasional', jenis: 'Libur nasional', branches: [] },
    { id: 'h16', tanggal: '2025-05-12', nama: 'Hari Raya Waisak 2569 BE', jenis: 'Libur nasional', branches: [] },
    { id: 'h17', tanggal: '2025-05-13', nama: 'Hari Raya Waisak 2569 BE', jenis: 'Cuti bersama', branches: [] },
    { id: 'h18', tanggal: '2025-05-29', nama: 'Kenaikan Yesus Kristus', jenis: 'Libur nasional', branches: [] },
    { id: 'h19', tanggal: '2025-05-30', nama: 'Kenaikan Yesus Kristus', jenis: 'Cuti bersama', branches: [] },
    { id: 'h20', tanggal: '2025-06-01', nama: 'Hari Lahir Pancasila', jenis: 'Libur nasional', branches: [] },
    { id: 'h21', tanggal: '2025-06-06', nama: 'Iduladha 1446 H', jenis: 'Libur nasional', branches: [] },
    { id: 'h22', tanggal: '2025-06-09', nama: 'Iduladha 1446 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h23', tanggal: '2025-06-27', nama: '1 Muharam Tahun Baru Islam 1447 H', jenis: 'Libur nasional', branches: [] },
    { id: 'h24', tanggal: '2025-08-17', nama: 'Proklamasi Kemerdekaan', jenis: 'Libur nasional', branches: [] },
    { id: 'h25', tanggal: '2025-09-05', nama: 'Maulid Nabi Muhammad saw.', jenis: 'Libur nasional', branches: [] },
    { id: 'h26', tanggal: '2025-12-25', nama: 'Kelahiran Yesus Kristus', jenis: 'Libur nasional', branches: [] },
    { id: 'h27', tanggal: '2025-12-26', nama: 'Kelahiran Yesus Kristus', jenis: 'Cuti bersama', branches: [] },
    { id: 'h28', tanggal: '2026-01-01', nama: 'Tahun Baru 2026 Masehi', jenis: 'Libur nasional', branches: [] },
    { id: 'h29', tanggal: '2026-01-16', nama: 'Isra Mikraj Nabi Muhammad saw.', jenis: 'Libur nasional', branches: [] },
    { id: 'h30', tanggal: '2026-02-16', nama: 'Tahun Baru Imlek 2577 Kongzili', jenis: 'Cuti bersama', branches: [] },
    { id: 'h31', tanggal: '2026-02-17', nama: 'Tahun Baru Imlek 2577 Kongzili', jenis: 'Libur nasional', branches: [] },
    { id: 'h32', tanggal: '2026-03-18', nama: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', jenis: 'Cuti bersama', branches: [] },
    { id: 'h33', tanggal: '2026-03-19', nama: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', jenis: 'Libur nasional', branches: [] },
    { id: 'h34', tanggal: '2026-03-20', nama: 'Idulfitri 1447 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h35', tanggal: '2026-03-21', nama: 'Idulfitri 1447 H', jenis: 'Libur nasional', branches: [] },
    { id: 'h36', tanggal: '2026-03-22', nama: 'Idulfitri 1447 H', jenis: 'Libur nasional', branches: [] },
    { id: 'h37', tanggal: '2026-03-23', nama: 'Idulfitri 1447 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h38', tanggal: '2026-03-24', nama: 'Idulfitri 1447 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h39', tanggal: '2026-04-03', nama: 'Wafat Yesus Kristus', jenis: 'Libur nasional', branches: [] },
    { id: 'h40', tanggal: '2026-04-05', nama: 'Kebangkitan Yesus Kristus (Paskah)', jenis: 'Libur nasional', branches: [] },
    { id: 'h41', tanggal: '2026-05-01', nama: 'Hari Buruh Internasional', jenis: 'Libur nasional', branches: [] },
    { id: 'h42', tanggal: '2026-05-14', nama: 'Kenaikan Yesus Kristus', jenis: 'Libur nasional', branches: [] },
    { id: 'h43', tanggal: '2026-05-15', nama: 'Kenaikan Yesus Kristus', jenis: 'Cuti bersama', branches: [] },
    { id: 'h44', tanggal: '2026-05-27', nama: 'Iduladha 1447 H', jenis: 'Libur nasional', branches: [] },
    { id: 'h45', tanggal: '2026-05-28', nama: 'Iduladha 1447 H', jenis: 'Cuti bersama', branches: [] },
    { id: 'h46', tanggal: '2026-05-31', nama: 'Hari Raya Waisak 2570 BE', jenis: 'Libur nasional', branches: [] },
    { id: 'h47', tanggal: '2026-06-01', nama: 'Hari Lahir Pancasila', jenis: 'Libur nasional', branches: [] },
    { id: 'h48', tanggal: '2026-06-16', nama: '1 Muharam Tahun Baru Islam 1448 H', jenis: 'Libur nasional', branches: [] },
    { id: 'h49', tanggal: '2026-08-17', nama: 'Proklamasi Kemerdekaan', jenis: 'Libur nasional', branches: [] },
    { id: 'h50', tanggal: '2026-08-25', nama: 'Maulid Nabi Muhammad saw.', jenis: 'Libur nasional', branches: [] },
    { id: 'h51', tanggal: '2026-12-24', nama: 'Kelahiran Yesus Kristus', jenis: 'Cuti bersama', branches: [] },
    { id: 'h52', tanggal: '2026-12-25', nama: 'Kelahiran Yesus Kristus', jenis: 'Libur nasional', branches: [] },
    { id: 'h90', tanggal: '2026-07-10', nama: 'Family Day Bandung', jenis: 'Libur perusahaan', branches: ['b2'] },
    { id: 'h91', tanggal: '2025-10-17', nama: 'Family Day Bandung', jenis: 'Libur perusahaan', branches: ['b2'] },
    { id: 'h92', tanggal: '2027-01-01', nama: 'Tahun Baru 2027 Masehi', jenis: 'Libur nasional', branches: [] },
  ],
  workCal: { b1: { hari: [1, 2, 3, 4, 5], cutiBersama: 'libur' }, b2: { hari: [1, 2, 3, 4, 5], cutiBersama: 'libur' }, b3: { hari: [1, 2, 3, 4, 5, 6], cutiBersama: 'potong' } },
  shifts: [
    { id: 'sh1', name: 'Shift 1', masuk: '08:30', batas: '09:00', pulang: '17:00' },
    { id: 'sh2', name: 'Shift 2', masuk: '10:00', batas: '10:30', pulang: '18:30' },
    { id: 'sh3', name: 'Shift Pagi Ops', masuk: '07:00', batas: '07:15', pulang: '15:00' },
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
    { id: 'a1', adminId: '0000506701', divisi: 'Human Capital', jabatan: 'Staff', aktif: true, name: 'Dewi Anggraini', email: 'dewi@kirana.id', role: 'Admin Operasional', branches: ['b1', 'b2'], perms: ['dashboard', 'talent-pool', 'pretest', 'penilaian', 'data-karyawan', 'absensi', 'dashboard-absensi', 'potongan-absensi', 'cuti', 'lembur', 'reimbursement', 'inventaris', 'audit-aset'], acc: { absensi: { c: true, u: true }, cuti: { u: true }, lembur: { u: true }, 'audit-aset': { c: true } } },
    { id: 'a2', adminId: '0000506702', divisi: 'Finance', jabatan: 'Staff', aktif: true, name: 'Bayu Santoso', email: 'bayu@kirana.id', role: 'Admin Operasional', branches: ['b3'], perms: ['dashboard', 'approval-remunerasi', 'send-document', 'disbursement', 'payslip-admin'], acc: { 'approval-remunerasi': { u: true }, 'send-document': { c: true, u: true, d: true }, disbursement: { c: true }, 'payslip-admin': { c: true } } },
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
  blasts: seedBlasts(),
  inbox: [
    { id: 'n1', to: 'talent', judul: 'Payslip September 2026 sudah terbit', isi: 'Silakan cek menu Payslip.', waktu: '2026-11-01 10:00' },
    { id: 'n2', to: 'talent', judul: 'Pengingat clock in', isi: 'Jangan lupa clock in sebelum 09:00 ya!', waktu: '2026-11-12 07:45' },
    // Notifikasi akun kandidat (emp = id talent penerima; tanpa emp = karyawan)
    { id: 'n-s1', to: 'talent', emp: 'p2', judul: 'Tawaran baru: Sales Executive', isi: 'Branch Surabaya Ops menawarkan posisi Sales Executive dari Talent Pool. Jawab sebelum 27 Nov 2026.', waktu: '2026-11-18 10:05', menu: 'lowongan' },
    { id: 'n-s2', to: 'talent', emp: 'p2', judul: 'Lamaran terkirim: Marketing Staff', isi: 'Lamaranmu di Branch Jakarta Digital sedang di tahap Tes tulis.', waktu: '2026-11-16 19:20', menu: 'lowongan' },
    { id: 'n-r1', to: 'talent', emp: 'p5', judul: 'Jadwal wawancara terkonfirmasi', isi: 'Backend Engineer · Selasa, 24 Nov 2026 pukul 10:00 WIB (online). Link meeting ada di menu Jadwal Wawancara.', waktu: '2026-11-14 09:30', menu: 'jadwal' },
    { id: 'n-r2', to: 'talent', emp: 'p5', judul: 'Selamat, kamu lolos ke tahap 4', isi: 'Lamaran Backend Engineer di Branch Jakarta Digital masuk tahap Wawancara & penilaian.', waktu: '2026-11-13 16:10', menu: 'lowongan' },
  ],
  clock: { in: null, out: null },
})

// Riwayat disbursement contoh: dihitung dari remunerasi Approved dengan rumus remunerasi (Nett Salary).
// Remunerasi Oktober 2026 Branch Jakarta Digital (r9) sengaja belum dibayar agar bisa dicoba lewat Create Disbursement.
const BL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const seed = () => {
  const s = baseSeed()
  mergeTalent(s) // data aplikasi Talent terbaru (21 Nov)
  seedTalentPool(s) // Talent Pool & Mitra (kerja sama outsourcing)
  seedMitraExtra(s) // profil mitra, penempatan di Branch klien, inbox & notifikasi
  seedHamparan(s, emp) // Branch besar contoh: PT. Hamparan Alam, 300 karyawan
  const paid = ['r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r0', 'rha-06', 'rha-07', 'rha-08', 'rha-09', 'rha-10']
  s.disbursements = paid.map((rid, i) => {
    const r = s.remunerations.find((x) => x.id === rid)
    const [b, y] = r.bulan.split(' '); const m = BL.indexOf(b) + 1; const mm = String(m).padStart(2, '0')
    const items = r.rows.map((row) => {
      const e = s.employees.find((x) => x.id === row.emp) || {}
      return { emp: row.emp, type: row.type || e.type, amount: Math.round(calcRemunRow(row, DEFAULT_SETUP, r, e).net) }
    })
    return { id: 'x' + (i + 1), kode: String(115921692176590 + i), branch: r.branch, remun: r.id, bulan: r.bulan, tipe: 'Payroll', jadwal: `${y}-${mm}-25`, h: 4, deskripsi: `Penggajian ${r.bulan}`, va: r.branch === 'b2' ? 'va2' : ['va1', 'va2', 'va1', 'va3', 'va2', 'va1', 'va2'][i % 7], items, total: items.reduce((a, x) => a + x.amount, 0), status: 'Success', createdAt: `${y}-${mm}-21T10:46`, createdBy: 'Rani Hapsari', paidAt: `${y}-${mm}-25T09:00` }
  }).reverse()
  seedAssets(s) // register aset, pergerakan, rusak/servis/hilang
  seedAttendanceYear(s); s.attDeduct.b4 = { ...s.attDeduct.b1, aktif: true }; { const n = new Date(); seedHamparanToday(s, rndH, isWdH, `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`) } // rekap absensi 2025–2026, riwayat cuti, & pengaturan potongan absensi per Branch
  s.root = rootSeed()
  { const c1 = s.root.customers.find((c) => c.id === 'c1'); if (c1) c1.kuotaKaryawan = 500 } // Growth + add-on karyawan (Branch Hamparan Alam)
  { // Audit, review akses & PAM (role Root)
    const c1 = {
      accounts: [...s.admins.map((a) => ({ id: 'c1-a-' + a.id, nama: a.name, email: a.email, role: 'Admin', kota: 'Jakarta', akses: `${a.perms.length} fitur · ${a.branches.length} Branch` })),
        ...s.branches.flatMap((b) => (b.accounts || []).map((a, i) => ({ id: `c1-ba-${b.id}-${i}`, nama: a.nama, email: a.email, role: 'Branch', kota: b.kota, akses: `Portal Branch · ${b.name}` })))],
      employees: s.employees.filter((e) => e.status !== 'Resign').slice(0, 4).map((e) => ({ name: e.name, email: e.email || e.name.toLowerCase().split(' ')[0] + '@talentadigital.co.id', kota: 'Jakarta' })),
    }
    const au = auditSeed(s.root, c1)
    const izin = s.root.logs.find((l) => l.customer === 'c1' && l.aksi === 'Mengubah izin admin')
    if (izin) Object.assign(izin, { akun: 'Dewi Anggraini', sebelum: 'Absensi: Lihat', sesudah: 'Absensi: Lihat, Tambah, Ubah', diajukan: 'Rani Hapsari (Superadmin)', penyetuju: 'Rani Hapsari (Superadmin)' })
    s.root.logs = [...s.root.logs.map(enrich), ...au.logs].map((l, i) => ({ ...l, id: l.id || 'la' + i })).sort((x, y) => y.at.localeCompare(x.at))
    s.root.reviews = au.reviews; s.root.reviewPolicy = au.reviewPolicy; s.root.pam = au.pam
  }
  { // Disbursement tambahan untuk Dashboard Disbursement: THR, susulan, gagal lalu kirim ulang, menunggu dana, dibatalkan
    const thp = (id) => s.employees.find((e) => e.id === id)?.thp || 0
    let k = Math.max(...s.disbursements.map((d) => Number(d.kode))) + 1
    const X = (o) => { const items = o.items.map(([emp, amount, type]) => ({ emp, amount: amount ?? thp(emp), type: type || s.employees.find((e) => e.id === emp)?.type || 'Kontrak' })); const d = { id: 'xx' + k, kode: String(k++), h: 4, createdBy: 'Rani Hapsari', createdAt: `${o.jadwal.slice(0, 8)}${String(Math.max(1, Number(o.jadwal.slice(8)) - 4)).padStart(2, '0')}T10:15`, ...o, items, total: items.reduce((a, x) => a + x.amount, 0) }; if (d.status === 'Success') d.paidAt = `${d.jadwal}T09:00`; s.disbursements.push(d) }
    X({ branch: 'b1', bulan: 'Maret 2026', tipe: 'THR', jadwal: '2026-03-13', deskripsi: 'THR Idulfitri 1447 H', va: 'va4', status: 'Success', items: ['e0', 'e1', 'e3', 'e4', 'e5', 'e9', 'e14'].map((e) => [e]) })
    X({ branch: 'b1', bulan: 'Maret 2026', tipe: 'THR', jadwal: '2026-03-13', deskripsi: 'THR Idulfitri 1447 H · magang', va: 'va3', status: 'Success', items: [['e2']] })
    X({ branch: 'b2', bulan: 'Maret 2026', tipe: 'THR', jadwal: '2026-03-16', deskripsi: 'THR Idulfitri 1447 H', va: 'va2', status: 'Success', items: [['e6'], ['e7'], ['e11'], ['e12', 1300000]] })
    X({ branch: 'b3', bulan: 'Maret 2026', tipe: 'THR', jadwal: '2026-03-16', deskripsi: 'THR Idulfitri 1447 H', va: 'va4', status: 'Success', items: [['e8'], ['e10'], ['e13']] })
    X({ branch: 'b3', bulan: 'Juli 2026', tipe: 'Payroll', jadwal: '2026-07-25', deskripsi: 'Penggajian Juli 2026', va: 'va4', status: 'Failed', alasan: 'Nomor rekening tidak ditemukan di bank tujuan', items: [['e8', 6100000]] })
    X({ branch: 'b3', bulan: 'Juli 2026', tipe: 'Payroll', jadwal: '2026-07-28', deskripsi: 'Kirim ulang gaji Juli (rekening diperbaiki)', va: 'va4', status: 'Success', items: [['e8', 6100000]] })
    ;['Agustus', 'September', 'Oktober'].forEach((b, i) => X({ branch: 'b3', bulan: `${b} 2026`, tipe: 'Payroll', jadwal: `2026-${['08', '09', '10'][i]}-25`, deskripsi: `Penggajian ${b} 2026`, va: 'va4', status: 'Success', items: [['e8', 6100000], ['e10', 5650000], ['e13', 9200000]] }))
    ;['Agustus', 'September'].forEach((b, i) => X({ branch: 'b2', bulan: `${b} 2026`, tipe: 'Payroll', jadwal: `2026-${['08', '09'][i]}-25`, deskripsi: `Penggajian ${b} 2026`, va: 'va2', status: 'Success', items: [['e6', 10250000], ['e7', 8550000], ['e11', 8100000], ['e12', 7350000]] }))
    X({ branch: 'b2', bulan: 'Oktober 2026', tipe: 'Payroll', jadwal: '2026-10-30', deskripsi: 'Payroll susulan: koreksi lembur Oktober', va: 'va2', status: 'Success', items: [['e6', 1250000]] })
    X({ branch: 'b1', bulan: 'September 2026', tipe: 'Payroll', jadwal: '2026-09-30', deskripsi: 'Gaji magang September (terpisah)', va: 'va3', status: 'Success', items: [['e2', 4300000]] })
    X({ branch: 'b2', bulan: 'November 2026', tipe: 'Payroll', jadwal: '2026-11-25', deskripsi: 'Penggajian November 2026', va: 'va2', status: 'Waiting for Transfer', alasan: 'Dana belum masuk ke Virtual Account', items: [['e6', 10400000], ['e7', 8550000], ['e11', 8100000], ['e12', 7350000]] })
    X({ branch: 'b3', bulan: 'November 2026', tipe: 'Payroll', jadwal: '2026-11-25', deskripsi: 'Penggajian November 2026 (salah nominal)', va: 'va4', status: 'Canceled', alasan: 'Dibatalkan admin: nominal belum termasuk lembur', items: [['e8', 5900000]] })
    X({ branch: 'b3', bulan: 'November 2026', tipe: 'Payroll', jadwal: '2026-11-25', deskripsi: 'Penggajian November 2026', va: 'va4', status: 'Scheduled', items: [['e8', 6350000], ['e10', 5650000], ['e13', 9700000]] })
    s.disbursements.sort((a, b) => b.jadwal.localeCompare(a.jadwal) || Number(b.kode) - Number(a.kode))
  }
  s.payslips = s.disbursements.filter((d) => d.status === 'Success').flatMap((d) => d.items.map((x) => ({ id: 'ps-' + d.id + '-' + x.emp, emp: x.emp, bulan: d.bulan, thp: x.amount, tipe: d.tipe, disb: d.id })))
  // Pengiriman payslip: otomatis sesuai setup jadwal per Branch + manual (kirim ulang)
  s.payslipSetup = {
    b1: { aktif: true, mode: 'tanggal', tanggal: 26, jam: '08:00', app: true, email: true },
    b2: { aktif: true, mode: 'tanggal', tanggal: 27, jam: '08:00', app: true, email: true },
    b3: { aktif: true, mode: 'setelah', tanggal: 27, jam: '09:00', app: true, email: true },
    b4: { aktif: true, mode: 'tanggal', tanggal: 28, jam: '07:00', app: true, email: true },
  }
  s.payslipSetupLog = [
    { id: 'pl1', at: '2026-03-02T09:15', oleh: 'Rani Hapsari', peran: 'Superadmin', branch: 'b1', field: 'Tanggal kirim', sebelum: 'Tanggal 25', sesudah: 'Tanggal 26', alasan: 'Beri jeda 1 hari setelah transfer gaji' },
    { id: 'pl2', at: '2026-06-10T14:20', oleh: 'Rani Hapsari', peran: 'Superadmin', branch: 'b2', field: 'Jam kirim', sebelum: '07:00', sesudah: '08:00', alasan: 'Karyawan Bandung mulai kerja 08:00' },
    { id: 'pl3', at: '2026-06-10T14:20', oleh: 'Rani Hapsari', peran: 'Superadmin', branch: 'b2', field: 'Kanal', sebelum: 'Aplikasi', sesudah: 'Aplikasi + E-mail', alasan: 'Karyawan Bandung mulai kerja 08:00' },
    { id: 'pl4', at: '2026-09-01T10:05', oleh: 'Rani Hapsari', peran: 'Superadmin', branch: 'b3', field: 'Waktu kirim', sebelum: 'Tanggal 27', sesudah: 'Setelah transfer berhasil', alasan: 'Hindari payslip terkirim saat transfer gagal' },
    { id: 'pl5', at: '2026-11-02T08:30', oleh: 'Rani Hapsari', peran: 'Superadmin', branch: 'b3', field: 'Jam kirim', sebelum: '08:00', sesudah: '09:00', alasan: 'Menyesuaikan Shift Pagi Ops' },
  ]
  {
    const p2 = (n) => String(n).padStart(2, '0'); let n = 0
    const when = (d) => { const c = s.payslipSetup[d.branch]; const pd = new Date(d.paidAt || d.jadwal + 'T09:00')
      if (c.mode === 'setelah' && d.jadwal >= '2026-09-01') return `${d.jadwal}T${c.jam}`
      const day = d.branch === 'b1' && d.jadwal < '2026-03-02' ? 25 : c.tanggal
      const t = pd.getDate() < day ? new Date(pd.getFullYear(), pd.getMonth(), day) : new Date(pd.getFullYear(), pd.getMonth(), pd.getDate() + 1)
      return `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}T${c.jam}` }
    s.payslipSends = s.disbursements.filter((d) => d.status === 'Success').map((d) => ({ id: 'pk' + ++n, at: when(d), periode: d.bulan, tipe: d.tipe || 'Payroll', branch: d.branch, mode: 'Terjadwal', oleh: 'Sistem (jadwal)', emp: d.items.map((x) => x.emp), gagal: 0, disb: d.id }))
    const sep = s.payslipSends.find((x) => x.branch === 'b1' && x.periode === 'September 2026' && x.tipe === 'Payroll' && x.emp.length > 1); if (sep) { sep.gagal = 2; sep.catatan = '2 e-mail gagal terkirim (kotak masuk penuh)' }
    const M = (o) => s.payslipSends.push({ id: 'pk' + ++n, mode: 'Manual', tipe: 'Payroll', gagal: 0, ...o })
    M({ at: '2026-08-29T10:12', periode: 'Agustus 2026', branch: 'b1', oleh: 'Dewi Anggraini', emp: ['e3'], catatan: 'Karyawan belum menerima e-mail (alamat salah, sudah diperbaiki)' })
    M({ at: '2026-09-28T09:30', periode: 'September 2026', branch: 'b1', oleh: 'Rani Hapsari', emp: ['e0', 'e5'], catatan: 'Kirim ulang 2 e-mail yang gagal' })
    M({ at: '2026-07-30T08:40', periode: 'Juli 2026', branch: 'b3', oleh: 'Rani Hapsari', emp: ['e8'], catatan: 'Konfirmasi ulang setelah transfer gaji dikirim ulang' })
    M({ at: '2026-10-31T09:00', periode: 'Oktober 2026', branch: 'b2', oleh: 'Rani Hapsari', emp: ['e6', 'e7'], catatan: 'Payslip Oktober direvisi (koreksi lembur), kirim ulang ke semua' })
    M({ at: '2026-05-04T15:20', periode: 'April 2026', branch: 'b1', oleh: 'Dewi Anggraini', emp: ['e1'], catatan: 'Permintaan karyawan untuk pengajuan KPR' })
    { // Hamparan Alam: gagal kirim, kirim ulang, & permintaan karyawan
      const ha = s.payslipSends.find((x) => x.branch === 'b4' && x.periode === 'Oktober 2026')
      if (ha) { ha.gagalEmp = ['h18', 'h44', 'h97', 'h133', 'h171', 'h222', 'h256'].filter((id) => ha.emp.includes(id)); ha.gagal = ha.gagalEmp.length; ha.catatan = `${ha.gagal} e-mail gagal terkirim (alamat tidak valid / kotak masuk penuh)` }
      M({ at: '2026-11-02T10:15', periode: 'Oktober 2026', branch: 'b4', oleh: 'Rani Hapsari', emp: ['h18', 'h44', 'h97', 'h133'], catatan: 'Kirim ulang setelah alamat e-mail diperbaiki (3 masih gagal)' })
      const jul = s.payslipSends.find((x) => x.branch === 'b4' && x.periode === 'Juli 2026')
      if (jul) M({ at: '2026-08-03T09:00', periode: 'Juli 2026', branch: 'b4', oleh: 'Rani Hapsari', emp: jul.emp.filter((id, i) => i % 9 === 0).slice(0, 18), catatan: 'Revisi premi panen Juli, payslip dikirim ulang' })
      M({ at: '2026-10-07T14:20', periode: 'September 2026', branch: 'b4', oleh: 'Dewi Anggraini', emp: ['h12', 'h77'], catatan: 'Permintaan karyawan untuk pengajuan KPR' })
    }
    s.payslipSends.sort((a, b) => b.at.localeCompare(a.at))
    payslipBranch(s)
  }
  return s
}
