import React, { useState } from 'react'
import { useNavigate } from '../lib/router.jsx'
import { Icon, Btn } from '../components/ui.jsx'
import { Sticker } from '../components/Sticker.jsx'
import { Logo } from './Landing.jsx'
import { DEMO_ACCOUNTS, TALENT_ACCOUNTS, signIn, validEmail } from '../services/auth.js'
import { setMe } from '../talent/services/session.js'
import { ROLES } from './menus.js'

// Halaman Masuk (desain revisi 16 Nov): ilustrasi kiri, pilih peran (avatar) + e-mail & password kanan.
// [key, label, sapaan di ilustrasi, stiker]
const OPTIONS = [
  ['root', 'Root', 'Daftarkan & kelola customer, data turunan, log, dan reset password.', 'kerja'],
  ['superadmin', 'Superadmin', 'Grup customer: menaungi Branch, admin, dan karyawannya.', 'role_superadmin'],
  ['admin', 'Admin Operasional', 'Kelola menu & Branch yang diizinkan superadmin.', 'role_admin'],
  ['branch', 'Branch', 'Lowongan, seleksi, remunerasi, dan data karyawan.', 'role_branch'],
  ['talent', 'Talent', 'Absen, cuti, lembur, kontrak, payslip, sampai lowongan.', 'role_talent'],
  ['mitra', 'Mitra Talent Pool', 'Daftarkan & pantau kandidat yang kamu salurkan.', 'role_mitra'],
]
// Akun demo Root (prototipe saja)
const ROOT_DEMO = { email: 'root@kirana.id', password: 'kirana123' }
const demoOf = (r) => (r === 'root' ? ROOT_DEMO : DEMO_ACCOUNTS[r])

export default function Login() {
  const nav = useNavigate()
  const [role, setRole] = useState('')
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [show, setShow] = useState(false)
  const [tried, setTried] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [forgot, setForgot] = useState(false)
  const opt = OPTIONS.find((o) => o[0] === role)
  const eErr = !email.trim() ? 'E-mail wajib diisi' : !validEmail(email) ? 'Format e-mail belum benar' : ''
  const pErr = !pw ? 'Password wajib diisi' : pw.length < 6 ? 'Password minimal 6 karakter' : ''
  const pick = (k) => { setRole(k); setErr(''); setTried(false); setEmail(''); setPw(''); setShow(false); setForgot(false) }
  const fill = (a) => { setEmail(a.email); setPw(a.password); setErr('') }
  const submit = async (e) => {
    e.preventDefault(); setTried(true); setErr('')
    if (!role) return setErr('Pilih peran dulu.')
    if (eErr || pErr) return
    setBusy(true)
    let r
    if (role === 'root') { await new Promise((ok) => setTimeout(ok, 350)); r = email.trim().toLowerCase() === ROOT_DEMO.email && pw === ROOT_DEMO.password ? { ok: true, user: {} } : { ok: false, error: 'E-mail atau password salah untuk peran ini.' } }
    else r = await signIn(role, email, pw)
    setBusy(false)
    if (!r.ok) return setErr(r.error)
    if (role === 'talent') { setMe(r.user.id); return nav('/app/talent/beranda') }
    nav(`/app/${role}/dashboard`)
  }
  const demos = role === 'talent' ? TALENT_ACCOUNTS.map((a) => ({ ...a, label: a.nama.split(' ')[0], ket: a.ket })) : role ? [{ ...demoOf(role), label: ROLES[role]?.who || opt[1], ket: opt[1] }] : []
  return (
    <div className="login">
      <div className="login-wrap">
        <aside className="login-art" aria-hidden="true">
          <a href="#/" className="brand"><Logo /></a>
          <div className="login-art-c">
            <Sticker name={opt ? opt[3] : 'tim'} size={opt ? 280 : 200} className="login-stk" />
            <h2>{opt ? `Halo, ${opt[1]}!` : 'Selamat datang di Kirana'}</h2>
            <p>{opt ? opt[2] : 'Satu tempat untuk rekrutmen, kontrak, absensi, sampai gaji. Pilih peranmu untuk mulai.'}</p>
          </div>
        </aside>
        <form className="login-card" onSubmit={submit} noValidate>
          <a href="#/" className="brand dark login-logo-m"><Logo /></a>
          <div><h1>Masuk</h1><p className="muted">Pilih peran, lalu masuk dengan e-mail dan password akunmu.</p></div>
          <fieldset className="role-pick">
            <legend className="field-l">Masuk sebagai</legend>
            <div className="role-grid six" role="radiogroup" aria-label="Pilih peran">
              {OPTIONS.map(([k, l, , st]) => (
                <button key={k} type="button" role="radio" aria-checked={role === k} className={`role-opt ${role === k ? 'on' : ''}`} onClick={() => pick(k)}>
                  <span className="role-av"><Sticker name={st} size={40} /></span><strong>{l}</strong>
                </button>
              ))}
            </div>
          </fieldset>
          <div className={`login-fields ${role ? '' : 'off'}`}>
            <label className="field"><span className="field-l">E-mail</span><input type="email" autoComplete="username" inputMode="email" disabled={!role} value={email} aria-invalid={tried && !!eErr} placeholder={role === 'talent' ? 'nama@email.com' : 'nama@perusahaan.id'} onChange={(e) => { setEmail(e.target.value); setErr('') }} />{tried && role && eErr && <span className="err-t">{eErr}</span>}</label>
            <label className="field"><span className="field-l">Password</span><span className="pw"><input type={show ? 'text' : 'password'} autoComplete="current-password" disabled={!role} value={pw} aria-invalid={tried && !!pErr} onChange={(e) => { setPw(e.target.value); setErr('') }} /><button type="button" className="icon-btn" disabled={!role} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button></span>{tried && role && pErr && <span className="err-t">{pErr}</span>}</label>
            <div className="login-row">
              <button type="button" className="lnk" disabled={!role} onClick={() => { setForgot(!forgot); setErr('') }}>Lupa password?</button>
              {role === 'talent' ? <a className="lnk" href="#/lowongan">Lihat lowongan tanpa login</a> : <button type="button" className="lnk" disabled={!role} onClick={() => demos[0] && fill(demos[0])}>Isi akun demo</button>}
            </div>
          </div>
          {/* Satu slot info bertinggi tetap: error > lupa password > akun demo */}
          <div className="login-slot" aria-live="polite">
            {err ? <div className="err" role="alert"><Icon name="x" size={16} /><div><b>Belum bisa masuk</b><p>{err}</p></div></div>
              : !role ? <p className="demo-hint off">Pilih peran dulu, nanti akun demonya muncul di sini.</p>
              : forgot ? <p className="note-s">{role === 'talent' ? 'Hubungi admin/HR perusahaanmu untuk mengatur ulang password.' : 'Hubungi Superadmin perusahaanmu untuk mengatur ulang password.'} Tautan reset dikirim ke e-mail terdaftar.</p>
              : <div className="demo-hint demo-pick"><span>Akun demo (klik untuk mengisi otomatis):</span><div className="demo-chips">{demos.map((a) => <button key={a.email} type="button" className={email === a.email ? 'on' : ''} onClick={() => fill(a)} title={a.email}><b>{a.label}</b><small>{a.ket}</small><small>{a.email}</small><small>{a.password}</small></button>)}</div></div>}
          </div>
          <Btn className="full" type="submit" disabled={busy}>{busy ? 'Memeriksa…' : role ? `Masuk sebagai ${opt[1]}` : 'Pilih peran dulu'}</Btn>
          <p className="muted sm" style={{ textAlign: 'center' }}>Data di demo ini fiktif dan kembali ke awal saat halaman dimuat ulang.</p>
        </form>
      </div>
    </div>
  )
}
