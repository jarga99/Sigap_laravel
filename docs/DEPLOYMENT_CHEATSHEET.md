# 🚀 CHEAT SHEET: Deployment Sigap ke Jagoan Hosting (cPanel)

Panduan praktis untuk melakukan deployment aplikasi SIGAP ke server produksi dalam waktu kurang dari 10 menit.

---

## 🏗️ 1. Persiapan Build di Lokal

Sebelum diupload, aplikasi harus dikompilasi menjadi versi produksi.

### A. Frontend (Vue 3)
```bash
cd frontend-client
# Update .env jika diperlukan (VITE_API_BASE_URL)
npm run build
```
👉 *Hasil:* Folder **`dist/`** akan tercipta.

### B. Backend (Next.js)
```bash
cd backend-api
# Pastikan sudah npx prisma generate
npm run build
```
👉 *Hasil:* Folder **`.next/`** dan **`node_modules/`** yang sudah siap.

---

## 📂 2. Struktur Folder Produksi (Subdomain)

Misal subdomain Anda: `sigap.instansi.go.id`

1.  **Frontend**: Upload file di dalam folder `dist/` ke root folder subdomain (misal: `/home/user/sigap.instansi.go.id/`).
2.  **Backend**: Buat folder baru di luar folder subdomain untuk keamanan, misal di `/home/user/api-sigap/`. Upload seluruh isi `backend-api` ke sini.

---

## ⚙️ 3. Konfigurasi cPanel

### A. Node.js Selector (Untuk Backend)
1.  Cari menu **Setup Node.js App**.
2.  Klik **Create Application**.
3.  **Node.js Version**: Pilih 20.x atau 22.x.
4.  **Application Root**: `/home/user/api-sigap`
5.  **Application URL**: `sigap.instansi.go.id/api`
6.  **Startup File**: `node_modules/next/dist/bin/next` atau buat file `server.js` (biasanya Next.js butuh konfigurasi server custom di cPanel).
    > *Tip:* Gunakan perintah `npm run start` melalui terminal cPanel jika Selector bermasalah.

### B. Konfigurasi `.htaccess` (PENTING!)
Buat file `.htaccess` di dalam folder subdomain (tempat file `index.html`) agar Vue Router bekerja dengan baik:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 🔐 4. Checklist Environment (.env)

Pastikan file `.env` di server backend (`/home/user/api-sigap/.env`) berisi data asli produksi:

```dotenv
DATABASE_URL="mysql://user:pass@localhost:3306/db_name"
JWT_SECRET="masukkan_kode_acak_panjang_disini"
GEMINI_API_KEY="AI_KEY_ANDA"
NEXTAUTH_URL="https://sigap.instansi.go.id/api"
# URL Webhook Discord untuk monitoring keamanan (Opsional tapi disarankan)
SECURITY_WEBHOOK_URL="https://discord.com/api/webhooks/your-id/your-token"
```

---

## 🛡️ 6. Setup Monitoring Keamanan (Discord)

Untuk melacak jika ada pihak yang mencuri atau menjalankan kode Anda di domain yang tidak sah secara diam-diam:
1.  Buat **Server Discord** pribadi.
2.  Pergi ke **Server Settings** > **Integrations** > **Webhooks**.
3.  Klik **New Webhook**, beri nama "SIGAP Security Monitor", dan **Copy Webhook URL**.
4.  Paste URL tersebut ke dalam file `.env` sistem di bagian `SECURITY_WEBHOOK_URL`.

Sistem akan otomatis mengirimkan laporan deteksi lokasi dan host aplikasi ke Discord Anda setiap kali ada akses administratif dari domain yang tidak dikenal.

---
*Dikembangkan oleh wiradika.jr untuk kemudahan akses layanan digital.*
