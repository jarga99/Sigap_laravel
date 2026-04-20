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
        // Notifications — userId + isRead filter
        Schema::table('notifications', function (Blueprint $table) {
            $indexes = Schema::getIndexes('notifications');
            if (!collect($indexes)->contains('columns', ['userId', 'isRead'])) {
                $table->index(['userId', 'isRead']);
            }
        });

        // Events — RBAC ownership filter + status tab filter
        Schema::table('events', function (Blueprint $table) {
            $indexes = Schema::getIndexes('events');
            if (!collect($indexes)->contains('columns', ['userId'])) {
                $table->index('userId');
            }
            if (!collect($indexes)->contains('columns', ['status'])) {
                $table->index('status');
            }
        });

        // Links — portal queries filter by is_active, visibility, category_id
        Schema::table('links', function (Blueprint $table) {
            $indexes = Schema::getIndexes('links');
            if (!collect($indexes)->contains('columns', ['category_id'])) {
                $table->index('category_id');
            }
            if (!collect($indexes)->contains('columns', ['is_active', 'visibility'])) {
                $table->index(['is_active', 'visibility']);
            }
        });

        // Feedbacks — index removed as user_id column does not exist in this version

        // Audit Logs — date-range export queries
        Schema::table('audit_logs', function (Blueprint $table) {
            $indexes = Schema::getIndexes('audit_logs');
            if (!collect($indexes)->contains('columns', ['created_at'])) {
                $table->index('created_at');
            }
        });

        // Users — RBAC lookups by category_id and role
        Schema::table('users', function (Blueprint $table) {
            $indexes = Schema::getIndexes('users');
            if (!collect($indexes)->contains('columns', ['category_id'])) {
                $table->index('category_id');
            }
            if (!collect($indexes)->contains('columns', ['role'])) {
                $table->index('role');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $indexes = Schema::getIndexes('notifications');
            if (collect($indexes)->contains('columns', ['userId', 'isRead'])) {
                $table->dropIndex(['userId', 'isRead']);
            }
        });
        Schema::table('events', function (Blueprint $table) {
            $indexes = Schema::getIndexes('events');
            if (collect($indexes)->contains('columns', ['userId'])) $table->dropIndex(['userId']);
            if (collect($indexes)->contains('columns', ['status'])) $table->dropIndex(['status']);
        });
        Schema::table('links', function (Blueprint $table) {
            $indexes = Schema::getIndexes('links');
            if (collect($indexes)->contains('columns', ['category_id'])) $table->dropIndex(['category_id']);
            if (collect($indexes)->contains('columns', ['is_active', 'visibility'])) $table->dropIndex(['is_active', 'visibility']);
        });
        Schema::table('audit_logs', function (Blueprint $table) {
            $indexes = Schema::getIndexes('audit_logs');
            if (collect($indexes)->contains('columns', ['created_at'])) $table->dropIndex(['created_at']);
        });
        Schema::table('users', function (Blueprint $table) {
            $indexes = Schema::getIndexes('users');
            if (collect($indexes)->contains('columns', ['category_id'])) $table->dropIndex(['category_id']);
            if (collect($indexes)->contains('columns', ['role'])) $table->dropIndex(['role']);
        });
    }
};
