// Layar pengenalan pemakaian pertama: jelaskan dulu KENAPA izin dibutuhkan, baru munculkan dialog sistem.
// Muncul sekali setelah login pertama (prefs.onboarded). Bisa dibuka lagi dari Profil › Izin aplikasi.
import React, { useEffect, useState } from 'react'
import { Icon } from '../talent/components/ui.jsx'
import { checkPerm, requestPerm } from '../services/permissions.js'
import { haptic } from '../services/haptics.js'
import { setPrefs, getPrefs, isNative } from './appState.js'

const STEPS = [
  { k: 'camera', ic: 'camera', t: 'Izinkan kamera', d: 'Kamera dipakai untuk foto selfie saat kamu menekan tombol absen. Tidak ada foto yang diambil di luar itu.', btn: 'Izinkan kamera' },
  { k: 'location', ic: 'pin', t: 'Izinkan lokasi', d: 'Lokasi dipakai untuk memastikan kamu berada di area kantor. Lokasi hanya dicatat saat kamu absen, bukan sepanjang hari.', btn: 'Izinkan lokasi' },
  { k: 'notif', ic: 'bellRing', t: 'Nyalakan pengingat', d: null, btn: 'Nyalakan pengingat' },
]
const HOW = () => isNative()
  ? 'Buka Pengaturan HP › Aplikasi › Kirana › Izin, lalu izinkan.'
  : 'Ketuk ikon gembok di samping alamat situs › Izin situs, lalu izinkan.'

export function Onboarding({ me, onDone }) {
  const [steps, setSteps] = useState(null) // langkah izin yang masih perlu (yang sudah diizinkan dilewati)
  const [i, setI] = useState(0)            // 0 = sambutan, 1..n = izin, n+1 = selesai
  const [st, setSt] = useState({})
  const [busy, setBusy] = useState(false)
  const first = (me.name || 'Kamu').split(' ')[0]
  const menit = getPrefs().menitSebelum

  useEffect(() => { (async () => {
    const res = {}; for (const s of STEPS) res[s.k] = await checkPerm(s.k)
    setSt(res); setSteps(STEPS.filter((s) => res[s.k] !== 'unsupported' && res[s.k] !== 'granted'))
  })() }, [])

  if (!steps) return null
  const n = steps.length; const last = n + 1; const cur = i >= 1 && i <= n ? steps[i - 1] : null
  const next = () => setI((x) => Math.min(last, x + 1))
  const finish = () => { setPrefs({ onboarded: true }); haptic.success(); onDone() }
  const ask = async () => {
    setBusy(true); const r = await requestPerm(cur.k); setBusy(false)
    setSt((o) => ({ ...o, [cur.k]: r }))
    if (r === 'granted') { haptic.success(); setTimeout(next, 650) } else haptic.warn()
  }
  const granted = cur && st[cur.k] === 'granted'; const denied = cur && st[cur.k] === 'denied'

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-labelledby="ob-t">
      <div className="ob-top">
        {i > 0 && i < last ? <button type="button" className="ob-skip" onClick={() => setI(last)}>Lewati</button> : <span />}
      </div>
      <div className="ob-body" key={i}>
        {i === 0 && <>
          <span className="ob-art"><Icon name="smartphone" size={44} /></span>
          <h2 id="ob-t">Halo, {first}!</h2>
          <p>Kirana bantu kamu absen, mengajukan cuti, dan cek slip gaji langsung dari HP.</p>
          <ul className="ob-pts">
            <li><Icon name="wifiOff" size={18} /><span>Sinyal lemah? Absen tetap tersimpan di HP dan terkirim otomatis.</span></li>
            <li><Icon name="bellRing" size={18} /><span>Pengingat sebelum jam masuk supaya nggak telat.</span></li>
            <li><Icon name="lock" size={18} /><span>Slip gaji terkunci, hanya kamu yang bisa buka.</span></li>
          </ul>
          {n > 0 && <p className="ob-note">Sebelum mulai, ada {n} izin yang perlu kamu berikan. Kami jelaskan dulu kegunaannya.</p>}
        </>}
        {cur && <>
          <span className={`ob-art ${granted ? 'ok' : denied ? 'bad' : ''}`}><Icon name={granted ? 'check' : cur.ic} size={44} /></span>
          <small className="ob-step">Izin {i} dari {n}</small>
          <h2 id="ob-t">{cur.t}</h2>
          <p>{cur.d || `Kami ingatkan ${menit} menit sebelum jam masuk dan saat jam pulang. Waktunya bisa diatur di Profil.`}</p>
          {granted && <p className="ob-ok" role="status"><Icon name="checkCircle" size={18} />Sudah diizinkan</p>}
          {denied && <div className="ob-bad" role="alert"><b>Izin ditolak.</b> {cur.k === 'notif' ? 'Pengingat absen tidak akan muncul.' : 'Kamu belum bisa absen sampai izin ini diberikan.'} {HOW()}</div>}
        </>}
        {i === last && <>
          <span className="ob-art ok"><Icon name="checkCircle" size={44} /></span>
          <h2 id="ob-t">Siap absen!</h2>
          <p>Tekan tombol bulat besar di Beranda untuk absen masuk dan pulang.</p>
          <ul className="ob-pts">
            <li><Icon name="refresh" size={18} /><span>Status kirim absen terlihat di pojok kanan atas.</span></li>
            <li><Icon name="clock" size={18} /><span>Riwayat dan rekap kehadiranmu ada di tab Riwayat.</span></li>
          </ul>
          {steps.some((s) => st[s.k] !== 'granted') && <p className="ob-note">Ada izin yang belum diberikan. Kamu bisa mengaturnya lagi di Profil › Izin aplikasi.</p>}
        </>}
      </div>
      <div className="ob-foot">
        <div className="ob-dots" aria-hidden="true">{Array.from({ length: last + 1 }, (_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        {i === 0 && <button type="button" className="btn btn-primary ob-btn" onClick={() => (n ? next() : setI(last))}>Mulai</button>}
        {cur && !granted && <>
          <button type="button" className="btn btn-primary ob-btn" onClick={ask} disabled={busy}>{busy ? 'Menunggu jawaban…' : denied ? 'Coba lagi' : cur.btn}</button>
          <button type="button" className="ob-later" onClick={next}>{denied ? 'Lanjut' : 'Nanti saja'}</button>
        </>}
        {granted && <button type="button" className="btn btn-primary ob-btn" onClick={next}>Lanjut</button>}
        {i === last && <button type="button" className="btn btn-primary ob-btn" onClick={finish}>Ke Beranda</button>}
      </div>
    </div>
  )
}
