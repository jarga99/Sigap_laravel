# 📁 Panduan Konfigurasi Git & Push SIGAP (STAGING FOCUS)

Panduan ini memastikan kode Anda terunggah dengan aman ke GitHub untuk tujuan deployment ke **Server Staging**.

## 🔒 1. Keamanan File (Cek .gitignore)
Sebelum melakukan push, pastikan file rahasia lokal tidak ikut terunggah.
*   **File `.env`**: Dipastikan **AMAN**. File `.gitignore` Anda sudah dikonfigurasi untuk mengabaikan semua file `.env`. Password lokal Anda tidak akan pernah bocor ke GitHub.

---

## ⚙️ 2. Transposisi Konfigurasi ke GitHub Secrets
Karena file `.env` tidak ditarik ke GitHub, Anda **WAJIB** memasukkan nilai berikut ke **GitHub Secrets** agar build Staging berhasil.

### Langkah Konfigurasi di GitHub:
1.  Buka repository SIGAP Anda di GitHub.
2.  Klik Tab **Settings**.
3.  Pilih **Secrets and variables > Actions**.
4.  Klik tombol **New repository secret**.

### Daftar Secret yang HARUS Diisi (Staging):
| Nama GitHub Secret | Kegunaan | Contoh Nilai |
| :--- | :--- | :--- |
| `STAGING_DATABASE_URL` | Koneksi database server staging | `mysql://user:pass@host:3306/db_staging` |
| `STAGING_JWT_SECRET` | Kunci keamanan login staging | `PilihStringAcakPanjangSaja` |
| `STAGING_ALLOWED_DOMAINS` | Domain staging Anda | `staging.domain.com` |
| `STAGING_VITE_API_BASE_URL` | URL domain API staging | `https://api-staging.domain.com` |
| `STAGING_MAINTENANCE_TOKEN` | Token untuk setup-db staging | `TokenRahasiaStaging123` |

---

## 🚀 3. Perintah Push ke GitHub
Jalankan perintah ini secara berurutan di terminal folder root (`/home/jr/sigap`):

```bash
git add .
git commit -m "fix: staging connection and robust downloads"
git push origin master
```

---

## 🖥️ 4. Monitoring Staging Deployment
Setelah push, pantau tab **Actions** di GitHub:
1.  Pastikan status workflow berubah menjadi **Hijau ✅**.
2.  Jika merah, cek apakah ada Secret di Langkah 2 yang typo atau belum diisi.
3.  Buka website staging Anda dan jalankan inisialisasi database (lihat `implementation_plan.md`).
