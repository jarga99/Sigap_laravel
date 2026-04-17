# 📘 Panduan Master Konfigurasi & Deployment SIGAP

Dokumen ini adalah panduan standar untuk melakukan cross-check konfigurasi pada server Staging maupun Production. Gunakan checklist ini untuk memastikan sistem berjalan normal dan aman.

## 🔑 1. Konfigurasi GitHub Secrets
Semua konfigurasi dilakukan melalui **GitHub Settings > Secrets and variables > Actions**. Pastikan variabel berikut sudah terisi:

### A. Lingkungan STAGING (Wajib)
| Secret Name | Contoh Nilai |
| :--- | :--- |
| `STAGING_DATABASE_URL` | `mysql://user:pass@host:3306/db_staging` |
| `STAGING_ALLOWED_DOMAINS` | `staging.domain.com,api-staging.domain.com` |
| `STAGING_VITE_API_BASE_URL` | `https://api-staging.domain.com` (Tanpa /api) |
| `STAGING_MAINTENANCE_TOKEN` | `token-rahasia-staging` |

### B. Lingkungan PRODUCTION (Wajib saat siap)
| Secret Name | Contoh Nilai |
| :--- | :--- |
| `PROD_DATABASE_URL` | `mysql://user:pass@host:3306/db_prod` |
| `PROD_ALLOWED_DOMAINS` | `domain.com,api.domain.com` |
| `PROD_VITE_API_BASE_URL` | `https://api.domain.com` (Tanpa /api) |
| `PROD_MAINTENANCE_TOKEN` | `token-rahasia-prod-sangat-kuat` |

---

## 🏗️ 2. Mekanisme CI/CD (Otomatis)
Sistem telah dikonfigurasi untuk melakukan langkah berikut secara otomatis saat Anda melakukan `git push origin master`:

1.  **Mapping API URL**: Pipeline otomatis memetakan `VITE_API_URL` dengan menambahkan akhiran `/api` ke base URL.
2.  **Path Correction**: Pipeline otomatis mengganti path absolut `/home/jr/sigap` menjadi path cPanel Anda (Sesuai `deploy-backend.yml`).
3.  **Auto-Cleanup (PROD ONLY)**: Khusus untuk deployment ke **Production**, sistem akan **menghapus** folder `setup-db` dan `raw-setup` demi keamanan maksimal.

---

## 🚀 3. Aktivasi Database (Post-Deployment)
Setiap kali Anda deploy ke database baru, jalankan inisialisasi ini satu kali:

1.  **Buka Browser**: Akses `https://api.domain.com/api/admin/setup-db?token=TOKEN_MAINTENANCE`
2.  **Parameter Opsional**: Tambahkan `&is_mock=true` jika ingin mengisi data dummy untuk dashboard (Hanya disarankan di Staging).
3.  **Verifikasi Admin**: Login sebagai `admin` / `admin123`.

---

## 🛡️ 4. Checklist Keamanan (Cross-Check)
- [ ] **Domain Lock**: Coba login dari domain lain yang tidak terdaftar di `ALLOWED_DOMAINS`. Sistem harus memblokirnya.
- [ ] **Download Robustness**: Pastikan export CSV di Dashboard memiliki nama file yang benar (Bukan kode acak).
- [ ] **Token Expired**: Jika Anda logout, pastikan sistem otomatis me-redirect ke halaman login tanpa error yang menggantung.

> [!CAUTION]
> **PENTING**: Di lingkungan **Production**, setelah inisialisasi berhasil, sangat disarankan untuk menghapus manual folder `setup-db` dari repository lokal Anda dan melakukan push ulang untuk memastikan file tersebut benar-benar hilang dari server.
