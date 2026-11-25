// Data layer terpusat. Mode 'mock' = state di memori (hilang saat reload, TIDAK pakai localStorage).
// Mode 'firestore' nantinya memetakan tiap koleksi (employees, leaves, remunerations, ...) ke Firestore via getDb().
import { useSyncExternalStore, createContext, useContext } from 'react'
import { seed } from '../data/seed.js'
import { DEFAULT_SETUP, calcRemunRow } from './payroll.js'
import { accountsOf } from './tenant.js'
import { ROOT_NET, appOf, JIT_ROLES } from '../data/rootAudit.js'
import { hargaOf } from '../data/assets.js'
import { DEFAULT_TEMPLATES, nomorSurat, fieldValues, fill, isDownloadable } from './docs.js'
import { ME } from './session.js'

let state = { ...seed(), setup: { ...DEFAULT_SETUP } }
state.attendance.forEach((a, i) => { a.id = 'at' + (i + 1) })
// Kandidat demo yang sudah dinilai (Active Pool / proses hiring) dianggap sudah menyelesaikan rangkaian pre-test aktif
{ const act = state.pretestSets.find((x) => x.aktif); if (act) ['p2', 'p5'].forEach((id) => { state.pretestDone[id] = act.modul.map((m) => m.id) }) }
const subs = new Set()
const emit = () => subs.forEach((f) => f())

export const getState = () => state
if (typeof window !== "undefined") window.__kiranaState = getState // bantu uji otomatis (read-only)
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
// ScopeCtx: tampilan "lihat saja" role Branch — state disaring hanya untuk satu Branch.
export const ScopeCtx = createContext(null)
const scopeCache = new WeakMap()
function scoped(st, b) {
  let m = scopeCache.get(st); if (!m) { m = {}; scopeCache.set(st, m) }
  if (m[b]) return m[b]
  const emps = st.employees.filter((e) => e.branch === b); const ids = new Set(emps.map((e) => e.id))
  const byEmp = (l) => (l || []).filter((x) => ids.has(x.emp)); const byBr = (l) => (l || []).filter((x) => x.branch === b)
  const assets = byBr(st.assets); const aid = new Set(assets.map((a) => a.id))
  m[b] = { ...st, branches: st.branches.filter((x) => x.id === b), employees: emps, attendance: byEmp(st.attendance), attRecap: byEmp(st.attRecap), leaves: byEmp(st.leaves), overtimes: byEmp(st.overtimes), reimbursements: byEmp(st.reimbursements), resigns: byEmp(st.resigns), inventories: byEmp(st.inventories), payslips: byEmp(st.payslips), remunerations: byBr(st.remunerations), disbursements: byBr(st.disbursements), payslipSends: byBr(st.payslipSends), assets, assetEvents: (st.assetEvents || []).filter((e) => aid.has(e.asset)), jobs: byBr(st.jobs) }
  return m[b]
}
export const useStore = (sel = (s) => s) => { const st = useSyncExternalStore(subscribe, getState); const sc = useContext(ScopeCtx); return sel(sc ? scoped(st, sc) : st) }

export function update(fn) {
  const next = structuredClone(state)
  fn(next)
  state = next
  emit()
}

let idc = 100
export const uid = (p = 'id') => p + ++idc

const today = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toTimeString().slice(0, 5)

// ---- Actions (setara endpoint API / operasi Firestore) ----
const pad2 = (n) => String(n).padStart(2, '0')
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
const stampNow = () => { const d = new Date(); return `${todayISO()}T${pad2(d.getHours())}:${pad2(d.getMinutes())}` }
const due = (d) => d.status === 'Scheduled' && d.jadwal <= todayISO()
// Disbursement Scheduled yang jadwalnya sudah tiba -> Success, payslip terbit
function settle(s) {
  s.disbursements.filter(due).forEach((d) => {
    d.status = 'Success'; d.paidAt = d.jadwal === todayISO() ? stampNow() : `${d.jadwal}T09:00`
    d.items.forEach((x) => s.payslips.unshift({ id: uid('ps'), emp: x.emp, bulan: d.bulan, thp: x.amount, tipe: d.tipe, disb: d.id }))
  })
}
// ---- Log aktivitas per customer (dibaca Root) ----
// Setiap log memuat metadata audit: IP, lokasi, perangkat, aplikasi, hasil, serta pengaju & penyetuju untuk perubahan hak akses.
const SA_NET = { ip: '103.28.12.40', lokasi: 'Jakarta, ID', perangkat: 'Chrome · Windows' }
const MOD = { Autentikasi: 'Login', 'Akun & Izin': 'Admin & Izin', 'Akses Istimewa': 'PAM' }
function addLog(s, customer, kategori, aksi, detail = '', aktor = 'Rani Hapsari', peran = 'Superadmin', extra = {}) {
  const root = peran === 'Root'
  s.root.logs.unshift({ id: uid('lg'), customer, at: stampNow(), aktor, email: root ? s.root.user.email : aktor === 'Rani Hapsari' ? 'rani@kirana.id' : '', peran, kategori, aksi, detail,
    ...(root ? ROOT_NET : SA_NET), aplikasi: appOf(peran), modul: MOD[kategori] || kategori, hasil: 'Berhasil', risiko: 'Rendah', ...extra })
}
const rootLog = (s, customer, kategori, aksi, detail, extra) => addLog(s, customer, kategori, aksi, detail, s.root.user.nama, 'Root', extra)
const RANI = 'Rani Hapsari (Superadmin)'
const fmtD = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const plusMin = (n) => { const d = new Date(Date.now() + n * 60000); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}` }
const elapsed = (from) => { const m = Math.max(0, Math.round((Date.now() - new Date(from)) / 60000)); return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}` }
const aksesLabel = (s, cid, a) => {
  if (a.role === 'Superadmin') return 'Seluruh fitur & pengaturan'
  if (cid === 'c1' && a.role === 'Admin') { const x = s.admins.find((d) => 'c1-a-' + d.id === a.id); return x ? `${x.perms.length} fitur · ${x.branches.length} Branch` : '—' }
  if (a.role === 'Branch') { const b = cid === 'c1' ? s.branches.find((x) => x.id === a.branch) : s.root.tenants[cid]?.branches.find((x) => x.id === a.branch); return `Portal Branch · ${b?.name || '—'}` }
  return 'Data Karyawan, Absensi, Payroll (Lihat/Ubah)'
}
function assetEv(s, o) { s.assetEvents.unshift({ id: uid('ae'), tgl: today(), oleh: 'Rani Hapsari', ...o }) }
function newAsset(s, d, ket) { const k = s.assets.length + 1; const a = { id: uid('as'), kode: 'AST-' + String(k).padStart(4, '0'), kondisi: 'Baik', status: 'Tersedia', ...d }; s.assets.push(a); assetEv(s, { asset: a.id, tgl: d.tglBeli || today(), jenis: 'Masuk', nilai: d.harga, ket }); return a }
function closeJit(s, j, status, text) {
  j.status = status; j.berakhir = stampNow()
  const ss = s.root.pam.sessions.find((x) => x.id === j.sesi)
  if (ss && !ss.selesai) { ss.selesai = stampNow(); ss.live = false; ss.events.push({ t: elapsed(ss.mulai), k: 'sys', text }) }
}
const addMonths = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }

export const api = {
  // Pendaftaran kandidat dari halaman lowongan publik
  registerCandidate: (d) => { const pid = uid('p'); update((s) => {
    s.pool.push({ id: pid, name: d.name, kelamin: d.kelamin, pendidikan: d.pendidikan, pengalaman: '—', spesialisasi: '—', skor: null, status: 'Registered', mitra: '—', ekspektasi: null, email: d.email, hp: d.hp })
    if (d.job) { s.candidates.push({ id: uid('c'), name: d.name, pool: pid, job: d.job, tahap: 1, skor: null, dilamar: today(), riwayat: [] }); const j = s.jobs.find((x) => x.id === d.job); if (j) j.pelamar = (j.pelamar || 0) + 1 }
  }); return pid },
  saveCalendar: (branch, year, data) => update((s) => {
    s.calendars[branch] = { ...(s.calendars[branch] || {}), [year]: data }
    // Kalender talent membaca gabungan semua Branch
    const all = Object.values(s.calendars).flatMap((y) => Object.values(y))
    const uniq = (arr) => [...new Map(arr.map((x) => [x.tanggal + x.nama, x])).values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    s.holidays = uniq(all.flatMap((c) => c.nasional))
    s.blackout = uniq(all.flatMap((c) => c.blackout)).map((x) => ({ dari: x.tanggal, sampai: x.tanggal, nama: x.nama }))
  }),
  saveAbsenSetup: (branch, data) => update((s) => { s.absenSetup[branch] = data }),
  // blackout dates diubah langsung (tidak lewat saveCalendar agar daftar hari libur tidak tertimpa)
  saveBlackoutList: (list) => update((s) => { s.blackout = list }),
  saveEvent: (ev) => { const id = ev.id || uid('ev'); update((s) => {
    const baru = !s.events.some((x) => x.id === id)
    if (baru) s.events.push({ ...ev, id }); else s.events = s.events.map((x) => (x.id === id ? { ...ev, id } : x))
    s.inbox.unshift({ id: uid('n'), to: 'talent', judul: (baru ? 'Undangan: ' : 'Perubahan event: ') + ev.judul, isi: `${ev.tanggal} · ${ev.mulai}–${ev.selesai} · ${ev.kategori}${ev.link ? ' · ' + ev.link : ''}`, waktu: today() + ' ' + nowTime() })
  }); return id },
  deleteEvent: (id) => update((s) => { s.events = s.events.filter((x) => x.id !== id) }),
  approveJob: (id, ok, catatan = '') => update((s) => { const j = s.jobs.find((x) => x.id === id); j.approval = ok ? 'Approved' : 'Rejected'; j.status = ok ? 'Active' : 'Rejected'; if (!ok) j.catatan = catatan }),
  stopJob: (id) => update((s) => { s.jobs.find((x) => x.id === id).status = 'Non-Active' }),
  createJob: (job) => update((s) => { s.jobs.unshift({ id: uid('j'), status: 'Requested', approval: 'Waiting', pelamar: 0, ...job }) }),
  moveCandidate: (id, d) => update((s) => { const c = s.candidates.find((x) => x.id === id); const n = Math.min(5, Math.max(1, c.tahap + d)); if (n > c.tahap && c.riwayat) c.riwayat[c.tahap - 1] = today(); c.tahap = n; if (c.pool && n > 1) s.inbox.unshift({ id: uid('n'), to: 'talent', emp: c.pool, judul: `Kamu lolos ke tahap ${n}`, isi: `Lamaranmu masuk tahap berikutnya. Cek menu Lowongan & Tawaran.`, waktu: today() + ' ' + nowTime(), menu: 'lowongan' }) }),
  failCandidate: (id) => update((s) => {
    const c = s.candidates.find((x) => x.id === id)
    s.candidates = s.candidates.filter((x) => x.id !== id)
    s.pool.unshift({ id: uid('p'), name: c.name, pendidikan: 'S1', pengalaman: '0–2 tahun', spesialisasi: '—', skor: c.skor, status: 'Active Pool', mitra: '—', ekspektasi: 0 })
  }),
  offerTalent: (talentIds, jobId) => update((s) => {
    talentIds.forEach((t) => {
      if (!s.offers.some((o) => o.talent === t && o.job === jobId)) s.offers.push({ id: uid('o'), talent: t, job: jobId, status: 'Menunggu jawaban', batas: '2026-11-26' })
    })
  }),
  answerOffer: (id, accept) => update((s) => {
    const o = s.offers.find((x) => x.id === id); o.status = accept ? 'Diterima talent' : 'Ditolak talent'
    if (accept) { const p = s.pool.find((x) => x.id === o.talent); if (p) p.status = 'In Hiring Process'; s.candidates.push({ id: uid('c'), name: p ? p.name : 'Talent', pool: o.talent, job: o.job, tahap: 1, skor: p?.skor || 0, dilamar: today(), riwayat: [] }) }
  }),
  saveRemun: (r) => update((s) => { const i = s.remunerations.findIndex((x) => x.id === r.id); if (i >= 0) s.remunerations[i] = r; else s.remunerations.unshift(r) }),
  deleteRemun: (id) => update((s) => { s.remunerations = s.remunerations.filter((x) => x.id !== id) }),
  decideRemun: (id, ok, note) => update((s) => {
    const r = s.remunerations.find((x) => x.id === id)
    r.status = ok ? 'Approved' : 'Rejected'; r.note = note || ''
    addLog(s, 'c1', 'Payroll', `Remunerasi ${r.bulan} ${ok ? 'disetujui' : 'ditolak'}`, (s.branches.find((b) => b.id === r.branch)?.name || '') + (note ? ' · ' + note : ''))
    if (ok) {
      const items = r.rows.filter((x) => x.jenis !== 'Active').map((x) => ({ emp: x.emp, jenis: x.jenis, dokumen: docFor(x, s), setelan: 'New Contract Template', status: 'None', agreed: false }))
      if (items.length) s.docBatches.unshift({ id: uid('d'), remun: r.id, branch: r.branch, bulan: r.bulan, setelan: '', status: 'Process', items })
      // Pembayaran dibuat Superadmin lewat menu Disbursement (Create Disbursement) dari remunerasi Approved ini.
    }
  }),
  setBatch: (id, fn) => update((s) => fn(s.docBatches.find((x) => x.id === id), s)),
  advanceDisb: (id) => update((s) => {
    const flow = ['Draft', 'Reviewed', 'Confirmed', 'Waiting Transfer', 'Processing', 'Completed']
    const d = s.disbursements.find((x) => x.id === id)
    d.status = flow[Math.min(flow.length - 1, flow.indexOf(d.status) + 1)]
    if (d.status === 'Completed' && d.remun) {
      const r = s.remunerations.find((x) => x.id === d.remun)
      r?.rows.forEach((row) => s.payslips.unshift({ id: uid('ps'), emp: row.emp, bulan: d.bulan, thp: calcRemunRow(row, s.setup, r, s.employees.find((e) => e.id === row.emp)).net }))
    }
  }),
  addVA: (v) => update((s) => { const pre = { BWS: '8808', BCA: '3901', BNI: '9881', MDR: '8900' }[v.bank] || '8800'; const n = String(s.virtualAccounts.length + 1).padStart(3, '0'); s.virtualAccounts.push({ id: uid('va'), nomor: `${pre} ${String(Date.now()).slice(-4)} ${String(Date.now()).slice(-8, -4)} ${n}`, aktif: true, dibuat: todayISO(), ...v }); addLog(s, 'c1', 'Payroll', 'Membuat Virtual Account', `${v.nama} · ${v.bank}`) }),
  toggleVA: (id) => update((s) => { const v = s.virtualAccounts.find((x) => x.id === id); v.aktif = v.aktif === false; addLog(s, 'c1', 'Payroll', v.aktif ? 'Mengaktifkan Virtual Account' : 'Menonaktifkan Virtual Account', v.nama) }),
  remindBankSync: (bid, n) => update((s) => { addLog(s, 'c1', 'Data Karyawan', 'Meminta sinkronisasi rekening bank', `${s.branches.find((b) => b.id === bid)?.name} · ${n} karyawan`) }),
  // Payment gateway belum terhubung: proses langsung (tanpa kondisi gagal), tetapi transfer menunggu Jadwal Pembayaran.
  // Jadwal hari ini -> Success saat itu juga; jadwal ke depan -> Scheduled, lalu otomatis Success saat tanggalnya tiba.
  disburse: (d) => {
    const id = uid('x')
    update((s) => {
      const now = stampNow()
      const kode = String(Math.max(115921692176589, ...s.disbursements.map((x) => Number(x.kode) || 0)) + 1)
      s.disbursements.unshift({ id, kode, ...d, status: 'Scheduled', createdAt: now, createdBy: 'Rani Hapsari' })
      addLog(s, 'c1', 'Payroll', `Membuat disbursement ${d.bulan}`, `${d.items.length} karyawan · jadwal ${d.jadwal}`)
      settle(s)
    })
    return id
  },
  settleDisb: () => { if (state.disbursements.some(due)) update((s) => { settle(s) }) },
  // ---- Root (pemilik aplikasi) ----
  registerCustomer: (c) => {
    const id = uid('c')
    update((s) => {
      const n = s.root.customers.length + 1
      s.root.customers.unshift({ ...c, id, kode: 'KRN-' + String(n).padStart(4, '0'), createdAt: stampNow() })
      s.root.tenants[id] = { branches: [], employees: [], accounts: [] }
      rootLog(s, id, 'Langganan', `Customer didaftarkan (${c.status === 'Trial' ? 'Trial' : 'Aktif'})`, `Paket ${c.paket} · ${c.kuotaKaryawan} karyawan · ${c.kuotaBranch} Branch`)
      rootLog(s, id, 'Akun & Izin', 'Akun Superadmin dibuat', `${c.superadmin.nama} · password acak dikirim ke ${c.superadmin.email}`)
    })
    return id
  },
  updateCustomer: (id, d) => update((s) => { Object.assign(s.root.customers.find((x) => x.id === id), d); rootLog(s, id, 'Langganan', 'Data customer diperbarui', d.nama) }),
  setCustomerStatus: (id, status, alasan) => update((s) => { const c = s.root.customers.find((x) => x.id === id); c.status = status; c.alasan = alasan || ''; rootLog(s, id, 'Langganan', status === 'Ditangguhkan' ? 'Customer ditangguhkan' : 'Customer diaktifkan kembali', alasan || '') }),
  extendCustomer: (id, bulan, paket) => update((s) => {
    const c = s.root.customers.find((x) => x.id === id)
    const base = c.berakhir && c.berakhir > todayISO() ? c.berakhir : todayISO()
    c.berakhir = addMonths(base, bulan); if (paket) c.paket = paket
    if (c.status !== 'Ditangguhkan') c.status = 'Aktif'
    rootLog(s, id, 'Langganan', `Langganan diperpanjang ${bulan} bulan`, `Berakhir ${c.berakhir}${paket ? ' · paket ' + paket : ''}`)
  }),
  resetPassword: (r) => update((s) => {
    s.root.resets.unshift({ id: uid('rs'), ...r, at: stampNow(), oleh: s.root.user.nama, status: 'Terkirim' })
    rootLog(s, r.customer, 'Autentikasi', `Password ${r.role} direset oleh Root`, `${r.akun} · password acak dikirim ke e-mail terdaftar, wajib ganti saat login`)
  }),
  // ---- Review akses (recertification) ----
  startReview: ({ customer, cakupan, tenggat, nama }) => { const id = uid('rv'); update((s) => {
    const c = s.root.customers.find((x) => x.id === customer)
    const accts = accountsOf(s, c).filter((a) => a.aktif !== false && (cakupan === 'Semua akun' || a.role !== 'Superadmin') && (cakupan !== 'Admin saja' || a.role === 'Admin') && (cakupan !== 'Branch saja' || a.role === 'Branch'))
    const pic = c.pic.nama !== c.superadmin.nama ? `${c.pic.nama} (PIC)` : c.superadmin.nama
    const items = accts.map((a, i) => ({ id: `${id}-${i}`, akunId: a.id, nama: a.nama, email: a.email, role: a.role, akses: aksesLabel(s, customer, a), reviewer: a.role === 'Superadmin' ? pic : c.superadmin.nama, keputusan: null, catatan: '', at: '' }))
    const ke = [...new Set(items.map((i) => i.reviewer.replace(' (PIC)', '')))].join(', ')
    s.root.reviews.unshift({ id, customer, nama: nama || `Review akses ad-hoc · ${fmtD(todayISO())}`, mulai: todayISO(), tenggat, selesaiAt: '', cakupan, dibuat: `${s.root.user.nama} (Root)`, items, reminders: [{ at: stampNow(), jenis: 'Undangan review', ke }] })
    rootLog(s, customer, 'Akun & Izin', 'Memulai review akses', `${items.length} akun · tenggat ${fmtD(tenggat)} · reviewer ${ke}`)
  }); return id },
  sendReviewReminder: (rid) => update((s) => {
    const r = s.root.reviews.find((x) => x.id === rid)
    const ke = [...new Set(r.items.filter((i) => !i.keputusan).map((i) => i.reviewer.replace(' (PIC)', '')))].join(', ')
    r.reminders.push({ at: stampNow(), jenis: 'Pengingat manual dari Root', ke })
    rootLog(s, r.customer, 'Akun & Izin', 'Mengirim pengingat review akses', `${r.nama} · ke ${ke} (e-mail & notifikasi aplikasi)`)
  }),
  decideReview: (rid, itemId, keputusan, catatan = '') => update((s) => {
    const r = s.root.reviews.find((x) => x.id === rid); const it = r.items.find((x) => x.id === itemId)
    const setAktif = (v) => {
      if (r.customer === 'c1') {
        const ad = s.admins.find((a) => 'c1-a-' + a.id === it.akunId); if (ad) ad.aktif = v
        s.branches.forEach((b) => (b.accounts || []).forEach((a, i) => { if (`c1-ba-${b.id}-${i}` === it.akunId) a.aktif = v }))
      } else (s.root.tenants[r.customer]?.accounts || []).forEach((a) => { if (a.id === it.akunId) a.aktif = v })
    }
    if (!keputusan) { // batal: kembalikan keadaan akun
      if (it.keputusan === 'Cabut') setAktif(true)
      addLog(s, r.customer, 'Akun & Izin', 'Review akses: keputusan dibatalkan', `${it.nama} · sebelumnya ${it.keputusan}`, it.reviewer.replace(' (PIC)', ''), 'Superadmin')
      Object.assign(it, { keputusan: null, catatan: '', at: '' }); return
    }
    Object.assign(it, { keputusan, catatan, at: stampNow() })
    if (keputusan === 'Cabut') { setAktif(false) }
    const who = it.reviewer.replace(' (PIC)', '')
    addLog(s, r.customer, 'Akun & Izin', `Review akses: ${keputusan}`, `${it.nama} · ${it.role}${catatan ? ' · ' + catatan : ''}`, who, 'Superadmin',
      { akun: it.nama, sebelum: it.akses, sesudah: keputusan === 'Cabut' ? 'Akses dicabut, akun nonaktif' : keputusan === 'Ubah' ? 'Izin akan disesuaikan' : it.akses, diajukan: r.nama, penyetuju: `${it.reviewer}${it.reviewer.includes('(') ? '' : ' (Superadmin)'}` })
  }),
  submitReview: (rid) => update((s) => {
    const r = s.root.reviews.find((x) => x.id === rid); r.selesaiAt = stampNow()
    addLog(s, r.customer, 'Akun & Izin', `${r.nama} diselesaikan`, `${r.items.length} akun · ${r.items.filter((i) => i.keputusan === 'Cabut').length} dicabut`, undefined, undefined, { penyetuju: RANI })
  }),
  saveReviewPolicy: (cid, p) => update((s) => { s.root.reviewPolicy[cid] = { ...s.root.reviewPolicy[cid], ...p }; rootLog(s, cid, 'Pengaturan', 'Mengubah jadwal review akses', `${p.aktif ? p.frek : 'Nonaktif'} · tenggat ${p.durasi} hari · pengingat H-${p.pengingat.join(', H-')}`) }),
  // ---- Privileged Access Management ----
  requestJit: (d) => { const id = uid('j'); update((s) => {
    const r = JIT_ROLES.find((x) => x.k === d.role)
    s.root.pam.jit.unshift({ id, pemohon: s.root.user.nama, email: s.root.user.email, status: 'Menunggu', diajukanAt: stampNow(), ...d })
    addLog(s, d.customer, 'Akses Istimewa', `Mengajukan akses JIT: ${r.l}`, `${d.durasi} menit · ${d.tiket} · ${d.alasan}`, s.root.user.nama, 'Root', { risiko: r.risiko })
  }); return id },
  decideJit: (id, ok, catatan = '', by) => update((s) => {
    const j = s.root.pam.jit.find((x) => x.id === id); const r = JIT_ROLES.find((x) => x.k === j.role); const who = by || s.root.user.nama
    Object.assign(j, { penyetuju: who, disetujuiAt: stampNow() })
    if (!ok) { j.status = 'Ditolak'; j.catatanTolak = catatan } else {
      const sid = uid('s'); Object.assign(j, { status: 'Aktif', mulai: stampNow(), berakhir: plusMin(j.durasi), sesi: sid })
      const c = s.root.customers.find((x) => x.id === j.customer)
      s.root.pam.sessions.unshift({ id: sid, user: j.pemohon, peran: s.root.pam.team.find((t) => t.email === j.email)?.jabatan || 'Tim Kirana', jit: id, customer: j.customer, app: r.app, ip: j.email === s.root.user.email ? ROOT_NET.ip : '36.68.9.14', mulai: stampNow(), selesai: '', live: true,
        events: [{ t: '00:00', k: j.role === 'break' ? 'alert' : 'sys', text: `Akses JIT aktif ${j.durasi} menit · ${r.l}${j.role === 'break' ? ` · notifikasi dikirim ke ${c.superadmin.nama}` : ''} · sesi direkam` }] })
    }
    addLog(s, j.customer, 'Akses Istimewa', ok ? `Menyetujui akses JIT ${j.pemohon}` : `Menolak akses JIT ${j.pemohon}`, `${r.l} · ${j.durasi} menit${catatan ? ' · ' + catatan : ''}`, who, 'Root',
      { diajukan: `${j.pemohon} (${j.email === s.root.user.email ? 'Root' : 'Tim Kirana'})`, penyetuju: `${who} (${who === 'Sari Wulandari' ? 'Security Officer' : 'Root'})`, hasil: ok ? 'Berhasil' : 'Gagal', risiko: r.risiko })
  }),
  revokeJit: (id) => update((s) => {
    const j = s.root.pam.jit.find((x) => x.id === id); closeJit(s, j, 'Dicabut', `Akses dicabut oleh ${s.root.user.nama}`)
    rootLog(s, j.customer, 'Akses Istimewa', `Mencabut akses JIT ${j.pemohon}`, JIT_ROLES.find((x) => x.k === j.role).l)
  }),
  settleJit: () => { const now = stampNow(); if (!getState().root.pam.jit.some((j) => j.status === 'Aktif' && j.berakhir <= now)) return; update((s) => {
    s.root.pam.jit.filter((j) => j.status === 'Aktif' && j.berakhir <= now).forEach((j) => { closeJit(s, j, 'Berakhir', 'Waktu akses habis · dicabut otomatis'); addLog(s, j.customer, 'Akses Istimewa', `Akses JIT ${j.pemohon} berakhir otomatis`, JIT_ROLES.find((x) => x.k === j.role).l, 'Sistem', 'Sistem') })
  }) },
  savePamPolicy: (p) => update((s) => { s.root.pam.policy = { ...s.root.pam.policy, ...p }; rootLog(s, 'kirana', 'Akses Istimewa', 'Mengubah kebijakan PAM', `Maks ${p.maxMenit} menit · 2 orang ${p.duaOrang ? 'wajib' : 'tidak wajib'} · tiket ${p.wajibTiket ? 'wajib' : 'opsional'}`) }),
  ask2FA: (cid, nama) => update((s) => { if (!s.root.pam.asked) s.root.pam.asked = {}; s.root.pam.asked[cid + nama] = stampNow(); rootLog(s, cid, 'Akses Istimewa', 'Meminta aktivasi 2FA', `${nama} · e-mail panduan dikirim, wajib aktif dalam 7 hari`) }),
  saveRootProfile: (d) => update((s) => { Object.assign(s.root.user, d) }),
  setRootPassword: () => update((s) => { s.root.user.pwUpdated = todayISO() }),
  retryDisb: (id) => update((s) => { s.disbursements.find((x) => x.id === id).status = 'Processing' }),
  setModScore: (pid, mid, v) => update((s) => { s.penilaian[pid] = { ...(s.penilaian[pid] || {}), [mid]: v } }),
  scorePool: (id, avg) => update((s) => { const p = s.pool.find((x) => x.id === id); p.skor = avg; p.status = 'Active Pool' }),
  addHire: (cand, branchId) => { const id = uid('e'); update((s) => { s.employees.push({ id, name: cand.name, branch: branchId, role: 'Calon karyawan', level: 'Junior', type: 'Kontrak', skema: 'Normal', thp: 0, start: '2026-12-01', end: '2027-11-30', jalur: 'Selection', doc: 'None', shift: 'Shift 1', divisi: '—', bank: 'BCA', bankOk: true, status: 'Calon' }); s.candidates = s.candidates.filter((c) => c.id !== cand.id) }); return id },
  syncBank: () => update((s) => { s.employees.forEach((e) => { e.bankOk = true }) }),
  // Synchronize Bank Account: validasi rekening via payment gateway (prototipe: rekening berawalan 'X' = tidak terdaftar, nama beda = tidak sesuai)
  syncBankAccounts: (ids) => { const res = []; update((s) => { ids.forEach((id) => { const e = s.employees.find((x) => x.id === id); if (!e) return
    const st = !e.rekening || /^x/i.test(e.rekening) ? 'Akun Bank tidak terdaftar' : (e.pemegang || e.name).toLowerCase() !== e.name.toLowerCase() ? 'Nama Akun Bank tidak sesuai' : 'Berhasil tersinkronisasi'
    e.bankStatus = st; e.bankOk = st === 'Berhasil tersinkronisasi'; res.push({ id, st }) }) }); return res },
  // Halaman Addition & Deduction (pengganti "Ke Spreadsheet"): input manual per karyawan per periode
  // preferensi tampilan per karyawan (disimpan di profil, bukan di perangkat)
  setPref: (id, k, v) => update((s) => { const e = s.employees.find((x) => x.id === id); if (e) e[k] = v }),
  setWork: (branch, id) => update((s) => { s.remunWork = { ...(s.remunWork || {}), [branch]: id } }),
  saveAdj: (key, data) => update((s) => { s.remunAdj = s.remunAdj || {}; s.remunAdj[key] = data }),
  remunNotify: (r) => update((s) => { s.inbox.unshift({ id: uid('n'), to: 'admin', judul: 'Pengajuan remunerasi baru', isi: `${s.branches.find((b) => b.id === r.branch)?.name} mengajukan remunerasi ${r.bulan} untuk ${r.rows.length} karyawan.`, waktu: today() + ' ' + nowTime(), link: 'approval-remunerasi' }) }),
  failDisb: (id) => update((s) => { s.disbursements.find((x) => x.id === id).status = 'Failed' }),
  clock: (kind, foto = '') => update((s) => { s.clock[kind] = nowTime(); s.clock[kind + 'Foto'] = foto; if (kind === 'out') s.attendance.unshift({ emp: ME, tanggal: today(), masuk: s.clock.in, pulang: s.clock.out, status: s.clock.in > '09:00' ? 'Terlambat' : 'Hadir', lokasi: 'Kantor Jakarta', fotoMasuk: s.clock.inFoto, fotoPulang: s.clock.outFoto }) }),
  request: (col, item, modul) => update((s) => {
    const line = s.approvalLine.find((a) => a.modul === modul)
    s[col].unshift({ id: uid(col), status: 'Waiting', line: line?.aktif ? line.level.map((by) => ({ by, status: 'Waiting' })) : [{ by: 'HR', status: 'Waiting' }], ...item })
  }),
  decide: (col, id, ok, by = 'HR') => update((s) => {
    const it = s[col].find((x) => x.id === id)
    if (it.line) { const step = it.line.find((l) => l.status === 'Waiting'); if (step) step.status = ok ? 'Approved' : 'Rejected' }
    const done = !it.line || it.line.every((l) => l.status === 'Approved')
    it.status = !ok ? 'Rejected' : done ? 'Approved' : 'Waiting'
  }),
  acceptInventory: (id, d = {}) => update((s) => { Object.assign(s.inventories.find((x) => x.id === id), { status: 'Accepted', diterima: today(), ...d }) }),
  reportInventory: (id, catatan) => update((s) => { const it = s.inventories.find((x) => x.id === id); Object.assign(it, { status: 'Dilaporkan', laporan: catatan }); s.inbox.unshift({ id: uid('n'), to: 'admin', judul: 'Inventaris dilaporkan tidak sesuai', isi: `${it.item} (${it.nomor}): ${catatan}`, waktu: today() + ' ' + nowTime() }) }),
  // Resign dari talent: daftar pengembalian barang + notifikasi ke admin operasional & Branch
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
  sendMessage: (d) => update((s) => { s.messages.unshift({ id: uid('m'), ...d, waktu: today() + ' ' + nowTime(), dibaca: false }) }),
  readMessage: (id) => update((s) => { const m = s.messages.find((x) => x.id === id); if (m) m.dibaca = true }),
  saveBio: (id, d) => update((s) => { s.bioEdits = s.bioEdits || {}; s.bioEdits[id] = { ...(s.bioEdits[id] || {}), ...d } }),
  sendFeedback: (d) => update((s) => { s.feedbacks.unshift({ id: uid('f'), ...d, waktu: today() + ' ' + nowTime() }) }),
  saveHoliday: (id, d) => update((s) => { if (id) Object.assign(s.holidays.find((h) => h.id === id), d); else s.holidays.push({ id: uid('h'), ...d }) }),
  deleteHoliday: (id) => update((s) => { s.holidays = s.holidays.filter((h) => h.id !== id) }),
  saveWorkCal: (bid, d) => update((s) => { s.workCal[bid] = d }),
  saveShift: (id, d) => update((s) => { if (id) { const x = s.shifts.find((z) => z.id === id); s.employees.forEach((e) => { if (e.shift === x.name) e.shift = d.name }); Object.assign(x, d) } else s.shifts.push({ id: uid('sh'), ...d }) }),
  deleteShift: (id) => update((s) => { s.shifts = s.shifts.filter((x) => x.id !== id) }),
  saveAttDeduct: (bid, cfg) => update((s) => { s.attDeduct[bid] = cfg }),
  returnInventory: (id, kondisi = 'Baik', catatan = '') => update((s) => {
    const it = s.inventories.find((x) => x.id === id); Object.assign(it, { status: 'Returned', tanggalKembali: today(), kondisi, catatanKembali: catatan })
    const a = it.asset && s.assets.find((x) => x.id === it.asset)
    if (a) { assetEv(s, { asset: a.id, jenis: 'Kembali', emp: it.emp, ket: `Kondisi ${kondisi.toLowerCase()}${catatan ? ' · ' + catatan : ''}` })
      if (kondisi === 'Hilang') { a.status = 'Hilang'; assetEv(s, { asset: a.id, jenis: 'Hilang', pj: it.emp, ket: catatan || 'Dilaporkan hilang saat pengembalian', gantiRugi: 0 }) }
      else if (kondisi !== 'Baik') { a.kondisi = kondisi; if (kondisi === 'Rusak berat') a.status = 'Rusak'; assetEv(s, { asset: a.id, jenis: 'Rusak', tingkat: kondisi, bisaDipakai: kondisi !== 'Rusak berat', pj: it.emp, ket: catatan || 'Rusak saat dikembalikan' }) } }
    // Bila karyawan sedang resign dan semua barangnya sudah kembali, status pengembalian di Resign ikut Lengkap
    const rs = s.resigns.find((r) => r.emp === it.emp && r.status !== 'Rejected'); if (rs && !s.inventories.some((x) => x.emp === it.emp && x.status !== 'Returned')) rs.inventaris = 'Lengkap'
  }),
  signDoc: (batchId, emp) => update((s) => {
    const b = s.docBatches.find((x) => x.id === batchId); const it = b.items.find((x) => x.emp === emp)
    it.agreed = true; it.status = 'Employee Signed'; it.log = { ...(it.log || {}), 'Employee Signed': { file: `${it.dokumen} - ttd karyawan.pdf`, at: today() + ' ' + nowTime() } }
  }),
  // --- tambahan audit Figma 13 Nov ---
  saveAdmin: (id, d) => update((s) => { const prev = id ? s.admins.find((x) => x.id === id) : null; const before = prev ? `${prev.perms.length} fitur · ${prev.branches.length} Branch` : '—'; if (id) Object.assign(s.admins.find((x) => x.id === id), d); else s.admins.push({ id: uid('a'), role: 'Admin Operasional', aktif: true, perms: ['dashboard'], branches: [], ...d }); addLog(s, 'c1', 'Akun & Izin', id ? 'Mengubah data & izin admin' : 'Membuat akun admin', `${d.name} · ${d.perms.length} fitur`, undefined, undefined, { akun: d.name, sebelum: before, sesudah: `${d.perms.length} fitur · ${(d.branches || []).length} Branch`, diajukan: RANI, penyetuju: RANI }) }),
  toggleAdmin: (id) => update((s) => { const a = s.admins.find((x) => x.id === id); a.aktif = a.aktif === false; addLog(s, 'c1', 'Akun & Izin', a.aktif ? 'Mengaktifkan admin' : 'Menonaktifkan admin', a.name, undefined, undefined, { akun: a.name, sebelum: a.aktif ? 'Nonaktif' : 'Aktif', sesudah: a.aktif ? 'Aktif' : 'Nonaktif', diajukan: RANI, penyetuju: RANI }) }),
  saveMaster: (key, id, name) => update((s) => { const l = s.masters[key]; if (id) l.find((x) => x.id === id).name = name; else l.push({ id: uid('ms'), name, aktif: true }) }),
  toggleMaster: (key, id) => update((s) => { const m = s.masters[key].find((x) => x.id === id); m.aktif = !m.aktif }),
  deleteMaster: (key, id) => update((s) => { s.masters[key] = s.masters[key].filter((x) => x.id !== id) }),
  deleteBlast: (id) => update((s) => { s.blasts = s.blasts.filter((x) => x.id !== id) }),
  setEmp: (ids, d) => update((s) => { s.employees.forEach((e) => { if (ids.includes(e.id)) Object.assign(e, d) }) }),
  removeDocItem: (bid, empId) => update((s) => { const b = s.docBatches.find((x) => x.id === bid); b.items = b.items.filter((i) => i.emp !== empId) }),
  sendPayslip: (branch, bulan, o = {}) => update((s) => {
    const emps = s.employees.filter((e) => e.branch === branch && e.status !== 'Resign')
    emps.forEach((e) => { if (!s.payslips.some((p) => p.emp === e.id && p.bulan === bulan)) s.payslips.unshift({ id: uid('ps'), emp: e.id, bulan, thp: e.thp, terbit: today() }) })
    s.payslipSends.unshift({ id: uid('pk'), at: stampNow(), periode: bulan, tipe: 'Payroll', branch, mode: 'Manual', oleh: o.oleh || 'Rani Hapsari', emp: emps.map((e) => e.id), gagal: 0, catatan: o.catatan || '' })
    addLog(s, 'c1', 'Payroll', 'Mengirim payslip manual', `${s.branches.find((b) => b.id === branch)?.name} · ${bulan} · ${emps.length} karyawan`)
  }),
  savePayslipSetup: (bid, cfg, alasan, oleh = 'Rani Hapsari', peran = 'Superadmin') => update((s) => {
    const old = s.payslipSetup[bid]; const L = (c) => ({ 'Otomatis': c.aktif ? 'Aktif' : 'Nonaktif', 'Waktu kirim': c.mode === 'setelah' ? 'Setelah transfer berhasil' : 'Tanggal tetap', 'Tanggal kirim': `Tanggal ${c.tanggal}`, 'Jam kirim': c.jam, 'Kanal': [c.app && 'Aplikasi', c.email && 'E-mail'].filter(Boolean).join(' + ') || '—' })
    const a = L(old), b = L(cfg); const at = stampNow()
    Object.keys(a).forEach((k) => { if (a[k] !== b[k] && !(k === 'Tanggal kirim' && cfg.mode === 'setelah' && old.mode === 'setelah')) s.payslipSetupLog.unshift({ id: uid('pl'), at, oleh, peran, branch: bid, field: k, sebelum: a[k], sesudah: b[k], alasan }) })
    s.payslipSetup[bid] = cfg
    addLog(s, 'c1', 'Payroll', 'Mengubah jadwal pengiriman payslip', `${s.branches.find((x) => x.id === bid)?.name} · ${alasan}`, oleh, peran)
  }),
  savePretestSet: (id, d) => update((s) => { if (id) Object.assign(s.pretestSets.find((x) => x.id === id), d); else if (s.pretestSets.length < 5) s.pretestSets.push({ id: uid('pt'), dibuat: today(), aktif: false, ...d }) }),
  deletePretestSet: (id) => update((s) => { s.pretestSets = s.pretestSets.filter((x) => x.id !== id) }),
  activatePretestSet: (id) => update((s) => { s.pretestSets.forEach((x) => { x.aktif = x.id === id ? !x.aktif : false }) }),
  // --- revisi 16 Nov ---
  comment: (col, id, text) => update((s) => { const it = s[col].find((x) => x.id === id); (it.komentar ||= []).push({ text, at: today() }) }),
  verifyAttendance: (id, ok) => update((s) => { s.attendance.find((x) => x.id === id).verif = ok ? 'Approved' : 'Rejected' }),
  addInventory: (d) => update((s) => {
    const y = new Date().getFullYear(); const last = Math.max(0, ...s.inventories.map((i) => Number((i.nomor || '').split('-')[2]) || 0))
    const e = s.employees.find((x) => x.id === d.emp)
    let a = d.asset && s.assets.find((x) => x.id === d.asset)
    if (!a) { a = newAsset(s, { nama: d.item, kategori: d.kategori, branch: e?.branch || 'b1', harga: hargaOf(d.item), tglBeli: today(), vendor: 'Belum dicatat' }, 'Dicatat otomatis saat serah terima (nilai perkiraan)') }
    const nomor = `INV-${y}-${String(last + 1).padStart(4, '0')}`
    s.inventories.unshift({ id: uid('i'), nomor, tanggal: today(), status: 'Waiting', ...d, asset: a.id })
    assetEv(s, { asset: a.id, jenis: 'Serah', emp: d.emp, ket: `${nomor} · ${d.kebutuhan || 'diserahkan ke karyawan'}` })
  }),
  addAsset: (d) => update((s) => { newAsset(s, d, `Pembelian dari ${d.vendor || 'vendor'}`) }),
  assetDamage: (id, d) => update((s) => { const a = s.assets.find((x) => x.id === id); a.kondisi = d.tingkat; if (!d.bisaDipakai) a.status = 'Rusak'; assetEv(s, { asset: id, jenis: 'Rusak', tgl: d.tgl, tingkat: d.tingkat, bisaDipakai: d.bisaDipakai, pj: d.pj, ket: d.ket }) }),
  assetLoss: (id, d) => update((s) => { const a = s.assets.find((x) => x.id === id); a.status = 'Hilang'; assetEv(s, { asset: id, jenis: 'Hilang', tgl: d.tgl, pj: d.pj, ket: d.ket, gantiRugi: d.gantiRugi || 0 })
    const inv = s.inventories.find((i) => i.asset === id && i.status !== 'Returned'); if (inv) Object.assign(inv, { status: 'Returned', tanggalKembali: d.tgl, kondisi: 'Hilang', catatanKembali: 'Dilaporkan hilang' }) }),
  assetService: (id, d) => update((s) => { const a = s.assets.find((x) => x.id === id); assetEv(s, { asset: id, jenis: 'Servis', tgl: d.tgl, vendor: d.vendor, biaya: d.biaya, ket: d.ket })
    if (d.selesai) { assetEv(s, { asset: id, jenis: 'Selesai servis', tgl: d.tglSelesai || d.tgl, ket: 'Selesai' }); a.kondisi = 'Baik'; if (a.status === 'Rusak' || a.status === 'Dalam servis') a.status = 'Tersedia' } else a.status = 'Dalam servis' }),
  assetServiceDone: (id, d) => update((s) => { const a = s.assets.find((x) => x.id === id); a.status = d.berhasil === false ? 'Rusak' : 'Tersedia'; if (d.berhasil !== false) a.kondisi = 'Baik'
    if (d.biayaTambahan) assetEv(s, { asset: id, jenis: 'Servis', tgl: d.tgl, vendor: d.vendor || '', biaya: d.biayaTambahan, ket: 'Biaya tambahan saat selesai servis' })
    assetEv(s, { asset: id, jenis: 'Selesai servis', tgl: d.tgl, ket: d.berhasil === false ? 'Tidak bisa diperbaiki' : 'Kembali normal' }) }),
  saveInvCategory: (id, name) => update((s) => { if (id) { const c = s.invCategories.find((x) => x.id === id); s.inventories.forEach((i) => { if (i.kategori === c.name) i.kategori = name }); c.name = name } else s.invCategories.push({ id: uid('ic'), name }) }),
  deleteInvCategory: (id) => update((s) => { s.invCategories = s.invCategories.filter((x) => x.id !== id) }),
  saveEmpCategory: (id, d) => update((s) => { if (id) Object.assign(s.empCategories.find((x) => x.id === id), d); else s.empCategories.push({ id: uid('ec'), ...d }) }),
  deleteEmpCategory: (id) => update((s) => { s.empCategories = s.empCategories.filter((x) => x.id !== id) }),
  // Kandidat: lamar lowongan, minta jadwal wawancara, catat modul pre-test yang selesai
  applyJob: (talent, jobId) => update((s) => {
    if (s.candidates.some((c) => c.pool === talent && c.job === jobId)) return
    const p = s.pool.find((x) => x.id === talent) || s.employees.find((x) => x.id === talent)
    s.candidates.push({ id: uid('c'), name: p?.name || 'Talent', pool: talent, job: jobId, tahap: 1, skor: p?.skor ?? null, dilamar: today(), riwayat: [] })
    const j = s.jobs.find((x) => x.id === jobId); if (j) j.pelamar = (j.pelamar || 0) + 1
    const pp = s.pool.find((x) => x.id === talent); if (pp && pp.status === 'Active Pool') pp.status = 'In Hiring Process'
    s.inbox.unshift({ id: uid('n'), to: 'talent', emp: talent, judul: 'Lamaran terkirim: ' + (j?.posisi || 'Lowongan'), isi: 'Lamaranmu masuk tahap Tes tulis. Pantau prosesnya di menu Lowongan & Tawaran.', waktu: today() + ' ' + nowTime(), menu: 'lowongan' })
    s.inbox.unshift({ id: uid('n'), to: 'branch', branch: j?.branch, judul: 'Pelamar baru: ' + (j?.posisi || ''), isi: (p?.name || 'Talent') + ' melamar lewat akun talent.', waktu: today() + ' ' + nowTime(), link: 'seleksi' })
  }),
  requestInterview: (talent, jobId, slot) => update((s) => {
    s.interviews = s.interviews.filter((x) => !(x.talent === talent && x.job === jobId && x.status === 'Menunggu konfirmasi'))
    s.interviews.push({ id: uid('iv'), talent, job: jobId, status: 'Menunggu konfirmasi', slot, diminta: today() + ' ' + nowTime() })
    const j = s.jobs.find((x) => x.id === jobId); const p = s.pool.find((x) => x.id === talent)
    s.inbox.unshift({ id: uid('n'), to: 'branch', branch: j?.branch, judul: 'Permintaan jadwal wawancara', isi: `${p?.name || 'Talent'} memilih ${slot} untuk ${j?.posisi || ''}.`, waktu: today() + ' ' + nowTime(), link: 'seleksi' })
  }),
  finishPretest: (talent, modId) => update((s) => { const l = s.pretestDone[talent] || (s.pretestDone[talent] = []); if (!l.includes(modId)) l.push(modId) }),
  saveTalentAccess: (cfg) => update((s) => { s.talentAccess = cfg }),
  setTalentDemo: (id, phase) => update((s) => { if (phase) s.talentDemo[id] = phase; else delete s.talentDemo[id] }),
  saveOrgNode: (id, d) => update((s) => { if (id) Object.assign(s.org.nodes.find((x) => x.id === id), d); else s.org.nodes.push({ id: uid('o'), ...d }) }),
  deleteOrgNode: (id) => update((s) => { const n = s.org.nodes.find((x) => x.id === id); s.org.nodes.forEach((x) => { if (x.parent === id) x.parent = n.parent }); s.org.nodes = s.org.nodes.filter((x) => x.id !== id) }),
  saveDivisi: (id, name) => update((s) => { if (id) s.org.divisi.find((x) => x.id === id).name = name; else s.org.divisi.push({ id: uid('dv'), name }) }),
  deleteDivisi: (id) => update((s) => { s.org.divisi = s.org.divisi.filter((x) => x.id !== id); s.org.nodes.forEach((n) => { if (n.divisi === id) n.divisi = '' }) }),
  setLine: (modul, aktif) => update((s) => { s.approvalLine.find((x) => x.modul === modul).aktif = aktif }),
  // --- pengaturan Cuti / Lembur / Reimbursement (Figma admin STA) ---
  saveType: (col, id, d) => update((s) => { if (id) Object.assign(s[col].find((x) => x.id === id), d); else s[col].push({ id: uid('ty'), ...d }) }),
  deleteType: (col, id) => update((s) => { s[col] = s[col].filter((x) => x.id !== id) }),
  copyType: (col, id, patch = {}) => update((s) => { const src = s[col].find((x) => x.id === id); s[col].push({ ...structuredClone(src), id: uid('ty'), name: 'Copy of ' + src.name, ...patch }) }),
  setKey: (key, value) => update((s) => { s[key] = value }),
  adjustLeave: (d) => update((s) => { s.leaveAdjust.unshift({ ...d, at: today(), by: 'Admin' }) }),
  // --- Send Document & Setup Dokumen (revisi 16 Nov sore) ---
  setDocPJ: (d) => update((s) => { s.docPJ = d }),
  saveTemplate: (docType, d) => update((s) => { s.docTemplates[docType] = { ...(s.docTemplates[docType] || {}), ...d } }),
  // Generate semua dokumen bertipe template di satu batch; yang Manual/Existing dilewati (perlu unggah)
  generateAll: (bid) => update((s) => {
    const b = s.docBatches.find((x) => x.id === bid); const remun = s.remunerations.find((r) => r.id === b.remun)
    b.items.forEach((it) => {
      const mode = b.setelan === 'Semua' ? it.setelan : b.setelan
      if (mode !== 'New Contract Template' || it.status !== 'None') return
      const e = s.employees.find((x) => x.id === it.emp); const row = remun?.rows.find((r) => r.emp === it.emp)
      if (!it.nomor) { s.docSeq += 1; it.nomor = nomorSurat(s.docSeq, it.dokumen) }
      const tpl = s.docTemplates[it.dokumen]?.text || DEFAULT_TEMPLATES[it.dokumen] || ''
      it.text = fill(tpl, { ...fieldValues({ e, row, pj: s.docPJ, nomor: it.nomor, today: today(), setup: s.setup }), ...(it.override || {}) })
      it.ready = true; it.generated = true
    })
    b.generatedAt = today()
  }),
  editDoc: (bid, empId, d) => update((s) => { Object.assign(s.docBatches.find((x) => x.id === bid).items.find((i) => i.emp === empId), d) }),
  sendAllDocs: (bid) => update((s) => {
    const b = s.docBatches.find((x) => x.id === bid); const stamp = today() + ' ' + nowTime(); let n = 0
    b.items.forEach((it) => { if (it.status === 'None' && it.ready) { it.status = 'Sent'; it.log = { ...(it.log || {}), Sent: { file: it.file || `${it.dokumen}.pdf`, at: stamp } }; n += 1 } })
    if (n) s.inbox.unshift({ id: uid('n'), to: 'talent', judul: s.docMessage.judul, isi: s.docMessage.isi, waktu: stamp, menu: 'kontrak' })
    b.sentAt = stamp
  }),
  uploadStage: (bid, empId, stage, file) => update((s) => {
    const b = s.docBatches.find((x) => x.id === bid); const it = b.items.find((i) => i.emp === empId); const order = ['None', 'Sent', 'Employee Signed', 'Full Signed']
    it.log = { ...(it.log || {}), [stage]: { file, at: today() + ' ' + nowTime() } }
    if (order.indexOf(stage) > order.indexOf(it.status)) it.status = stage
    it.ready = true
    if (b.items.every((y) => y.status === 'Full Signed')) b.status = 'Complete'
  }),
  agreeContract: (empId) => update((s) => { s.contractAgreed[empId] = today() + ' ' + nowTime(); s.docBatches.forEach((b) => b.items.forEach((i) => { if (i.emp === empId) i.agreed = true })) }),
  setPerms: (id, perms, branches) => update((s) => { const a = s.admins.find((x) => x.id === id); a.perms = perms; a.branches = branches }),
  saveSetup: (setup) => update((s) => { s.setup = { ...setup, overrides: s.setup.overrides || {}, khusus: s.setup.khusus } }),
  saveSetupKhusus: (setup) => update((s) => { const { overrides, khusus, ...rest } = setup; s.setup = { ...s.setup, khusus: rest } }),
  // aturan per karyawan (Employee Setup) — menimpa setup umum saat menghitung remunerasi
  saveEmpSetup: (ids, ov) => update((s) => { s.setup.overrides = s.setup.overrides || {}; ids.forEach((id) => { s.setup.overrides[id] = structuredClone(ov) }) }),
  resetEmpSetup: (ids) => update((s) => { ids.forEach((id) => { delete s.setup.overrides?.[id] }) }),
  saveSetupBranch: (bid, f) => update((s) => { s.setup.overrides = s.setup.overrides || {}; s.employees.filter((e) => e.branch === bid).forEach((e) => { s.setup.overrides[e.id] = { basic: f.basic, posisi: f.posisi, company: { ...f.company }, employee: { ...f.employee } } }) }),
  addBranch: (b) => update((s) => { s.branches.push({ id: uid('b'), aktif: true, accounts: [], ...b }) }),
  updateBranch: (id, b) => update((s) => { Object.assign(s.branches.find((x) => x.id === id), b) }),
  toggleBranch: (id) => update((s) => { const b = s.branches.find((x) => x.id === id); b.aktif = !b.aktif }),
  deleteBranch: (id) => update((s) => { s.branches = s.branches.filter((x) => x.id !== id) }),
  toggleLine: (modul) => update((s) => { const l = s.approvalLine.find((x) => x.modul === modul); l.aktif = !l.aktif }),
  // Layanan pihak ketiga (Root)
  vendorNote: (id, isi) => update((s) => { const v = s.root.vendors.find((x) => x.id === id); v.notes.unshift({ at: stampNow(), oleh: s.root.user.nama, isi }) }),
  vendorTrouble: (id, tr) => update((s) => { const v = s.root.vendors.find((x) => x.id === id); v.troubles.unshift({ id: uid('tr'), selesai: '', status: 'Terbuka', ...tr }); v.notes.unshift({ at: stampNow(), oleh: s.root.user.nama, isi: `Gangguan dicatat: ${tr.judul} (${tr.tingkat})`, auto: true }) }),
  vendorTroubleSet: (id, tid, status, tindakan) => update((s) => { const v = s.root.vendors.find((x) => x.id === id); const tr = v.troubles.find((x) => x.id === tid); tr.status = status; if (tindakan) tr.tindakan = tindakan; if (status === 'Selesai') tr.selesai = stampNow(); v.notes.unshift({ at: stampNow(), oleh: s.root.user.nama, isi: `Gangguan "${tr.judul}" → ${status}`, auto: true }) }),
  vendorMaint: (id, m) => update((s) => { const v = s.root.vendors.find((x) => x.id === id); v.maint.push({ id: uid('mn'), status: 'Terjadwal', ...m }); v.notes.unshift({ at: stampNow(), oleh: s.root.user.nama, isi: `Maintenance dijadwalkan: ${m.judul}`, auto: true }) }),
  vendorMaintSet: (id, mid, status) => update((s) => { const v = s.root.vendors.find((x) => x.id === id); const m = v.maint.find((x) => x.id === mid); m.status = status; v.notes.unshift({ at: stampNow(), oleh: s.root.user.nama, isi: `Maintenance "${m.judul}" → ${status}`, auto: true }) }),
  vendorPay: (id, bayar) => update((s) => { const v = s.root.vendors.find((x) => x.id === id); v.bayar = { ...v.bayar, ...bayar }; v.notes.unshift({ at: stampNow(), oleh: s.root.user.nama, isi: `Metode pembayaran diubah: ${bayar.metode} · ${bayar.detail} (exp ${(bayar.exp || '').split('-').reverse().join('/')})`, auto: true }) }),
  vendorAdd: (v) => { const id = uid('v'); update((s) => { s.root.vendors.push({ id, status: 'Aktif', autoRenew: true, kuota: null, dipakai: [], invoices: [], troubles: [], maint: [], notes: [{ at: stampNow(), oleh: s.root.user.nama, isi: 'Layanan ditambahkan.', auto: true }], pakai: {}, ...v }) }); return id },
  setMyBranch: (id) => update((s) => { s.myBranch = id }),
  setMyMitra: (id) => update((s) => { s.myMitra = id }),
  blast: (b) => update((s) => { s.blasts.unshift({ id: uid('bl'), tanggal: todayISO(), jam: nowTime(), kanal: 'Keduanya', kategori: 'Pengumuman', ...b }); if (b.kanal !== 'Email' && b.ke !== '—') s.inbox.unshift({ id: uid('n'), to: 'talent', judul: b.judul, isi: b.isi || '', waktu: today() + ' ' + nowTime() })
    ;(b.mitra || []).forEach((mid) => s.inbox.unshift({ id: uid('n'), to: 'mitra', mitra: mid, jenis: 'Blast', kategori: b.kategori, judul: b.judul, isi: b.isi || '', waktu: today() + ' ' + nowTime(), dari: 'Blast · ' + (b.oleh || 'Superadmin') })) }),
  addPool: (p) => update((s) => { s.pool.unshift({ id: uid('p'), status: 'Registered', skor: null, ...p }) }),
  addMitra: (m) => update((s) => { s.mitras.push({ id: uid('m'), talent: 0, diundang: 0, diproses: 0, terpilih: 0, ...m }) }),
}

function docFor(row, s) {
  const e = s.employees.find((x) => x.id === row.emp)
  const type = row.employeeType || e?.type
  if (row.jenis === 'New Hiring') return type === 'Magang' ? 'Kontrak Internship' : type === 'Freelance' ? 'Kontrak Freelance' : 'Offering Letter'
  if (row.jenis === 'Resign') return 'Surat Keterangan Kerja'
  return 'Amandemen PKWT'
}
