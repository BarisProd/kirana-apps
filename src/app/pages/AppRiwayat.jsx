// Riwayat absen: kalender bulan dengan titik warna (tepat waktu, terlambat, tidak absen, cuti) + daftar hari.
// Ketuk tanggal → detail (jam, lokasi, kondisi, status kirim). Unduhan & rekap lengkap disimpan di menu ⋯.
import React, { useMemo, useState } from 'react'
import { useStore } from '../../services/store.js'
import { ME } from '../../talent/services/session.js'
import { Icon, Modal, Badge, Btn, useToast, Empty } from '../../talent/components/ui.jsx'
import { attendanceDays } from '../../talent/services/rekap.js'
import { exportExcel, exportPdf } from '../../talent/services/export.js'
import { fmtDate } from '../../talent/pages/shared.jsx'
import { useOutbox } from '../../services/outbox.js'
import { isWorkday, holidayOn } from '../../services/attendance.js'
import { haptic } from '../../services/haptics.js'

const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const pad = (n) => String(n).padStart(2, '0')
const KIND = (st) => st === 'Hadir' ? 'ok' : st === 'Terlambat' ? 'late' : /tidak|alpha/i.test(st) ? 'miss' : st === 'Cuti' ? 'cuti' : st === 'Belum absen' ? 'today' : 'other'
const LEG = [['ok', 'Tepat waktu'], ['late', 'Terlambat'], ['miss', 'Tidak absen'], ['cuti', 'Cuti/izin']]

export function AppRiwayat({ go }) {
  const s = useStore(); const ob = useOutbox(); const [t, toast] = useToast()
  const now = new Date(); const [ym, setYm] = useState([now.getFullYear(), now.getMonth()]); const [y, m] = ym
  const [day, setDay] = useState(null); const [menu, setMenu] = useState(false); const [fil, setFil] = useState('')
  const me = s.employees.find((e) => e.id === ME) || {}
  const from = `${y}-${pad(m + 1)}-01`; const last = new Date(y, m + 1, 0).getDate(); const to = `${y}-${pad(m + 1)}-${pad(last)}`
  const rows = useMemo(() => attendanceDays(s, ME, from, to), [s, from, to])
  const byDate = new Map(rows.map((r) => [r.tanggal, r]))
  const pending = new Set(ob.filter((r) => r.emp === ME && r.status !== 'sent').map((r) => r.tanggal))
  const count = (k) => rows.filter((r) => KIND(r.status) === k).length
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const canNext = y < now.getFullYear() || m < now.getMonth()
  const shift = (d) => { haptic.tap(); const n = new Date(y, m + d, 1); setYm([n.getFullYear(), n.getMonth()]); setFil('') }
  // geser kiri/kanan untuk ganti bulan
  const [sx, setSx] = useState(null)
  const swipe = { onTouchStart: (e) => setSx(e.touches[0].clientX), onTouchEnd: (e) => { if (sx == null) return; const d = e.changedTouches[0].clientX - sx; if (d > 60) shift(-1); else if (d < -60 && canNext) shift(1); setSx(null) } }
  const list = rows.filter((r) => !fil || KIND(r.status) === fil)
  const dl = (kind) => {
    setMenu(false)
    const payload = { title: `Absensi ${me.name || ''} · ${BLN[m]} ${y}`, meta: `${rows.length} hari`, cols: ['Tanggal', 'Hari', 'Masuk', 'Pulang', 'Lokasi', 'Status'], rows: rows.map((r) => [fmtDate(r.tanggal), HARI[new Date(r.tanggal).getDay()], r.masuk, r.pulang, r.lokasi?.nama || r.lokasi || '—', r.status]) }
    try { kind === 'xls' ? exportExcel(payload) : exportPdf(payload); toast('File diunduh') } catch (e) { toast('Unduhan diblokir di pratinjau ini') }
  }
  const log = day && s.attendance.find((a) => a.emp === ME && a.tanggal === day.tanggal)
  return (
    <div className="ar">
      <section className="ar-cal card-lite" {...swipe}>
        <div className="ar-head">
          <button type="button" className="icon-btn" aria-label="Bulan sebelumnya" onClick={() => shift(-1)}><Icon name="back" size={20} /></button>
          <h2>{BLN[m]} {y}</h2>
          <button type="button" className="icon-btn" aria-label="Bulan berikutnya" disabled={!canNext} onClick={() => shift(1)}><Icon name="arrowRight" size={20} /></button>
          <button type="button" className="icon-btn" aria-label="Menu lainnya" onClick={() => setMenu(true)}><Icon name="more" size={20} /></button>
        </div>
        <div className="ar-grid" role="grid" aria-label={`Kalender absen ${BLN[m]} ${y}`}>
          {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((h, i) => <span key={i} className="ar-dow">{h}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={'e' + i} />)}
          {Array.from({ length: last }, (_, i) => {
            const d = `${y}-${pad(m + 1)}-${pad(i + 1)}`; const r = byDate.get(d); const k = r ? KIND(r.status) : ''
            const libur = !r && !isWorkday(s, me.branch || 'b1', d); const hol = holidayOn(s, me.branch || 'b1', d)
            return <button key={d} type="button" role="gridcell" className={`ar-d ${k} ${d === todayIso ? 'today' : ''} ${libur ? 'libur' : ''} ${d > todayIso ? 'future' : ''}`} disabled={!r} onClick={() => setDay(r)} aria-label={`${i + 1} ${BLN[m]}${r ? ': ' + r.status : hol ? ': ' + hol.nama : libur ? ': libur' : ''}`}>
              <span>{i + 1}</span>{k && k !== 'other' && <i />}{pending.has(d) && <em aria-hidden="true" />}
            </button>
          })}
        </div>
        <div className="ar-leg">{LEG.map(([k, l]) => <button key={k} type="button" className={`ar-chip ${k} ${fil === k ? 'on' : ''}`} aria-pressed={fil === k} onClick={() => setFil(fil === k ? '' : k)}><i />{l}<b>{count(k)}</b></button>)}</div>
      </section>

      <div className="ar-list-h"><b>{fil ? LEG.find((x) => x[0] === fil)[1] : 'Semua hari'}</b><span className="muted sm">{list.length} hari</span></div>
      {list.length === 0 ? (fil
        ? <Empty icon="search" title={`Tidak ada hari "${LEG.find((x) => x[0] === fil)[1].toLowerCase()}"`} hint={`Di ${BLN[m]} ${y} tidak ada catatan dengan status ini.`} action={{ label: 'Tampilkan semua hari', ghost: true, onClick: () => setFil('') }} />
        : (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth()))
          ? <Empty icon="calendar" title={`${BLN[m]} belum dimulai`} hint="Catatan kehadiran muncul di sini setelah kamu absen di bulan ini." action={{ label: 'Kembali ke bulan ini', ghost: true, onClick: () => setYm([now.getFullYear(), now.getMonth()]) }} />
          : <Empty icon="calendar" title="Belum ada catatan di bulan ini" hint="Absen masuk pertamamu akan langsung muncul di kalender ini." action={y === now.getFullYear() && m === now.getMonth() ? { label: 'Absen di Beranda', onClick: () => go('beranda') } : null} />) : (
        <ul className="ar-list">{list.map((r) => (
          <li key={r.tanggal}><button type="button" onClick={() => setDay(r)}>
            <span className={`ar-date ${KIND(r.status)}`}><b>{Number(r.tanggal.slice(8))}</b><small>{HARI[new Date(r.tanggal).getDay()]}</small></span>
            <span className="grow"><b>{r.masuk === '—' && r.pulang === '—' ? (r.status === 'Cuti' ? r.ket || 'Cuti' : r.status === 'Hadir' ? 'Tepat waktu' : r.status) : `${String(r.masuk).replace(':', '.')} – ${String(r.pulang).replace(':', '.')}`}</b><small>{r.status === 'Cuti' ? r.ket || 'Cuti' : r.lokasi?.nama || r.lokasi || ''}{pending.has(r.tanggal) ? ' · menunggu kirim' : ''}</small></span>
            <Badge t={KIND(r.status) === 'ok' ? 'ok' : KIND(r.status) === 'late' ? 'warn' : KIND(r.status) === 'miss' ? 'bad' : 'neutral'}>{r.status === 'Hadir' ? 'Tepat waktu' : r.status}</Badge>
          </button></li>
        ))}</ul>
      )}

      <Modal open={!!day} title={day ? `${HARI[new Date(day.tanggal).getDay()]}, ${fmtDate(day.tanggal)}` : ''} onClose={() => setDay(null)} footer={<Btn kind="ghost" className="full" onClick={() => setDay(null)}>Tutup</Btn>}>
        {day && <div className="ar-det">
          <div className="ar-det-t"><div><span>Masuk</span><b>{String(day.masuk).replace(':', '.')}</b></div><div><span>Pulang</span><b>{String(day.pulang).replace(':', '.')}</b></div><div><span>Status</span><b>{day.status === 'Hadir' ? 'Tepat waktu' : day.status}</b></div></div>
          <dl className="ar-dl">
            <dt>Lokasi</dt><dd>{day.lokasi?.nama || day.lokasi || '—'}{log?.mode ? ` · ${log.mode}` : ''}</dd>
            {log?.kesehatanMasuk && <><dt>Kondisi</dt><dd>{log.kesehatanMasuk}</dd></>}
            <dt>Sumber</dt><dd>{log?.sync ? (Object.values(log.sync).some((x) => x.offline) ? 'Aplikasi · dikirim offline' : 'Aplikasi') : day.sumber}</dd>
            {log?.reviewHR && <><dt>Pemeriksaan</dt><dd>{log.verif ? 'Sudah diperiksa HR' : 'Sedang diperiksa HR'}</dd></>}
          </dl>
          {(log?.fotoMasuk || log?.fotoPulang) && <div className="ar-foto">{log.fotoMasuk && <img src={log.fotoMasuk} alt="Selfie masuk" />}{log.fotoPulang && <img src={log.fotoPulang} alt="Selfie pulang" />}</div>}
          {pending.has(day.tanggal) && <p className="muted sm" style={{ margin: 0 }}>Ada absen tanggal ini yang masih tersimpan di HP dan belum terkirim.</p>}
          {KIND(day.status) === 'miss' && <p className="muted sm" style={{ margin: 0 }}>Merasa sudah absen? Hubungi HR atau atasanmu untuk koreksi.</p>}
        </div>}
      </Modal>
      <Modal open={menu} title="Lainnya" onClose={() => setMenu(false)}>
        <div className="sheet-list">
          <button type="button" onClick={() => { setMenu(false); go('absensi/antrean') }}><Icon name="refresh" size={20} />Antrean kirim absen</button>
          <button type="button" onClick={() => { setMenu(false); go('rekap') }}><Icon name="chart" size={20} />Rekap lengkap (cuti, lembur, absen)</button>
          <button type="button" onClick={() => dl('xls')}><Icon name="download" size={20} />Unduh Excel {BLN[m]}</button>
          <button type="button" onClick={() => dl('pdf')}><Icon name="download" size={20} />Unduh PDF {BLN[m]}</button>
        </div>
      </Modal>
      {t}
    </div>
  )
}
