import React, { useEffect, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { rupiah, calcRow } from '../services/payroll.js'
import { Btn, Card, Badge, Stat, Table, Tabs, Modal, Field, useToast, PageHead, Note, Icon, Empty } from '../components/ui.jsx'
import { aktifCuti, useLookup, fmtDate, ApprovalLine } from './shared.jsx'
import { DISCLAIMER } from '../data/disclaimer.js'
import { DocView } from './docEditor.jsx'
import { SelfieCamera } from '../components/Camera.jsx'
import { Sticker, ArtHead } from '../components/Sticker.jsx'
import { talentPhase } from '../services/talentAccess.js'
import { BerandaKandidat } from './talentKarier.jsx'
import { ClockModal, SyncChip, AntreanAbsen } from '../components/OfflineAbsen.jsx'
import { useOutbox } from '../../services/outbox.js'

import { ME } from '../services/session.js'
import { attendanceDays, isoOf } from '../services/rekap.js'
import { exportExcel, exportPdf } from '../services/export.js'
import { isWorkday } from '../../services/attendance.js'
// Lokasi & jam kerja mengikuti Branch dan shift karyawan (Setup Absen per Branch)
export function kerjaInfo(s, me) {
  const set = s.absenSetup?.[me.branch] || {}
  const lok = (set.lokasi || []).find((l) => l.aktif) || { nama: 'Kantor', radius: 100 }
  const sh = (set.shifts || []).find((x) => x.nama === me.shift && x.aktif) || (set.shifts || []).find((x) => x.aktif) || { nama: 'Shift 1', masukDari: '08:30', masukSampai: '09:00', pulangDari: '17:00', pulangSampai: '17:59' }
  return { lok, sh }
}
const useNow = () => { const [n, setN] = useState(new Date()); useEffect(() => { const t = setInterval(() => setN(new Date()), 1000); return () => clearInterval(t) }, []); return n }

export function Beranda({ go }) {
  const s0 = useStore(); const s = s0.clock?.emp === ME ? s0 : { ...s0, clock: { in: null, out: null } }; const now = useNow(); const [t, toast] = useToast(); const [cam, setCam] = useState(null); const [foto, setFoto] = useState('')
  const me = s.employees.find((e) => e.id === ME) || {}
  const ob = useOutbox(); const recOf = (k) => ob.find((r) => r.id === s.clock[k + 'Rec'])
  const sapa = me.kelamin === 'Laki-laki' ? 'hai_l' : (me.sapa || 'halo') // karakter sapaan mengikuti jenis kelamin; perempuan bisa memilih
  const { lok, sh } = kerjaInfo(s, me); const dot = (x) => x.replace(':', '.')
  const holiday = !isWorkday(s, me.branch || 'b1', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
  const used = s.leaves.filter((l) => l.emp === ME && l.status === 'Approved' && l.jenis === 'Cuti Tahunan').reduce((a, b) => a + b.hari, 0)
  const phase = talentPhase(s, ME)
  if (phase === 'selesai') return <BerandaAlumni go={go} me={me} />
  if (phase === 'kandidat') return <BerandaKandidat go={go} />
  const rsOk = phase === 'resign' ? s.resigns.find((r) => r.emp === ME && r.status === 'Approved') : null
  const quick = [['absensi', 'Absensi', 'clock'], ['cuti', 'Cuti', 'calendar'], ['lembur', 'Lembur', 'star'], ['reimbursement', 'Reimburse', 'receipt'], ['payslip', 'Payslip', 'wallet'], ['kontrak', 'Kontrak', 'doc'], ['inventaris', 'Inventaris', 'box'], ['resign', 'Resign', 'door']]
  return (
    <>
      <section className="hello-hero"><div className="grow"><h1>{s.clock.out ? `Kerja bagus hari ini, ${(me.name || 'Putri').split(' ')[0]}!` : (now.getHours() < 11 ? 'Selamat pagi' : now.getHours() < 15 ? 'Selamat siang' : now.getHours() < 18 ? 'Selamat sore' : 'Selamat malam') + `, ${(me.name || 'Putri').split(' ')[0]}!`}</h1><p className="muted"><Icon name="pin" size={14} /> {lok.nama} · {sh.nama} ({sh.masukDari}–{sh.pulangSampai})</p><p className="hello-sub">{s.clock.out ? 'Absen pulang sudah tercatat. Selamat istirahat!' : s.clock.in ? 'Semangat bekerja, jangan lupa clock out nanti ya.' : holiday ? 'Hari ini libur, nikmati waktumu.' : `Jangan lupa clock in sebelum ${dot(sh.masukSampai)} ya.`}</p></div><div className="hello-art"><Sticker name={s.clock.out ? 'rayakan' : sapa} size={150} className="hello-img" />{me.kelamin !== 'Laki-laki' && !s.clock.out && <button type="button" className="hello-swap" onClick={() => api.setPref(ME, 'sapa', sapa === 'halo' ? 'hai_p' : 'halo')} aria-label="Ganti karakter sapaan" title="Ganti karakter sapaan"><Icon name="refresh" size={16} /></button>}</div></section>
      {phase === 'resign' && <Note><div>Pengajuan resign-mu sudah disetujui{rsOk ? <> · hari kerja terakhir <b>{fmtDate(rsOk.lastDay)}</b></> : ''}. Absen, cuti, dan menu kerja lain tetap jalan sampai kontrak berakhir.</div></Note>}
      <section className="clk3" aria-label="Absensi hari ini">
        <div className="clk-now"><Sticker name="jam" size={128} className="clk-now-img" /><div className="clk-t">{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}<small> WIB</small></div><div className="clk-d">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} · {sh.nama}</div>
          {holiday && !s.clock.in && <span className="clk-hol">Hari libur, bebas absen</span>}</div>
        {[['in', 'Masuk', 'Clock in', `Batas ${dot(sh.masukDari)}–${dot(sh.masukSampai)}`], ['out', 'Pulang', 'Clock out', `Mulai ${dot(sh.pulangSampai)}`]].map(([k, l, btn, hint]) => {
          const done = s.clock[k]; const can = !done && !(holiday && !s.clock.in) && (k === 'in' || !!s.clock.in)
          return (
            <div key={k} className={`clk-tile ${done ? 'done' : ''}`}>
              <Sticker name={k === 'in' ? 'masuk' : 'pulang'} size={96} className="clk-img" />
              <span className="clk-l"><Icon name={k === 'in' ? 'clock' : 'door'} size={16} />{l}</span>
              <b className="clk-v">{done ? done.replace(':', '.') : '--.--'}</b>
              <small className="clk-h">{done ? (k === 'in' && done > sh.masukSampai ? 'Terlambat' : 'Tercatat') : hint}</small>
              {done ? <span className="clk-ok">{recOf(k) ? <SyncChip rec={recOf(k)} /> : <><Icon name="checkCircle" size={16} />Selesai</>}</span>
                : <button type="button" className="clk-btn" disabled={!can} onClick={() => setCam(k)}><Icon name="camera" size={16} />{btn}</button>}
            </div>)
        })}
      </section>
      <div className="quick">{quick.map(([k, l, ic]) => <button key={k} onClick={() => go(k)}><span><Icon name={ic} /></span>{l}</button>)}</div>
      <div className="grid2">
        <Card title="Saldo cuti"><div className="ring-row">{aktifCuti(s, ME).slice(0, 3).map((lt) => { const u = lt.name === 'Cuti Tahunan' ? used : 0; return <div key={lt.name} className="ring" style={{ '--p': (1 - u / lt.kuota) * 100 }}><b>{lt.kuota - u}</b><small>{lt.name.replace('Cuti ', '')}</small></div> })}</div></Card>
        <Card title="Pengumuman">{s.blasts.slice(0, 3).map((b) => <div key={b.judul} className="ann"><Icon name="megaphone" /><div><strong>{b.judul}</strong><small>{fmtDate(b.tanggal)}</small></div></div>)}</Card>
      </div>
      {cam && <ClockModal kind={cam} me={me} onClose={() => setCam(null)} onDone={(rec) => { const k = cam; setCam(null); toast(rec.offline ? 'Absen tersimpan di HP · dikirim otomatis saat ada sinyal' : k === 'in' ? 'Selamat bekerja! 💪' : 'Kerja bagus, terima kasih untuk hari ini!') }} />}{t}
    </>
  )
}

// Attendance log: filter Bulan & Tahun (ada pilihan "Semua"), rangkuman tepat waktu / terlambat / tidak absen + kata penyemangat
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const SEMANGAT_TELAT = [
  'Yuk, coba berangkat 15 menit lebih awal besok. Sedikit lebih pagi, harimu jadi jauh lebih tenang 💪',
  'Pasang alarm kedua dan siapkan barang dari malam sebelumnya. Kamu pasti bisa tepat waktu! ✨',
  'Datang tepat waktu itu kebiasaan kecil yang bikin kerjaan terasa lebih ringan. Mulai lagi besok, ya!',
]
const SEMANGAT_TEPAT = [
  'Keren! Kamu konsisten datang tepat waktu. Pertahankan ritme ini ya 🌟',
  'Disiplinmu patut diacungi jempol. Terus jaga kebiasaan baik ini! 👏',
  'Tepat waktu terus, mantap! Kebiasaan ini bikin timmu makin percaya sama kamu 💚',
]
export const isTelat = (a) => a.status === 'Terlambat'
export const isTepat = (a) => a.status === 'Hadir'
export const isMiss = (a) => /alpha|tidak hadir|mangkir|tidak absen/i.test(a.status)
export function AbsensiT({ go, sub }) {
  if (sub === 'antrean') return <AntreanAbsen go={go} />
  return <AbsensiLog go={go} />
}
function AbsensiLog({ go }) {
  const ob = useOutbox().filter((r) => r.emp === ME && r.status !== 'sent')
  const s = useStore(); const now = new Date(); const [t, toast] = useToast()
  const [bln, setBln] = useState(String(now.getMonth() + 1)); const [thn, setThn] = useState(String(now.getFullYear()))
  const [fst, setFst] = useState(''); const [lim, setLim] = useState(31)
  const me = s.employees.find((e) => e.id === ME) || {}
  const y0 = Number((me.start || '2025-01-01').slice(0, 4))
  const years = []; for (let y = now.getFullYear(); y >= Math.max(y0, now.getFullYear() - 3); y--) years.push(y)
  const from = thn === 'semua' ? (me.start || '2025-01-01') : bln === 'semua' ? `${thn}-01-01` : `${thn}-${String(bln).padStart(2, '0')}-01`
  const to = thn === 'semua' ? isoOf(now) : bln === 'semua' ? `${thn}-12-31` : isoOf(new Date(Number(thn), Number(bln), 0))
  const all = attendanceDays(s, ME, from, to)
  const rows = all.filter((r) => !fst || r.status === fst)
  const tepat = all.filter(isTepat).length; const telat = all.filter(isTelat).length; const miss = all.filter(isMiss).length; const cuti = all.filter((r) => r.status === 'Cuti').length
  const periode = `${bln === 'semua' ? 'semua bulan' : BULAN_ID[bln - 1]}${thn === 'semua' ? ' · semua tahun' : ' ' + thn}`
  const pick = (arr) => arr[(Number(bln === 'semua' ? 0 : bln) + Number(thn === 'semua' ? 0 : thn)) % arr.length]
  const mood = telat > tepat ? 'telat' : tepat > telat ? 'tepat' : (tepat + telat) ? 'imbang' : 'kosong'
  const tap = (k) => { setFst(fst === k ? '' : k); setLim(31); setTimeout(() => document.getElementById('att-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const dl = (kind) => { const payload = { title: `Absensi ${me.name || ''} · ${periode}`, meta: `${rows.length} hari${fst ? ' · ' + fst : ''}`, cols: ['Tanggal', 'Hari', 'Masuk', 'Pulang', 'Lokasi', 'Status'], rows: rows.map((r) => [fmtDate(r.tanggal), HARI[new Date(r.tanggal).getDay()], r.masuk, r.pulang, r.lokasi, r.status]), file: `absensi_${periode.replace(/[^a-z0-9]+/gi, '-')}` }
    try { kind === 'xls' ? exportExcel(payload) : exportPdf(payload); toast(`${rows.length} baris diunduh`) } catch (e) { toast('Unduhan diblokir di pratinjau ini') } }
  const tiles = [['Hadir', 'ok', 'checkCircle', tepat, 'Tepat waktu'], ['Terlambat', 'warn', 'clock', telat, 'Terlambat'], ['Tidak absen', 'bad', 'x', miss, 'Tidak absen'], ['Cuti', 'cuti', 'calendar', cuti, 'Cuti & izin']]
  return <><ArtHead art="masuk" title="Attendance log" sub="Riwayat absen dari web & app, lengkap dengan jam masuk dan pulang."><Btn kind="ghost" icon="refresh" onClick={() => go('absensi/antrean')}>Antrean kirim{ob.length ? ` (${ob.length})` : ''}</Btn></ArtHead>
    {ob.length > 0 && <Note><div><b>{ob.length} absen belum terkirim.</b> Tersimpan aman di HP dan akan muncul di riwayat setelah terkirim. <button type="button" className="lnk" onClick={() => go('absensi/antrean')}>Lihat antrean</button></div></Note>}
    <div className="filters">
      <label className="fsel"><span>Bulan</span><select value={bln} onChange={(e) => { setBln(e.target.value); setLim(31) }}><option value="semua">Semua bulan</option>{BULAN_ID.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}</select></label>
      <label className="fsel"><span>Tahun</span><select value={thn} onChange={(e) => { setThn(e.target.value); setLim(31) }}><option value="semua">Semua tahun</option>{years.map((y) => <option key={y} value={String(y)}>{y}</option>)}</select></label>
      <div className="filters-act"><Btn kind="ghost" icon="chart" onClick={() => go('rekap')}>Rekap per bulan</Btn><Btn kind="ghost" icon="doc" onClick={() => dl('xls')}>Excel</Btn><Btn kind="ghost" icon="doc" onClick={() => dl('pdf')}>PDF</Btn></div>
    </div>
    <section className="att-sum four" aria-label={'Rangkuman absensi ' + periode}>
      {tiles.map(([k, cls, ic, n, l]) => <button key={k} type="button" className={`att-stat ${cls} ${fst === k ? 'on' : ''}`} aria-pressed={fst === k} onClick={() => tap(k)} title={`Tampilkan hari ${l.toLowerCase()} di tabel`}><Icon name={ic} size={20} /><b>{n}</b><span>{l}</span></button>)}
      {mood !== 'kosong' && <div className={`att-msg ${mood}`}><Sticker name={mood === 'telat' ? 'jam' : mood === 'tepat' ? 'jempol' : 'kerja'} size={72} />
        <div><strong>{mood === 'telat' ? 'Ayo, kamu bisa lebih tepat waktu!' : mood === 'tepat' ? 'Mantap, pertahankan!' : 'Hampir seimbang, sedikit lagi!'}</strong>
          <p>{mood === 'telat' ? pick(SEMANGAT_TELAT) : mood === 'tepat' ? pick(SEMANGAT_TEPAT) : 'Jumlah tepat waktu dan terlambatmu masih sama. Tambah satu hari tepat waktu lagi supaya kebiasaan baiknya menang 💪'}
            {miss > 0 && <> Ada <b>{miss} hari</b> tanpa absen di {periode}. Kalau berhalangan, ajukan cuti atau kabari atasan supaya tidak dihitung tidak hadir.</>}</p></div></div>}
    </section>
    <div id="att-list" className="anchor list-head"><b>{rows.length} hari</b><span className="muted sm"> · {periode}{fst ? ` · ${tiles.find((x) => x[0] === fst)[4]}` : ''}</span>{fst && <button type="button" className="lnk sm" onClick={() => setFst('')}>Tampilkan semua</button>}</div>
    <Card pad={false}><Table rows={rows.slice(0, lim)} empty={`Belum ada catatan absensi untuk ${periode}.`} cols={[{ h: 'Tanggal', r: (r) => <span className="nowrap">{HARI[new Date(r.tanggal).getDay()]}, {fmtDate(r.tanggal)}</span> }, { h: 'Masuk', k: 'masuk' }, { h: 'Pulang', k: 'pulang' }, { h: 'Lokasi', r: (r) => r.ket || r.lokasi }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} />
      {rows.length > lim && <div className="more-row"><Btn kind="ghost" onClick={() => setLim(lim + 31)}>Tampilkan {Math.min(31, rows.length - lim)} hari lagi</Btn><span className="muted sm">{lim} dari {rows.length}</span></div>}</Card>{t}</>
}

// Beranda saat kontrak sudah berakhir (belum ada kontrak baru): menu kerja disembunyikan, fokus ke karier berikutnya
function BerandaAlumni({ go, me }) {
  const s = useStore(); const br = s.branches.find((b) => b.id === me.branch)?.name || 'perusahaan sebelumnya'
  const quick = [['lowongan', 'Lowongan', 'briefcase'], ['jadwal', 'Wawancara', 'calendar'], ['pretest', 'Pre-test', 'test'], ['payslip', 'Payslip', 'wallet'], ['kontrak', 'Kontrak', 'doc'], ['biodata', 'Biodata', 'user']]
  return <>
    <section className="hello-hero"><div className="grow"><h1>Halo, {(me.name || 'Putri').split(' ')[0]}! Siap untuk langkah berikutnya?</h1>
      <p className="hello-sub">Kontrakmu di <b>{br}</b> sudah berakhir. Terima kasih untuk kerja kerasnya! Sekarang kamu bisa melamar lowongan baru, mengerjakan pre-test, dan tetap membuka payslip lama kapan saja.</p></div>
      <div className="hello-art"><Sticker name="rayakan" size={150} className="hello-img" /></div></section>
    <div className="quick">{quick.map(([k, l, ic]) => <button key={k} onClick={() => go(k)}><span><Icon name={ic} /></span>{l}</button>)}</div>
    <Note><div>Absensi, cuti, lembur, reimbursement, inventaris, resign, event, karyawan, feedback, dan Reviews & More disembunyikan sampai kamu punya kontrak baru di perusahaan pengguna Kirana.</div></Note>
  </>
}

function RequestPage({ title, sub, col, modul, cols, form, validate, summary }) {
  const s = useStore(); const [t, toast] = useToast(); const [open, setOpen] = useState(false); const [tab, setTab] = useState('All'); const [detail, setDetail] = useState(null); const [err, setErr] = useState('')
  const [f, setF] = useState(form.init)
  const rows = s[col].filter((x) => x.emp === ME && (tab === 'All' || x.status === tab))
  return (
    <>
      <PageHead title={title} sub={sub}><Btn icon="plus" onClick={() => { setOpen(true); setErr(''); setF(form.init) }}>Ajukan</Btn></PageHead>
      {summary}
      <Tabs tabs={['All', 'Approved', 'Waiting', 'Rejected']} value={tab} onChange={setTab} />
      <Card pad={false}><Table rows={rows} onRow={setDetail} empty="Belum ada pengajuan." cols={[...cols, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }]} /></Card>
      <Modal open={open} title={'Ajukan ' + title.toLowerCase()} onClose={() => setOpen(false)} footer={<Btn disabled={!f.agree} onClick={() => { const e = validate ? validate(f, s) : ''; if (e) return setErr(e); api.request(col, { emp: ME, ...form.map(f) }, modul); setOpen(false); toast('Pengajuan terkirim — menunggu approval') }}>Submit</Btn>}>
        <div className="form">{form.render(f, setF, s)}
          <label className="chk-l"><input type="checkbox" className="chk" checked={!!f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />Saya menyetujui aturan & kebijakan yang berlaku</label>
          {err && <div className="err" role="alert"><Icon name="x" size={16} /><div><b>Maaf ya!</b><p>{err}</p></div></div>}
        </div>
      </Modal>
      <Modal open={!!detail} title={title + ' · detail'} onClose={() => setDetail(null)}>{detail && <><dl className="dl">{cols.map((c) => <React.Fragment key={c.h}><dt>{c.h}</dt><dd>{c.r ? c.r(detail) : detail[c.k]}</dd></React.Fragment>)}</dl><h4 className="mt">Approval line</h4><ApprovalLine line={detail.line || [{ by: 'HR', status: detail.status }]} /></>}</Modal>
      {t}
    </>
  )
}

const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1
export function CutiT() {
  const s = useStore()
  const usedOf = (n) => s.leaves.filter((l) => l.emp === ME && l.jenis === n && l.status !== 'Rejected').reduce((a, b) => a + b.hari, 0)
  return <RequestPage title="Cuti" sub="Tanpa cuti setengah hari. Kalender menandai libur & blackout dates." col="leaves" modul="Cuti"
    summary={<div className="stats">{aktifCuti(s, ME).map((lt) => <Stat key={lt.name} label={lt.name} value={`${lt.kuota - usedOf(lt.name)}/${lt.kuota}`} hint="sisa hari" />)}</div>}
    cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Tanggal', r: (r) => fmtDate(r.dari) + (r.sampai !== r.dari ? ' – ' + fmtDate(r.sampai) : '') }, { h: 'Hari', k: 'hari' }, { h: 'Alasan', k: 'alasan' }]}
    form={{ init: { jenis: 'Cuti Tahunan', dari: '2026-11-26', sampai: '2026-11-27', alasan: '' }, map: (f) => ({ jenis: f.jenis, dari: f.dari, sampai: f.sampai, hari: days(f.dari, f.sampai), alasan: f.alasan }),
      render: (f, setF, st) => <>
        <Field label="Jenis cuti"><select value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}>{aktifCuti(st, ME).map((l) => <option key={l.name}>{l.name}</option>)}</select></Field>
        <div className="form two"><Field label="Dari"><input type="date" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })} /></Field><Field label="Sampai"><input type="date" value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} /></Field></div>
        <div className="mini-cal">{[...st.holidays, ...st.blackout.map((b) => ({ tanggal: b.dari + ' – ' + b.sampai, nama: b.nama + ' (blackout)' }))].map((h) => <div key={h.tanggal}><b>{h.tanggal.includes('–') ? h.tanggal.split(' – ').map(fmtDate).join(' – ') : fmtDate(h.tanggal)}</b><span>{h.nama}</span></div>)}</div>
        <Field label="Alasan"><textarea rows={2} value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} /></Field>
        <Field label="Lampiran (opsional)"><input type="file" /></Field></> }}
    validate={(f, st) => {
      if (f.sampai < f.dari) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.'
      if (st.blackout.some((b) => !(f.sampai < b.dari || f.dari > b.sampai))) return 'Tanggal yang kamu pilih masuk periode blackout days perusahaan. Pilih tanggal lain ya.'
      if (st.holidays.some((h) => h.tanggal >= f.dari && h.tanggal <= f.sampai)) return 'Ada hari libur nasional di rentang itu — tidak perlu ambil cuti di hari libur.'
      const lt = aktifCuti(st, ME).find((l) => l.name === f.jenis); if (usedOf(f.jenis) + days(f.dari, f.sampai) > lt.kuota) return 'Kuota cutimu tidak cukup untuk rentang tanggal ini.'
      if (f.sampai > st.employees.find((e) => e.id === ME).end) return 'Cuti tidak boleh melewati tanggal akhir kontrak.'
      return ''
    }} />
}

export function LemburT() {
  const s = useStore()
  const total = s.overtimes.filter((o) => o.emp === ME && o.status === 'Approved').reduce((a, b) => a + b.durasi, 0)
  return <RequestPage title="Lembur" sub="Lembur yang disetujui otomatis masuk remunerasi bulan berjalan." col="overtimes" modul="Lembur"
    summary={<div className="stats"><Stat icon="star" label="Lembur bulan ini" value={total + ' jam'} /></div>}
    cols={[{ h: 'Kegiatan', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Jam', k: 'jam' }, { h: 'Durasi', r: (r) => r.durasi + ' jam' }, { h: 'Tipe', k: 'tipe' }]}
    form={{ init: { tipe: 'Lembur Hari Kerja', tanggal: '2026-11-12', mulai: '18:00', selesai: '21:00', judul: '' }, map: (f) => ({ tipe: f.tipe, tanggal: f.tanggal, jam: f.mulai + '–' + f.selesai, durasi: Math.max(0, (Number(f.selesai.slice(0, 2)) * 60 + Number(f.selesai.slice(3)) - Number(f.mulai.slice(0, 2)) * 60 - Number(f.mulai.slice(3))) / 60), judul: f.judul || 'Lembur' }),
      render: (f, setF, st) => <>
        <Field label="Tipe lembur"><select value={f.tipe} onChange={(e) => setF({ ...f, tipe: e.target.value })}>{st.overtimeTypes.map((o) => <option key={o.name}>{o.name}</option>)}</select></Field>
        <Field label="Tanggal"><input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field>
        <div className="form two"><Field label="Mulai"><input type="time" value={f.mulai} onChange={(e) => setF({ ...f, mulai: e.target.value })} /></Field><Field label="Selesai"><input type="time" value={f.selesai} onChange={(e) => setF({ ...f, selesai: e.target.value })} /></Field></div>
        <Field label="Deskripsi"><input value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} placeholder="Contoh: Rilis aplikasi" /></Field></> }}
    validate={(f) => (f.selesai <= f.mulai ? 'Jam selesai harus setelah jam mulai.' : '')} />
}

export function ReimburseT() {
  const s = useStore()
  const used = (n) => s.reimbursements.filter((r) => r.emp === ME && r.jenis === n && r.status !== 'Rejected').reduce((a, b) => a + b.nominal, 0)
  return <RequestPage title="Reimbursement" sub="Limit per tahun. Dibayar bersama gaji setelah disetujui." col="reimbursements" modul="Reimbursement"
    summary={<div className="stats">{s.reimburseTypes.map((r) => <Stat key={r.name} label={r.name} value={rupiah(r.limit - used(r.name))} hint={'sisa dari ' + rupiah(r.limit)} />)}</div>}
    cols={[{ h: 'Jenis', k: 'jenis' }, { h: 'Judul', k: 'judul' }, { h: 'Tanggal', r: (r) => fmtDate(r.tanggal) }, { h: 'Nominal', right: true, r: (r) => rupiah(r.nominal) }]}
    form={{ init: { jenis: 'Kesehatan', judul: '', tanggal: '2026-11-12', nominal: '' }, map: (f) => ({ jenis: f.jenis, judul: f.judul || f.jenis, tanggal: f.tanggal, nominal: Number(f.nominal) }),
      render: (f, setF, st) => <>
        <Field label="Jenis klaim"><select value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}>{st.reimburseTypes.map((o) => <option key={o.name}>{o.name}</option>)}</select></Field>
        <Field label="Judul"><input value={f.judul} onChange={(e) => setF({ ...f, judul: e.target.value })} /></Field>
        <div className="form two"><Field label="Tanggal"><input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field><Field label="Nominal (Rp)"><input type="number" value={f.nominal} onChange={(e) => setF({ ...f, nominal: e.target.value })} /></Field></div>
        <Field label="Bukti (wajib)"><input type="file" multiple /></Field></> }}
    validate={(f, st) => { const lim = st.reimburseTypes.find((r) => r.name === f.jenis).limit; if (!Number(f.nominal)) return 'Isi nominal klaim dulu.'; if (used(f.jenis) + Number(f.nominal) > lim) return 'Nominal melebihi sisa limit tahun ini.'; return '' }} />
}

export function PayslipT() {
  const s = useStore(); const [ok, setOk] = useState(false); const [pw, setPw] = useState(''); const [open, setOpen] = useState(null)
  const me = s.employees.find((e) => e.id === ME)
  if (!ok) return (<><PageHead title="Payslip" /><Card><form className="form narrow" onSubmit={(e) => { e.preventDefault(); if (pw) setOk(true) }}><div className="center"><Icon name="lock" size={36} /><p>Masukkan password login untuk membuka payslip.</p></div><Field label="Password"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field><Btn disabled={!pw}>Buka payslip</Btn></form></Card></>)
  const c = calcRow({ thp: me.thp, skema: me.skema, additions: [], deductions: [] }, s.setup)
  return (
    <>
      <PageHead title="Payslip" sub="Terbit setelah gaji selesai ditransfer." />
      <Card pad={false}><Table rows={s.payslips.filter((p) => p.emp === ME)} onRow={setOpen} cols={[{ h: 'Periode', k: 'bulan' }, { h: 'Net dibayar', right: true, r: (r) => rupiah(r.thp) }, { h: '', r: () => <Btn kind="ghost" icon="eye">Detail</Btn> }]} /></Card>
      <Modal open={!!open} title={'Payslip · ' + open?.bulan} onClose={() => setOpen(null)} footer={<Btn kind="ghost" icon="download">Unduh PDF</Btn>}>
        <div className="slip"><h4>Pendapatan</h4>{[['Gaji Pokok', c.gp], ['Tunjangan Posisi', c.tp]].map(([k, v]) => <div key={k}><span>{k}</span><b>{rupiah(v)}</b></div>)}
          <h4>Potongan</h4>{[['BPJS Kesehatan (1%)', c.emp.kes], ['JHT (2%)', c.emp.jht], ['JP (1%)', c.emp.jp]].map(([k, v]) => <div key={k}><span>{k}</span><b>− {rupiah(v)}</b></div>)}
          <div className="slip-total"><span>Take home pay</span><b>{rupiah(c.net)}</b></div>
          <h4>Ditanggung perusahaan</h4>{[['PPh21 (TER ' + c.rate + '%)', c.pajak], ['JKK + JKM', c.comp.jkk + c.comp.jkm], ['JHT + JP perusahaan', c.comp.jht + c.comp.jp], ['BPJS Kesehatan perusahaan', c.comp.kes]].map(([k, v]) => <div key={k}><span>{k}</span><b>{rupiah(v)}</b></div>)}</div>
      </Modal>
    </>
  )
}

export function LowonganT() {
  const s = useStore(); const { job, pool } = useLookup(); const [t, toast] = useToast()
  return (
    <>
      <PageHead title="Lowongan & Tawaran" sub="Tawaran dari talent pool: kamu yang memutuskan lanjut atau tidak." />
      <Card title="Tawaran untukmu">
        {s.offers.length === 0 && <Empty text="Belum ada tawaran." />}
        {s.offers.map((o) => <div key={o.id} className="offer"><div className="grow"><strong>{job(o.job).posisi}</strong><div className="muted sm">{job(o.job).gaji} · {job(o.job).lokasi} · untuk {pool(o.talent).name}</div><div className="muted sm">Jawab sebelum {fmtDate(o.batas)}</div></div>
          {o.status === 'Menunggu jawaban' ? <div className="row-act"><Btn kind="ghost" onClick={() => { api.answerOffer(o.id, false); toast('Tawaran ditolak') }}>Tolak</Btn><Btn onClick={() => { api.answerOffer(o.id, true); toast('Kamu masuk seleksi tahap 1!') }}>Lanjut seleksi</Btn></div> : <Badge>{o.status}</Badge>}</div>)}
        <Note>Demo: tawaran ditampilkan untuk talent pool (contoh akun di kolom "untuk").</Note>
      </Card>
      <Card title="Lowongan terbuka" pad={false}><Table rows={s.jobs.filter((j) => j.status === 'Active')} cols={[{ h: 'Posisi', r: (r) => <div><strong>{r.posisi}</strong><div className="muted sm">{r.jenis} · {r.lokasi}</div></div> }, { h: 'Gaji', k: 'gaji' }, { h: '', r: () => <Btn kind="ghost" onClick={() => toast('Lamaran terkirim — kerjakan pre-test ya')}>Lamar</Btn> }]} /></Card>{t}
    </>
  )
}

export function JadwalT() {
  const [t, toast] = useToast(); const [slot, setSlot] = useState(''); const [sent, setSent] = useState(false)
  const slots = ['Sen, 16 Nov · 10:00', 'Sen, 16 Nov · 14:00', 'Rab, 18 Nov · 09:00', 'Kam, 19 Nov · 13:00']
  return (
    <><ArtHead art="kalender" title="Jadwal Wawancara" sub="Pilih slot yang disediakan Branch. Branch yang konfirmasi & mengisi link meeting." />
      <Card title="Backend Engineer · Branch Jakarta Digital">
        <div className="slots">{slots.map((x) => <button key={x} className={slot === x ? 'on' : ''} onClick={() => setSlot(x)} disabled={sent}>{x}</button>)}</div>
        {sent ? <Note>Request terkirim untuk <b>{slot}</b> — menunggu konfirmasi Branch. Link meeting akan muncul di sini.</Note> : <Btn disabled={!slot} onClick={() => { setSent(true); toast('Request jadwal terkirim') }}>Request jadwal</Btn>}
      </Card>{t}</>
  )
}

export function PretestT() {
  const [run, setRun] = useState(null); const [done, setDone] = useState([]); const [t, toast] = useToast()
  const mods = [['Interview Dasar', 'Live recording · 5 soal', '25:00'], ['Tes Potensi Akademik', 'Pilihan ganda · 20 soal', '30:00'], ['Tes Excel', 'Upload dokumen · 3 soal', '20:00']]
  return (
    <><PageHead title="Pre-test" sub="Pastikan koneksi internet stabil sebelum mulai." />
      <div className="mods">{mods.map(([n, d, w]) => <Card key={n}><div className="batch-row"><Icon name="test" /><div className="grow"><strong>{n}</strong><div className="muted sm">{d} · {w}</div></div>{done.includes(n) ? <Badge t="ok">Selesai</Badge> : <Btn onClick={() => setRun(n)}>Mulai</Btn>}</div></Card>)}</div>
      <Modal open={!!run} title={run} onClose={() => setRun(null)} footer={<Btn onClick={() => { setDone([...done, run]); setRun(null); toast('Jawaban tersimpan') }}>Selesai</Btn>}>
        <div className="timer">Sisa waktu 24:59</div><p><b>Soal 1.</b> Ceritakan singkat tentang dirimu dan pengalaman kerja terakhirmu.</p>
        <div className="drop"><Icon name="upload" size={26} /><p>Unggah rekaman / jawaban</p><input type="file" aria-label="Unggah jawaban" /></div>
      </Modal>{t}</>
  )
}

export function KontrakT({ go }) {
  const s = useStore(); const [t, toast] = useToast(); const [sign, setSign] = useState(null); const [file, setFile] = useState(''); const [chk, setChk] = useState(false); const [view, setView] = useState(null)
  const agreed = s.contractAgreed[ME]; const me = s.employees.find((e) => e.id === ME)
  const mine = s.docBatches.flatMap((b) => b.items.filter((i) => i.emp === ME && i.status !== 'None').map((i) => ({ ...i, batch: b.id, bulan: b.bulan })))
  const [d, jam] = (agreed || '').split(' ')
  return (
    <><PageHead title="Kontrak" sub="Dokumen dari HR. Baca, tanda tangani, lalu unggah kembali." />
      {agreed && <p className="muted sm">Kamu menyetujui pernyataan menu Kontrak pada {fmtDate(d)} pukul {jam}.</p>}
      {mine.length === 0 ? <Empty text="Belum ada dokumen." /> : mine.map((x) => <Card key={x.batch + x.dokumen}><div className="batch-row"><Icon name="doc" /><div className="grow"><strong>{x.dokumen}</strong><div className="muted sm">{x.jenis} · {x.bulan}{x.nomor ? ' · No. ' + x.nomor : ''}</div></div><Badge>{x.status}</Badge>
        {x.text && <Btn kind="ghost" icon="eye" onClick={() => setView(x)}>Baca</Btn>}
        {x.status === 'Sent' && <Btn onClick={() => { setSign(x); setFile('') }}>Tanda tangani</Btn>}</div></Card>)}
      <Modal open={!agreed} title="Pernyataan menu Kontrak" onClose={() => go('beranda')} footer={<><Btn kind="ghost" onClick={() => go('beranda')}>Kembali</Btn><Btn disabled={!chk} onClick={() => { api.agreeContract(ME); toast('Pernyataan disetujui dan dicatat') }}>Saya setuju</Btn></>}>
        <p>Sebelum membuka dan mengunggah dokumen di menu ini, mohon baca dan setujui pernyataan berikut.</p>
        <ol className="disc">{DISCLAIMER.map((x) => <li key={x}>{x}</li>)}</ol>
        <label className="chk-l"><input type="checkbox" className="chk" checked={chk} onChange={(e) => setChk(e.target.checked)} />Saya, {me?.name}, sudah membaca dan menyetujui pernyataan di atas</label>
      </Modal>
      <Modal open={!!sign} title={sign ? 'Unggah ' + sign.dokumen : ''} onClose={() => setSign(null)} footer={<><Btn kind="ghost" onClick={() => setSign(null)}>Batal</Btn><Btn disabled={!file} onClick={() => { api.signDoc(sign.batch, ME); setSign(null); toast('Dokumen terkirim ke HR untuk ditandatangani') }}>Kirim ke HR</Btn></>}>
        <div className="drop"><Icon name="upload" size={26} /><p>{file || 'Unggah dokumen yang sudah kamu tanda tangani (.pdf)'}</p><input type="file" accept=".pdf" aria-label="Unggah dokumen" onChange={(e) => setFile(e.target.files[0]?.name || '')} /></div>
        <p className="muted sm">Kalau salah unggah, hubungi HR. Dokumen bisa diganti HR lewat Track Document.</p>
      </Modal>
      <Modal wide open={!!view} title={view?.dokumen || ''} onClose={() => setView(null)} footer={<Btn kind="ghost" onClick={() => setView(null)}>Close</Btn>}>{view && <DocView html={view.text} />}</Modal>{t}</>
  )
}

export function BiodataT() {
  const [t, toast] = useToast()
  const berkas = [['CV', true], ['Pas foto 4x6', true], ['KTP', true], ['Kartu Keluarga', true], ['NPWP', false], ['BPJS Kes & TK', false]]
  return (
    <><PageHead title="Biodata & Berkas" sub="Satu akun untuk melamar dan bekerja." />
      <div className="grid2">
        <Card title="Data diri"><form className="form two" onSubmit={(e) => { e.preventDefault(); toast('Biodata tersimpan') }}>
          {[['Nama lengkap', 'Putri Amalia'], ['Tempat, tanggal lahir', 'Bandung, 12 Mei 1998'], ['E-mail', 'putri.amalia@contoh.id'], ['No. HP', '0812xxxxxxx'], ['Status PTKP', 'TK/0'], ['NIK', '3273xxxxxxxxxxxx'], ['Bank', 'BCA'], ['No. rekening', 'xxxxxx1234']].map(([l, v]) => <Field key={l} label={l}><input defaultValue={v} /></Field>)}
          <Btn>Simpan</Btn></form></Card>
        <Card title="Berkas lampiran (maks 3MB)">{berkas.map(([n, ok]) => <div key={n} className="file-row"><Icon name="doc" /><span className="grow">{n}</span><Badge t={ok ? 'ok' : 'neutral'}>{ok ? 'Terunggah' : 'Belum'}</Badge><label className="icon-btn" aria-label={'Unggah ' + n}><Icon name="upload" /><input type="file" hidden onChange={() => toast(n + ' terunggah')} /></label></div>)}</Card>
      </div>{t}</>
  )
}

export function InventarisT() {
  const s = useStore(); const [t, toast] = useToast(); const [open, setOpen] = useState(null); const [chk, setChk] = useState(false)
  return (
    <><PageHead title="Inventaris" sub="Aset kantor yang kamu pegang." />
      <Card pad={false}><Table rows={s.inventories.filter((i) => i.emp === ME)} cols={[{ h: 'Item', k: 'item' }, { h: 'Kategori', k: 'kategori' }, { h: 'Status', r: (r) => <Badge>{r.status}</Badge> }, { h: '', r: (r) => r.status === 'Waiting' && <Btn onClick={() => { setOpen(r); setChk(false) }}>Terima</Btn> }]} /></Card>
      <Modal open={!!open} title={'Terima ' + open?.item} onClose={() => setOpen(null)} footer={<Btn disabled={!chk} onClick={() => { api.acceptInventory(open.id); setOpen(null); toast('Aset diterima') }}>Terima aset</Btn>}>
        <p>Pastikan aset sudah kamu terima dalam kondisi baik.</p><label className="chk-l"><input type="checkbox" className="chk" checked={chk} onChange={(e) => setChk(e.target.checked)} />Saya menyetujui aturan & kebijakan penerimaan inventaris</label>
      </Modal>{t}</>
  )
}

export function ResignT() {
  const s = useStore(); const [t, toast] = useToast(); const [f, setF] = useState({ lastDay: '', alasan: '', agree: false }); const [err, setErr] = useState('')
  const mine = s.resigns.filter((r) => r.emp === ME)
  const minDay = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  return (
    <><PageHead title="Resign" sub="Ajukan paling lambat 30 hari sebelum hari kerja terakhir." />
      {mine.length > 0 && <Card title="Status pengajuan">{mine.map((r) => <div key={r.id} className="batch-row"><Icon name="door" /><div className="grow"><strong>Hari terakhir {fmtDate(r.lastDay)}</strong><div className="muted sm">{r.alasan}</div></div><Badge>{r.status}</Badge></div>)}</Card>}
      <div className="grid2">
        <Card title="Form resign"><div className="form">
          <Field label="Hari kerja terakhir" hint={'Paling cepat ' + fmtDate(minDay)}><input type="date" min={minDay} value={f.lastDay} onChange={(e) => setF({ ...f, lastDay: e.target.value })} /></Field>
          <Field label="Alasan (opsional)"><textarea rows={3} value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} /></Field>
          <Field label="Surat resign"><input type="file" accept=".pdf,.docx" /></Field>
          <Btn kind="ghost" icon="download" onClick={() => toast('Template surat resign (.docx) disiapkan')}>Template surat resign</Btn>
          <label className="chk-l"><input type="checkbox" className="chk" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />Saya akan mengembalikan seluruh inventaris kantor</label>
          {err && <div className="err" role="alert"><Icon name="x" size={16} /><p>{err}</p></div>}
          <Btn disabled={!f.agree || !f.lastDay} onClick={() => { if (f.lastDay < minDay) return setErr('Hari terakhir minimal 30 hari dari hari ini.'); api.request('resigns', { emp: ME, alasan: f.alasan || '—', lastDay: f.lastDay, inventaris: 'Belum lengkap' }, 'Resign'); setErr(''); toast('Pengajuan resign terkirim') }}>Ajukan resign</Btn>
        </div></Card>
        <Card title="Inventaris yang harus dikembalikan">{s.inventories.filter((i) => i.emp === ME).map((i) => <div key={i.id} className="file-row"><Icon name="box" /><span className="grow">{i.item}</span><Badge t="neutral">{i.kategori}</Badge></div>)}</Card>
      </div>{t}</>
  )
}

export function InboxT() {
  const s = useStore()
  return <><PageHead title="Inbox" sub="Notifikasi dari HR & sistem (juga dikirim lewat e-mail)." /><Card>{s.inbox.map((n) => <div key={n.id} className="ann"><Icon name="bell" /><div><strong>{n.judul}</strong><small>{n.isi} · {n.waktu}</small></div></div>)}</Card></>
}
