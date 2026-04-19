# 🛡️ SIGAP - Sistem Gerbang Akses Pintar (Laravel Monolith)

**SIGAP (Lite Edition)** adalah platform manajemen akses dan landing page terpadu yang didesain khusus untuk stabilitas tinggi di lingkungan shared hosting. Platform ini menggabungkan kecepatan **Vue 3 + Vite** dengan ketangguhan backend **Laravel Monolith**.

---

## 📖 DAFTAR ISI
1. [I. Panduan Peran (Role SOP & Manual)](#-i-panduan-peran-role-sop--manual)
2. [II. Panduan CI/CD Deployment (cPanel Focus)](#-ii-panduan-cicd-deployment-cpanel-focus)
3. [III. Manajemen Keamanan & Lisensi](#-iii-manajemen-keamanan--lisensi)
4. [IV. Fitur Unggulan (Backend Laravel)](#-iv-fitur-unggulan-backend-laravel)
5. [V. Panduan Instalasi & Maintenance](#-v-panduan-instalasi--maintenance)

---

## 🔑 I. PANDUAN PERAN (ROLE SOP)

### 1. 👑 Super Admin (Sistem & Monitoring)
Bertanggung jawab atas stabilitas sistem, manajemen kebijakan pengguna, dan branding instansi.
- **Dashboard Utama**: Melihat anomali statistik dan total klik global.
- **Audit & Security**: Memeriksa **Audit Logs** secara berkala untuk memastikan tidak ada aktivitas mencurigakan.
- **Branding Control**: Mengatur logo, favicon, dan teks footer portal melalui menu pengaturan.
- **Role Control**: Super Admin mengelola seluruh struktur sistem, termasuk fitur Reset Database.

### 2. 🎭 Admin Event (Event Landing Creator)
Bertanggung jawab dalam merancang microsite event yang menarik dan fungsional.
- **Pembuatan Event**: Menentukan judul, deskripsi, dan slug unik untuk event.
- **Hybrid Editor SOP**:
    1. Atur tema warna (Background & Button).
    2. Pilih Google Font yang sesuai dengan branding event.
    3. Tambahkan link pendaftaran, brosur, atau media sosial.
    4. Atur urutan dengan drag-and-drop.
    5. Klik **Simpan** untuk menerapkan perubahan.
    6. Klik **Share** untuk menyalin link publik.
    7. Klik **Preview (Mata)** untuk melihat tampilan langsung di browser.

### 3. 💼 Pegawai (Manajemen Tautan Departemen)
Bertanggung jawab atas pembaruan link layanan di bawah departemennya.
- **Pembuatan Tautan**: Menggunakan slug yang deskriptif (Contoh: `sigap.id/s/form-pns`).
- **Analisis Kinerja**: Memantau grafik statistik klik pada tautan yang dikelola untuk evaluasi bulanan.
- **Manajemen Kategori**: Pegawai diizinkan mengelola kategori tautan untuk mengelompokkan layanan departemen mereka secara mandiri.

---

## 🚀 II. PANDUAN CI/CD DEPLOYMENT (CPANEL FOCUS)

### 📖 Prolog: Kenapa Harus Dipisah dan Apa Itu CI/CD?
Bayangkan Anda koki yang punya 2 resep: (1) Resep Rahasia A (Versi Node.js) dan (2) Resep Rahasia B (Versi Laravel). Jika Anda menaruh keduanya di laci (Repository Git) yang sama, asisten dapur pinggiran (cPanel Server) Anda akan bingung mana yang harus dimasak! 

### 🏗️ TAHAP 0: PERSIAPAN LAHAN SERVER (SEBELUM PINDAH RUMAH)

#### 0.1. Syarat Wajib Server (PHP & Ekstensi)
- **PHP Version**: Minimal **8.2**.
- **Ekstensi Aktif**: `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `mbstring`, `pdo_mysql`, `tokenizer`, `xml`, `zip`. 
- > 💡 **TIPS PENTING (Error "pdo_mysql skipped as conflicting")**: Jika cPanel menolak saat Anda mencentang `pdo_mysql`, ini artinya versi barunya yaitu **`nd_pdo_mysql`** sudah aktif. Abaikan saja errornya.

#### 0.2. Membuat Subdomain / Menyiapkan Ruangan
1. Masuk ke cPanel > **Domains**.
2. **Subdomain**: Isi dengan `portal-sigap`.
3. **Document Root**: *Paling penting!* Tunjuk ke folder terisolasi, misalnya: `public_html/sigap_portal`.

#### 0.3. Membangun "Brankas Data" (MySQL Database)
1. Ke menu **MySQL® Databases**.
2. **Create New Database**: Misal `usercpanel_sigapdb`.
3. **Add New User**: Misal `usercpanel_admin_sigap` (Gunakan Password Generator).
4. **Hubungkan (Add User to Database)**: *Paling sering dilupakan anak magang!* Pilih User & Database, klik **Add**, lalu centang **ALL PRIVILEGES**.

#### 0.4. Membuat "Akun Kurir" Khusus Tembusan Github (Akun FTP)
1. Ke menu **FTP Accounts**. 
2. **Log In (Username)**: Misal `robot_sigap`.
3. **Directory**: Hapus isi otomatisnya, ganti **HANYA** lurus menuju folder induk subdomain Anda (misal: `/sigap.uptblkpasuruan.com`).

---

### 🛠️ TAHAP 1: MENGGUDANGKAN KODE KE GITHUB BARU
```bash
git remote remove origin
git remote add origin https://github.com/USERNAME_ANDA/sigap-v2-laravel.git
git add .
git commit -m "Pengiriman Perdana SIGAP Versi Laravel"
git push -u origin master
```

---

### 🤖 TAHAP 2: MEMBUAT ROBOT KURIR (GITHUB ACTIONS)
Di GitHub -> **Settings** -> **Secrets and variables** -> **Actions**, tambahkan:
- `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.
> **PENTING**: Jika Akun FTP cPanel sudah dikunci ke folder tersebut, maka di `deploy.yml` wajib mengisi `server-dir: /`.

---

### 👨‍🍳 TAHAP 3: ALUR BUILD & SYNC
GitHub Actions akan menyewa komputer Ubuntu-Linux, menginstall PHP 8.2 & Node.js 20, memasak aset (`npm run build`), dan mengirimkan kode matang ke hosting Anda secara otomatis (Incremental Sync).

---

### 🌟 TAHAP 4: PERSIAPAN DI cPanel (SEKALI SAJA)
Jalankan di terminal cPanel (Gunakan path absolut PHP 8.2):
```bash
cd /jalur/folder/subdomain
cp .env.example .env
# Edit .env via File Manager (Isi DB_DATABASE, DB_USERNAME, DB_PASSWORD, dll)

# Inisialisasi Database (Peringatan: Menghancurkan data lama!)
/opt/alt/php82/usr/bin/php artisan migrate:fresh --seed

# Membuka jalur gambar (Storage Link)
ln -s $(pwd)/storage/app/public $(pwd)/public/storage

# Optimasi Kecepatan (Cache)
/opt/alt/php82/usr/bin/php artisan optimize
```

---

### 🚨 TAHAP 5: MENGARAHKAN ALAMAT KE FOLDER "PUBLIC"
Gunakan file **`.htaccess`** di folder induk SIGAP Anda:
```apache
<IfModule mime_module>
  # Memaksa Web Server berjalan di PHP 8.2
  AddHandler application/x-httpd-ea-php82 .php .php8 .phtml
</IfModule>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

---

## 📜 III. MANAJEMEN KEAMANAN & LISENSI

Sistem ini memiliki proteksi domain untuk mencegah penggunaan ilegal:

1. **Whitelisting**: Update variabel **`ALLOWED_DOMAINS`** di file `.env`.
   ```dotenv
   ALLOWED_DOMAINS="sigap.uptblkpasuruan.com, api.sigap.com"
   ```
2. **Double Layer Security**: Selain `.env`, domain dapat dikunci permanen di kode.
3. **Poison Pill**: Jika domain tidak dikenal, aplikasi akan otomatis merubah nama menjadi `UNAUTHORIZED` dan lapor otomatis ke Discord pengembang.

---

---

## 💎 IV. FITUR UNGGULAN (BACKEND LARAVEL)

Aplikasi ini menggunakan teknologi **Laravel 11** yang telah dioptimalkan untuk performa maksimal:

1. **High-Fidelity Reporting**: Ekspor log aktivitas dengan detail peran pengguna, ID target, hingga User Agent browser.
2. **Horizontal Scaling Charts**: Visualisasi statistik Top 10 Link bulanan menggunakan grafik horizontal yang animatif.
3. **Advanced Audit Trails**: Setiap aksi sensitif (Create/Update/Delete) dicatat secara otomatis dalam tabel `audit_logs`.
4. **Rescue Protocol**: Sistem pemulihan Super Admin tersembunyi via API Key khusus jika terjadi kendala login utama.
5. **Performance Hardening (Scalability)**:
    - **Database Indexing**: Pengoptimalan query statistik log klik menggunakan indeks pada `clickedAt` dan `linkId`.
    - **Server-Side Pagination**: Seluruh manajemen data (Links, Feedback, Users, Event) menggunakan sistem paginasi di backend untuk menghemat RAM hosting.
    - **Advanced Server Filtering**: Pencarian dan filter kategori diproses langsung oleh database demi kecepatan maksimal.
    - **Resource Throttling**: Sistem deteksi aktivitas yang cerdas untuk meminimalisir beban CPU saat dashboard terbuka.

---

## 🛠️ V. PANDUAN INSTALASI & MAINTENANCE

### 📥 1. Instalasi Awal (Local / Development)
1. **Clone Repository**: `git clone [url_repo]`
2. **Install Composer**: `composer install`
3. **Install Node Packages**: `npm install && npm run build`
4. **Environment Setup**: `cp .env.example .env` lalu isi detail database.
5. **Generate Key**: `php artisan key:generate`
6. **Migrasi & Seed**: `php artisan migrate:fresh --seed`
7. **Jalankan**: `php artisan serve`

### 🏗️ 2. Pemeliharaan Rutin (Maintenance SOP)
- **Ekspor Bulanan**: Admin disarankan mengekspor "Rekap Data" setiap akhir bulan dari Dashboard.
- **Audit Review**: Periksa menu **Pengaturan -> Ekspor Aktivitas** secara berkala (minimal 3 bulan sekali).
- **Update & Migration**: Setiap kali melakukan update kode, wajib menjalankan **`php artisan migrate`** untuk memastikan indeks database terbaru aktif.
- **Update Aset**: Gunakan menu "Visual & Branding" untuk memperbarui identitas instansi tanpa menyentuh kode.
- **System Recovery**: Jika lupa password Super Admin utamanya, gunakan **Rescue Link** yang telah dikonfigurasi di `.env` (`SIGAP_RESCUE_KEY`).

### 🆘 3. Cara Rescue Akun (Darurat)
Jika akses Super Admin hilang, jalankan di terminal server:
```bash
# Ganti dengan username dan password yang diinginkan
php artisan sigap:rescue --user=admin_baru --pass=rahasia2026
```
Atau akses via URL jika `SIGAP_RESCUE_KEY` sudah terpasang:
`domain.com/api/system/rescue?key=KEY_ANDA&user=admin&pass=pass`

---
 
## 🔄 VI. PANDUAN UPDATE (POST-INITIAL)
 
 Setelah Anda melakukan push kode terbaru dan Github Actions selesai melakukan sinkronisasi ke server, jalankan perintah berikut di terminal cPanel Anda (sekali saja setiap ada update):
 
 ```bash
 cd /jalur/folder/subdomain
 
 # 1. Jalankan migrasi untuk mengaktifkan indeks/tabel baru
 /opt/alt/php82/usr/bin/php artisan migrate --force
 
 # 2. Bersihkan & bangun ulang cache sistem
 /opt/alt/php82/usr/bin/php artisan optimize
 ```
 
 > ⚠️ **CATATAN**: Jika Anda melakukan perubahan pada file `.env` di cPanel, pastikan untuk menjalankan kembali perintah `artisan optimize` agar perubahan tersebut terbaca oleh sistem.
 
 ---
 *SIGAP v1.0.1 - Performance Hardened Edition*
 *Copyright © 2026 wiradika.jr.*
