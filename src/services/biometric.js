// Buka payslip dengan sidik jari / wajah / PIN HP (APK). Web/PWA: tidak tersedia → pakai password.
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'

export const bioSupported = () => !!window.Capacitor?.isNativePlatform?.() && !!BiometricAuth

export async function bioAvailable() {
  if (!bioSupported()) return { ok: false }
  try { const r = await BiometricAuth.checkBiometry(); return { ok: !!(r.isAvailable || r.deviceIsSecure), type: r.biometryType } } catch (e) { return { ok: false } }
}

export async function bioUnlock(reason = 'Buka payslip') {
  try {
    await BiometricAuth.authenticate({ reason, cancelTitle: 'Pakai password', allowDeviceCredential: true, androidTitle: 'Buka payslip', androidSubtitle: 'Pakai sidik jari, wajah, atau PIN HP', androidConfirmationRequired: false })
    return { ok: true }
  } catch (e) { return { ok: false, cancel: /cancel/i.test(e?.code || e?.message || '') } }
}
