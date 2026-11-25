// Data contoh (fiktif) untuk mode demo. Tidak berisi data pribadi asli.
const B = ['Branch Jakarta', 'Branch Bandung', 'Branch Surabaya']

export const seed = {
  branches: [
    { id: 'br-1', nama: 'Branch Jakarta', pic: 'Raka Pradipta', karyawan: 42 },
    { id: 'br-2', nama: 'Branch Bandung', pic: 'Sekar Ayuning', karyawan: 27 },
    { id: 'br-3', nama: 'Branch Surabaya', pic: 'Dimas Arya', karyawan: 18 },
  ],
  admins: [
    { id: 'ad-1', nama: 'Nadia Kusuma', email: 'nadia@kirana.id', role: 'Superadmin', branches: B, perms: ['*'] },
    { id: 'ad-2', nama: 'Bima Santoso', email: 'bima@kirana.id', role: 'Admin Operasional', branches: ['Branch Jakarta'], perms: ['approval', 'senddoc', 'employee', 'attendance', 'leave'] },
    { id: 'ad-3', nama: 'Laras Wening', email: 'laras@kirana.id', role: 'Admin Operasional', branches: ['Branch Bandung', 'Branch Surabaya'], perms: ['payroll', 'disbursement', 'payslip'] },
  ],
  jobs: [
    { id: 'job-1', posisi: 'Business Team Staff', branch: 'Branch Jakarta', jenis: 'Kontrak', gaji: [6000000, 7500000], kuota: 3, status: 'Active', pelamar: 24, lokasi: 'Jakarta Selatan', tipeLokasi: 'Hybrid', periode: '1 Des 2026 – 30 Nov 2027' },
    { id: 'job-2', posisi: 'Marketing Team', branch: 'Branch Jakarta', jenis: 'Kontrak', gaji: [8000000, 9500000], kuota: 2, status: 'Active', pelamar: 17, lokasi: 'Jakarta Pusat', tipeLokasi: 'WFO', periode: '1 Des 2026 – 30 Nov 2027' },
    { id: 'job-3', posisi: 'UI/UX Designer', branch: 'Branch Bandung', jenis: 'Freelance', gaji: [7000000, 8500000], kuota: 1, status: 'Requested', pelamar: 0, lokasi: 'Kota Bandung', tipeLokasi: 'WFH', periode: '15 Des 2026 – 14 Jun 2027' },
    { id: 'job-4', posisi: 'Data Analyst', branch: 'Branch Surabaya', jenis: 'Kontrak', gaji: [9000000, 11000000], kuota: 1, status: 'Non-Active', pelamar: 31, lokasi: 'Kota Surabaya', tipeLokasi: 'Hybrid', periode: '1 Jul 2026 – 30 Jun 2027' },
  ],
  candidates: [
    { id: 'c-1', nama: 'Annisa Rahmadani', job: 'job-1', tahap: 4, skor: 85, pendidikan: 'S1', pengalaman: '0–2 th' },
    { id: 'c-2', nama: 'Kevin Mahendra', job: 'job-1', tahap: 3, skor: 75, pendidikan: 'SMA/SMK', pengalaman: '2–4 th' },
    { id: 'c-3', nama: 'Sarah Maharani', job: 'job-1', tahap: 2, skor: 68, pendidikan: 'S1', pengalaman: '2–4 th' },
    { id: 'c-4', nama: 'Gilang Saputra', job: 'job-1', tahap: 5, skor: 88, pendidikan: 'D3', pengalaman: '4–6 th' },
    { id: 'c-5', nama: 'Putri Lestari', job: 'job-2', tahap: 1, skor: null, pendidikan: 'S1', pengalaman: '0–2 th' },
    { id: 'c-6', nama: 'Yoga Prasetyo', job: 'job-2', tahap: 2, skor: 72, pendidikan: 'S1', pengalaman: '4–6 th' },
  ],
  talents: [
    { id: 't-1', nama: 'Rina Oktaviani', status: 'Active Pool', pendidikan: 'S1', pengalaman: '2–4 th', spesialisasi: 'Admin Support', skor: 84, ekspektasi: 6500000, mitra: '—' },
    { id: 't-2', nama: 'Fajar Nugroho', status: 'Active Pool', pendidikan: 'D3', pengalaman: '0–2 th', spesialisasi: 'Marketing', skor: 79, ekspektasi: 6000000, mitra: 'Mitra Cakra' },
    { id: 't-3', nama: 'Dewi Anjani', status: 'Pending Assessment', pendidikan: 'S1', pengalaman: '4–6 th', spesialisasi: 'Data Analyst', skor: null, ekspektasi: 10000000, mitra: '—' },
    { id: 't-4', nama: 'Bayu Wicaksono', status: 'Registered', pendidikan: 'SMA/SMK', pengalaman: '0–2 th', spesialisasi: 'Business Team', skor: null, ekspektasi: 5500000, mitra: 'Mitra Cakra' },
    { id: 't-5', nama: 'Maya Larasati', status: 'In Hiring Process', pendidikan: 'S1', pengalaman: '2–4 th', spesialisasi: 'UI/UX Designer', skor: 88, ekspektasi: 8000000, mitra: '—' },
    { id: 't-6', nama: 'Hendra Kurniawan', status: 'Hired', pendidikan: 'S2', pengalaman: '>6 th', spesialisasi: 'Project Manager', skor: 91, ekspektasi: 15000000, mitra: 'Mitra Nusantara' },
    { id: 't-7', nama: 'Salsa Ramadhani', status: 'Active Pool', pendidikan: 'S1', pengalaman: '0–2 th', spesialisasi: 'Business Team', skor: 81, ekspektasi: 6000000, mitra: '—', catatan: 'Tidak lolos Marketing Team (Okt 2026)' },
  ],
  offers: [
    { id: 'of-1', talent: 't-2', job: 'job-2', status: 'Menunggu', batas: '19 Nov 2026' },
  ],
  employees: [
    { id: 'e-1', nama: 'Aditya Wirawan', branch: 'Branch Jakarta', jabatan: 'Staff Product Development', divisi: 'Team Product', tipe: 'Kontrak', thp: 9000000, masuk: '2025-01-06', keluar: '2027-01-05', berkas: 'PKWT', status: 'Full Signed', jalur: 'Selection', skema: 'Normal', shift: 'Shift 1', aktif: true },
    { id: 'e-2', nama: 'Citra Puspita', branch: 'Branch Jakarta', jabatan: 'Business Team Staff', divisi: 'Team Business', tipe: 'Kontrak', thp: 7000000, masuk: '2025-12-01', keluar: '2026-11-30', berkas: 'PKWT', status: 'Full Signed', jalur: 'Selection', skema: 'Normal', shift: 'Shift 1', aktif: true },
    { id: 'e-3', nama: 'Rizky Hidayat', branch: 'Branch Jakarta', jabatan: 'Manager Product Development', divisi: 'Team Product', tipe: 'Kontrak', thp: 18000000, masuk: '2024-03-01', keluar: '2027-02-28', berkas: 'Amandemen PKWT', status: 'Employee Signed', jalur: 'Non-Selection', skema: 'Khusus', shift: 'Shift 1', aktif: true },
    { id: 'e-4', nama: 'Nabila Zahra', branch: 'Branch Bandung', jabatan: 'UI/UX Designer', divisi: 'Team Product', tipe: 'Freelance', thp: 8000000, masuk: '2026-06-01', keluar: '2026-12-31', berkas: 'Kontrak Freelance', status: 'Sent', jalur: 'Selection', skema: 'Khusus', shift: 'Shift 2', aktif: true },
    { id: 'e-5', nama: 'Teguh Santika', branch: 'Branch Surabaya', jabatan: 'Data Analyst', divisi: 'Team Data', tipe: 'Kontrak', thp: 11000000, masuk: '2025-07-01', keluar: '2026-12-15', berkas: 'PKWT', status: 'Full Signed', jalur: 'Selection', skema: 'Normal', shift: 'Shift 1', aktif: true },
    { id: 'e-6', nama: 'Ayu Kartika', branch: 'Branch Bandung', jabatan: 'Admin Support', divisi: 'Team Ops', tipe: 'Magang', thp: 4500000, masuk: '2026-08-01', keluar: '2027-01-31', berkas: 'Kontrak Internship', status: 'None', jalur: 'Non-Selection', skema: 'Khusus', shift: 'Shift 1', aktif: true },
  ],
  remunerations: [
    { id: 'rm-1', branch: 'Branch Jakarta', bulan: 'Desember 2026', status: 'In Review', thr: false, kak: false, dibuat: '10 Nov 2026', files: ['Permohonan Perpanjangan Kontrak.pdf'],
      rows: [
        { emp: 'e-1', jenis: 'Active', addition: [{ ket: 'Lembur 6 jam (Nov)', nominal: 520000, auto: true }], deduction: [] },
        { emp: 'e-2', jenis: 'Renewal', baru: { keluar: '2027-11-30', thp: 7500000 }, addition: [], deduction: [] },
        { emp: 'e-3', jenis: 'Salary', baru: { thp: 19500000 }, addition: [{ ket: 'Rapel kenaikan Okt–Nov', nominal: 3000000 }], deduction: [{ ket: 'Potongan absen 1 hari', nominal: 818182, auto: true }] },
      ] },
    { id: 'rm-2', branch: 'Branch Bandung', bulan: 'November 2026', status: 'Approved', thr: false, kak: false, dibuat: '28 Okt 2026', files: [], rows: [{ emp: 'e-4', jenis: 'Active', addition: [{ ket: 'Reimburse transport', nominal: 350000, auto: true }], deduction: [] }, { emp: 'e-6', jenis: 'New Hiring', addition: [], deduction: [] }] },
    { id: 'rm-3', branch: 'Branch Surabaya', bulan: 'November 2026', status: 'Rejected', note: 'Lampiran surat permohonan belum ada', thr: false, kak: false, dibuat: '27 Okt 2026', files: [], rows: [{ emp: 'e-5', jenis: 'Duration', baru: { keluar: '2027-06-30' }, addition: [], deduction: [] }] },
    { id: 'rm-4', branch: 'Branch Jakarta', bulan: 'Januari 2027', status: 'Draft', thr: true, kak: false, dibuat: '11 Nov 2026', files: [], rows: [{ emp: 'e-1', jenis: 'Active', addition: [], deduction: [] }] },
  ],
  docBatches: [
    { id: 'db-1', branch: 'Branch Bandung', bulan: 'November 2026', setelan: 'Semua', status: 'Process',
      rows: [
        { emp: 'e-4', jenis: 'Active', dokumen: '—', status: 'Tidak perlu dokumen' },
        { emp: 'e-6', jenis: 'New Hiring', dokumen: 'Kontrak Internship', mode: 'New Contract Template', status: 'None' },
      ] },
    { id: 'db-2', branch: 'Branch Jakarta', bulan: 'Oktober 2026', setelan: 'Existing Contract', status: 'Complete',
      rows: [{ emp: 'e-3', jenis: 'Salary', dokumen: 'Amandemen PKWT', mode: 'Existing Contract', status: 'Employee Signed' }] },
  ],
  disbursements: [
    { id: 'ds-1', branch: 'Branch Bandung', bulan: 'November 2026', total: 13420000, orang: 2, status: 'Waiting Transfer', va: '8808 0012 3345 6789' },
    { id: 'ds-2', branch: 'Branch Jakarta', bulan: 'Oktober 2026', total: 41250000, orang: 3, status: 'Completed', va: '8808 0012 3345 1100' },
    { id: 'ds-3', branch: 'Branch Surabaya', bulan: 'Oktober 2026', total: 12890000, orang: 1, status: 'Failed', va: '8808 0012 3345 2201', alasan: 'Nama rekening tidak sesuai' },
  ],
  jobApprovals: [
    { id: 'ja-1', job: 'job-3', branch: 'Branch Bandung', diajukan: '9 Nov 2026', status: 'Waiting' },
  ],
  leaves: [
    { id: 'lv-1', emp: 'e-2', kategori: 'Annual Leave', dari: '2026-12-22', sampai: '2026-12-24', hari: 3, alasan: 'Acara keluarga', status: 'Waiting', line: [{ nama: 'Rizky Hidayat', level: 'Manager', status: 'Approved' }, { nama: 'HR', level: 'Hirarki 1', status: 'Waiting' }] },
    { id: 'lv-2', emp: 'e-1', kategori: 'Sick Leave', dari: '2026-11-03', sampai: '2026-11-04', hari: 2, alasan: 'Demam', status: 'Approved', line: [{ nama: 'Rizky Hidayat', level: 'Manager', status: 'Approved' }, { nama: 'HR', level: 'Hirarki 1', status: 'Approved' }] },
    { id: 'lv-3', emp: 'e-5', kategori: 'Annual Leave', dari: '2026-10-10', sampai: '2026-10-10', hari: 1, alasan: 'Urusan pribadi', status: 'Rejected', line: [{ nama: 'HR', level: 'Hirarki 1', status: 'Rejected' }], note: 'Lewat batas waktu persetujuan' },
  ],
  overtimes: [
    { id: 'ot-1', emp: 'e-1', judul: 'Migrasi server', tanggal: '2026-11-10', jam: '19:00–22:00', durasi: 3, kategori: 'Lembur Karyawan', status: 'Waiting' },
    { id: 'ot-2', emp: 'e-2', judul: 'Event peluncuran', tanggal: '2026-11-08', jam: '09:00–14:00', durasi: 5, kategori: 'Lembur Hari Libur', status: 'Approved' },
  ],
  reimburses: [
    { id: 'rb-1', emp: 'e-1', jenis: 'Dinas Luar', judul: 'Kunjungan klien Bogor', nominal: 450000, tanggal: '2026-11-07', status: 'Waiting' },
    { id: 'rb-2', emp: 'e-3', jenis: 'Kesehatan', judul: 'Rawat jalan', nominal: 325000, tanggal: '2026-11-02', status: 'Approved' },
    { id: 'rb-3', emp: 'e-2', jenis: 'Kacamata', judul: 'Lensa baru', nominal: 1200000, tanggal: '2026-10-28', status: 'Rejected', note: 'Nota tidak terbaca' },
  ],
  inventories: [
    { id: 'iv-1', emp: 'e-1', kategori: 'Alat Kerja', item: 'Laptop 14 inci', status: 'Accepted', tanggal: '2025-01-06' },
    { id: 'iv-2', emp: 'e-2', kategori: 'Alat Kerja', item: 'Headset', status: 'Waiting', tanggal: '2026-11-11' },
  ],
  resigns: [
    { id: 'rs-1', emp: 'e-5', lastDay: '2026-12-15', alasan: 'Melanjutkan studi', inventory: 'Incomplete', status: 'Waiting', diajukan: '2026-11-12' },
  ],
  attendance: [
    { id: 'at-1', emp: 'e-1', tanggal: '2026-11-12', masuk: '08:41', pulang: '—', lokasi: 'Kantor Jakarta', status: 'Hadir' },
    { id: 'at-2', emp: 'e-2', tanggal: '2026-11-12', masuk: '09:17', pulang: '—', lokasi: 'Kantor Jakarta', status: 'Terlambat' },
    { id: 'at-3', emp: 'e-3', tanggal: '2026-11-12', masuk: '08:05', pulang: '—', lokasi: 'WFA · Depok', status: 'Hadir' },
    { id: 'at-4', emp: 'e-5', tanggal: '2026-11-12', masuk: '—', pulang: '—', lokasi: '—', status: 'Cuti' },
  ],
  mitra: [
    { id: 'm-1', nama: 'Mitra Cakra', pic: 'Dian Puspa', email: 'halo@mitracakra.id', telp: '0812 3456 7890', talent: 14, diundang: 4, diproses: 2, terpilih: 1 },
    { id: 'm-2', nama: 'Mitra Nusantara', pic: 'Arif Budiman', email: 'kontak@mitranusantara.id', telp: '0813 2233 4455', talent: 9, diundang: 2, diproses: 1, terpilih: 1 },
  ],
  pretests: [
    { id: 'pt-1', nama: 'Wawancara Mandiri', kategori: 'Wawancara Mandiri', tipe: 'Live Recording', durasi: 15, soal: 4, aktif: true },
    { id: 'pt-2', nama: 'Tes Potensi Akademik', kategori: 'Tes Kepribadian', tipe: 'Pilihan Ganda', durasi: 30, soal: 40, aktif: true },
    { id: 'pt-3', nama: 'Psikotes DISC', kategori: 'Tes Kepribadian', tipe: 'Pilihan Ganda', durasi: 20, soal: 24, aktif: false },
    { id: 'pt-4', nama: 'Tes Excel', kategori: 'Tes Kompetensi', tipe: 'Upload Dokumen', durasi: 45, soal: 3, aktif: true },
    { id: 'pt-5', nama: 'Pandangan Terhadap Isu Kerja', kategori: 'Tes Kompetensi', tipe: 'Essay', durasi: 20, soal: 3, aktif: false },
  ],
  announcements: [
    { id: 'an-1', judul: 'Libur Natal & Cuti Bersama', isi: '24–26 Desember 2026 kantor tutup. Selamat berlibur!', tanggal: '2026-11-10', kepada: 'Semua Branch' },
    { id: 'an-2', judul: 'Payroll November cair 25 Nov', isi: 'Pastikan rekening di profil sudah benar.', tanggal: '2026-11-08', kepada: 'Semua Branch' },
  ],
  approvalSettings: [
    { id: 'Cuti', aktif: true, batas: 3, levels: ['Atasan langsung', 'HR (akhir)'] },
    { id: 'Lembur', aktif: true, batas: 2, levels: ['Atasan langsung', 'HR (akhir)'] },
    { id: 'Reimbursement', aktif: true, batas: 5, levels: ['Atasan langsung', 'Manager', 'HR (akhir)'] },
    { id: 'Koreksi Absensi', aktif: false, batas: 2, levels: ['HR (akhir)'] },
    { id: 'Resign', aktif: true, batas: 14, levels: ['Atasan langsung', 'HR (akhir)'] },
  ],
  leaveTypes: [
    { id: 'Annual Leave', kuota: 12, carry: 3 }, { id: 'Sick Leave', kuota: 8, carry: 0 },
    { id: 'Marriage Leave', kuota: 3, carry: 0 }, { id: 'Cuti Ibadah', kuota: 20, carry: 0 },
  ],
  reimburseTypes: [
    { id: 'Kesehatan', limit: 5000000 }, { id: 'Kacamata', limit: 1500000 }, { id: 'Dinas Luar', limit: 10000000 },
  ],
  holidays: [
    { tanggal: '2026-12-24', nama: 'Cuti Bersama Natal' }, { tanggal: '2026-12-25', nama: 'Hari Raya Natal' },
    { tanggal: '2027-01-01', nama: 'Tahun Baru Masehi' }, { tanggal: '2026-12-29', nama: 'Blackout: tutup buku', blackout: true },
  ],
  inbox: [
    { id: 'ib-1', dari: 'HR Kirana', judul: 'Kontrak Amandemen siap ditandatangani', isi: 'Silakan buka menu Kontrak untuk meninjau dan menandatangani.', tanggal: '2026-11-11', baca: false },
    { id: 'ib-2', dari: 'Sistem', judul: 'Cuti 22–24 Des disetujui atasan', isi: 'Menunggu persetujuan akhir HR.', tanggal: '2026-11-10', baca: true },
  ],
}
