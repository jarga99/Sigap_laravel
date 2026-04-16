# 🚀 Panduan Deployment SIGAP ke Subdomain (cPanel)

Dokumen ini berisi langkah-langkah teknis untuk memindahkan aplikasi SIGAP dari lokal ke server produksi (cPanel/Shared Hosting). Terdapat dua metode: **Manual** (untuk kontrol penuh) dan **Otomatis/CI-CD** (untuk efisiensi).

---

## 🛠️ Opsi 1: Deployment Manual (Git Pull / Zip)
*Gunakan ini jika Anda ingin melakukan semuanya sendiri via File Manager atau SSH.*

### 1. Persiapan di Komputer Lokal

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

---

## 🤖 Opsi 2: Automasi Deployment (CI/CD) - REKOMENDASI
*Gunakan ini agar website terupdate otomatis setiap kali Anda melakukan `git push` ke GitHub.*

### Apa itu CI/CD?
CI/CD adalah singkatan dari **Continuous Integration & Continuous Deployment**. Sederhananya: Anda tidak perlu lagi masuk ke SSH untuk melakukan `git pull` atau `npm run build`. Server GitHub akan melakukan pekerjaan berat itu untuk Anda (di awan) dan mengirimkan hasilnya langsung ke cPanel.

> [!TIP]
> Metode ini sangat efisien karena tidak memakan RAM 3 GB milik server hosting Anda saat proses *build*.

### Langkah 1: Menyiapkan GitHub Secrets
GitHub membutuhkan izin untuk masuk ke cPanel Anda. Karena kita menggunakan sistem **Staging & Production**, Anda perlu menyiapkan dua set rahasia:

#### A. Data Testing (Staging) - Otomatis saat Push
Gunakan awalan **`STAGING_`** untuk semua nama secret berikut:

| Nama Secret (Ketikan di Name) | Isian Secret (Ketikan di Value/Secret) |
| :--- | :--- |
| **`STAGING_FTP_SERVER`** | Alamat FTP (contoh: `ftp.blkpasuruan.go.id`) |
| **`STAGING_FTP_USERNAME`** | Username login cPanel Anda |
| **`STAGING_FTP_PASSWORD`** | Password cPanel (yang baru Anda ganti) |
| **`STAGING_DATABASE_URL`** | URL Database (contoh: `mysql://u123_test:pass@localhost:3306/u123_db_test`) |
| **`STAGING_JWT_SECRET`** | Isi dengan **JWT_SECRET** yang ada di .env Anda |
| **`STAGING_VITE_API_BASE_URL`** | URL subdomain backend (contoh: `https://api-test.blkpasuruan.go.id`) |
| **`STAGING_REMOTE_BACKEND_DIR`** | Folder backend di server (contoh: `/backend-api-test`) |
| **`STAGING_REMOTE_FRONTEND_DIR`** | Folder frontend di server (contoh: `/sigap.blkpasuruan.com`) |
| **`STAGING_SSH_PRIVATE_KEY`** | Isi dengan **seluruh teks Private Key** dari cPanel (Authorized) |

#### B. Data Real (Production) - Manual (Klik Tombol)
Gunakan awalan **`PROD_`** untuk data ini. **Hanya diisi jika website utama sudah siap**:

| Nama Secret | Keterangan |
| :--- | :--- |
| **`PROD_FTP_SERVER`** | Alamat FTP server utama |
| **`PROD_FTP_USERNAME`** | Username cPanel |
| **`PROD_FTP_PASSWORD`** | Password cPanel |
| **`PROD_DATABASE_URL`** | URL Database Real/Produksi |
| **`PROD_JWT_SECRET`** | Password JWT untuk website utama |
| **`PROD_VITE_API_BASE_URL`** | URL website utama Anda |
| **`PROD_REMOTE_BACKEND_DIR`** | Folder backend produksi |
| **`PROD_REMOTE_FRONTEND_DIR`** | Folder public_html utama |
| **`PROD_SSH_PORT`** | Port SSH server utama (default: 21098/22) |

### Langkah 4: Pengaturan Database (Satu Kali)
Setelah file terkirim, Anda perlu menyiapkan database di server:

1.  **Buat Database & User** di menu **MySQL® Databases** cPanel.
2.  **Edit File .env** di folder backend server Anda, pastikan `DATABASE_URL` sudah benar.
3.  **Buka Terminal** di cPanel dan jalankan perintah:
    ```bash
    cd /home/username/path-ke-backend
    source ~/.nvm/nvm.sh # Jika menggunakan NVM
    npx prisma generate
    npx prisma db push
    npx prisma db seed
    ```

## FAQ & Troubleshooting
*   **Aplikasi tidak jalan?** Cek folder `tmp/` apakah ada file `restart.txt`. Jika tidak ada, buat manual atau klik **Restart** di menu **Setup Node.js App**.
*   **Error 500?** Cek log di `stderr.log` di dalam folder root aplikasi.
*   **Database Error?** Pastikan port database (`3306`) dan credentials di `.env` sudah sesuai dengan yang dibuat di cPanel.

---
*Dibuat otomatis oleh Antigravity untuk SIGAP Project.*

### Langkah 2: Memahami File Workflow
Saya telah menyiapkan dua file di folder `.github/workflows/`:
1. **deploy-backend.yml**: Mengotomatisasi Next.js. Ia melakukan `build` di GitHub, lalu mengirimkan folder `standalone` ke server.
2. **deploy-frontend.yml**: Mengotomatisasi Vue 3. Ia melakukan `build`, lalu mengirim folder `dist` saja.

### Langkah 3: Cara Deployment

#### 1. Deployment ke Staging (OTOMATIS)
Setiap kali Anda melakukan `git push origin master`, robot akan otomatis melakukan build dan mengirimkan hasilnya ke server **Staging/Testing**. Cukup lakukan:
```bash
git add .
git commit -m "feat: update staging"
git push origin master
```

#### 2. Deployment ke Production (MANUAL - SATU KLIK)
Jika setelah dites di Staging sudah aman dan tidak ada bug, Anda bisa "melempar" ke server **Utama/Production** tanpa perlu push kode lagi:
1. Buka tab **Actions** di GitHub.
2. Di sidebar kiri, pilih **Multi-Environment Deploy Backend** (atau Frontend).
3. Klik tombol **Run workflow** di sebelah kanan atas.
4. Pilih branchnya (`master`) dan pilih Target: **production**.
5. Klik **Run workflow**. 🚀

### FAQ / Tips Tambahan:
- **Restart App**: Untuk backend, workflow akan otomatis menjalankan perintah `touch tmp/restart.txt` di server untuk me-restart Node.js.
- **Node Modules**: Karena kita menggunakan sistem **Standalone**, Anda tidak perlu lagi menjalankan `npm install` di server cPanel. Semua dependensi sudah dibungkus rapi oleh GitHub.

---
> SIGAP Deployment Engine v1.3.0 - Dual Staging/Production Edition
