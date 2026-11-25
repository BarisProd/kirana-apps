// Menyiapkan proyek Android setelah `npx cap add android` (dipakai GitHub Actions & laptop).
// - izin: kamera (selfie), lokasi (GPS absen), status jaringan (deteksi offline)
// - kamera/GPS tidak wajib ada di perangkat (supaya bisa dipasang di HP apa pun)
// - nomor versi dari env: APP_VERSION_NAME (mis. 1.0.3) & APP_VERSION_CODE (angka naik, mis. nomor build)
// - tanda tangan rilis bila env KIRANA_KEYSTORE_PATH tersedia (lihat docs/ANDROID.md)
import fs from 'fs'

const MANIFEST = 'android/app/src/main/AndroidManifest.xml'
const GRADLE = 'android/app/build.gradle'
if (!fs.existsSync(MANIFEST)) { console.error('Folder android/ belum ada. Jalankan dulu: npx cap add android'); process.exit(1) }

// 1) Izin & fitur
let m = fs.readFileSync(MANIFEST, 'utf8')
const perms = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.CAMERA',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
]
const feats = ['android.hardware.camera', 'android.hardware.camera.front', 'android.hardware.location.gps']
const add = []
for (const p of perms) if (!m.includes(`"${p}"`)) add.push(`    <uses-permission android:name="${p}" />`)
for (const f of feats) if (!m.includes(`"${f}"`)) add.push(`    <uses-feature android:name="${f}" android:required="false" />`)
if (add.length) m = m.replace(/<\/manifest>\s*$/, add.join('\n') + '\n</manifest>\n')
// Hanya potret (layar absen dirancang untuk HP tegak)
m = m.replace(/<activity([^>]*?)android:name="\.MainActivity"/, (all, pre) => all.includes('screenOrientation') ? all : `<activity${pre}android:screenOrientation="portrait" android:name=".MainActivity"`)
fs.writeFileSync(MANIFEST, m)
console.log('✓ AndroidManifest: izin kamera, lokasi, jaringan')

// 2) Versi
let g = fs.readFileSync(GRADLE, 'utf8')
const vName = process.env.APP_VERSION_NAME || '1.0.0'
const vCode = parseInt(process.env.APP_VERSION_CODE || '1', 10)
g = g.replace(/versionCode\s+\d+/, `versionCode ${vCode}`).replace(/versionName\s+"[^"]*"/, `versionName "${vName}"`)
console.log(`✓ Versi ${vName} (${vCode})`)

// 3) Tanda tangan rilis (opsional)
if (process.env.KIRANA_KEYSTORE_PATH && !g.includes('signingConfigs {')) {
  g = g.replace(/android\s*\{/, `android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KIRANA_KEYSTORE_PATH"))
            storePassword System.getenv("KIRANA_KEYSTORE_PASSWORD")
            keyAlias System.getenv("KIRANA_KEY_ALIAS")
            keyPassword System.getenv("KIRANA_KEY_PASSWORD")
        }
    }`)
  g = g.replace(/buildTypes\s*\{\s*release\s*\{/, 'buildTypes {\n        release {\n            signingConfig signingConfigs.release')
  console.log('✓ Tanda tangan rilis aktif')
}
fs.writeFileSync(GRADLE, g)
