// Absensi offline-first (app karyawan + web Talent).
// - ClockModal: selfie + GPS + kondisi kesehatan → disimpan di HP lalu dikirim otomatis
// - NetBanner: status sinyal & antrean di atas setiap halaman
// - SyncChip: status satu absen (Tersimpan di HP / Mengirim / Terkirim / Gagal)
// - AntreanAbsen: daftar absen yang belum/sudah terkirim + Kirim sekarang
// - UjiOffline: alat uji coba prototipe (putus sinyal, geser jam HP, absen tertunda)
import React, { useEffect, useState } from 'react'
import { useStore } from '../services/store.js'
import { Btn, Card, Badge, Modal, useToast, PageHead, Note, Icon, Empty, Toggle } from './ui.jsx'
import { SelfieCamera } from './Camera.jsx'
import { ME } from '../services/session.js'
import { useNet, net } from '../../services/net.js'
import { useOutbox, outbox, pendingOf } from '../../services/outbox.js'
import { absenSync } from '../../services/absenSync.js'
import { getPosition, nearestOffice } from '../../services/geo.js'
import { compressDataUrl } from '../../services/image.js'
import { offlineSetting } from '../../services/mockServer.js'
import { deviceClock, hhmm, isoDate } from '../../services/deviceClock.js'
import { fmtDate } from '../pages/shared.jsx'

// Pratinjau web (kamera sering diblokir di bingkai pratinjau): foto contoh berinisial. Tidak muncul di aplikasi Android.
function sampleSelfie(name = 'K') {
  try { const c = document.createElement('canvas'); c.width = 360; c.height = 480; const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, 0, 480); g.addColorStop(0, '#c1d276'); g.addColorStop(1, '#0a5950'); x.fillStyle = g; x.fillRect(0, 0, 360, 480)
    x.fillStyle = '#f5f5eb'; x.beginPath(); x.arc(180, 190, 90, 0, 7); x.fill(); x.fillRect(70, 300, 220, 200)
    x.fillStyle = '#0a5950'; x.font = '800 72px Poppins, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.split(' ').map((w) => w[0]).join('').slice(0, 2), 180, 195)
    return c.toDataURL('image/jpeg', 0.8) } catch (e) { return '' }
}
const ST = { pending: ['Tersimpan di HP', 'warn', 'phone'], sending: ['Mengirim…', 'neutral', 'refresh'], sent: ['Terkirim', 'ok', 'checkCircle'], failed: ['Gagal terkirim', 'bad', 'x'] }

export function SyncChip({ rec }) {
  if (!rec) return null
  const [l, tn] = ST[rec.status] || ST.pending
  const hr = rec.result?.perluHR
  return <span className={`sync-chip ${rec.status}`} title={rec.result?.flags?.join(' · ') || rec.lastError || ''}><Badge t={hr ? 'warn' : tn}>{hr ? 'Terkirim · dicek HR' : l}</Badge></span>
}

export function NetBanner({ go, onlyFailed }) {
  const { online, simulated } = useNet(); const list = useOutbox()
  const mine = list.filter((r) => r.emp === ME)
  const wait = mine.filter((r) => r.status === 'pending' || r.status === 'sending').length; const bad = mine.filter((r) => r.status === 'failed').length
  if (online && !wait && !bad) return null
  if (onlyFailed && !bad) return null // aplikasi: status sinyal & antrean sudah ada di pill top bar
  return (
    <div className={`net-banner ${online ? (bad ? 'bad' : 'sync') : 'off'}`} role="status" aria-live="polite">
      <Icon name={online ? (bad ? 'x' : 'refresh') : 'wifiOff'} size={18} />
      <span className="grow">{!online ? <><b>Kamu sedang offline{simulated ? ' (simulasi)' : ''}.</b> Absen tetap bisa, tersimpan di HP dan dikirim otomatis saat sinyal kembali.{wait ? ` ${wait} absen menunggu dikirim.` : ''}</>
        : bad ? <><b>{bad} absen gagal terkirim.</b> Buka antrean untuk melihat alasannya.</> : <><b>Mengirim {wait} absen…</b> Jangan tutup aplikasi dulu, ya.</>}</span>
      {(wait > 0 || bad > 0) && <button type="button" className="lnk" onClick={() => go('absensi/antrean')}>Lihat antrean</button>}
    </div>
  )
}

export function ClockModal({ kind, me, onClose, onDone }) {
  const s = useStore(); const { online } = useNet()
  const set = s.absenSetup?.[me.branch] || {}; const mode = set.mode || { WFO: true, WFA: false }
  const sehat = (set.kesehatan || []).filter((x) => x.aktif)
  const off = offlineSetting(s, me.branch)
  const [foto, setFoto] = useState(''); const [gps, setGps] = useState(null); const [gErr, setGErr] = useState(null); const [busy, setBusy] = useState(true)
  const [kes, setKes] = useState(''); const [saving, setSaving] = useState(false); const [err, setErr] = useState(''); const [noGps, setNoGps] = useState(false)
  const office0 = (set.lokasi || []).find((l) => l.aktif && l.lat != null)
  const locate = () => {
    setBusy(true); setGErr(null)
    // Prototipe: bila browser/pratinjau menolak GPS, pakai titik dekat kantor dan beri tanda "lokasi demo"
    getPosition({ demoFallback: office0 ? { lat: +(office0.lat + 0.00018).toFixed(6), lng: +(office0.lng + 0.00012).toFixed(6), acc: 18 } : null })
      .then((p) => { setGps(p); setBusy(false) }).catch((e) => { setGErr(e); setBusy(false) })
  }
  useEffect(() => { if (kind) { setFoto(''); setKes(''); setErr(''); setNoGps(false); setGps(null); locate() } }, [kind])
  if (!kind) return null
  const near = gps ? nearestOffice(gps, set.lokasi) : null
  const inRadius = near && near.jarak <= (near.radius || 100)
  const absenMode = mode.WFO && inRadius ? 'WFO' : mode.WFA ? 'WFA' : 'WFO'
  const blockedRadius = gps && mode.WFO && !mode.WFA && !inRadius
  const blockedOffline = !online && !off.aktif
  const needKes = kind === 'in' && sehat.length > 0
  const can = foto && !busy && !blockedRadius && !blockedOffline && (gps || noGps) && (!needKes || kes) && !saving
  const save = async () => {
    setSaving(true); setErr('')
    try {
      const small = await compressDataUrl(foto, 480, 0.72)
      const rec = await absenSync.capture({ emp: ME, branch: me.branch, jenis: kind, foto: small, gps: gps || null, kantor: near ? { nama: near.nama, jarak: near.jarak, radius: near.radius } : null, mode: absenMode, kesehatan: kes, shift: me.shift })
      onDone(rec)
    } catch (e) { setErr(e.message || 'Absen belum bisa disimpan.') } finally { setSaving(false) }
  }
  return (
    <Modal open title={window.KIRANA_APP ? (kind === 'in' ? 'Absen masuk' : 'Absen pulang') : kind === 'in' ? 'Clock in' : 'Clock out'} onClose={onClose} footer={<><Btn kind="ghost" onClick={onClose}>Batal</Btn><Btn disabled={!can} onClick={save}>{saving ? 'Menyimpan…' : `Konfirmasi ${kind === 'in' ? 'masuk' : 'pulang'}`}</Btn></>}>
      {!online && <Note><div><b>Offline.</b> {off.aktif ? `Absenmu disimpan di HP dan dikirim otomatis saat sinyal kembali (batas ${off.batasJam} jam; lewat dari itu perlu persetujuan HR).` : 'Branch-mu belum mengizinkan absen offline. Cari sinyal dulu, ya.'}</div></Note>}
      <SelfieCamera value={foto} onChange={setFoto} label={kind === 'in' ? 'Selfie masuk' : 'Selfie pulang'} />
      {!foto && !window.Capacitor?.isNativePlatform?.() && <button type="button" className="lnk" style={{ justifySelf: 'center' }} onClick={() => setFoto(sampleSelfie(me.name))}>Kamera tidak bisa dipakai di pratinjau? Pakai foto contoh</button>}
      <div className={`gps-box ${blockedRadius ? 'bad' : gps ? 'ok' : ''}`}>
        <Icon name="pin" size={18} />
        <div className="grow">{busy ? 'Mencari lokasimu… (GPS tetap jalan tanpa sinyal data)'
          : gErr && !noGps ? <><b>{gErr.text}</b></>
          : noGps ? <><b>Tanpa lokasi.</b> Absen tetap tersimpan, HR akan mengeceknya.</>
          : near ? <><b>{inRadius ? `Di ${near.nama}` : `${near.jarak} m dari ${near.nama}`}</b> · radius {near.radius || 100} m · akurasi ±{gps.acc} m{gps.demo ? ' · lokasi demo (prototipe)' : ''}{!inRadius && mode.WFA ? ' · tercatat WFA' : ''}</>
          : <><b>Lokasi didapat</b> · akurasi ±{gps.acc} m{absenMode === 'WFA' ? ' · WFA' : ''}</>}</div>
        {!busy && <button type="button" className="lnk" onClick={locate}>Ulangi</button>}
      </div>
      {gErr && !noGps && !busy && <button type="button" className="lnk" onClick={() => setNoGps(true)}>Lanjut tanpa lokasi (perlu dicek HR)</button>}
      {blockedRadius && <p className="err-t" style={{ margin: 0 }}>Kamu di luar radius kantor. Absen di Branch ini hanya bisa dari lokasi kantor.</p>}
      {needKes && <fieldset className="kes-pick"><legend className="field-l">Kondisi kesehatan hari ini</legend><div className="chips">{sehat.map((x) => <button key={x.id} type="button" className={`chip ${kes === x.nama ? 'on' : ''}`} aria-pressed={kes === x.nama} onClick={() => setKes(x.nama)}>{x.nama}</button>)}</div></fieldset>}
      {err && <p className="err-t" role="alert" style={{ margin: 0 }}>{err}</p>}
      <p className="muted sm" style={{ margin: 0 }}>Jam absen dicatat {hhmm(deviceClock.deviceNow()).replace(':', '.')} di HP ini. Server mencocokkan ulang jam & lokasinya saat data terkirim.</p>
    </Modal>
  )
}

export function AntreanAbsen({ go }) {
  const list = useOutbox().filter((r) => r.emp === ME).sort((a, b) => b.createdAt - a.createdAt); const { online } = useNet(); const [t, toast] = useToast()
  const [del, setDel] = useState(null)
  const wait = pendingOf(list).length
  return (
    <>
      <nav className="crumb"><button onClick={() => go('absensi')}>Absensi</button><span>›</span><b>Antrean kirim</b></nav>
      <PageHead title="Antrean kirim absen" sub="Absen disimpan di HP dulu, lalu dikirim otomatis saat ada sinyal. Riwayat terkirim disimpan 7 hari.">
        <Btn icon="refresh" disabled={!online || !wait} onClick={async () => { await absenSync.retryNow(); toast('Mencoba mengirim…') }}>Kirim sekarang</Btn>
      </PageHead>
      {!outbox.persistent() && <Note><div>Tampilan ini tidak bisa menyimpan data permanen di perangkat (pratinjau). Di aplikasi Android, antrean tetap tersimpan walau aplikasi ditutup.</div></Note>}
      {list.length === 0 ? <Card><Empty text="Belum ada absen di antrean." /></Card> : (
        <div className="q-list">{list.map((r) => (
          <article key={r.id} className={`q-item ${r.status}`}>
            {r.foto && <img src={r.foto} alt="" className="q-foto" />}
            <div className="grow">
              <strong>{r.jenis === 'in' ? 'Clock in' : 'Clock out'} · {fmtDate(r.tanggal)} {r.jam.replace(':', '.')}</strong>
              <small className="muted">{r.mode}{r.kantor ? ` · ${r.kantor.nama} (${r.kantor.jarak} m)` : r.gps ? '' : ' · tanpa lokasi'}{r.kesehatan ? ` · ${r.kesehatan}` : ''}{r.offline ? ' · dibuat saat offline' : ''}</small>
              {r.status === 'sent' && <small className="muted">Diterima server {r.result?.diterima?.slice(11)} · tercatat {r.result?.jam?.replace(':', '.')}{r.result?.jam !== r.jam ? ` (jam HP ${r.jam.replace(':', '.')})` : ''}</small>}
              {r.status !== 'sent' && r.lastError && <small className="muted">{r.lastError}{r.tries ? ` · dicoba ${r.tries}×` : ''}</small>}
              {r.result?.flags?.length > 0 && <ul className="q-flags">{r.result.flags.map((f) => <li key={f}>{f}</li>)}</ul>}
            </div>
            <div className="q-act"><SyncChip rec={r} />{r.status === 'failed' && <button className="icon-btn" aria-label="Hapus dari antrean" onClick={() => setDel(r)}><Icon name="trash" size={16} /></button>}</div>
          </article>
        ))}</div>
      )}
      <Modal open={!!del} title="Hapus absen gagal?" onClose={() => setDel(null)} footer={<><Btn kind="ghost" onClick={() => setDel(null)}>Batal</Btn><Btn onClick={() => { outbox.remove(del.id); setDel(null) }}>Hapus</Btn></>}>
        <p style={{ margin: 0 }}>Absen ini tidak akan dikirim. Hubungi HR bila perlu koreksi absen.</p>
      </Modal>
      {t}
    </>
  )
}

// Alat uji coba prototipe (tidak ada di rilis)
export function UjiOffline() {
  const { simulated } = useNet(); const [skew, setSkew] = useState(deviceClock.skewMin()); const [t, toast] = useToast(); const s = useStore()
  const me = s.employees.find((e) => e.id === ME) || {}
  const late = async () => {
    // absen masuk 4 hari lalu yang baru terkirim sekarang (contoh lewat batas 72 jam)
    const ago = 4 * 864e5; const at = deviceClock.deviceNow() - ago
    const set = s.absenSetup?.[me.branch] || {}; const o = (set.lokasi || []).find((l) => l.aktif)
    await outbox.add({ id: 'uji-' + Date.now().toString(36), kind: 'attendance', emp: ME, branch: me.branch, jenis: 'in', foto: '', gps: o ? { lat: o.lat, lng: o.lng, acc: 15, demo: true } : null, kantor: o ? { nama: o.nama, jarak: 0, radius: o.radius } : null, mode: 'WFO', kesehatan: '', shift: me.shift,
      tanggal: isoDate(at), jam: hhmm(at), offline: true, clock: { deviceAt: at, mono: deviceClock.mono() - ago, session: deviceClock.session, anchor: deviceClock.anchor() }, status: 'pending', tries: 0, createdAt: Date.now() - ago })
    absenSync.flush(); toast('Contoh absen tertunda ditambahkan ke antrean')
  }
  return (
    <Card title="Uji coba offline (khusus prototipe)">
      <p className="muted sm" style={{ marginTop: 0 }}>Untuk mencoba alur susah sinyal tanpa mematikan internet. Tidak ada di aplikasi rilis.</p>
      <div className="uji-row"><div className="grow"><b>Putus sinyal</b><small className="muted">Aplikasi menganggap tidak ada sinyal. Absen masuk antrean.</small></div><Toggle on={simulated} onChange={() => { net.setSimulated(!simulated); toast(!simulated ? 'Simulasi offline aktif' : 'Sinyal kembali, mengirim antrean…') }} label={simulated ? 'Offline' : 'Online'} /></div>
      <div className="uji-row"><div className="grow"><b>Geser jam HP</b><small className="muted">Meniru karyawan yang mengubah jam HP. Server tetap memakai jam sebenarnya & menandainya.</small></div>
        <select value={skew} aria-label="Geser jam HP" onChange={(e) => { setSkew(Number(e.target.value)); deviceClock.setSkew(e.target.value); toast(Number(e.target.value) ? `Jam HP digeser ${e.target.value} menit` : 'Jam HP normal') }}>
          {[[0, 'Normal'], [-60, '1 jam lebih awal'], [-30, '30 menit lebih awal'], [45, '45 menit lebih lambat']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div className="uji-row"><div className="grow"><b>Absen tertunda 4 hari</b><small className="muted">Contoh absen offline yang baru terkirim setelah lewat batas → "Perlu persetujuan HR".</small></div><Btn kind="ghost" onClick={late}>Tambahkan</Btn></div>
      {t}
    </Card>
  )
}
