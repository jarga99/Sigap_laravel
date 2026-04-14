# 🛡️ SIGAP - Sistem Gerbang Akses Pintar

[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge)](https://github.com/jarga99/sigap/releases)
[![Next.js 15](https://img.shields.io/badge/Backend-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Vue.js 3](https://img.shields.io/badge/Frontend-Vue%203-4fc08d?style=for-the-badge&logo=vuedotjs)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**SIGAP (Sistem Gerbang Akses Pintar)** adalah platform manajemen portal satu pintu (single-entry gateway) yang dirancang untuk memodernisasi cara instansi mengelola layanan digital, pembuatan shortlink resmi, serta landing page event yang dinamis dan terintegrasi AI.

---

## 🏗️ I. Latar Belakang & Filosofi
Di era digitalisasi, instansi seringkali kesulitan mengelola ratusan link layanan yang tersebar. SIGAP hadir sebagai "Akses Pintar" yang menyatukan seluruh layanan tersebut dalam satu dashboard yang aman, transparan, dan mudah dikelola oleh berbagai peran (Super Admin hingga Pegawai).

---

## 📐 II. Arsitektur & Alur Sistem

### 1. Alur Kerja Utama
```mermaid
graph TD
    A[Public/Guest] -->|Cari Layanan| B(Portal SIGAP)
    B -->|Submit Feedback| C{Admin Dashboard}
    D[Pegawai] -->|Kelola Tautan| C
    E[Admin Event] -->|Hybrid Layout Editor| F[Landing Page Event]
    C -->|Audit Logs| G[Super Admin]
    G -->|Konfigurasi Branding| B
```

### 2. Struktur Database (ERD)
```mermaid
erDiagram
    USER ||--o{ LINK : "manages"
    USER ||--o{ EVENT : "creates"
    CATEGORY ||--o{ LINK : "categorizes"
    EVENT ||--o{ EVENT_ITEM : "contains"
    LINK ||--o{ CLICK_LOG : "tracked by"
    USER ||--o{ AUDIT_LOG : "logged actions"
```

---

## 🚀 III. Fitur Unggulan Berdasarkan Peran

| Role | Fitur Kunci | Deskripsi |
| :--- | :--- | :--- |
| **Super Admin** | **RBAC Monitoring** | Kendali penuh user, audit logs per aksi, dan branding global. |
| **Admin Event** | **Hybrid Editor v2** | Pembuat landing page (Linktree-style) dengan kontrol visual penuh. |
| **Pegawai** | **Link Analytics** | Manajemen shortlink kustom dengan statistik klik real-time. |
| **Guest** | **Feedback Portal** | Sistem pengaduan terintegrasi dengan upload bukti gambar. |

---

## 🎨 IV. Dokumentasi Visual (Screenshots)

### 1. Portal Utama (Guest View)
![Portal Utama](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/guest_portal_home.png)
*Tampilan portal publik untuk mencari layanan instansi.*

### 2. Admin Dashboard (Super Admin)
![Admin Dashboard](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/admin_dashboard.png)
*Pantauan statistik global seluruh aktivitas sistem.*

### 3. Hybrid Event Editor (v2)
![Hybrid Editor](https://raw.githubusercontent.com/jarga99/sigap/master/frontend-client/public/docs/screenshots/hybrid_editor.png)
*Alat kustomisasi tampilan landing page event (Warna, Font, Shape, Drag-and-drop).*

---

## 🛠️ V. Panduan Instalasi (Development)

### 📋 Prasyarat
- **Node.js**: v20.x or higher
- **MySQL**: v8.0+
- **NPM/PNPM**

### ⚙️ Alur Setup
1. **Database**: Buat database `sigap_db` di MySQL.
2. **Backend**:
   ```bash
   cd backend-api
   npm install
   cp .env.example .env # Atur DATABASE_URL & JWT_SECRET
   npx prisma db push
   npx prisma db seed # Penting: Gunakan password 'sigap2025'
   ```
3. **Frontend**:
   ```bash
   cd frontend-client
   npm install
   npm run dev
   ```

---

## 🔐 VI. Mekanisme Keamanan & Backup
SIGAP dilengkapi dengan fitur **"Reset Global with Mandatory Backup"**.
- Setiap kali data di-reset, sistem otomatis menjalankan `mysqldump` dan mengompres folder `uploads` menjadi file `.tar.gz`.
- Backup disimpan di folder `/backups/` di root proyek (Terproteksi dari akses publik).

---

## 📘 VII. Panduan Penggunaan (SOP)
Untuk panduan detail per fitur dan per role, silakan baca dokumentasi terpisah kami:
👉 **[SIGAP USER Guide (SOP & Manual)](file:///home/jr/sigap/USER_GUIDE.md)**

---

## ⚖️ VIII. Lisensi & Hak Cipta
Copyright © 2026 **Sistem Gerbang Akses Pintar (SIGAP)**.
Dikembangkan secara eksklusif oleh **wiradika.jr**. Seluruh hak cipta dilindungi undang-undang. Penggunaan tanpa izin tertulis dari pemilik hak cipta dapat dikenakan sanksi sesuai hukum yang berlaku.

---
> Made with 🧪 by SIGAP Dev Team
