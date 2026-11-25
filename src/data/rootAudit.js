// Data contoh Audit, Review Akses (recertification), dan Privileged Access Management (PAM) untuk role Root.
// Semua tanggal relatif ke 19 Nov 2026 agar stabil; sesi/akses JIT yang sedang aktif relatif ke jam saat aplikasi dibuka.
import { rnd } from './rootSeed.js'

const T0 = new Date('2026-11-19T00:00:00')
const p2 = (n) => String(n).padStart(2, '0')
const dstr = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const isoAt = (d) => `${dstr(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`
const ago = (days, h = 9, m = 0) => { const d = new Date(T0); d.setDate(d.getDate() - days); d.setHours(h, m); return isoAt(d) }

export const APPS = { admin: 'Kirana Web · Admin', branch: 'Kirana Web · Branch', mobile: 'Kirana Mobile · Karyawan', root: 'Kirana Root Console', sistem: 'Sistem', db: 'Database produksi (bastion)' }
export const CITY = { c1: 'Jakarta', c2: 'Semarang', c3: 'Sidoarjo', c4: 'Pontianak', c5: 'Bandung' }
export const PLATFORM = 'kirana' // log internal tim Kirana (bukan milik customer)
const DEV = ['Chrome · Windows', 'Chrome · macOS', 'Safari · iPad', 'Edge · Windows', 'Safari · iPhone', 'Chrome · Android']
const MOB = ['Kirana App · Android', 'Kirana App · iOS']
const MODS = {
  Superadmin: ['Dashboard', 'Approval Remunerasi', 'Disbursement', 'Admin & Izin', 'Data Karyawan', 'Setup Remunerasi'],
  Admin: ['Absensi', 'Cuti', 'Data Karyawan', 'Payslip', 'Send Document', 'Lembur'],
  Branch: ['Remunerasi', 'Data Karyawan', 'Lowongan', 'Absensi'],
  Karyawan: ['Absensi', 'Payslip', 'Cuti', 'Profil'],
}
const KAT_MOD = { Autentikasi: 'Login', 'Akun & Izin': 'Admin & Izin', 'Data Karyawan': 'Data Karyawan', Rekrutmen: 'Rekrutmen', Payroll: 'Payroll', Pengaturan: 'Pengaturan', Langganan: 'Langganan', 'Akses Istimewa': 'PAM' }
export const ROOT_NET = { ip: '36.68.4.22', lokasi: 'Pontianak, ID', perangkat: 'Safari · iPad' }

export const ipOf = (seed) => { const r = rnd(seed); return `${[103, 36, 114, 182, 180][Math.floor(r() * 5)]}.${1 + Math.floor(r() * 250)}.${1 + Math.floor(r() * 250)}.${1 + Math.floor(r() * 250)}` }
const devOf = (seed, mob) => { const a = mob ? MOB : DEV; return a[Math.floor(rnd(seed + 'd')() * a.length)] }
export const appOf = (peran) => ({ Branch: APPS.branch, Karyawan: APPS.mobile, Root: APPS.root, Sistem: APPS.sistem })[peran] || APPS.admin

// Melengkapi log lama (tanpa metadata) dengan kolom audit.
export const enrich = (l) => {
  const k = l.customer + (l.email || l.aktor); const sys = l.peran === 'Sistem'; const root = l.peran === 'Root'
  return {
    email: '', ip: sys ? '—' : root ? ROOT_NET.ip : ipOf(k), lokasi: sys ? 'Server Kirana' : root ? ROOT_NET.lokasi : `${CITY[l.customer] || 'Jakarta'}, ID`,
    perangkat: sys ? '—' : root ? ROOT_NET.perangkat : devOf(k), aplikasi: appOf(l.peran), modul: KAT_MOD[l.kategori] || l.kategori,
    hasil: /gagal|dikunci|ditolak/i.test(l.aksi) ? 'Gagal' : 'Berhasil', risiko: /gagal/i.test(l.aksi) ? 'Sedang' : 'Rendah', ...l,
  }
}

const DORMANT = { 'yusuf@kirana.id': 34, 'solo@sinarretail.co.id': 41, 'smd@medikasehat.co.id': 63 }
function loginsOf(cid, a, { from = 0, to = 27 } = {}) {
  const r = rnd(cid + a.email); const mob = a.role === 'Karyawan'
  const ip = ipOf(cid + a.email), dev = devOf(cid + a.email, mob), lok = `${a.kota || CITY[cid]}, ID`
  let days = DORMANT[a.email] ? [DORMANT[a.email]] : Array.from({ length: 3 + Math.floor(r() * 4) }, () => from + Math.floor(r() * (to - from + 1)))
  days = [...new Set(days)]
  return days.map((d) => {
    const h = d === 0 ? 7 + Math.floor(r() * 6) : 7 + Math.floor(r() * 12); const m = Math.floor(r() * 60)
    const mods = MODS[a.role] || MODS.Admin; const i = Math.floor(r() * mods.length)
    return { customer: cid, at: ago(d, h, m), aktor: a.nama, email: a.email, peran: a.role, kategori: 'Autentikasi', aksi: 'Login berhasil', detail: `${dev} · ${lok}`,
      ip, lokasi: lok, perangkat: dev, aplikasi: appOf(a.role), modul: 'Login', hasil: 'Berhasil', risiko: 'Rendah',
      sesi: { durasi: 6 + Math.floor(r() * 95), akses: [mods[i], mods[(i + 2) % mods.length], ...(r() > 0.5 ? [mods[(i + 4) % mods.length]] : [])] } }
  })
}
const ev = (o) => ({ hasil: 'Berhasil', risiko: 'Rendah', modul: KAT_MOD[o.kategori] || o.kategori, ...o })
const chg = (customer, at, aktor, peran, aksi, akun, sebelum, sesudah, diajukan, penyetuju, net) =>
  ev({ customer, at, aktor, email: '', peran, kategori: 'Akun & Izin', aksi, detail: akun, akun, sebelum, sesudah, diajukan, penyetuju, aplikasi: appOf(peran), ...net })

// Akun yang ditinjau di review akses; reviewer = atasan (Superadmin), Superadmin ditinjau PIC bila orangnya berbeda.
const camp = (id, customer, nama, mulai, tenggat, accts, dec, o = {}) => ({
  id, customer, nama, mulai, tenggat, selesaiAt: o.selesai || '', cakupan: o.cakupan || 'Admin & Branch', dibuat: o.dibuat || 'Jadwal otomatis',
  items: accts.map((a, i) => ({ id: `${id}-${i}`, akunId: a.id, nama: a.nama, email: a.email, role: a.role, akses: a.akses, reviewer: a.reviewer, keputusan: dec[i]?.[0] || null, catatan: dec[i]?.[1] || '', at: dec[i]?.[2] || '' })),
  reminders: o.rem || [],
})
const rem = (at, jenis, ke) => ({ at, jenis, ke })

export const JIT_ROLES = [
  { k: 'db-ro', l: 'Database Admin · baca saja', ket: 'Query SELECT ke database produksi lewat bastion', risiko: 'Sedang', app: APPS.db },
  { k: 'db-rw', l: 'Database Admin · baca & tulis', ket: 'Perbaikan data (UPDATE/INSERT) di produksi', risiko: 'Tinggi', app: APPS.db },
  { k: 'support', l: 'Akses data customer (support)', ket: 'Melihat aplikasi customer sebagai Superadmin untuk troubleshooting, tanpa mengubah data', risiko: 'Sedang', app: 'Kirana Web · Admin (mode support)' },
  { k: 'break', l: 'Break-glass · Superadmin darurat', ket: 'Akses penuh darurat ke tenant; Superadmin & PIC customer langsung diberi tahu', risiko: 'Tinggi', app: 'Kirana Web · Admin (break-glass)' },
]

/**
 * @param root  hasil rootSeed()
 * @param c1    { accounts:[{id,nama,email,role,kota,akses}], employees:[{name,email,kota}] } tenant demo dari state aplikasi
 * @param now   Date saat aplikasi dibuka (untuk JIT/sesi yang sedang aktif)
 */
export function auditSeed(root, c1, now = new Date()) {
  const cs = root.customers; const cust = (id) => cs.find((c) => c.id === id)
  const acctsOf = (cid) => {
    const c = cust(cid)
    const sa = { id: cid + '-sa', nama: c.superadmin.nama, email: c.superadmin.email, role: 'Superadmin', kota: CITY[cid], akses: 'Seluruh fitur & pengaturan', reviewer: c.pic.nama !== c.superadmin.nama ? `${c.pic.nama} (PIC)` : '' }
    if (cid === 'c1') return [sa, ...c1.accounts.map((a) => ({ ...a, reviewer: c.superadmin.nama }))]
    const t = root.tenants[cid]
    return [sa, ...t.accounts.map((a) => { const b = t.branches.find((x) => x.id === a.branch); return { ...a, kota: b?.kota || CITY[cid], akses: a.role === 'Branch' ? `Portal Branch · ${b?.name}` : 'Data Karyawan, Absensi, Payroll (Lihat/Ubah)', reviewer: c.superadmin.nama } })]
  }
  const emps = (cid) => (cid === 'c1' ? c1.employees : root.tenants[cid].employees.filter((e) => e.status !== 'Resign').map((e) => ({ name: e.name, email: e.email, kota: root.tenants[cid].branches.find((b) => b.id === e.branch)?.kota }))).slice(0, 4)
  const win = { c1: {}, c2: {}, c3: { to: 9 }, c4: { from: 11, to: 30 }, c5: {} }

  const logs = []
  cs.forEach((c) => {
    acctsOf(c.id).forEach((a) => logs.push(...loginsOf(c.id, a, win[c.id])))
    emps(c.id).forEach((e) => logs.push(...loginsOf(c.id, { nama: e.name, email: e.email, role: 'Karyawan', kota: e.kota }, win[c.id])))
  })
  // Kejadian berisiko
  const sg = { ip: '119.73.12.8', lokasi: 'Singapura, SG', perangkat: 'Chrome · Linux', aplikasi: APPS.admin }
  logs.push(
    ev({ customer: 'c2', at: ago(5, 23, 40), aktor: 'Lina Marlina', email: 'lina@sinarretail.co.id', peran: 'Admin', kategori: 'Autentikasi', aksi: 'Login gagal (password salah)', detail: 'Percobaan 1', hasil: 'Gagal', risiko: 'Sedang', ...sg }),
    ev({ customer: 'c2', at: ago(5, 23, 42), aktor: 'Lina Marlina', email: 'lina@sinarretail.co.id', peran: 'Admin', kategori: 'Autentikasi', aksi: 'Login gagal (password salah)', detail: 'Percobaan 2', hasil: 'Gagal', risiko: 'Sedang', ...sg }),
    ev({ customer: 'c2', at: ago(5, 23, 45), aktor: 'Lina Marlina', email: 'lina@sinarretail.co.id', peran: 'Admin', kategori: 'Autentikasi', aksi: 'Login dari lokasi & perangkat baru', detail: 'Belum pernah dipakai akun ini · OTP e-mail terverifikasi', risiko: 'Tinggi', ...sg, sesi: { durasi: 4, akses: ['Data Karyawan', 'Payslip'] } }),
    ...[1, 2, 3, 4, 5].map((i) => ev({ customer: 'c5', at: ago(8, 7, i), aktor: 'Tia Rahayu', email: 'tia@medikasehat.co.id', peran: 'Admin', kategori: 'Autentikasi', aksi: 'Login gagal (password salah)', detail: `Percobaan ${i}`, hasil: 'Gagal', risiko: 'Sedang', ip: '182.1.77.30', lokasi: 'Bandung, ID', perangkat: 'Chrome · Windows', aplikasi: APPS.admin })),
    ev({ customer: 'c5', at: ago(8, 7, 6), aktor: 'Sistem', email: '', peran: 'Sistem', kategori: 'Autentikasi', aksi: 'Akun dikunci 30 menit (5x gagal)', detail: 'Tia Rahayu', hasil: 'Gagal', risiko: 'Tinggi', ip: '—', lokasi: 'Server Kirana', perangkat: '—', aplikasi: APPS.sistem }),
  )
  // Perubahan hak akses: siapa mengajukan, siapa menyetujui, sebelum → sesudah
  const net = (cid, nama) => ({ ip: ipOf(cid + nama), lokasi: `${CITY[cid]}, ID`, perangkat: devOf(cid + nama) })
  logs.push(
    chg('c2', ago(6, 10, 15), 'Budi Hartono', 'Superadmin', 'Menambah izin admin', 'Lina Marlina', 'Data Karyawan: Lihat', 'Data Karyawan: Lihat · Payroll: Lihat, Ubah', 'Lina Marlina (Admin)', 'Budi Hartono (Superadmin)', net('c2', 'b')),
    chg('c2', ago(14, 9, 0), 'Budi Hartono', 'Superadmin', 'Mengaktifkan akun Branch', 'Teguh Santoso · SinarMart Yogya', 'Nonaktif', 'Aktif', 'Agus Salim (Branch)', 'Budi Hartono (Superadmin)', net('c2', 'b')),
    chg('c5', ago(3, 16, 20), 'Yoga Permana', 'Superadmin', 'Memberi akses Disbursement', 'Bagas Pratama', 'Payroll: Lihat', 'Payroll: Lihat · Disbursement: Tambah', 'Yoga Permana (Superadmin)', 'Yoga Permana (Superadmin)', net('c5', 'y')),
    chg('c5', ago(16, 11, 0), 'Yoga Permana', 'Superadmin', 'Membuat akun admin', 'Bagas Pratama', '—', 'Admin · Payroll: Lihat', 'dr. Laila Kurnia (PIC)', 'Yoga Permana (Superadmin)', net('c5', 'y')),
    chg('c4', ago(30, 14, 0), 'Hendra Wijaya', 'Superadmin', 'Menonaktifkan akun Branch', 'Mega Putri · Kantor Pontianak', 'Aktif', 'Nonaktif', 'Ratna Sari (Admin)', 'Hendra Wijaya (Superadmin)', net('c4', 'h')),
  )

  // ---- Review akses (recertification) ----
  const A1 = acctsOf('c1').filter((a) => a.role !== 'Superadmin'); const A2 = acctsOf('c2').filter((a) => a.role !== 'Superadmin')
  const A4 = acctsOf('c4').filter((a) => a.role !== 'Superadmin'); const A5 = acctsOf('c5')
  const keep = (n, at) => Array.from({ length: n }, () => ['Pertahankan', '', at])
  const reviews = [
    camp('rv-c1-q4', 'c1', 'Review akses Q4 2026', '2026-11-10', '2026-11-24', A1, [['Pertahankan', 'Masih menangani absensi Jakarta & Bandung', ago(7, 10, 5)]],
      { rem: [rem(ago(9, 8, 0), 'Undangan review', 'Rani Hapsari'), rem(ago(2, 8, 0), 'Pengingat otomatis H-7', 'Rani Hapsari')] }),
    camp('rv-c1-q3', 'c1', 'Review akses Q3 2026', '2026-08-10', '2026-08-24', A1, keep(A1.length, '2026-08-20T14:00'), { selesai: '2026-08-20T14:05', rem: [rem('2026-08-10T08:00', 'Undangan review', 'Rani Hapsari'), rem('2026-08-17T08:00', 'Pengingat otomatis H-7', 'Rani Hapsari')] }),
    camp('rv-c2-q4', 'c2', 'Review akses Q4 2026', '2026-11-03', '2026-11-17', A2, [['Pertahankan', '', ago(12, 9, 30)]],
      { rem: [rem('2026-11-03T08:00', 'Undangan review', 'Budi Hartono'), rem('2026-11-10T08:00', 'Pengingat otomatis H-7', 'Budi Hartono'), rem('2026-11-14T08:00', 'Pengingat otomatis H-3', 'Budi Hartono'), rem('2026-11-16T08:00', 'Pengingat otomatis H-1', 'Budi Hartono'), rem('2026-11-18T08:00', 'Eskalasi: lewat tenggat', 'Budi Hartono, Putri Amalia (Root)')] }),
    camp('rv-c4-q3', 'c4', 'Review akses Q3 2026', '2026-08-01', '2026-08-15', A4, keep(A4.length, '2026-08-22T10:00'), { selesai: '2026-08-22T10:10', rem: [rem('2026-08-01T08:00', 'Undangan review', 'Hendra Wijaya'), rem('2026-08-14T08:00', 'Pengingat otomatis H-1', 'Hendra Wijaya'), rem('2026-08-16T08:00', 'Eskalasi: lewat tenggat', 'Hendra Wijaya, Putri Amalia (Root)')] }),
    camp('rv-c5-q4', 'c5', 'Review akses Q4 2026', '2026-10-27', '2026-11-10', A5, A5.map((a) => a.email === 'smd@medikasehat.co.id' ? ['Cabut', 'Tidak login lebih dari 60 hari, pindah tugas ke RS Bandung', '2026-11-09T11:20'] : ['Pertahankan', '', '2026-11-09T11:00']),
      { selesai: '2026-11-09T11:30', cakupan: 'Semua akun (termasuk Superadmin)', rem: [rem('2026-10-27T08:00', 'Undangan review', 'Yoga Permana, dr. Laila Kurnia'), rem('2026-11-03T08:00', 'Pengingat otomatis H-7', 'Yoga Permana, dr. Laila Kurnia')] }),
  ]
  root.tenants.c5.accounts.forEach((a) => { if (a.email === 'smd@medikasehat.co.id') a.aktif = false })
  reviews.filter((r) => r.selesaiAt).forEach((r) => logs.push(ev({ customer: r.customer, at: r.selesaiAt, aktor: r.items[0].reviewer, email: '', peran: 'Superadmin', kategori: 'Akun & Izin', aksi: `${r.nama} diselesaikan`, detail: `${r.items.length} akun · ${r.items.filter((i) => i.keputusan === 'Cabut').length} dicabut`, penyetuju: `${r.items[0].reviewer} (Superadmin)`, ...net(r.customer, 'rv'), aplikasi: APPS.admin })))
  const reviewPolicy = Object.fromEntries(cs.map((c) => [c.id, { aktif: c.status !== 'Trial', frek: c.paket === 'Enterprise' ? 'Triwulanan' : c.paket === 'Starter' ? 'Semesteran' : 'Triwulanan', durasi: 14, pengingat: [7, 3, 1], eskalasi: true, autoCabut: false, dormant: 30, berikut: c.status === 'Trial' ? '' : c.id === 'c5' ? '2027-01-26' : '2027-02-09' }]))

  // ---- PAM ----
  const mins = (n) => isoAt(new Date(now.getTime() + n * 60000))
  const team = [
    { id: 'p-root', nama: 'Putri Amalia', email: 'putri@kirana.id', jabatan: 'Platform Owner', tipe: 'Root', standing: true, twofa: true, pw: '2026-10-02', last: ago(0, 8, 2), penyetuju: true },
    { id: 'p-sec', nama: 'Sari Wulandari', email: 'sari@kirana.id', jabatan: 'Security Officer', tipe: 'Root', standing: true, twofa: true, pw: '2026-09-15', last: ago(0, 7, 40), penyetuju: true },
    { id: 'p-dba', nama: 'Dimas Prakoso', email: 'dimas@kirana.id', jabatan: 'Database Admin', tipe: 'Database Admin', standing: false, twofa: true, pw: '2026-08-30', last: ago(1, 22, 41) },
    { id: 'p-sup', nama: 'Nadia Putri', email: 'nadia@kirana.id', jabatan: 'Support L2', tipe: 'Support', standing: false, twofa: true, pw: '2026-10-20', last: mins(-20) },
    { id: 'p-ops', nama: 'Reza Mahendra', email: 'reza@kirana.id', jabatan: 'DevOps', tipe: 'Database Admin', standing: false, twofa: false, pw: '2026-05-02', last: ago(12, 14, 0) },
  ]
  const saTwofa = { c1: true, c2: true, c3: false, c4: true, c5: true }
  const jit = [
    { id: 'j1', pemohon: 'Dimas Prakoso', email: 'dimas@kirana.id', role: 'db-ro', customer: 'c5', durasi: 120, alasan: 'Investigasi selisih payroll RS Medika Bandung', tiket: 'SUP-2291', status: 'Berakhir', diajukanAt: ago(1, 20, 32), penyetuju: 'Putri Amalia', disetujuiAt: ago(1, 20, 40), mulai: ago(1, 20, 40), berakhir: ago(1, 22, 40), sesi: 's1' },
    { id: 'j2', pemohon: 'Nadia Putri', email: 'nadia@kirana.id', role: 'support', customer: 'c2', durasi: 60, alasan: 'Customer melaporkan file ekspor remunerasi kosong', tiket: 'SUP-2304', status: 'Aktif', diajukanAt: mins(-26), penyetuju: 'Sari Wulandari', disetujuiAt: mins(-21), mulai: mins(-20), berakhir: mins(40), sesi: 's4' },
    { id: 'j3', pemohon: 'Dimas Prakoso', email: 'dimas@kirana.id', role: 'db-rw', customer: 'c1', durasi: 30, alasan: 'Koreksi nomor rekening ganda 2 karyawan sebelum disbursement 25 Nov', tiket: 'SUP-2310', status: 'Menunggu', diajukanAt: mins(-8) },
    { id: 'j4', pemohon: 'Reza Mahendra', email: 'reza@kirana.id', role: 'db-rw', customer: 'c4', durasi: 240, alasan: 'Migrasi skema tabel absensi', tiket: 'OPS-118', status: 'Ditolak', diajukanAt: ago(4, 13, 0), penyetuju: 'Sari Wulandari', disetujuiAt: ago(4, 13, 20), catatanTolak: 'Customer sedang ditangguhkan & 2FA akun belum aktif. Ajukan ulang setelah 2FA aktif.' },
    { id: 'j5', pemohon: 'Nadia Putri', email: 'nadia@kirana.id', role: 'support', customer: 'c3', durasi: 60, alasan: 'Pendampingan trial: impor data karyawan gagal', tiket: 'SUP-2296', status: 'Berakhir', diajukanAt: ago(2, 10, 0), penyetuju: 'Putri Amalia', disetujuiAt: ago(2, 10, 4), mulai: ago(2, 10, 5), berakhir: ago(2, 11, 5), sesi: 's2' },
    { id: 'j6', pemohon: 'Putri Amalia', email: 'putri@kirana.id', role: 'break', customer: 'c5', durasi: 30, alasan: 'Superadmin RS terkunci saat tutup buku payroll', tiket: 'INC-077', status: 'Berakhir', diajukanAt: ago(9, 6, 50), penyetuju: 'Sari Wulandari', disetujuiAt: ago(9, 6, 52), mulai: ago(9, 6, 52), berakhir: ago(9, 7, 22), sesi: 's3' },
  ]
  const E = (t, k, text) => ({ t, k, text })
  const sessions = [
    { id: 's1', user: 'Dimas Prakoso', peran: 'Database Admin', jit: 'j1', customer: 'c5', app: APPS.db, ip: '10.20.1.15 (VPN)', mulai: ago(1, 20, 41), selesai: ago(1, 21, 37), events: [
      E('00:00', 'sys', 'Terhubung ke bastion db-prod-01 · MFA terverifikasi · mode BACA SAJA'),
      E('00:42', 'cmd', "SELECT id, nama, thp FROM employees WHERE tenant='c5' AND branch='c5-b1';"), E('00:43', 'out', '42 baris'),
      E('03:10', 'cmd', "SELECT * FROM remun_rows WHERE remun_id='rm-c5-1126' AND net <> expected_net;"), E('03:12', 'out', '3 baris · selisih karena UMR Bandung belum diperbarui'),
      E('11:55', 'cmd', "UPDATE remun_rows SET umr=4482914 WHERE remun_id='rm-c5-1126';"), E('11:55', 'alert', 'DITOLAK: izin baca saja. Upaya tercatat & Security Officer diberi tahu.'),
      E('12:30', 'cmd', "SELECT umr FROM setup_remun WHERE tenant='c5';"), E('12:31', 'out', '1 baris · 4.209.309'),
      E('55:40', 'sys', 'Keluar. Sesi ditutup oleh pengguna.'),
    ] },
    { id: 's2', user: 'Nadia Putri', peran: 'Support L2', jit: 'j5', customer: 'c3', app: 'Kirana Web · Admin (mode support)', ip: '36.68.9.14', mulai: ago(2, 10, 5), selesai: ago(2, 10, 49), events: [
      E('00:00', 'sys', 'Masuk sebagai Siti Rahma (Superadmin) · mode lihat saja · banner support tampil di layar customer'),
      E('00:20', 'nav', 'Membuka Dashboard'), E('01:05', 'nav', 'Membuka Data Karyawan'), E('02:40', 'view', 'Melihat riwayat impor: template-karyawan.xlsx (gagal di baris 12)'),
      E('09:15', 'view', 'Melihat profil karyawan Andi Saputra (data sensitif disamarkan: NIK, rekening)'), E('15:30', 'nav', 'Membuka Setup Aktivitas'),
      E('43:50', 'sys', 'Keluar. Ringkasan dikirim ke tiket SUP-2296.'),
    ] },
    { id: 's3', user: 'Putri Amalia', peran: 'Root', jit: 'j6', customer: 'c5', app: 'Kirana Web · Admin (break-glass)', ip: ROOT_NET.ip, mulai: ago(9, 6, 52), selesai: ago(9, 7, 14), events: [
      E('00:00', 'alert', 'BREAK-GLASS aktif · notifikasi dikirim ke Yoga Permana & dr. Laila Kurnia'),
      E('00:30', 'nav', 'Membuka Admin & Izin'), E('02:10', 'edit', 'Membuka kunci akun Yoga Permana (Superadmin)'), E('02:40', 'edit', 'Memaksa reset password Yoga Permana · dikirim ke e-mail terdaftar'),
      E('21:50', 'sys', 'Keluar. Akses break-glass dicabut otomatis.'),
    ] },
    { id: 's4', user: 'Nadia Putri', peran: 'Support L2', jit: 'j2', customer: 'c2', app: 'Kirana Web · Admin (mode support)', ip: '36.68.9.14', mulai: mins(-20), selesai: '', live: true, events: [
      E('00:00', 'sys', 'Masuk sebagai Budi Hartono (Superadmin) · mode lihat saja'), E('00:35', 'nav', 'Membuka Approval Remunerasi'),
      E('04:10', 'view', 'Membuka simulasi remunerasi SinarMart Solo · November 2026'), E('11:25', 'view', 'Mengunduh ulang Excel simulasi (uji ekspor)'),
    ] },
  ]
  const pamPolicy = { maxMenit: 240, wajibTiket: true, duaOrang: true, wajib2FA: true, rekamSesi: true, notifBreakGlass: true, sesiIdle: 15 }
  // Log audit untuk JIT
  jit.forEach((j) => {
    const r = JIT_ROLES.find((x) => x.k === j.role)
    logs.push(ev({ customer: j.customer, at: j.diajukanAt, aktor: j.pemohon, email: j.email, peran: 'Tim Kirana', kategori: 'Akses Istimewa', aksi: `Mengajukan akses JIT: ${r.l}`, detail: `${j.durasi} menit · ${j.tiket} · ${j.alasan}`, ...ROOT_NET, aplikasi: APPS.root, risiko: r.risiko }))
    if (j.disetujuiAt) logs.push(ev({ customer: j.customer, at: j.disetujuiAt, aktor: j.penyetuju, email: '', peran: 'Root', kategori: 'Akses Istimewa', aksi: j.status === 'Ditolak' ? `Menolak akses JIT ${j.pemohon}` : `Menyetujui akses JIT ${j.pemohon}`, detail: `${r.l} · ${j.durasi} menit`, diajukan: `${j.pemohon} (Tim Kirana)`, penyetuju: `${j.penyetuju} (Root)`, ...ROOT_NET, aplikasi: APPS.root, hasil: j.status === 'Ditolak' ? 'Gagal' : 'Berhasil', risiko: r.risiko }))
  })
  return { logs, reviews, reviewPolicy, pam: { team, saTwofa, jit, sessions, policy: pamPolicy, me: { mulai: isoAt(now) } } }
}
