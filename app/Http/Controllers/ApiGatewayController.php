<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Event;
use App\Models\EventItem;
use App\Models\Category;
use App\Models\Feedback;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\JwtService;

class ApiGatewayController extends Controller
{
    protected $jwtService;

    public function __construct(JwtService $jwtService)
    {
        $this->jwtService = $jwtService;
    }

    /**
     * Helper murni untuk mengambil user dari token tanpa Guard Laravel
     */
    private function currentUser()
    {
        $token = request()->bearerToken();
        if (!$token) return null;

        $payload = $this->jwtService->decodeToken($token);
        if (!$payload || !isset($payload['sub'])) return null;

        $user = User::find($payload['sub']);
        
        // Verifikasi Session ID untuk Single Session Lock
        if (!$user || ($user->sessionId !== ($payload['sid'] ?? null))) {
            return null;
        }

        return $user;
    }

    // --- 🔐 AUTHENTICATION ---

    public function login(Request $request)
    {
        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Unauthorized', 'message' => 'Username atau Password salah'], 401);
        }

        // Single Session Logic: Generate new session ID
        $newSessionId = Str::random(40);
        $user->update(['sessionId' => $newSessionId]);

        // Generate token murni dengan custom claims
        $token = $this->jwtService->generateToken([
            'sub' => $user->id,
            'role' => $user->role,
            'sid' => $newSessionId
        ], 86400); // 24 Jam

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'fullName' => $user->fullName,
                'role' => $user->role,
                'departmentId' => $user->departmentId
            ]
        ]);
    }

    public function me()
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthenticated'], 401);
        return response()->json($user);
    }

    public function logout()
    {
        $user = $this->currentUser();
        if ($user) {
            $user->update(['sessionId' => null]);
        }
        return response()->json(['message' => 'Successfully logged out']);
    }

    public function updateProfile(Request $request)
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);
        $data = $request->only(['fullName', 'email', 'image_url']);
        
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);
        return response()->json(['status' => 'success', 'user' => $user]);
    }

    // --- 👥 USER MANAGEMENT (ADMIN ONLY) ---

    public function usersIndex()
    {
        return response()->json(User::orderBy('username')->get());
    }

    public function usersStore(Request $request)
    {
        $data = $request->all();
        $data['password'] = Hash::make($data['password'] ?? 'sigap123');
        $user = User::create($data);
        return response()->json($user);
    }

    public function usersUpdate(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) return response()->json(['error' => 'Not Found'], 404);

        $data = $request->all();
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        } else {
            unset($data['password']);
        }

        $user->update($data);
        return response()->json($user);
    }

    public function usersDestroy($id)
    {
        User::destroy($id);
        return response()->json(['success' => true]);
    }

    // --- 📂 CATEGORIES ---

    public function categories()
    {
        return response()->json(Category::orderBy('name')->get());
    }

    // --- 📅 EVENTS (ADMIN) ---

    public function eventsIndex(Request $request)
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);
        $query = Event::query();

        // Role-based access
        if ($user->role === 'ADMIN_EVENT') {
            $query->where('userId', $user->id);
        } elseif ($user->role === 'EMPLOYEE') {
            // Employe only see events within their dept if any logic exists
            return response()->json([]);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function eventsShow($id)
    {
        $event = Event::with('items')->find($id);
        if (!$event) return response()->json(['error' => 'Not Found'], 404);
        
        return response()->json($event);
    }

    public function eventsStore(Request $request)
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);
        
        $data = $request->all();
        $data['userId'] = $user->id;
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']) . '-' . rand(1000, 9999);

        $event = Event::create($data);

        if (isset($data['items'])) {
            foreach ($data['items'] as $item) {
                $event->items()->create($item);
            }
        }

        $this->logAction('CREATE_EVENT', 'Event', $event->id, "Created event: {$event->title}");

        return response()->json($event->load('items'));
    }

    public function eventsUpdate(Request $request, $id)
    {
        $event = Event::find($id);
        if (!$event) return response()->json(['error' => 'Not Found'], 404);

        $data = $request->all();
        $event->update($data);

        // Sync Items (Delete and Re-create for simplicity on shared hosting)
        if (isset($data['items'])) {
            $event->items()->delete();
            foreach ($data['items'] as $itemData) {
                // Ensure id is not passed to create
                unset($itemData['id']);
                $event->items()->create($itemData);
            }
        }

        $this->logAction('UPDATE_EVENT', 'Event', $event->id, "Updated event: {$event->title}");

        return response()->json($event->load('items'));
    }

    public function eventsDestroy($id)
    {
        $event = Event::find($id);
        if (!$event) return response()->json(['error' => 'Not Found'], 404);

        $event->items()->delete();
        $event->delete();

        $this->logAction('DELETE_EVENT', 'Event', $id, "Deleted event ID: {$id}");

        return response()->json(['success' => true]);
    }

    // --- 🌐 PUBLIC PORTAL ---

    public function publicEventShow($slug)
    {
        $event = Event::where('slug', $slug)->where('status', 'AKTIF')->first();
        if (!$event) return response()->json(['error' => 'Event not found or inactive'], 404);

        $items = $event->items()->where('isActive', true)->orderBy('order')->get();
        
        // --- 🚀 SOCIAL MEDIA AUTOMATIC GROUPING LOGIC ---
        // Mirroring the recent UI fix from Node.js:
        // If type is SOCIAL and layout is ICON_ONLY, group them.
        
        $formattedItems = [];
        $tempSocials = [];

        foreach ($items as $item) {
            if ($item->type === 'SOCIAL' && $item->layout === 'ICON_ONLY') {
                $tempSocials[] = $item;
                // If we reach 4 socials, push them as a group
                if (count($tempSocials) == 4) {
                    $formattedItems[] = ['type' => 'SOCIAL_GRID', 'items' => $tempSocials];
                    $tempSocials = [];
                }
            } else {
                // If we had pending socials, push them first
                if (!empty($tempSocials)) {
                    $formattedItems[] = ['type' => 'SOCIAL_GRID', 'items' => $tempSocials];
                    $tempSocials = [];
                }
                $formattedItems[] = $item;
            }
        }
        
        // Push remaining socials
        if (!empty($tempSocials)) {
            $formattedItems[] = ['type' => 'SOCIAL_GRID', 'items' => $tempSocials];
        }

        return response()->json([
            'event' => $event,
            'items' => $formattedItems
        ]);
    }

    // --- 💬 FEEDBACK ---

    public function submitFeedback(Request $request)
    {
        $feedback = Feedback::create($request->all());
        return response()->json(['status' => 'success', 'id' => $feedback->id]);
    }

    // --- ⚙️ SETTINGS ---

    public function getSettings()
    {
        $settings = \App\Models\Setting::first();
        return response()->json($settings);
    }

    public function updateSettings(Request $request)
    {
        $settings = \App\Models\Setting::first();
        if (!$settings) {
            $settings = \App\Models\Setting::create($request->all());
        } else {
            $settings->update($request->all());
        }
        return response()->json(['status' => 'success', 'settings' => $settings]);
    }

    // --- 📊 DASHBOARD & LOGS ---

    public function dashboardStats()
    {
        return response()->json([
            'events_count' => Event::count(),
            'feedback_pending' => Feedback::where('status', 'PENDING')->count(),
            'recent_logs' => AuditLog::orderBy('created_at', 'desc')->limit(5)->get()
        ]);
    }

    public function auditLogs()
    {
        return response()->json(AuditLog::orderBy('created_at', 'desc')->paginate(20));
    }

    // --- 헬 INTERNAL HELPERS ---

    private function logAction($action, $resource, $resourceId, $details)
    {
        $user = $this->currentUser();
        AuditLog::create([
            'action' => $action,
            'resource' => $resource,
            'resourceId' => $resourceId,
            'details' => $details,
            'userId' => $user?->id,
            'departmentId' => $user?->departmentId,
            'ipAddress' => request()->ip(),
            'userAgent' => request()->userAgent(),
        ]);
    }
}
