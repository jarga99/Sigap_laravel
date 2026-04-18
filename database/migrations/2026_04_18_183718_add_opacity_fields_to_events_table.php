<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('events', function (Blueprint $row) {
            $row->integer('bgOpacity')->default(100)->after('bgValue');
            $row->string('bgOverlayColor')->default('#000000')->after('bgOpacity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $row) {
            $row->dropColumn(['bgOpacity', 'bgOverlayColor']);
        });
    }
};
