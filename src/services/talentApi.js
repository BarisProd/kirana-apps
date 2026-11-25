// Aksi tambahan untuk aplikasi Talent (versi 21 Nov). Disalin dari kirana-talent/src/services/store.js
// dan dipasang ke api utama, sehingga pengajuan talent langsung terlihat di Superadmin/Admin/Branch.
import { api, update, uid } from './store.js'
import { ME } from '../talent/services/session.js'
const today = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toTimeString().slice(0, 5)
Object.assign(api, {
  // Talent Pool & Mitra (kerja sama penyaluran kandidat)
  readNotif: (id) => update((s) => { const n = s.inbox.find((x) => x.id === id); if (n) n.read = true }),
  readAllNotif: (fn) => update((s) => { s.inbox.forEach((n) => { if (fn(n)) n.read = true }) }),
  mitraSendMsg: (d) => update((s) => { (s.mitraMsgs ||= []).unshift({ id: uid('mm'), arah: 'keluar', dibaca: true, waktu: today() + ' ' + nowTime(), ...d })
    if (d.dengan === 'Superadmin') s.inbox.unshift({ id: uid('n'), to: 'admin', judul: 'Pesan dari mitra: ' + d.judul, isi: d.isi, waktu: today() + ' ' + nowTime(), link: 'mitra/' + d.mitra }) }),
  mitraReadMsg: (id) => update((s) => { const m = (s.mitraMsgs || []).find((x) => x.id === id); if (m) m.dibaca = true }),
  mitraUpdateProfil: (id, changes, oleh) => update((s) => { const m = s.mitras.find((x) => x.id === id); const at = today() + ' ' + nowTime()
    changes.forEach((c) => { m[c.key] = c.ke; (m.profilLog ||= []).unshift({ at, oleh, field: c.label, dari: c.dari, ke: c.ke }) })
    const info = changes.filter((c) => c.key !== 'foto')
    if (info.length) { const isi = `${m.name} mengubah ${info.map((c) => `${c.label} (${c.dari || '—'} → ${c.ke || '—'})`).join(', ')}.`
      s.inbox.unshift({ id: uid('n'), to: 'admin', judul: 'Perubahan profil mitra', isi, waktu: at, link: 'mitra/' + id })
      s.inbox.unshift({ id: uid('n'), to: 'root', judul: 'Perubahan profil mitra', isi, waktu: at, link: 'mitra/' + id }) } }),
  mitraChangePassword: (id) => update((s) => { const m = s.mitras.find((x) => x.id === id); m.pwChanged = today() + ' ' + nowTime() }),
  addMitra: (m, oleh = 'Rani Hapsari') => update((s) => { const id = uid('m'); const P = m.perjanjian || {}
    if (P.api?.aktif) { P.api.clientId = 'kpk_live_' + Math.random().toString(16).slice(2, 10).toUpperCase(); P.api.secret = '••••••••••••' + Math.random().toString(16).slice(2, 6) }
    s.mitras.push({ id, talent: 0, diundang: 0, diproses: 0, terpilih: 0, klien: ['c1'], ...m, dibuat: { at: today() + ' ' + nowTime(), oleh } }) }),
  mitraAgree: (id, oleh) => update((s) => { const m = s.mitras.find((x) => x.id === id); m.perjanjian.status = 'Aktif'; m.perjanjian.disetujui = { at: today() + ' ' + nowTime(), oleh: m.dibuat?.oleh || (m.mitraDengan === 'Owner Kirana' ? 'Putri Amalia (Owner Kirana)' : 'Rani Hapsari'), mitra: oleh }
    s.inbox.unshift({ id: uid('n'), to: 'admin', judul: 'Mitra menyetujui aturan kerja sama', isi: `${m.name} menyetujui aturan kerja sama. Akun mitra kini aktif.`, waktu: today() + ' ' + nowTime(), link: 'mitra/' + id }) }),
  sendRequisition: (r) => update((s) => { (s.requisitions ||= []).unshift({ id: uid('rq'), dikirim: today(), oleh: 'Rani Hapsari', ...r })
    if (r.mitra) s.inbox.unshift({ id: uid('n'), to: 'mitra', mitra: r.mitra, jenis: 'Superadmin', judul: 'Permintaan baru: ' + (r.posisi || 'kandidat'), isi: `Kuota ${r.kuota || '-'} kandidat, SLA ${r.sla || '-'} hari.`, waktu: today() + ' ' + nowTime(), link: 'lowongan', dari: 'Superadmin · Rani Hapsari' }) }),
  regenSecret: (id) => update((s) => { const m = s.mitras.find((x) => x.id === id); m.perjanjian.api.secret = '••••••••••••' + Math.random().toString(16).slice(2, 6) }),
  mitraAddTalent: (p) => update((s) => { s.pool.push({ id: uid('tp'), status: 'Registered', skor: null, sumber: 'Mitra', daftar: today(), aktif: true, ...p })
    const m = s.mitras.find((x) => x.name === p.mitra); if (m) s.inbox.unshift({ id: uid('n'), to: 'mitra', mitra: m.id, jenis: 'Aktivitas', judul: 'Talent baru terdaftar', isi: `${p.name} masuk talent pool (consent UU PDP tercatat). Undangan pre-test dikirim otomatis.`, waktu: today() + ' ' + nowTime(), link: 'talent', dari: 'Sistem · Talent Pool' }) }),
  // Superadmin › Akses Talent
  saveTalentAccess: (cfg, oleh, detail) => update((s) => { s.talentAccess = cfg; (s.talentAccessLog ||= []).unshift({ at: today() + ' ' + nowTime(), oleh, aksi: 'Aturan umum diubah', target: '', detail }) }),
  setTalentOverride: (id, data, oleh, detail) => update((s) => { s.talentOverride = s.talentOverride || {}; if (data) s.talentOverride[id] = { ...data, oleh, at: today() + ' ' + nowTime() }; else delete s.talentOverride[id]
    ;(s.talentAccessLog ||= []).unshift({ at: today() + ' ' + nowTime(), oleh, aksi: data ? 'Akses manual diatur' : 'Akses manual dicabut', target: id, detail })
    if (data && Object.values(data.menu || {}).includes('buka')) s.inbox.unshift({ id: uid('n'), to: 'talent', emp: id, judul: 'Menu karier dibuka untukmu', isi: `HR membuka akses ${detail}. ${data.alasan || ''}`.trim(), waktu: today() + ' ' + nowTime(), menu: 'lowongan' }) }),
  agreeContract: (empId) => update((s) => { s.contractAgreed[empId] = today() + ' ' + nowTime(); s.docBatches.forEach((b) => b.items.forEach((i) => { if (i.emp === empId) i.agreed = true })) }),
  applyJob: (talent, jobId) => update((s) => {
    if (s.candidates.some((c) => c.pool === talent && c.job === jobId)) return
    const p = s.pool.find((x) => x.id === talent) || s.employees.find((x) => x.id === talent)
    s.candidates.push({ id: uid('c'), name: p?.name || 'Talent', pool: talent, job: jobId, tahap: 1, skor: p?.skor ?? null, dilamar: today(), riwayat: [] })
    const j = s.jobs.find((x) => x.id === jobId); if (j) j.pelamar = (j.pelamar || 0) + 1
    const pp = s.pool.find((x) => x.id === talent); if (pp && pp.status === 'Active Pool') pp.status = 'In Hiring Process'
    s.inbox.unshift({ id: uid('n'), to: 'talent', emp: talent, judul: 'Lamaran terkirim: ' + (j?.posisi || 'Lowongan'), isi: 'Lamaranmu masuk tahap Tes tulis. Pantau prosesnya di menu Lowongan & Tawaran.', waktu: today() + ' ' + nowTime(), menu: 'lowongan' })
    s.inbox.unshift({ id: uid('n'), to: 'branch', branch: j?.branch, judul: 'Pelamar baru: ' + (j?.posisi || ''), isi: (p?.name || 'Talent') + ' melamar lewat akun talent.', waktu: today() + ' ' + nowTime(), link: 'seleksi' })
  }),
  finishPretest: (talent, modId) => update((s) => { const l = s.pretestDone[talent] || (s.pretestDone[talent] = []); if (!l.includes(modId)) l.push(modId) }),
  readMessage: (id) => update((s) => { const m = s.messages.find((x) => x.id === id); if (m) m.dibaca = true }),
  registerCandidate: (d) => { const pid = uid('p'); update((s) => {
    s.pool.push({ id: pid, name: d.name, kelamin: d.kelamin, pendidikan: d.pendidikan, pengalaman: '—', spesialisasi: '—', skor: null, status: 'Registered', mitra: '—', ekspektasi: null, email: d.email, hp: d.hp })
    if (d.job) { s.candidates.push({ id: uid('c'), name: d.name, pool: pid, job: d.job, tahap: 1, skor: null, dilamar: today(), riwayat: [] }); const j = s.jobs.find((x) => x.id === d.job); if (j) j.pelamar = (j.pelamar || 0) + 1 }
  }); return pid },
  reportInventory: (id, catatan) => update((s) => { const it = s.inventories.find((x) => x.id === id); Object.assign(it, { status: 'Dilaporkan', laporan: catatan }); s.inbox.unshift({ id: uid('n'), to: 'admin', judul: 'Inventaris dilaporkan tidak sesuai', isi: `${it.item} (${it.nomor}): ${catatan}`, waktu: today() + ' ' + nowTime() }) }),
  requestInterview: (talent, jobId, slot) => update((s) => {
    s.interviews = s.interviews.filter((x) => !(x.talent === talent && x.job === jobId && x.status === 'Menunggu konfirmasi'))
    s.interviews.push({ id: uid('iv'), talent, job: jobId, status: 'Menunggu konfirmasi', slot, diminta: today() + ' ' + nowTime() })
    const j = s.jobs.find((x) => x.id === jobId); const p = s.pool.find((x) => x.id === talent)
    s.inbox.unshift({ id: uid('n'), to: 'branch', branch: j?.branch, judul: 'Permintaan jadwal wawancara', isi: `${p?.name || 'Talent'} memilih ${slot} untuk ${j?.posisi || ''}.`, waktu: today() + ' ' + nowTime(), link: 'seleksi' })
  }),
  saveBio: (id, d) => update((s) => { s.bioEdits = s.bioEdits || {}; s.bioEdits[id] = { ...(s.bioEdits[id] || {}), ...d } }),
  sendFeedback: (d) => update((s) => { s.feedbacks.unshift({ id: uid('f'), ...d, waktu: today() + ' ' + nowTime() }) }),
  sendMessage: (d) => update((s) => { s.messages.unshift({ id: uid('m'), ...d, waktu: today() + ' ' + nowTime(), dibaca: false }) }),
  setPref: (id, k, v) => update((s) => { const e = s.employees.find((x) => x.id === id); if (e) e[k] = v }),
  submitResign: (d) => { const id = uid('rs'); update((s) => {
    const e = s.employees.find((x) => x.id === d.emp)
    s.resigns.push({ id, emp: d.emp, alasan: d.alasan, catatan: d.catatan, lastDay: d.lastDay, diajukan: today(), lampiran: d.lampiran, status: 'Waiting', inventaris: d.returns.length ? 'Belum lengkap' : 'Tidak ada', returns: d.returns.map((r) => ({ ...r, cek: 'Menunggu pemeriksaan' })) })
    d.returns.forEach((r) => { const it = s.inventories.find((x) => x.id === r.inv); if (it) it.status = 'Proses pengembalian' })
    const isi = `${e.name} mengajukan resign (hari terakhir ${d.lastDay}). ${d.returns.length} barang perlu diperiksa saat pengembalian.`
    s.inbox.unshift({ id: uid('n'), to: 'admin', judul: 'Resign: cek pengembalian barang', isi, waktu: today() + ' ' + nowTime(), link: 'resign/' + id })
    s.inbox.unshift({ id: uid('n'), to: 'branch', branch: e.branch, judul: 'Resign: cek pengembalian barang', isi, waktu: today() + ' ' + nowTime(), link: 'data-karyawan' })
  }); return id },
  checkReturn: (rid, inv, d) => update((s) => {
    const r = s.resigns.find((x) => x.id === rid); const it = r.returns.find((x) => x.inv === inv); Object.assign(it, d, { at: today() + ' ' + nowTime() })
    const item = s.inventories.find((x) => x.id === inv); if (item) item.status = d.cek === 'Diterima' ? 'Dikembalikan' : 'Proses pengembalian'
    r.inventaris = r.returns.every((x) => x.cek === 'Diterima') ? 'Lengkap' : 'Belum lengkap'
  }),
  clock: (kind, foto = '') => update((s) => {
    s.clock[kind] = nowTime(); s.clock[kind + 'Foto'] = foto
    if (kind !== 'out') return
    const e = s.employees.find((x) => x.id === ME) || {}; const set = s.absenSetup?.[e.branch] || {}
    const lok = (set.lokasi || []).find((l) => l.aktif)?.nama || 'Kantor'; const sh = (set.shifts || []).find((x) => x.nama === e.shift) || (set.shifts || [])[0] || { masukSampai: '09:00' }
    s.attendance.unshift({ id: uid('at'), emp: ME, tanggal: today(), masuk: s.clock.in, pulang: s.clock.out, status: s.clock.in > sh.masukSampai ? 'Terlambat' : 'Hadir', lokasi: lok, fotoMasuk: s.clock.inFoto, fotoPulang: s.clock.outFoto })
  }),
  acceptInventory: (id, d = {}) => update((s) => { Object.assign(s.inventories.find((x) => x.id === id), { status: 'Accepted', diterima: today(), ...d }) }),
  answerOffer: (id, accept) => update((s) => {
    const o = s.offers.find((x) => x.id === id); o.status = accept ? 'Diterima talent' : 'Ditolak talent'
    if (accept) { const p = s.pool.find((x) => x.id === o.talent); if (p) p.status = 'In Hiring Process'; s.candidates.push({ id: uid('c'), name: p ? p.name : 'Talent', pool: o.talent, job: o.job, tahap: 1, skor: p?.skor || 0, dilamar: today(), riwayat: [] }) }
  }),
  signDoc: (batchId, emp) => update((s) => {
    const b = s.docBatches.find((x) => x.id === batchId); const it = b.items.find((x) => x.emp === emp)
    it.agreed = true; it.status = 'Employee Signed'; it.log = { ...(it.log || {}), 'Employee Signed': { file: `${it.dokumen} - ttd karyawan.pdf`, at: today() + ' ' + nowTime() } }
  }),
})
