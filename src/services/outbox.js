// Antrean kirim (outbox) di HP. Absen disimpan di sini dulu, lalu dikirim ke server saat sinyal ada.
// Disimpan di IndexedDB supaya tetap ada walau aplikasi ditutup / HP dimatikan.
// Bila IndexedDB tidak tersedia (mis. pratinjau tertentu), jatuh ke memori + diberi tanda `persistent: false`.
import { useSyncExternalStore } from 'react'

const DB = 'kirana-app'; const STORE = 'outbox'; const VER = 1
let list = []; let ready = false; let persistent = false; let dbp = null
const subs = new Set()
const emit = () => { list = [...list]; subs.forEach((f) => f()) }

function open() {
  if (dbp) return dbp
  dbp = new Promise((ok, fail) => {
    try {
      if (typeof indexedDB === 'undefined') return fail(new Error('no-idb'))
      const r = indexedDB.open(DB, VER)
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' }) }
      r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); r.onblocked = () => fail(new Error('blocked'))
    } catch (e) { fail(e) }
  })
  return dbp
}
const tx = async (mode, fn) => { const d = await open(); return new Promise((ok, fail) => { const t = d.transaction(STORE, mode); const st = t.objectStore(STORE); const res = fn(st); t.oncomplete = () => ok(res?.result); t.onerror = () => fail(t.error) }) }

export const outbox = {
  async load() {
    try { const d = await open(); list = await new Promise((ok, fail) => { const r = d.transaction(STORE).objectStore(STORE).getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => fail(r.error) }); persistent = true }
    catch (e) { persistent = false }
    // yang tertinggal "sending" saat aplikasi ditutup dianggap belum terkirim
    list.forEach((r) => { if (r.status === 'sending') r.status = 'pending' })
    // riwayat terkirim disimpan 7 hari saja
    const cut = Date.now() - 7 * 864e5; list = list.filter((r) => r.status !== 'sent' || (r.sentAt || 0) > cut)
    ready = true; emit(); return list
  },
  ready: () => ready, persistent: () => persistent,
  all: () => list,
  async add(rec) { list = [...list, rec]; emit(); if (persistent) await tx('readwrite', (st) => st.put(rec)).catch(() => {}); return rec },
  async patch(id, p) { list = list.map((r) => (r.id === id ? { ...r, ...p } : r)); emit(); const rec = list.find((r) => r.id === id); if (persistent && rec) await tx('readwrite', (st) => st.put(rec)).catch(() => {}) },
  async remove(id) { list = list.filter((r) => r.id !== id); emit(); if (persistent) await tx('readwrite', (st) => st.delete(id)).catch(() => {}) },
  async clearSent() { const ids = list.filter((r) => r.status === 'sent').map((r) => r.id); for (const id of ids) await outbox.remove(id) },
  subscribe(f) { subs.add(f); return () => subs.delete(f) },
}

export const useOutbox = () => useSyncExternalStore(outbox.subscribe, () => list)
export const pendingOf = (l, emp) => l.filter((r) => (!emp || r.emp === emp) && r.status !== 'sent')
