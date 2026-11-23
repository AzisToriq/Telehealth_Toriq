# PulseCare Telehealth — Portal Self-Assessment Pasien

Aplikasi frontend web modern untuk Mata Kuliah **Telehealth** yang terintegrasi penuh dengan **API Self-Assessment Telehealth v2.0** (`https://telehealth.informatikaunimus.site/api`).

Dikembangkan oleh **Azis Toriq Maulana** (`C2C023180` · Kelas `E REGULER`).

---

## Fitur Utama
- **Halaman Selamat Datang Interaktif (`#welcome`)**: Pengenalan aplikasi, pratinjau interaktif 3 modul utama, alur penggunaan 4 langkah, pernyataan klinis (*bukan diagnosis medis*), dan pemisahan jalur masuk **Mode Demo Publik** vs **Akses Pemilik (Live API)**.
- **Mode Demo Pure Sandbox (100% Terisolasi)**: Pengunjung di Vercel dapat mencoba seluruh fitur (formulir bercabang `show_if`, validasi, skor GAD-7, grafik analitik, hingga simulasi klarifikasi & tindak lanjut petugas) **100% secara lokal di browser** tanpa pernah mengirim request ke server API asli.
- **Proteksi Password Akses Pemilik (Live API)**: Koneksi ke akun Live API pemilik dilindungi otorisasi password sesi sehingga data laporan asli di server dosen tetap aman saat aplikasi dipublikasikan.
- **Beranda & Analitik Klinis (`#home`, `#analytics`)**: Sapaan personal, 4 KPI interaktif, grafik tren skor **GAD-7** & distribusi status (Chart.js), serta tabel riwayat pengukuran vital (suhu tubuh & berat badan).
- **Split-Screen Form Wizard (`#fill/{form}/{id}`)**: Render dinamis 7 tipe input API (`text`, `textarea`, `single_choice`, `multi_choice` eksklusif, `scale` numerik, `number` bersatuan, `date`), percabangan `show_if` real-time, panel *Live Clinical Preview*, dan *Auto-Save* draf otomatis.
- **Hasil, Tracking Status, Klarifikasi & Tindak Lanjut (`#result/{id}`, `#status/{id}`)**: Gauge skor & perbandingan perubahan GAD-7, ekspor cetak PDF & JSON, status pengiriman/peninjauan terpisah, *Auto-Sync* 30 detik, balasan klarifikasi petugas, timeline aktivitas, dan unduh jadwal konsultasi (`.ics`).
- **UTS Mission Control (`#uts`)**: Pelacakan 10/10 bukti fitur otomatis (`GET /api/uts/{nim}`) dan *Diagnostic Test Bench* (HTTP `200`, `401`, `403`, `404`).

---

## Menjalankan Secara Lokal
1. Ekstrak `UTS_Telehealth_ToriqGanteng.zip`.
2. Klik dua kali **`START_SERVER.bat`** (Windows), atau jalankan:
   ```bash
   python -m http.server 8000
   ```
   Lalu buka `http://localhost:8000/#welcome` di browser (atau gunakan **Live Server** di VS Code).

> **Keamanan Token:** File `js/secrets.local.js` menyimpan token pasien lokal untuk pengembangan dan **sudah diabaikan oleh `.gitignore`** agar tidak terunggah ke repository publik.

--
