// Rekap Saya (talent): ringkasan absensi, cuti, dan lembur per bulan dalam satu periode.
// Kotak rekap & baris bulan bisa diklik untuk menyaring tabel rincian. Bisa diunduh Excel/PDF.
import React, { useMemo, useState } from 'react'
import { useStore } from '../services/store.js'
import { Btn, Card, Badge, Table, useToast, Note, Icon } from '../components/ui.jsx'
import { ArtHead } from '../components/Sticker.jsx'
import { fmtDate } from './shared.jsx'
import { ME } from '../services/session.js'
import { attendanceDays, leaveDaysIn, durasiJam, BULAN_ID, isoOf } from '../services/rekap.js'
import { exportExcel, exportPdf } from '../services/export.js'

const BL3 = BULAN_ID.map((b) => b.slice(0, 3))
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const ym = (iso) => iso.slice(0, 7)
const ymLabel = (k) => `${BULAN_ID[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`

export function RekapT({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const now = new Date()
  const me = s.employees.find((e) => e.id === ME) || {}
  const Y = now.getFullYear(); const y0 = Number((me.start || `${Y}-01-01`).slice(0, 4))
  const years = []; for (let y = Y; y >= Math.max(y0, Y - 3); y--) years.push(y)
  const [thn, setThn] = useState(String(Y)); const [m1, setM1] = useState('1'); const [m2, setM2] = useState(String(now.getMonth() + 1))
  const [jenis, setJenis] = useState(''); const [st, setSt] = useState(''); const [bulan, setBulan] = useState(''); const [lim, setLim] = useState(31)
  const from = `${thn}-${String(Math.min(m1, m2)).padStart(2, '0')}-01`
  const to = isoOf(new Date(Number(thn), Math.max(m1, m2), 0))
  const D = useMemo(() => {
    const days = attendanceDays(s, ME, from, to)
    const leaves = s.leaves.filter((l) => l.emp === ME && (l.sampai || l.dari) >= from && l.dari <= to)
    const ots = s.overtimes.filter((o) => o.emp === ME && o.tanggal >= from && o.tanggal <= to)
    const months = []; for (let m = Math.min(m1, m2); m <= Math.max(m1, m2); m++) months.push(`${thn}-${String(m).padStart(2, '0')}`)
    const per = months.map((k) => {
      const d = days.filter((x) => ym(x.tanggal) === k)
      const lv = leaves.flatMap((l) => leaveDaysIn(s, l, me.branch, `${k}-01`, `${k}-31`).map(() => l))
      const ot = ots.filter((o) => ym(o.tanggal) === k)
      const kerja = d.length; const hadir = d.filter((x) => x.status === 'Hadir' || x.status === 'Terlambat').length
      return { k, kerja, tepat: d.filter((x) => x.status === 'Hadir').length, telat: d.filter((x) => x.status === 'Terlambat').length, menit: d.reduce((a, x) => a + (x.telat || 0), 0), alpa: d.filter((x) => x.status === 'Tidak absen').length,
        cuti: lv.filter((l) => l.status === 'Approved').length, cutiWait: leaves.filter((l) => l.status === 'Waiting' && ym(l.dari) === k).length,
        lembur: ot.filter((o) => o.status === 'Approved').reduce((a, o) => a + durasiJam(o), 0), lemburWait: ot.filter((o) => o.status === 'Waiting').reduce((a, o) => a + durasiJam(o), 0), lemburN: ot.length,
        pct: kerja - d.filter((x) => x.status === 'Cuti').length ? Math.round((hadir / (kerja - d.filter((x) => x.status === 'Cuti').length)) * 100) : null }
    })
    // Rincian gabungan
    const rows = [
      ...days.map((x) => ({ id: 'a' + x.tanggal, tanggal: x.tanggal, jenis: 'Absensi', status: x.status === 'Hadir' ? 'Tepat waktu' : x.status, ket: x.status === 'Cuti' ? x.ket : x.lokasi, jam: x.masuk !== '—' ? `${x.masuk}–${x.pulang}` : '—', telat: x.telat })),
      ...leaves.map((l) => ({ id: 'c' + l.id, tanggal: l.dari, sampai: l.sampai, jenis: 'Cuti', status: l.status, ket: `${l.jenis}${l.alasan ? ' · ' + l.alasan : ''}`, jam: `${l.hari || leaveDaysIn(s, l, me.branch, '0000', '9999').length} hari` })),
      ...ots.map((o) => ({ id: 'l' + o.id, tanggal: o.tanggal, jenis: 'Lembur', status: o.status, ket: `${o.judul || o.deskripsi || 'Lembur'}${o.tipe ? ' · ' + o.tipe : ''}`, jam: `${o.jam || ''}${o.jam ? ' · ' : ''}${durasiJam(o)} jam` })),
    ].sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.jenis.localeCompare(b.jenis))
    return { days, leaves, ots, per, rows }
  }, [s, from, to, thn, m1, m2])
  const sum = (k) => D.per.reduce((a, x) => a + x[k], 0)
  const tot = { kerja: sum('kerja'), tepat: sum('tepat'), telat: sum('telat'), menit: sum('menit'), alpa: sum('alpa'), cuti: sum('cuti'), cutiWait: D.leaves.filter((l) => l.status === 'Waiting').length, lembur: sum('lembur'), lemburWait: sum('lemburWait') }
  const hadirPct = tot.kerja - tot.cuti ? Math.round(((tot.tepat + tot.telat) / (tot.kerja - tot.cuti)) * 100) : 0
  const periode = `${BULAN_ID[Math.min(m1, m2) - 1]}${m1 !== m2 ? ' – ' + BULAN_ID[Math.max(m1, m2) - 1] : ''} ${thn}`
  const list = D.rows.filter((r) => (!jenis || r.jenis === jenis) && (!st || r.status === st) && (!bulan || ym(r.tanggal) === bulan))
  const toList = () => { setLim(31); setTimeout(() => document.getElementById('rk-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const tap = (j, s2) => { const same = jenis === j && st === s2; setJenis(same ? '' : j); setSt(same ? '' : s2); toList() }
  const TILES = [
    ['Absensi', 'Tepat waktu', 'checkCircle', '#0a5950', tot.tepat, `hari · kehadiran ${hadirPct}%`],
    ['Absensi', 'Terlambat', 'clock', '#d9a400', tot.telat, `kali · total ${tot.menit} menit`],
    ['Absensi', 'Tidak absen', 'x', '#c0452a', tot.alpa, 'hari tanpa keterangan'],
    ['Cuti', 'Approved', 'calendar', '#2a78d6', tot.cuti, `hari cuti${tot.cutiWait ? ` · ${tot.cutiWait} menunggu` : ''}`, 'Cuti disetujui'],
    ['Lembur', 'Approved', 'star', '#7a5af5', tot.lembur, `jam${tot.lemburWait ? ` · ${tot.lemburWait} jam menunggu` : ''}`, 'Lembur disetujui'],
  ]
  const dl = (kind) => {
    const a = { title: `Rekap ${me.name || ''} · ${periode}`, meta: `${me.role || ''} · ${s.branches.find((b) => b.id === me.branch)?.name || ''}`, cols: ['Bulan', 'Hari kerja', 'Tepat waktu', 'Terlambat (kali)', 'Terlambat (menit)', 'Tidak absen', 'Cuti (hari)', 'Lembur (jam)', 'Kehadiran'],
      rows: D.per.map((x) => [ymLabel(x.k), x.kerja, x.tepat, x.telat, x.menit, x.alpa, x.cuti, x.lembur, x.pct == null ? '—' : x.pct + '%']), file: `rekap_${periode.replace(/[^a-z0-9]+/gi, '-')}` }
    const b = { title: `Rincian ${me.name || ''} · ${periode}`, meta: `${list.length} baris`, cols: ['Tanggal', 'Jenis', 'Status', 'Keterangan', 'Jam / durasi'], rows: list.map((r) => [fmtDate(r.tanggal), r.jenis, r.status, r.ket || '', r.jam]), file: `rincian_${periode.replace(/[^a-z0-9]+/gi, '-')}` }
    try { if (kind === 'xls') { exportExcel(a); exportExcel(b) } else { exportPdf({ ...a, rows: [...a.rows, ['', '', '', '', '', '', '', '', ''], ...list.map((r) => [fmtDate(r.tanggal), r.jenis, r.status, r.ket || '', r.jam, '', '', '', ''])] }) } toast(kind === 'xls' ? 'Rekap & rincian diunduh (2 file Excel)' : 'Rekap diunduh sebagai PDF') } catch (e) { toast('Unduhan diblokir di pratinjau ini') }
  }
  const maxBar = Math.max(1, ...D.per.map((x) => x.kerja))
  return (
    <>
      <ArtHead art="notes" title="Rekap Saya" sub="Ringkasan absensi, cuti, dan lembur per bulan. Klik angka untuk melihat rinciannya." />
      <div className="filters">
        <label className="fsel"><span>Tahun</span><select value={thn} onChange={(e) => { setThn(e.target.value); setBulan('') }}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
        <label className="fsel"><span>Dari bulan</span><select value={m1} onChange={(e) => { setM1(e.target.value); setBulan('') }}>{BULAN_ID.map((b, i) => <option key={b} value={String(i + 1)}>{b}</option>)}</select></label>
        <label className="fsel"><span>Sampai bulan</span><select value={m2} onChange={(e) => { setM2(e.target.value); setBulan('') }}>{BULAN_ID.map((b, i) => <option key={b} value={String(i + 1)}>{b}</option>)}</select></label>
        <div className="filters-act"><Btn kind="ghost" icon="doc" onClick={() => dl('xls')}>Excel</Btn><Btn kind="ghost" icon="doc" onClick={() => dl('pdf')}>PDF</Btn></div>
      </div>

      <section className="rkt" aria-label={'Rekap ' + periode}>{TILES.map(([j, s2, ic, c, n, sub, lab]) => { const on = jenis === j && st === (j === 'Absensi' ? s2 : s2); return (
        <button key={j + s2} type="button" className={`rkt-tile ${on ? 'on' : ''}`} style={{ '--c': c }} aria-pressed={on} onClick={() => tap(j, s2)}>
          <span className="rkt-h"><Icon name={ic} size={18} />{lab || s2}</span><b>{n.toLocaleString('id-ID')}</b><small>{sub}</small></button>) })}</section>

      <Card title={`Per bulan · ${periode}`} pad={false}>
        <div className="tbl-wrap"><table className="tbl rk-month">
          <thead><tr><th style={{ textAlign: 'left' }}>Bulan</th><th>Hari kerja</th><th>Tepat waktu</th><th>Terlambat</th><th>Tidak absen</th><th>Cuti</th><th>Lembur</th><th style={{ textAlign: 'left' }}>Kehadiran</th></tr></thead>
          <tbody>{D.per.map((x) => { const on = bulan === x.k; const cell = (n, j, s2, txt) => <td><button type="button" className="rk-n" disabled={!n} onClick={(e) => { e.stopPropagation(); setBulan(x.k); setJenis(j); setSt(s2); toList() }}>{txt ?? n}</button></td>
            return <tr key={x.k} className={`clickable ${on ? 'on' : ''}`} onClick={() => { setBulan(on ? '' : x.k); setJenis(''); setSt(''); toList() }}>
              <td style={{ textAlign: 'left' }}><b>{ymLabel(x.k)}</b></td><td>{x.kerja || '—'}</td>
              {cell(x.tepat, 'Absensi', 'Tepat waktu')}{cell(x.telat, 'Absensi', 'Terlambat', x.telat ? `${x.telat}× · ${x.menit} mnt` : 0)}{cell(x.alpa, 'Absensi', 'Tidak absen')}
              {cell(x.cuti, 'Cuti', '', x.cuti ? `${x.cuti} hari${x.cutiWait ? ` +${x.cutiWait}⏳` : ''}` : x.cutiWait ? `${x.cutiWait}⏳` : 0)}{cell(x.lemburN, 'Lembur', '', x.lemburN ? `${x.lembur} jam${x.lemburWait ? ` +${x.lemburWait}⏳` : ''}` : 0)}
              <td style={{ textAlign: 'left' }}>{x.pct == null ? <span className="muted">—</span> : <span className="rk-bar"><i style={{ width: `${x.pct}%`, background: x.pct >= 95 ? 'var(--g)' : x.pct >= 85 ? '#d9a400' : 'var(--bad)' }} /><em>{x.pct}%</em></span>}</td></tr> })}</tbody>
          <tfoot><tr><td style={{ textAlign: 'left' }}><b>Total</b></td><td><b>{tot.kerja}</b></td><td><b>{tot.tepat}</b></td><td><b>{tot.telat}× · {tot.menit} mnt</b></td><td><b>{tot.alpa}</b></td><td><b>{tot.cuti} hari</b></td><td><b>{tot.lembur} jam</b></td><td style={{ textAlign: 'left' }}><b>{hadirPct}%</b></td></tr></tfoot>
        </table></div>
        <p className="muted sm rk-note">Klik nama bulan atau angkanya untuk melihat rinciannya di bawah. ⏳ = pengajuan yang masih menunggu approval. Kehadiran = hari hadir dibagi hari kerja di luar cuti.</p>
      </Card>

      <div id="rk-list" className="anchor list-head">
        <b>Rincian</b>
        <div className="seg" role="group" aria-label="Jenis">{[['', 'Semua'], ['Absensi', 'Absensi'], ['Cuti', 'Cuti'], ['Lembur', 'Lembur']].map(([v, l]) => <button key={l} type="button" className={jenis === v ? 'on' : ''} aria-pressed={jenis === v} onClick={() => { setJenis(v); setSt(''); setLim(31) }}>{l} {(v ? D.rows.filter((r) => r.jenis === v && (!bulan || ym(r.tanggal) === bulan)) : D.rows.filter((r) => !bulan || ym(r.tanggal) === bulan)).length}</button>)}</div>
        <label className="fsel sm-sel"><span className="sr-only">Bulan</span><select value={bulan} onChange={(e) => setBulan(e.target.value)}><option value="">Semua bulan di periode</option>{D.per.map((x) => <option key={x.k} value={x.k}>{ymLabel(x.k)}</option>)}</select></label>
        <span className="muted sm">{list.length} baris{st ? ` · ${st}` : ''}</span>
        {(jenis || st || bulan) && <button type="button" className="lnk sm" onClick={() => { setJenis(''); setSt(''); setBulan('') }}>Reset</button>}
      </div>
      <Card pad={false}><Table rows={list.slice(0, lim)} empty="Tidak ada data untuk filter ini." cols={[
        { h: 'Tanggal', r: (r) => <span className="nowrap">{HARI[new Date(r.tanggal).getDay()]}, {fmtDate(r.tanggal)}{r.sampai && r.sampai !== r.tanggal ? ` – ${fmtDate(r.sampai)}` : ''}</span> },
        { h: 'Jenis', r: (r) => <span className={`rk-j ${r.jenis.toLowerCase()}`}>{r.jenis}</span> },
        { h: 'Keterangan', r: (r) => r.ket || '—' },
        { h: 'Jam / durasi', r: (r) => <span className="nowrap">{r.jam}{r.telat ? <small className="muted"> · telat {r.telat} mnt</small> : null}</span> },
        { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} />
        {list.length > lim && <div className="more-row"><Btn kind="ghost" onClick={() => setLim(lim + 31)}>Tampilkan {Math.min(31, list.length - lim)} lagi</Btn><span className="muted sm">{lim} dari {list.length}</span></div>}
      </Card>
      <Note><div>Ada yang tidak sesuai? Ajukan <button type="button" className="lnk" onClick={() => go('cuti')}>cuti/izin</button> untuk hari berhalangan, atau hubungi HR lewat <button type="button" className="lnk" onClick={() => go('inbox')}>Inbox</button> untuk koreksi absen.</div></Note>
      {t}
    </>
  )
}
