// Autentikasi. Prototipe: akun demo per peran (dicek di perangkat). Rilis: ganti isi signIn dengan Firebase Auth
// (signInWithEmailAndPassword) lalu baca peran dari custom claims / dokumen users di Firestore.
export const DEMO_ACCOUNTS = {
  superadmin: { email: 'superadmin@kirana.id', password: 'kirana123', nama: 'Rani Wijaya' },
  admin: { email: 'admin@kirana.id', password: 'kirana123', nama: 'Dewi Lestari' },
  branch: { email: 'jakarta@kirana.id', password: 'kirana123', nama: 'Branch Jakarta Digital' },
  talent: { email: 'putri.amalia@contoh.id', password: 'putri123', nama: 'Putri Amalia' },
  mitra: { email: 'mitra@kirana.id', password: 'kirana123', nama: 'Mitra Karya Talenta' },
}
// Talent punya beberapa akun demo: karyawan aktif, pelamar (belum punya kontrak), dan kandidat yang sedang proses hiring
export const TALENT_ACCOUNTS = [
  { id: 'e5', email: 'putri.amalia@contoh.id', password: 'putri123', nama: 'Putri Amalia', ket: 'Karyawan aktif' },
  { id: 'p2', email: 'salsa.nabila@contoh.id', password: 'salsa123', nama: 'Salsa Nabila', ket: 'Pelamar, belum punya kontrak' },
  { id: 'p5', email: 'rendi.firmansyah@contoh.id', password: 'rendi123', nama: 'Rendi Firmansyah', ket: 'Sedang proses hiring' },
]
export const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())

export async function signIn(role, email, password) {
  await new Promise((r) => setTimeout(r, 350))
  if (role === 'talent') {
    const t = TALENT_ACCOUNTS.find((a) => a.email.toLowerCase() === String(email).trim().toLowerCase() && a.password === password)
    return t ? { ok: true, user: { role, id: t.id, email: t.email, nama: t.nama } } : { ok: false, error: 'E-mail atau password salah untuk peran ini.' }
  }
  const acc = DEMO_ACCOUNTS[role]
  if (!acc) return { ok: false, error: 'Peran tidak dikenal.' }
  if (acc.email.toLowerCase() !== String(email).trim().toLowerCase() || acc.password !== password) return { ok: false, error: 'E-mail atau password salah untuk peran ini.' }
  return { ok: true, user: { role, email: acc.email, nama: acc.nama } }
}
