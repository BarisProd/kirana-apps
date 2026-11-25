// Sesi talent yang sedang login. Prototipe: id talent disimpan di sessionStorage (bukan data penting, hanya penanda sesi tab ini).
// Rilis: diganti uid dari Firebase Auth. ME adalah live binding, jadi semua halaman otomatis membaca akun yang aktif.
const KEY = 'kirana.talent'
// Aplikasi Android: sesi diingat walau aplikasi ditutup (localStorage). Web: per tab (sessionStorage).
const box = () => (typeof window !== 'undefined' && window.KIRANA_APP ? localStorage : sessionStorage)
export let ME = 'e5'
try { const v = box().getItem(KEY); if (v) ME = v } catch (e) { /* storage diblokir: pakai akun bawaan */ }
export function setMe(id) { ME = id || 'e5'; try { if (id) box().setItem(KEY, ME); else { box().removeItem(KEY); box().removeItem('kirana.nama') } } catch (e) { /* abaikan */ } }

export const hasSession = () => { try { return !!box().getItem(KEY) } catch (e) { return false } }

// Nama tampilan akun uji coba (mis. Rizki) yang memakai data karyawan contoh e5
const NAME_KEY = 'kirana.nama'
export function setAlias(nama) { try { if (nama) box().setItem(NAME_KEY, nama); else box().removeItem(NAME_KEY) } catch (e) { /* abaikan */ } }
export function getAlias() { try { return box().getItem(NAME_KEY) || '' } catch (e) { return '' } }
