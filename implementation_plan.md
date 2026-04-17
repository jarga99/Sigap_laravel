# 📘 Panduan Master Konfigurasi & Deployment SIGAP (STAGING)

Dokumen ini adalah panduan standar untuk melakukan cross-check konfigurasi pada **Server Staging**.

## 🔑 1. Konfigurasi GitHub Secrets
Pastikan variabel berikut sudah terisi di GitHub Settings untuk lingkungan Staging:

| Secret Name | Contoh Nilai |
| :--- | :--- |
| `STAGING_DATABASE_URL` | `mysql://user:pass@host:3306/db_staging` |
| `STAGING_ALLOWED_DOMAINS` | `staging.domain.com,api-staging.domain.com` |
| `STAGING_VITE_API_BASE_URL` | `https://api-staging.domain.com` |
| `STAGING_MAINTENANCE_TOKEN` | `token-rahasia-staging` |
| `STAGING_JWT_SECRET` | `StringAcakKeamananStaging` |

---

## 🏗️ 2. Mekanisme CI/CD Otomatis (Staging)
Sistem dikonfigurasi untuk berjalan otomatis saat `git push origin master`:

1.  **Mapping API URL**: Pipeline otomatis memetakan `VITE_API_URL` (STAGING).
2.  **Path Correction**: Pipeline mengganti path absolut `/home/jr/sigap` menjadi path server staging Anda.
3.  **Setup Safety**: Rute setup tetap dibiarkan ada di staging agar Anda bisa melakukan uji coba database berkali-kali.

---

## 🚀 3. Aktivasi Database Staging (Post-Deployment)
Setiap kali Anda deploy ke database staging yang baru, jalankan inisialisasi ini:

1.  **Buka Browser**: Akses `https://api-staging.domain.com/api/admin/setup-db?token=STAGING_MAINTENANCE_TOKEN`
2.  **Generate Data Uji**: Tambahkan `&is_mock=true` di URL jika ingin Dashboard langsung terisi data dummy untuk simulasi.
3.  **Login**: Masuk sebagai `admin` / `admin123`.

---

## 🛡️ 4. Checklist Cross-Check Staging
- [ ] **Koneksi API**: Buka form login, pastikan tidak ada error 404/401 saat mengetik.
- [ ] **Download CSV**: Klik "Rekap Data" di Dashboard, pastikan nama file adalah `rekap-data-sigap-YYYY-MM-DD.csv`.
- [ ] **Security Filter**: Coba akses API dari domain lokal; sistem harus memblokir (kecuali localhost:3000 masuk whitelist).
