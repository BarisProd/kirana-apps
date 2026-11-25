// Lonceng notifikasi (semua role kecuali Talent yang punya aplikasi sendiri).
// Mitra: notifikasi dari Superadmin. Superadmin/Admin: to 'admin'. Root: to 'root'. Branch: to 'branch' sesuai Branch aktif.
import React, { useEffect, useRef, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { Icon } from '../components/ui.jsx'

export function NotifBell({ role, go }) {
  const s = useStore(); const [open, setOpen] = useState(false); const [jn, setJn] = useState(''); const ref = useRef(null)
  const myM = s.myMitra || 'm1'; const myB = s.myBranch || 'b1'
  const mine = (n) => role === 'mitra' ? n.to === 'mitra' && n.mitra === myM : role === 'root' ? n.to === 'root' : role === 'branch' ? n.to === 'branch' && (!n.branch || n.branch === myB) : ['superadmin', 'admin'].includes(role) ? n.to === 'admin' : false
  const list = s.inbox.filter(mine).sort((a, b) => (b.waktu || '').localeCompare(a.waktu || ''))
  const unread = list.filter((n) => !n.read).length
  const JN = [['', 'Semua'], ['Blast', 'Blast'], ['Superadmin', 'Superadmin'], ['Aktivitas', 'Aktivitas talent']]
  const shown = role === 'mitra' && jn ? list.filter((n) => (n.jenis || 'Superadmin') === jn) : list
  const IC = { Blast: 'megaphone', Superadmin: 'lock', Aktivitas: 'users' }
  useEffect(() => { if (!open) return; const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }; const k = (e) => e.key === 'Escape' && setOpen(false); document.addEventListener('mousedown', f); document.addEventListener('keydown', k); return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k) } }, [open])
  const pick = (n) => { api.readNotif(n.id); setOpen(false); if (n.link) go(n.link) }
  return (
    <div className="nb" ref={ref}>
      <button className="icon-btn" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="bell" />{unread > 0 && <span className="nb-n">{unread}</span>}</button>
      {open && <div className="nb-pop" role="dialog" aria-label="Notifikasi">
        <div className="nb-h"><b>Notifikasi</b>{unread > 0 && <button className="linkish sm" onClick={() => api.readAllNotif((n) => mine(n) && (role !== 'mitra' || !jn || (n.jenis || 'Superadmin') === jn))}>Tandai semua dibaca</button>}</div>
        {role === 'mitra' && <div className="nb-tabs" role="tablist">{JN.map(([k, l]) => { const un = list.filter((n) => (!k || (n.jenis || 'Superadmin') === k) && !n.read).length; return <button key={k} role="tab" aria-selected={jn === k} className={jn === k ? 'on' : ''} onClick={() => setJn(k)}>{l}{un > 0 && <i>{un}</i>}</button> })}</div>}
        <ul>{shown.length ? shown.slice(0, 15).map((n) => <li key={n.id} className={n.read ? '' : 'un'}><button onClick={() => pick(n)}>
          <span className="nb-d" aria-hidden="true" /><span>{role === 'mitra' && <span className={`nb-j j-${(n.jenis || 'Superadmin').toLowerCase()}`}><Icon name={IC[n.jenis || 'Superadmin']} size={12} />{n.jenis === 'Aktivitas' ? 'Aktivitas talent' : n.jenis === 'Blast' ? 'Blast · ' + (n.kategori || 'Pengumuman') : 'Superadmin'}</span>}<b>{n.judul}</b><small>{n.isi}</small><em>{n.dari ? n.dari + ' · ' : ''}{n.waktu}</em></span></button></li>) : <li className="nb-e">Belum ada notifikasi.</li>}</ul>
        {role === 'mitra' && <button className="nb-all" onClick={() => { setOpen(false); go('inbox') }}>Buka Inbox</button>}
      </div>}
    </div>
  )
}
