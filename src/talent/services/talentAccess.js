// Aturan menu talent per fase kontrak (diatur superadmin di Setup Aktivitas › Akses Talent).
// Fase: 'kandidat' (pelamar/proses hiring, belum pernah punya kontrak) · 'aktif' (kontrak berjalan) · 'resign' (resign disetujui, kontrak belum berakhir) · 'selesai' (kontrak berakhir, belum ada kontrak baru)
export const KARIER = [['lowongan', 'Lowongan & Tawaran'], ['jadwal', 'Jadwal Wawancara'], ['pretest', 'Pre-test']]
// Disembunyikan & tidak bisa diakses saat kontrak berakhir, sampai talent punya kontrak baru
export const KERJA_TUTUP = ['absensi', 'rekap', 'cuti', 'lembur', 'reimbursement', 'inventaris', 'resign', 'event', 'karyawan', 'feedback', 'review']
// Default (21 Nov): saat kontrak aktif ketiga menu karier DISEMBUNYIKAN; terbuka saat notice period (resign disetujui), kontrak berakhir, atau belum punya kontrak.
export const DEFAULT_ACCESS = { lowongan: { aktif: 'sembunyi', resign: true }, jadwal: { aktif: 'sembunyi', resign: true }, pretest: { aktif: 'sembunyi', resign: true } }
export const PHASES = [['aktif', 'Kontrak aktif'], ['resign', 'Resign disetujui'], ['selesai', 'Kontrak berakhir']]

const today = () => new Date().toISOString().slice(0, 10)

// Fase dari data asli; s.talentDemo[id] hanya untuk simulasi di prototipe
export function talentPhase(s, id) {
  const demo = s.talentDemo?.[id]; if (demo) return demo
  return realPhase(s, id)
}
export function realPhase(s, id) {
  const e = s.employees.find((x) => x.id === id)
  if (!e) return s.pool.some((p) => p.id === id) ? 'kandidat' : 'selesai'
  const t = today()
  const rs = s.resigns.find((r) => r.emp === id && r.status === 'Approved')
  if ((e.status || 'Aktif') === 'Nonaktif' || !e.end || e.end < t || (rs && rs.lastDay < t)) return 'selesai'
  return rs ? 'resign' : 'aktif'
}

// 'buka' = bisa dipakai · 'kunci' = tampil tapi terkunci · 'sembunyi' = tidak tampil di menu
// Akses manual per talent (diatur Superadmin › Akses Talent). Mengalahkan aturan umum selama belum kedaluwarsa.
export function overrideOf(s, id, key) {
  const o = s.talentOverride?.[id]; if (!o || !o.menu?.[key]) return null
  if (o.sampai && o.sampai < today()) return null
  return o.menu[key]
}
export function karierState(s, id, key, phase = talentPhase(s, id)) {
  if (phase === 'selesai' || phase === 'kandidat') return 'buka'
  const ov = overrideOf(s, id, key); if (ov) return ov
  const cfg = (s.talentAccess || DEFAULT_ACCESS)[key] || DEFAULT_ACCESS[key]
  if (phase === 'resign' && cfg.resign) return 'buka'
  return cfg.aktif
}

export function menuState(s, id, key, phase = talentPhase(s, id)) {
  if (KARIER.some((k) => k[0] === key)) return karierState(s, id, key, phase)
  if ((phase === 'selesai' || phase === 'kandidat') && KERJA_TUTUP.includes(key)) return 'sembunyi'
  // Kandidat yang belum pernah digaji lewat Kirana tidak perlu menu Payslip
  if (phase === 'kandidat' && key === 'payslip' && !s.payslips.some((p) => p.emp === id)) return 'sembunyi'
  return 'buka'
}
