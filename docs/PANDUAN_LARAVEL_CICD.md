# 🚀 PANDUAN PENGIRIMAN OTOMATIS (CI/CD) SIGAP VERSI LARAVEL

## 📖 Prolog: Kenapa Harus Dipisah dan Apa Itu CI/CD?
Bayangkan Anda koki yang punya 2 resep:
1. Resep Rahasia A (Versi Node.js)
2. Resep Rahasia B (Versi Laravel yang kita kerjakan sekarang)

Jika Anda menaruh keduanya di laci (Repository Git) yang sama, asisten dapur pinggiran (cPanel Server) Anda akan bingung mana yang harus dimasak! Oleh karena itu, kita **WAJIB membuat gudang penyimpanan online (Repository) yang 100% baru di GitHub** khusus untuk versi Laravel ini dan memutus rantai dari gudang Node.js.

CI/CD adalah "Kurir Cerdas". Misal Anda sedang memodifikasi warna/logo aplikasi di komputer rumah. Daripada Anda harus repot membuka File Manager di cPanel, melakukan *Zip*, mengunggah, lalu *Extract* manual setiap mau *update*, kita akan menyuruh GitHub: 
> *"Hei GitHub, tiap kali saya klik kirim dari Komputer, tolong kompilasi & bungkus aplikasi saya sampai matang di server awanmu, lalu kamu sendirian yang masukin lewat lewat 'pintu belakang' FTP ke hosting cPanel Jagoan Hosting saya secara rahasia ya!"*

---

## 🏗️ TAHAP 0: PERSIAPAN LAHAN SERVER (SEBELUM PINDAH RUMAH)
Sebelum menyuruh Robot Kurir Github memindahkan barang, Anda harus menyiapkan "Rumah Baru" (cPanel Server) terlebih dahulu!

### 0.1. Syarat Wajib Server (PHP & Ekstensi)
Karena menggunakan Laravel modern, server Anda **WAJIB** memenuhi syarat berikut. (Cek di menu `Select PHP Version` pada cPanel):
- **PHP Version**: Minimal **8.2** (Sangat disarankan memakai versi 8.2 atau 8.3).
- **Ekstensi Aktif (Tercentang)**: `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `mbstring`, `pdo_mysql`, `tokenizer`, `xml`, `zip`. 
> 💡 **TIPS PENTING (Error "pdo_mysql skipped as conflicting")**: 
> Jika cPanel menolak saat Anda mencentang `pdo_mysql` lalu muncul tulisan *"skipped as conflicting"*, ini artinya fitur versi barunya yaitu **`nd_pdo_mysql`** (bersama `nd_mysqli`) sudah tertancap dan aktif! Abaikan saja errornya, Anda cukup menggunakan `nd_pdo_mysql` dan Laravel akan berjalan dengan sangat sempurna.

### 0.2. Membuat Subdomain / Menyiapkan Ruangan (Contoh Kasus)
Katakanlah kampus Anda memiliki domain `kampusku.ac.id`, dan Anda ingin aplikasi ini diakses di `portal-sigap.kampusku.ac.id`.
1. Masuk ke cPanel > Cari menu **Subdomains** (Atau **Domains** di cPanel versi baru).
2. Klik **Create a New Subdomain**.
3. **Subdomain**: Isi dengan `portal-sigap`.
4. **Document Root**: *Ini yang paling penting!* Jangan biarkan letaknya menumpuk di tempat umum. Ketik jalurnya menunjuk dalam satu folder yang terisolasi, misalnya: `public_html/sigap_portal`. *(Nanti di Tahap 5, folder ini wajib kita ubah jalurnya jadi ada `/public` di belakangnya)*.
5. Klik **Create**.

### 0.3. Membangun "Brankas Data" (MySQL Database)
Data aplikasi Anda (Login User, Link, Acara) disimpan di brankas MySQL. Kita harus membuatnya dari nol.
1. Di cPanel, cari menu **MySQL® Databases** (Jangan yang phpMyAdmin!).
2. **Create New Database**:
   - Ketik nama, misal `sigapdb`. 
   - *(Note: cPanel otomatis menambahkan awalan akun Anda, sehingga nama asli databasenya mungkin menjadi `usercpanel_sigapdb`). Jangan lupa catat ini di Notepad!*
3. **Add New User** (Membuat tukang kunci khusus agar Laravel bisa masuk):
   - **Username**: Ketik misalnya `admin_sigap` *(Lagi-lagi akan menjadi `usercpanel_admin_sigap`)*.
   - **Password**: Gunakan Password Generator bawaan cPanel (Kopi dan simpan baik-baik di Notepad!). Klik **Create User**.
4. **Menghubungkan Brankas dan Tukang Kunci (Add User to Database)**:
   - *Paling sering dilupakan anak magang!* Geser ke bagian bawah halaman ("Add User To Database").
   - Pilih `User`: `usercpanel_admin_sigap`
   - Pilih `Database`: `usercpanel_sigapdb`
   - Klik **Add**.
   - Muncul halaman hak akses, sentuh tombol atas sendiri **ALL PRIVILEGES** (Beri Semua Akses ke tukang kunci tersebut). Klik **Make Changes**.

### 0.4. Membuat "Akun Kurir" Khusus Tembusan Github (Akun FTP)
Jangan gegabah menyerahkan *Username Login* cPanel utama Anda ke orang lain/Github! Buatlah Akun FTP bawahan yang tugasnya cuma mengantar barang ke folder subdomain saja:
1. Di cPanel, masuk ke menu **FTP Accounts**.
2. **Log In (Username)**: Ketik misal `robot_sigap` *(Nanti bentuk akhirnya otomatis bergandeng jadi `robot_sigap@kampusku.ac.id`)*. Catat nama utuh ini di Notepad!
3. **Password**: Ketik sandi yang super kuat. *(Catat lagi sandi ini di Notepad! Ini adalah `FTP_PASSWORD`)*.
4. **Directory**: Ini letak kekuatannya! Hapus isi otomatisnya, dan ganti HANYA dengan letak folder subdomain di Tahap 0.2 tadi (misal: `/public_html/sigap_portal`).
5. **Quota**: Unlimited. Klik **Create FTP Account**.

Selesai di Tahap 0! Lanjut menyiapkan pengirimannya.

---

## 🛠️ TAHAP 1: MENGGUDANGKAN KODE KE GITHUB BARU
### Langkah 1.1: Buat Gudang Super Kosong di GitHub
1. Buka [Github.com](https://github.com/), pastikan Anda sudah *login*.
2. Klik tombol **New Repository**.
3. **Repository Name**: ketikkan misalnya `sigap-v2-laravel`
4. **Privacy**: Pastikan Pilih **Private** 🔒 (Rahasia! Jangan Public karena di dalam project ini ada *credential* berharga).
5. Jangan centang apa pun di bagian kotak centang opsi. Biarkan bersih total. Lalu klik **Create Repository**.

### Langkah 1.2: Memutuskan Rantai dengan Git Node.js (Di Komputer Anda)
Buka aplikasi **Terminal / Command Prompt** (bisa dibuka langsung dari VSCode/Cursor di tab *Terminal*), pastikan letak posisinya ada di dalam folder SIGAP.
Jalankan perintah ajaib ini secara berurutan:

```bash
# 1. Copot dan hapus link alamat Github NodeJS Anda yang lama supaya tidak nyasar
git remote remove origin

# 2. Pasang jembatan ke alamat Gudang Github BARU (ganti URL di bawah sesuai yang barusan Anda dapat dari Github)
git remote add origin https://github.com/USERNAME_ANDA/sigap-v2-laravel.git
```

### Langkah 1.3: Masukkan ke Kardus dan Kirimkan! (Push)
Jalankan perintah wajib 3 serangkai ini jika ingin mengirim apapun ke internet:
```bash
# Tandai semua file untuk siap dikemas kardus
git add .

# Beri label resi pada kardusnya
git commit -m "Pengiriman Perdana SIGAP Versi Laravel"

# Mulai paksa angkut dan kirim ke Gudang Utama (Dinamakan Master branch)
git push -u origin master
```

---

## 🤖 TAHAP 2: MEMBUAT ROBOT KURIR (CI/CD GITHUB ACTIONS)
Kita akan menghidupkan robot gaib bernama *GitHub Actions*. Saya (**Antigravity**) sebelumnya sudah diam-diam menaruh naskah otak robotnya di dalam komputer Anda pada file `.github/workflows/deploy.yml`!

### Langkah 2.1: Beri Robot Kunci Akses (FTP cPanel JagoanHosting Anda)
Robot GitHub butuh kunci FTP agar bisa menyelinap masuk ke hosting Anda dan menaruh file. Kunci ini kita simpan sangat aman di dalam brankas GitHub agar tidak bocor ke *hacker*.
1. Di halaman Github Repository `sigap-v2-laravel` Anda yang baru, klik tab **Settings**.
2. Lihat ke menu kiri, geser ke bawah cari menu **Secrets and variables** > klik **Actions**.
3. Klik tombol warna hijau **New repository secret**.
4. Buatlah 3 Kunci Kredensial Rahasia satu-per-satu secara konsisten:

🔑 **Rahasia 1:**
- Name: `FTP_SERVER`
- Secret: *Isikan host FTP Anda (Biasanya cukup alamat domain utama, contoh:* `ftp.domain-kampus.ac.id`*)*

🔑 **Rahasia 2:**
- Name: `FTP_USERNAME`
- Secret: *Isikan user FTP khusus untuk ditaruh di folder utama/subdomain Anda (Contoh:* `sigapku@domain-kampus.ac.id`*)*

🔑 **Rahasia 3:**
- Name: `FTP_PASSWORD`
- Secret: *Isikan kata sandi dari Akun FTP di atas*

> 💡 **PERTANYAAN UMUM: "Kenapa kuncinya pakai domain utama padahal disasarkan ke subdomain?"**
> Komputer cPanel (*Jagoan Hosting*) menyatukan gerbang masuk FTP melalui 1 IP Server/Domain utama saja (`ftp.domain-kampus.ac.id`). 
> Lalu darimana Robot tahu dia harus naruh kode ke Subdomain?
> **Jawabannya:** Hal tersebut dikendalikan dari dua cara, yaitu **(A)** *Username FTP* yang Anda buat di cPanel bisa dikunci agar *hanya* menyeleksi folder subdomain, ATAU **(B)** Melalui pengaturan `server-dir` di Langkah 2.2 di bawah ini!

### Langkah 2.2: Cabut Gembok Otak Robot
Buka file `.github/workflows/deploy.yml` melalui **Code Editor lokal di komputer Anda** (tempat Anda membuka *project* ini sekarang). 
Geser ke baris ke-40 hingga ke paling bawah. Awalnya Anda akan melihat banyak tanda pagar (`#`) di depannya. Tanda pagar itu artinya "Robot Sedang Tidur".
**Hapus tanda pagar** di setiap awal katanya agar "bangun", sehingga wujud akhirnya seperti ini:

```yaml
    # --- 🚀 DEPLOYMENT TEMPLATE ---
    - name: Deploy to Shared Hosting via FTP
      uses: SamKirkland/FTP-Deploy-Action@v4.3.5
      with:
        server: ${{ secrets.FTP_SERVER }}
        username: ${{ secrets.FTP_USERNAME }}
        password: ${{ secrets.FTP_PASSWORD }}
        local-dir: ./
        server-dir: /nama_folder_subdomain/
        exclude: |
          **/.git*
          **/node_modules/**
          **/.env
          **/sigap_backup_full_node/**
```
> **INFORMASI PENTING TENTANG "SERVER-DIR":** 
> * Ini adalah kunci keakuratan penembakan FTP! Jika saat Anda membuat Subdomain di Tahap 0 cPanel menaruh foldernya di luar `public_html` (misal namanya `/subdomain_sigap/`), maka Anda cukup mengisi `server-dir: /subdomain_sigap/`. 
> * Jika Anda meletakkannya di dalam `public_html`, isilah `/public_html/nama_foldernya/`.
> * *TIPS PRO:* Jika Akun FTP (*Username*) yang Anda gunakan di *Secrets* sudah dikunci oleh cPanel mentok spesifik hanya bisa akses masuk ke folder subdomain itu saja, maka cukup isi `server-dir: /` (garis miring satu).

Setelah menghapus pagarnya, kirim *Update* ini lagi ke Github:
```bash
git add .
git commit -m "Mengaktifkan Robot FTP CI/CD"
git push
```

---

## 💡 TAHAP 3: APA TRANSAKSI SPIRITUAL DI BALIK LAYAR? (CONTOH KASUS)
**Skenario Kehidupan Nyata**: Tiba-tiba hari Senin Anda sadar Anda ingin mengganti tulisan/logo navbar secara mendadak.
1. Anda langsung buka laptop, dan mengubah tulisannya di dalam kode HTML.
2. Anda menyimpan dan mengetik `git add .`, `git commit -m "revisi warna navbar"`, dan `git push`.
3. 🎉 **SELESAI! Anda bisa langsung matikan laptop, bikin kopi, atau rebahan.** Website cPanel Anda akan berubah ajaib 2 menit kemudian!

**Bagaimana itu bisa terjadi tanpa Anda?**
1. ☁️ Saat Anda rebahan, Robot Github menyewa sebuah komputer berkecepatan tinggi gratis (`Ubuntu-Linux`) dari pusat data rahasia Github Server.
2. 👨‍🍳 Robot menaruh seisi kode SIGAP Anda, dan memerintahkan komputer bayangan itu meng-*install* "PHP 8.2" dan "NPM NodeJS 20" secara instan.
3. 📦 Dia memasang seluruh peralatan pendukung web (`npm install`) lalu **memasak (compile)** logika Vue.JS/Tailwind Anda menjadi murni CSS dan JavaScript (`npm run build`).
4. 🚀 Dia mencoret direktori rongsokan, lalu **membawa kode yang sudah matang sempurna 100% tanpa sampah instalasi**, dan mengirimnya secara diam-diam menuju cPanel JagoanHosting Anda langsung menggunakan kunci **`FTP_USERNAME`**.
5. Situs Publik Anda berubah!

---

## 🌟 TAHAP 4: PERSIAPAN DI cPanel HOSTINGNYA (Dilakukan Hanya Sekali Seumur Hidup)
Walaupun kode sudah tersiram rapi oleh sang Robot Kurir secara berkelanjutan, server rumah baru cPanel Jagoan Hosting milik Anda tetap harus *"di-*setting* suhu ruangannya"*.

**Langkah Terakhir Anda di cPanel:**
1. Masuk cPanel Anda, buka menu fitur **Terminal**.
2. Masuk ke ruang folder baru tempat Robot baru mentransfer datanya. (Ganti `nama_folder_subdomain` dengan jalur Anda):
```bash
cd /home/usercpanel/nama_folder_subdomain
```
3. Lipat Gandakan File Konfigurasi Rahasia:
```bash
cp .env.example .env
```

4. Edit file `.env` di File Manager Anda dan sambungkan isi baris koneksinya agar selaras dengan **Database cPanel**.
> **PENTING: JANGAN LUPAKAN BARIS INI DI DALAM .env cPanel!**
> Tambahkan Kunci Google dan API AI persis seperti di laptop Anda agar fitur cerdas Sigap berfungsi:
> ```env
> VITE_GOOGLE_CLIENT_ID="KUNCI_CLIENT_GOOGLE_ANDA"
> GEMINI_API_KEY="KUNCI_GEMINI_ANDA"
> GROQ_API_KEY="KUNCI_GROQ_ANDA"
> ```

5. Inisialisasi Database dan Sistem Keamanan (Jalankan di Terminal dan selesaikan urusannya!):
```bash
# Pastikan cPanel Anda menunjuk PHP/PHP-CLI 8.2 minimal!
php artisan key:generate

# Peringatan! Perintah ini akan menghancurkan data lama dan menggantikannya dengan seeder Super Admin yang segar:
php artisan migrate:fresh --seed

# Membuka jalur gambar dari Storage ke Public:
# (Jika ini gagal di cPanel, hapus folder public/storage lalu jalankan kembali)
php artisan storage:link

# Bekukan konfigurasi Laravel biar tidak lelet (Cache)
php artisan config:cache
php artisan route:cache
```

## 🚨 TAHAP 5 (SANGAT KRUSIAL!): MENGARAHKAN ALAMAT KE FOLDER "PUBLIC"
Tidak seperti aplikasi web biasa atau NodeJS, **Laravel menyembunyikan semua mesin utamanya dari peretas** dan hanya membuka 1 pintu masuk, yaitu folder `public/`. Jika Anda tidak menyetelnya, saat Anda membuka domain, yang terlihat adalah daftar folder (Directory Listing) atau Error!

Ada 2 cara paling standar di cPanel untuk membereskan ini:
**Cara A (Ubah Document Root di cPanel):**
Jika aplikasi Anda diinstal di domain utama (atau Subdomain khusus):
1. Ke menu cPanel > **Domains** (atau Subdomains).
2. Temukan list nama situs Anda, klik tombol **Manage** atau edit.
3. Ubah kolom jalurnya (Document Root) menjadi menunjuk langsung ke foldernya, dan tambahkan `/public` di akhirnya. (Contoh: `public_html/sigap/public` atau `sigap.domain.com/public`)
4. Simpan.

**Cara B (Trik Menggunakan file `.htaccess` rahasia):**
Jika Cara A diblokir oleh kampus/hostingan Anda, Anda CUKUP membuat 1 file baru bernama `.htaccess` persis di dalam folder induk SIGAP Anda (sejajar dengan `.env`), berisikan kode ini:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```
Lalu simpan! Website SIGAP Anda akan langsung otomatis mengarah ke pintu gerbang yang benar dan menampilkan form Login Sleek Anda!

🚀 Selesai dan Aman! Selamat menikmati SIGAP Versi Laravel dengan infrastruktur Deployment *Continuous Delivery*! Kapanpun Anda ingin mengubah sebuah koma pada *code editor*, perubahan akan mendistribusi sempurna ke pengguna ujung (End-User)!.

---

## 🕵️‍♂️ TAHAP 6: PENGECEKAN MANUAL SETELAH DEPLOY (Post-Deployment Audit)
Ibarat Anda pindahan rumah, Anda wajib cek apakah air keran nyala dan kunci jendela mengunci rapat. 
Silakan buka URL aplikasi/subdomain Anda (`https://portal-sigap.kampusku.ac.id`) di browser pribadi Anda. Jalankan poin-poin cek manual ini:

### 1. Pengecekan Login & Celah Terkunci (Authentication Check)
- Coba login menggunakan akun `admin` (kata sandinya bawaan `admin123`). 
- **Verifikasi**: Jika halaman tidak nge-*blank* dan berhasil masuk ke *Dashboard*, maka koneksi Database MySQL (Tahap 0.3) berarti **BERHASIL**.

### 2. Uji Coba Kinerja Upload / Penyimpanan Berkas (*Storage Link*)
- Masuk ke menu **Pengaturan Sistem** -> Coba **Ganti Logo Instansi** atau masuk ke menu ubah Gambar Profil.
- *Upload* sebuah gambar.
- **Verifikasi**: Jika logo instansi berhasil diperbarui dan gambarnya **TAMPIL/MUNCUL**, berarti jalur pipanisasi perintah `php artisan storage:link` (Tahap 4) **SUKSES**. Jika muncul ikon rusak (`Broken Image`), segera eksekusi ulang perintah *storage:link* di terminal cPanel!

### 3. Pemeriksaan Nyawa Artificial Intelligence (AI)
- Coba modifikasi salah satu tombol/link secara asal, dan pancing tombol generator kata ajaib/Tagline. Atau coba fitur *Smart Insights* di *Dashboard*.
- **Verifikasi**: Jika pesannya terbalas dengan bahasa robot super natural, maka injeksi variabel `GEMINI_API_KEY` (dan Groq) di file `.env` **BERHASIL** dibaca server.

### 4. Pengecekan SSL / Keamanan Koneksi
1. Pastikan logo gembok SSL Anda berwarna abu-abu normal di pojok kiri browser.
2. Jika ada coretan "*Not Secure*", Anda cukup ke menu cPanel Anda > Cari fitur **SSL/TLS Status** > Klik **Run AutoSSL**. CPanel akan mengurus persuratan gembok sertifikat ini secara otomatis (Dalam hitungan jam).

---
🎉 **Selamat!! Keseluruhan infrastruktur platform Anda siap dioperasikan tanpa cacat!**
