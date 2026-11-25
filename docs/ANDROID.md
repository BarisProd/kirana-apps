# Aplikasi Android Kirana (khusus karyawan)

Aplikasi ini dibangun dari kode web yang sama (React + Vite), dibungkus **Capacitor 8**.
Isinya hanya peran karyawan: Beranda, Absensi (selfie + GPS, **bisa offline**), Rekap, Cuti, Lembur,
Reimbursement, Payslip, Kontrak, Biodata, Inventaris, Resign, Inbox, Event, Karyawan, Feedback, Review, Akun.
Menu karier (Lowongan, Jadwal, Pre-test) mengikuti aturan Akses Talent seperti di web.

## Cara dapat APK (otomatis lewat GitHub)
1. Push kode ke branch `main` → GitHub Actions menjalankan workflow **Android APK** (±8–12 menit).
2. Buka tab **Actions** › run terbaru › bagian **Artifacts** › unduh `Kirana-Karyawan-APK` (zip berisi .apk).
3. Untuk dibagikan ke karyawan: buat tag, mis. `git tag v1.0.0 && git push origin v1.0.0`
   → APK otomatis dilampirkan di halaman **Releases**.
4. Pasang di HP Android: buka file .apk → izinkan "Instal dari sumber tidak dikenal" bila diminta.

Tanpa keystore, hasilnya **APK debug** (cukup untuk uji coba internal). Untuk rilis/Play Store, tambahkan
Secrets di GitHub (Settings › Secrets and variables › Actions):
`KIRANA_KEYSTORE_BASE64` (isi file .jks di-base64), `KIRANA_KEYSTORE_PASSWORD`, `KIRANA_KEY_ALIAS`, `KIRANA_KEY_PASSWORD`.
Simpan keystore baik-baik: kalau hilang, update aplikasi tidak bisa dipasang di atas versi lama.

## Build di laptop (opsional)
Butuh Node 22+, Android Studio (Ladybug atau lebih baru, JDK 21 sudah termasuk).
```
npm install
npm run build:app
npx cap add android          # sekali saja
npx @capacitor/assets generate --android --assetPath assets
npx cap sync android
npm run android:prepare
npx cap open android         # lalu Build › Build APK(s)
```

## Absensi offline — cara kerja
- Semua absen (online maupun offline) disimpan dulu di HP (IndexedDB), lalu dikirim ke server.
- Dikirim otomatis saat: sinyal kembali, aplikasi dibuka/kembali ke depan, tiap 20 detik, dan tepat setelah absen.
- Setiap absen punya ID unik → tidak tercatat dobel walau terkirim ulang.
- Server menghitung **jam sebenarnya** (bukan jam HP) dari jangkar waktu yang dicocokkan saat terakhir online,
  mengecek ulang radius & akurasi GPS, dan menandai **Perlu persetujuan HR** bila: jam HP tidak sesuai,
  di luar radius, atau terkirim lewat batas (default 72 jam, diatur per Branch di Setup Aktivitas › Absensi).
- Font dibundel di APK (tidak memuat Google Fonts) supaya tampilan tetap rapi tanpa sinyal.

## Batasan versi prototipe (perlu dikerjakan saat backend siap)
- Server masih **tiruan** (`src/services/mockServer.js`): data contoh kembali ke awal saat aplikasi dibuka ulang;
  hanya antrean absen di HP yang benar-benar tersimpan. Ganti isi file itu dengan Firestore/Cloud Function.
- Pengiriman otomatis berjalan saat aplikasi terbuka/di latar depan. Kirim saat aplikasi ditutup penuh
  butuh plugin latar belakang (mis. `@capacitor/background-runner`) — tahap berikutnya.
- Deteksi jam HP diubah memakai jam monoton browser; rilis sebaiknya memakai `SystemClock.elapsedRealtime()`
  lewat plugin native agar tetap valid setelah HP restart. Deteksi GPS palsu (mock location) juga butuh plugin native.

---

## PWA (versi web yang bisa di-install)

Kode yang sama dengan APK. Dibangun dengan `npm run build:app` → folder `dist-app/` (index.html, manifest, ikon, `sw.js`).

**Aktifkan di GitHub Pages**
1. Push repo ke GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Workflow `.github/workflows/pwa-pages.yml` jalan otomatis setiap push ke `main` (atau manual lewat tab Actions).
4. Alamatnya: `https://<akun>.github.io/<repo>/`. Buka di HP → "Tambahkan ke layar utama" (Android muncul tombol Pasang; iPhone lewat Share → Add to Home Screen).

Catatan:
- Pages untuk **repo private** butuh paket GitHub berbayar (Pro/Team). Repo public gratis.
- Service worker hanya aktif di HTTPS/localhost. Di APK (Capacitor) service worker sengaja dimatikan; offline di APK ditangani outbox IndexedDB.
- Versi baru: SW mendeteksi update → muncul banner "Versi baru tersedia · Muat ulang".
- Yang **tidak** ada di PWA: kunci biometrik slip gaji (pakai password), pengingat absen terjadwal saat app tertutup, getar penuh di iPhone. Absen offline tetap jalan (antrean dikirim saat online & app dibuka).
