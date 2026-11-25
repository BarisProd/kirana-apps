// State kecil khusus aplikasi karyawan (APK & PWA).
// - judul halaman di top bar (diisi otomatis oleh PageHead/ArtHead dalam mode app)
// - preferensi perangkat (pengingat absen, kunci payslip biometrik, kartu "pasang aplikasi")
import { useSyncExternalStore } from 'react'

export const IS_APP = typeof window !== 'undefined' && !!window.KIRANA_APP
export const isNative = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

const store = (init) => {
  let v = init; const subs = new Set()
  return { get: () => v, set(n) { if (n === v) return; v = n; subs.forEach((f) => f()) }, sub(f) { subs.add(f); return () => subs.delete(f) } }
}

// Judul top bar
const title = store('')
// Judul di bilah atas aplikasi diseragamkan ke Bahasa Indonesia (halaman web tetap apa adanya)
const ID = { 'Contract': 'Kontrak', 'Resign Overview': 'Pengunduran diri', 'Reviews & More': 'Ulasan', 'Feedback': 'Masukan',
  'Rekap Saya': 'Rekap saya', 'Lowongan & Tawaran': 'Lowongan & tawaran', 'Biodata & Berkas': 'Biodata & berkas', 'Karyawan': 'Rekan kerja',
  'Payslip': 'Slip gaji', 'Event': 'Acara' }
export const setAppTitle = (t) => title.set(ID[t] || t || '')
export const useAppTitle = () => useSyncExternalStore(title.sub, title.get)

// Preferensi perangkat (disimpan di HP; bukan data penting, jadi cukup localStorage)
const KEY = 'kirana.prefs'
const DEF = { pengingat: true, menitSebelum: 15, pengingatPulang: true, kunciBio: true, sembunyiInstal: false, onboarded: false }
let initial = DEF
try { initial = { ...DEF, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) } } catch (e) { /* abaikan */ }
const prefs = store(initial)
export const getPrefs = prefs.get
export function setPrefs(p) { const n = { ...prefs.get(), ...p }; prefs.set(n); try { localStorage.setItem(KEY, JSON.stringify(n)) } catch (e) { /* abaikan */ } }
export const usePrefs = () => useSyncExternalStore(prefs.sub, prefs.get)
