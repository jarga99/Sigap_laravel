<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Setting;
use App\Models\Link;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Feedback;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with UPT BLK Pasuruan data (Restored from Backup).
     */
    public function run(): void
    {
        // 0. Clean Slate
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        AuditLog::truncate();
        Notification::truncate();
        Feedback::truncate();
        Link::truncate();
        User::truncate();
        Category::truncate();
        Setting::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // 1. Setup Categories (13 Vocational Departments from Backup)
        $categoriesData = [
            'Bagian Tata Usaha', 
            'Pelatihan dan Sertifikasi', 
            'Pengembangan dan Pemasaran',
            'Kejuruan TIK', 
            'Kejuruan Tekmek', 
            'Kejuruan Bisman', 
            'Kejuruan Elektro', 
            'Kejuruan Otomotif', 
            'Kejuruan Refrigerasi', 
            'Kejuruan Fashion Teknologi', 
            'Kejuruan Tata Rias', 
            'Kejuruan Listrik', 
            'Umum'
        ];

        $categories = [];
        foreach ($categoriesData as $name) {
            $categories[] = Category::create([
                'name' => $name,
                'description' => $name === 'Umum' ? 'Layanan portal untuk tamu dan masyarakat umum.' : "Unit kerja operasional bagian $name."
            ]);
        }

        // 2. Setup Administrative Users (Credential matches Backup)
        $admin = User::create([
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'fullName' => 'Super Administrator',
            'role' => 'ADMIN',
            'email' => 'admin@blkpasuruan.go.id',
            'is_active' => true
        ]);

        $adminEvent = User::create([
            'username' => 'adminevent',
            'password' => Hash::make('password123'),
            'fullName' => 'Admin Event Utama',
            'role' => 'ADMIN_EVENT',
            'email' => 'event@blkpasuruan.go.id',
            'is_active' => true
        ]);

        // Sample Employee (Tata Usaha)
        $pegawai = User::create([
            'username' => 'pegawai',
            'password' => Hash::make('password123'),
            'fullName' => 'Staff Tata Usaha',
            'role' => 'EMPLOYEE',
            'email' => 'pegawai@blkpasuruan.go.id',
            'category_id' => $categories[0]->id, // Bagian Tata Usaha
            'is_active' => true
        ]);

        // 3. Setup Official Settings
        Setting::create([
            'instansi_name' => 'UPT BLK Pasuruan',
            'instansi_desc' => 'Dinas Tenaga Kerja dan Transmigrasi Provinsi Jawa Timur - Unit Pelaksana Teknis Balai Latihan Kerja Pasuruan.',
            'app_name' => 'SIGAP Pasuruan',
            'footer_text' => 'AKSI: Akurasi, Kontinuitas, Solusi, Inovasi - Melayani dengan Hati.',
            'footer_copyright' => '© 2026 UPT BLK Pasuruan',
            'contact_email' => 'blk.pasuruan@jatimprov.go.id',
            'contact_phone' => '0343-421234',
            'contact_address' => 'Jl. Raya Pasuruan No. 123, Pasuruan, Jawa Timur',
            'footer_mode' => 'COMPLEX',
            'custom_domain' => 'sigap.blkpasuruan.go.id'
        ]);

        // 4. Setup Sample Links (Extracted Patterns from Backup)
        $linksData = [
            // INTERNAL (Visible to all logged in)
            ['title' => 'Google', 'url' => 'https://google.com', 'vis' => 'INTERNAL', 'cat' => 12, 'icon' => 'Search'],
            ['title' => 'Website Resmi BLK', 'url' => 'https://blkpasuruan.go.id', 'vis' => 'INTERNAL', 'cat' => 12, 'icon' => 'Globe'],
            ['title' => 'Pendaftaran Pelatihan', 'url' => 'https://pelatihan.blkpasuruan.go.id', 'vis' => 'INTERNAL', 'cat' => 1, 'icon' => 'Award'],
            
            // INTERNAL
            ['title' => 'Presensi Online', 'url' => 'https://absensi.dummy.go.id', 'vis' => 'INTERNAL', 'cat' => 0, 'icon' => 'Clock'],
            ['title' => 'E-Office Jatim', 'url' => 'https://eoffice.jatimprov.go.id', 'vis' => 'INTERNAL', 'cat' => 0, 'icon' => 'FileText'],
            ['title' => 'Layanan Kepegawaian', 'url' => 'https://simpeg.jatimprov.go.id', 'vis' => 'INTERNAL', 'cat' => 0, 'icon' => 'Users'],
            
            // KATEGORI SPECIFIC
            ['title' => 'Aset Unit TIK', 'url' => 'https://tik.sigap.internal', 'vis' => 'KATEGORI', 'cat' => 3, 'icon' => 'Smartphone'],
            ['title' => 'Silabus Kurikulum', 'url' => 'https://kurikulum.sigap.internal', 'vis' => 'KATEGORI', 'cat' => 1, 'icon' => 'BookOpen'],
            ['title' => 'Pengadaan Alat Workshop', 'url' => 'https://pengadaan.sigap.internal', 'vis' => 'KATEGORI', 'cat' => 2, 'icon' => 'Briefcase'],
        ];

        foreach ($linksData as $l) {
            try {
                Link::create([
                    'title' => $l['title'],
                    'url' => $l['url'],
                    'slug' => Str::slug($l['title']) . '-' . time() . '-' . rand(100, 999),
                    'icon' => $l['icon'],
                    'visibility' => $l['vis'],
                    'category_id' => $categories[$l['cat']]->id,
                    'userId' => $admin->id,
                    'is_active' => true,
                    'clicks' => rand(10, 500)
                ]);
            } catch (\Exception $e) {
                echo "ERROR CREATING LINK [" . $l['title'] . "]: " . $e->getMessage() . "\n";
                throw $e;
            }
        }

        // 5. Setup Mock Life (Notifications & Feedback)
        Notification::create([
            'message' => 'Selamat datang di SIGAP Lite V2! Platform Anda telah siap digunakan.',
            'isRead' => false
        ]);

        Notification::create([
            'message' => 'Terdapat saran baru dari portal publik pada menu Kotak Saran.',
            'isRead' => false
        ]);

        Feedback::create([
            'name' => 'Budi Santoso',
            'email' => 'budi@example.com',
            'phone' => '08123456789',
            'subject' => 'Pelatihan TIK',
            'comment' => 'Kapan pendaftaran pelatihan TIK gelombang 2 dibuka kembali?',
            'status' => 'PENDING'
        ]);

        // 6. Mock Audit Logs
        AuditLog::create([
            'action' => 'DATABASE_SEED',
            'resource' => 'System',
            'details' => 'Initial database seeding with UPT BLK Pasuruan official data.',
            'userId' => $admin->id,
            'category_id' => null,
            'ipAddress' => '127.0.0.1',
            'userAgent' => 'SIGAP System Engine'
        ]);
    }
}
