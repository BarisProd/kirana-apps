// Payslip di aplikasi: bila tersedia, buka dengan sidik jari/wajah/PIN HP (tanpa mengetik password).
// Terkunci lagi otomatis bila aplikasi ditinggal > 5 menit (lihat AppShell). Web/PWA: password seperti biasa.
import React, { useEffect, useState } from 'react'
import { PAGES } from '../../talent/pages/Shell.jsx'
import { Icon, Btn } from '../../talent/components/ui.jsx'
import { Sticker } from '../../talent/components/Sticker.jsx'
import { bioSupported, bioAvailable, bioUnlock } from '../../services/biometric.js'
import { haptic } from '../../services/haptics.js'
import { usePrefs } from '../appState.js'

export function AppPayslip({ sub, go }) {
  const prefs = usePrefs(); const [open, setOpen] = useState(!!window.__kiranaSlip); const [mode, setMode] = useState('cek'); const [msg, setMsg] = useState('')
  const Payslip = PAGES.payslip
  useEffect(() => {
    if (open) return
    if (!prefs.kunciBio || !bioSupported()) return setMode('password')
    bioAvailable().then((r) => { if (!r.ok) return setMode('password'); setMode('bio'); unlock() })
  }, [])
  const unlock = async () => {
    setMsg('')
    const r = await bioUnlock('Buka payslip')
    if (r.ok) { haptic.success(); window.__kiranaSlip = true; setOpen(true) } else setMsg(r.cancel ? '' : 'Belum berhasil. Coba lagi atau pakai password.')
  }
  if (open || mode === 'password') return <Payslip sub={sub} go={go} />
  if (mode === 'cek') return null
  return (
    <div className="slip-lock">
      <span className="lock-art"><Sticker name="gajian" size={150} /><span className="lock-ic"><Icon name="lock" size={22} /></span></span>
      <h2>Payslip terkunci</h2>
      <p className="muted">Supaya tetap privat walau HP dipinjam orang lain.</p>
      <Btn icon="fingerprint" className="full" onClick={unlock}>Buka dengan sidik jari</Btn>
      {msg && <p className="err-t" role="alert" style={{ margin: 0 }}>{msg}</p>}
      <button type="button" className="lnk" onClick={() => setMode('password')}>Pakai password</button>
    </div>
  )
}
