<?php

use App\Http\Controllers\ApiGatewayController;

// Public Shortlink
Route::get('/s/{slug}', [ApiGatewayController::class, 'redirectLink']);

// Downloads (Move out of JWT for window.open support)
Route::get('/admin/links/template', [ApiGatewayController::class, 'linksTemplate']);
Route::get('/admin/links/export', [ApiGatewayController::class, 'linksExport']);
Route::get('/admin/system/backup', [ApiGatewayController::class, 'systemBackup']);

// Biarkan semua rute lain ditangani oleh Vue Router (Single Page Application)
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
