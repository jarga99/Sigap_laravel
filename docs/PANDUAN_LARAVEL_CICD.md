# 🚀 PANDUAN PENGIRIMAN OTOMATIS (CI/CD) SIGAP VERSI LARAVEL

## 📖 Prolog: Kenapa Harus Dipisah dan Apa Itu CI/CD?
Bayangkan Anda koki yang punya 2 resep:
1. Resep Rahasia A (Versi Node.js)
2. Resep Rahasia B (Versi Laravel yang kita kerjakan sekarang)

Jika Anda menaruh keduanya di laci (Repository Git) yang sama, asisten dapur pinggiran (cPanel Server) Anda akan bingung mana yang harus dimasak! Oleh karena itu, kita **WAJIB membuat gudang penyimpanan online (Repository) yang 100% baru di GitHub** khusus untuk versi Laravel ini dan memutus rantai dari gudang Node.js.

CI/CD adalah "Kurir Cerdas". Misal Anda sedang memodifikasi warna/logo aplikasi di komputer rumah. Daripada Anda harus repot membuka File Manager di cPanel, melakukan *Zip*, mengunggah, lalu *Extract* manual setiap mau *update*, kita akan menyuruh GitHub: 
> *"Hei GitHub, tiap kali saya klik kirim dari Komputer, tolong kompilasi & bungkus aplikasi saya sampai matang di server awanmu, lalu kamu sendirian yang masukin lewat lewat 'pintu belakang' FTP ke hosting cPanel Jagoan Hosting saya secara rahasia ya!"*

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
- Secret: *Isikan host FTP Anda (Contoh:* `ftp.domain-kampus.ac.id`*)*

🔑 **Rahasia 2:**
- Name: `FTP_USERNAME`
- Secret: *Isikan user FTP khusus untuk ditaruh di folder utama/subdomain Anda (Contoh:* `sigapku@domain-kampus.ac.id`*)*

🔑 **Rahasia 3:**
- Name: `FTP_PASSWORD`
- Secret: *Isikan kata sandi dari Akun FTP di atas*

### Langkah 2.2: Cabut Gembok Otak Robot
Buka file `.github/workflows/deploy.yml` melalui *Code Editor* Anda. 
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
        server-dir: /public_html/sigap/
        exclude: |
          **/.git*
          **/node_modules/**
          **/.env
          **/sigap_backup_full_node/**
```
> **INFORMASI PENTING UTAMA:** 
> Pastikan variabel `server-dir:` di atas Anda ubah nilainya supaya tidak menyasar. Jika file diletakkan di dalam folder `public_html/sigap-app`, maka isilah dengan `/public_html/sigap-app/`. Jika diletakkan di root, ganti jadi `/`.

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
2. Masuk ke ruang folder baru tempat Robot baru mentransfer datanya.
```bash
cd /home/usercpanel/public_html/nama_folder_domain_anda
```
3. Lipat Gandakan File Konfigurasi Rahasia:
```bash
cp .env.example .env
```
4. Edit file `.env` di File Manager Anda dan sambungkan isi baris koneksinya agar selaras dengan **Database cPanel**.
5. Inisialisasi Database dan Sistem Keamanan (Jalankan di Terminal dan selesaikan urusannya!):
```bash
# Pastikan cPanel Anda menunjuk PHP/PHP-CLI 8.2 minimal!
php artisan key:generate
php artisan storage:link

# Peringatan! Perintah ini akan menghancurkan data lama dan menggantikannya dengan seeder Super Admin yang segar:
php artisan migrate:fresh --seed

# Bekukan konfigurasi Laravel biar tidak lelet (Cache)
php artisan config:cache
php artisan route:cache
```

🚀 Selesai dan Aman! Selamat menikmati SIGAP Versi Laravel dengan infrastruktur Deployment *Continuous Delivery*! Kapanpun Anda ingin mengubah sebuah koma pada *code editor*, perubahan akan mendistribusi sempurna ke pengguna ujung (End-User)!.
