<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Performance Indexes for Shared Hosting Optimization.
     * Covers: notifications scoping, events RBAC, links portal, feedbacks, audit logs.
     */
    public function up(): void
    {
        // Notifications — queried every 5 min by ALL users (userId + isRead filter)
        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['userId', 'isRead']);
        });

        // Events — RBAC ownership filter + status tab filter
        Schema::table('events', function (Blueprint $table) {
            $table->index('userId');
            $table->index('status');
        });

        // Links — portal queries filter by is_active, visibility, category_id
        Schema::table('links', function (Blueprint $table) {
            $table->index('category_id');
            $table->index(['is_active', 'visibility']);
        });

        // Feedbacks — filtered by user_id for non-admin personalized view
        Schema::table('feedbacks', function (Blueprint $table) {
            $table->index('user_id');
        });

        // Audit Logs — date-range export queries
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index('created_at');
        });

        // Users — RBAC lookups by category_id and role
        Schema::table('users', function (Blueprint $table) {
            $table->index('category_id');
            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['userId', 'isRead']);
        });
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex(['userId']);
            $table->dropIndex(['status']);
        });
        Schema::table('links', function (Blueprint $table) {
            $table->dropIndex(['category_id']);
            $table->dropIndex(['is_active', 'visibility']);
        });
        Schema::table('feedbacks', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['category_id']);
            $table->dropIndex(['role']);
        });
    }
};
