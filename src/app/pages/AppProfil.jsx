// Profil: identitas, menu sekunder (yang jarang dipakai dipindah ke sini), pengaturan perangkat, dan Keluar.
// Resign sengaja diletakkan di bawah & tidak ditonjolkan.
import React, { useEffect, useState } from 'react'
import { useStore } from '../../services/store.js'
import { ME, setMe } from '../../talent/services/session.js'
import { Icon, Avatar, Modal, Btn, Toggle } from '../../talent/components/ui.jsx'
import { menuState } from '../../talent/services/talentAccess.js'
import { useNavigate } from '../../lib/router.jsx'
import { useOutbox } from '../../services/outbox.js'
import { reminderSupported, planReminders } from '../../services/reminders.js'
import { bioSupported, bioAvailable } from '../../services/biometric.js'
import { useInstall, promptInstall } from '../../services/pwa.js'
import { usePrefs, setPrefs, isNative } from '../appState.js'
import { fmtDate } from '../../talent/pages/shared.jsx'

const VERSION = '1.2.3'
const Row = ({ ic, label, value, onClick, danger, badge }) => (
  <button type="button" className={`pf-row ${danger ? 'danger' : ''}`} onClick={onClick}>
    <span className="pf-ic"><Icon name={ic} size={19} /></span><span className="grow">{label}</span>
    {badge > 0 && <span className="app-badge inline">{badge}</span>}{value && <span className="pf-val">{value}</span>}<Icon name="chevron" size={18} />
  </button>
)

export function AppProfil({ go }) {
  const s = useStore(); const nav = useNavigate(); const prefs = usePrefs(); const install = useInstall()
  const me = s.employees.find((e) => e.id === ME) || s.pool.find((p) => p.id === ME) || {}
  const br = s.branches.find((b) => b.id === me.branch)?.name
  const ob = useOutbox().filter((r) => r.emp === ME && r.status !== 'sent').length
  const [out, setOut] = useState(false); const [bio, setBio] = useState(null)
  useEffect(() => { bioAvailable().then((r) => setBio(r.ok)) }, [])
  const show = (k) => menuState(s, ME, k) !== 'sembunyi'
  const unread = s.inbox.filter((n) => n.to === 'talent' && (!n.emp || n.emp === ME) && !n.read).length
  const plan = planReminders(s, me, { ...prefs, pengingat: true }, {})[0]
  const keluar = () => { setMe(null); nav('/') }
  const karier = [['lowongan', 'Lowongan & Tawaran', 'briefcase'], ['jadwal', 'Jadwal Wawancara', 'calendar'], ['pretest', 'Pre-test', 'test']].filter(([k]) => show(k))
  return (
    <div className="pf">
      <section className="pf-card">
        <Avatar name={me.name || 'Karyawan'} size={64} />
        <div className="grow"><h2>{me.name}</h2><p>{me.role || 'Karyawan'}{br ? ` · ${br}` : ''}</p>{me.end && <small>Kontrak s.d. {fmtDate(me.end)}</small>}</div>
        <button type="button" className="icon-btn" aria-label="Biodata & berkas" onClick={() => go('biodata')}><Icon name="edit" size={20} /></button>
      </section>

      <h3 className="pf-h">Pekerjaan</h3>
      <div className="pf-list">
        <Row ic="chart" label="Rekap Saya" onClick={() => go('rekap')} />
        {show('kontrak') && <Row ic="doc" label="Kontrak" onClick={() => go('kontrak')} />}
        {show('inventaris') && <Row ic="box" label="Inventaris" onClick={() => go('inventaris')} />}
        {show('event') && <Row ic="megaphone" label="Event" onClick={() => go('event')} />}
        {show('karyawan') && <Row ic="users" label="Rekan kerja" onClick={() => go('karyawan')} />}
        <Row ic="inbox" label="Inbox" badge={unread} onClick={() => go('inbox')} />
      </div>
      {karier.length > 0 && <><h3 className="pf-h">Karier</h3><div className="pf-list">{karier.map(([k, l, ic]) => <Row key={k} ic={ic} label={l} onClick={() => go(k)} />)}</div></>}

      <h3 className="pf-h">Pengaturan aplikasi</h3>
      <div className="pf-list">
        <div className="pf-set">
          <span className="pf-ic"><Icon name="bellRing" size={19} /></span>
          <div className="grow"><b>Pengingat absen</b><small>{reminderSupported() ? (prefs.pengingat && plan ? `Berikutnya ${plan.at.toLocaleDateString('id-ID', { weekday: 'short' })} ${plan.at.toTimeString().slice(0, 5).replace(':', '.')}` : 'Notifikasi sebelum shift & saat jam pulang') : 'Tersedia di aplikasi Android'}</small></div>
          <Toggle on={prefs.pengingat && reminderSupported()} onChange={() => reminderSupported() && setPrefs({ pengingat: !prefs.pengingat })} label="" />
        </div>
        {prefs.pengingat && reminderSupported() && <div className="pf-sub">
          <label className="fsel"><span>Ingatkan masuk</span><select value={prefs.menitSebelum} onChange={(e) => setPrefs({ menitSebelum: Number(e.target.value) })}>{[5, 10, 15, 30].map((n) => <option key={n} value={n}>{n} menit sebelum shift</option>)}</select></label>
          <label className="chk-l"><input type="checkbox" className="chk" checked={prefs.pengingatPulang} onChange={(e) => setPrefs({ pengingatPulang: e.target.checked })} />Ingatkan absen pulang</label>
        </div>}
        <div className="pf-set">
          <span className="pf-ic"><Icon name="fingerprint" size={19} /></span>
          <div className="grow"><b>Buka payslip dengan sidik jari</b><small>{bioSupported() ? (bio === false ? 'Atur sidik jari/PIN di pengaturan HP dulu' : 'Sidik jari, wajah, atau PIN HP') : 'Tersedia di aplikasi Android'}</small></div>
          <Toggle on={prefs.kunciBio && bioSupported() && bio !== false} onChange={() => bioSupported() && setPrefs({ kunciBio: !prefs.kunciBio })} label="" />
        </div>
        <Row ic="shield" label="Izin aplikasi" value="Kamera, lokasi, notifikasi" onClick={() => setPrefs({ onboarded: false })} />
        {install && <Row ic="smartphone" label="Pasang aplikasi di layar utama" value={install === 'ios' ? 'Bagikan › Tambah ke Layar Utama' : ''} onClick={() => install === 'prompt' && promptInstall()} />}
        <Row ic="settings" label="Akun & keamanan" onClick={() => go('akun')} />
      </div>

      <h3 className="pf-h">Bantuan</h3>
      <div className="pf-list">
        {show('feedback') && <Row ic="mail" label="Kirim masukan" onClick={() => go('feedback')} />}
        {show('review') && <Row ic="layers" label="Reviews & More" onClick={() => go('review')} />}
        {show('resign') && <Row ic="door" label="Resign" onClick={() => go('resign')} />}
      </div>

      <button type="button" className="pf-out" onClick={() => setOut(true)}><Icon name="logout" size={19} />Keluar</button>
      <p className="pf-ver">Kirana Karyawan v{VERSION} · {isNative() ? 'Android' : 'Web'} · prototipe</p>

      <Modal open={out} title={ob ? 'Masih ada absen belum terkirim' : 'Keluar dari Kirana?'} onClose={() => setOut(false)} footer={<><Btn kind="ghost" onClick={() => setOut(false)}>Batal</Btn><Btn kind={ob ? 'danger' : 'primary'} onClick={keluar}>Keluar</Btn></>}>
        <p style={{ margin: 0 }}>{ob ? `${ob} absen masih tersimpan di HP ini. Antrean tetap aman dan terkirim saat kamu login lagi di HP yang sama, tapi sebaiknya tunggu sampai terkirim dulu.` : 'Kamu perlu masuk lagi dengan e-mail dan password untuk absen berikutnya.'}</p>
      </Modal>
    </div>
  )
}
