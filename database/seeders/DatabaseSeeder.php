<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with UPT BLK Pasuruan data.
     */
    public function run(): void
    {
        // 1. Setup Super Admin (Sesuai Backup)
        User::create([
            'username' => 'sigap_admin',
            'password' => Hash::make('sigap2025'),
            'fullName' => 'Administrator UPT BLK',
            'role' => 'ADMIN',
            'email' => 'admin@blkpasuruan.go.id',
            'is_active' => true
        ]);

        // 2. Setup Categories (14 Kategori Spesifik dari Backup)
        $categoriesData = [
            'Tata Usaha', 'Pelatihan dan Sertifikasi', 'Pengembangan dan Pemasaran',
            'Kejuruan TIK', 'Kejuruan Bisman', 'Kejuruan Listrik', 
            'Kejuruan Otomotif', 'Kejuruan Elektro', 'Kejuruan Fashion Teknologi',
            'Kejuruan Refrigerasi', 'Kejuruan Tekmek', 'Kejuruan PHP',
            'Kejuruan Batik', 'Kejuruan Tata Rias'
        ];

        $categories = [];
        foreach ($categoriesData as $name) {
            $categories[] = Category::create(['name' => $name]);
        }

        // 3. Setup Settings (Profil Resmi UPT BLK Pasuruan)
        Setting::create([
            'instansi_name' => 'UPT BLK Pasuruan',
            'instansi_desc' => 'Dinas Tenaga Kerja dan Transmigrasi Provinsi Jawa Timur - Unit Pelaksana Teknis Balai Latihan Kerja Pasuruan.',
            'app_name' => 'SIGAP BLK',
            'footer_text' => 'Sistem Gerbang Akses Pintar - BLK Pasuruan',
            'footer_copyright' => '© 2026 UPT BLK Pasuruan',
            'contact_email' => 'blk.pasuruan@jatimprov.go.id',
            'contact_phone' => '0343-421234',
            'contact_address' => 'Pasuruan, Jawa Timur',
            'footer_mode' => 'COMPLEX'
        ]);

        // 4. Setup Event Admins Sampel
        for ($i = 1; $i <= 2; $i++) {
            User::create([
                'username' => "admin_event$i",
                'fullName' => "Sub Bagian Tata Usaha $i",
                'role' => 'ADMIN_EVENT',
                'password' => Hash::make('sigap2025'),
                'email' => "admin$i@blkpasuruan.go.id"
            ]);
        }

        // 5. Setup Pegawai Sampel
        $employeeNames = ['Wira', 'Dika', 'Putra', 'Sari', 'Ahmad'];
        foreach ($employeeNames as $i => $name) {
            User::create([
                'username' => "pegawai" . ($i + 1),
                'fullName' => $name,
                'role' => 'EMPLOYEE',
                'password' => Hash::make('sigap2025'),
                'email' => "staff" . ($i + 1) . "@blkpasuruan.go.id",
                'departmentId' => $categories[$i % count($categories)]->id
            ]);
        }
    }
}
