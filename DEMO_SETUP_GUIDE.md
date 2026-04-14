# 🎮 Panduan Setup Demo Gratis (GitHub Integration)

Ingin menunjukkan aplikasi SIGAP ke orang lain tanpa biaya hosting? Ikuti panduan "Collab with GitHub" ini menggunakan platform **Vercel** dan **Railway/Supabase**.

---

## 🏗️ 1. Persiapan Repository
1.  **Push** seluruh kode SIGAP Anda ke GitHub (Private atau Public).
2.  Pastikan struktur folder Anda tetap (ada folder `backend-api` dan `frontend-client`).

---

## 💾 2. Database Gratis (Railway / Supabase)
Karena Next.js butuh database MySQL asli, gunakan **Railway.app**:
1.  Login ke Railway menggunakan akun GitHub.
2.  Klik **New Project** -> **Provision MySQL**.
3.  Di tab **Variables**, ambil `MYSQL_URL`. Formatnya: `mysql://root:pass@host:port/railway`.
4.  Copy URL tersebut untuk digunakan di langkah selanjutnya.

---

## ⚡ 3. Deploy Backend (Vercel)
Vercel sangat powerfull untuk menjalankan Next.js secara gratis:
1.  Login ke [Vercel](https://vercel.com) dengan GitHub.
2.  **Add New Project** -> Pilih repositori SIGAP Anda.
3.  **Root Directory**: Pilih folder `backend-api`.
4.  **Environment Variables**: Tambahkan:
    - `DATABASE_URL`: (URL MySQL dari Railway tadi)
    - `JWT_SECRET`: (Kode acak apa saja)
    - `GEMINI_API_KEY`: (Jika ada)
5.  Klik **Deploy**.
👉 *Hasil:* Anda akan mendapatkan domain backend, misal: `sigap-api.vercel.app`.

---

## 🌐 4. Deploy Frontend (Vercel / Netlify)
1.  **Add New Project** lagi di Vercel.
2.  **Root Directory**: Pilih folder `frontend-client`.
3.  **Framework Preset**: Vite.
4.  **Environment Variables**:
    - `VITE_API_BASE_URL`: `https://sigap-api.vercel.app` (Domain backend Anda tadi)
5.  Klik **Deploy**.
👉 *Hasil:* Aplikasi siap diakses secara online!

---

## 🔄 5. Keuntungan Integrasi GitHub
- **Auto-Deploy**: Setiap kali Anda melakukan `git push` ke GitHub, Vercel akan otomatis melakukan update (re-build) pada aplikasi demo Anda.
- **Preview Branch**: Jika Anda membuat fitur baru di branch lain, Vercel akan memberikan link khusus untuk fitur tersebut sebelum digabung ke branch utama.

---
*Tip: Untuk demo gratis, database Railway memiliki limit waktu per bulan. Jika habis, data mungkin tidak bisa diakses sampai bulan berikutnya.*
