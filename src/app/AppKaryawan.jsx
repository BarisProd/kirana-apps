// Aplikasi Android Kirana — khusus karyawan (absensi & aktivitas kerja).
// Memakai halaman Talent yang sama dengan web, tanpa landing page, pilihan peran, maupun menu admin/Branch/Mitra.
import React, { useEffect } from 'react'
import { HashRouter, useLocation, useNavigate } from '../lib/router.jsx'
import { TalentLogin } from '../talent/TalentApp.jsx'
import AppShell from './AppShell.jsx'
import { hasSession } from '../talent/services/session.js'
import { applyAlias } from '../talent/services/alias.js'

applyAlias() // akun uji coba yang masih login: pasang lagi namanya setelah aplikasi dibuka ulang

function Routes() {
  const { pathname } = useLocation(); const nav = useNavigate()
  const parts = pathname.split('/').filter(Boolean)
  const inApp = parts[0] === 'app' && parts[1] === 'talent'
  // Sudah login → langsung Beranda; belum → halaman Masuk. Rute selain aplikasi karyawan diarahkan ulang.
  useEffect(() => {
    if (inApp && !hasSession()) nav('/')
    else if (!inApp && parts[0] !== 'masuk' && hasSession()) nav('/app/talent/beranda')
  }, [pathname])
  if (inApp && hasSession()) return <div className="ta"><AppShell page={parts[2]} sub={parts[3]} /></div>
  return <div className="ta"><TalentLogin /></div>
}

export default function AppKaryawan() {
  // Tombol kembali Android: kembali ke halaman sebelumnya (WebView), bukan menutup aplikasi
  useEffect(() => {
    const cap = window.Capacitor
    const App = cap?.Plugins?.App
    if (!App?.addListener) return
    const h = App.addListener('backButton', ({ canGoBack }) => { if (canGoBack && location.hash.split('/').length > 4) history.back(); else App.minimizeApp?.() })
    return () => { h?.remove?.() }
  }, [])
  return <HashRouter><Routes /></HashRouter>
}
