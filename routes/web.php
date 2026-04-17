<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

// SIGAP Laravel Backend Status
Route::get('/', function () {
    return ['status' => 'SIGAP Laravel Backend is running'];
});

// Jalur cepat migrasi lewat web (Hapus setelah selesai)
Route::get('/migrasi-cepat', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);
        return Artisan::output();
    } catch (\Exception $e) {
        return $e->getMessage();
    }
});

// Single Page Application (Vue) Fallback Hook
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
