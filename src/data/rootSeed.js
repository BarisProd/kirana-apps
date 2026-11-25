import { seedVendors } from './vendors.js'
// Data Root (pemilik aplikasi Kirana): customer (tenant), data turunan, log aktivitas, riwayat reset password, profil Root.
// Customer c1 = tenant demo yang dipakai seluruh role lain (Superadmin, Admin, Branch, Talent, Mitra) — data turunannya dibaca langsung dari state aplikasi.

export const PAKET = {
  Starter: { kuotaKaryawan: 50, kuotaBranch: 1, kuotaStorage: 50, ket: 'Usaha kecil, 1 lokasi' },
  Growth: { kuotaKaryawan: 300, kuotaBranch: 5, kuotaStorage: 200, ket: 'Perusahaan bertumbuh, beberapa cabang' },
  Enterprise: { kuotaKaryawan: 2000, kuotaBranch: 50, kuotaStorage: 2000, ket: 'Grup besar, kuota bisa disesuaikan' },
}

// Jenis file yang disimpan aplikasi (urutan tetap = urutan warna grafik). avg = rata-rata ukuran per file (byte).
export const FILE_TYPES = [
  { k: 'pdf', l: '.pdf', ket: 'Kontrak, payslip, dokumen legal', c: '#2a78d6', avg: 420e3 },
  { k: 'img', l: '.png / .jpg', ket: 'Foto profil, absensi selfie, bukti reimbursement', c: '#eb6834', avg: 1.6e6 },
  { k: 'mp4', l: '.mp4', ket: 'Rekaman Self Interview pre-test', c: '#1baf7a', avg: 58e6 },
  { k: 'xls', l: '.xlsx / .csv', ket: 'Ekspor remunerasi, rekap, import data', c: '#eda100', avg: 180e3 },
  { k: 'doc', l: '.docx', ket: 'Template dokumen, surat', c: '#e87ba4', avg: 260e3 },
  { k: 'oth', l: 'Lainnya', ket: '.zip, .txt, dan lain-lain', c: '#6250d6', avg: 900e3 },
]
const GB = 1024 ** 3
// Pembangkit angka deterministik (agar data contoh stabil setiap muat ulang)
export const rnd = (seed) => { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296 } }
// Pemakaian storage per tingkat (Superadmin pusat + tiap Branch), dalam byte per jenis file
const mix = { pdf: 0.24, img: 0.3, mp4: 0.3, xls: 0.06, doc: 0.05, oth: 0.05 }
const usageOf = (seed, totalGB) => { const r = rnd(seed); const o = {}; FILE_TYPES.forEach((t) => { o[t.k] = Math.round(totalGB * GB * mix[t.k] * (0.45 + r() * 1.1)) }); return o }
const storageFor = (cid, branchIds, pusatGB, perBranchGB) => ({ superadmin: usageOf(cid + 'sa', pusatGB), branches: Object.fromEntries(branchIds.map((b, i) => [b, usageOf(cid + b, perBranchGB * (1 + (i % 3) * 0.6))])) })
export const MODUL = [['rekrutmen', 'Rekrutmen'], ['payroll', 'Payroll & Disbursement'], ['aktivitas', 'Aktivitas Karyawan']]
export const BIDANG = ['Teknologi', 'Ritel', 'Logistik', 'Agribisnis', 'Kesehatan', 'Manufaktur', 'Keuangan', 'Pendidikan', 'Lainnya']
export const LOG_KAT = ['Autentikasi', 'Akun & Izin', 'Akses Istimewa', 'Data Karyawan', 'Rekrutmen', 'Payroll', 'Pengaturan', 'Langganan']

const NAMA = ['Andi Saputra', 'Bunga Lestari', 'Cahyo Nugroho', 'Dina Marlina', 'Eko Prasetyo', 'Fitri Handayani', 'Galih Ramadhan', 'Hesti Purnama', 'Indra Kusuma', 'Joko Susilo', 'Kartika Sari', 'Lukman Hakim', 'Maya Anggraeni', 'Nanda Pratiwi', 'Oki Firmansyah', 'Puspa Dewi']
const JAB = ['Staff Admin', 'Kasir', 'Supervisor', 'Driver', 'Gudang', 'Perawat', 'Analis', 'Sales']
const TIPE = ['Kontrak', 'Kontrak', 'Freelance', 'Magang']
const mkEmp = (cid, brs, n, off = 0) => Array.from({ length: n }, (_, i) => {
  const b = brs[i % brs.length]
  return { id: `${cid}-e${i + 1}`, name: NAMA[(i + off) % NAMA.length], branch: b.id, role: JAB[(i + off) % JAB.length], type: TIPE[(i + off) % TIPE.length], start: `2025-0${(i % 9) + 1}-0${(i % 8) + 1}`, status: i % 7 === 6 ? 'Resign' : 'Aktif', email: NAMA[(i + off) % NAMA.length].toLowerCase().split(' ')[0] + (i + 1) + '@' + cid + '.co.id' }
})
const tenant = (cid, brs, nEmp, off, admins) => {
  const branches = brs.map((b, i) => ({ id: `${cid}-b${i + 1}`, name: b[0], kota: b[1], pic: b[2], email: b[3], aktif: b[4] !== false }))
  return {
    branches,
    employees: mkEmp(cid, branches, nEmp, off),
    accounts: [
      ...admins.map(([nama, email]) => ({ id: `${cid}-a-${email}`, role: 'Admin', nama, email, aktif: true })),
      ...branches.map((b) => ({ id: `${cid}-ba-${b.id}`, role: 'Branch', nama: b.pic, email: b.email, branch: b.id, aktif: b.aktif })),
    ],
  }
}

export const rootSeed = () => ({
  user: { nama: 'Putri Amalia', email: 'putri@kirana.id', telp: '0812-7000-1001', jabatan: 'Platform Owner', twofa: true, pwUpdated: '2026-10-02' },
  logins: [
    { at: '2026-11-19T08:02', perangkat: 'Safari · iPad', lokasi: 'Pontianak, ID', ok: true },
    { at: '2026-11-18T16:40', perangkat: 'Safari · iPad', lokasi: 'Pontianak, ID', ok: true },
    { at: '2026-11-17T09:15', perangkat: 'Chrome · macOS', lokasi: 'Jakarta, ID', ok: true },
    { at: '2026-11-16T22:31', perangkat: 'Chrome · Windows', lokasi: 'Tidak dikenal', ok: false },
  ],
  customers: [
    { id: 'c1', kode: 'KRN-0001', nama: 'PT Talenta Digital Nusantara', brand: 'Talenta Digital', bidang: 'Teknologi', skala: '51–300', npwp: '01.234.567.8-901.000', alamat: 'Jl. Jend. Sudirman Kav. 21, Karet', kota: 'Jakarta Selatan', provinsi: 'DKI Jakarta', kodepos: '12920', telp: '021-5550100', email: 'hello@talentadigital.co.id', website: 'talentadigital.co.id',
      pic: { nama: 'Rani Hapsari', jabatan: 'HR Director', email: 'rani@kirana.id', hp: '0812-5550-100' }, superadmin: { nama: 'Rani Hapsari', email: 'rani@kirana.id' },
      paket: 'Growth', kuotaKaryawan: 300, kuotaBranch: 5, mulai: '2026-01-01', berakhir: '2026-12-31', status: 'Aktif', modul: ['rekrutmen', 'payroll', 'aktivitas'], dokumen: ['NIB.pdf', 'Akta pendirian.pdf'], catatan: 'Tenant demo utama.', createdAt: '2025-12-20T10:00' },
    { id: 'c2', kode: 'KRN-0002', nama: 'PT Sinar Retail Indonesia', brand: 'SinarMart', bidang: 'Ritel', skala: '51–300', npwp: '02.345.678.9-012.000', alamat: 'Jl. Pemuda No. 88', kota: 'Semarang', provinsi: 'Jawa Tengah', kodepos: '50132', telp: '024-7660200', email: 'hr@sinarretail.co.id', website: 'sinarmart.id',
      pic: { nama: 'Budi Hartono', jabatan: 'HR Manager', email: 'budi@sinarretail.co.id', hp: '0813-2200-1100' }, superadmin: { nama: 'Budi Hartono', email: 'budi@sinarretail.co.id' },
      paket: 'Growth', kuotaKaryawan: 300, kuotaBranch: 5, mulai: '2026-03-01', berakhir: '2027-02-28', status: 'Aktif', modul: ['payroll', 'aktivitas'], dokumen: ['NIB.pdf'], catatan: '', createdAt: '2026-02-20T13:30' },
    { id: 'c3', kode: 'KRN-0003', nama: 'CV Maju Logistik', brand: '', bidang: 'Logistik', skala: '1–50', npwp: '03.456.789.0-123.000', alamat: 'Jl. Raya Waru No. 12', kota: 'Sidoarjo', provinsi: 'Jawa Timur', kodepos: '61256', telp: '031-8550300', email: 'admin@majulogistik.id', website: '',
      pic: { nama: 'Siti Rahma', jabatan: 'Pemilik', email: 'siti@majulogistik.id', hp: '0857-3300-2200' }, superadmin: { nama: 'Siti Rahma', email: 'siti@majulogistik.id' },
      paket: 'Starter', kuotaKaryawan: 50, kuotaBranch: 1, mulai: '2026-11-10', berakhir: '2026-11-24', status: 'Trial', modul: ['aktivitas'], dokumen: [], catatan: 'Trial 14 hari, minta demo payroll.', createdAt: '2026-11-10T09:12' },
    { id: 'c4', kode: 'KRN-0004', nama: 'PT Agro Lestari Sejahtera', brand: 'Agro Lestari', bidang: 'Agribisnis', skala: '51–300', npwp: '04.567.890.1-234.000', alamat: 'Jl. Ahmad Yani Km. 7', kota: 'Pontianak', provinsi: 'Kalimantan Barat', kodepos: '78124', telp: '0561-740400', email: 'hrd@agrolestari.co.id', website: 'agrolestari.co.id',
      pic: { nama: 'Hendra Wijaya', jabatan: 'GM HR', email: 'hendra@agrolestari.co.id', hp: '0811-5600-4400' }, superadmin: { nama: 'Hendra Wijaya', email: 'hendra@agrolestari.co.id' },
      paket: 'Growth', kuotaKaryawan: 300, kuotaBranch: 5, mulai: '2025-11-01', berakhir: '2026-10-31', status: 'Ditangguhkan', alasan: 'Tagihan perpanjangan belum dibayar', modul: ['rekrutmen', 'payroll', 'aktivitas'], dokumen: ['NIB.pdf', 'Akta pendirian.pdf'], catatan: '', createdAt: '2025-10-25T11:00' },
    { id: 'c5', kode: 'KRN-0005', nama: 'PT Medika Sehat Utama', brand: 'Medika Sehat', bidang: 'Kesehatan', skala: '300+', npwp: '05.678.901.2-345.000', alamat: 'Jl. Diponegoro No. 45', kota: 'Bandung', provinsi: 'Jawa Barat', kodepos: '40115', telp: '022-4200500', email: 'people@medikasehat.co.id', website: 'medikasehat.co.id',
      pic: { nama: 'dr. Laila Kurnia', jabatan: 'Direktur SDM', email: 'laila@medikasehat.co.id', hp: '0812-2000-5500' }, superadmin: { nama: 'Yoga Permana', email: 'yoga@medikasehat.co.id' },
      paket: 'Enterprise', kuotaKaryawan: 2000, kuotaBranch: 50, mulai: '2025-12-10', berakhir: '2026-12-09', status: 'Aktif', modul: ['rekrutmen', 'payroll', 'aktivitas'], dokumen: ['NIB.pdf', 'Akta pendirian.pdf', 'Izin operasional RS.pdf'], catatan: 'Langganan berakhir < 30 hari, tawarkan perpanjangan.', createdAt: '2025-12-01T15:20' },
  ],
  tenants: {
    c2: tenant('c2', [['SinarMart Semarang', 'Semarang', 'Agus Salim', 'smg@sinarretail.co.id'], ['SinarMart Solo', 'Surakarta', 'Rina Kusuma', 'solo@sinarretail.co.id'], ['SinarMart Yogya', 'Yogyakarta', 'Teguh Santoso', 'jogja@sinarretail.co.id']], 14, 0, [['Lina Marlina', 'lina@sinarretail.co.id']]),
    c3: tenant('c3', [['Gudang Waru', 'Sidoarjo', 'Siti Rahma', 'gudang@majulogistik.id']], 5, 3, []),
    c4: tenant('c4', [['Kebun Sungai Ambawang', 'Kubu Raya', 'Darman', 'ambawang@agrolestari.co.id'], ['Kantor Pontianak', 'Pontianak', 'Mega Putri', 'ptk@agrolestari.co.id', false]], 9, 5, [['Ratna Sari', 'ratna@agrolestari.co.id']]),
    c5: tenant('c5', [['RS Medika Bandung', 'Bandung', 'Nur Aini', 'bdg@medikasehat.co.id'], ['Klinik Medika Cimahi', 'Cimahi', 'Fajar Ali', 'cmh@medikasehat.co.id'], ['Klinik Medika Garut', 'Garut', 'Wulan Sari', 'grt@medikasehat.co.id'], ['Lab Medika Sumedang', 'Sumedang', 'Dedi Kurnia', 'smd@medikasehat.co.id']], 16, 8, [['Tia Rahayu', 'tia@medikasehat.co.id'], ['Bagas Pratama', 'bagas@medikasehat.co.id']]),
  },
  logs: [
    ['c1', '2026-11-19T08:11', 'Rani Hapsari', 'Superadmin', 'Autentikasi', 'Login berhasil', 'Safari · iPad'],
    ['c1', '2026-11-18T16:38', 'Rani Hapsari', 'Superadmin', 'Payroll', 'Membuat disbursement Oktober 2026', 'Branch Jakarta Digital · 6 karyawan'],
    ['c1', '2026-11-18T10:05', 'Dewi Anggraini', 'Admin', 'Data Karyawan', 'Menyetujui absensi terlambat', 'Kevin Pratama · 17 Nov'],
    ['c1', '2026-11-17T13:20', 'Rama Wijaya', 'Branch', 'Payroll', 'Mengajukan remunerasi November 2026', '4 karyawan'],
    ['c1', '2026-11-16T09:40', 'Rani Hapsari', 'Superadmin', 'Akun & Izin', 'Mengubah izin admin', 'Dewi Anggraini: Absensi (Tambah, Ubah)'],
    ['c1', '2026-11-15T21:12', 'bayu@kirana.id', 'Admin', 'Autentikasi', 'Login gagal (password salah)', '3 percobaan'],
    ['c2', '2026-11-19T07:50', 'Budi Hartono', 'Superadmin', 'Autentikasi', 'Login berhasil', 'Chrome · Windows'],
    ['c2', '2026-11-18T14:02', 'Agus Salim', 'Branch', 'Data Karyawan', 'Menambah karyawan baru', 'Andi Saputra · Kasir'],
    ['c2', '2026-11-12T11:30', 'Budi Hartono', 'Superadmin', 'Pengaturan', 'Mengubah Setup Remunerasi', 'UMR Semarang 2026'],
    ['c3', '2026-11-18T09:00', 'Siti Rahma', 'Superadmin', 'Autentikasi', 'Login pertama & mengganti password', 'Safari · iPhone'],
    ['c3', '2026-11-10T09:12', 'Putri Amalia', 'Root', 'Langganan', 'Customer didaftarkan (Trial 14 hari)', 'Paket Starter'],
    ['c4', '2026-11-01T00:00', 'Sistem', 'Sistem', 'Langganan', 'Langganan berakhir', 'Akun masuk masa tenggang'],
    ['c4', '2026-11-08T10:30', 'Putri Amalia', 'Root', 'Langganan', 'Customer ditangguhkan', 'Tagihan perpanjangan belum dibayar'],
    ['c5', '2026-11-19T06:45', 'Yoga Permana', 'Superadmin', 'Autentikasi', 'Login berhasil', 'Chrome · macOS'],
    ['c5', '2026-11-17T15:00', 'Tia Rahayu', 'Admin', 'Rekrutmen', 'Menyetujui lowongan Perawat ICU', 'RS Medika Bandung'],
    ['c5', '2026-11-14T08:20', 'Nur Aini', 'Branch', 'Payroll', 'Mengajukan remunerasi November 2026', '42 karyawan'],
  ].map(([customer, at, aktor, peran, kategori, aksi, detail], i) => ({ id: 'lg' + (i + 1), customer, at, aktor, peran, kategori, aksi, detail })),
  storage: {
    c1: storageFor('c1', ['b1', 'b2', 'b3'], 34, 28),
    c2: storageFor('c2', ['c2-b1', 'c2-b2', 'c2-b3'], 25, 19),
    c3: storageFor('c3', ['c3-b1'], 17, 34),
    c4: storageFor('c4', ['c4-b1', 'c4-b2'], 30, 38),
    c5: storageFor('c5', ['c5-b1', 'c5-b2', 'c5-b3', 'c5-b4'], 45, 25),
  },
  vendors: seedVendors(),
  resets: [
    { id: 'rs1', customer: 'c3', akun: 'Siti Rahma', role: 'Superadmin', email: 'siti@majulogistik.id', at: '2026-11-17T16:10', oleh: 'Putri Amalia', alasan: 'Lupa password saat trial', status: 'Terkirim' },
  ],
})
