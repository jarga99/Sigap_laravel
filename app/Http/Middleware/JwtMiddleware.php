<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\JwtService;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class JwtMiddleware
{
    protected $jwtService;

    public function __construct(JwtService $jwtService)
    {
        $this->jwtService = $jwtService;
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthenticated', 'message' => 'Token tidak ditemukan'], 401);
        }

        $payload = $this->jwtService->decodeToken($token);

        if (!$payload || !isset($payload['sub'])) {
            return response()->json(['error' => 'Unauthenticated', 'message' => 'Token tidak valid atau kadaluarsa'], 401);
        }

        $user = User::find($payload['sub']);

        // Verifikasi Session ID untuk Single Session Lock (Mencegah login ganda jika diaktifkan)
        if (!$user || ($user->sessionId !== ($payload['sid'] ?? null))) {
            return response()->json(['error' => 'Unauthenticated', 'message' => 'Sesi tidak valid atau telah berakhir'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['error' => 'Unauthorized', 'message' => 'Akun dinonaktifkan'], 403);
        }

        // Set authenticated user ke Laravel Auth agar bisa diakses di Controller manapun via Auth::user()
        Auth::login($user);

        return $next($request);
    }
}
