// Salin teks ke clipboard. Kalau browser menolak (mis. di dalam iframe), kembalikan false supaya UI bisa menampilkan tautannya.
export async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true } } catch (e) { /* lanjut ke cara lama */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok
  } catch (e) { return false }
}
