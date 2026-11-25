// Superadmin › Absensi: Dashboard Absensi (pantauan cuti & kehadiran per tahun) dan Potongan Absensi (opsional, diatur per Branch).
import React, { useState } from 'react'
import { useStore, api } from '../services/store.js'
import { Btn, Card, Badge, Table, Modal, Field, Toggle, useToast, PageHead, Note, Icon, Empty, Stat, Avatar, usePerm } from '../components/ui.jsx'
import { HBars, Columns } from '../components/charts.jsx'
import { useLookup, fmtDate } from './shared.jsx'
import { rupiah } from '../services/payroll.js'
import { sheet, dlx } from './root.jsx'
import { BULAN, BL3, DATA_SAMPAI, leaveYear, attYear, deductionOf, upahDasar, telatRp, DEDUCT_DEFAULT, workdaysOf, shiftOf, holidayOn } from '../services/attendance.js'
import { BlackoutEditor, RekapBulanan } from './setupAbsen.jsx'

const Crumb = ({ items }) => <nav className="crumb" aria-label="Breadcrumb">{items.map(([l, fn], i) => <React.Fragment key={i}>{i > 0 && <span>›</span>}{fn ? <button onClick={fn}>{l}</button> : <b>{l}</b>}</React.Fragment>)}</nav>
const Who = ({ e, br }) => <div className="who"><Avatar name={e.name} size={30} /><div><strong>{e.name}</strong><div className="muted sm">{e.role} · {br}</div></div></div>
const YEARS = [2026, 2025]
const tglPendek = (iso) => { const [y, m, d] = iso.split('-'); return `${Number(d)} ${BL3[Number(m) - 1]}` }

// ===================================================== DASHBOARD ABSENSI
export function AbsensiDashboard({ go }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast()
  const [y, setY] = useState(2026); const [b, setB] = useState('')
  const emps = s.employees.filter((e) => !b || e.branch === b)
  const rows = emps.map((e) => ({ e, ly: leaveYear(s, e.id, y), at: attYear(s, e.id, y) }))
  const never = rows.filter((x) => x.ly.semua === 0)
  const habis = rows.filter((x) => x.ly.jatah > 0 && x.ly.sisa === 0)
  const lebih = rows.filter((x) => x.ly.lebih > 0)
  const long = rows.flatMap((x) => x.ly.long.map((l) => ({ ...x, l })))
  const alpa = rows.filter((x) => x.at.alpa.length).sort((a, c) => c.at.alpa.length - a.at.alpa.length)
  const late = rows.filter((x) => x.at.telat.length).sort((a, c) => c.at.telat.length - a.at.telat.length || c.at.menit - a.at.menit)
  const sampai = y === Number(DATA_SAMPAI.slice(0, 4)) ? `1 Jan – ${fmtDate(DATA_SAMPAI)}` : `1 Jan – 31 Des ${y}`
  const perBulan = Array.from({ length: 12 }, (_, i) => ({ l: BL3[i], full: `${BULAN[i]} ${y}`, v: rows.reduce((a, x) => a + x.at.alpa.filter((z) => z.m === i + 1).length, 0) }))
  const lastM = y === 2026 ? 11 : 12
  const KAT = s.leaveTypes.filter((lt) => !/^Cuti Tahunan \d/.test(lt.name)).map((lt) => ({ name: lt.name, label: lt.name.startsWith('Cuti Tahunan') ? 'Cuti Tahunan' : lt.name, kel: lt.kelompok || 'Cuti', match: (j) => (lt.name === 'Cuti Tahunan' ? /^Cuti Tahunan/.test(j) : j === lt.name) }))
  const katOf = (x, k) => Object.entries(x.at.kat).filter(([j]) => k.match(j)).reduce((a, [, v]) => a + v, 0)
  const katCols = KAT.filter((k) => rows.some((x) => katOf(x, k) > 0))
  const hkBranch = s.branches.filter((x) => !b || x.id === b).map((x) => ({ x, n: Array.from({ length: lastM }, (_, i) => workdaysOf(s, x.id, y, i + 1).length).reduce((a, v) => a + v, 0) }))
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const tiles = [['ad-never', 'Tidak pernah cuti', never.length, 'calendar'], ['ad-habis', 'Cuti sudah habis', habis.length, 'x'], ['ad-lebih', 'Cuti melebihi jatah', lebih.length, 'wallet'], ['ad-long', 'Cuti melebihi batas berturut', long.length, 'clock'], ['ad-alpa', 'Tidak hadir tanpa absen', alpa.length, 'user'], ['ad-late', 'Sering terlambat', late.length, 'clock']]
  const jatahTxt = (ly) => `${ly.kuota}${ly.carry ? ` + ${ly.carry} carry over` : ''}${ly.bonus ? ` + ${ly.bonus} masa kerja` : ''}${ly.adj ? ' (dikoreksi Talent Setting)' : ''}${ly.cb ? ` · ${ly.cb} hari terpotong cuti bersama` : ''}`
  const xls = () => dlx(toast, [
    sheet('Ringkasan', ['Karyawan', 'Branch', 'Jatah cuti tahunan', 'Terpakai', 'Sisa', 'Lebih', 'Semua cuti (hari)', 'Hari kerja', 'Hadir', 'Tidak absen', 'Terlambat (kali)', 'Terlambat (menit)'], rows.map((x) => [x.e.name, branch(x.e.branch), x.ly.jatah, x.ly.pakai, Math.max(0, x.ly.sisa), x.ly.lebih, x.ly.semua, x.at.hk, x.at.hadir, x.at.alpa.length, x.at.telat.length, x.at.menit])),
    sheet('Cuti melebihi batas', ['Karyawan', 'Jenis', 'Dari', 'Sampai', 'Hari', 'Batas berturut', 'Lebih'], long.map((x) => [x.e.name, x.l.jenis, x.l.dari, x.l.sampai, x.l.hari, x.l.maks, x.l.hari - x.l.maks])),
    sheet('Tidak absen', ['Karyawan', 'Tanggal'], alpa.flatMap((x) => x.at.alpa.map((a) => [x.e.name, a.tgl]))),
    sheet('Terlambat', ['Karyawan', 'Tanggal', 'Menit'], late.flatMap((x) => x.at.telat.map((a) => [x.e.name, a.tgl, a.menit]))),
  ], `Dashboard-absensi-${y}${b ? '-' + b : ''}`)
  return (
    <>
      <Crumb items={[['Absensi', () => go('absensi')], ['Dashboard Absensi']]} />
      <PageHead title="Dashboard Absensi" sub={`Pantauan cuti dan kehadiran karyawan per tahun · data ${sampai}.`}><div className="row-act"><Btn kind="ghost" icon="wallet" onClick={() => go('potongan-absensi')}>Potongan Absensi</Btn><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn></div></PageHead>
      <div className="filters">
        <label className="fsel"><span>Tahun</span><select value={y} onChange={(e) => setY(Number(e.target.value))}>{YEARS.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
        <label className="fsel"><span>Branch</span><select value={b} onChange={(e) => setB(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <span className="muted sm ad-n">{emps.length} karyawan dipantau</span>
      </div>
      <div className="ad-tiles">{tiles.map(([id, l, n, ic]) => <button key={id} className={`ad-tile ${n ? 'has' : ''}`} onClick={() => jump(id)}><span className="stat-i"><Icon name={ic} /></span><b>{n}</b><span>{l}</span><small>karyawan</small></button>)}</div>
      <div className="dgrid two">
        <Card title="Paling sering terlambat" action={<span className="muted sm">jumlah kali, {y}</span>}>{late.length ? <HBars label="Karyawan paling sering terlambat" unit="×" rows={late.slice(0, 6).map((x) => ({ l: x.e.name, v: x.at.telat.length }))} /> : <Empty text="Tidak ada keterlambatan." />}</Card>
        <Card title="Tidak hadir tanpa absen per bulan" action={<span className="muted sm">hari, semua karyawan</span>}><Columns label="Hari tidak absen per bulan" unit=" hari" points={perBulan.slice(0, lastM)} /></Card>
      </div>

      <Card title={<span id="ad-never">Tidak pernah cuti <span className="muted sm">· {never.length} karyawan</span></span>} pad={false}>
        {never.length ? <Table rows={never} cols={[
          { h: 'Karyawan', r: (x) => <Who e={x.e} br={branch(x.e.branch)} /> }, { h: 'Jatah cuti tahunan', r: (x) => <div><b>{x.ly.jatah} hari</b><div className="muted sm">{jatahTxt(x.ly)}</div></div> },
          { h: 'Sisa', r: (x) => <b>{x.ly.sisa} hari</b> }, { h: 'Cuti terakhir', r: (x) => x.ly.terakhir ? <span className="nowrap">{fmtDate(x.ly.terakhir.dari)} · {x.ly.terakhir.hari} hari</span> : <span className="muted">Belum pernah</span> },
          { h: 'Saran', r: (x) => <span className="sm">{x.ly.sisa >= 12 ? 'Sisa cuti menumpuk, ajak rencanakan cuti agar tidak hangus/burnout.' : 'Ingatkan untuk merencanakan cuti sebelum akhir tahun.'}</span> },
        ]} /> : <Empty text="Semua karyawan sudah pernah cuti tahun ini." />}
      </Card>
      <Card title={<span id="ad-habis">Cuti tahunan sudah habis <span className="muted sm">· {habis.length} karyawan</span></span>} pad={false}>
        {habis.length ? <Table rows={habis} cols={[
          { h: 'Karyawan', r: (x) => <Who e={x.e} br={branch(x.e.branch)} /> }, { h: 'Jatah', r: (x) => <div><b>{x.ly.jatah} hari</b><div className="muted sm">{jatahTxt(x.ly)}</div></div> },
          { h: 'Terpakai', r: (x) => `${x.ly.pakai} hari` }, { h: 'Pengajuan menunggu', r: (x) => x.ly.pending ? <Badge t="bad">{x.ly.pending} hari · akan melebihi jatah</Badge> : <span className="muted">—</span> },
          { h: 'Cuti terakhir', r: (x) => x.ly.terakhir ? fmtDate(x.ly.terakhir.dari) : '—' },
        ]} /> : <Empty text="Belum ada karyawan yang jatah cutinya habis." />}
      </Card>
      <Card title={<span id="ad-lebih">Cuti melebihi jatah <span className="muted sm">· {lebih.length} karyawan</span></span>} pad={false}>
        {lebih.length ? <Table rows={lebih} cols={[
          { h: 'Karyawan', r: (x) => <Who e={x.e} br={branch(x.e.branch)} /> }, { h: 'Jatah', r: (x) => <div><b>{x.ly.jatah} hari</b><div className="muted sm">{jatahTxt(x.ly)}</div></div> },
          { h: 'Terpakai', r: (x) => `${x.ly.pakai} hari` }, { h: 'Lebih', r: (x) => <Badge t="bad">+{x.ly.lebih} hari</Badge> },
          { h: 'Perlakuan', r: (x) => { const c = s.attDeduct?.[x.e.branch]; return c?.aktif && c.cutiLebih.aktif ? <span className="sm">Dipotong {c.cutiLebih.faktor}× upah harian per hari lebih (Potongan Absensi)</span> : <span className="sm txt-warn">{c?.aktif ? 'Potongan cuti lebih dimatikan di branch ini' : 'Potongan absensi nonaktif di branch ini'}</span> } },
        ]} /> : <Empty text="Tidak ada karyawan yang cutinya melebihi jatah." />}
      </Card>
      <Card title={<span id="ad-long">Cuti lebih panjang dari batas berturut-turut <span className="muted sm">· {long.length} pengajuan</span></span>} pad={false}>
        {long.length ? <Table rows={long} cols={[
          { h: 'Karyawan', r: (x) => <Who e={x.e} br={branch(x.e.branch)} /> }, { h: 'Jenis cuti', r: (x) => x.l.jenis },
          { h: 'Tanggal', r: (x) => <span className="nowrap">{fmtDate(x.l.dari)} – {fmtDate(x.l.sampai)}</span> }, { h: 'Lama', r: (x) => <b>{x.l.hari} hari</b> },
          { h: 'Batas', r: (x) => `${x.l.maks} hari berturut` }, { h: 'Selisih', r: (x) => <Badge t="warn">+{x.l.hari - x.l.maks} hari</Badge> },
          { h: 'Status', r: (x) => <Badge>{x.l.status}</Badge> },
        ]} /> : <Empty text="Tidak ada cuti yang melebihi batas berturut-turut." />}
      </Card>
      <Card title={<span id="ad-kat">Rekap per kategori cuti & izin <span className="muted sm">· hari kerja yang terpakai, {y}</span></span>} pad={false}>
        <div className="kat-wrap"><HBars label="Total hari per kategori cuti dan izin" rows={katCols.map((k) => ({ l: k.label, v: rows.reduce((a, x) => a + katOf(x, k), 0) }))} /></div>
        <Table rows={rows} cols={[
          { h: 'Karyawan', r: (x) => <Who e={x.e} br={branch(x.e.branch)} /> },
          ...katCols.map((k) => ({ h: <span>{k.label}<small className="kel">{k.kel}</small></span>, right: true, r: (x) => katOf(x, k) || <span className="muted">—</span> })),
          { h: 'Total cuti', right: true, r: (x) => <b>{katCols.filter((k) => k.kel === 'Cuti').reduce((a, k) => a + katOf(x, k), 0)}</b> },
          { h: 'Total izin', right: true, r: (x) => <b>{katCols.filter((k) => k.kel === 'Izin').reduce((a, k) => a + katOf(x, k), 0)}</b> },
        ]} />
      </Card>
      <Card title={<span id="ad-alpa">Tidak hadir karena tidak absen <span className="muted sm">· {alpa.length} karyawan</span></span>} pad={false}>
        {alpa.length ? <Table rows={alpa} cols={[
          { h: 'Karyawan', r: (x) => <Who e={x.e} br={branch(x.e.branch)} /> }, { h: 'Total', r: (x) => <b>{x.at.alpa.length} hari</b> },
          { h: 'Tanggal', r: (x) => <div className="ad-dates">{x.at.alpa.map((a) => <span key={a.tgl}>{tglPendek(a.tgl)}</span>)}</div> },
          { h: 'Kehadiran', r: (x) => <span className="nowrap">{Math.round((x.at.hadir / Math.max(1, x.at.hk - x.at.cuti)) * 100)}% <span className="muted sm">({x.at.hadir}/{x.at.hk - x.at.cuti} hari)</span></span> },
        ]} /> : <Empty text="Semua hari kerja tercatat absen atau cuti." />}
      </Card>
      <Card title={<span id="ad-late">Paling sering terlambat absen <span className="muted sm">· peringkat {y}</span></span>} pad={false}>
        {late.length ? <Table rows={late} cols={[
          { h: '#', r: (x) => late.indexOf(x) + 1 }, { h: 'Karyawan', r: (x) => <Who e={x.e} br={branch(x.e.branch)} /> },
          { h: 'Shift', r: (x) => { const sh = shiftOf(s, x.e); return <div className="nowrap">{sh.name}<div className="muted sm">masuk {sh.masuk}, batas {sh.batas}</div></div> } }, { h: 'Terlambat', r: (x) => <b>{x.at.telat.length} kali</b> }, { h: 'Total menit', r: (x) => `${x.at.menit} menit` },
          { h: 'Rata-rata', r: (x) => `${Math.round(x.at.menit / x.at.telat.length)} menit` },
          { h: 'Bulan terbanyak', r: (x) => { const c = {}; x.at.telat.forEach((z) => { c[z.m] = (c[z.m] || 0) + 1 }); const [m, n] = Object.entries(c).sort((a, z) => z[1] - a[1])[0]; return `${BULAN[m - 1]} (${n}×)` } },
          { h: 'Terlambat > 30 menit', r: (x) => x.at.telat.filter((z) => z.menit > 30).length },
        ]} /> : <Empty text="Tidak ada keterlambatan." />}
      </Card>

      <Card title="Dasar perhitungan">
        <ul className="ad-info">
          <li><b>Hari kerja</b> mengikuti kalender kerja tiap Branch (Setup Aktivitas › Kalender): {hkBranch.map(({ x, n }) => `${x.name} ${n} hari`).join(' · ')}. Libur nasional, cuti bersama, dan libur perusahaan tidak dihitung tidak absen.</li>
          <li><b>Terlambat</b> = absen masuk setelah batas jam masuk shift karyawan (Setup Aktivitas › Absensi). Toleransi potongan diatur per Branch di Potongan Absensi.</li>
          <li><b>Cuti & izin</b> dipilih karyawan saat mengajukan, sesuai kategori di Pengaturan Cuti. Kategori kelompok Izin (sakit, izin resmi, dinas luar) tidak dihitung "pernah cuti" tetapi juga tidak dianggap tidak absen.</li>
          <li><b>Jatah cuti tahunan</b> = kuota kategori + sisa tahun lalu (carry over) + tambahan masa kerja, atau angka koreksi di Talent Setting. Di Branch yang cuti bersamanya memotong cuti tahunan, hari cuti bersama ikut terhitung terpakai.</li>
        </ul>
        <div className="row-act mt"><Btn kind="ghost" icon="calendar" onClick={() => go('setup-aktivitas/kalender')}>Kalender kerja</Btn><Btn kind="ghost" icon="clock" onClick={() => go('setup-aktivitas/absensi')}>Jam shift</Btn><Btn kind="ghost" icon="settings" onClick={() => go('cuti/pengaturan')}>Kategori cuti & izin</Btn></div>
      </Card>
      {t}
    </>
  )
}

// ===================================================== POTONGAN ABSENSI
export function PotonganAbsensi({ sub, go }) {
  if (sub === 'setup') return <PotonganSetup go={go} />
  return <PotonganList go={go} />
}
function PotonganList({ go }) {
  const s = useStore(); const { branch } = useLookup(); const [t, toast] = useToast()
  const [y, setY] = useState(2026); const [m, setM] = useState(10); const [b, setB] = useState(''); const [det, setDet] = useState(null)
  const maxM = y === 2026 ? 11 : 12
  const rows = s.employees.filter((e) => !b || e.branch === b).map((e) => ({ e, d: deductionOf(s, e, y, Math.min(m, maxM)) })).filter((x) => x.d)
  const on = rows.filter((x) => x.d.aktif); const kena = on.filter((x) => x.d.total > 0)
  const tot = on.reduce((a, x) => a + x.d.total, 0)
  const per = `${BULAN[Math.min(m, maxM) - 1]} ${y}`
  const xls = () => dlx(toast, [sheet(`Potongan ${BL3[m - 1]} ${y}`, ['Karyawan', 'Branch', 'Status branch', 'Dasar upah', 'Upah harian', 'Tidak absen (hari)', 'Potongan tidak absen', 'Terlambat > toleransi (kali)', 'Potongan terlambat', 'Cuti lebih (hari)', 'Potongan cuti lebih', 'Total sebelum batas', 'Total potongan'],
    rows.map(({ e, d }) => d.aktif ? [e.name, branch(e.branch), 'Aktif', Math.round(d.upah), Math.round(d.harian), d.r.alpa.length, Math.round(d.alpaRp), d.kena.length, Math.round(d.telatRp), d.lebihHari, Math.round(d.cutiRp), Math.round(d.raw), Math.round(d.total)] : [e.name, branch(e.branch), 'Nonaktif', '', '', d.r.alpa.length, '', d.r.telat.length, '', '', '', '', 0]))], `Potongan-absensi-${y}-${String(m).padStart(2, '0')}`)
  return (
    <>
      <Crumb items={[['Absensi', () => go('absensi')], ['Potongan Absensi']]} />
      <PageHead title="Potongan Absensi" sub="Perhitungan potongan gaji dari tidak absen, keterlambatan, dan cuti melebihi jatah. Terpisah dari remunerasi, dan bisa diaktifkan atau dimatikan per Branch."><div className="row-act"><Btn kind="ghost" icon="chart" onClick={() => go('dashboard-absensi')}>Dashboard Absensi</Btn><Btn kind="ghost" icon="download" onClick={xls}>Download Excel</Btn><Btn icon="settings" perm="r" onClick={() => go('potongan-absensi/setup')}>Atur per Branch</Btn></div></PageHead>
      <div className="br-chips">{s.branches.map((x) => { const c = s.attDeduct[x.id]; return <button key={x.id} className={`br-chip ${c?.aktif ? 'on' : ''}`} onClick={() => go('potongan-absensi/setup')}><Icon name={c?.aktif ? 'checkCircle' : 'x'} size={16} />{x.name}<small>{c?.aktif ? 'Aktif' : 'Nonaktif'}</small></button> })}</div>
      <div className="filters">
        <label className="fsel"><span>Tahun</span><select value={y} onChange={(e) => setY(Number(e.target.value))}>{YEARS.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
        <label className="fsel"><span>Bulan</span><select value={m} onChange={(e) => setM(Number(e.target.value))}>{BULAN.slice(0, maxM).map((l, i) => <option key={l} value={i + 1}>{l}</option>)}</select></label>
        <label className="fsel"><span>Branch</span><select value={b} onChange={(e) => setB(e.target.value)}><option value="">Semua Branch</option>{s.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      </div>
      <div className="stats">
        <Stat icon="wallet" label="Total potongan" value={rupiah(tot)} hint={per} />
        <Stat icon="users" label="Karyawan terpotong" value={kena.length} hint={`dari ${on.length} di branch aktif`} />
        <Stat icon="building" label="Branch aktif" value={`${s.branches.filter((x) => s.attDeduct[x.id]?.aktif).length}/${s.branches.length}`} hint="potongan dihitung" />
        <Stat icon="lock" label="Kena batas maksimal" value={on.filter((x) => x.d.dibatasi).length} hint="potongan dibatasi % upah" />
      </div>
      <Card pad={false}><Table rows={rows} onRow={(x) => x.d.aktif && setDet(x)} empty="Tidak ada data." cols={[
        { h: 'Karyawan', r: (x) => <Who e={x.e} br={branch(x.e.branch)} /> },
        { h: 'Upah harian', r: (x) => x.d.aktif ? <div className="nowrap">{rupiah(x.d.harian)}<div className="muted sm">{s.attDeduct[x.e.branch].dasar === 'gp' ? 'Gaji pokok' : 'THP'} ÷ {x.d.hk} hari</div></div> : <span className="muted">—</span> },
        { h: 'Tidak absen', r: (x) => <div className="nowrap">{x.d.r.alpa.length} hari{x.d.aktif && x.d.alpaRp > 0 && <div className="sm">{rupiah(x.d.alpaRp)}</div>}</div> },
        { h: 'Terlambat', r: (x) => <div className="nowrap">{x.d.aktif ? `${x.d.kena.length} dari ${x.d.r.telat.length} kali` : `${x.d.r.telat.length} kali`}{x.d.aktif && x.d.telatRp > 0 && <div className="sm">{rupiah(x.d.telatRp)}</div>}</div> },
        { h: 'Cuti lebih', r: (x) => x.d.aktif && x.d.lebihHari ? <div className="nowrap">{x.d.lebihHari} hari<div className="sm">{rupiah(x.d.cutiRp)}</div></div> : <span className="muted">—</span> },
        { h: 'Total potongan', r: (x) => x.d.aktif ? <div className="nowrap"><b>{rupiah(x.d.total)}</b>{x.d.dibatasi && <div className="txt-warn sm">dibatasi {s.attDeduct[x.e.branch].batas}% upah</div>}</div> : <Badge t="neutral">Potongan nonaktif</Badge> },
        { h: '', r: (x) => x.d.aktif ? <span className="muted" aria-hidden="true"><Icon name="arrowRight" size={18} /></span> : null },
      ]} /></Card>
      <Note>Hasil ini laporan terpisah: belum otomatis mengurangi simulasi remunerasi atau payroll. Hari kerja {per} mengikuti kalender kerja tiap Branch (libur nasional, cuti bersama, libur perusahaan, dan hari kerja 5/6 hari).</Note>
      <Modal open={!!det} title={det ? `Rincian potongan · ${det.e.name}` : ''} onClose={() => setDet(null)} footer={<Btn onClick={() => setDet(null)}>Tutup</Btn>}>
        {det && <PotonganDetail x={det} per={per} />}
      </Modal>
      {t}
    </>
  )
}
function PotonganDetail({ x, per }) {
  const s = useStore(); const { e, d } = x; const c = s.attDeduct[e.branch]
  return (
    <div className="pd">
      <p className="muted">{per} · {d.r.hk} hari kerja menurut kalender {(s.workCal?.[e.branch]?.hari || []).length} hari/minggu Branch · hadir {d.r.hadir} · cuti/izin {d.r.cuti}{d.r.libur.length ? ` · libur: ${d.r.libur.map((h) => `${tglPendek(h.tanggal)} ${h.nama}`).join(', ')}` : ''} · shift {shiftOf(s, e).name} (batas masuk {shiftOf(s, e).batas})</p>
      <dl className="au-dl">
        <dt>Dasar upah</dt><dd>{rupiah(d.upah)} ({c.dasar === 'gp' ? 'gaji pokok' : 'THP'})</dd>
        <dt>Upah harian</dt><dd>{rupiah(d.harian)} = upah ÷ {d.hk} {c.pembagi === 'aktual' ? 'hari kerja bulan ini' : 'hari'}</dd>
        <dt>Tidak absen</dt><dd>{d.r.alpa.length ? `${d.r.alpa.map((z) => tglPendek(z)).join(', ')} → ${d.r.alpa.length} × ${c.alpa.faktor} × ${rupiah(d.harian)} = ${rupiah(d.alpaRp)}` : 'Tidak ada'}{!c.alpa.aktif && ' (tidak dipotong)'}</dd>
        <dt>Terlambat</dt><dd>{d.r.telat.length ? <ul className="pd-l">{d.r.telat.map(([dd, mn], i) => { const k = d.kena.find((z) => z.d === dd); return <li key={i}>{tglPendek(dd)} · masuk {d.lates.find((z) => z.d === dd)?.jam || ''} ({mn} menit lewat batas) → {mn <= c.telat.toleransi ? 'dalam toleransi' : k ? rupiah(k.rp) : `bebas (keringanan ${c.telat.bebas}×/bulan)`}</li> })}</ul> : 'Tidak ada'}</dd>
        <dt>Cuti lebih jatah</dt><dd>{d.lebihHari ? `${d.lebihHari} hari × ${c.cutiLebih.faktor} × ${rupiah(d.harian)} = ${rupiah(d.cutiRp)}` : 'Tidak ada'}</dd>
        <dt>Total</dt><dd><b>{rupiah(d.total)}</b>{d.dibatasi && ` (dari ${rupiah(d.raw)}, dibatasi ${c.batas}% = ${rupiah(d.cap)})`}</dd>
      </dl>
    </div>
  )
}

function PotonganSetup({ go }) {
  const pc = usePerm(); const canU = !pc || pc.can('u')
  const s = useStore(); const [t, toast] = useToast(); const [bid, setBid] = useState(s.branches[0].id)
  const [all, setAll] = useState(() => structuredClone(s.attDeduct)); const f = all[bid] || structuredClone(DEDUCT_DEFAULT)
  const set = (patch) => setAll({ ...all, [bid]: { ...f, ...patch } })
  const setT = (patch) => set({ telat: { ...f.telat, ...patch } })
  const setTier = (i, patch) => setT({ tiers: f.telat.tiers.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const dirty = JSON.stringify(all[bid]) !== JSON.stringify(s.attDeduct[bid])
  const ex = s.employees.find((e) => e.branch === bid) || s.employees[0]
  const upah = upahDasar(ex, f, s.setup); const harian = upah / (f.pembagi === 'aktual' ? 21 : Number(f.pembagi))
  const bad = f.batas > 50 || f.batas < 1
  return (
    <>
      <Crumb items={[['Absensi', () => go('absensi')], ['Potongan Absensi', () => go('potongan-absensi')], ['Atur per Branch']]} />
      <PageHead title="Pengaturan Potongan Absensi" sub="Setiap Branch bisa punya aturan sendiri, atau dimatikan sama sekali." />
      <div className="tabs" role="tablist">{s.branches.map((x) => <button key={x.id} role="tab" aria-selected={bid === x.id} className={bid === x.id ? 'on' : ''} onClick={() => setBid(x.id)}>{x.name} {all[x.id]?.aktif ? '· aktif' : '· nonaktif'}</button>)}</div>
      <Card>
        <div className="ps-head"><Toggle on={f.aktif} onChange={(v) => set({ aktif: v })} label={`Hitung potongan absensi di ${s.branches.find((x) => x.id === bid).name}`} />
          <label className="fsel"><span>Salin dari</span><select disabled={!canU} value="" onChange={(e) => { if (e.target.value) { setAll({ ...all, [bid]: { ...structuredClone(all[e.target.value]), aktif: f.aktif } }); toast('Aturan disalin, periksa lalu simpan') } }}><option value="">Pilih branch</option>{s.branches.filter((x) => x.id !== bid).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>
        {!f.aktif && <Note>Potongan tidak dihitung untuk karyawan di branch ini. Aturan di bawah tetap tersimpan untuk dipakai nanti.</Note>}
        {!canU && <Note>Akunmu hanya bisa melihat aturan potongan. Perubahan butuh izin Ubah di Potongan Absensi.</Note>}
        <fieldset className="ps" disabled={!f.aktif || !canU}>
          <h3>Dasar perhitungan</h3>
          <div className="form two">
            <Field label="Dasar upah"><select value={f.dasar} onChange={(e) => set({ dasar: e.target.value })}><option value="thp">Take home pay (THP)</option><option value="gp">Gaji pokok (rumus remunerasi)</option></select></Field>
            <Field label="Pembagi upah harian"><select value={f.pembagi} onChange={(e) => set({ pembagi: e.target.value })}><option value="aktual">Hari kerja aktual bulan itu</option>{['21', '22', '25', '26', '30'].map((v) => <option key={v} value={v}>{v} hari</option>)}</select></Field>
            <Field label="Batas maksimal potongan per bulan" hint={bad ? 'Maksimal 50% dari upah (PP 36/2021 Pasal 65).' : 'Dari dasar upah. Maksimal 50% sesuai PP 36/2021 Pasal 65.'}><span className="suf"><input type="number" min="1" max="50" value={f.batas} onChange={(e) => set({ batas: Number(e.target.value) })} /><i>%</i></span></Field>
          </div>
          <h3><Toggle on={f.alpa.aktif} onChange={(v) => set({ alpa: { ...f.alpa, aktif: v } })} label="Tidak hadir tanpa absen" /></h3>
          {f.alpa.aktif && <div className="form two"><Field label="Potongan per hari" hint={`Contoh ${ex.name}: ${rupiah(harian * f.alpa.faktor)} per hari`}><span className="suf"><input type="number" step="0.25" min="0" value={f.alpa.faktor} onChange={(e) => set({ alpa: { ...f.alpa, faktor: Number(e.target.value) } })} /><i>× upah harian</i></span></Field></div>}
          <h3><Toggle on={f.telat.aktif} onChange={(v) => setT({ aktif: v })} label="Terlambat absen masuk" /></h3>
          {f.telat.aktif && <>
            <div className="form two">
              <Field label="Toleransi"><span className="suf"><input type="number" min="0" value={f.telat.toleransi} onChange={(e) => setT({ toleransi: Number(e.target.value) })} /><i>menit</i></span></Field>
              <Field label="Keringanan per bulan" hint="Jumlah keterlambatan pertama tiap bulan yang tidak dipotong."><span className="suf"><input type="number" min="0" value={f.telat.bebas} onChange={(e) => setT({ bebas: Number(e.target.value) })} /><i>kali</i></span></Field>
            </div>
            <fieldset className="rg"><legend>Cara hitung</legend>
              {[['tier', 'Bertingkat menurut lama terlambat'], ['menit', 'Per menit lewat toleransi'], ['kejadian', 'Nominal tetap per kejadian']].map(([k, l]) => <label key={k} className="chk-l"><input type="radio" name="tm" checked={f.telat.mode === k} onChange={() => setT({ mode: k })} />{l}</label>)}
            </fieldset>
            {f.telat.mode === 'tier' && <div className="tier">
              <div className="tier-h"><span>Dari (menit)</span><span>Sampai (menit)</span><span>Potongan</span><span /></div>
              {f.telat.tiers.map((x, i) => <div key={i} className="tier-r">
                <input type="number" aria-label="Dari menit" value={x.dari} onChange={(e) => setTier(i, { dari: Number(e.target.value) })} />
                <input type="number" aria-label="Sampai menit" placeholder="dst." value={x.sampai} onChange={(e) => setTier(i, { sampai: e.target.value === '' ? '' : Number(e.target.value) })} />
                <span className="tier-v"><input type="number" aria-label="Nilai potongan" step={x.jenis === 'hari' ? 0.25 : 1000} value={x.nilai} onChange={(e) => setTier(i, { nilai: Number(e.target.value) })} /><select aria-label="Jenis potongan" value={x.jenis} onChange={(e) => setTier(i, { jenis: e.target.value })}><option value="nominal">Rupiah</option><option value="hari">× upah harian</option></select></span>
                <button className="icon-btn" aria-label="Hapus tingkat" onClick={() => setT({ tiers: f.telat.tiers.filter((_, k) => k !== i) })}><Icon name="trash" size={18} /></button>
              </div>)}
              <Btn kind="ghost" icon="plus" onClick={() => { const last = f.telat.tiers[f.telat.tiers.length - 1]; setT({ tiers: [...f.telat.tiers, { dari: (Number(last?.sampai) || f.telat.toleransi) + 1, sampai: '', jenis: 'nominal', nilai: 50000 }] }) }}>Tambah tingkat</Btn>
            </div>}
            {f.telat.mode === 'menit' && <div className="form two"><Field label="Potongan per menit"><span className="suf pre"><i>Rp</i><input type="number" step="500" value={f.telat.perMenit} onChange={(e) => setT({ perMenit: Number(e.target.value) })} /></span></Field></div>}
            {f.telat.mode === 'kejadian' && <div className="form two"><Field label="Potongan per kejadian"><span className="suf pre"><i>Rp</i><input type="number" step="5000" value={f.telat.perKejadian} onChange={(e) => setT({ perKejadian: Number(e.target.value) })} /></span></Field></div>}
            <p className="muted sm">Contoh {ex.name}: terlambat 20 menit = {rupiah(telatRp(f, 20, harian))} · 45 menit = {rupiah(telatRp(f, 45, harian))} · 90 menit = {rupiah(telatRp(f, 90, harian))}</p>
          </>}
          <h3><Toggle on={f.cutiLebih.aktif} onChange={(v) => set({ cutiLebih: { ...f.cutiLebih, aktif: v } })} label="Cuti melebihi jatah (cuti di luar tanggungan)" /></h3>
          {f.cutiLebih.aktif && <div className="form two"><Field label="Potongan per hari lebih"><span className="suf"><input type="number" step="0.25" min="0" value={f.cutiLebih.faktor} onChange={(e) => set({ cutiLebih: { ...f.cutiLebih, faktor: Number(e.target.value) } })} /><i>× upah harian</i></span></Field></div>}
        </fieldset>
        <div className="row-end"><Btn kind="ghost" disabled={!dirty} onClick={() => setAll({ ...all, [bid]: structuredClone(s.attDeduct[bid]) })}>Batalkan</Btn><Btn perm="u" disabled={!dirty || bad} onClick={() => { api.saveAttDeduct(bid, all[bid]); toast('Pengaturan potongan disimpan') }}>Simpan</Btn></div>
      </Card>
      <Note>Potongan upah wajib diatur di perjanjian kerja, peraturan perusahaan, atau PKB, dan totalnya maksimal 50% dari upah yang diterima (PP 36/2021 Pasal 63 & 65). Pastikan aturan ini sudah tertulis di peraturan perusahaan tiap Branch.</Note>
      {t}
    </>
  )
}

// ===================================================== SETUP AKTIVITAS › KALENDER KERJA & SHIFT
const HARI = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [7, 'Min']]
const JENIS_LIBUR = ['Libur nasional', 'Cuti bersama', 'Libur perusahaan']
const HL_T = { 'Libur nasional': 'bad', 'Cuti bersama': 'warn', 'Libur perusahaan': 'neutral' }
export function KalenderKerja() {
  const pc = usePerm(); const canU = !pc || pc.can('u')
  const s = useStore(); const [t, toast] = useToast(); const [y, setY] = useState(2026); const [ed, setEd] = useState(null); const [del, setDel] = useState(null)
  const brName = (id) => s.branches.find((b) => b.id === id)?.name
  const list = s.holidays.filter((h) => h.tanggal.startsWith(String(y))).sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const full = (bid) => { let n = 0; for (let m = 1; m <= 12; m++) { const d = new Date(y, m, 0).getDate(); for (let dd = 1; dd <= d; dd++) { const iso = `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`; const w = new Date(iso + 'T00:00:00').getDay() || 7; if ((s.workCal[bid]?.hari || []).includes(w) && !holidayOn(s, bid, iso)) n++ } } return n }
  const ok = ed && ed.tanggal && ed.nama.trim() && (ed.semua || ed.branches.length)
  return (
    <>
      <div className="filters"><label className="fsel"><span>Tahun</span><select value={y} onChange={(e) => setY(Number(e.target.value))}>{[2025, 2026, 2027].map((v) => <option key={v} value={v}>{v}</option>)}</select></label></div>
      <div className="kal-br">{s.branches.map((b) => { const c = s.workCal[b.id] || { hari: [1, 2, 3, 4, 5], cutiBersama: 'libur' }; return (
        <Card key={b.id} title={b.name} action={<span className="muted sm">{full(b.id)} hari kerja di {y}</span>}>
          <span className="field-l">Hari kerja</span>
          <div className="day-chips">{HARI.map(([k, l]) => <button key={k} type="button" disabled={!canU} title={canU ? undefined : 'Akunmu tidak punya izin mengubah data'} aria-pressed={c.hari.includes(k)} className={c.hari.includes(k) ? 'on' : ''} onClick={() => { const hari = c.hari.includes(k) ? c.hari.filter((x) => x !== k) : [...c.hari, k].sort(); if (!hari.length) return; api.saveWorkCal(b.id, { ...c, hari }); toast(`Hari kerja ${b.name} diperbarui`) }}>{l}</button>)}</div>
          <Field label="Cuti bersama"><select disabled={!canU} value={c.cutiBersama} onChange={(e) => { api.saveWorkCal(b.id, { ...c, cutiBersama: e.target.value }); toast('Pengaturan cuti bersama disimpan') }}><option value="libur">Libur, tidak memotong cuti tahunan</option><option value="potong">Libur, memotong jatah cuti tahunan</option><option value="masuk">Tetap masuk kerja</option></select></Field>
        </Card>) })}</div>
      <Card title={`Libur nasional, cuti bersama & libur perusahaan ${y}`} action={<Btn icon="plus" onClick={() => setEd({ id: null, tanggal: `${y}-01-01`, nama: '', jenis: 'Libur perusahaan', semua: false, branches: [] })}>Tambah libur</Btn>} pad={false}>
        <Table rows={list} empty="Belum ada hari libur di tahun ini." cols={[
          { h: 'Tanggal', r: (h) => <span className="nowrap">{fmtDate(h.tanggal)} <span className="muted sm">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(h.tanggal + 'T00:00:00').getDay()]}</span></span> },
          { h: 'Keterangan', r: (h) => <strong>{h.nama}</strong> }, { h: 'Jenis', r: (h) => <Badge t={HL_T[h.jenis]}>{h.jenis}</Badge> },
          { h: 'Berlaku untuk', r: (h) => h.branches?.length ? h.branches.map(brName).join(', ') : 'Semua Branch' },
          { h: '', r: (h) => <div className="row-act"><button className="icon-btn" aria-label={'Edit ' + h.nama} onClick={() => setEd({ ...h, semua: !h.branches?.length, branches: h.branches || [] })}><Icon name="edit" size={18} /></button><button className="icon-btn" aria-label={'Hapus ' + h.nama} onClick={() => setDel(h)}><Icon name="trash" size={18} /></button></div> },
        ]} />
      </Card>
      <Note>Libur nasional dan cuti bersama 2025–2026 sesuai SKB 3 Menteri. Hari libur dan hari di luar hari kerja tidak dihitung sebagai tidak absen, dan tidak memotong cuti saat karyawan mengajukan cuti.</Note>
      <BlackoutEditor canU={canU} />
      <RekapBulanan year={y} />
      <Modal open={!!ed} title={ed?.id ? 'Edit hari libur' : 'Tambah hari libur'} onClose={() => setEd(null)} footer={<><Btn kind="ghost" onClick={() => setEd(null)}>Batal</Btn><Btn disabled={!ok} onClick={() => { api.saveHoliday(ed.id, { tanggal: ed.tanggal, nama: ed.nama.trim(), jenis: ed.jenis, branches: ed.semua ? [] : ed.branches }); setEd(null); toast('Hari libur disimpan') }}>Simpan</Btn></>}>
        {ed && <div className="form">
          <div className="form two"><Field label="Tanggal"><input type="date" value={ed.tanggal} onChange={(e) => setEd({ ...ed, tanggal: e.target.value })} /></Field>
            <Field label="Jenis"><select value={ed.jenis} onChange={(e) => setEd({ ...ed, jenis: e.target.value })}>{JENIS_LIBUR.map((j) => <option key={j}>{j}</option>)}</select></Field></div>
          <Field label="Keterangan"><input value={ed.nama} onChange={(e) => setEd({ ...ed, nama: e.target.value })} placeholder="Contoh: HUT perusahaan" /></Field>
          <fieldset className="rg"><legend>Berlaku untuk</legend>
            <label className="chk-l"><input type="checkbox" checked={ed.semua} onChange={(e) => setEd({ ...ed, semua: e.target.checked })} />Semua Branch</label>
            {!ed.semua && s.branches.map((b) => <label key={b.id} className="chk-l"><input type="checkbox" checked={ed.branches.includes(b.id)} onChange={(e) => setEd({ ...ed, branches: e.target.checked ? [...ed.branches, b.id] : ed.branches.filter((x) => x !== b.id) })} />{b.name}</label>)}
          </fieldset>
        </div>}
      </Modal>
      <Modal open={!!del} title="Hapus hari libur" onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn><Btn kind="danger" onClick={() => { api.deleteHoliday(del.id); setDel(null); toast('Hari libur dihapus') }}>Hapus</Btn></>}><p>Hapus <b>{del?.nama}</b> ({del && fmtDate(del.tanggal)})? Rekap absensi di tanggal itu akan dihitung ulang sebagai hari kerja.</p></Modal>
      {t}
    </>
  )
}
export function ShiftSetup() {
  const s = useStore(); const [t, toast] = useToast(); const [ed, setEd] = useState(null); const [del, setDel] = useState(null)
  const n = (x) => s.employees.filter((e) => (e.shift || s.shifts[0].name) === x.name).length
  const ok = ed && ed.name.trim() && ed.masuk && ed.batas >= ed.masuk && ed.pulang > ed.masuk && !s.shifts.some((x) => x.name.toLowerCase() === ed.name.trim().toLowerCase() && x.id !== ed.id)
  return (
    <>
      <Card title="Jam kerja per shift" action={<Btn icon="plus" onClick={() => setEd({ id: null, name: '', masuk: '08:00', batas: '08:15', pulang: '17:00' })}>Tambah shift</Btn>} pad={false}>
        <Table rows={s.shifts} cols={[
          { h: 'Shift', r: (x) => <strong>{x.name}</strong> }, { h: 'Jam masuk', k: 'masuk' }, { h: 'Batas masuk (terlambat setelah)', r: (x) => <b>{x.batas}</b> }, { h: 'Jam pulang', k: 'pulang' },
          { h: 'Karyawan', r: (x) => `${n(x)} orang` },
          { h: '', r: (x) => <div className="row-act"><button className="icon-btn" aria-label={'Edit ' + x.name} onClick={() => setEd({ ...x })}><Icon name="edit" size={18} /></button><button className="icon-btn" aria-label={'Hapus ' + x.name} disabled={n(x) > 0} title={n(x) ? 'Masih dipakai karyawan' : 'Hapus'} onClick={() => setDel(x)}><Icon name="trash" size={18} /></button></div> },
        ]} />
      </Card>
      <Note>Terlambat dihitung bila absen masuk melewati batas masuk shift. Shift tiap karyawan diatur di Data Karyawan. Hari kerja mengikuti kalender kerja Branch.</Note>
      <Modal open={!!ed} title={ed?.id ? 'Edit shift' : 'Tambah shift'} onClose={() => setEd(null)} footer={<><Btn kind="ghost" onClick={() => setEd(null)}>Batal</Btn><Btn disabled={!ok} onClick={() => { api.saveShift(ed.id, { name: ed.name.trim(), masuk: ed.masuk, batas: ed.batas, pulang: ed.pulang }); setEd(null); toast('Shift disimpan') }}>Simpan</Btn></>}>
        {ed && <div className="form"><Field label="Nama shift"><input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} placeholder="Contoh: Shift Malam" /></Field>
          <div className="form two"><Field label="Jam masuk"><input type="time" value={ed.masuk} onChange={(e) => setEd({ ...ed, masuk: e.target.value })} /></Field><Field label="Batas masuk" hint="Absen setelah jam ini = terlambat."><input type="time" value={ed.batas} onChange={(e) => setEd({ ...ed, batas: e.target.value })} /></Field>
            <Field label="Jam pulang"><input type="time" value={ed.pulang} onChange={(e) => setEd({ ...ed, pulang: e.target.value })} /></Field></div></div>}
      </Modal>
      <Modal open={!!del} title="Hapus shift" onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn><Btn kind="danger" onClick={() => { api.deleteShift(del.id); setDel(null); toast('Shift dihapus') }}>Hapus</Btn></>}><p>Hapus <b>{del?.name}</b>?</p></Modal>
      {t}
    </>
  )
}
