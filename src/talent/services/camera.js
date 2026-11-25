// Akses kamera & mikrofon perangkat (web, dan nanti WebView Android/iOS). Semua kode perangkat dipusatkan di sini.
// Catatan rilis: di aplikasi Android/iOS, izin kamera/mikrofon wajib dideklarasikan (AndroidManifest / Info.plist),
// dan halaman harus dibuka lewat HTTPS atau file lokal app agar getUserMedia tersedia.

export const cameraSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
export const recorderSupported = () => typeof window.MediaRecorder !== 'undefined'

export async function openCamera({ audio = false } = {}) {
  if (!cameraSupported()) throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' })
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio })
}

export const stopStream = (stream) => { if (stream) stream.getTracks().forEach((t) => t.stop()) }

// Ambil satu bingkai dari <video> menjadi JPEG (dicerminkan seperti yang dilihat pengguna).
// aspect (lebar/tinggi) opsional: potong tengah agar hasil sama dengan yang terlihat di layar (mis. bingkai tegak 3:4)
export function captureFrame(video, { mirror = true, quality = 0.85, maxW = 960, aspect = 0 } = {}) {
  const vw = video.videoWidth || 640; const vh = video.videoHeight || 480
  let sx = 0, sy = 0, sw = vw, sh = vh
  if (aspect) { if (vw / vh > aspect) { sw = Math.round(vh * aspect); sx = Math.round((vw - sw) / 2) } else { sh = Math.round(vw / aspect); sy = Math.round((vh - sh) / 2) } }
  const k = Math.min(1, maxW / Math.max(sw, sh))
  const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k)
  const ctx = c.getContext('2d'); if (mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1) }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', quality)
}

export function cameraError(e) {
  const n = e && e.name
  if (n === 'NotAllowedError' || n === 'SecurityError') return { title: 'Izin kamera ditolak', text: 'Klik ikon kamera/gembok di bilah alamat browser, pilih Izinkan, lalu coba lagi.' }
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return { title: 'Kamera tidak ditemukan', text: 'Pastikan laptop punya kamera atau webcam sudah terpasang, lalu coba lagi.' }
  if (n === 'NotReadableError') return { title: 'Kamera sedang dipakai', text: 'Tutup aplikasi lain yang memakai kamera (Zoom, Meet, dsb.), lalu coba lagi.' }
  if (n === 'NotSupportedError') return { title: 'Browser belum mendukung kamera', text: 'Gunakan Chrome, Edge, Firefox, atau Safari versi terbaru.' }
  return { title: 'Kamera belum bisa dibuka', text: 'Coba muat ulang halaman, lalu izinkan akses kamera.' }
}

// Perekam video (self interview). Mengembalikan objek kontrol; hasil berupa Blob.
export function startRecording(stream, onStop) {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  const mimeType = types.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || ''
  const rec = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined); const parts = []
  rec.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data) }
  rec.onstop = () => onStop(new Blob(parts, { type: rec.mimeType || 'video/webm' }))
  rec.start(1000)
  return rec
}
