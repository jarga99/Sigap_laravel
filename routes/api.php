<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiGatewayController;

// Public Routes
Route::get('/health', function() { return ['status' => 'ok', 'version' => 'Laravel-1.0']; });
Route::post('/auth/login', [ApiGatewayController::class, 'login']);
Route::post('/auth/google', [ApiGatewayController::class, 'loginWithGoogle']);
Route::get('/categories', [ApiGatewayController::class, 'categories']);
Route::get('/portal/links', [ApiGatewayController::class, 'portalLinks']);
Route::get('/portal/preview', [ApiGatewayController::class, 'portalPreview']);
Route::get('/internal/events/{slug}', [ApiGatewayController::class, 'internalEventShow']);
Route::post('/feedback', [ApiGatewayController::class, 'submitFeedback']);

// Protected Admin Routes
Route::middleware('jwt.auth')->group(function () {
    // Profil & Auth
    Route::get('/auth/me', [ApiGatewayController::class, 'me']);
    Route::get('/users/profile', [ApiGatewayController::class, 'me']); // Legacy compatibility untuk Vue
    Route::put('/auth/profile', [ApiGatewayController::class, 'updateProfile']);
    Route::post('/auth/profile-upload', [ApiGatewayController::class, 'updateProfile']);
    Route::post('/users/profile', [ApiGatewayController::class, 'updateProfile']); // Legacy multipart support
    Route::post('/auth/logout', [ApiGatewayController::class, 'logout']);

    // User Management (Admin Only)
    Route::get('/admin/users', [ApiGatewayController::class, 'usersIndex']);
    Route::post('/admin/users', [ApiGatewayController::class, 'usersStore']);
    Route::put('/admin/users/{id}', [ApiGatewayController::class, 'usersUpdate']);
    Route::delete('/admin/users/{id}', [ApiGatewayController::class, 'usersDestroy']);
    Route::get('/admin/users/template', [ApiGatewayController::class, 'usersTemplate']);

    // Categories Management (Admin Only)
    Route::get('/admin/categories', [ApiGatewayController::class, 'categories']);
    Route::post('/admin/categories', [ApiGatewayController::class, 'categoriesStore']);
    Route::put('/admin/categories/{id}', [ApiGatewayController::class, 'categoriesUpdate']);
    Route::delete('/admin/categories/{id}', [ApiGatewayController::class, 'categoriesDestroy']);

    // Events Management
    Route::get('/admin/events', [ApiGatewayController::class, 'eventsIndex']);
    Route::get('/admin/events/{id}', [ApiGatewayController::class, 'eventsShow']);
    Route::post('/admin/events', [ApiGatewayController::class, 'eventsStore']);
    Route::put('/admin/events/{id}', [ApiGatewayController::class, 'eventsUpdate']);
    Route::delete('/admin/events/{id}', [ApiGatewayController::class, 'eventsDestroy']);
    Route::get('/admin/events/export', [ApiGatewayController::class, 'eventsExport']);

    // System Settings & Dashboard
    Route::get('/admin/settings', [ApiGatewayController::class, 'getSettings']);
    Route::post('/admin/settings', [ApiGatewayController::class, 'updateSettings']);
    Route::post('/admin/upload', [ApiGatewayController::class, 'uploadMedia']);
    Route::get('/admin/dashboard', [ApiGatewayController::class, 'dashboardStats']);
    Route::post('/admin/audit-logs/export', [ApiGatewayController::class, 'exportAuditLogs']);

    // Feedback Management
    Route::get('/admin/feedback', [ApiGatewayController::class, 'feedbackIndex']);
    Route::post('/admin/feedback/{id}/reply', [ApiGatewayController::class, 'feedbackReply']);
    Route::put('/admin/feedback/{id}/read', [ApiGatewayController::class, 'feedbackToggleRead']);
    Route::delete('/admin/feedback/{id}', [ApiGatewayController::class, 'usersDestroy']); // Generic destroy

    // Notifications
    Route::get('/notifications', [ApiGatewayController::class, 'notifications']);
    Route::post('/notifications/read', [ApiGatewayController::class, 'notificationsRead']);
    Route::put('/notifications/{id}/read', [ApiGatewayController::class, 'notificationMarkRead']);

    // Footer Links Management
    Route::get('/admin/footer-links', [ApiGatewayController::class, 'footerLinksIndex']);
    Route::post('/admin/footer-links', [ApiGatewayController::class, 'footerLinksStore']);
    Route::put('/admin/footer-links/{id}', [ApiGatewayController::class, 'footerLinksUpdate']);
    Route::delete('/admin/footer-links/{id}', [ApiGatewayController::class, 'footerLinksDestroy']);

    // System Utilities
    Route::get('/admin/system/backup', [ApiGatewayController::class, 'systemBackup']);
    Route::post('/admin/system/reset', [ApiGatewayController::class, 'systemReset']);
    Route::get('/admin/system/logs-raw', [ApiGatewayController::class, 'systemLogsDownload']);

    // AI Features
    Route::post('/settings/ai/generate-tagline', [ApiGatewayController::class, 'generateAiTagline']);

    // Links Management
    Route::get('/admin/links', [ApiGatewayController::class, 'linksIndex']);
    Route::post('/admin/links', [ApiGatewayController::class, 'linksStore']);
    Route::post('/admin/links/bulk', [ApiGatewayController::class, 'linksBulkImport']);
    Route::get('/admin/links/template', [ApiGatewayController::class, 'linksTemplate']);
    Route::put('/admin/links/{id}', [ApiGatewayController::class, 'linksUpdate']);
    Route::delete('/admin/links/{id}', [ApiGatewayController::class, 'linksDestroy']);
});
