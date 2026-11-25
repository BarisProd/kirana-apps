// Lapisan data. API-nya meniru Firestore (collection, add, update, subscribe)
// supaya nanti cukup mengganti isi file ini dengan Firebase SDK.
// Mode demo: data contoh disimpan di memori (bukan localStorage), hilang saat halaman dimuat ulang.
import { isDemo } from './config.js'
import { seed } from './seed.js'

const store = JSON.parse(JSON.stringify(seed))
const listeners = new Set()
let counter = 1000

const notify = () => listeners.forEach((fn) => fn())

export const db = {
  mode: isDemo ? 'demo' : 'firestore',
  list(col) { return store[col] || [] },
  get(col, id) { return (store[col] || []).find((d) => d.id === id) },
  add(col, data) {
    const doc = { id: `${col}-${++counter}`, createdAt: new Date().toISOString(), ...data }
    store[col] = [doc, ...(store[col] || [])]
    notify()
    return doc
  },
  update(col, id, patch) {
    store[col] = (store[col] || []).map((d) => (d.id === id ? { ...d, ...patch } : d))
    notify()
  },
  remove(col, id) {
    store[col] = (store[col] || []).filter((d) => d.id !== id)
    notify()
  },
  setDoc(col, data) { store[col] = data; notify() },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
}
