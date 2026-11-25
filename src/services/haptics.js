// Getar halus sebagai umpan balik (APK: plugin Haptics; PWA/web: navigator.vibrate bila didukung).
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

const native = () => !!window.Capacitor?.isNativePlatform?.() && Haptics
const buzz = (p) => { try { navigator.vibrate?.(p) } catch (e) { /* abaikan */ } }

export const haptic = {
  tap() { if (native()) Haptics.impact({ style: ImpactStyle?.Light || 'LIGHT' }).catch(() => {}); else buzz(10) },
  success() { if (native()) Haptics.notification({ type: NotificationType?.Success || 'SUCCESS' }).catch(() => {}); else buzz([18, 60, 28]) },
  warn() { if (native()) Haptics.notification({ type: NotificationType?.Warning || 'WARNING' }).catch(() => {}); else buzz([30, 80, 30]) },
}
