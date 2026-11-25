// Talent Pool & Mitra (kerja sama penyaluran kandidat, pola outsourcing) — revisi 21 Nov 2026.
// Status talent (to be, dokumen "Talent Pool - Wed 28 May"):
//   Registered          → biodata terdaftar, belum pre-test
//   Pending Assessment  → sudah mengerjakan pre-test, belum dinilai
//   Active Pool         → sudah dinilai, siap diundang Branch
//   In Hiring Process   → diundang ke lowongan & sudah mengisi pre-test job post
//   Hired               → lolos seleksi tahap 5
//   Nonaktif            → tidak dihitung di Quick Summary
export const TP_STATUS = [
  ['Registered', 'Registered Talent', 'Biodata terdaftar, belum pre-test', '#2a78d6', true],
  ['Pending Assessment', 'Talent Pending Assessment', 'Sudah pre-test, belum dinilai', '#d9a400', true],
  ['Active Pool', 'Active Talent Pool', 'Sudah dinilai, siap diundang Branch', '#0a5950', true],
  ['In Hiring Process', 'Talent in Hiring Process', 'Diundang ke lowongan & sudah isi pre-test job post', '#7a5af5', false],
  ['Hired', 'Hired Talents', 'Lolos seleksi tahap 5', '#2f8f4e', false],
] // [status, label, definisi, warna, tampil untuk Branch]

// Aturan kerja sama yang wajib disepakati saat membuat akun mitra & selalu tampil di akun mitra
export const ATURAN_MITRA = [
  ['pdp', 'Kepatuhan data (UU PDP)', 'Setiap kandidat wajib memberi persetujuan eksplisit (consent) bahwa data pribadinya dibagikan melalui platform Kirana ke klien. Kandidat tanpa consent tidak bisa diproses atau ditawarkan.'],
  ['milik', 'Kepemilikan database kandidat', 'Kontrak menegaskan pemilik sah talent pool yang diunggah, termasuk saat kandidat ditolak Klien A namun berpotensi disalurkan ke Klien B.'],
  ['billing', 'Skema komersial & billing', 'Disepakati salah satu: subscription (per seat/jumlah talent aktif), revenue sharing dari placement fee, atau referral/lead generation.'],
  ['api', 'Integrasi sistem (API/Webhook)', 'Bila mitra punya sistem sendiri, Kirana menyediakan Open API (Client ID & Secret) dan webhook agar data kandidat tersinkron otomatis.'],
]
export const ALUR_MITRA = [
  ['Sinkronisasi permintaan (Job Requisition)', 'Klien membuka kebutuhan di modul rekrutmen lalu meneruskannya ke mitra lengkap dengan kualifikasi, kuota, dan SLA.'],
  ['Submission & screening kandidat', 'Rekruter mitra menginput/mengimpor kandidat (CSV/API), lalu kandidat mengerjakan pre-test dan dinilai.'],
  ['Tracking & interview', 'Klien dan mitra memantau progres kandidat di satu pipeline: jadwal wawancara sampai penawaran kerja.'],
  ['Konversi data otomatis (onboarding)', 'Kandidat yang lolos tahap 5 otomatis menjadi data karyawan aktif tanpa input ulang.'],
  ['Pengelolaan pasca-penempatan', 'Status PKWT/kontrak, tanggal mulai-berakhir, Branch penempatan, gaji & BPJS tercatat untuk absensi dan payroll.'],
]
export const KEPEMILIKAN = [['Mitra', 'Milik mitra — boleh disalurkan ke klien lain dengan consent kandidat'], ['Bersama', 'Milik bersama mitra & Kirana — penyaluran ulang lewat Kirana'], ['Klien', 'Milik klien setelah kandidat diundang klien']]
export const BILLING = [['Subscription', 'Subscription per seat (talent aktif/bulan)'], ['Revenue sharing', 'Revenue sharing dari placement fee'], ['Referral', 'Referral / lead generation (per kandidat hired)']]

const MITRAS = [
  { id: 'm1', name: 'Mitra Karya Talenta', pic: 'Hana Prameswari', telp: '0812-5550-144', email: 'hana@karyatalenta.id', mitraDengan: 'Superadmin', customer: 'c1', klien: ['c1'],
    perjanjian: { status: 'Aktif', mulai: '2026-03-01', sampai: '2027-02-28', kepemilikan: 'Mitra', billing: 'Revenue sharing', nilai: '10% dari gaji bulan pertama per kandidat hired', api: { aktif: false }, sla: { submit: 7, feedback: 3 }, disetujui: { at: '2026-02-24 10:15', oleh: 'Rani Hapsari', mitra: 'Hana Prameswari' } } },
  { id: 'm2', name: 'PT Solusi SDM Nusantara', pic: 'Bagus Wiratama', telp: '0811-2040-778', email: 'bagus@solusisdm.co.id', mitraDengan: 'Owner Kirana', customer: '', klien: ['c1', 'c2', 'c4'],
    perjanjian: { status: 'Aktif', mulai: '2026-01-15', sampai: '2027-01-14', kepemilikan: 'Bersama', billing: 'Subscription', nilai: 'Rp 25.000 per talent aktif per bulan', api: { aktif: true, clientId: 'kpk_live_9F2A7C41', secret: '••••••••••••3d8e', webhook: 'https://api.solusisdm.co.id/kirana/webhook', sync: '2026-11-21 06:00' }, sla: { submit: 5, feedback: 2 }, disetujui: { at: '2026-01-12 14:00', oleh: 'Putri Amalia (Owner Kirana)', mitra: 'Bagus Wiratama' } } },
  { id: 'm3', name: 'PT Garda Talenta Outsourcing', pic: 'Lestari Wulan', telp: '0813-7700-219', email: 'lestari@gardatalenta.id', mitraDengan: 'Superadmin', customer: 'c1', klien: ['c1'],
    perjanjian: { status: 'Menunggu persetujuan', mulai: '2026-12-01', sampai: '2027-11-30', kepemilikan: 'Klien', billing: 'Referral', nilai: 'Rp 750.000 per kandidat hired', api: { aktif: false }, sla: { submit: 10, feedback: 5 }, disetujui: null } },
  { id: 'm4', name: 'PT Talenta Borneo Mandiri', pic: 'Yohanes Kurniadi', telp: '0561-777-2300', email: 'yohanes@talentaborneo.id', mitraDengan: 'Superadmin', customer: 'c1', klien: ['c1'],
    perjanjian: { status: 'Aktif', mulai: '2026-06-01', sampai: '2027-05-31', kepemilikan: 'Mitra', billing: 'Revenue sharing', nilai: '8% dari gaji bulan pertama per kandidat hired', api: { aktif: true, clientId: 'kpk_live_B0RN30E2', secret: '••••••••••••a91c', webhook: 'https://hris.talentaborneo.id/hooks/kirana', sync: '2026-11-21 05:30' }, sla: { submit: 10, feedback: 3 }, disetujui: { at: '2026-05-27 09:40', oleh: 'Rani Hapsari', mitra: 'Yohanes Kurniadi' } } },
]

const N1 = ['Aldi', 'Bella', 'Cahyo', 'Dina', 'Erlangga', 'Farah', 'Galang', 'Hesti', 'Ilham', 'Jihan', 'Kemal', 'Lusi', 'Miftah', 'Nabila', 'Oscar', 'Puspa', 'Raka', 'Sinta', 'Taufik', 'Uli', 'Vino', 'Winda', 'Yusril', 'Zaskia']
const N2 = ['Pradana', 'Maharani', 'Saputro', 'Lestari', 'Wibisono', 'Anggraini', 'Ramadhan', 'Kusumawati', 'Hakim', 'Safitri', 'Gunadi', 'Purnama']
const SPEC = [['Backend Developer', 'S1', 'j1'], ['Data Analyst', 'S1', 'j14'], ['QA Engineer', 'D3', 'j10'], ['Sales Executive', 'SMA/SMK', 'j11'], ['Product Manager', 'S1', 'j9'], ['Marketing Staff', 'S1', 'j2'], ['Pemanen Sawit', 'SMA/SMK', 'jha1'], ['Teknisi Mesin', 'SMK', 'jha2'], ['Admin Support', 'D3', 'j2'], ['UI/UX Designer', 'S1', 'j9']]
const EXP = ['0–2 tahun', '2–4 tahun', '4–6 tahun', '>6 tahun']
// [status, jumlah]
const PLAN = [['Registered', 14], ['Pending Assessment', 11], ['Active Pool', 14], ['In Hiring Process', 7], ['Hired', 8], ['Nonaktif', 3]]
const MITRA_OF = ['Mitra Karya Talenta', 'PT Solusi SDM Nusantara', 'PT Talenta Borneo Mandiri', '—', 'PT Solusi SDM Nusantara', 'Mitra Karya Talenta', 'PT Talenta Borneo Mandiri']

export function seedTalentPool(s) {
  // akun mitra + perjanjian
  s.mitras = MITRAS.map((m) => ({ ...m, ...(s.mitras.find((x) => x.id === m.id) ? { talent: 0, diundang: 0, diproses: 0, terpilih: 0 } : { talent: 0, diundang: 0, diproses: 0, terpilih: 0 }) }))
  // lengkapi pool lama
  const d0 = ['2026-08-04', '2026-09-12', '2026-09-20', '2026-10-02', '2026-10-15', '2026-07-21', '2026-10-28', '2026-11-03']
  s.pool.forEach((p, i) => { p.daftar = p.daftar || d0[i % d0.length]; p.sumber = p.mitra && p.mitra !== '—' ? 'Mitra' : 'Daftar sendiri'; p.consent = p.consent || { at: p.daftar + ' 09:00', versi: 'PDP v1.2' } })
  // talent tambahan (seimbang per status & mitra)
  let k = 0
  PLAN.forEach(([st, n]) => { for (let j = 0; j < n; j++, k++) {
    const [spec, pend, job] = SPEC[(k * 3) % SPEC.length]; const mitra = MITRA_OF[k % MITRA_OF.length]
    let day = `2026-${String(6 + (k % 6)).padStart(2, '0')}-${String(1 + ((k * 7) % 27)).padStart(2, '0')}`; if (day > '2026-11-19') day = `2026-11-${String(1 + (k % 18)).padStart(2, '0')}`
    const skor = ['Registered', 'Pending Assessment'].includes(st) ? null : 62 + ((k * 13) % 34)
    const noConsent = st === 'Registered' && k % 5 === 1 && mitra !== '—'
    s.pool.push({ id: 'tp' + k, name: `${N1[k % N1.length]} ${N2[(k * 5 + Math.floor(k / N1.length)) % N2.length]}`, kelamin: k % 2 ? 'Perempuan' : 'Laki-laki', pendidikan: pend, pengalaman: EXP[k % 4], spesialisasi: spec, skor, status: st, mitra,
      ekspektasi: (spec === 'Pemanen Sawit' ? 3800000 : spec === 'Teknisi Mesin' ? 5800000 : 6000000 + (k % 8) * 1000000), daftar: day, sumber: mitra === '—' ? 'Daftar sendiri' : 'Mitra',
      consent: noConsent ? null : { at: day + ' 10:00', versi: 'PDP v1.2' }, job: ['In Hiring Process', 'Hired'].includes(st) ? job : undefined, aktif: st !== 'Nonaktif' })
  } })
  // permintaan (job requisition) ke mitra
  s.requisitions = [
    { id: 'rq1', job: 'j1', mitra: 'm2', kuota: 3, sla: 5, kualifikasi: 'S1 Informatika, 2+ tahun Node.js/Go, siap WFO Jakarta', dikirim: '2026-11-10', oleh: 'Rani Hapsari' },
    { id: 'rq2', job: 'jha1', mitra: 'm4', kuota: 15, sla: 10, kualifikasi: 'Sehat jasmani, pengalaman panen sawit diutamakan, domisili Kubu Raya/Pontianak', dikirim: '2026-11-03', oleh: 'Rani Hapsari' },
    { id: 'rq3', job: 'j11', mitra: 'm1', kuota: 2, sla: 7, kualifikasi: 'Min. SMA/SMK, pengalaman sales B2B, punya SIM C', dikirim: '2026-11-05', oleh: 'Dewi Anggraini' },
    { id: 'rq4', job: 'j14', mitra: 'm2', kuota: 2, sla: 5, kualifikasi: 'S1 Statistik/Informatika, SQL & Python', dikirim: '2026-11-17', oleh: 'Rani Hapsari' },
    { id: 'rq5', job: 'jha2', mitra: 'm4', kuota: 2, sla: 10, kualifikasi: 'SMK Mesin, pengalaman boiler/turbin', dikirim: '2026-10-20', oleh: 'Rani Hapsari', selesai: '2026-11-02' },
  ]
  // hubungkan kandidat mitra ke permintaan (jumlah submit per permintaan dibuat bervariasi)
  s.pool.forEach((p) => { if (p.id.startsWith('tp')) { delete p.req } })
  const ORDER = ['Hired', 'In Hiring Process', 'Active Pool', 'Pending Assessment', 'Registered']
  ;[['rq5', 2, ['Hired']], ['rq1', 3, ['In Hiring Process', 'Active Pool', 'Pending Assessment']], ['rq2', 6, ORDER], ['rq3', 1, ['In Hiring Process', 'Active Pool']], ['rq4', 1, ['Pending Assessment', 'Registered']]].forEach(([rid, n, sts]) => {
    const r = s.requisitions.find((x) => x.id === rid); const m = s.mitras.find((x) => x.id === r.mitra)
    const cand = s.pool.filter((p) => p.mitra === m.name && !p.req && p.consent && p.status !== 'Nonaktif').sort((a, b) => sts.indexOf(a.status) - sts.indexOf(b.status)).filter((p) => sts.includes(p.status) || sts === ORDER)
    cand.slice(0, n).forEach((p) => { p.req = rid; if (['In Hiring Process', 'Hired'].includes(p.status) || rid === 'rq2') p.job = r.job })
  })
  // talent mitra yang ditambahkan dan pemasukan referral/revenue sharing (Root)
  s.mitraFees = [
    { id: 'mf1', mitra: 'm2', bulan: '2026-09', jenis: 'Subscription', nominal: 25000 * 31, ket: '31 talent aktif' },
    { id: 'mf2', mitra: 'm2', bulan: '2026-10', jenis: 'Subscription', nominal: 25000 * 36, ket: '36 talent aktif' },
    { id: 'mf3', mitra: 'm2', bulan: '2026-11', jenis: 'Subscription', nominal: 25000 * 40, ket: '40 talent aktif' },
    { id: 'mf4', mitra: 'm1', bulan: '2026-10', jenis: 'Revenue sharing', nominal: 1150000, ket: '1 kandidat hired (Wulan Sari)' },
    { id: 'mf5', mitra: 'm4', bulan: '2026-11', jenis: 'Revenue sharing', nominal: 2 * 0.08 * 5800000, ket: '2 kandidat hired (Teknisi Mesin)' },
  ]
}

// ---------- Mitra: profil, penempatan di Branch (klien), inbox & notifikasi (21 Nov) ----------
const BR_POS = { b4: ['Pemanen Sawit', 'Operator Pabrik', 'Mandor Kebun', 'Driver Truk', 'Admin Gudang', 'Teknisi Mesin Pabrik'], b1: ['Backend Engineer', 'Marketing Staff', 'Product Manager'], b2: ['QA Engineer', 'Data Analyst', 'Frontend Developer'], b3: ['Sales Executive', 'Customer Service', 'Admin Gudang'] }
export function seedMitraExtra(s) {
  const PROFIL = {
    m1: { alamat: 'Jl. Gajah Mada No. 118, Pontianak, Kalimantan Barat', npwp: '01.234.567.8-701.000', bank: 'BNI · 0987654321 a.n. PT Mitra Karya Talenta', web: 'karyatalenta.id', foto: 'logo-karyatalenta.png' },
    m2: { alamat: 'Jl. Jend. Sudirman Kav. 52, Jakarta Selatan', npwp: '02.345.678.9-012.000', bank: 'BCA · 5440012345 a.n. PT Solusi SDM Nusantara', web: 'solusisdm.co.id', foto: 'logo-solusisdm.png' },
    m3: { alamat: 'Jl. Raya Darmo No. 45, Surabaya', npwp: '03.456.789.0-614.000', bank: 'Mandiri · 1420098765 a.n. PT Garda Talenta Outsourcing', web: 'gardatalenta.id', foto: '' },
    m4: { alamat: 'Jl. Ahmad Yani No. 7, Kubu Raya, Kalimantan Barat', npwp: '04.567.890.1-702.000', bank: 'BRI · 0021-01-000123-30-5 a.n. PT Talenta Borneo Mandiri', web: 'talentaborneo.id', foto: 'logo-talentaborneo.png' },
  }
  s.mitras.forEach((m) => { Object.assign(m, PROFIL[m.id] || {}); m.profilLog = m.profilLog || [] })
  s.mitras.find((m) => m.id === 'm1').profilLog = [{ at: '2026-10-02 11:20', oleh: 'Hana Prameswari', field: 'No. telp', dari: '0812-5550-100', ke: '0812-5550-144' }]
  // Penempatan & lamaran talent mitra di Branch klien. Hamparan Alam (b4) jadi klien utama.
  const p2 = (n) => String(n).padStart(2, '0')
  s.placements = []; let k = 0
  const add = (o) => s.placements.push({ id: 'pl' + ++k, ...o })
  s.mitras.forEach((m, mi) => {
    const mine = s.pool.filter((p) => p.mitra === m.name && p.status !== 'Nonaktif')
    mine.forEach((p, i) => {
      const main = m.id === 'm2' ? ['b1', 'b2', 'b3', 'b4'][i % 4] : (i % 3 === 2 ? ['b1', 'b2', 'b3'][i % 3] : 'b4')
      const pos = (br) => BR_POS[br][(i + mi) % BR_POS[br].length]
      const mon = 1 + ((i * 5 + mi * 3) % 9)
      if (p.status === 'Hired') {
        // penempatan aktif + (kadang) penempatan lama yang sudah selesai
        add({ talent: p.id, mitra: m.id, branch: main, posisi: pos(main), tahap: 'Hired', mulai: `2026-${p2(mon)}-${p2(1 + (i % 20))}`, selesai: `2027-${p2(mon)}-${p2(1 + (i % 20))}` })
        if (i % 2 === 0) add({ talent: p.id, mitra: m.id, branch: main === 'b4' ? 'b3' : 'b4', posisi: pos(main === 'b4' ? 'b3' : 'b4'), tahap: 'Selesai', mulai: `2025-${p2(mon)}-03`, selesai: `2025-${p2(Math.min(12, mon + 6))}-02` })
      } else if (p.status === 'In Hiring Process') {
        add({ talent: p.id, mitra: m.id, branch: main, posisi: pos(main), tahap: 'Proses seleksi', mulai: `2026-11-${p2(2 + (i % 15))}` })
        if (i % 2) add({ talent: p.id, mitra: m.id, branch: main === 'b4' ? 'b1' : 'b4', posisi: pos(main === 'b4' ? 'b1' : 'b4'), tahap: 'Tidak lolos', mulai: `2026-09-${p2(3 + (i % 20))}`, selesai: `2026-10-${p2(1 + (i % 20))}` })
      } else if (p.status === 'Active Pool') {
        // pernah ditempatkan (kontrak selesai, kembali ke pool) atau pernah melamar
        if (i % 3 === 0) add({ talent: p.id, mitra: m.id, branch: 'b4', posisi: pos('b4'), tahap: 'Selesai', mulai: `2025-${p2(mon)}-10`, selesai: `2026-${p2(mon)}-09` })
        if (i % 2 === 1) add({ talent: p.id, mitra: m.id, branch: ['b1', 'b2', 'b3'][i % 3], posisi: pos(['b1', 'b2', 'b3'][i % 3]), tahap: 'Tidak lolos', mulai: `2026-08-${p2(4 + (i % 20))}`, selesai: `2026-08-${p2(18 + (i % 10))}` })
      }
    })
  })
  // Penempatan yang sudah ada sejak lama untuk Mitra Karya Talenta di Hamparan Alam (riwayat lebih kaya)
  const m1t = s.pool.filter((p) => p.mitra === 'Mitra Karya Talenta' && ['Active Pool', 'Hired'].includes(p.status))
  m1t.slice(0, 4).forEach((p, i) => add({ talent: p.id, mitra: 'm1', branch: 'b4', posisi: BR_POS.b4[i], tahap: 'Selesai', mulai: `2024-${p2(3 + i * 2)}-01`, selesai: `2025-${p2(2 + i * 2)}-28` }))
  // Notifikasi dari Superadmin ke mitra (lonceng)
  const N = (mitra, judul, isi, waktu, link, read) => s.inbox.push({ id: 'nm' + (s.inbox.length + 1), to: 'mitra', mitra, jenis: 'Superadmin', judul, isi, waktu, link, read: !!read, dari: 'Superadmin · Rani Hapsari' })
  N('m1', 'Permintaan baru: Sales Executive', 'Branch Surabaya Ops butuh 2 kandidat, SLA 7 hari.', '2026-11-05 09:12', 'lowongan', true)
  N('m1', 'SLA permintaan Sales Executive terlewat', 'Baru 1 dari 2 kandidat. Mohon segera submit kandidat tambahan.', '2026-11-13 08:00', 'lowongan')
  N('m1', 'Kandidat lolos tahap 5', 'Wulan Sari diterima di Branch Jakarta Digital. Data karyawan dibuat otomatis.', '2026-11-10 15:40', 'klien')
  N('m1', 'Lengkapi NPWP kandidat', 'NPWP Salsa Nabila belum diunggah. Dibutuhkan untuk kontrak.', '2026-11-12 09:00', 'talent')
  N('m1', 'Tagihan revenue sharing Oktober', 'Invoice Rp 1.150.000 untuk 1 kandidat hired sudah terbit.', '2026-11-01 10:00', 'kerjasama', true)
  N('m1', 'Kontrak penempatan berakhir bulan depan', '2 talent di PT. Hamparan Alam selesai kontrak Desember 2026.', '2026-11-18 13:30', 'klien')
  N('m4', 'Permintaan Pemanen Sawit lewat SLA', 'Baru 6 dari 15 kandidat untuk PT. Hamparan Alam. Mohon percepat.', '2026-11-14 07:30', 'lowongan')
  N('m4', 'Sinkron API berhasil', '12 kandidat tersinkron dari sistem Talenta Borneo.', '2026-11-21 05:30', 'talent', true)
  N('m3', 'Aturan kerja sama menunggu persetujuanmu', 'Silakan baca & setujui aturan di menu Kerja Sama untuk mengaktifkan akun.', '2026-11-20 10:00', 'kerjasama')
  // Blast Notifikasi Superadmin yang juga dikirim ke mitra
  const BL = [['2026-11-03', '08:30', 'Kebijakan HR', 'Pembaruan aturan UU PDP v1.3', 'Mulai 1 Des, consent kandidat wajib versi PDP v1.3. Kandidat lama diminta konfirmasi ulang.', ['m1', 'm2', 'm4']],
    ['2026-11-11', '10:00', 'Payroll & Gaji', 'Jadwal tagihan mitra November', 'Invoice revenue sharing & subscription November terbit 1 Desember 2026.', ['m1', 'm2', 'm4']],
    ['2026-11-17', '07:15', 'Pengumuman', 'Kebutuhan panen raya PT. Hamparan Alam', 'Hamparan Alam butuh ±40 talent lapangan Des–Feb. Prioritas domisili Kalimantan Barat.', ['m1', 'm4']],
    ['2026-11-20', '16:00', 'Libur & Cuti', 'Cuti bersama akhir tahun', 'Layanan admin Kirana libur 24–26 Des. Submit kandidat tetap bisa lewat portal/API.', ['m1', 'm2', 'm3', 'm4']]]
  BL.forEach(([tanggal, jam, kategori, judul, isi, ms], i) => {
    s.blasts.unshift({ id: 'blm' + i, tanggal, jam, kategori, kanal: 'App', ke: '—', mitra: ms, oleh: 'Rani Hapsari', peran: 'Superadmin', judul, isi })
    ms.forEach((mid) => s.inbox.push({ id: `nb${i}${mid}`, to: 'mitra', mitra: mid, jenis: 'Blast', kategori, judul, isi, waktu: tanggal + ' ' + jam, read: i < 2, dari: 'Blast · Rani Hapsari' })) })
  s.blasts.sort((a, b) => (b.tanggal + b.jam).localeCompare(a.tanggal + a.jam))
  // Aktivitas talent terdaftar milik mitra (sistem / Branch)
  const byM = (m, st, i = 0) => s.pool.filter((p) => p.mitra === m && p.status === st)[i]?.name || 'Talent'
  const A = (mitra, judul, isi, waktu, link, read, dari = 'Sistem · Talent Pool') => s.inbox.push({ id: 'na' + (s.inbox.length + 1), to: 'mitra', mitra, jenis: 'Aktivitas', judul, isi, waktu, link, read: !!read, dari })
  const K = 'Mitra Karya Talenta', TB = 'PT Talenta Borneo Mandiri'
  A('m1', 'Pre-test selesai', `${byM(K, 'Registered')} menyelesaikan pre-test (skor 82). Siap dinilai Superadmin.`, '2026-11-21 09:40', 'talent')
  A('m1', 'Jadwal wawancara dari Branch', `PT. Hamparan Alam mengundang ${byM(K, 'In Hiring Process')} wawancara 25 Nov, 10:00 (Mandor Kebun).`, '2026-11-20 14:05', 'klien', false, 'PT. Hamparan Alam · HR')
  A('m1', 'Talent di-hire', `${byM(K, 'Hired')} diterima sebagai Operator Pabrik di PT. Hamparan Alam, mulai 1 Des 2026.`, '2026-11-19 11:30', 'klien', false, 'PT. Hamparan Alam · HR')
  A('m1', 'Talent memperbarui CV', `${byM(K, 'Active Pool')} mengunggah sertifikat K3 dan memperbarui pengalaman kerja.`, '2026-11-18 20:10', 'talent', true)
  A('m1', 'Talent tidak lolos seleksi', `${byM(K, 'In Hiring Process', 1)} tidak lolos tahap wawancara di Branch Jakarta Digital. Status kembali ke pool.`, '2026-11-15 16:20', 'klien', true, 'Branch Jakarta Digital · HR')
  A('m1', 'Pengajuan resign talent', `${byM(K, 'Hired', 1)} mengajukan resign di PT. Hamparan Alam (notice 30 hari). Talent akan kembali ke Active Pool.`, '2026-11-14 08:50', 'klien', true, 'PT. Hamparan Alam · HR')
  A('m4', 'Talent di-hire', `${byM(TB, 'Hired')} mulai kerja sebagai Pemanen Sawit di PT. Hamparan Alam.`, '2026-11-18 09:00', 'klien', false, 'PT. Hamparan Alam · HR')
  A('m4', 'Pre-test selesai', `${byM(TB, 'Registered')} menyelesaikan pre-test (skor 76).`, '2026-11-20 13:15', 'talent')
  A('m2', 'Talent di-hire', `${byM('PT Solusi SDM Nusantara', 'Hired')} diterima di Branch Bandung Tech.`, '2026-11-16 10:00', 'klien', true, 'Branch Bandung Tech · HR')
  // Inbox mitra: percakapan dengan Superadmin & talent (hired dan kandidat)
  const tal = (m, st, i = 0) => s.pool.filter((p) => p.mitra === m && p.status === st)[i] || s.pool.find((p) => p.mitra === m)
  const M = 'Mitra Karya Talenta'; const hired = tal(M, 'Hired'); const hired2 = tal(M, 'Hired', 1); const proc = tal(M, 'In Hiring Process'); const cand = tal(M, 'Registered'); const act = tal(M, 'Active Pool')
  const msg = (mitra, arah, dengan, who, judul, isi, waktu, dibaca = true) => (s.mitraMsgs ||= []).push({ id: 'mm' + ((s.mitraMsgs || []).length + 1), mitra, arah, dengan, who, judul, isi, waktu, dibaca })
  msg('m1', 'masuk', 'Superadmin', 'Rani Hapsari', 'Permintaan kandidat Sales Executive', 'Halo tim Karya Talenta, kami butuh 2 kandidat Sales Executive untuk Surabaya. Detail kualifikasi ada di menu Permintaan Klien.', '2026-11-05 09:15')
  msg('m1', 'keluar', 'Superadmin', 'Rani Hapsari', 'Re: Permintaan kandidat Sales Executive', 'Siap Bu Rani, 1 kandidat sudah kami submit. Kandidat kedua menunggu hasil pre-test hari Jumat.', '2026-11-12 16:02')
  msg('m1', 'masuk', 'Superadmin', 'Rani Hapsari', 'Jadwal onboarding PT. Hamparan Alam', 'Talent hired untuk Hamparan Alam mulai kerja 1 Desember. Mohon pastikan berkas PKWT & BPJS lengkap.', '2026-11-19 10:20', false)
  msg('m1', 'masuk', 'Talent', hired?.name, 'Pertanyaan BPJS', 'Pak/Bu, kartu BPJS Ketenagakerjaan saya sudah aktif belum ya? Saya mulai kerja di Hamparan Alam bulan ini.', '2026-11-18 19:45', false)
  msg('m1', 'keluar', 'Talent', hired?.name, 'Re: Pertanyaan BPJS', 'Sudah didaftarkan HR Hamparan Alam, kartu digital terbit maksimal 7 hari kerja. Nanti kami kabari.', '2026-11-19 08:10')
  msg('m1', 'masuk', 'Talent', hired2?.name, 'Perpanjangan kontrak', 'Kontrak saya selesai bulan depan. Apakah ada info perpanjangan dari klien?', '2026-11-17 12:30')
  msg('m1', 'masuk', 'Talent', proc?.name, 'Jadwal interview', 'Saya sudah isi pre-test job post. Kapan jadwal wawancaranya?', '2026-11-16 09:05')
  msg('m1', 'keluar', 'Talent', proc?.name, 'Re: Jadwal interview', 'Branch akan mengirim pilihan slot di menu Jadwal Wawancara aplikasi Talent. Pantau notifikasinya ya.', '2026-11-16 10:40')
  msg('m1', 'keluar', 'Talent', cand?.name, 'Pengingat pre-test', 'Halo! Akunmu sudah aktif. Jangan lupa kerjakan pre-test sebelum 25 November supaya bisa dinilai.', '2026-11-20 08:00')
  msg('m1', 'masuk', 'Talent', act?.name, 'Siap ditempatkan', 'Saya sudah selesai kontrak sebelumnya dan siap ditempatkan lagi, terutama di Pontianak.', '2026-11-14 14:15')
  msg('m4', 'masuk', 'Superadmin', 'Rani Hapsari', 'Percepatan Pemanen Sawit', 'Mohon kirim tambahan kandidat Pemanen Sawit minggu ini, panen raya mulai Desember.', '2026-11-14 07:40', false)
  msg('m4', 'keluar', 'Superadmin', 'Rani Hapsari', 'Re: Percepatan Pemanen Sawit', 'Baik Bu, 5 kandidat sedang pre-test, akan kami submit Senin.', '2026-11-14 11:00')
}
