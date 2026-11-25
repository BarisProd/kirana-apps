// Dashboard role Branch: alert urgent + grafik aktivitas Branch (absensi, cuti, remunerasi, payslip, pengajuan).
import React, { useMemo, useState } from 'react'
import { useStore, getState } from '../services/store.js'
import { calcRemunRow } from '../services/payroll.js'
import { Btn, Card, Badge, Table, PageHead, Icon, Avatar } from '../components/ui.jsx'
import { LineArea, Columns, HBars, SegBar } from '../components/charts.jsx'
import { fmtDate } from './shared.jsx'
import { ArtHead } from '../components/Sticker.jsx'
import { isWorkday, leaveDates, jamMasuk, BULAN } from '../services/attendance.js'

const MY = () => getState().myBranch || 'b1'
const p2 = (n) => String(n).padStart(2, '0')
const isoOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const todayISO = () => isoOf(new Date())
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a.slice(0, 10) + 'T00:00:00')) / 86400000)
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BL3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const jt = (n) => Math.round(n / 100000) / 10
const toId = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
const AgeBadge = ({ d }) => <Badge t={d >= 7 ? 'bad' : d >= 3 ? 'warn' : 'neutral'}>{d <= 0 ? 'hari ini' : `${d} hari`}</Badge>

export function BranchDashboard({ go }) {
  const s = useStore()
  const my = MY(); const br = s.branches.find((b) => b.id === my) || {}
  const today = todayISO(); const td = new Date(today + 'T00:00:00')
  const curBulan = `${BULAN[td.getMonth()]} ${td.getFullYear()}`
  const [pfil, setPfil] = useState('')
  const D = useMemo(() => {
    const mine = s.employees.filter((e) => e.branch === my)
    const aktif = mine.filter((e) => e.status === 'Aktif')
    const ids = new Set(mine.map((e) => e.id)); const empOf = (id) => mine.find((e) => e.id === id) || {}
    // Absensi harian dari rekap bulanan
    const telatBy = {}, alpaBy = {}
    s.attRecap.filter((r) => ids.has(r.emp)).forEach((r) => { r.telat.forEach(([iso, m]) => { (telatBy[iso] ||= []).push([r.emp, m]) }); r.alpa.forEach((iso) => { (alpaBy[iso] ||= []).push(r.emp) }) })
    const cutiBy = {}
    const leaves = s.leaves.filter((l) => ids.has(l.emp))
    leaves.filter((l) => l.status === 'Approved').forEach((l) => leaveDates(s, l, my).forEach((iso) => { (cutiBy[iso] ||= []).push(l) }))
    const days = []; const d = new Date(td); let guard = 0
    while (days.length < 20 && guard++ < 60) { const iso = isoOf(d); if (isWorkday(s, my, iso)) days.unshift(iso); d.setDate(d.getDate() - 1) }
    const daily = days.map((iso) => { const t = (telatBy[iso] || []).length, a = (alpaBy[iso] || []).length, c = (cutiBy[iso] || []).length; const hadir = Math.max(0, aktif.length - a - c); return { iso, t, a, c, hadir, pct: aktif.length ? Math.round((hadir / aktif.length) * 1000) / 10 : 0, tepat: aktif.length ? Math.round(((hadir - t) / aktif.length) * 1000) / 10 : 0 } })
    const workToday = isWorkday(s, my, today)
    const telatToday = (telatBy[today] || []).map(([id, m]) => ({ e: empOf(id), m })).sort((a, b) => b.m - a.m)
    const cutiToday = (cutiBy[today] || []).map((l) => ({ l, e: empOf(l.emp) }))
    const alpaToday = (alpaBy[today] || []).map((id) => empOf(id))
    // Telat terbanyak bulan ini
    const ym = today.slice(0, 7)
    const telatMonth = {}; Object.entries(telatBy).forEach(([iso, l]) => { if (iso.startsWith(ym) && iso <= today) l.forEach(([id, m]) => { const x = (telatMonth[id] ||= { n: 0, m: 0 }); x.n++; x.m += m }) })
    const topTelat = Object.entries(telatMonth).map(([id, v]) => ({ e: empOf(id), ...v })).sort((a, b) => b.n - a.n || b.m - a.m).slice(0, 5)
    // Pengajuan menunggu approval
    const pend = [
      ...leaves.filter((l) => l.status === 'Waiting').map((l) => ({ k: 'Cuti & izin', e: empOf(l.emp), det: `${l.jenis} · ${fmtDate(l.dari)}${l.sampai && l.sampai !== l.dari ? ' – ' + fmtDate(l.sampai) : ''}`, sejak: l.diajukan || l.dari })),
      ...s.overtimes.filter((o) => ids.has(o.emp) && o.status === 'Waiting').map((o) => ({ k: 'Lembur', e: empOf(o.emp), det: `${o.judul} · ${o.durasi} jam (${fmtDate(o.tanggal)})`, sejak: o.tanggal })),
      ...s.reimbursements.filter((o) => ids.has(o.emp) && o.status === 'Waiting').map((o) => ({ k: 'Reimbursement', e: empOf(o.emp), det: `${o.jenis} · ${o.judul} · Rp ${o.nominal.toLocaleString('id-ID')}`, sejak: o.tanggal })),
      ...s.resigns.filter((o) => ids.has(o.emp) && o.status === 'Waiting').map((o) => ({ k: 'Resign', e: empOf(o.emp), det: `${o.alasan} · hari terakhir ${fmtDate(o.lastDay)}`, sejak: o.diajukan })),
    ].map((x) => ({ ...x, umur: daysBetween(x.sejak, today), id: x.k + x.e.id + x.sejak })).sort((a, b) => b.umur - a.umur)
    // Remunerasi
    const rem = s.remunerations.filter((r) => r.branch === my)
    const cur = rem.filter((r) => r.bulan === curBulan)
    const inRev = rem.filter((r) => r.status === 'In Review').map((r) => ({ r, umur: r.diajukan ? daysBetween(r.diajukan, today) : null }))
    const covered = new Set(cur.filter((r) => ['In Review', 'Approved'].includes(r.status)).flatMap((r) => r.rows.map((x) => x.emp)))
    const draftCur = cur.filter((r) => r.status === 'Draft')
    const inDraft = new Set(draftCur.flatMap((r) => r.rows.map((x) => x.emp)))
    const notIn = aktif.filter((e) => !covered.has(e.id) && !inDraft.has(e.id))
    const disbOf = (r) => s.disbursements.find((x) => x.remun === r.id)
    const unpaid = rem.filter((r) => r.status === 'Approved' && !disbOf(r))
    const rejected = rem.filter((r) => r.status === 'Rejected' && !rem.some((x) => x.bulan === r.bulan && ['In Review', 'Approved'].includes(x.status)))
    const net = (r) => r.rows.reduce((a, row) => a + (calcRemunRow(row, s.setup, r, empOf(row.emp)).net || 0), 0)
    const months = []; for (let i = 5; i >= 0; i--) { const m = new Date(td.getFullYear(), td.getMonth() - i, 1); months.push(`${BULAN[m.getMonth()]} ${m.getFullYear()}`) }
    const remCost = months.map((b) => { const l = rem.filter((r) => r.bulan === b && ['Approved', 'In Review'].includes(r.status)); return { b, v: l.reduce((a, r) => a + net(r), 0), rev: l.some((r) => r.status === 'In Review') } })
    // Payslip
    const sends = s.payslipSends.filter((x) => x.branch === my)
    const gagal = sends.filter((x) => x.gagal > 0 && !sends.some((y) => y.periode === x.periode && y.at > x.at && y.mode === 'Manual'))
    // Kontrak & rekening & resign
    const lim30 = isoOf(new Date(td.getTime() + 30 * 86400000)), lim60 = isoOf(new Date(td.getTime() + 60 * 86400000))
    const kontrak = aktif.filter((e) => e.end && e.end >= today && e.end <= lim60).sort((a, b) => a.end.localeCompare(b.end))
    const renewed = new Set(rem.filter((r) => r.status !== 'Rejected').flatMap((r) => r.rows.filter((x) => x.jenis === 'Renewal').map((x) => x.emp)))
    const unsynced = aktif.filter((e) => !e.bankOk)
    const resignInv = s.resigns.filter((o) => ids.has(o.emp) && o.status === 'Approved' && o.lastDay >= today && o.inventaris !== 'Lengkap').map((o) => ({ o, e: empOf(o.emp) }))
    const divisi = Object.entries(aktif.reduce((a, e) => { a[e.divisi || 'Lainnya'] = (a[e.divisi || 'Lainnya'] || 0) + 1; return a }, {})).sort((a, b) => b[1] - a[1])
    const tipe = ['Kontrak', 'Magang', 'Freelance'].map((k) => [k, aktif.filter((e) => e.type === k).length])
    return { mine, aktif, daily, workToday, telatToday, cutiToday, alpaToday, topTelat, pend, cur, inRev, covered, draftCur, inDraft, notIn, unpaid, rejected, remCost, gagal, sends, kontrak, lim30, renewed, unsynced, resignInv, divisi, tipe, months }
  }, [s, my, today])

  // ---- Alert urgent ----
  const A = []
  if (!D.cur.length) A.push({ t: 'bad', ic: 'wallet', msg: `Remunerasi ${curBulan} belum dibuat`, meta: `${D.aktif.length} karyawan aktif belum diajukan`, act: ['Buat pengajuan', 'remunerasi'] })
  else {
    if (D.notIn.length) A.push({ t: 'bad', ic: 'wallet', msg: `${D.notIn.length} karyawan belum masuk pengajuan remunerasi ${curBulan}`, meta: [...new Set(D.notIn.map((e) => e.divisi))].join(', '), act: ['Tambahkan', 'remunerasi'] })
    if (D.draftCur.length) A.push({ t: 'warn', ic: 'doc', msg: `${D.draftCur.length > 1 ? `${D.draftCur.length} draft` : 'Draft'} remunerasi ${curBulan} (${D.inDraft.size} karyawan) belum diajukan`, meta: 'Ajukan agar ikut diproses bulan ini', act: ['Buka draft', 'remunerasi'] })
  }
  Object.entries(D.inRev.reduce((a, x) => { (a[x.r.bulan] ||= []).push(x); return a }, {})).forEach(([bulan, l]) => {
    const umur = Math.max(...l.map((x) => x.umur ?? -1)); const n = l.reduce((a, x) => a + x.r.rows.length, 0); const tgl = l.map((x) => x.r.diajukan).filter(Boolean).sort()[0]
    A.push({ t: umur >= 5 ? 'bad' : 'warn', ic: 'clock', msg: `${l.length > 1 ? `${l.length} pengajuan remunerasi` : 'Remunerasi'} ${bulan} (${n} karyawan) menunggu approval${umur >= 0 ? ` sudah ${umur} hari` : ''}`, meta: tgl ? `Diajukan ${fmtDate(tgl)} · hubungi Superadmin bila mendesak` : 'Menunggu Superadmin', act: ['Lihat', 'remunerasi'] }) })
  D.rejected.forEach((r) => A.push({ t: 'bad', ic: 'x', msg: `Remunerasi ${r.bulan} ditolak dan belum diajukan ulang`, meta: r.note || 'Perbaiki lalu ajukan ulang', act: ['Perbaiki', 'remunerasi'] }))
  D.unpaid.forEach((r) => A.push({ t: 'warn', ic: 'wallet', msg: `Remunerasi ${r.bulan} disetujui, menunggu pembayaran`, meta: 'Payslip terbit setelah transfer selesai', act: null }))
  D.gagal.forEach((x) => A.push({ t: 'bad', ic: 'mail', msg: `${x.gagal} payslip ${x.periode} gagal terkirim`, meta: x.catatan || 'Periksa alamat e-mail karyawan', act: ['Payslip', 'payslip'] }))
  if (D.unsynced.length) A.push({ t: 'warn', ic: 'lock', msg: `${D.unsynced.length} rekening karyawan belum tersinkron`, meta: 'Gaji tidak bisa ditransfer sebelum sinkron', act: ['Data karyawan', 'data-karyawan'] })
  const k30 = D.kontrak.filter((e) => e.end <= D.lim30 && !D.renewed.has(e.id))
  if (k30.length) A.push({ t: 'warn', ic: 'calendar', msg: `${k30.length} kontrak berakhir ≤ 30 hari tanpa pengajuan Renewal`, meta: k30.slice(0, 3).map((e) => `${e.name} (${fmtDate(e.end)})`).join(', ') + (k30.length > 3 ? ` +${k30.length - 3}` : ''), act: ['Ajukan Renewal', 'remunerasi'] })
  const oldPend = D.pend.filter((x) => x.umur >= 7)
  if (oldPend.length) A.push({ t: 'warn', ic: 'approval', msg: `${oldPend.length} pengajuan karyawan menunggu approval ≥ 7 hari`, meta: oldPend.slice(0, 3).map((x) => `${x.k}: ${x.e.name} (${x.umur} hari)`).join(' · '), act: ['Lihat', '#bd-pend'] })
  D.resignInv.forEach(({ o, e }) => A.push({ t: 'warn', ic: 'box', msg: `${e.name} resign ${fmtDate(o.lastDay)}, inventaris belum lengkap`, meta: o.catatan || 'Pastikan barang dikembalikan sebelum hari terakhir', act: null }))
  if (D.workToday && D.telatToday.length) A.push({ t: D.telatToday.length / Math.max(1, D.aktif.length) > 0.05 ? 'bad' : 'warn', ic: 'clock', msg: `${D.telatToday.length} karyawan terlambat hari ini`, meta: `Terlama: ${D.telatToday[0].e.name} (${D.telatToday[0].m} menit)`, act: ['Lihat', '#bd-today'] })
  if (D.workToday && D.alpaToday.length) A.push({ t: 'bad', ic: 'user', msg: `${D.alpaToday.length} karyawan tidak hadir tanpa keterangan hari ini`, meta: D.alpaToday.slice(0, 3).map((e) => e.name).join(', '), act: ['Lihat', '#bd-today'] })
  A.sort((a, b) => (a.t === b.t ? 0 : a.t === 'bad' ? -1 : 1))
  const doAct = (a) => (a[1].startsWith('#') ? toId(a[1].slice(1)) : go(a[1]))

  const last = D.daily[D.daily.length - 1] || { hadir: 0, pct: 0, t: 0, c: 0, a: 0 }
  const tToday = D.workToday ? last : { hadir: 0, pct: 0, t: 0, c: D.cutiToday.length, a: 0 }
  const oldest = D.pend[0]
  const tiles = [
    ['Karyawan aktif', 'users', '#0a5950', D.aktif.length.toLocaleString('id-ID'), D.tipe.filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(' · '), () => go('data-karyawan')],
    ['Hadir hari ini', 'check', '#2f8f4e', D.workToday ? `${tToday.pct.toLocaleString('id-ID')}%` : 'Libur', D.workToday ? `${tToday.hadir} dari ${D.aktif.length} karyawan` : 'Bukan hari kerja Branch', () => toId('bd-chart')],
    ['Terlambat hari ini', 'clock', '#d9a400', D.workToday ? D.telatToday.length : '—', D.telatToday.length ? `rata-rata ${Math.round(D.telatToday.reduce((a, x) => a + x.m, 0) / D.telatToday.length)} menit` : 'tidak ada', () => toId('bd-today')],
    ['Cuti & izin hari ini', 'calendar', '#2a78d6', D.cutiToday.length, D.alpaToday.length ? `${D.alpaToday.length} tanpa keterangan` : 'semua tercatat', () => toId('bd-today')],
    ['Pengajuan menunggu', 'approval', '#c0452a', D.pend.length, oldest ? `terlama ${oldest.umur} hari (${oldest.k})` : 'tidak ada', () => { setPfil(''); toId('bd-pend') }],
    ['Kontrak habis ≤ 60 hari', 'doc', '#7a5af5', D.kontrak.length, `${k30.length} dalam 30 hari belum Renewal`, () => toId('bd-kontrak')],
  ]
  const curStat = [
    { l: 'In Review', v: D.covered.size, c: '#d9a400' }, { l: 'Draft', v: D.inDraft.size, c: '#2a78d6' }, { l: 'Belum diajukan', v: D.notIn.length, c: '#c0452a' },
  ]
  const pendKinds = ['Cuti & izin', 'Lembur', 'Reimbursement', 'Resign']
  const pendRows = D.pend.filter((x) => !pfil || x.k === pfil)
  const dd = td
  return (
    <>
      <ArtHead art="kaca" title={`Halo, ${br.name || 'Branch'}!`} sub={`${HARI[dd.getDay()]}, ${dd.getDate()} ${BULAN[dd.getMonth()]} ${dd.getFullYear()} · ${br.kota || ''} · ${D.workToday ? 'hari kerja' : 'libur'}. Pantau lowongan, kandidat, dan karyawanmu di sini.`} />

      <Card title={`Perlu perhatian (${A.length})`} className="bd-alerts">
        {A.length ? <ul className="bd-al">{A.map((a, i) => <li key={i} className={a.t}><span className="bd-ic"><Icon name={a.ic} size={18} /></span><span className="bd-tx"><b>{a.msg}</b><small>{a.meta}</small></span>{a.act && <Btn kind="ghost" perm="r" onClick={() => doAct(a.act)}>{a.act[0]}</Btn>}</li>)}</ul> : <p className="muted">Semua aman. Tidak ada yang mendesak.</p>}
      </Card>

      <div className="rk-tiles six" role="group" aria-label="Ringkasan Branch">{tiles.map(([l, ic, c, v, sub, fn]) => (
        <button key={l} className="rk-tile" style={{ borderTopColor: c }} onClick={fn}><span className="rk-h"><Icon name={ic} size={18} />{l}</span><b>{v}</b><small>{sub}</small><small className="rk-br">Lihat →</small></button>))}</div>

      <div id="bd-chart" className="anchor" />
      <div className="dgrid">
        <Card className="d-wide" title="Hadir tepat waktu · 20 hari kerja terakhir" action={<span className="muted sm">% dari karyawan aktif · rata-rata {(Math.round(D.daily.reduce((a, x) => a + x.tepat, 0) / Math.max(1, D.daily.length) * 10) / 10).toLocaleString('id-ID')}%</span>}>
          <LineArea label="Persentase karyawan hadir tepat waktu per hari" unit="%" points={D.daily.map((x) => ({ l: `${new Date(x.iso).getDate()} ${BL3[new Date(x.iso).getMonth()]}`, v: x.tepat }))} />
          <p className="muted sm mt">Hari ini: {D.workToday ? `${tToday.hadir} hadir · ${tToday.t} terlambat · ${tToday.c} cuti/izin · ${tToday.a} tanpa keterangan` : 'libur'}.</p>
        </Card>
        <Card title={`Remunerasi ${curBulan}`} action={<Btn kind="ghost" perm="r" onClick={() => go('remunerasi')}>Buka</Btn>}>
          <SegBar label="Status karyawan dalam pengajuan remunerasi bulan ini" parts={curStat} />
          <p className="muted sm mt">{D.inRev.length ? D.inRev.map(({ r, umur }) => `In Review ${r.rows.length} orang${umur != null ? ` · ${umur} hari menunggu` : ''}`).join(' · ') : 'Belum ada yang diajukan.'}</p>
        </Card>
      </div>
      <div className="dgrid">
        <Card title="Terlambat per hari" action={<span className="muted sm">orang</span>}><Columns label="Jumlah karyawan terlambat per hari" points={D.daily.slice(-10).map((x) => ({ l: String(new Date(x.iso).getDate()), full: `${fmtDate(x.iso)} · ${x.c} cuti · ${x.a} tanpa keterangan`, v: x.t }))} /></Card>
        <Card title="Biaya remunerasi 6 bulan" action={<span className="muted sm">juta Rp, nett</span>}><Columns label="Total nett remunerasi per bulan" unit=" jt" points={D.remCost.map((x) => ({ l: x.b.slice(0, 3), full: `${x.b}${x.rev ? ' · sebagian In Review' : ''}`, v: jt(x.v) }))} /></Card>
        <Card title="Karyawan per divisi"><HBars label="Karyawan aktif per divisi" rows={D.divisi.slice(0, 8).map(([l, v]) => ({ l, v }))} /></Card>
      </div>

      <div id="bd-today" className="anchor" />
      <div className="dgrid">
        <Card className="d-wide" title={`Terlambat hari ini (${D.telatToday.length})`} pad={false}>
          <Table size={8} rows={D.telatToday.map((x) => ({ ...x, id: x.e.id }))} empty={D.workToday ? 'Tidak ada yang terlambat.' : 'Hari ini libur.'} cols={[
            { h: 'Karyawan', r: (x) => <div className="who"><Avatar name={x.e.name} size={28} /><div><strong>{x.e.name}</strong><div className="muted sm">{x.e.divisi} · {x.e.shift}</div></div></div> },
            { h: 'Masuk', r: (x) => jamMasuk(s, x.e, x.m) }, { h: 'Telat', right: true, r: (x) => <Badge t={x.m >= 30 ? 'bad' : 'warn'}>{x.m} mnt</Badge> }]} />
        </Card>
        <Card title={`Cuti & izin hari ini (${D.cutiToday.length})`} pad={false}>
          <Table size={8} rows={D.cutiToday.map((x) => ({ ...x, id: x.l.id }))} empty="Tidak ada yang cuti." cols={[
            { h: 'Karyawan', r: (x) => <div className="who"><Avatar name={x.e.name} size={28} /><div><strong>{x.e.name}</strong><div className="muted sm">{x.e.divisi}</div></div></div> },
            { h: 'Jenis', r: (x) => <span className="sm">{x.l.jenis}<span className="muted" style={{ display: 'block' }}>s.d. {fmtDate(x.l.sampai || x.l.dari)}</span></span> }]} />
          {D.alpaToday.length > 0 && <p className="bd-alpa"><Icon name="user" size={16} /> Tanpa keterangan: {D.alpaToday.map((e) => e.name).join(', ')}</p>}
        </Card>
      </div>

      <div id="bd-pend" className="anchor" />
      <Card title={`Pengajuan menunggu approval (${D.pend.length})`} action={<div className="vd-seg" role="group" aria-label="Filter jenis pengajuan">{[['', 'Semua'], ...pendKinds.map((k) => [k, k])].map(([v, l]) => { const n = v ? D.pend.filter((x) => x.k === v).length : D.pend.length; return <button key={l} className={pfil === v ? 'on' : ''} aria-pressed={pfil === v} onClick={() => setPfil(v)}>{l} {n}</button> })}</div>} pad={false}>
        <Table size={10} rows={pendRows} empty="Tidak ada pengajuan yang menunggu." cols={[
          { h: 'Jenis', r: (x) => <Badge t="neutral">{x.k}</Badge> },
          { h: 'Karyawan', r: (x) => <div><strong>{x.e.name}</strong><div className="muted sm">{x.e.divisi || x.e.role}</div></div> },
          { h: 'Detail', r: (x) => <span className="sm">{x.det}</span> },
          { h: 'Diajukan', r: (x) => <span className="nowrap">{fmtDate(x.sejak)}</span> },
          { h: 'Menunggu', r: (x) => <AgeBadge d={x.umur} /> }]} />
        <p className="muted sm vd-note">Approval dilakukan Admin/Superadmin. Merah = menunggu ≥ 7 hari, kuning = ≥ 3 hari.</p>
      </Card>

      <div id="bd-kontrak" className="anchor" />
      <div className="grid2">
        <Card title={`Kontrak berakhir ≤ 60 hari (${D.kontrak.length})`} action={<Btn kind="ghost" onClick={() => go('remunerasi')}>Ajukan Renewal</Btn>} pad={false}>
          <Table size={8} rows={D.kontrak} empty="Tidak ada kontrak yang segera berakhir." cols={[
            { h: 'Karyawan', r: (e) => <div><strong>{e.name}</strong><div className="muted sm">{e.role} · {e.type}</div></div> },
            { h: 'Berakhir', r: (e) => <span className="nowrap">{fmtDate(e.end)}</span> },
            { h: 'Sisa', r: (e) => { const d = daysBetween(today, e.end); return <Badge t={d <= 14 ? 'bad' : d <= 30 ? 'warn' : 'neutral'}>{d} hari</Badge> } },
            { h: 'Renewal', r: (e) => (D.renewed.has(e.id) ? <Badge t="ok">Diajukan</Badge> : <span className="muted sm">Belum</span>) }]} />
        </Card>
        <Card title="Payslip terakhir" action={<Btn kind="ghost" onClick={() => go('payslip')}>Payslip</Btn>} pad={false}>
          <Table paged={false} rows={D.sends.slice(0, 5)} empty="Belum ada pengiriman payslip." cols={[
            { h: 'Periode', r: (x) => <div><strong>{x.periode}</strong><div className="muted sm">{x.tipe} · {x.mode}</div></div> },
            { h: 'Dikirim', r: (x) => <span className="sm nowrap">{fmtDate(x.at.slice(0, 10))} {x.at.slice(11, 16)}</span> },
            { h: 'Penerima', right: true, r: (x) => x.emp.length },
            { h: 'Status', r: (x) => (x.gagal ? <Badge t="bad">{x.gagal} gagal</Badge> : <Badge t="ok">Terkirim</Badge>) }]} />
        </Card>
      </div>
      <div className="grid2">
        <Card title="Paling sering terlambat · bulan ini" pad={false}>
          <Table paged={false} rows={D.topTelat.map((x) => ({ ...x, id: x.e.id }))} empty="Belum ada." cols={[
            { h: 'Karyawan', r: (x) => <div><strong>{x.e.name}</strong><div className="muted sm">{x.e.divisi}</div></div> },
            { h: 'Kali', right: true, r: (x) => <b>{x.n}×</b> }, { h: 'Total', right: true, r: (x) => `${x.m} mnt` }]} />
        </Card>
        <Card title="Lowongan" action={<Btn kind="ghost" icon="plus" onClick={() => go('lowongan')}>Buat</Btn>} pad={false}>
          <Table rows={s.jobs.filter((j) => j.branch === my)} empty="Belum ada lowongan." cols={[{ h: 'Posisi', k: 'posisi' }, { h: 'Pelamar', k: 'pelamar' }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} />
        </Card>
      </div>
    </>
  )
}
