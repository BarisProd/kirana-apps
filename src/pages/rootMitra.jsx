// Root (Owner Kirana) › Mitra Talent Pool: semua mitra di platform — yang bekerja sama langsung dengan Owner Kirana
// maupun dengan Superadmin customer. Owner bisa membuat mitra baru dengan aturan kerja sama.
import React, { useState } from 'react'
import { useStore } from '../services/store.js'
import { Btn, Card, Badge, Table, PageHead, Avatar } from '../components/ui.jsx'
import { MitraDetail, MitraCreate, ReqTable, AturanCard, QuickSummary, reqInfo, tpActive, PERJ_T } from './talentPoolUI.jsx'

export function RootMitra({ sub, go }) {
  const s = useStore(); const [cr, setCr] = useState(false); const [cat, setCat] = useState('')
  const cust = (id) => s.root.customers.find((c) => c.id === id)?.nama || id
  if (sub) { const m = s.mitras.find((x) => x.id === sub); if (m) return <MitraDetail m={m} onBack={() => go('mitra')} backLabel="Mitra Talent Pool" canSend={false} root /> }
  const tal = (m) => s.pool.filter((p) => p.mitra === m.name)
  const fee = (m) => (s.mitraFees || []).filter((f) => f.mitra === m.id).reduce((a, f) => a + f.nominal, 0)
  const CATS = [['', 'Semua mitra', () => true, '#0a5950'], ['owner', 'Kerja sama Owner Kirana', (m) => m.mitraDengan === 'Owner Kirana', '#7a5af5'], ['su', 'Kerja sama Superadmin', (m) => m.mitraDengan !== 'Owner Kirana', '#2a78d6'], ['tunggu', 'Menunggu persetujuan', (m) => m.perjanjian?.status !== 'Aktif', '#d9a400'], ['api', 'Terhubung API', (m) => m.perjanjian?.api?.aktif, '#2f8f4e']]
  const fn = (CATS.find((c) => c[0] === cat) || CATS[0])[2]
  const rows = s.mitras.filter(fn)
  const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
  return (
    <>
      <PageHead title="Mitra Talent Pool" sub="Kerja sama penyaluran kandidat (pola outsourcing) dengan Owner Kirana maupun Superadmin customer."><Btn icon="plus" onClick={() => setCr(true)}>Create Mitra Account</Btn></PageHead>
      <div className="rk-tiles" role="group" aria-label="Rekap mitra platform">{CATS.map(([k, l, f, c]) => { const l2 = s.mitras.filter(f); const on = cat === k; return (
        <button key={l} className={`rk-tile ${on ? 'on' : ''}`} style={{ borderTopColor: c }} aria-pressed={on} onClick={() => setCat(k)}>
          <span className="rk-h">{l}</span><b>{l2.length}</b><small>{l2.reduce((a, m) => a + tal(m).filter(tpActive).length, 0)} talent aktif · {rp(l2.reduce((a, m) => a + fee(m), 0))}</small></button>) })}</div>
      <Card pad={false}><Table rows={rows} onRow={(r) => go('mitra/' + r.id)} empty="Tidak ada mitra." cols={[
        { h: 'Mitra', r: (r) => <div className="who"><Avatar name={r.name} size={34} /><div><strong>{r.name}</strong><div className="muted sm">{r.pic} · {r.email}</div></div></div> },
        { h: 'Kerja sama dengan', r: (r) => (r.mitraDengan === 'Owner Kirana' ? <Badge t="ok">Owner Kirana</Badge> : <span className="sm">Superadmin {cust(r.customer)}</span>) },
        { h: 'Klien', r: (r) => <span className="sm">{(r.klien || []).map(cust).join(', ')}</span> },
        { h: 'Billing', r: (r) => <span className="sm">{r.perjanjian?.billing}<span className="muted" style={{ display: 'block' }}>{r.perjanjian?.nilai}</span></span> },
        { h: 'Talent aktif', right: true, r: (r) => tal(r).filter(tpActive).length }, { h: 'Hired', right: true, r: (r) => tal(r).filter((p) => p.status === 'Hired').length },
        { h: 'Pendapatan', right: true, r: (r) => (fee(r) ? rp(fee(r)) : '—') },
        { h: 'Perjanjian', r: (r) => <Badge t={PERJ_T[r.perjanjian?.status]}>{r.perjanjian?.status}</Badge> },
      ]} /></Card>
      <QuickSummary list={s.pool} value="" title="Talent Pool platform · Quick Summary" sub="Semua talent di platform, termasuk yang daftar sendiri" />
      <Card title="Permintaan ke mitra (semua customer)" pad={false}><ReqTable rows={s.requisitions} showMitra /></Card>
      <AturanCard title="Aturan & alur kerja sama mitra" />
      <MitraCreate open={cr} onClose={() => setCr(false)} owner customers={s.root.customers} />
    </>
  )
}

// Ringkasan untuk Dashboard Root
export function RootMitraSummary({ go }) {
  const s = useStore()
  const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID')
  const fees = (s.mitraFees || []); const bulanIni = fees.filter((f) => f.bulan === new Date().toISOString().slice(0, 7)).reduce((a, f) => a + f.nominal, 0)
  const lewat = s.requisitions.filter((r) => reqInfo(s, r).status === 'Lewat SLA').length
  return <Card title="Mitra & Talent Pool" action={<Btn kind="ghost" onClick={() => go('mitra')}>Mitra Talent Pool</Btn>}>
    <div className="tp-mini">{[['Mitra aktif', s.mitras.filter((m) => m.perjanjian?.status === 'Aktif').length], ['Menunggu persetujuan', s.mitras.filter((m) => m.perjanjian?.status !== 'Aktif').length], ['Talent aktif via mitra', s.pool.filter((p) => p.mitra !== '—' && tpActive(p)).length], ['Hired via mitra', s.pool.filter((p) => p.mitra !== '—' && p.status === 'Hired').length], ['Permintaan lewat SLA', lewat], ['Pendapatan mitra bulan ini', rp(bulanIni)]].map(([l, v]) => <div key={l}><b>{v}</b><small className="muted">{l}</small></div>)}</div>
    <QuickSummary list={s.pool} value="" onPick={() => go('mitra')} title="Quick Summary platform" />
  </Card>
}
