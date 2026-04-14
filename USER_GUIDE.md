# 📘 Panduan Pengguna SIGAP (SOP & Manual)

Selamat datang di Panduan Pengguna resmi **SIGAP (Sistem Gerbang Akses Pintar)**. Dokumen ini merincikan Standard Operating Procedure (SOP) untuk setiap peran dalam ekosistem SIGAP.

---

## 🔑 I. Panduan Peran (Role SOP)

### 1. 👑 Super Admin (Sistem & Monitoring)
Bertanggung jawab atas stabilitas sistem, manajemen kebijakan pengguna, dan branding instansi.

- **Dashboard Utama**: Melihat anomali statistik dan total klik global.
- **Audit & Security**: Memeriksa **Audit Logs** secara berkala untuk memastikan tidak ada aktivitas mencurigakan.
- **Branding Control**: Mengatur logo, favicon, dan teks footer portal melalui menu pengaturan.

![Super Admin Dashboard](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/admin_dashboard.png)

### 2. 🎭 Admin Event (Event Landing Creator)
Bertanggung jawab dalam merancang microsite event yang menarik dan fungsional.

- **Pembuatan Event**: Menentukan judul, deskripsi, dan slug unik untuk event.
- **Hybrid Editor SOP**:
    1. Atur tema warna (Background & Button).
    2. Pilih Google Font yang sesuai dengan branding event.
    3. Tambahkan link pendaftaran, brosur, atau media sosial.
    4. Atur urutan dengan drag-and-drop.
    5. Terbitkan (Publish).

![Hybrid Editor SOP](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/hybrid_editor.png)

### 3. 💼 Pegawai (Manajemen Tautan Departemen)
Bertanggung jawab atas pembaruan link layanan di bawah departemennya.

- **Pembuatan Tautan**: Menggunakan slug yang deskriptif (Contoh: `sigap.id/s/form-pns`).
- **Analisis Kinerja**: Memantau grafik statistik klik pada tautan yang dikelola untuk evaluasi bulanan.

![Pegawai Links](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/pegawai_link_list.png)

---

## 🚀 II. Mekanisme Feedback & Pengaduan (SOP Guest)
Setiap pengunjung dapat memberikan feedback melalui portal utama:
1. Klik tombol melayang (Feedback) atau melalui menu hamburger.
2. Masukkan pesan/laporan kendala.
3. Lampirkan foto bukti (jika ada).
4. Status pengiriman dapat dicek di tab riwayat (jika menggunakan ID yang sama).

![Feedback Success](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/guest_feedback_success.png)

---

## 🛠️ III. Pemeliharaan Database (SOP Admin)
Untuk menjaga performa sistem, Super Admin disarankan melakukan reset data operasional secara berkala (Setiap awal tahun anggaran).
- **Prosedur**: Masuk ke Pengaturan Sistem -> Tab Database -> Klik **Reset All Data**.
- **Hasil**: Sistem akan otomatis mengunduh file backup `.tar.gz` sebelum menghapus data.

---
> SIGAP User Manual v1.0.0
