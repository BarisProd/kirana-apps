// Gabungkan data contoh aplikasi Talent (versi 21 Nov) ke data utama Kirana HRIS.
// Aturan: koleksi yang belum ada disalin utuh; item dengan id baru ditambahkan; item yang sudah ada hanya dilengkapi field yang kosong.
import { talentSeedRaw } from './talentSeedData.js'

const fill = (a, b) => { Object.keys(b).forEach((k) => { if (a[k] === undefined) a[k] = b[k] }) ; return a }
export function mergeTalent(s) {
  const T = talentSeedRaw()
  // koleksi/objek yang belum ada di data utama
  ;['interviews', 'pretestDone', 'penilaian', 'docPJ', 'docTemplates', 'docSeq', 'docMessage', 'contractAgreed', 'kliring', 'remunAdj', 'messages', 'feedbacks', 'talentAccess', 'talentDemo', 'events', 'calendars', 'absenSetup', 'blackout', 'leaveTenure', 'leavePolicy', 'leaveAdjust', 'overtimeSetup', 'reimburseSetup', 'invCategories', 'org', 'approvalLine', 'masters', 'mitras', 'pretests', 'admins', 'clock']
    .forEach((k) => { if (s[k] === undefined && T[k] !== undefined) s[k] = T[k] })
  // tambah item baru (id belum ada) + lengkapi field item lama
  const merge = (k, keyOf = (x) => x.id) => {
    if (!Array.isArray(T[k])) return; if (!Array.isArray(s[k])) { s[k] = T[k]; return }
    T[k].forEach((t) => { const m = s[k].find((x) => keyOf(x) === keyOf(t)); if (m) fill(m, t); else s[k].push(t) })
  }
  ;['jobs', 'candidates', 'pool', 'offers', 'docBatches', 'leaveTypes', 'overtimeTypes', 'reimburseTypes', 'pretestSets'].forEach((k) => merge(k))
  merge('holidays', (x) => x.tanggal + x.nama)
  // pesan inbox untuk talent yang belum ada
  T.inbox.filter((n) => n.to === 'talent' && !s.inbox.some((x) => x.id === n.id)).forEach((n) => s.inbox.push(n))
  // cuti contoh talent yang belum ada
  T.leaves.filter((l) => !s.leaves.some((x) => x.id === l.id)).forEach((l) => s.leaves.push(l))
  // karyawan e0–e8 sama orangnya: lengkapi data rekening
  T.employees.filter((e) => /^e[0-8]$/.test(e.id)).forEach((t) => { const m = s.employees.find((x) => x.id === t.id && x.name === t.name); if (m) fill(m, { rekening: t.rekening, pemegang: t.pemegang, bankStatus: t.bankStatus }) })
  // inventaris Putri: detail serah-terima (seri, catatan admin, kondisi)
  T.inventories.forEach((t) => { const m = s.inventories.find((x) => x.id === t.id && x.emp === t.emp && x.item === t.item); if (m) fill(m, t) })
  // Pre-test: kandidat demo yang sudah dinilai dianggap selesai mengerjakan set aktif
  { const act = s.pretestSets.find((x) => x.aktif); if (act) ['p2', 'p5'].forEach((id) => { s.pretestDone[id] = s.pretestDone[id] || act.modul.map((m) => m.id) }) }
  // Akses menu karier talent: default disembunyikan saat kontrak aktif (diatur di Superadmin › Akses Talent)
  s.talentAccess = { lowongan: { aktif: 'sembunyi', resign: true }, jadwal: { aktif: 'sembunyi', resign: true }, pretest: { aktif: 'sembunyi', resign: true } }
  s.talentOverride = {
    h150: { menu: { lowongan: 'buka', jadwal: 'buka', pretest: 'buka' }, alasan: 'Kontrak berakhir 15 Jan 2027 dan tidak diperpanjang; boleh mencari posisi internal lain.', sampai: '2027-01-15', oleh: 'Rani Hapsari', at: '2026-11-12 10:20' },
    e1: { menu: { pretest: 'buka' }, alasan: 'Ikut seleksi promosi internal Product Owner (pre-test kompetensi).', sampai: '2026-12-15', oleh: 'Rani Hapsari', at: '2026-11-05 14:00' },
  }
  s.talentAccessLog = [
    { at: '2026-11-12 10:20', oleh: 'Rani Hapsari', aksi: 'Akses manual dibuka', target: 'h150', detail: 'Lowongan & Tawaran, Jadwal Wawancara, Pre-test · s.d. 15 Jan 2027' },
    { at: '2026-11-05 14:00', oleh: 'Rani Hapsari', aksi: 'Akses manual dibuka', target: 'e1', detail: 'Pre-test · s.d. 15 Des 2026' },
    { at: '2026-11-01 09:00', oleh: 'Rani Hapsari', aksi: 'Aturan umum diubah', target: '', detail: 'Kontrak aktif: semua menu karier disembunyikan · notice period: dibuka' },
  ]
  // Branch besar: lokasi absen
  if (s.absenSetup && !s.absenSetup.b4) s.absenSetup.b4 = { mode: { WFO: true, WFA: false }, lokasi: [{ id: 'b4l1', nama: 'Kantor Estate Pontianak', aktif: true, lat: -0.0263, lng: 109.3425, alamat: 'Jl. Ahmad Yani, Pontianak, Kalimantan Barat', radius: 150 }], shifts: [{ id: 'b4s1', nama: 'Shift Pagi Ops', aktif: true, masukDari: '06:45', masukSampai: '07:15', pulangDari: '15:00', pulangSampai: '15:59' }] }
}
// Setelah payslip dibangkitkan: tandai Branch tiap payslip (dipakai Payslip talent per perusahaan)
export function payslipBranch(s) { s.payslips.forEach((p) => { if (!p.branch) p.branch = s.employees.find((e) => e.id === p.emp)?.branch }) }
