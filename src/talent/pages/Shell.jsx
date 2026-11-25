import React, { useEffect, useState } from 'react'
import { Icon, Avatar, Empty } from '../components/ui.jsx'
import { useNavigate } from '../lib/router.jsx'
import { useStore } from '../services/store.js'
import { ROLES } from './menus.js'
import { menuState, talentPhase, overrideOf, KARIER } from '../services/talentAccess.js'
import { ME, setMe } from '../services/session.js'
import { Logo } from '../components/Logo.jsx'
import * as Talent from './talent.jsx'
import * as T2 from './talent2.jsx'
import { RekapT } from './rekap.jsx'
import { NetBanner } from '../components/OfflineAbsen.jsx'
import { absenSync } from '../../services/absenSync.js'
import { useOutbox } from '../../services/outbox.js'
import { Modal, Btn } from '../components/ui.jsx'

export const PAGES = {
  beranda: Talent.Beranda, absensi: Talent.AbsensiT, rekap: RekapT, cuti: T2.CutiT, lembur: T2.LemburT, reimbursement: T2.ReimburseT, payslip: T2.PayslipT, lowongan: T2.LowonganT, jadwal: T2.JadwalT, pretest: T2.PretestT, kontrak: T2.KontrakT, biodata: T2.BiodataT, inventaris: T2.InventarisT, resign: T2.ResignT, inbox: T2.InboxT,
  event: T2.EventT, karyawan: T2.KaryawanT, feedback: T2.FeedbackT, review: T2.ReviewT, akun: T2.AkunT,
}

// Kerangka aplikasi Talent: sidebar (desktop) / drawer + bottom nav (HP). Rute: #/app/talent/<menu>/<sub>
export default function Shell({ page, sub }) {
  const role = 'talent'
  const nav = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const st = useStore()
  const R0 = ROLES.talent
  // Nama di sidebar mengikuti akun talent yang login (karyawan atau kandidat)
  const R = { ...R0, who: (st.employees.find((e) => e.id === ME) || st.pool.find((p) => p.id === ME))?.name || R0.who }
  // Menu mengikuti fase kontrak & pengaturan akses talent (menu tersembunyi juga tidak bisa dibuka lewat URL)
  const menu = R.menu.map((g) => ({ ...g, items: g.items.filter(([k]) => menuState(st, ME, k) !== 'sembunyi') })).filter((g) => g.items.length)
  const flat = menu.flatMap((g) => g.items)
  // Menu karier yang disembunyikan tetap bisa dibuka lewat tautan langsung, tapi isinya halaman penjelas (Kamu sedang bekerja)
  const current = page && (flat.some(([k]) => k === page) || KARIER.some(([k]) => k === page)) ? page : flat[0]?.[0]
  const go = (k) => { setDrawer(false); nav(`/app/${role}/${k}`) }
  const Page = PAGES[current]
  const label = flat.find(([k]) => k === current)?.[1] || ''
  const bottom = flat.slice(0, 4)
  const unread = st.inbox.some((n) => n.to === 'talent' && (!n.emp || n.emp === ME) && !n.read)
  // Mulai mesin absen offline (muat antrean dari HP, kirim yang tertunda)
  useEffect(() => { absenSync.start(ME) }, [ME])
  const ob = useOutbox(); const tertunda = ob.filter((r) => r.emp === ME && r.status !== 'sent').length
  const [warnOut, setWarnOut] = useState(false)
  const keluar = (force) => { if (tertunda && force !== true) return setWarnOut(true); setMe(null); nav(window.KIRANA_APP ? '/' : '/talent') }

  return (
    <div className="shell">
      <aside className={`side ${drawer ? 'open' : ''}`} aria-label="Navigasi utama">
        <div className="side-top">
          <a href="#/app/talent/beranda" className="brand"><Logo /></a>
          <button className="icon-btn only-m" onClick={() => setDrawer(false)} aria-label="Tutup menu"><Icon name="x" /></button>
        </div>
        <div className="side-role"><Avatar name={R.who} size={38} /><div><strong>{R.who}</strong><small>{R.label}</small></div></div>
        <nav className="side-nav">
          {menu.map((g) => (
            <div key={g.group} className="side-g">
              <span className="side-gl">{g.group}</span>
              {g.items.map(([k, l, ic]) => (
                <button key={k} className={`side-i ${current === k ? 'on' : ''}`} onClick={() => go(k)} aria-current={current === k ? 'page' : undefined}>
                  <Icon name={ic} size={19} />{l}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button className="side-i out" onClick={() => keluar()}><Icon name="logout" size={19} />Keluar</button>
        {!window.KIRANA_APP && <button className="side-i out ganti" onClick={() => nav('/login')}><Icon name="users" size={19} />Ganti peran (demo)</button>}
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn only-m" onClick={() => setDrawer(true)} aria-label="Buka menu"><Icon name="menu" /></button>
          <span className="top-title">{label}</span>
          <span className="role-chip">{R.label}</span>
          <div className="bell-wrap">
            <button className="icon-btn" aria-label="Notifikasi" onClick={() => go('inbox')}><Icon name="bell" />{unread && <span className="dotn" />}</button>
          </div>
        </header>
        <main className="content">
          {KARIER.some(([k]) => k === current) && talentPhase(st, ME) === 'aktif' && overrideOf(st, ME, current) === 'buka' && <div className="ov-note" role="note"><Icon name="check" size={16} />Menu ini dibuka khusus oleh HR untukmu{st.talentOverride[ME].sampai ? ` sampai ${st.talentOverride[ME].sampai.split('-').reverse().join('/')}` : ''}{st.talentOverride[ME].alasan ? ` · ${st.talentOverride[ME].alasan}` : ''}</div>}
          <NetBanner go={go} />
          {Page ? <Page role={role} sub={sub} go={go} /> : <Empty text="Menu ini belum tersedia untuk akunmu." />}
          <Modal open={warnOut} title="Masih ada absen belum terkirim" onClose={() => setWarnOut(false)} footer={<><Btn kind="ghost" onClick={() => setWarnOut(false)}>Tetap masuk</Btn><Btn onClick={() => { setWarnOut(false); keluar(true) }}>Keluar saja</Btn></>}>
            <p style={{ margin: 0 }}>{tertunda} absen masih tersimpan di HP ini. Antrean tetap aman dan akan terkirim saat kamu login lagi di HP yang sama, tapi sebaiknya tunggu sampai terkirim dulu.</p>
          </Modal>
        </main>
        <nav className="bottom-nav" aria-label="Navigasi cepat">
          {bottom.map(([k, l, ic]) => (
            <button key={k} className={current === k ? 'on' : ''} onClick={() => go(k)}><Icon name={ic} size={22} /><span>{l.split(' ')[0]}</span></button>
          ))}
          <button onClick={() => setDrawer(true)}><Icon name="menu" size={22} /><span>Menu</span></button>
        </nav>
      </div>
    </div>
  )
}
