# 📜 SOP: Manajemen Keamanan & Lisensi SIGAP

Dokumen ini menjelaskan cara Anda sebagai pengembang mengelola sistem proteksi agar tidak terdeteksi sebagai "Ilegal" saat deployment dan cara mengelola daftar domain yang diizinkan.

---

## 🚀 1. Persiapan Deployment (Agar Tidak Terdeteksi Ilegal)

Setiap kali Anda memasang sistem SIGAP di server baru, Anda wajib melakukan langkah ini:

1.  Buka file **`.env`** di folder `backend-api`.
2.  Temukan variabel **`ALLOWED_DOMAINS`**.
3.  Masukkan nama domain produksi Anda (tanpa `http://` dan tanpa `path`), dipisahkan dengan koma jika lebih dari satu.
    ```dotenv
    # Contoh:
    ALLOWED_DOMAINS="sigap.kabupaten-anda.go.id, api.sigap.com"
    ```
4.  Pastikan **`localhost:3000`** tetap ada di sana jika Anda masih ingin melakukan testing di komputer lokal.

---

## 📝 2. Manajemen Whitelist & Blacklist

### A. Cara Menambah Domain (Whitelist)
Ada dua lapisan Whitelist di SIGAP untuk keamanan ganda:

1.  **Lapisan Mudah (`.env`)**:
    Gunakan variabel `ALLOWED_DOMAINS` di file `.env`. Ini adalah cara yang disarankan untuk penggunaan sehari-hari.
2.  **Lapisan Tersembunyi (`security.ts`)**:
    Jika Anda ingin menanamkan domain secara permanen di dalam kode (agar tidak bisa diubah oknum via `.env`):
    - Pergi ke [backend-api/src/lib/security.ts](file:///home/jr/sigap/backend-api/src/lib/security.ts).
    - Ubah nilai **`WHITELIST_B64`**. Ini adalah string Base64 yang berisi daftar domain yang dipisahkan oleh tanda pipa (`|`).
    - *Tip:* Anda bisa menggunakan tool online "Base64 Encode" untuk membuat string baru dari teks `localhost:3000|domain-anda.com`.

### C. Fitur "Poison Pill" (Penyengat)
Untuk memberikan efek jera pada oknum yang berusaha menghapus proteksi UI:
- **Data Fuzzing**: Jika lisensi ilegal, sistem akan otomatis merubah Nama Aplikasi menjadi `(UNAUTHORIZED COPY)` dan Nama Instansi menjadi `[ILLEGAL]`. 
- **Silent Phone Home**: Setiap kali ada yang mencoba Login dari domain ilegal, sistem akan mengirim detail Username oknum tersebut ke Discord Anda **tanpa** mereka sadari.
- **Logika Dependensi**: Fungsi penyimpanan data admin akan tertutup otomatis (*Locked*) jika domain tidak dikenal.

### B. Cara Memblokir Domain (Blacklist)
Sistem ini menggunakan prinsip **"Deny by Default"**. Artinya:
- **Semua domain yang tidak ada** di dalam Whitelist secara otomatis dianggap **BLACKLIST (Ilegal)**.
- Anda tidak perlu mendaftarkan domain oknum satu per satu; cukup pastikan domain oknum tersebut tidak ada di Whitelist Anda.

---

## 🔔 3. Monitoring Notifikasi Keamanan

Jika sistem dijalankan di domain di luar Whitelist:
1.  **User Interface**: Dashboard Admin akan terkunci dan menampilkan banner peringatan merah.
2.  **Notifikasi**: Laporan otomatis akan dikirim ke **Discord Webhook** Anda (jika `SECURITY_WEBHOOK_URL` sudah diisi di `.env`).
3.  **SOP Developer**: Jika Anda sendiri yang melihat peringatan ini, periksa apakah domain yang Anda gunakan sudah terdaftar di `.env` (periksa penulisan *typo*).

---

## 🛠️ 4. Debugging untuk Pengembang
Jika Anda merasa terganggu oleh sistem proteksi saat sedang melakukan pengembangan cepat:
- Anda dapat menonaktifkan pemeriksaan sementara dengan mengubah fungsi `isAuthorized` di `security.ts` agar selalu mengembalikan nilai `true`.
- **PENTING**: Jangan lupa kembalikan ke semula sebelum melakukan `git push` atau *push* ke server klien.

---
*Keamanan sistem ini dirancang untuk melindungi aset digital wiradika.jr.*
