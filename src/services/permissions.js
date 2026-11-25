// Izin perangkat untuk absen: kamera (selfie), lokasi (radius kantor), notifikasi (pengingat, khusus APK).
// Hasil: 'granted' | 'denied' | 'prompt' | 'unsupported'. Dipakai layar pengenalan & Profil › Izin aplikasi.
import { LocalNotifications } from '@capacitor/local-notifications'
import { reminderSupported } from './reminders.js'

async function query(name) {
  try { const r = await navigator.permissions?.query({ name }); return r?.state || 'prompt' } catch (e) { return 'prompt' }
}

export async function checkPerm(kind) {
  if (kind === 'camera') return navigator.mediaDevices?.getUserMedia ? query('camera') : 'unsupported'
  if (kind === 'location') return navigator.geolocation ? query('geolocation') : 'unsupported'
  if (kind === 'notif') {
    if (!reminderSupported()) return 'unsupported'
    try { const p = await LocalNotifications.checkPermissions(); return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt' } catch (e) { return 'prompt' }
  }
  return 'unsupported'
}

export async function requestPerm(kind) {
  if (kind === 'camera') {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
    try { const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }); st.getTracks().forEach((t) => t.stop()); return 'granted' }
    catch (e) { return e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'unsupported' }
  }
  if (kind === 'location') {
    if (!navigator.geolocation) return 'unsupported'
    return new Promise((res) => navigator.geolocation.getCurrentPosition(() => res('granted'),
      // kode 1 = ditolak; 2/3 = izin ada tapi sinyal GPS belum dapat (tetap dianggap diizinkan)
      (e) => res(e?.code === 1 ? 'denied' : 'granted'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }))
  }
  if (kind === 'notif') {
    if (!reminderSupported()) return 'unsupported'
    try { const p = await LocalNotifications.requestPermissions(); return p.display === 'granted' ? 'granted' : 'denied' } catch (e) { return 'denied' }
  }
  return 'unsupported'
}
