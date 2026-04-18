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
        Schema::table('event_items', function (Blueprint $table) {
            $table->string('dividerStyle')->default('solid')->after('type');
            $table->string('dividerCap')->default('sharp')->after('dividerStyle');
            $table->integer('dividerWidth')->default(70)->after('dividerCap');
            $table->string('dividerText')->nullable()->after('dividerWidth');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_items', function (Blueprint $table) {
            $table->dropColumn(['dividerStyle', 'dividerCap', 'dividerWidth', 'dividerText']);
        });
    }
};
