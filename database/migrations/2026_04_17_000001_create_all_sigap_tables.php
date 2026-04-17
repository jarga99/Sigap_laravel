<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Users Table
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('username')->unique();
                $table->string('password');
                $table->string('email')->nullable()->unique();
                $table->string('fullName')->default('-');
                $table->enum('role', ['ADMIN', 'ADMIN_EVENT', 'EMPLOYEE'])->default('EMPLOYEE');
                $table->string('image_url')->nullable();
                $table->integer('departmentId')->nullable();
                $table->string('sessionId')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps(3);
            });
        }

        // 2. Categories Table
        if (!Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('name_en')->nullable();
                $table->string('icon')->nullable();
                $table->timestamps(3);
            });
        }

        // 3. Settings Table
        if (!Schema::hasTable('settings')) {
            Schema::create('settings', function (Blueprint $table) {
                $table->id();
                $table->string('instansi_name');
                $table->string('instansi_name_en')->nullable();
                $table->text('instansi_desc')->nullable();
                $table->text('instansi_desc_en')->nullable();
                $table->string('logo_url')->nullable();
                $table->string('bg_url')->nullable();
                $table->string('custom_domain')->nullable();
                $table->string('app_name')->default('SIGAP');
                $table->text('contact_address')->nullable();
                $table->string('contact_email')->nullable();
                $table->string('contact_phone')->nullable();
                $table->string('footer_copyright')->default('© 2026 Admin Portal');
                $table->text('footer_text')->nullable();
                $table->text('footer_text_en')->nullable();
                $table->string('footer_mode')->default('COMPLEX');
                $table->timestamps(3);
            });
        }

        // 4. Events Table
        if (!Schema::hasTable('events')) {
            Schema::create('events', function (Blueprint $table) {
                $table->id();
                $table->string('slug')->unique();
                $table->string('title');
                $table->text('description')->nullable();
                $table->enum('status', ['AKTIF', 'TIDAK_AKTIF', 'ARSIP'])->default('TIDAK_AKTIF');
                $table->string('bgType')->default('color');
                $table->string('bgValue')->default('#0f172a');
                $table->string('profilePhoto')->nullable();
                $table->string('profileShape')->default('circle');
                $table->string('profileBorderStyle')->default('none');
                $table->integer('profileBorderWidth')->default(2);
                $table->string('profileBgColor')->default('#ffffff');
                $table->boolean('showProfile')->default(true);
                $table->boolean('showCover')->default(true);
                $table->boolean('showTitle')->default(true);
                $table->boolean('showDescription')->default(true);
                $table->boolean('showFooter')->default(true);
                $table->boolean('showSystemBranding')->default(true);
                $table->string('customBranding')->default('SIGAP PROJECT');
                $table->string('customPoweredBy')->default('Advanced Event Engine');
                $table->text('footerText')->nullable();
                $table->integer('profileWidth')->default(80);
                $table->integer('profileHeight')->default(80);
                $table->integer('coverHeight')->default(128);
                $table->string('titleColor')->default('#ffffff');
                $table->string('titleFont')->default('Inter');
                $table->string('descColor')->default('#ffffff');
                $table->string('descFont')->default('Inter');
                $table->string('footerColor')->default('#ffffff');
                $table->string('footerFont')->default('Inter');
                $table->string('buttonShape')->default('rounded');
                $table->integer('buttonRadius')->default(12);
                $table->foreignId('userId');
                $table->timestamps(3);
            });
        }

        // 5. Event Items Table
        if (!Schema::hasTable('event_items')) {
            Schema::create('event_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('eventId');
                $table->string('label');
                $table->text('url');
                $table->string('type');
                $table->string('color')->nullable();
                $table->string('textColor')->nullable();
                $table->string('iconColor')->nullable();
                $table->string('icon')->nullable();
                $table->integer('order')->default(0);
                $table->string('layout')->nullable();
                $table->boolean('showLabel')->default(true);
                $table->boolean('isActive')->default(true);
                $table->timestamps(3);
            });
        }

        // 6. Audit Logs Table
        if (!Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();
                $table->string('action');
                $table->string('resource');
                $table->string('resourceId')->nullable();
                $table->text('details')->nullable();
                $table->integer('userId')->nullable();
                $table->integer('departmentId')->nullable();
                $table->string('ipAddress')->nullable();
                $table->text('userAgent')->nullable();
                $table->timestamps(3);
            });
        }

        // 7. Feedback Table
        if (!Schema::hasTable('feedbacks')) {
            Schema::create('feedbacks', function (Blueprint $table) {
                $table->id();
                $table->string('name')->nullable();
                $table->string('email')->nullable();
                $table->string('role')->nullable();
                $table->boolean('is_anonymous')->default(false);
                $table->string('category')->nullable();
                $table->text('comment');
                $table->integer('rating')->default(0);
                $table->string('attachment_url')->nullable();
                $table->string('attachment_type')->nullable();
                $table->string('status')->default('PENDING');
                $table->boolean('is_read')->default(false);
                $table->timestamps(3);
            });
        }

        // 8. FooterLinks Table
        if (!Schema::hasTable('footer_links')) {
            Schema::create('footer_links', function (Blueprint $table) {
                $table->id();
                $table->string('label');
                $table->text('url');
                $table->string('type')->default('TEXT');
                $table->string('logoUrl')->nullable();
                $table->integer('order')->default(0);
                $table->boolean('isActive')->default(true);
                $table->timestamps(3);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('footer_links');
        Schema::dropIfExists('feedbacks');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('event_items');
        Schema::dropIfExists('events');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('users');
    }
};
