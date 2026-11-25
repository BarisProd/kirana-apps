import React, { useState } from 'react'
import { Icon, Avatar, Empty, PermCtx } from '../components/ui.jsx'
import { useNavigate } from '../lib/router.jsx'
import { useStore, api, ScopeCtx } from '../services/store.js'
import { ROLES, SUPER_ONLY, ACTIONS, capsOf, canDo, BRANCH_RO } from './menus.js'
import { Logo } from './Landing.jsx'
import * as Admin from './admin.jsx'
import * as Branch from './branch.jsx'
import * as Talent from './talent.jsx'
import * as Mitra from './mitra.jsx'
import * as A2 from './admin2.jsx'
import * as A3 from './admin3.jsx'
import * as A5 from './admin5.jsx'
import * as Jobs from './jobs.jsx'
import { EventAdmin } from './event.jsx'
import { Penilaian } from './penilaian.jsx'
import { PretestAdmin, PretestTalent } from './pretest.jsx'
import * as Vd from './vendors.jsx'
import * as Root from './root.jsx'
import * as Au from './audit.jsx'
import * as Ab from './absensi2.jsx'
import { AksesTalent } from './aksesTalent.jsx'
import { RootMitra } from './rootMitra.jsx'
import { NotifBell } from './notifBell.jsx'
import { AuditAset } from './assets.jsx'
const AuditAsetPage = ({ sub, go }) => <AuditAset go={go} tab={sub} />

const PAGES = {
  root: { dashboard: Root.RootDashboard, mitra: RootMitra, customer: Root.Customers, 'data-customer': Root.CustomerData, 'log-aktivitas': Au.AuditLog, 'audit-log': Au.AuditLog, 'access-review': Au.AccessReview, pam: Au.PAM, kepatuhan: Au.Compliance, storage: Root.Storage, 'pihak-ketiga': Vd.Vendors, 'reset-password': Root.ResetPassword, profile: Root.RootProfile },
  admin: {
    'review-akses': Au.ReviewAkses, 'audit-aset': AuditAsetPage, 'dashboard-absensi': Ab.AbsensiDashboard, 'potongan-absensi': Ab.PotonganAbsensi,
    dashboard: Admin.Dashboard, blast: A2.Blast, event: EventAdmin, 'approval-lowongan': Jobs.ApprovalJob, 'talent-pool': Admin.TalentPool, pretest: PretestAdmin, penilaian: Penilaian, mitra: A2.MitraAdmin,
    'approval-remunerasi': Admin.ApprovalRemun, 'send-document': A5.SendDocument, disbursement: Admin.Disbursement, 'payslip-admin': A2.PayslipAdmin,
    'data-karyawan': A2.DataKaryawan, absensi: A3.Absensi, cuti: A3.CutiAdmin, lembur: A3.LemburAdmin, reimbursement: A3.ReimburseAdmin, inventaris: A3.Inventaris, resign: A3.ResignAdmin,
    'admin-izin': A2.AdminIzin, 'setup-lowongan': A2.SetupLowongan, 'akun-branch': Admin.AkunBranch, 'setup-remunerasi': Admin.SetupRemun, 'setup-aktivitas': Admin.SetupAktivitas, 'akses-talent': AksesTalent, 'setup-dokumen': A5.SetupDokumen,
  },
  branch: { dashboard: Branch.Dashboard, lowongan: Branch.Lowongan, seleksi: Branch.Seleksi, 'talent-pool': Branch.TalentPoolBranch, 'data-karyawan': Branch.DataKaryawanBranch, remunerasi: Branch.Remunerasi, payslip: Branch.PayslipBranch,
    absensi: A3.Absensi, 'dashboard-absensi': Ab.AbsensiDashboard, cuti: A3.CutiAdmin, lembur: A3.LemburAdmin, reimbursement: A3.ReimburseAdmin, inventaris: A3.Inventaris, 'audit-aset': AuditAsetPage, resign: A3.ResignAdmin },
  talent: { beranda: Talent.Beranda, absensi: Talent.AbsensiT, cuti: Talent.CutiT, lembur: Talent.LemburT, reimbursement: Talent.ReimburseT, payslip: Talent.PayslipT, lowongan: Talent.LowonganT, jadwal: Talent.JadwalT, pretest: PretestTalent, kontrak: Talent.KontrakT, biodata: Talent.BiodataT, inventaris: Talent.InventarisT, resign: Talent.ResignT, inbox: Talent.InboxT },
  mitra: { dashboard: Mitra.Dashboard, lowongan: Mitra.Lowongan, talent: Mitra.TalentMitra, kerjasama: Mitra.KerjaSama, inbox: Mitra.InboxMitra, klien: Mitra.Klien, profil: Mitra.Profil },
}

export default function Shell({ role, page, sub }) {
  const nav = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const admins = useStore((s) => s.admins)
  const branches = useStore((s) => s.branches); const myBr = useStore((s) => s.myBranch) || 'b1'
  const mitras = useStore((s) => s.mitras); const myM = useStore((s) => s.myMitra) || 'm1'
  const R = ROLES[role] || ROLES.superadmin
  const isAdmin = role === 'superadmin' || role === 'admin'
  const me = role === 'admin' ? admins[0] : null

  const allowed = (k) => role === 'superadmin' ? true : role === 'admin' ? !SUPER_ONLY.includes(k) && me.perms.includes(k) : true
  const menu = R.menu.map((g) => ({ ...g, items: g.items.filter(([k]) => allowed(k)) })).filter((g) => g.items.length)
  const flat = menu.flatMap((g) => g.items)
  const current = page && flat.some(([k]) => k === page) ? page : flat[0]?.[0]
  const go = (k) => { setDrawer(false); nav(`/app/${role}/${k}`) }

  const table = PAGES[isAdmin ? 'admin' : role] || {}
  const Page = table[current]
  const label = flat.find(([k]) => k === current)?.[1] || ''
  const bottom = flat.slice(0, 4)
  const perm = role === 'admin' ? { label, can: (a) => canDo(me, current, a) } : null

  return (
    <div className="shell">
      <aside className={`side ${drawer ? 'open' : ''}`} aria-label="Navigasi utama">
        <div className="side-top">
          <a href="#/" className="brand"><Logo /></a>
          <button className="icon-btn only-m" onClick={() => setDrawer(false)} aria-label="Tutup menu"><Icon name="x" /></button>
        </div>
        {(() => { const who = role === 'branch' ? branches.find((b) => b.id === myBr)?.name || R.who : role === 'mitra' ? mitras.find((m) => m.id === myM)?.name || R.who : R.who; return <div className="side-role"><Avatar name={who} size={38} /><div><strong>{who}</strong><small>{R.label}</small></div></div> })()}
        {role === 'mitra' && <label className="br-switch"><span>Masuk sebagai Mitra</span><select value={myM} onChange={(e) => { api.setMyMitra(e.target.value); setDrawer(false) }}>{mitras.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
        {role === 'branch' && <label className="br-switch"><span>Masuk sebagai Branch</span><select value={myBr} onChange={(e) => { api.setMyBranch(e.target.value); setDrawer(false) }}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.kota}</option>)}</select></label>}
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
        <button className="side-i out" onClick={() => nav('/login')}><Icon name="logout" size={19} />Ganti peran</button>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn only-m" onClick={() => setDrawer(true)} aria-label="Buka menu"><Icon name="menu" /></button>
          <span className="top-title">{label}</span>
          <span className="role-chip">{R.label}{role === 'admin' && <> · {me.branches.length} Branch</>}{role === 'superadmin' && <> · {R.org}</>}</span>
          <NotifBell role={role} go={go} />
        </header>
        <main className="content">
          {role === 'superadmin' && current !== 'review-akses' && <Au.ReviewReminder go={go} />}
          {Page ? (role === 'admin' ? (
            <PermCtx.Provider value={perm}>
              <div className={['c', 'u', 'd'].filter((x) => !perm.can(x)).map((x) => 'no-' + x).join(' ')}>
                <div className="acc-bar" role="note"><Icon name="lock" size={16} />Aksesmu di {label}: <b>{ACTIONS.filter(([a]) => perm.can(a) && (a === 'r' || capsOf(current).includes(a))).map(([, l]) => l).join(' · ')}</b></div>
                <Page role={role} sub={sub} go={go} me={me} />
              </div>
            </PermCtx.Provider>) : role === 'branch' && BRANCH_RO.includes(current) ? (
            <ScopeCtx.Provider value={myBr}><PermCtx.Provider value={{ label, can: (a) => a === 'r' }}>
              <div className="no-c no-u no-d ro-view">
                <div className="acc-bar ro-bar" role="note"><Icon name="eye" size={16} />Mode lihat saja · {label} {branches.find((b) => b.id === myBr)?.name}. Tambah, ubah & hapus dilakukan oleh Superadmin/Admin.</div>
                <Page key={myBr} role="branch" sub={sub} go={(k) => { const b = k.split('/')[0]; if (BRANCH_RO.includes(b) || ['data-karyawan', 'dashboard'].includes(b)) go(k) }} me={null} />
              </div>
            </PermCtx.Provider></ScopeCtx.Provider>
          ) : <Page key={role === 'branch' ? myBr : role === 'mitra' ? myM : role} role={role} sub={sub} go={go} me={me} />) : <Empty text="Menu ini belum diizinkan untuk akunmu." />}
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
