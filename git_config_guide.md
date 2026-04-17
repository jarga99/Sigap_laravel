# 📁 Panduan Konfigurasi Git & Push SIGAP

Panduan ini memastikan kode Anda terunggah dengan aman ke GitHub sementara semua data rahasia (seperti password database) tersimpan dengan benar di infrastruktur GitHub.

## 🔒 1. Keamanan File (Cek .gitignore)
Sebelum melakukan push, pastikan file rahasia lokal tidak ikut terunggah.
*   **File `.env`**: Dipastikan **AMAN**. File `.gitignore` Anda sudah dikonfigurasi untuk mengabaikan semua file `.env`. Password lokal Anda tidak akan pernah bocor ke GitHub.
*   **File SQL**: Dipastikan **AMAN**. File `.sql` (backup database) juga sudah diabaikan.

---

## ⚙️ 2. Transposisi Konfigurasi (Lokal ke Cloud)
Karena file `.env` tidak ditarik ke GitHub, Anda harus memasukkan nilai yang sama ke dalam **GitHub Secrets**.

### Langkah Konfigurasi di GitHub:
1.  Buka repository SIGAP Anda di GitHub.
2.  Klik Tab **Settings**.
3.  Pilih **Secrets and variables > Actions**.
4.  Klik tombol **New repository secret**.

### Variabel yang Harus Segera Dipindahkan:
| Dari File Lokal | Nama GitHub Secret | Kegunaan |
| :--- | :--- | :--- |
| `backend-api/.env` (`DATABASE_URL`) | `STAGING_DATABASE_URL` | Koneksi database server staging. |
| `backend-api/.env` (`JWT_SECRET`) | `PROD_JWT_SECRET` | Kunci keamanan login. |
| (Data Manual) | `STAGING_VITE_API_BASE_URL` | URL domain API Anda (Contoh: `https://api-staging.sigap.com`). |

---

## 🚀 3. Perintah Push ke GitHub
Jalankan perintah ini secara berurutan di terminal folder root (`/home/jr/sigap`):

```bash
# 1. Simpan semua perubahan perbaikan hari ini
git add .

# 2. Beri catatan progress
git commit -m "feat: implement robust downloads, staging fix, and production security"

# 3. Kirim ke GitHub
git push origin master
```

---

## 🖥️ 4. Monitoring Pasca Push
Setelah melakukan push, jangan langsung menutup terminal. Buka browser dan pantau integrasinya:

1.  **Tab Actions**: Cek apakah workflow pengiriman ke server sedang berjalan.
2.  **Deployment Logs**: Jika ada error (warna merah), baca log-nya. Biasanya dikarenakan ada Secret (Langkah 2) yang lupa Anda masukkan.
3.  **Server Refresh**: Setelah status Actions berubah menjadi **Hijau ✅**, server cPanel Anda akan otomatis memuat kode terbaru dalam waktu ~30 detik.

---

> [!TIP]
> **Cross-check Penting**: Setelah push, pastikan Anda mengecek file `backend-api/.github/workflows/deploy-backend.yml` langsung di GitHub untuk memastikan path target cPanel Anda sudah benar sesuai diskusi kita tadi.
