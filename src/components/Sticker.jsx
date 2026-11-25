// Ilustrasi karakter Kirana (stiker 3D) untuk menghias halaman talent. Dekoratif: alt kosong + aria-hidden.
import React from 'react'
import masuk from '../talent/assets/talent/masuk.webp'
import pulang from '../talent/assets/talent/pulang.webp'
import halo from '../talent/assets/talent/halo.webp'
import resign from '../talent/assets/talent/resign.webp'
import rayakan from '../talent/assets/talent/rayakan.webp'
import kerja from '../talent/assets/talent/kerja.webp'
import gajian from '../talent/assets/talent/gajian.webp'
import hai_l from '../talent/assets/talent/hai_l.webp'
import hai_p from '../talent/assets/talent/hai_p.webp'
import libur from '../talent/assets/talent/libur.webp'
import kalender from '../talent/assets/talent/kalender.webp'
import surat from '../talent/assets/talent/surat.webp'
import megaphone from '../talent/assets/talent/megaphone.webp'
import notes from '../talent/assets/talent/notes.webp'
import tim from '../talent/assets/talent/tim.webp'
import jam from '../talent/assets/talent/jam.webp'
import benefit from '../talent/assets/talent/benefit.webp'
import mikir from '../talent/assets/talent/mikir.webp'
import kalkulator from '../assets/talent/kalkulator.webp'
import kaca from '../talent/assets/talent/kaca.webp'
import kontrak from '../talent/assets/talent/kontrak.webp'
import analisa from '../assets/talent/analisa.webp'
import hibur from '../assets/talent/hibur.webp'
import mohon from '../assets/talent/mohon.webp'
import tolak from '../assets/talent/tolak.webp'
import jempol from '../talent/assets/talent/jempol.webp'
import role_superadmin from '../assets/talent/role_superadmin.webp'
import role_admin from '../assets/talent/role_admin.webp'
import role_branch from '../assets/talent/role_branch.webp'
import role_talent from '../talent/assets/talent/role_talent.webp'
import role_mitra from '../assets/talent/role_mitra.webp'

export const STICKERS = { masuk, pulang, halo, resign, rayakan, kerja, gajian, hai_l, hai_p, libur, kalender, surat, megaphone, notes, tim, jam, benefit, mikir, kalkulator, kaca, kontrak, analisa, hibur, mohon, tolak, jempol, role_superadmin, role_admin, role_branch, role_talent, role_mitra }
const WIDE = { tim: 1.7, hibur: 1.15, benefit: 1.1, role_superadmin: .66, role_admin: .61, role_branch: .59, role_talent: .64, role_mitra: .61 } // stiker melebar (3 orang)
export function Sticker({ name, size = 120, className = '' }) {
  return <img src={STICKERS[name]} alt="" aria-hidden="true" draggable="false" className={`stk ${className}`} style={{ width: size * (WIDE[name] || 1), height: size }} loading="lazy" decoding="async" />
}

// Header halaman berilustrasi: judul & aksi di kiri, karakter di kanan (dipakai di halaman talent)
export function ArtHead({ art, title, sub, children }) {
  return (
    <section className="art-head">
      <div className="art-txt"><h1>{title}</h1>{sub && <p>{sub}</p>}{children && <div className="art-act">{children}</div>}</div>
      <Sticker name={art} size={132} className="art-img" />
    </section>
  )
}
