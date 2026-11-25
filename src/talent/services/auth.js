// Autentikasi Talent. Prototipe: akun demo dicek di perangkat.
// Rilis: ganti isi signIn dengan Firebase Auth (signInWithEmailAndPassword) dan ambil id talent dari dokumen users di Firestore.
// Akun demo: karyawan aktif, pelamar (belum punya kontrak), dan kandidat yang sedang proses hiring.
export const TALENT_ACCOUNTS = [
  { id: 'e5', email: 'putri.amalia@contoh.id', password: 'putri123', nama: 'Putri Amalia', ket: 'Karyawan aktif' },
  { id: 'p2', email: 'salsa.nabila@contoh.id', password: 'salsa123', nama: 'Salsa Nabila', ket: 'Pelamar, belum punya kontrak' },
  { id: 'p5', email: 'rendi.firmansyah@contoh.id', password: 'rendi123', nama: 'Rendi Firmansyah', ket: 'Sedang proses hiring' },
  { id: 'h12', email: 'ani.suryadi@hamparanalam.co.id', password: '123', nama: 'Ani Suryadi', ket: 'Hamparan Alam · Pemanen' },
]
export const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())

export async function signIn(email, password) {
  await new Promise((r) => setTimeout(r, 350))
  const t = TALENT_ACCOUNTS.find((a) => a.email.toLowerCase() === String(email).trim().toLowerCase() && a.password === password)
  return t ? { ok: true, user: { role: 'talent', id: t.id, email: t.email, nama: t.nama } } : { ok: false, error: 'E-mail atau password salah.' }
}

// Akun demo boleh memakai password pendek (mis. '123'); akun lain tetap minimal 6 karakter
export const isDemoEmail = (email) => TALENT_ACCOUNTS.some((a) => a.email.toLowerCase() === String(email).trim().toLowerCase())
