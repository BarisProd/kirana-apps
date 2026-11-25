// Absen di aplikasi: 2 langkah. (1) Kamera tegak layar penuh → jepret sekali. (2) Cek foto, lokasi, kondisi → konfirmasi.
// Logika & aturan sama dengan web (useClockForm); hanya tampilannya yang dibuat untuk HP.
import React, { useRef, useState } from 'react'
import { Icon, Note } from '../../talent/components/ui.jsx'
import { useCamera, CamError } from '../../talent/components/Camera.jsx'
import { captureFrame } from '../../talent/services/camera.js'
import { useClockForm, GpsBox, sampleSelfie } from '../../talent/components/OfflineAbsen.jsx'
import { deviceClock, hhmm } from '../../services/deviceClock.js'
import { haptic } from '../../services/haptics.js'

export function AppClock({ kind, me, onClose, onDone }) {
  const f = useClockForm(kind, me, onDone)
  const judul = kind === 'in' ? 'Absen masuk' : 'Absen pulang'
  return f.foto ? <Step2 f={f} kind={kind} judul={judul} onClose={onClose} me={me} /> : <Step1 f={f} judul={judul} onClose={onClose} me={me} />
}

function Step1({ f, judul, onClose, me }) {
  const cam = useCamera({ enabled: true })
  const view = useRef(null); const [flash, setFlash] = useState(false)
  const shoot = () => {
    const v = cam.videoRef.current; if (!v || cam.state !== 'ready') return
    const r = view.current.getBoundingClientRect()
    haptic.tap(); setFlash(true)
    const img = captureFrame(v, { aspect: r.width / r.height })
    setTimeout(() => { setFlash(false); f.setFoto(img) }, 160)
  }
  const loc = f.busy ? 'Mencari lokasi…' : f.near ? (f.inRadius ? `Di ${f.near.nama}` : `${f.near.jarak} m dari ${f.near.nama}`) : f.gps ? 'Lokasi didapat' : 'Lokasi belum didapat'
  return (
    <div className="ac ac-cam" role="dialog" aria-modal="true" aria-label={judul}>
      <header className="ac-top">
        <button type="button" className="ac-x" onClick={onClose} aria-label="Tutup"><Icon name="x" size={22} /></button>
        <b>{judul}</b>
        <span className={`ac-loc ${f.busy ? '' : f.inRadius || (f.gps && !f.near) ? 'ok' : 'warn'}`}><Icon name="pin" size={14} />{loc}</span>
      </header>
      <div ref={view} className={`ac-view ${flash ? 'flash' : ''}`}>
        {cam.state === 'error' ? <CamError err={cam.err} onRetry={cam.retry} /> : <>
          <video ref={cam.videoRef} className="mirror" playsInline muted autoPlay aria-label="Pratinjau kamera" />
          {cam.state === 'loading' && <span className="ac-load">Menyalakan kamera…</span>}
          <span className="ac-oval" aria-hidden="true" />
        </>}
      </div>
      <div className="ac-bottom">
        {!f.online && <p className="ac-off"><Icon name="wifiOff" size={14} />Offline · absen tetap tersimpan di HP</p>}
        <p className="ac-tip">{cam.state === 'ready' ? 'Pas-kan wajah di dalam oval, lalu tekan tombol' : ' '}</p>
        <button type="button" className="ac-shutter" disabled={cam.state !== 'ready'} onClick={shoot} aria-label="Ambil foto"><span /></button>
        {cam.state !== 'ready' && !window.Capacitor?.isNativePlatform?.() && <button type="button" className="ac-sample" onClick={() => f.setFoto(sampleSelfie(me.name))}>Kamera tidak bisa dipakai? Pakai foto contoh</button>}
      </div>
    </div>
  )
}

function Step2({ f, kind, judul, onClose }) {
  const hint = f.busy ? 'Menunggu lokasi…' : f.blockedRadius ? 'Kamu di luar radius kantor' : f.blockedOffline ? 'Butuh sinyal untuk absen di Branch ini'
    : !f.gps && !f.noGps ? 'Lokasi belum didapat' : f.needKes && !f.kes ? 'Pilih kondisi kesehatan dulu' : ''
  return (
    <div className="ac ac-form" role="dialog" aria-modal="true" aria-label={judul}>
      <header className="ac-top light">
        <button type="button" className="ac-x" onClick={() => f.setFoto('')} aria-label="Kembali ke kamera"><Icon name="back" size={22} /></button>
        <b>{judul}</b>
        <button type="button" className="ac-x" onClick={onClose} aria-label="Batalkan absen"><Icon name="x" size={22} /></button>
      </header>
      <div className="ac-body">
        {!f.online && <Note><div><b>Offline.</b> {f.off.aktif ? `Absenmu disimpan di HP dan dikirim otomatis saat sinyal kembali (batas ${f.off.batasJam} jam).` : 'Branch-mu belum mengizinkan absen offline. Cari sinyal dulu, ya.'}</div></Note>}
        <section className="ac-photo">
          <img src={f.foto} alt="Foto selfie yang diambil" />
          <div className="grow"><b>Foto selfie</b><small>Pastikan wajahmu terlihat jelas.</small>
            <button type="button" className="ac-retake" onClick={() => f.setFoto('')}><Icon name="camera" size={16} />Ulangi foto</button></div>
        </section>
        <GpsBox f={f} />
        {f.needKes && <fieldset className="kes-pick"><legend className="field-l">Kondisi kesehatan hari ini</legend><div className="chips">{f.sehat.map((x) => <button key={x.id} type="button" className={`chip ${f.kes === x.nama ? 'on' : ''}`} aria-pressed={f.kes === x.nama} onClick={() => { haptic.tap(); f.setKes(x.nama) }}>{x.nama}</button>)}</div></fieldset>}
        {f.err && <p className="err-t" role="alert" style={{ margin: 0 }}>{f.err}</p>}
        <p className="muted sm" style={{ margin: 0 }}>Jam absen {hhmm(deviceClock.deviceNow()).replace(':', '.')} di HP ini. Server mencocokkan ulang jam & lokasi saat data terkirim.</p>
      </div>
      <footer className="ac-foot">
        {hint && <small>{hint}</small>}
        <button type="button" className="btn btn-primary" disabled={!f.can} onClick={f.save}>{f.saving ? 'Menyimpan…' : `Konfirmasi ${kind === 'in' ? 'masuk' : 'pulang'}`}</button>
      </footer>
    </div>
  )
}
