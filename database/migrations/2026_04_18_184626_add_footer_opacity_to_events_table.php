<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $row) {
            $row->integer('footerBgOpacity')->default(100)->after('footerBgColor');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $row) {
            $row->dropColumn('footerBgOpacity');
        });
    }
};
