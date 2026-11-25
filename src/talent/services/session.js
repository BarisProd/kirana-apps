// Sesi talent yang sedang login. Prototipe: id talent disimpan di sessionStorage (bukan data penting, hanya penanda sesi tab ini).
// Rilis: diganti uid dari Firebase Auth. ME adalah live binding, jadi semua halaman otomatis membaca akun yang aktif.
const KEY = 'kirana.talent'
// Aplikasi Android: sesi diingat walau aplikasi ditutup (localStorage). Web: per tab (sessionStorage).
const box = () => (typeof window !== 'undefined' && window.KIRANA_APP ? localStorage : sessionStorage)
export let ME = 'e5'
try { const v = box().getItem(KEY); if (v) ME = v } catch (e) { /* storage diblokir: pakai akun bawaan */ }
export function setMe(id) { ME = id || 'e5'; try { if (id) box().setItem(KEY, ME); else box().removeItem(KEY) } catch (e) { /* abaikan */ } }

export const hasSession = () => { try { return !!box().getItem(KEY) } catch (e) { return false } }
