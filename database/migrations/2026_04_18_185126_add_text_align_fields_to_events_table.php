<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $row) {
            $row->string('titleAlign')->default('center')->after('titleFont');
            $row->string('descAlign')->default('center')->after('descFont');
            $row->string('footerAlign')->default('center')->after('footerFont');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $row) {
            $row->dropColumn(['titleAlign', 'descAlign', 'footerAlign']);
        });
    }
};
