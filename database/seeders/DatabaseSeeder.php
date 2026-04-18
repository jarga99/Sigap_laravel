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
     * Seed the application's database with REAL and UPDATED data.
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

        // 1. Setup Categories (Vocational Departments)
        $categoriesData = [
            ['name' => 'Bagian Tata Usaha', 'icon' => 'Building2', 'color' => '#3b82f6'], 
            ['name' => 'Pelatihan dan Sertifikasi', 'icon' => 'Award', 'color' => '#10b981'], 
            ['name' => 'Pengembangan dan Pemasaran', 'icon' => 'TrendingUp', 'color' => '#f59e0b'],
            ['name' => 'Kejuruan TIK', 'icon' => 'Monitor', 'color' => '#6366f1'], 
            ['name' => 'Kejuruan Elektro', 'icon' => 'Zap', 'color' => '#ec4899'], 
            ['name' => 'Kejuruan Otomotif', 'icon' => 'Car', 'color' => '#ef4444'], 
            ['name' => 'Kejuruan Fashion Teknologi', 'icon' => 'Scissors', 'color' => '#8b5cf6'], 
            ['name' => 'Kejuruan Tata Rias', 'icon' => 'Sparkles', 'color' => '#d946ef'], 
            ['name' => 'Kejuruan Listrik', 'icon' => 'Lightbulb', 'color' => '#eab308'], 
            ['name' => 'Umum', 'icon' => 'Globe', 'color' => '#64748b']
        ];

        $categories = [];
        foreach ($categoriesData as $c) {
            $categories[] = Category::create([
                'name' => $c['name'],
                'slug' => Str::slug($c['name']),
                'icon' => $c['icon'],
                'color' => $c['color'],
                'description' => "Unit kerja operasional bagian {$c['name']}."
            ]);
        }

        // 2. Setup Administrative Users
        $admin = User::create([
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'fullName' => 'Super Administrator',
            'role' => 'ADMIN',
            'email' => 'admin@sigap.go.id',
            'is_active' => true
        ]);

        $adminEvent = User::create([
            'username' => 'adminevent',
            'password' => Hash::make('password123'),
            'fullName' => 'Admin Event Utama',
            'role' => 'ADMIN_EVENT',
            'email' => 'event@sigap.go.id',
            'is_active' => true
        ]);

        $pegawai = User::create([
            'username' => 'pegawai',
            'password' => Hash::make('password123'),
            'fullName' => 'Staff Tata Usaha',
            'role' => 'EMPLOYEE',
            'email' => 'pegawai@sigap.go.id',
            'category_id' => $categories[0]->id, // Bagian Tata Usaha
            'is_active' => true
        ]);

        // 3. Setup Official Settings
        Setting::create([
            'instansi_name' => 'Balai Latihan Kerja Pasuruan',
            'instansi_desc' => 'Pusat Pelatihan Kerja Kompeten dan Profesional untuk Masyarakat.',
            'app_name' => 'SIGAP Lite',
            'footer_text' => 'AKSI: Akurasi, Kontinuitas, Solusi, Inovasi - Melayani dengan Hati.',
            'footer_copyright' => '© ' . date('Y') . ' UPT BLK Pasuruan',
            'contact_email' => 'info@blkpasuruan.go.id',
            'contact_phone' => '0343-421234',
            'contact_address' => 'Jl. Raya Pasuruan No. 123, Pasuruan, Jawa Timur',
            'footer_mode' => 'COMPLEX',
            'custom_domain' => 'portal.blkpasuruan.go.id'
        ]);

        // 4. Setup REAL Links (Public Access)
        $linksData = [
            // INTERNAL (Visible to all staff)
            ['title' => 'Google Search', 'url' => 'https://www.google.com', 'vis' => 'INTERNAL', 'cat' => 9, 'icon' => 'Search'],
            ['title' => 'Portal Kemdikbud RI', 'url' => 'https://www.kemdikbud.go.id', 'vis' => 'INTERNAL', 'cat' => 9, 'icon' => 'Globe'],
            ['title' => 'KBBI Daring', 'url' => 'https://kbbi.kemdikbud.go.id', 'vis' => 'INTERNAL', 'cat' => 9, 'icon' => 'Book'],
            ['title' => 'DeepL Translator', 'url' => 'https://www.deepl.com', 'vis' => 'INTERNAL', 'cat' => 9, 'icon' => 'Languages'],
            
            // TATA USAHA SPECIFIC
            ['title' => 'JDIH Nasional (Peraturan)', 'url' => 'https://jdihn.go.id', 'vis' => 'KATEGORI', 'cat' => 0, 'icon' => 'FileText'],
            ['title' => 'LAPOR! (Layanan Aspirasi)', 'url' => 'https://www.lapor.go.id', 'vis' => 'KATEGORI', 'cat' => 0, 'icon' => 'MessageSquare'],
            ['title' => 'Satu Data Indonesia', 'url' => 'https://data.go.id', 'vis' => 'KATEGORI', 'cat' => 0, 'icon' => 'Database'],
            
            // PELATIHAN SPECIFIC
            ['title' => 'Coursera Learning', 'url' => 'https://www.coursera.org', 'vis' => 'KATEGORI', 'cat' => 1, 'icon' => 'Award'],
            ['title' => 'Skill Academy', 'url' => 'https://skillacademy.com', 'vis' => 'KATEGORI', 'cat' => 1, 'icon' => 'Zap'],
            
            // TIK SPECIFIC
            ['title' => 'GitHub Repository', 'url' => 'https://github.com', 'vis' => 'KATEGORI', 'cat' => 3, 'icon' => 'Github'],
            ['title' => 'Stack Overflow', 'url' => 'https://stackoverflow.com', 'vis' => 'KATEGORI', 'cat' => 3, 'icon' => 'HelpCircle'],

            // PEMASARAN SPECIFIC
            ['title' => 'Canva Design Tools', 'url' => 'https://www.canva.com', 'vis' => 'KATEGORI', 'cat' => 2, 'icon' => 'Palette'],
            
            // FASHION SPECIFIC
            ['title' => 'Pinterest Trends', 'url' => 'https://www.pinterest.com', 'vis' => 'KATEGORI', 'cat' => 6, 'icon' => 'Image'],
        ];

        foreach ($linksData as $l) {
            Link::create([
                'title' => $l['title'],
                'url' => $l['url'],
                'slug' => Str::slug($l['title']) . '-' . rand(1000, 9999),
                'icon' => $l['icon'],
                'visibility' => $l['vis'],
                'category_id' => $categories[$l['cat']]->id,
                'userId' => $admin->id,
                'is_active' => true,
                'clicks' => rand(5, 500)
            ]);
        }

        // 5. Setup Mock Life (Notifications & Feedback using latest schema)
        Notification::create([
            'message' => 'Sistem SIGAP Lite telah berhasil dikonfigurasi ulang.',
            'isRead' => false
        ]);

        // Feedback with response
        Feedback::create([
            'user_id' => $pegawai->id,
            'name' => $pegawai->fullName,
            'email' => $pegawai->email,
            'role' => $pegawai->role,
            'comment' => 'Mohon tambahkan panduan penggunaan menu baru di dashboard.',
            'status' => 'REPLIED',
            'reply_message' => 'Panduan telah kami tambahkan di folder bersama Bagian Tata Usaha. Silakan dicek.',
            'replied_at' => now(),
            'replied_by_id' => $admin->id
        ]);

        // Feedback pending
        Feedback::create([
            'name' => 'Pengunjung Umum',
            'email' => 'guest@gmail.com',
            'role' => null, // Guest
            'comment' => 'Tampilan portal sangat memudahkan mencari tautan layanan. Terima kasih!',
            'status' => 'PENDING',
            'is_anonymous' => true
        ]);

        // 6. Mock Audit Logs (Consistent with latest CamelCase schema)
        AuditLog::create([
            'action' => 'DATABASE_SEED',
            'resource' => 'System',
            'details' => 'Database seeding completed successfully with real-world public links.',
            'userId' => $admin->id,
            'category_id' => null,
            'ipAddress' => '127.0.0.1',
            'userAgent' => 'SIGAP Seeder Engine'
        ]);
    }
}
