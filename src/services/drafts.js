// Draft form (mis. New Admin, Create New Branch): supaya isian tidak hilang kalau halaman tertutup tidak sengaja.
// Draft = kenyamanan per perangkat, BUKAN data penting, jadi disimpan lokal di perangkat.
// Data final tetap lewat store/Firestore. Kalau draft perlu ikut pindah perangkat, ganti adapter ini ke koleksi Firestore `drafts/{uid}`.
const mem = {}
const KEY = 'kirana:draft:'
const ls = () => { try { return window.localStorage } catch (e) { return null } }

export const drafts = {
  get(key) {
    if (mem[key]) return mem[key]
    try { const raw = ls()?.getItem(KEY + key); if (raw) { mem[key] = JSON.parse(raw); return mem[key] } } catch (e) { /* penyimpanan tidak tersedia */ }
    return null
  },
  set(key, value) {
    mem[key] = { value, at: Date.now() }
    try { ls()?.setItem(KEY + key, JSON.stringify(mem[key])) } catch (e) { /* tetap tersimpan di memori */ }
  },
  clear(key) {
    delete mem[key]
    try { ls()?.removeItem(KEY + key) } catch (e) { /* abaikan */ }
  },
}
