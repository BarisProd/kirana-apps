// Menu role Talent. Menu yang tampil disaring lagi oleh fase kontrak (services/talentAccess.js).
export const TALENT_MENU = [
  { group: 'Kerja', items: [['beranda', 'Beranda', 'home'], ['absensi', 'Absensi', 'clock'], ['cuti', 'Cuti', 'calendar'], ['lembur', 'Lembur', 'star'], ['reimbursement', 'Reimbursement', 'receipt'], ['payslip', 'Payslip', 'wallet'], ['rekap', 'Rekap Saya', 'chart']] },
  { group: 'Karier', items: [['lowongan', 'Lowongan & Tawaran', 'briefcase'], ['jadwal', 'Jadwal Wawancara', 'calendar'], ['pretest', 'Pre-test', 'test'], ['kontrak', 'Kontrak', 'doc']] },
  { group: 'Profil', items: [['biodata', 'Biodata & Berkas', 'user'], ['inventaris', 'Inventaris', 'box'], ['resign', 'Resign', 'door'], ['inbox', 'Inbox', 'inbox']] },
  { group: 'Lainnya', items: [['event', 'Event', 'megaphone'], ['karyawan', 'Karyawan', 'users'], ['feedback', 'Feedback', 'mail'], ['review', 'Reviews & More', 'layers'], ['akun', 'Akun & Keamanan', 'settings']] },
]

export const ROLES = {
  talent: { label: 'Talent', who: 'Talent', menu: TALENT_MENU },
}
