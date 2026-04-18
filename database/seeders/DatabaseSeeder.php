<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Setting;
use App\Models\Link;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Feedback;
use App\Models\Event;
use App\Models\EventItem; // Ensure this exists or use DB
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with MASSIVE historical data (2025 - Present).
     */
    public function run(): void
    {
        // 0. Clean Slate
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('click_logs')->truncate();
        AuditLog::truncate();
        Notification::truncate();
        Feedback::truncate();
        EventItem::truncate(); // Assuming standard Eloquent or use DB::table
        Event::truncate();
        Link::truncate();
        User::truncate();
        Category::truncate();
        Setting::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // 1. Setup Categories
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
            ['name' => 'Kejuruan Bangunan', 'icon' => 'Hammer', 'color' => '#64748b']
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

        // 2. Setup Users (Varied)
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

        $users = [$admin, $adminEvent];
        $names = ['Budi Santoso', 'Siti Aminah', 'Rudi Hermawan', 'Dewi Lestari', 'Ahmad Fauzi', 'Maya Saputri'];
        
        foreach ($names as $idx => $name) {
            $uname = strtolower(explode(' ', $name)[0]) . rand(10, 99);
            $users[] = User::create([
                'username' => $uname,
                'password' => Hash::make('password123'),
                'fullName' => $name,
                'role' => 'EMPLOYEE',
                'email' => "{$uname}@sigap.go.id",
                'category_id' => $categories[$idx % count($categories)]->id,
                'is_active' => true
            ]);
        }

        // 3. Setup Settings
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

        // 4. Setup Massive Links
        $links = [];
        $linkTemplates = [
            ['title' => 'Google Search', 'url' => 'https://google.com', 'icon' => 'Search'],
            ['title' => 'Website Kemdikbud', 'url' => 'https://kemdikbud.go.id', 'icon' => 'Globe'],
            ['title' => 'KBBI Daring', 'url' => 'https://kbbi.kemdikbud.go.id', 'icon' => 'Book'],
            ['title' => 'DeepL Translator', 'url' => 'https://deepl.com', 'icon' => 'Languages'],
            ['title' => 'GitHub', 'url' => 'https://github.com', 'icon' => 'Github'],
            ['title' => 'Canva', 'url' => 'https://canva.com', 'icon' => 'Palette'],
            ['title' => 'YouTube', 'url' => 'https://youtube.com', 'icon' => 'Youtube'],
            ['title' => 'LinkedIn', 'url' => 'https://linkedin.com', 'icon' => 'Linkedin'],
            ['title' => 'Stack Overflow', 'url' => 'https://stackoverflow.com', 'icon' => 'HelpCircle'],
            ['title' => 'Pinterest', 'url' => 'https://pinterest.com', 'icon' => 'Image'],
            ['title' => 'Satu Data Indonesia', 'url' => 'https://data.go.id', 'icon' => 'Database'],
            ['title' => 'JDIH Nasional', 'url' => 'https://jdihn.go.id', 'icon' => 'FileText'],
            ['title' => 'LAPOR!', 'url' => 'https://lapor.go.id', 'icon' => 'MessageSquare'],
            ['title' => 'Coursera', 'url' => 'https://coursera.org', 'icon' => 'Award'],
            ['title' => 'Skill Academy', 'url' => 'https://skillacademy.com', 'icon' => 'Zap']
        ];

        foreach ($linkTemplates as $idx => $lt) {
            $links[] = Link::create([
                'title' => $lt['title'],
                'url' => $lt['url'],
                'slug' => Str::slug($lt['title']) . '-' . rand(1000, 9999),
                'icon' => $lt['icon'],
                'visibility' => $idx % 3 === 0 ? 'KATEGORI' : 'INTERNAL',
                'category_id' => $categories[$idx % count($categories)]->id,
                'userId' => $users[rand(0, count($users)-1)]->id,
                'is_active' => true,
                'clicks' => rand(100, 5000)
            ]);
        }

        // 5. Setup Massive Click Logs (Historical 2025 - Present)
        $logs = [];
        $currentYear = (int)date('Y');
        $currentMonth = (int)date('m');

        for ($y = 2025; $y <= $currentYear; $y++) {
            for ($m = 1; $m <= 12; $m++) {
                if ($y === $currentYear && $m > $currentMonth) break;

                // Growing trend: base 100 + (months from Jan 2025 * 20)
                $monthsPassed = ($y - 2025) * 12 + ($m - 1);
                $monthClicks = rand(100, 200) + ($monthsPassed * 10);
                
                for ($i = 0; $i < $monthClicks; $i++) {
                    $link = $links[rand(0, count($links)-1)];
                    $isGuest = rand(0, 100) < 35; // 35% guest
                    
                    $logs[] = [
                        'userRole' => $isGuest ? 'GUEST' : 'EMPLOYEE',
                        'username' => $isGuest ? null : $users[rand(2, count($users)-1)]->username,
                        'ipAddress' => '192.168.1.' . rand(1, 254),
                        'linkId' => $link->id,
                        'clickedAt' => Carbon::create($y, $m, rand(1, 28))->addHours(rand(0, 23))->addMinutes(rand(0, 59))->toDateTimeString(),
                        'created_at' => now(),
                        'updated_at' => now()
                    ];
                    
                    if (count($logs) >= 1000) {
                        DB::table('click_logs')->insert($logs);
                        $logs = [];
                    }
                }
            }
        }
        if (count($logs) > 0) DB::table('click_logs')->insert($logs);
        if (count($logs) > 0) DB::table('click_logs')->insert($logs);

        // 6. Setup Varied Events (Sigap Event)
        $eventThemes = [
            ['title' => 'Open House BLK 2026', 'slug' => 'open-house-2026', 'color' => '#1e293b'],
            ['title' => 'Pelatihan TIK Gelombang I', 'slug' => 'tik-gel-1', 'color' => '#4f46e5'],
            ['title' => 'Seminar Karir Digital', 'slug' => 'career-seminar', 'color' => '#059669'],
            ['title' => 'Workshop Fashion & Desain', 'slug' => 'fashion-workshop', 'color' => '#db2777'],
            ['title' => 'Pendaftaran Uji Kompetensi', 'slug' => 'uji-kompetensi', 'color' => '#ea580c']
        ];

        foreach ($eventThemes as $idx => $theme) {
            $event = Event::create([
                'title' => $theme['title'],
                'slug' => $theme['slug'] . '-' . rand(100, 999),
                'description' => "Selamat datang di halaman resmi {$theme['title']}. Daftarkan diri Anda dan ikuti kegiatannya.",
                'status' => $idx === 0 ? 'AKTIF' : 'TIDAK_AKTIF',
                'bgType' => 'color',
                'bgValue' => $theme['color'],
                'userId' => $adminEvent->id,
                'showProfile' => true,
                'showCover' => true,
                'customBranding' => 'UPT BLK PASURUAN',
                'customPoweredBy' => 'Sigap Event Master'
            ]);

            // Add Items to Event
            // 3 Buttons
            for ($j = 1; $j <= 3; $j++) {
                EventItem::create([
                    'eventId' => $event->id,
                    'label' => "Tautan Ke-{$j}",
                    'url' => 'https://google.com',
                    'type' => 'BUTTON',
                    'color' => '#3b82f6',
                    'textColor' => '#ffffff',
                    'icon' => 'Link',
                    'layout' => 'icon-left',
                    'order' => $j
                ]);
            }

            // Divider
            EventItem::create([
                'eventId' => $event->id,
                'label' => 'Separator',
                'url' => '#',
                'type' => 'DIVIDER',
                'color' => '#ffffff',
                'order' => 4,
                'dividerStyle' => 'solid',
                'dividerWidth' => 80
            ]);

            // SOCIAL Buttons (Limit 6 as requested)
            $socials = ['Instagram', 'Youtube', 'Globe', 'Facebook', 'Twitter', 'Linkedin'];
            foreach ($socials as $sj => $soc) {
                EventItem::create([
                    'eventId' => $event->id,
                    'label' => $soc,
                    'url' => 'https://' . strtolower($soc) . '.com',
                    'type' => 'SOCIAL',
                    'icon' => $soc,
                    'layout' => 'icon-only',
                    'color' => '#1e293b',
                    'iconColor' => '#ffffff',
                    'order' => 10 + $sj
                ]);
            }
        }

        // 7. Audit Log
        AuditLog::create([
            'action' => 'DATABASE_SEED_MASSIVE',
            'resource' => 'System',
            'details' => 'Massive historical seeding (2025-present) completed.',
            'userId' => $admin->id,
            'ipAddress' => '127.0.0.1',
            'userAgent' => 'SIGAP Seeder Engine v2'
        ]);
        
        Notification::create([
            'message' => 'Database berhasil di-reset dengan data historis 2025.',
            'type' => 'INFO'
        ]);
    }
}
