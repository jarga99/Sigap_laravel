# Panduan Fitur SIGAP - UPT BLK Pasuruan (Bahan Presentasi)

Dokumen ini disusun sebagai panduan langkah-demi-langkah penggunaan seluruh fitur pada platform SIGAP untuk keperluan presentasi dan pelatihan.

---

## 🔑 I. Akses & Autentikasi
1. **Halaman Login**: Akses melalui `/login`.
2. **Multi-Role Access**: Sistem mendukung 3 level akses:
   - **Super Admin**: `sigap_admin`
   - **Admin Event**: `admin_event1`
   - **Pegawai**: `pegawai1`
3. **Session Security**: Dilengkapi pelindung *concurrent login* (satu akun satu sesi aktif).

---

## 🛡️ II. Modul Super Admin (Manajemen Kontrol)
Pusat kendali untuk visibilitas dan tata kelola instansi.

![Dashboard Admin](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/admin_dashboard.png)

### 1. Manajemen User & Role
- **Cara**: Masuk ke menu `Users`.
- **Fitur**: Tambah, Edit, atau Hapus personil. Tentukan role (Admin/Pegawai) dan hubungkan dengan Kejuruan (Department).

### 2. Pengaturan Instansi (Branding)
- **Cara**: Masuk ke menu `Pengaturan`.
- **Fitur**: Ubah nama aplikasi, deskripsi instansi (UPT BLK Pasuruan), logo, dan teks footer. Identitas ini akan tercermin secara real-time di seluruh portal.

### 3. Log Aktivitas (Audit Trail)
- **Cara**: Masuk ke menu `Audit Logs`.
- **Fitur**: Melacak setiap aksi penting yang dilakukan user (kapan, siapa, melakukan apa, dan dari IP mana).

---

## 🎨 III. Modul Admin Event (Hybrid Editor v2)
Memungkinkan pembuatan landing page dinamis untuk pendaftaran pelatihan atau acara khusus.

![Hybrid Editor](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/hybrid_editor.png)

### 1. Hybrid Layout Editor
- **Dynamic Styling**: Mengubah background (warna/gambar), font, dan bentuk tombol secara langsung (Real-time Preview).
- **Event Items**: Menambah link tombol, link sosial media, atau pembatas (divider) dengan ikon yang menarik.

### 2. Visibilitas Event
- Mengatur status event (Aktif/Arsip). Event yang aktif akan memiliki URL slug yang unik (contoh: `/e/pbk-blk-1`).

---

## 🔗 IV. Modul Pegawai (Link & Analytics)
Membantu personil blk mengelola link layanan agar mudah diakses publik.

### 1. Manajemen Tautan (Shortlink)
- **Kategorisasi Otomatis**: Menghubungkan link dengan 14 kejuruan yang tersedia.
- **Visibility Tier**: Mengatur apakah link hanya untuk internal blk atau untuk tamu publik.

### 2. Statistik Klik
- Memantau performa link (jumlah klik) melalui grafik di Dashboard Pegawai.

---

## 💬 V. Sistem Feedback & Laporan
Portal pengaduan atau saran dari masyarakat.

![Portal Publik](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/guest_portal_home.png)

- **Guest Side**: Tamu dapat mengirim pesan anonim atau dengan identitas, dilengkapi lampiran foto bukti.
- **Admin Side**: Admin menerima notifikasi real-time di dashboard dan dapat membalas feedback secara langsung.

---

## 🤖 VI. Fitur Unggulan (AI & Backend)
1. **Multi-Provider AI Fallback**: Sistem AI cerdas yang otomatis berpindah provider (Gemini -> Groq -> OpenRouter) demi menjaga ketersediaan layanan 24/7.
2. **Smart File Storage**: Semua upload foto kini dikategorikan secara otomatis ke folder spesifik untuk kemudahan manajemen file.
3. **System Reset & Backup**: Fitur audit-ready yang memungkinkan pembersihan data total dengan perlindungan backup database otomatis.

---

## 📅 VII. Tips Presentasi
- Tunjukkan kemudahan mengubah identitas instansi di menu Pengaturan.
- Demonstrasikan responsivitas dashboard pada perangkat tablet atau smartphone.
- Perlihatkan bagaimana Grafik Link Terpopuler membantu pengambilan keputusan manajemen.
