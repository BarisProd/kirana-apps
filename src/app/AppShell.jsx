// Kerangka aplikasi karyawan (APK & PWA): top bar (kembali · judul · status sinyal · notifikasi) + bottom nav 5 tab.
// Halaman lama Talent dipakai ulang (form, validasi, aturan sama dengan web); judulnya otomatis pindah ke top bar.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from '../lib/router.jsx'
import { useStore } from '../services/store.js'
import { ME } from '../talent/services/session.js'
import { Icon, Empty, useToast } from '../talent/components/ui.jsx'
import { PAGES } from '../talent/pages/Shell.jsx'
import { menuState, KARIER, talentPhase } from '../talent/services/talentAccess.js'
import { NetBanner } from '../talent/components/OfflineAbsen.jsx'
import { absenSync } from '../services/absenSync.js'
import { useOutbox } from '../services/outbox.js'
import { useNet } from '../services/net.js'
import { scheduleReminders, listenReminderTap } from '../services/reminders.js'
import { haptic } from '../services/haptics.js'
import { useAppTitle, setAppTitle, getPrefs, usePrefs } from './appState.js'
import { useUpdate, applyUpdate } from '../services/pwa.js'
import { AppBeranda } from './pages/AppBeranda.jsx'
import { AppRiwayat } from './pages/AppRiwayat.jsx'
import { AppPengajuan } from './pages/AppPengajuan.jsx'
import { AppProfil } from './pages/AppProfil.jsx'
import { AppPayslip } from './pages/AppPayslip.jsx'
import { Onboarding } from './Onboarding.jsx'
import LOGO from '../assets/logo-wordmark.png'

const TABS = [['beranda', 'Beranda', 'home'], ['riwayat', 'Riwayat', 'clock'], ['pengajuan', 'Pengajuan', 'doc'], ['payslip', 'Payslip', 'wallet'], ['profil', 'Profil', 'user']]
const TAB_OF = { cuti: 'pengajuan', lembur: 'pengajuan', reimbursement: 'pengajuan', absensi: 'riwayat', rekap: 'riwayat' }
const LABEL = { beranda: 'Beranda', riwayat: 'Riwayat absen', pengajuan: 'Pengajuan', payslip: 'Payslip', profil: 'Profil', absensi: 'Absensi', rekap: 'Rekap Saya', kontrak: 'Kontrak', biodata: 'Biodata & Berkas', inventaris: 'Inventaris', resign: 'Resign', inbox: 'Inbox', event: 'Event', karyawan: 'Rekan kerja', feedback: 'Feedback', review: 'Reviews & More', akun: 'Akun & keamanan', lowongan: 'Lowongan & Tawaran', jadwal: 'Jadwal Wawancara', pretest: 'Pre-test' }
const OWN = { beranda: AppBeranda, riwayat: AppRiwayat, pengajuan: AppPengajuan, profil: AppProfil, payslip: AppPayslip }

function SyncPill({ go }) {
  const { online } = useNet(); const ob = useOutbox().filter((r) => r.emp === ME && r.status !== 'sent')
  const sending = ob.some((r) => r.status === 'sending')
  if (online && !ob.length) return <span className="sync-pill ok" aria-label="Online"><i />Online</span>
  return (
    <button type="button" className={`sync-pill ${online ? 'busy' : 'off'}`} onClick={() => go('absensi/antrean')} aria-label={online ? `Mengirim ${ob.length} absen` : `Offline, ${ob.length} absen menunggu`}>
      <Icon name={online ? 'refresh' : 'wifiOff'} size={14} />{online ? (sending ? 'Mengirim' : `${ob.length} antre`) : ob.length ? `Offline · ${ob.length}` : 'Offline'}
    </button>
  )
}

export default function AppShell({ page, sub }) {
  const nav = useNavigate(); const st = useStore(); const prefs = usePrefs(); const [t, toast] = useToast()
  const me = st.employees.find((e) => e.id === ME) || st.pool.find((p) => p.id === ME) || {}
  const phase = talentPhase(st, ME)
  const key = page || 'beranda'
  // akses mengikuti fase kontrak & Akses Talent (menu karier tersembunyi → halaman penjelas)
  const hidden = !OWN[key] && key !== 'absensi' && menuState(st, ME, key) === 'sembunyi' && !KARIER.some(([k]) => k === key)
  const Page = OWN[key] || (!hidden && PAGES[key])
  const tab = OWN[key] && TABS.some(([k]) => k === key) ? key : TAB_OF[key] || 'profil'
  const isRoot = TABS.some(([k]) => k === key) && (!sub || key === 'pengajuan')
  // rute lama → tab aplikasi (mis. setelah submit form cuti kembali ke Pengajuan › Cuti)
  const ALIAS = { cuti: 'pengajuan/cuti', lembur: 'pengajuan/lembur', reimbursement: 'pengajuan/reimbursement', absensi: 'riwayat' }
  const go = (k) => nav(`/app/talent/${ALIAS[k] || k}`)
  const title = useAppTitle()
  const unread = st.inbox.filter((n) => n.to === 'talent' && (!n.emp || n.emp === ME) && !n.read).length
  const main = useRef(null); const update = useUpdate()

  // judul default per halaman; PageHead/ArtHead di halaman menimpa lewat window.__kiranaSetTitle
  useLayoutEffect(() => { window.__kiranaSetTitle = setAppTitle; window.__kiranaGo = go; setAppTitle(LABEL[key] || ''); main.current?.scrollTo?.(0, 0) }, [key, sub])
  useEffect(() => { if (key === 'absensi' && !sub) nav('/app/talent/riwayat') }, [key, sub])
  // mesin absen offline + pengingat terjadwal
  useEffect(() => { absenSync.start(ME); listenReminderTap() }, [ME])
  useEffect(() => { if (me.id) scheduleReminders(st, me, getPrefs(), st.clock?.emp === ME ? st.clock : {}) }, [ME, st.clock?.in, st.clock?.out, prefs.pengingat, prefs.menitSebelum, prefs.pengingatPulang])
  // kunci payslip lagi bila aplikasi ditinggal > 5 menit
  useEffect(() => {
    let away = 0
    const on = () => { if (document.hidden) away = Date.now(); else if (away && Date.now() - away > 300000) window.__kiranaSlip = false }
    document.addEventListener('visibilitychange', on); return () => document.removeEventListener('visibilitychange', on)
  }, [])

  // Tarik ke bawah untuk menyegarkan (kirim antrean + cocokkan jam)
  const [pull, setPull] = useState(0); const startY = useRef(null)
  const onStart = (e) => { startY.current = main.current?.scrollTop <= 0 ? e.touches[0].clientY : null }
  const onMove = (e) => { if (startY.current == null) return; const d = e.touches[0].clientY - startY.current; setPull(d > 0 ? Math.min(90, d * 0.5) : 0) }
  const onEnd = async () => {
    if (pull >= 60) { setPull(60); haptic.tap(); await absenSync.syncTime(); await absenSync.retryNow(); toast('Data diperbarui') }
    setPull(0); startY.current = null
  }
  const back = () => { if (window.history.length > 1) window.history.back(); else go(tab) }

  return (
    <div className={`app-shell phase-${phase} ${sub === 'ajukan' ? 'form-mode' : ''}`}>
      <header className="app-bar">
        {isRoot ? (key === 'beranda' ? <span className="app-bar-l"><img src={LOGO} alt="Kirana" className="app-logo" /></span> : <span className="app-bar-sp" />)
          : <button type="button" className="app-back" onClick={back} aria-label="Kembali"><Icon name="back" size={22} /></button>}
        <h1 className="app-title">{key === 'beranda' && !sub ? '' : (title || LABEL[key])}</h1>
        <SyncPill go={go} />
        <button type="button" className="app-bell" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`} onClick={() => go('inbox')}><Icon name="bell" size={22} />{unread > 0 && <span className="app-badge">{unread > 9 ? '9+' : unread}</span>}</button>
      </header>
      <main ref={main} className={`app-main page-${key}`} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
        <div className="app-pull" style={{ height: pull }} aria-hidden={!pull}>{pull > 0 && <span className={pull >= 60 ? 'ready' : ''}><Icon name="refresh" size={18} />{pull >= 60 ? 'Lepas untuk menyegarkan' : 'Tarik untuk menyegarkan'}</span>}</div>
        <div className="app-content">
          {update && <div className="app-update" role="status"><Icon name="refresh" size={18} /><span className="grow">Versi baru Kirana sudah siap.</span><button type="button" className="lnk" onClick={applyUpdate}>Muat ulang</button></div>}
          <NetBanner go={go} onlyFailed />
          {Page ? <Page sub={sub} go={go} toast={toast} /> : <Empty text="Menu ini belum tersedia untuk akunmu." />}
        </div>
      </main>
      <nav className="app-tabs" aria-label="Navigasi utama">
        {TABS.map(([k, l, ic]) => {
          const badge = k === 'pengajuan' ? [...st.leaves, ...st.overtimes, ...st.reimbursements].filter((x) => x.emp === ME && x.status === 'Waiting').length : 0
          return <button key={k} type="button" className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => { haptic.tap(); go(k) }}>
            <span className="app-tab-ic"><Icon name={ic} size={22} />{badge > 0 && <span className="app-dot" aria-label={`${badge} menunggu`} />}</span><span>{l}</span></button>
        })}
      </nav>
      {!prefs.onboarded && me.id && <Onboarding me={me} onDone={() => go('beranda')} />}
      {t}
    </div>
  )
}
