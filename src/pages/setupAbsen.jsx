// Setup Aktivitas › Absensi & Kalender (dipindahkan dari desain revisi 16 Nov, 22 Nov 2026)
// - SetupAbsen: per Branch — mode WFO/WFA, lokasi absensi (peta + radius), jam shift (rentang masuk/pulang, aktif),
//   status kesehatan. Data ini dibaca app Talent saat clock in/out (s.absenSetup).
// - BlackoutEditor: tambah/ubah/hapus blackout dates (karyawan tidak bisa mengajukan cuti), berlaku semua/sebagian Branch.
// - RekapBulanan: kalender bulanan per Branch + total hari kerja, libur, blackout.
import React, { useEffect, useState } from 'react'
import { useStore, api } from '../services/store.js'
import { holidayOn } from '../services/attendance.js'
import { Btn, Card, Badge, Modal, Field, useToast, Note, Icon, Toggle, Table } from '../components/ui.jsx'
import { fmtDate } from './shared.jsx'

const rid = (p) => p + Math.random().toString(36).slice(2, 7)
const newShift = () => ({ id: rid('s'), nama: '', aktif: true, masukDari: '08:00', masukSampai: '08:30', pulangDari: '17:00', pulangSampai: '17:30' })
const EMPTY = { mode: { WFO: true, WFA: false }, offline: { aktif: true, batasJam: 72 }, lokasi: [], shifts: [], kesehatan: [] }

const BranchPick = ({ value, onChange }) => {
  const s = useStore()
  return <label className="fsel" style={{ minWidth: 220 }}><span>Branch</span><select value={value} onChange={(e) => onChange(e.target.value)}>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
}

export function SetupAbsen() {
  const s = useStore(); const [t, toast] = useToast()
  const [br, setBr] = useState(s.branches[0]?.id || '')
  const load = (b) => { const x = structuredClone({ ...EMPTY, ...(s.absenSetup?.[b] || {}) }); x.offline = { ...EMPTY.offline, ...(x.offline || {}) }; return x }
  const [d, setD] = useState(() => load(br)); const [map, setMap] = useState(null); const [tried, setTried] = useState(false); const [saved, setSaved] = useState(false); const [del, setDel] = useState(null)
  useEffect(() => { setD(load(br)); setTried(false) }, [br])
  const dirty = JSON.stringify(d) !== JSON.stringify(load(br))
  const set = (k, v) => setD({ ...d, [k]: v })
  const patch = (k, id, p) => set(k, d[k].map((x) => x.id === id ? { ...x, ...p } : x))
  const errs = []
  if (!d.mode.WFO && !d.mode.WFA) errs.push('Pilih minimal satu mode absensi')
  if (d.mode.WFO && !d.lokasi.some((l) => l.aktif)) errs.push('Mode WFO butuh minimal satu lokasi aktif')
  d.lokasi.forEach((l, i) => { if (!l.nama.trim()) errs.push(`Lokasi ${i + 1}: nama belum diisi`) })
  if (!d.shifts.some((x) => x.aktif)) errs.push('Minimal satu shift harus aktif')
  d.shifts.forEach((x, i) => {
    const n = x.nama.trim() || `Shift ${i + 1}`
    if (!x.nama.trim()) errs.push(`Shift ${i + 1}: nama belum diisi`)
    if (x.masukDari >= x.masukSampai) errs.push(`${n}: jam masuk "dari" harus lebih awal dari "sampai"`)
    if (x.pulangDari >= x.pulangSampai) errs.push(`${n}: jam pulang "dari" harus lebih awal dari "sampai"`)
  })
  d.kesehatan.forEach((x, i) => { if (!x.nama.trim()) errs.push(`Status kesehatan ${i + 1}: nama belum diisi`) })
  const save = () => { setTried(true); if (errs.length) return; api.saveAbsenSetup(br, d); setSaved(true) }
  const name = s.branches.find((b) => b.id === br)?.name
  return (
    <Card>
      <div className="sub-head" style={{ marginBottom: 16 }}>
        <div><h2>Setup Absen</h2><p className="muted">Cara absen, lokasi kantor, jam shift, dan pilihan kondisi kesehatan untuk karyawan {name}.</p></div>
        <div className="sub-head-act"><BranchPick value={br} onChange={setBr} /></div>
      </div>
      <div className="sec">
        <div className="sec-h"><div><h3>Mode Absensi</h3><p className="muted sm">Boleh pilih keduanya.</p></div></div>
        <div className="mode-pick">{[['WFO', 'Work From Office', 'Absen hanya di lokasi kantor (GPS dalam radius).'], ['WFA', 'Work From Anywhere', 'Absen dari mana saja, lokasi tetap dicatat.']].map(([k, l, h]) => (
          <label key={k} className={d.mode[k] ? 'on' : ''}><input type="checkbox" checked={!!d.mode[k]} onChange={(e) => set('mode', { ...d.mode, [k]: e.target.checked })} /><span><span>{k} · {l}</span><small>{h}</small></span></label>
        ))}</div>
      </div>
      <div className="sec">
        <div className="sec-h"><div><h3>Absen Offline (aplikasi)</h3><p className="muted sm">Saat susah sinyal, absen disimpan di HP lalu dikirim otomatis. Server tetap memakai jam & lokasi sebenarnya.</p></div></div>
        <div className="off-set">
          <Toggle on={d.offline.aktif} onChange={() => set('offline', { ...d.offline, aktif: !d.offline.aktif })} label={d.offline.aktif ? 'Diizinkan' : 'Tidak diizinkan (wajib ada sinyal)'} />
          <label className="fsel" style={{ minWidth: 220 }}><span>Batas waktu kirim</span><select value={d.offline.batasJam} disabled={!d.offline.aktif} onChange={(e) => set('offline', { ...d.offline, batasJam: Number(e.target.value) })}>{[24, 48, 72, 168].map((h) => <option key={h} value={h}>{h === 168 ? '7 hari' : h + ' jam'}</option>)}</select></label>
        </div>
        <p className="muted sm" style={{ margin: 0 }}>Absen yang terkirim lewat batas tetap diterima dengan status <b>Perlu persetujuan HR</b>, begitu juga absen dengan jam HP tidak sesuai atau di luar radius.</p>
      </div>
      <div className="sec">
        <div className="sec-h"><div><h3>Lokasi Absensi</h3><p className="muted sm">{d.mode.WFO ? 'Centang lokasi yang berlaku. Karyawan WFO hanya bisa absen di dalam radius lokasi aktif.' : 'Aktifkan mode WFO untuk memakai lokasi kantor.'}</p></div></div>
        <div className="loc-list" style={{ opacity: d.mode.WFO ? 1 : 0.55 }}>{d.lokasi.map((l, i) => (
          <div key={l.id} className={`loc ${l.aktif ? 'on' : ''}`}>
            <div className="loc-top">
              <input type="checkbox" checked={l.aktif} disabled={!d.mode.WFO} onChange={(e) => patch('lokasi', l.id, { aktif: e.target.checked })} aria-label={`Aktifkan ${l.nama || 'lokasi ' + (i + 1)}`} />
              <input value={l.nama} placeholder="Nama lokasi, mis. Kantor Pusat" disabled={!d.mode.WFO} aria-invalid={tried && !l.nama.trim()} onChange={(e) => patch('lokasi', l.id, { nama: e.target.value })} aria-label="Nama lokasi" />
              <button type="button" className="icon-btn" aria-label="Hapus lokasi" title="Hapus" disabled={!d.mode.WFO} onClick={() => setDel({ k: 'lokasi', id: l.id, nama: l.nama || 'lokasi ini' })}><Icon name="trash" size={18} /></button>
            </div>
            <small>{l.alamat ? <>{l.alamat}<br />Radius {l.radius} m · {Number(l.lat).toFixed(5)}, {Number(l.lng).toFixed(5)}</> : 'Titik lokasi belum diatur.'}</small>
            <Btn kind="ghost" icon="pin" disabled={!d.mode.WFO} onClick={() => setMap(l)}>{l.alamat ? 'Ubah titik lokasi' : 'Atur titik di peta'}</Btn>
          </div>
        ))}</div>
        <button type="button" className="add-link" disabled={!d.mode.WFO} onClick={() => { const l = { id: rid('l'), nama: '', aktif: true, lat: d.lokasi[0]?.lat ?? -6.2, lng: d.lokasi[0]?.lng ?? 106.82, alamat: '', radius: 100 }; set('lokasi', [...d.lokasi, l]); setMap(l) }}><Icon name="plus" size={18} />Tambah lokasi</button>
      </div>
      <div className="sec">
        <div className="sec-h"><div><h3>Pengaturan Shifting</h3><p className="muted sm">Rentang jam dianggap tepat waktu. Absen di luar rentang masuk tercatat Terlambat. Dipakai app Talent saat clock in/out.</p></div></div>
        <div className="rows">
          {d.shifts.map((x, i) => (
            <div key={x.id} className={`shift ${x.aktif ? '' : 'off'}`}>
              <div className="shift-top">
                <Field label="Nama shift"><input value={x.nama} placeholder={`Shift ${i + 1}`} aria-invalid={tried && !x.nama.trim()} onChange={(e) => patch('shifts', x.id, { nama: e.target.value })} /></Field>
                <Toggle on={x.aktif} onChange={() => patch('shifts', x.id, { aktif: !x.aktif })} label={x.aktif ? 'Aktif' : 'Nonaktif'} />
                <button type="button" className="icon-btn" aria-label="Hapus shift" title="Hapus" onClick={() => setDel({ k: 'shifts', id: x.id, nama: x.nama || `Shift ${i + 1}` })}><Icon name="trash" size={18} /></button>
              </div>
              <div className="shift-times">
                <Field label={<span className="lbl-in">Jam masuk</span>}><div className="time-pair"><input type="time" value={x.masukDari} aria-label="Jam masuk dari" aria-invalid={tried && x.masukDari >= x.masukSampai} onChange={(e) => patch('shifts', x.id, { masukDari: e.target.value })} /><span>s.d.</span><input type="time" value={x.masukSampai} aria-label="Jam masuk sampai" aria-invalid={tried && x.masukDari >= x.masukSampai} onChange={(e) => patch('shifts', x.id, { masukSampai: e.target.value })} /></div></Field>
                <Field label={<span className="lbl-out">Jam pulang</span>}><div className="time-pair"><input type="time" value={x.pulangDari} aria-label="Jam pulang dari" aria-invalid={tried && x.pulangDari >= x.pulangSampai} onChange={(e) => patch('shifts', x.id, { pulangDari: e.target.value })} /><span>s.d.</span><input type="time" value={x.pulangSampai} aria-label="Jam pulang sampai" aria-invalid={tried && x.pulangDari >= x.pulangSampai} onChange={(e) => patch('shifts', x.id, { pulangSampai: e.target.value })} /></div></Field>
              </div>
            </div>
          ))}
          <button type="button" className="add-link" onClick={() => set('shifts', [...d.shifts, newShift()])}><Icon name="plus" size={18} />Tambah shift</button>
        </div>
      </div>
      <div className="sec">
        <div className="sec-h"><div><h3>Status Kesehatan</h3><p className="muted sm">Pilihan yang muncul saat karyawan absen masuk. Hilangkan centang untuk menyembunyikan.</p></div></div>
        <div className="health">{d.kesehatan.map((x, i) => (
          <div key={x.id} className="hk">
            <input type="checkbox" className="chk" checked={x.aktif} onChange={(e) => patch('kesehatan', x.id, { aktif: e.target.checked })} aria-label={`Tampilkan ${x.nama || 'status ' + (i + 1)}`} />
            <input type="text" value={x.nama} placeholder="Nama kondisi" aria-invalid={tried && !x.nama.trim()} onChange={(e) => patch('kesehatan', x.id, { nama: e.target.value })} aria-label="Nama kondisi kesehatan" />
            <button type="button" className="icon-btn" aria-label={`Hapus ${x.nama}`} title="Hapus" onClick={() => set('kesehatan', d.kesehatan.filter((y) => y.id !== x.id))}><Icon name="trash" size={16} /></button>
          </div>
        ))}</div>
        <button type="button" className="add-link" onClick={() => set('kesehatan', [...d.kesehatan, { id: rid('h'), nama: '', aktif: true }])}><Icon name="plus" size={18} />Tambah status kesehatan</button>
      </div>
      {tried && errs.length > 0 && <Note><div><b>Periksa lagi sebelum menyimpan:</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{errs.map((e) => <li key={e}>{e}</li>)}</ul></div></Note>}
      <div className="row-end"><Btn kind="ghost" disabled={!dirty} onClick={() => { setD(load(br)); setTried(false); toast('Perubahan dibatalkan') }}>Reset</Btn><Btn disabled={!dirty} onClick={save}>Save</Btn></div>
      {map && <MapPick loc={map} onClose={() => setMap(null)} onSave={(p) => { set('lokasi', d.lokasi.some((l) => l.id === map.id) ? d.lokasi.map((l) => l.id === map.id ? { ...l, ...p } : l) : [...d.lokasi, { ...map, ...p }]); setMap(null) }} />}
      <Modal open={!!del} title="Hapus?" onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn><Btn onClick={() => { set(del.k, d[del.k].filter((x) => x.id !== del.id)); setDel(null) }}>Hapus</Btn></>}>
        <p style={{ margin: 0 }}>{del?.nama} akan dihapus dari pengaturan ini. Perubahan baru berlaku setelah Save.</p>
      </Modal>
      <Modal open={saved} title="Tersimpan" onClose={() => setSaved(false)} footer={<Btn onClick={() => setSaved(false)}>OK</Btn>}>
        <div className="center"><Icon name="checkCircle" size={44} /><p style={{ margin: 0 }}>Setup absen {name} berhasil disimpan.</p></div>
      </Modal>
      {t}
    </Card>
  )
}

function MapPick({ loc, onClose, onSave }) {
  const [origin] = useState({ lat: loc.lat, lng: loc.lng })
  const [p, setP] = useState({ lat: loc.lat, lng: loc.lng, alamat: loc.alamat || '', radius: loc.radius || 100 }); const [msg, setMsg] = useState('')
  const SPAN_LNG = 0.02, SPAN_LAT = 0.012
  const x = 50 + (p.lng - origin.lng) / SPAN_LNG * 100; const y = 50 - (p.lat - origin.lat) / SPAN_LAT * 100
  const rad = p.radius / 1000 / (SPAN_LNG * 111) * 100
  const click = (e) => { const r = e.currentTarget.getBoundingClientRect(); const fx = (e.clientX - r.left) / r.width; const fy = (e.clientY - r.top) / r.height; setP({ ...p, lng: +(origin.lng + (fx - 0.5) * SPAN_LNG).toFixed(6), lat: +(origin.lat - (fy - 0.5) * SPAN_LAT).toFixed(6) }) }
  const mine = () => {
    if (!navigator.geolocation) return setMsg('Perangkat ini tidak mendukung lokasi.')
    setMsg('Mencari lokasimu…')
    navigator.geolocation.getCurrentPosition((g) => { setP({ ...p, lat: +g.coords.latitude.toFixed(6), lng: +g.coords.longitude.toFixed(6) }); setMsg('Lokasi ditemukan.') }, () => setMsg('Izin lokasi ditolak atau tidak tersedia.'), { timeout: 8000 })
  }
  return (
    <Modal wide open title="Pilih lokasi pada peta" onClose={onClose} footer={<><Btn kind="ghost" onClick={() => setP({ lat: origin.lat, lng: origin.lng, alamat: loc.alamat || '', radius: loc.radius || 100 })}>Reset</Btn><Btn disabled={!p.alamat.trim()} onClick={() => onSave(p)}>Konfirmasi lokasi</Btn></>}>
      <div className="map-pick" onClick={click} role="button" tabIndex={0} aria-label="Klik untuk memindahkan titik lokasi">
        <span className="map-rad" style={{ left: x + '%', top: y + '%', width: rad * 2 + '%', aspectRatio: '1' }} />
        <span className="map-pin" style={{ left: x + '%', top: y + '%' }}><Icon name="pin" size={36} /></span>
      </div>
      <div className="row-end" style={{ marginTop: 0, justifyContent: 'space-between' }}><span className="muted sm">{msg || 'Klik denah untuk memindahkan titik.'}</span><Btn kind="ghost" icon="pin" onClick={mine}>Gunakan lokasi saya</Btn></div>
      <div className="form two"><Field label="Latitude"><input type="number" step="0.000001" value={p.lat} onChange={(e) => setP({ ...p, lat: Number(e.target.value) })} /></Field><Field label="Longitude"><input type="number" step="0.000001" value={p.lng} onChange={(e) => setP({ ...p, lng: Number(e.target.value) })} /></Field></div>
      <Field label="Alamat" hint="Wajib diisi. Tampil ke karyawan saat absen."><textarea rows={2} value={p.alamat} onChange={(e) => setP({ ...p, alamat: e.target.value })} /></Field>
      <Field label="Radius absen" hint="Karyawan WFO harus berada dalam radius ini saat absen."><select value={p.radius} onChange={(e) => setP({ ...p, radius: Number(e.target.value) })}>{[50, 100, 200, 300, 500].map((m) => <option key={m} value={m}>{m} meter</option>)}</select></Field>
      <p className="muted sm" style={{ margin: 0 }}>Prototipe memakai denah sederhana. Versi rilis memakai peta asli (Google Maps), dengan alamat terisi otomatis dari titik.</p>
    </Modal>
  )
}

// ---------- Blackout dates (bisa diubah) ----------
export function BlackoutEditor({ canU = true }) {
  const s = useStore(); const [t, toast] = useToast(); const [ed, setEd] = useState(null); const [del, setDel] = useState(null)
  const list = (s.blackout || []).map((b, i) => ({ ...b, i })).sort((a, b) => a.dari.localeCompare(b.dari))
  const brName = (id) => s.branches.find((b) => b.id === id)?.name
  const ok = ed && ed.dari && ed.sampai && ed.sampai >= ed.dari && ed.nama.trim() && (ed.semua || ed.branches.length)
  const save = () => {
    const item = { dari: ed.dari, sampai: ed.sampai, nama: ed.nama.trim(), ...(ed.semua ? {} : { branches: ed.branches }) }
    const next = [...(s.blackout || [])]; if (ed.i != null) next[ed.i] = item; else next.push(item)
    api.saveBlackoutList(next); setEd(null); toast('Blackout date disimpan')
  }
  return (
    <Card title="Blackout dates" action={canU && <Btn icon="plus" onClick={() => setEd({ i: null, dari: '', sampai: '', nama: '', semua: true, branches: [] })}>Tambahkan blackout date</Btn>} pad={false}>
      <Table rows={list} empty="Belum ada blackout date." cols={[
        { h: 'Tanggal', r: (r) => <span className="nowrap">{fmtDate(r.dari)}{r.sampai !== r.dari ? ' – ' + fmtDate(r.sampai) : ''}</span> },
        { h: 'Keterangan', r: (r) => <strong>{r.nama}</strong> },
        { h: 'Berlaku untuk', r: (r) => r.branches?.length ? r.branches.map(brName).join(', ') : 'Semua Branch' },
        { h: '', r: (r) => canU && <div className="row-act"><button className="icon-btn" aria-label={'Edit ' + r.nama} onClick={() => setEd({ ...r, semua: !r.branches?.length, branches: r.branches || [] })}><Icon name="edit" size={18} /></button><button className="icon-btn" aria-label={'Hapus ' + r.nama} onClick={() => setDel(r)}><Icon name="trash" size={18} /></button></div> },
      ]} />
      <p className="muted sm" style={{ padding: '0 24px 16px' }}>Karyawan tidak bisa mengajukan cuti pada tanggal ini. Kalender di form cuti app Talent ikut menandainya.</p>
      <Modal open={!!ed} title={ed?.i != null ? 'Edit blackout date' : 'Tambahkan blackout date'} onClose={() => setEd(null)} footer={<><Btn kind="ghost" onClick={() => setEd(null)}>Batal</Btn><Btn disabled={!ok} onClick={save}>Simpan</Btn></>}>
        {ed && <div className="form">
          <div className="form two"><Field label="Dari tanggal"><input type="date" value={ed.dari} onChange={(e) => setEd({ ...ed, dari: e.target.value, sampai: ed.sampai || e.target.value })} /></Field>
            <Field label="Sampai tanggal"><input type="date" value={ed.sampai} min={ed.dari} onChange={(e) => setEd({ ...ed, sampai: e.target.value })} /></Field></div>
          {ed.dari && ed.sampai && ed.sampai < ed.dari && <span className="err-t">Tanggal sampai tidak boleh sebelum tanggal dari.</span>}
          <Field label="Keterangan"><input value={ed.nama} onChange={(e) => setEd({ ...ed, nama: e.target.value })} placeholder="Contoh: Tutup buku akhir tahun" /></Field>
          <fieldset className="rg"><legend>Berlaku untuk</legend>
            <label className="chk-l"><input type="checkbox" checked={ed.semua} onChange={(e) => setEd({ ...ed, semua: e.target.checked })} />Semua Branch</label>
            {!ed.semua && s.branches.map((b) => <label key={b.id} className="chk-l"><input type="checkbox" checked={ed.branches.includes(b.id)} onChange={(e) => setEd({ ...ed, branches: e.target.checked ? [...ed.branches, b.id] : ed.branches.filter((x) => x !== b.id) })} />{b.name}</label>)}
          </fieldset>
        </div>}
      </Modal>
      <Modal open={!!del} title="Hapus blackout date" onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn><Btn kind="danger" onClick={() => { api.saveBlackoutList((s.blackout || []).filter((_, j) => j !== del.i)); setDel(null); toast('Blackout date dihapus') }}>Hapus</Btn></>}>
        <p>Hapus blackout <b>{del?.nama}</b>? Karyawan bisa mengajukan cuti lagi di tanggal itu.</p>
      </Modal>
      {t}
    </Card>
  )
}

// ---------- Rekap bulanan per Branch (kalender) ----------
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
export function RekapBulanan({ year }) {
  const s = useStore(); const now = new Date()
  const [br, setBr] = useState(s.branches[0]?.id || ''); const [m, setM] = useState(year === now.getFullYear() ? now.getMonth() : 0)
  const hari = s.workCal?.[br]?.hari || [1, 2, 3, 4, 5]
  const days = new Date(year, m + 1, 0).getDate(); const lead = (new Date(year, m, 1).getDay() + 6) % 7
  const inBlackout = (d) => (s.blackout || []).some((b) => d >= b.dari && d <= b.sampai && (!b.branches?.length || b.branches.includes(br)))
  const info = Array.from({ length: days }, (_, i) => { const d = iso(year, m, i + 1); const w = new Date(d + 'T00:00:00').getDay() || 7; const hol = holidayOn(s, br, d); return { d, n: i + 1, kerja: hari.includes(w) && !hol, hol, black: inBlackout(d) } })
  const kerja = info.filter((x) => x.kerja).length
  return (
    <Card title={`Rekapan ${BLN[m]} ${year}`} action={<BranchPick value={br} onChange={setBr} />}>
      <div className="cal-wrap">
        <div className="cal-sum">
          <div><span>Hari kerja</span><b>{kerja} hari</b></div><div><span>Hari libur</span><b>{days - kerja} hari</b></div>
          <div><span>Total hari</span><b>{days} hari</b></div><div><span>Blackout</span><b>{info.filter((x) => x.black).length} hari</b></div>
        </div>
        <div className="mcal">
          <div className="mcal-h"><button type="button" className="icon-btn" aria-label="Bulan sebelumnya" disabled={m === 0} onClick={() => setM(m - 1)}><Icon name="back" size={18} /></button><strong>{BLN[m]} {year}</strong><button type="button" className="icon-btn" aria-label="Bulan berikutnya" disabled={m === 11} onClick={() => setM(m + 1)}><Icon name="arrowRight" size={18} /></button></div>
          <div className="mcal-g">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((h, i) => <span key={h} style={!hari.includes(i + 1) ? { color: 'var(--bad)' } : undefined}>{h}</span>)}
            {Array.from({ length: lead }, (_, i) => <i key={'e' + i} />)}
            {info.map((x) => <i key={x.d} title={x.hol ? x.hol.nama : x.black ? 'Blackout' : x.kerja ? 'Hari kerja' : 'Libur'} className={x.hol ? 'hol' : x.black ? 'black' : !x.kerja ? 'off' : ''} style={x.hol ? { color: 'var(--bad)', fontWeight: 800 } : x.black ? { boxShadow: 'inset 0 0 0 2px #9a6b00', borderRadius: 8 } : !x.kerja ? { color: 'var(--bad)' } : undefined}>{x.n}</i>)}
          </div>
          <p className="muted sm" style={{ margin: '8px 0 0' }}><Badge t="bad">Merah</Badge> libur · <Badge t="warn">Bingkai</Badge> blackout</p>
        </div>
      </div>
      {info.some((x) => x.hol) && <ul className="hol-list" style={{ marginTop: 12 }}>{info.filter((x) => x.hol).map((x) => <li key={x.d}><Badge t="bad">{x.n}</Badge><span><b>{x.hol.nama}</b>{x.hol.jenis}</span></li>)}</ul>}
    </Card>
  )
}
