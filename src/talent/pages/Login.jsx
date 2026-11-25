import React, { useState } from 'react'
import { useNavigate } from '../lib/router.jsx'
import { Icon, Btn } from '../components/ui.jsx'
import { Sticker } from '../components/Sticker.jsx'
import { TALENT_ACCOUNTS, signIn, validEmail, isDemoEmail } from '../services/auth.js'
import { setMe, setAlias } from '../services/session.js'
import { applyAlias } from '../services/alias.js'
import { getState } from '../../services/store.js'
import { Logo } from '../components/Logo.jsx'

// Halaman Masuk khusus Talent: e-mail + password wajib, 3 akun demo bisa diisi otomatis.
// Di aplikasi Android (window.KIRANA_APP) hanya karyawan yang bisa masuk; pelamar diarahkan ke web.
const APP = typeof window !== 'undefined' && !!window.KIRANA_APP
export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [show, setShow] = useState(false)
  const [tried, setTried] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [forgot, setForgot] = useState(false)
  const eErr = !email.trim() ? 'E-mail wajib diisi' : !validEmail(email) ? 'Format e-mail belum benar' : ''
  const pErr = !pw ? 'Password wajib diisi' : pw.length < 6 && !isDemoEmail(email) ? 'Password minimal 6 karakter' : ''
  const submit = async (e) => {
    e.preventDefault(); setTried(true); setErr('')
    if (eErr || pErr) return
    setBusy(true); const r = await signIn(email, pw); setBusy(false)
    if (!r.ok) return setErr(r.error)
    // Aplikasi hanya untuk karyawan: cek ke daftar karyawan (bukan dari awalan ID), mis. karyawan Hamparan Alam ber-ID h12
    if (APP && !getState().employees.some((x) => x.id === r.user.id && x.status !== 'Resign')) return setErr('Aplikasi ini khusus karyawan untuk absensi & aktivitas kerja. Pelamar silakan memakai web Kirana.')
    setMe(r.user.id); setAlias(r.user.pilot ? r.user.nama : ''); if (r.user.pilot) applyAlias(r.user.nama)
    nav('/app/talent/beranda')
  }
  return (
    <div className="login">
      <div className="login-wrap">
        <aside className="login-art" aria-hidden="true">
          <span className="brand"><Logo /></span>
          <div className="login-art-c"><Sticker name="role_talent" size={280} className="login-stk" />
            <h2>{APP ? 'Halo, Karyawan!' : 'Halo, Talent!'}</h2>
            <p>Absen, cuti, lembur, kontrak, payslip, sampai lamar kerja berikutnya, semuanya di sini.</p></div>
        </aside>
        <form className="login-card" onSubmit={submit} noValidate>
          <span className="brand dark login-logo-m"><Logo /></span>
          <div><h1>Masuk</h1><p className="muted">Masuk dengan e-mail dan password akun {APP ? 'karyawan' : 'Talent'}-mu.</p></div>
          <div className="login-fields">
            <label className="field"><span className="field-l">E-mail</span><input type="email" autoComplete="username" inputMode="email" value={email} aria-invalid={tried && !!eErr} placeholder="nama@email.com" onChange={(e) => { setEmail(e.target.value); setErr('') }} />{tried && eErr && <span className="err-t">{eErr}</span>}</label>
            <label className="field"><span className="field-l">Password</span><span className="pw"><input type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} aria-invalid={tried && !!pErr} onChange={(e) => { setPw(e.target.value); setErr('') }} /><button type="button" className="icon-btn" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button></span>{tried && pErr && <span className="err-t">{pErr}</span>}</label>
            <div className="login-row"><button type="button" className="lnk" onClick={() => { setForgot(!forgot); setErr('') }}>Lupa password?</button>
              {!APP && <a className="lnk" href="#/lowongan">Lihat lowongan tanpa login</a>}</div>
          </div>
          {/* Satu slot info bertinggi tetap: error > lupa password > akun demo */}
          <div className="login-slot" aria-live="polite">
            {err ? <div className="err" role="alert"><Icon name="x" size={16} /><div><b>Belum bisa masuk</b><p>{err}</p></div></div>
              : forgot ? <p className="note-s">Hubungi admin/HR perusahaanmu untuk mengatur ulang password. Tautan reset dikirim ke e-mail terdaftar.</p>
              : <div className="demo-hint demo-pick"><span>Akun demo (klik untuk mengisi otomatis):</span><div className="demo-chips">{TALENT_ACCOUNTS.filter((a) => !a.pilot && (!APP || getState().employees.some((x) => x.id === a.id))).map((a) => <button key={a.id} type="button" className={email === a.email ? 'on' : ''} onClick={() => { setEmail(a.email); setPw(a.password); setErr('') }} title={a.email}><b>{a.nama.split(' ')[0]}</b><small>{a.ket}</small><small>{a.password}</small></button>)}</div></div>}
          </div>
          <Btn className="full" type="submit" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</Btn>
          <p className="muted sm" style={{ textAlign: 'center' }}>{APP ? 'Prototipe: data contoh kembali ke awal saat aplikasi dibuka ulang, kecuali antrean absen di HP.' : <>Data di demo ini fiktif dan kembali ke awal saat halaman dimuat ulang. <a className="lnk" href="#/login">Ganti peran</a></>}</p>
        </form>
      </div>
    </div>
  )
}
