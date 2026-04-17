<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('links')) {
            Schema::create('links', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('desc')->nullable();
                $table->text('url');
                $table->string('slug')->unique();
                $table->string('icon')->nullable();
                $table->integer('clicks')->default(0);
                $table->boolean('is_active')->default(true);
                $table->enum('visibility', ['INTERNAL', 'KATEGORI'])->default('INTERNAL');
                $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
                $table->foreignId('userId')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps(3);

                $table->index(['slug', 'is_active']);
                $table->index(['visibility']);
            });
        }

        if (!Schema::hasTable('click_logs')) {
            Schema::create('click_logs', function (Blueprint $table) {
                $table->id();
                $table->string('userRole');
                $table->string('username')->nullable();
                $table->string('ipAddress')->nullable();
                $table->foreignId('linkId')->constrained('links')->cascadeOnDelete();
                $table->timestamp('clickedAt', 3)->useCurrent();
                $table->timestamps(3); // Just in case, standard timestamps
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('click_logs');
        Schema::dropIfExists('links');
    }
};
