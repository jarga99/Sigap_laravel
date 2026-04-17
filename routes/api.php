<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiGatewayController;

// Public Routes
Route::get('/health', function() { return ['status' => 'ok', 'version' => 'Laravel-1.0']; });
Route::post('/auth/login', [ApiGatewayController::class, 'login']);
Route::get('/categories', [ApiGatewayController::class, 'categories']);
Route::get('/public/events/{slug}', [ApiGatewayController::class, 'publicEventShow']);
Route::post('/feedback', [ApiGatewayController::class, 'submitFeedback']);

// Protected Admin Routes
Route::middleware('jwt.auth')->group(function () {
    // Profil & Auth
    Route::get('/auth/me', [ApiGatewayController::class, 'me']);
    Route::put('/auth/profile', [ApiGatewayController::class, 'updateProfile']);
    Route::post('/auth/logout', [ApiGatewayController::class, 'logout']);

    // User Management (Admin Only)
    Route::get('/admin/users', [ApiGatewayController::class, 'usersIndex']);
    Route::post('/admin/users', [ApiGatewayController::class, 'usersStore']);
    Route::put('/admin/users/{id}', [ApiGatewayController::class, 'usersUpdate']);
    Route::delete('/admin/users/{id}', [ApiGatewayController::class, 'usersDestroy']);

    // Events Management
    Route::get('/admin/events', [ApiGatewayController::class, 'eventsIndex']);
    Route::get('/admin/events/{id}', [ApiGatewayController::class, 'eventsShow']);
    Route::post('/admin/events', [ApiGatewayController::class, 'eventsStore']);
    Route::put('/admin/events/{id}', [ApiGatewayController::class, 'eventsUpdate']);
    Route::delete('/admin/events/{id}', [ApiGatewayController::class, 'eventsDestroy']);

    // System Settings & Dashboard
    Route::get('/admin/settings', [ApiGatewayController::class, 'getSettings']);
    Route::put('/admin/settings', [ApiGatewayController::class, 'updateSettings']);
    Route::get('/admin/dashboard', [ApiGatewayController::class, 'dashboardStats']);
    Route::get('/admin/audit-logs', [ApiGatewayController::class, 'auditLogs']);
});
