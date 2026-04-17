# Panduan Deployment Standalone ke cPanel

Mode `standalone` adalah cara terbaik untuk menjalankan Next.js di hosting cPanel karena sangat menghemat penggunaan Inode (jumlah file) dan RAM.

## 📦 Persiapan Data (Lakukan di Lokal)

Sebelum mengupload ke cPanel, Anda wajib melakukan build di komputer lokal atau pipeline CI/CD:

```bash
cd backend-api
npm run build
```

## 📤 File yang Wajib Di-upload

Setelah build selesai, Anda **HANYA** perlu mengupload komponen berikut ke folder aplikasi di cPanel (misalnya `/home/username/api-sigap/`):

1.  **Folder `.next/standalone`**: Salin seluruh isi folder ini ke root folder aplikasi Anda di cPanel.
2.  **Folder `.next/static`**: Salin ke `.next/static` di cPanel (Hasilkan folder `.next` jika belum ada).
3.  **Folder `public`**: Salin ke folder root aplikasi di cPanel.
4.  **File `.env`**: Pastikan file environmen terbawa.

> [!IMPORTANT]
> Folder `node_modules` bawaan **TIDAK PERLU** di-upload. Folder `standalone` sudah memiliki `node_modules` minimalis di dalamnya yang cukup untuk menjalankan aplikasi.

## ⚙️ Konfigurasi "Setup Node.js App" di cPanel

1.  **Application root**: Isi dengan folder tempat Anda mengupload file (contoh: `api-sigap`).
2.  **Application URL**: URL subdomain Anda.
3.  **Application startup file**: Isi dengan `server.js` (ini merujuk ke file hasil copy dari `standalone/server.js`).
4.  **Run JS Script**: Klik "Run Build" atau "Run Install" (Opsional, karena kita sudah upload standalone).
5.  **Restart**: Tekan tombol "Restart" untuk menerapkan perubahan.

## 🛠️ Troubleshoot

Jika muncul error *Internal Server Error* setelah deploy:
- Pastikan folder `public` dan `.next/static` sudah di-copy dengan benar. Tanpa ini, tampilan CSS/Gambar tidak akan muncul.
- Periksa log di cPanel melalui file `stderr.log`.

---
*Dokumen ini dibuat otomatis oleh Antigravity untuk optimasi SIGAP Platform.*
