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
        Schema::table('events', function (Blueprint $table) {
            $table->integer('titleFontSize')->default(24)->after('titleAlign');
            $table->string('titleFontWeight')->default('black')->after('titleFontSize');
            $table->string('titleFontStyle')->default('normal')->after('titleFontWeight');
            $table->string('titleTextDecoration')->default('none')->after('titleFontStyle');
            $table->string('titleTextTransform')->default('uppercase')->after('titleTextDecoration');

            $table->integer('descFontSize')->default(12)->after('descAlign');
            $table->string('descFontWeight')->default('bold')->after('descFontSize');
            $table->string('descFontStyle')->default('normal')->after('descFontWeight');
            $table->string('descTextDecoration')->default('none')->after('descFontStyle');
            $table->string('descTextTransform')->default('none')->after('descTextDecoration');

            $table->integer('footerFontSize')->default(9)->after('footerAlign');
            $table->string('footerFontWeight')->default('black')->after('footerFontSize');
            $table->string('footerFontStyle')->default('normal')->after('footerFontWeight');
            $table->string('footerTextDecoration')->default('none')->after('footerFontStyle');
            $table->string('footerTextTransform')->default('uppercase')->after('footerTextDecoration');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'titleFontSize', 'titleFontWeight', 'titleFontStyle', 'titleTextDecoration', 'titleTextTransform',
                'descFontSize', 'descFontWeight', 'descFontStyle', 'descTextDecoration', 'descTextTransform',
                'footerFontSize', 'footerFontWeight', 'footerFontStyle', 'footerTextDecoration', 'footerTextTransform'
            ]);
        });
    }
};
