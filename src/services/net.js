// Status sinyal. "Online" = browser/HP online DAN server bisa dihubungi DAN tidak sedang disimulasikan putus.
// Simulasi putus sinyal hanya untuk uji coba prototipe (Akun › Uji coba offline).
import { useSyncExternalStore } from 'react'

let simulated = false
let serverDown = false
const subs = new Set()
const emit = () => subs.forEach((f) => f())
const deviceOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false)

export const net = {
  online: () => deviceOnline() && !simulated && !serverDown,
  simulated: () => simulated,
  setSimulated(v) { simulated = !!v; emit() },
  // dipanggil lapisan sinkron saat server gagal dihubungi / berhasil lagi
  markServer(ok) { const was = serverDown; serverDown = !ok; if (was !== serverDown) emit() },
  subscribe(f) { subs.add(f); return () => subs.delete(f) },
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { serverDown = false; emit() })
  window.addEventListener('offline', emit)
}

const snap = () => (net.online() ? 'on' : 'off') + (simulated ? 's' : '')
export function useNet() {
  const v = useSyncExternalStore(net.subscribe, snap)
  return { online: v.startsWith('on'), simulated: v.endsWith('s') }
}
