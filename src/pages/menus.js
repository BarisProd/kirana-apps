// Definisi menu per role. Key menu admin = kunci izin yang diatur superadmin di "Admin & Izin".
export const ADMIN_MENU = [
  { group: 'Umum', items: [['dashboard', 'Dashboard', 'home'], ['blast', 'Blast Notifikasi', 'megaphone'], ['event', 'Event', 'calendar']] },
  { group: 'Rekrutmen', items: [['approval-lowongan', 'Approval Lowongan', 'approval'], ['talent-pool', 'Talent Pool', 'users'], ['pretest', 'Pre-test', 'test'], ['penilaian', 'Penilaian', 'star'], ['mitra', 'Mitra', 'handshake']] },
  { group: 'Payroll', items: [['approval-remunerasi', 'Approval Remunerasi', 'wallet'], ['send-document', 'Send Document', 'send'], ['disbursement', 'Disbursement', 'layers'], ['payslip-admin', 'Payslip', 'receipt']] },
  { group: 'Aktivitas Karyawan', items: [['data-karyawan', 'Data Karyawan', 'users'], ['absensi', 'Absensi', 'clock'], ['dashboard-absensi', 'Dashboard Absensi', 'chart'], ['potongan-absensi', 'Potongan Absensi', 'wallet'], ['cuti', 'Cuti', 'calendar'], ['lembur', 'Lembur', 'star'], ['reimbursement', 'Reimbursement', 'receipt'], ['inventaris', 'Inventaris', 'box'], ['audit-aset', 'Audit Aset', 'approval'], ['resign', 'Resign', 'door']] },
  { group: 'Pengaturan', items: [['admin-izin', 'Admin & Izin', 'lock'], ['review-akses', 'Review Akses', 'approval'], ['akun-branch', 'Akun Branch', 'building'], ['setup-lowongan', 'Setup Lowongan', 'briefcase'], ['setup-remunerasi', 'Setup Remunerasi', 'settings'], ['setup-aktivitas', 'Setup Aktivitas', 'calendar'], ['akses-talent', 'Akses Talent', 'user'], ['setup-dokumen', 'Setup Dokumen', 'doc']] },
]
export const SUPER_ONLY = ['admin-izin', 'akun-branch', 'review-akses'] // review akses = keputusan manajer (Superadmin), tidak didelegasikan

// Izin CRUD per fitur untuk akun Admin. 'r' (Lihat) selalu tersedia: buka menu, cari, sort, filter, unduh.
// c = Tambah (buat data baru, kirim, upload), u = Ubah (edit, approve/reject, aktif/nonaktif, simpan pengaturan), d = Hapus.
export const ACTIONS = [['r', 'Lihat', 'Buka menu, cari, sort, filter, unduh'], ['c', 'Tambah', 'Buat data baru, kirim, upload'], ['u', 'Ubah', 'Edit, approve/reject, aktif/nonaktif, simpan pengaturan'], ['d', 'Hapus', 'Hapus data']]
export const FEATURE_CAPS = {
  dashboard: [], blast: ['c', 'd'], event: ['c', 'u', 'd'],
  'approval-lowongan': ['u'], 'talent-pool': ['c'], pretest: ['c', 'u', 'd'], penilaian: ['u'], mitra: ['c', 'u'],
  'approval-remunerasi': ['u'], 'send-document': ['c', 'u', 'd'], disbursement: ['c', 'u'], 'payslip-admin': ['c', 'u'],
  'data-karyawan': ['u'], absensi: ['c', 'u'], 'dashboard-absensi': [], 'potongan-absensi': ['u'], cuti: ['c', 'u', 'd'], lembur: ['c', 'u', 'd'], reimbursement: ['c', 'u', 'd'], inventaris: ['c', 'u', 'd'], 'audit-aset': ['c', 'u'], resign: ['u'],
  'setup-lowongan': ['c', 'u', 'd'], 'setup-remunerasi': ['u'], 'setup-aktivitas': ['c', 'u', 'd'], 'akses-talent': ['u'], 'setup-dokumen': ['c', 'u', 'd'],
}
export const capsOf = (k) => FEATURE_CAPS[k] ?? ['c', 'u', 'd']
// Arti aksi per fitur (ditampilkan di matriks Admin & Izin)
export const FEATURE_NOTE = {
  'approval-remunerasi': 'Lihat: rekap status & daftar · Ubah: approve/reject',
  disbursement: 'Lihat: daftar, dashboard, daftar VA · Tambah: buat disbursement & VA, ingatkan Branch · Ubah: aktif/nonaktif VA',
  'payslip-admin': 'Lihat: rekap & riwayat pengiriman, log setup · Tambah: Manual Send · Ubah: setup jadwal pengiriman',
  absensi: 'Tambah: koreksi manual · Ubah: setujui/tolak keterlambatan',
  'dashboard-absensi': 'Hanya lihat & unduh Excel',
  'potongan-absensi': 'Lihat: laporan potongan · Ubah: aturan potongan per Branch',
  cuti: 'Tambah/Ubah/Hapus: kategori cuti & izin, approval, Talent Setting',
  inventaris: 'Lihat: daftar, rekap & dashboard pengembalian · Tambah: serahkan barang · Ubah: tandai dikembalikan · Hapus: kategori',
  blast: 'Lihat: rekap kategori × Branch & riwayat blast · Tambah: kirim blast (app, e-mail, atau keduanya) · Hapus: hapus riwayat blast',
  event: 'Lihat: kalender & daftar event per bulan · Tambah: buat event (Branch, peserta, gambar) · Ubah: edit event · Hapus: hapus event',
  'audit-aset': 'Lihat: dashboard, register aset, pergerakan, unduh · Tambah: catat barang masuk · Ubah: lapor rusak/hilang, catat & selesaikan servis',
  'setup-aktivitas': 'Tambah/Ubah/Hapus: kalender kerja, hari libur, jam shift',
  'akses-talent': 'Lihat: fase & status menu karier tiap talent · Ubah: aturan umum menu karier, buka/cabut akses manual per talent',
}
// Boleh melakukan aksi a pada fitur k? Aksi yang tidak dikenal fitur itu mengikuti izin kelola apa pun yang dimiliki.
export function canDo(admin, k, a) {
  if (!admin) return true
  if (!admin.perms.includes(k)) return false
  if (a === 'r') return true
  const g = (admin.acc && admin.acc[k]) || {}, caps = capsOf(k)
  if (a === 'cu') return caps.some((x) => (x === 'c' || x === 'u') && g[x]) || (!caps.includes('c') && !caps.includes('u') && caps.some((x) => g[x]))
  return caps.includes(a) ? !!g[a] : caps.some((x) => g[x])
}
export const accSummary = (admin) => { const k = admin.perms.filter((p) => !SUPER_ONLY.includes(p)); const kel = k.filter((p) => ['c', 'u', 'd'].some((a) => admin.acc?.[p]?.[a])); return { lihat: k.length, kelola: kel.length } }

export const BRANCH_MENU = [
  { group: 'Umum', items: [['dashboard', 'Dashboard', 'home']] },
  { group: 'Rekrutmen', items: [['lowongan', 'Lowongan', 'briefcase'], ['seleksi', 'Seleksi Kandidat', 'users'], ['talent-pool', 'Talent Pool', 'star']] },
  { group: 'Karyawan', items: [['data-karyawan', 'Data Karyawan', 'user'], ['remunerasi', 'Remunerasi', 'wallet'], ['payslip', 'Payslip', 'receipt']] },
  { group: 'Lihat data (read-only)', items: [['absensi', 'Absensi', 'clock'], ['dashboard-absensi', 'Dashboard Absensi', 'chart'], ['cuti', 'Cuti', 'calendar'], ['lembur', 'Lembur', 'star'], ['reimbursement', 'Reimbursement', 'receipt'], ['inventaris', 'Inventaris', 'box'], ['audit-aset', 'Audit Aset', 'layers'], ['resign', 'Resign', 'door']] },
]
export const BRANCH_RO = ['absensi', 'dashboard-absensi', 'cuti', 'lembur', 'reimbursement', 'inventaris', 'audit-aset', 'resign']

export const TALENT_MENU = [
  { group: 'Kerja', items: [['beranda', 'Beranda', 'home'], ['absensi', 'Absensi', 'clock'], ['cuti', 'Cuti', 'calendar'], ['lembur', 'Lembur', 'star'], ['reimbursement', 'Reimbursement', 'receipt'], ['payslip', 'Payslip', 'wallet']] },
  { group: 'Karier', items: [['lowongan', 'Lowongan & Tawaran', 'briefcase'], ['jadwal', 'Jadwal Wawancara', 'calendar'], ['pretest', 'Pre-test', 'test'], ['kontrak', 'Kontrak', 'doc']] },
  { group: 'Profil', items: [['biodata', 'Biodata & Berkas', 'user'], ['inventaris', 'Inventaris', 'box'], ['resign', 'Resign', 'door'], ['inbox', 'Inbox', 'inbox']] },
  { group: 'Lainnya', items: [['event', 'Event', 'megaphone'], ['karyawan', 'Karyawan', 'users'], ['feedback', 'Feedback', 'mail'], ['review', 'Reviews & More', 'layers'], ['akun', 'Akun & Keamanan', 'settings']] },
]

export const MITRA_MENU = [
  { group: 'Mitra', items: [['dashboard', 'Dashboard', 'home'], ['lowongan', 'Permintaan Klien', 'briefcase'], ['talent', 'Talent Saya', 'users'], ['klien', 'Klien & Penempatan', 'building'], ['kerjasama', 'Kerja Sama', 'handshake'], ['inbox', 'Inbox', 'inbox'], ['profil', 'Profil & Akun', 'user']] },
]

export const ROOT_MENU = [
  { group: 'Umum', items: [['dashboard', 'Dashboard', 'home']] },
  { group: 'Customer', items: [['customer', 'Customer', 'building'], ['data-customer', 'Data Turunan', 'users'], ['storage', 'Storage', 'layers']] },
  { group: 'Platform', items: [['mitra', 'Mitra Talent Pool', 'users'], ['pihak-ketiga', 'Layanan Pihak Ketiga', 'handshake']] },
  { group: 'Audit & Keamanan', items: [['audit-log', 'Audit Log', 'clock'], ['access-review', 'Review Akses', 'approval'], ['pam', 'Akses Istimewa', 'key'], ['kepatuhan', 'Laporan Kepatuhan', 'chart']] },
  { group: 'Akun', items: [['reset-password', 'Reset Password', 'lock'], ['profile', 'Profil', 'user']] },
]

export const ROLES = {
  root: { label: 'Root · Pemilik Kirana', who: 'Putri Amalia', menu: ROOT_MENU },
  superadmin: { label: 'Superadmin', who: 'Rani Hapsari', menu: ADMIN_MENU, org: 'PT Talenta Digital Nusantara' },
  admin: { label: 'Admin Operasional', who: 'Dewi Anggraini', menu: ADMIN_MENU },
  branch: { label: 'Branch', who: 'Branch Jakarta Digital', menu: BRANCH_MENU },
  talent: { label: 'Talent', who: 'Putri Amalia', menu: TALENT_MENU },
  mitra: { label: 'Mitra Talent Pool', who: 'Mitra Karya Talenta', menu: MITRA_MENU },
}
