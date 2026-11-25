// Kompres foto (data URL) supaya antrean offline di HP tetap kecil (selfie ±30–60 KB).
export function compressDataUrl(src, maxW = 480, quality = 0.72) {
  return new Promise((ok) => {
    if (!src || typeof document === 'undefined') return ok(src)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, maxW / (img.naturalWidth || maxW)); const c = document.createElement('canvas')
      c.width = Math.round((img.naturalWidth || maxW) * k); c.height = Math.round((img.naturalHeight || maxW) * k)
      try { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', quality)) } catch (e) { ok(src) }
    }
    img.onerror = () => ok(src)
    img.src = src
  })
}
