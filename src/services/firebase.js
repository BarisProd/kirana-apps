// Titik tunggal inisialisasi Firebase. Prototipe ini berjalan dengan data dummy (VITE_DATA_SOURCE=mock).
// Saat siap produksi: `npm i firebase`, isi .env, set VITE_DATA_SOURCE=firestore, lalu aktifkan blok di bawah.
import { config, isFirebaseConfigured } from './config.js'

let app = null
let db = null

export async function getDb() {
  if (db) return db
  if (config.dataSource !== 'firestore' || !isFirebaseConfigured()) return null
  // const { initializeApp } = await import('firebase/app')
  // const { getFirestore } = await import('firebase/firestore')
  // app = initializeApp(config.firebase)
  // db = getFirestore(app)
  return db
}

export const firebaseApp = () => app
