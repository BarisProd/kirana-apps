// Akun uji coba: tampilkan nama akun (mis. "Rizki") di data karyawan contoh e5, termasuk sapaan di pesan contoh.
// Hanya mengubah data di memori perangkat (prototipe); data asli tidak tersentuh.
import { update, getState } from '../../services/store.js'
import { getAlias } from './session.js'

export function applyAlias(nama = getAlias()) {
  if (!nama) return
  const e = getState().employees.find((x) => x.id === 'e5')
  if (!e || e.name === nama) return
  update((s) => {
    const emp = s.employees.find((x) => x.id === 'e5'); emp.name = nama; emp.pemegang = nama
    const fix = (t) => typeof t === 'string' ? t.replace(/Putri Amalia/g, nama).replace(/\bPutri\b/g, nama).replace(/\bPut\./g, nama + '.') : t
    ;(s.messages || []).forEach((m) => { m.html = fix(m.html); m.judul = fix(m.judul) })
    ;(s.inbox || []).forEach((n) => { if (!n.emp || n.emp === 'e5') { n.judul = fix(n.judul); n.isi = fix(n.isi) } })
  })
}
