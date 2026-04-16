# 🚀 Panduan Deployment SIGAP ke Subdomain (cPanel)

Panduan ini disusun khusus untuk membantu Anda melakukan deployment aplikasi SIGAP ke server produksi (Jagoan Hosting/cPanel) menggunakan sistem **Next.js Standalone** dan **Vue Static Build**.

---

## 🏗️ Tahap 1: Persiapan di Komputer Lokal

Sebelum mengunggah apa pun, kita perlu membungkus aplikasi menjadi paket yang siap jalan.

1.  Buka terminal di folder utama proyek `sigap`.
2.  Jalankan perintah:
    ```bash
    ./package-deploy.sh
    ```
3.  Tunggu hingga selesai. Script ini akan membuat folder `deploy_package/` yang berisi:
    *   `backend_sigap.zip`: Berisi file server (API, Database Schema, & Standalone Engine).
    *   `frontend_sigap.zip`: Berisi file tampilan website.

---

## 🗄️ Tahap 2: Persiapan Database (cPanel)

1.  Login ke **cPanel** Anda.
2.  Cari menu **MySQL® Databases**.
3.  **Create New Database**: Masukkan nama (misal: `u123_sigap`).
4.  **Add New User**: Masukkan username dan password yang kuat. **Catat credential ini!**
5.  **Add User To Database**: Pilih user dan database yang baru dibuat, klik **Add**, lalu centang **ALL PRIVILEGES**.

---

## 🌐 Tahap 3: Membuat Subdomain (cPanel)

Buat dua alamat subdomain:
*   **Frontend**: `sigap.domainanda.com` (Document Root: `public_html/sigap`)
*   **Backend**: `api-sigap.domainanda.com` (Document Root: `public_html/api-sigap`)

---

## ⚙️ Tahap 4: Setup Backend (Node.js App)

1.  Cari menu **Setup Node.js App** di cPanel.
2.  Klik **Create Application**.
3.  **Node.js Version**: Pilih versi terbaru (20.x atau 22.x).
4.  **Application Root**: Ketikkan folder khusus di luar public_html agar aman, misal: `sigap-backend-prod`.
5.  **Application URL**: Pilih subdomain API (`api-sigap.domainanda.com`).
6.  **Startup File**: Ketik `server.js`.
7.  Klik **Create**.
8.  **PENTING**: Di bagian bawah menu ini, nanti Anda akan menekan tombol **Run NPM Install** (tapi tunggu setelah Tahap 5 selesai).

---

## 📂 Tahap 5: Upload & Extract File

1.  Buka **File Manager** di cPanel.
2.  **Upload Backend**:
    *   Buka folder `sigap-backend-prod`.
    *   Upload file `backend_sigap.zip`.
    *   Klik Kanan > **Extract**.
    *   **PENTING**: Pindahkan semua isi dari folder `backend` ke folder induk (`sigap-backend-prod`).
    *   **SOLUSI BYPASS (PENTING)**: Karena hosting Anda membatasi `npm install`, kita sudah menyertakan `node_modules` di dalam ZIP. Jika cPanel menolak saat Anda membuat aplikasi Node.js, lakukan ini:
        1. Hapus folder `node_modules` (atau ubah nama jadi `vendor`) SEBENTAR SAJA.
        2. Simpan konfigurasi Node.js App di cPanel.
        3. Setelah cPanel membuat aplikasinya, **Hapus symlink node_modules** yang dibuat cPanel (yang ada icon panah kecil).
        4. **Rename balik** folder `vendor` tadi menjadi `node_modules`.

3.  **Upload Frontend**:
    *   Buka folder subdomain frontend (misal: `public_html/sigap`).
    *   Upload file `frontend_sigap.zip`.
    *   Klik Kanan > **Extract**.
    *   **PENTING**: Pindahkan semua isi dari folder `frontend` hasil extract ke folder induknya (`sigap`).

---

## 🔐 Tahap 6: Konfigurasi Environment (.env)

1.  Di File Manager, buka folder `sigap-backend-prod`.
2.  Rename file `.env.example` menjadi `.env`.
3.  Klik kanan File `.env` > **Edit**.
4.  Isi data database Anda:
    ```env
    DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/NAMA_DATABASE"
    JWT_SECRET="isi_dengan_kode_acak_bebas"
    GEMINI_API_KEY="AI_KEY_ANDA"
    ```
5.  **Save Changes**.

---

## 🚀 Tahap 7: Jalankan Aplikasi!

1.  Kembali ke menu **Setup Node.js App** di cPanel.
2.  Pastikan folder `node_modules` sudah tersedia (hasil dari bypass di Tahap 5).
3.  Klik **Start App** pada aplikasi backend Anda.
4.  Jika statusnya sudah "Running", lanjut ke tahap terakhir.

---

## 💾 Tahap 8: Pembuatan Akun Admin (Jalur Bypass Browser)

Karena server Anda tidak sanggup menjalankan perintah terminal `npx prisma db seed`, kita akan menggunakan jalur browser:

1.  Pastikan Backend statusnya sudah **Started/Running**.
2.  Buka browser dan akses alamat API Anda ditambah `/api/auth/reset-seed`.
    *   Contoh: `https://api-sigap.domainanda.com/api/auth/reset-seed`
3.  Jika muncul pesan sukses, berarti user admin sudah terbuat.
4.  Login di dashboard utama menggunakan:
    *   **Username**: `admin`
    *   **Password**: `admin123`
    *   **Role**: Super Admin

5.  **Penting**: Langsung ganti password Anda di menu profil setelah login demi keamanan.

---

## 🛠️ Jalur Cepat: Manajemen Via Terminal (SSH)

Jika Anda memiliki akses SSH ke server, Anda bisa mengelola aplikasi lebih cepat tanpa perlu hapus-pasang ZIP. Gunakan panduan ini untuk menjaga stabilitas RAM (Batas 3 GB).

### 1. Aktifkan Environment Node.js (NVM)
Server menggunakan NVM, jalankan ini setiap kali baru masuk ke SSH:
```bash
source ~/.nvm/nvm.sh
# Cek apakah sudah aktif
node -v
```

### 2. Update Dependensi (RAM-Safe)
Jangan jalankan instalasi berbarengan. Pakai flag hemat RAM berikut:
```bash
# Instal Frontend
cd ~/sigap/frontend-client && npm install --prefer-offline --no-audit

# Instal Backend
cd ~/sigap/backend-api && npm install --prefer-offline --no-audit
```

### 3. Sinkronisasi Database (Prisma)
Jalankan ini di folder backend setiap kali ada perubahan pada file `schema.prisma`:
```bash
cd ~/sigap/backend-api
npx prisma generate
```

### 4. Build Ulang di Server (Hati-hati RAM!)
Proses build memakan banyak tenaga. Jalankan satu per satu:
```bash
# Build Frontend
cd ~/sigap/frontend-client && npm run build

# Build Backend
cd ~/sigap/backend-api && npm run build
```

> [!TIP]
> Jika server hang saat build, gunakan swap memory atau lakukan build di lokal lalu upload folder `.next` (backend) dan `dist` (frontend) secara manual.

---

## 🛠️ Troubleshooting


*   **Error 404 saat Refresh**: Pastikan file `.htaccess` ada di folder frontend (sudah dibuat otomatis oleh script).
*   **Database Error**: Cek kembali `DATABASE_URL` di file `.env`.
