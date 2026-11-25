// Beranda aplikasi = layar absen. Prinsip: satu aksi utama (tombol absen) di area jempol,
// status hari ini sekilas pandang, dan hanya hal yang perlu ditindaklanjuti yang ditonjolkan.
import React, { useEffect, useState } from 'react'
import { useStore } from '../../services/store.js'
import { ME } from '../../talent/services/session.js'
import { Icon, Avatar, Btn, Modal } from '../../talent/components/ui.jsx'
import { ClockModal, SyncChip } from '../../talent/components/OfflineAbsen.jsx'
import { kerjaInfo } from '../../talent/pages/talent.jsx'
import { PAGES } from '../../talent/pages/Shell.jsx'
import { aktifCuti, fmtDate } from '../../talent/pages/shared.jsx'
import { attendanceDays } from '../../talent/services/rekap.js'
import { talentPhase } from '../../talent/services/talentAccess.js'
import { useOutbox } from '../../services/outbox.js'
import { isWorkday } from '../../services/attendance.js'
import { haptic } from '../../services/haptics.js'
import { useInstall, promptInstall } from '../../services/pwa.js'
import { usePrefs, setPrefs } from '../appState.js'

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dot = (x) => String(x || '').replace(':', '.')
const mins = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m }
const durasi = (a, b) => { const d = Math.max(0, b - a); return d < 1 ? 'kurang dari 1 menit' : d < 60 ? `${d} menit` : `${Math.floor(d / 60)} jam ${d % 60} menit` }
const durasiPendek = (a, b) => { const d = Math.max(0, b - a); return d < 60 ? `${d}m` : `${Math.floor(d / 60)}j ${d % 60}m` }
const useNow = () => { const [n, setN] = useState(new Date()); useEffect(() => { const t = setInterval(() => setN(new Date()), 1000); return () => clearInterval(t) }, []); return n }

export function AppBeranda({ go }) {
  const s0 = useStore(); const phase = talentPhase(s0, ME)
  if (phase === 'selesai' || phase === 'kandidat') { const Old = PAGES.beranda; return <Old go={go} /> }
  return <Absen go={go} s0={s0} phase={phase} />
}

function Absen({ go, s0, phase }) {
  const s = s0.clock?.emp === ME ? s0 : { ...s0, clock: { in: null, out: null } }
  const now = useNow(); const ob = useOutbox(); const [cam, setCam] = useState(null); const [done, setDone] = useState(null); const [early, setEarly] = useState(false)
  const me = s.employees.find((e) => e.id === ME) || {}; const { lok, sh } = kerjaInfo(s, me)
  const first = (me.name || 'Kamu').split(' ')[0]
  const today = iso(now); const holiday = !isWorkday(s, me.branch || 'b1', today)
  const cin = s.clock.in; const cout = s.clock.out
  const recOf = (k) => ob.find((r) => r.id === s.clock[k + 'Rec'])
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const step = cout ? 'done' : cin ? 'out' : holiday ? 'libur' : 'in'
  const sapa = now.getHours() < 11 ? 'Selamat pagi' : now.getHours() < 15 ? 'Selamat siang' : now.getHours() < 18 ? 'Selamat sore' : 'Selamat malam'
  const hint = step === 'in' ? (nowMin > mins(sh.masukSampai) ? `Lewat ${nowMin - mins(sh.masukSampai)} menit dari batas masuk ${dot(sh.masukSampai)}` : nowMin < mins(sh.masukDari) - 120 ? `Absen masuk dibuka mulai ${dot(sh.masukDari)}` : `Batas tepat waktu ${dot(sh.masukSampai)}`)
    : step === 'out' ? `${nowMin - mins(cin) < 1 ? 'Selamat bekerja! Baru saja mulai' : 'Sudah bekerja ' + durasi(mins(cin), nowMin)}${nowMin < mins(sh.pulangDari) ? ` · jam pulang ${dot(sh.pulangDari)}` : ''}`
      : step === 'done' ? `Total kerja hari ini ${durasi(mins(cin), mins(cout))}. Istirahat yang cukup ya!` : 'Hari ini libur. Kalau lembur, ajukan lewat Pengajuan › Lembur.'
  const press = () => { haptic.tap(); if (step === 'in') setCam('in'); else if (step === 'out') { if (nowMin < mins(sh.pulangDari)) setEarly(true); else setCam('out') } }

  // Hal yang perlu ditindaklanjuti (maks. 3, yang paling penting dulu)
  const mineOb = ob.filter((r) => r.emp === ME)
  const att = []
  const gagal = mineOb.filter((r) => r.status === 'failed').length
  if (gagal) att.push(['bad', 'x', `${gagal} absen gagal terkirim`, 'Lihat alasannya', 'absensi/antrean'])
  const tolak = [...s.leaves.map((x) => ['cuti', x]), ...s.overtimes.map((x) => ['lembur', x]), ...s.reimbursements.map((x) => ['reimbursement', x])].filter(([, x]) => x.emp === ME && x.status === 'Rejected')
  if (tolak.length) att.push(['bad', 'doc', `${tolak.length} pengajuan ditolak`, 'Cek catatan atasan', 'pengajuan/' + tolak[0][0]])
  const sisaKontrak = me.end ? Math.round((new Date(me.end) - new Date(today)) / 864e5) : 999
  if (sisaKontrak >= 0 && sisaKontrak <= 30) att.push(['warn', 'doc', `Kontrak berakhir ${fmtDate(me.end)}`, `${sisaKontrak} hari lagi`, 'kontrak'])
  const tunggu = [...s.leaves, ...s.overtimes, ...s.reimbursements].filter((x) => x.emp === ME && x.status === 'Waiting').length
  if (tunggu) att.push(['info', 'clock', `${tunggu} pengajuan menunggu persetujuan`, 'Pantau statusnya', 'pengajuan'])

  // Ringkasan singkat bulan ini
  const awal = `${today.slice(0, 8)}01`
  const hari = attendanceDays(s, ME, awal, today)
  const tepat = hari.filter((h) => h.status === 'Hadir').length; const dihitung = hari.filter((h) => ['Hadir', 'Terlambat', 'Tidak absen'].includes(h.status)).length
  const ct = aktifCuti(s, ME).find((l) => l.name === 'Cuti Tahunan')
  const pakai = s.leaves.filter((l) => l.emp === ME && l.jenis === 'Cuti Tahunan' && l.status !== 'Rejected').reduce((a, b) => a + b.hari, 0)
  const lembur = s.overtimes.filter((o) => o.emp === ME && o.status === 'Approved' && String(o.tanggal).slice(0, 7) === today.slice(0, 7)).reduce((a, b) => a + (Number(b.durasi) || 0), 0)
  const install = useInstall(); const prefs = usePrefs()

  return (
    <div className="ab">
      <section className="ab-hello">
        <div className="grow"><p className="ab-date">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h2>{sapa}, {first} 👋</h2></div>
        <button type="button" className="ab-ava" onClick={() => go('profil')} aria-label="Buka profil"><Avatar name={me.name || first} size={44} /></button>
      </section>
      {phase === 'resign' && <p className="ab-note">Resign-mu sudah disetujui. Absen tetap jalan sampai hari kerja terakhir.</p>}

      <section className={`ab-card ${step}`} aria-label="Absen hari ini">
        <div className="ab-clock" aria-live="off">{pad(now.getHours())}.{pad(now.getMinutes())}<small>{pad(now.getSeconds())}</small></div>
        <p className="ab-shift"><Icon name="pin" size={14} />{lok.nama} · {sh.nama} {dot(sh.masukDari)}–{dot(sh.pulangSampai || sh.pulangDari)}</p>
        <button type="button" className={`ab-btn ${step}`} onClick={press} disabled={step === 'done' || step === 'libur'} aria-describedby="ab-hint">
          <span className="ab-btn-ring" aria-hidden="true" />
          <Icon name={step === 'done' ? 'check' : step === 'libur' ? 'sun' : step === 'out' ? 'door' : 'camera'} size={34} />
          <b>{step === 'in' ? 'Absen masuk' : step === 'out' ? 'Absen pulang' : step === 'done' ? 'Selesai' : 'Hari libur'}</b>
        </button>
        <p id="ab-hint" className="ab-hint">{hint}</p>
      </section>

      <section className="ab-today" aria-label="Ringkasan hari ini">
        <div><span>Masuk</span><b className={cin && cin > sh.masukSampai ? 'late' : ''}>{cin ? dot(cin) : '--.--'}</b>{recOf('in') ? <SyncChip rec={recOf('in')} /> : <small>{cin ? (cin > sh.masukSampai ? 'Terlambat' : 'Tepat waktu') : 'Belum'}</small>}</div>
        <div><span>Pulang</span><b>{cout ? dot(cout) : '--.--'}</b>{recOf('out') ? <SyncChip rec={recOf('out')} /> : <small>{cout ? 'Tercatat' : 'Belum'}</small>}</div>
        <div><span>Durasi</span><b>{cin ? durasiPendek(mins(cin), cout ? mins(cout) : nowMin) : '–'}</b><small>{cout ? 'Selesai' : cin ? 'Berjalan' : '—'}</small></div>
      </section>

      {att.length > 0 && <section className="ab-att" aria-label="Perlu perhatian">
        {att.slice(0, 3).map(([tone, ic, t, d, to]) => <button key={t} type="button" className={`ab-att-i ${tone}`} onClick={() => go(to)}><span className="ab-att-ic"><Icon name={ic} size={18} /></span><span className="grow"><b>{t}</b><small>{d}</small></span><Icon name="chevron" size={18} /></button>)}
      </section>}

      <section className="ab-stats" aria-label="Bulan ini">
        <button type="button" onClick={() => go('pengajuan/cuti')}><b>{ct ? ct.kuota - pakai : '–'}<small> hari</small></b><span>Sisa cuti tahunan</span></button>
        <button type="button" onClick={() => go('riwayat')}><b>{dihitung ? Math.round((tepat / dihitung) * 100) : 100}<small>%</small></b><span>Tepat waktu bulan ini</span></button>
        <button type="button" onClick={() => go('pengajuan/lembur')}><b>{lembur}<small> jam</small></b><span>Lembur disetujui</span></button>
      </section>

      {s.blasts.length > 0 && <section className="ab-ann">
        <div className="ab-sec-h"><h3>Pengumuman</h3><button type="button" className="lnk" onClick={() => go('inbox')}>Lihat semua</button></div>
        {s.blasts.slice(0, 2).map((b) => <div key={b.judul} className="ab-ann-i"><span className="ab-att-ic"><Icon name="megaphone" size={18} /></span><div><b>{b.judul}</b><small>{fmtDate(b.tanggal)}</small></div></div>)}
      </section>}

      {install && !prefs.sembunyiInstal && <section className="ab-install">
        <Icon name="smartphone" size={22} /><div className="grow"><b>Pasang Kirana di layar utama</b><small>{install === 'ios' ? 'Ketuk Bagikan, lalu “Tambah ke Layar Utama”.' : 'Lebih cepat dibuka & tetap jalan saat sinyal lemah.'}</small></div>
        {install === 'prompt' && <Btn onClick={() => promptInstall()}>Pasang</Btn>}
        <button type="button" className="icon-btn" aria-label="Sembunyikan" onClick={() => setPrefs({ sembunyiInstal: true })}><Icon name="x" size={18} /></button>
      </section>}

      {cam && <ClockModal kind={cam} me={me} onClose={() => setCam(null)} onDone={(rec) => { setCam(null); haptic.success(); setDone(rec) }} />}
      <Modal open={early} title="Belum jam pulang" onClose={() => setEarly(false)} footer={<><Btn kind="ghost" onClick={() => setEarly(false)}>Nanti saja</Btn><Btn onClick={() => { setEarly(false); setCam('out') }}>Tetap absen pulang</Btn></>}>
        <p style={{ margin: 0 }}>Jam pulang {sh.nama} mulai <b>{dot(sh.pulangDari)}</b>. Absen pulang sekarang akan tercatat pulang lebih awal. Absen pulang hanya bisa sekali per hari.</p>
      </Modal>
      {done && <Success rec={done} onClose={() => setDone(null)} />}
    </div>
  )
}

// Layar sukses penuh: jelas, cepat hilang sendiri, dan jujur soal status kirim
function Success({ rec, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4200); return () => clearTimeout(t) }, [])
  const masuk = rec.jenis === 'in'
  return (
    <div className={`ab-success ${rec.offline ? 'off' : ''}`} role="alertdialog" aria-live="assertive" aria-label="Absen berhasil" onClick={onClose}>
      <div className="ab-stamp"><span className="ab-stamp-c"><Icon name={rec.offline ? 'smartphone' : 'check'} size={54} /></span></div>
      <h2>{rec.offline ? `Absen ${masuk ? 'masuk' : 'pulang'} tersimpan di HP` : `Absen ${masuk ? 'masuk' : 'pulang'} tercatat`}</h2>
      <div className="ab-s-time">{dot(rec.jam)}</div>
      <p>{rec.kantor ? `${rec.kantor.nama} · ${rec.mode}` : rec.mode}{rec.kesehatan ? ` · ${rec.kesehatan}` : ''}</p>
      <p className="ab-s-sub">{rec.offline ? 'Belum ada sinyal. Absenmu aman dan akan terkirim otomatis.' : masuk ? 'Selamat bekerja! 💪' : 'Terima kasih untuk hari ini! 🌙'}</p>
      <button type="button" className="ab-s-ok">Oke</button>
    </div>
  )
}
