// Ilustrasi karakter Kirana (stiker 3D) untuk menghias halaman talent. Dekoratif: alt kosong + aria-hidden.
import React from 'react'
import { AppHead } from './ui.jsx'
import masuk from '../assets/talent/masuk.webp'
import pulang from '../assets/talent/pulang.webp'
import halo from '../assets/talent/halo.webp'
import resign from '../assets/talent/resign.webp'
import rayakan from '../assets/talent/rayakan.webp'
import kerja from '../assets/talent/kerja.webp'
import gajian from '../assets/talent/gajian.webp'
import hai_l from '../assets/talent/hai_l.webp'
import hai_p from '../assets/talent/hai_p.webp'
import libur from '../assets/talent/libur.webp'
import kalender from '../assets/talent/kalender.webp'
import surat from '../assets/talent/surat.webp'
import megaphone from '../assets/talent/megaphone.webp'
import notes from '../assets/talent/notes.webp'
import tim from '../assets/talent/tim.webp'
import jam from '../assets/talent/jam.webp'
import benefit from '../assets/talent/benefit.webp'
import mikir from '../assets/talent/mikir.webp'
import kaca from '../assets/talent/kaca.webp'
import kontrak from '../assets/talent/kontrak.webp'
import jempol from '../assets/talent/jempol.webp'
import role_talent from '../assets/talent/role_talent.webp'

export const STICKERS = { masuk, pulang, halo, resign, rayakan, kerja, gajian, hai_l, hai_p, libur, kalender, surat, megaphone, notes, tim, jam, benefit, mikir, kaca, kontrak, jempol, role_talent }
const WIDE = { tim: 1.7, benefit: 1.1, role_talent: .64 } // stiker melebar (3 orang)
export function Sticker({ name, size = 120, className = '' }) {
  return <img src={STICKERS[name]} alt="" aria-hidden="true" draggable="false" className={`stk ${className}`} style={{ width: size * (WIDE[name] || 1), height: size }} loading="lazy" decoding="async" />
}

// Header halaman berilustrasi: judul & aksi di kiri, karakter di kanan (dipakai di halaman talent)
export function ArtHead({ art, title, sub, children }) {
  if (typeof window !== 'undefined' && window.KIRANA_APP) return <AppHead title={title} sub={sub}>{children}</AppHead>
  return (
    <section className="art-head">
      <div className="art-txt"><h1>{title}</h1>{sub && <p>{sub}</p>}{children && <div className="art-act">{children}</div>}</div>
      <Sticker name={art} size={132} className="art-img" />
    </section>
  )
}
