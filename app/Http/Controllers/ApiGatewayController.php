<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Event;
use App\Models\EventItem;
use App\Models\Category;
use App\Models\Feedback;
use App\Models\AuditLog;
use App\Models\Link;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\JwtService;

class ApiGatewayController extends Controller
{
    protected $jwtService;
    protected $geminiService;
    protected $imageService;

    public function __construct(JwtService $jwtService, \App\Services\ImageService $imageService)
    {
        $this->jwtService = $jwtService;
        $this->imageService = $imageService;
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
        $user = User::where('username', $request->username)
                    ->orWhere('email', $request->username)
                    ->first();

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
            'category_id' => $user->category_id,
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
                'category_id' => $user->category_id
            ]
        ]);
    }

    public function loginWithGoogle(Request $request)
    {
        $credential = $request->input('credential');
        if (!$credential) {
            return response()->json(['message' => 'Token Google tidak ditemukan', 'error' => 'Missing credential'], 400);
        }

        try {
            $response = \Illuminate\Support\Facades\Http::get("https://oauth2.googleapis.com/tokeninfo?id_token={$credential}");
            
            if (!$response->successful()) {
                return response()->json(['message' => 'Payload Google tidak valid.'], 400);
            }

            $payload = $response->json();
            $email = $payload['email'] ?? null;

            if (!$email) {
                return response()->json(['message' => 'Email tidak tersedia dari akun Google'], 400);
            }

            $user = User::where('email', $email)->first();

            if (!$user) {
                return response()->json(['message' => 'Gagal login via Google. Pastikan email Anda sudah terdaftar atau hubungi admin.'], 404);
            }

            if (!$user->is_active) {
                return response()->json(['message' => 'Akun anda dinonaktifkan.'], 403);
            }

            $newSessionId = Str::random(40);
            $user->update(['sessionId' => $newSessionId]);

            $token = $this->jwtService->generateToken([
                'sub' => $user->id,
                'role' => $user->role,
                'sid' => $newSessionId
            ], 86400);

            return response()->json([
                'status' => 'success',
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'fullName' => $user->fullName,
                    'role' => $user->role,
                    'category_id' => $user->category_id
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal memverifikasi akun Google', 'error' => $e->getMessage()], 500);
        }
    }

    public function me()
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthenticated'], 401);
        return response()->json(['user' => $user->load('category')]);
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

        // Security check for password/email changes
        if ($request->filled('password') || $request->filled('email')) {
            if (!$request->filled('oldPassword') || !Hash::check($request->oldPassword, $user->password)) {
                return response()->json(['error' => 'Password saat ini tidak valid'], 422);
            }
        }

        $data = $request->only(['fullName', 'email']);
        
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        // Handle Avatar Upload
        if ($request->hasFile('image')) {
            $data['image_url'] = $this->imageService->optimize($request->file('image'), 'uploads/profiles', 'AVATAR', 600);
        }

        $user->update($data);
        $this->logAction('UPDATE_PROFILE', 'User', $user->id, "Updated profile for user: {$user->username}");
        return response()->json(['status' => 'success', 'user' => $user->load('category')]);
    }

    // --- 👥 USER MANAGEMENT (ADMIN ONLY) ---

    public function usersIndex(Request $request)
    {
        $limit = $request->input('limit', 10);
        $users = User::with('category')
            ->where('role', '!=', 'SUPER_ADMIN')
            ->orderBy('username')
            ->paginate($limit);
        return response()->json([
            'data' => $users->items(),
            'meta' => [
                'total' => $users->total(),
                'totalPages' => $users->lastPage()
            ]
        ]);
    }

    public function usersStore(Request $request)
    {
        $data = $request->all();
        if (isset($data['role']) && $data['role'] === 'SUPER_ADMIN') {
            return response()->json(['error' => 'Akses ditolak. Tidak dapat membuat Super Admin.'], 403);
        }
        $data['password'] = Hash::make($data['password'] ?? 'sigap123');
        $user = User::create($data);
        $this->logAction('CREATE_USER', 'User', $user->id, "Created user: {$user->username} (Role: {$user->role})");
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
        $this->logAction('UPDATE_USER', 'User', $user->id, "Updated user: {$user->username}");
        return response()->json($user);
    }

    public function usersDestroy($id)
    {
        User::destroy($id);
        $this->logAction('DELETE_USER', 'User', $id, "Deleted user ID: {$id}");
        return response()->json(['success' => true]);
    }

    // --- 📂 CATEGORIES ---

    public function categories(Request $request)
    {
        $user = $this->currentUser();
        $query = Category::withCount(['links' => function($q) {
            $q->where('is_active', true);
        }, 'users'])->with(['users' => function($q) {
            $q->select('id', 'username', 'image_url', 'category_id')->limit(3);
        }])->orderBy('name');

        // RBAC: Employees only see their own category
        if ($user && $user->role === 'EMPLOYEE' && $user->category_id) {
            $query->where('id', $user->category_id);
        }

        return response()->json($query->get());
    }

    public function categoriesStore(Request $request)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $category = Category::create($request->all());
        $this->logAction('CREATE_CATEGORY', 'Category', $category->id, "Created category: {$category->name}");
        return response()->json($category);
    }

    public function categoriesUpdate(Request $request, $id)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $category = Category::find($id);
        if (!$category) return response()->json(['error' => 'Not Found'], 404);

        $category->update($request->all());
        $this->logAction('UPDATE_CATEGORY', 'Category', $category->id, "Updated category: {$category->name}");
        return response()->json($category);
    }

    public function categoriesDestroy($id)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $category = Category::find($id);
        if (!$category) return response()->json(['error' => 'Not Found'], 404);

        if ($category->links()->exists() || $category->users()->exists()) {
            return response()->json([
                'error' => 'Tidak bisa dihapus karena masih ada Tautan atau Pengguna yang terhubung dengan kategori ini.'
            ], 400);
        }

        $category->delete();
        $this->logAction('DELETE_CATEGORY', 'Category', $id, "Deleted category ID: {$id}");
        return response()->json(['success' => true]);
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
        
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:events,slug',
            'description' => 'nullable|string'
        ]);

        $data['userId'] = $user->id;
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']) . '-' . rand(1000, 9999);
        
        // Default values for new event
        $data['status'] = 'TIDAK_AKTIF';
        $data['bgType'] = 'color';
        $data['bgValue'] = '#0f172a';

        try {
            $event = Event::create(collect($data)->except(['items'])->all());

            if ($request->has('items')) {
                foreach ($request->items as $item) {
                     // Ensure eventId is set
                    $item['eventId'] = $event->id;
                    $event->items()->create($item);
                }
            }

            $this->logAction('CREATE_EVENT', 'Event', $event->id, "Created event: {$event->title}");
            return response()->json($event->load('items'));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Gagal membuat event', 'details' => $e->getMessage()], 500);
        }
    }

    public function eventsUpdate(Request $request, $id)
    {
        $event = Event::find($id);
        if (!$event) return response()->json(['error' => 'Not Found'], 404);

        $data = $request->all();

        try {
            $event->update(collect($data)->except(['items', 'createdAt', 'updatedAt', 'userId'])->all());

            // Sync Items (Delete and Re-create for simplicity on shared hosting)
            if (isset($data['items'])) {
                $event->items()->delete();
                foreach ($data['items'] as $itemData) {
                    // Filter unnecessary fields before creation to avoid DB errors
                    $cleanData = collect($itemData)->only([
                        'label', 'url', 'type', 'color', 'textColor', 
                        'iconColor', 'icon', 'order', 'layout', 'showLabel', 'isActive',
                        'dividerStyle', 'dividerCap', 'dividerWidth', 'dividerText', 'dividerThickness'
                    ])->all();
                    
                    $event->items()->create($cleanData);
                }
            }

            $this->logAction('UPDATE_EVENT', 'Event', $event->id, "Updated event: {$event->title}");
            return response()->json($event->load('items'));
        } catch (\Exception $e) {
            return response()->json(['error' => 'Gagal memperbarui event', 'details' => $e->getMessage()], 500);
        }
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

    // --- 🔗 LINKS MANAGEMENT (URL SHORTENER) ---

    public function linksIndex()
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);
        
        $query = Link::with(['category', 'user']);
        if ($user->role === 'EMPLOYEE' && $user->category_id) {
            $query->where('category_id', $user->category_id);
        }
        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function linksStore(Request $request)
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $data = $request->all();
        $data['userId'] = $user->id;
        if (empty($data['slug'])) {
            $data['slug'] = Str::random(6);
        }

        $link = Link::create($data);
        $this->logAction('CREATE_LINK', 'Link', $link->id, "Created link: {$link->title} ({$link->slug})");
        return response()->json($link);
    }

    public function linksUpdate(Request $request, $id)
    {
        $link = Link::find($id);
        if (!$link) return response()->json(['error' => 'Not found'], 404);

        $link->update($request->all());
        $this->logAction('UPDATE_LINK', 'Link', $link->id, "Updated link: {$link->title}");
        return response()->json($link);
    }

    public function linksDestroy($id)
    {
        $link = Link::find($id);
        if (!$link) return response()->json(['error' => 'Not found'], 404);
        
        $link->delete();
        $this->logAction('DELETE_LINK', 'Link', $id, "Deleted link ID: {$id}");
        return response()->json(['success' => true]);
    }

    public function linksBulkImport(Request $request)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        if (!$request->hasFile('file')) return response()->json(['error' => 'No file uploaded'], 400);

        $file = $request->file('file');
        $fh = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($fh); // Skip header
        
        $count = 0;
        while (($row = fgetcsv($fh)) !== false) {
            if (count($row) < 2) continue;
            Link::create([
                'title' => $row[0],
                'url' => $row[1],
                'slug' => ($row[2] ?? null) ?: Str::slug($row[0]) . '-' . rand(100,999),
                'category_id' => ($row[3] ?? null) ?: 1,
                'visibility' => ($row[4] ?? null) === 'KATEGORI' ? 'KATEGORI' : 'INTERNAL',
                'desc' => $row[5] ?? null,
                'is_active' => true
            ]);
            $count++;
        }
        fclose($fh);

        $this->logAction('BULK_IMPORT_LINKS', 'Link', null, "Successfully imported {$count} links from CSV");
        return response()->json(['successCount' => $count]);
    }

    public function linksTemplate()
    {
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=template_links.csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['title', 'url', 'slug', 'category_id', 'visibility', 'desc'];

        $callback = function() use($columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);
            fputcsv($file, ['Contoh Layanan', 'https://google.com', 'google-link', '1', 'INTERNAL', 'Deskripsi layanan ini']);
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function linksExport()
    {
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=links_export_" . date('Ymd') . ".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $links = Link::all();
        $columns = ['title', 'url', 'slug', 'category_id', 'visibility', 'desc', 'clicks'];

        $callback = function() use($links, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($links as $link) {
                fputcsv($file, [
                    $link->title,
                    $link->url,
                    $link->slug,
                    $link->category_id,
                    $link->visibility,
                    $link->desc,
                    $link->clicks
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function redirectLink($slug)
    {
        $link = Link::where('slug', $slug)->where('is_active', true)->first();
        if (!$link) {
            return redirect('/');
        }

        // Increment clicks
        $link->increment('clicks');

        // Log Click
        \App\Models\ClickLog::create([
            'linkId' => $link->id,
            'ipAddress' => request()->ip(),
            'userRole' => 'GUEST',
            'clickedAt' => now(),
        ]);

        $url = $link->url;
        if (!preg_match("~^(?:f|ht)tps?://~i", $url)) {
            $url = "https://" . $url;
        }

        return redirect()->away($url);
    }

    public function portalPreview(Request $request)
    {
        $url = $request->query('url');
        if (!$url) return response()->json(['error' => 'URL required'], 400);

        try {
            if (!preg_match("~^(?:f|ht)tps?://~i", $url)) {
                $url = "https://" . $url;
            }

            // Robust Metadata Extraction
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            ])->withoutVerifying()->timeout(7)->get($url);

            if (!$response->successful()) {
                return response()->json([
                    'title' => '',
                    'description' => 'Pratinjau tidak tersedia untuk situs ini.',
                    'image' => null,
                    'is_fallback' => true
                ]);
            }

            $html = $response->body();
            
            $preview = [
                'title' => '',
                'description' => '',
                'image' => ''
            ];

            // Match Title (Stronger)
            if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches)) {
                $preview['title'] = html_entity_decode(trim($matches[1]));
            }

            // Match Description (OG or Meta Tag)
            if (preg_match('/<meta[^>]*property=["\']og:description["\'][^>]*content=["\'](.*?)["\']/is', $html, $matches)) {
                $preview['description'] = html_entity_decode($matches[1]);
            } elseif (preg_match('/<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']/is', $html, $matches)) {
                $preview['description'] = html_entity_decode($matches[1]);
            }

            // Match Image (OG)
            if (preg_match('/<meta[^>]*property=["\']og:image["\'][^>]*content=["\'](.*?)["\']/is', $html, $matches)) {
                $preview['image'] = $matches[1];
            }

            return response()->json($preview);
        } catch (\Exception $e) {
            return response()->json(['error' => true, 'message' => $e->getMessage()], 200);
        }
    }

    public function portalLinks(Request $request)
    {
        $user = $this->currentUser();
        // Following legacy: requires login to see portal links.
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $query = Link::with('category')->where('is_active', true);

        if ($user->role !== 'ADMIN') {
            // RBAC: Show INTERNAL links (all user) OR (KATEGORI matching user category)
            $query->where(function($q) use ($user) {
                $q->where('visibility', 'INTERNAL')
                  ->orWhere(function($sub) use ($user) {
                      $sub->where('visibility', 'KATEGORI')
                          ->where('category_id', $user->category_id);
                  });
            });
        }

        return response()->json($query->orderBy('category_id')->orderBy('created_at', 'desc')->get());
    }

    // --- 🌐 INTERNAL PORTAL ---

    public function internalEventShow($slug)
    {
        $event = Event::where('slug', $slug)->first(); // We handle status checks on frontend for preview mode if needed
        if (!$event) return response()->json(['error' => 'Event not found'], 404);

        if ($event->status !== 'AKTIF') {
            // Optional: return error if not active, but for "Preview" we might want it.
            // For now, let's keep status check light or pass it to UI.
        }

        return response()->json($event->load(['items' => function($q) {
            $q->where('isActive', true)->orderBy('order');
        }]));
    }

    // --- 💬 FEEDBACK ---

    public function submitFeedback(Request $request)
    {
        $user = $this->currentUser();
        $data = $request->all();

        // Auto-fill and link if logged in
        if ($user) {
            $data['user_id'] = $user->id;
            $data['name'] = $user->fullName ?: $user->username;
            $data['email'] = $user->email;
            $data['role'] = $user->role;
        }

        if ($request->hasFile('file')) {
            $data['attachment_url'] = $this->imageService->optimize($request->file('file'), 'uploads/feedback', 'FEEDBACK', 1000);
            $data['attachment_type'] = 'IMAGE';
            unset($data['file']); // Remove file object from database insertion data
        }

        $feedback = Feedback::create($data);
        $senderLabel = $feedback->is_anonymous ? "Anonim" : ($feedback->name ?: "Pengunjung");
        
        $this->logAction('SUBMIT_FEEDBACK', 'Feedback', $feedback->id, "New feedback submitted by " . $senderLabel);
        
        // Notify Admins
        \App\Models\Notification::create([
            'type' => 'FEEDBACK',
            'message' => "Laporan baru dari " . $senderLabel,
            'link' => '/admin/feedback'
        ]);

        return response()->json(['status' => 'success', 'id' => $feedback->id]);
    }

    public function feedbackIndex()
    {
        $user = $this->currentUser();
        $query = Feedback::orderBy('created_at', 'desc');

        // Personalize view for non-admin roles
        if ($user && $user->role !== 'ADMIN') {
            $query->where('user_id', $user->id);
        }

        $feedbacks = $query->get();
        return response()->json($feedbacks);
    }

    public function feedbackReply(Request $request, $id)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $feedback = Feedback::find($id);
        if (!$feedback) return response()->json(['error' => 'Not Found'], 404);

        $data = $request->only(['reply_message']);
        
        if ($request->hasFile('file')) {
            $data['reply_image_url'] = $this->imageService->optimize($request->file('file'), 'uploads/replies', 'REPLY', 1000);
        }

        $data['replied_at'] = now();
        $data['replied_by_id'] = $user->id;
        $data['status'] = 'DONE';
        $data['is_read'] = true;

        $feedback->update($data);
        $this->logAction('REPLY_FEEDBACK', 'Feedback', $id, "Replied to feedback from: {$feedback->name}");
        return response()->json(['status' => 'success', 'data' => $feedback]);
    }

    public function feedbackToggleRead($id)
    {
        $feedback = Feedback::find($id);
        if (!$feedback) return response()->json(['error' => 'Not Found'], 404);
        $feedback->update(['is_read' => !$feedback->is_read]);
        $this->logAction('TOGGLE_READ_FEEDBACK', 'Feedback', $id, "Changed read status for feedback ID: {$id}");
        return response()->json($feedback);
    }

    // --- 🔔 NOTIFICATIONS ---

    public function notifications(Request $request)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['notifications' => [], 'unreadCount' => 0]);

        $showAll = $request->query('all') === 'true';
        
        if ($showAll) {
            // All history (latest first)
            $notifs = \App\Models\Notification::orderBy('created_at', 'desc')->paginate(20);
            return response()->json($notifs);
        } else {
            // FIFO Queue (oldest unread first, top 10)
            $notifs = \App\Models\Notification::where('isRead', false)
                ->orderBy('created_at', 'asc')
                ->limit(10)
                ->get();
            $unread = \App\Models\Notification::where('isRead', false)->count();

            return response()->json([
                'notifications' => $notifs,
                'unreadCount' => $unread
            ]);
        }
    }

    public function notificationMarkRead($id)
    {
        $notif = \App\Models\Notification::find($id);
        if ($notif) {
            $notif->update(['isRead' => true]);
        }
        return response()->json(['success' => true]);
    }

    public function notificationsRead(Request $request)
    {
        \App\Models\Notification::where('isRead', false)->update(['isRead' => true]);
        return response()->json(['success' => true]);
    }

    // --- ⚙️ SETTINGS ---

    public function getSettings()
    {
        $settings = \App\Models\Setting::first();
        return response()->json($settings ?: []);
    }

    public function uploadMedia(Request $request)
    {
        if ($request->hasFile('file')) {
            $url = $this->imageService->optimize($request->file('file'), 'uploads/media', 'MEDIA', 1200);
            return response()->json(['url' => $url]);
        }
        return response()->json(['error' => 'No file uploaded'], 400);
    }

    public function updateSettings(Request $request)
    {
        $settings = \App\Models\Setting::first();
        if (!$settings) {
            $settings = new \App\Models\Setting();
            $settings->id = 1;
        }

        $data = $request->except(['logo', 'bg', 'id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);

        // --- 🖼️ HANDAL UPLOAD LOGO & BG ---
        if ($request->hasFile('logo')) {
            $data['logo_url'] = $this->imageService->optimize($request->file('logo'), 'uploads/settings', 'LOGO', 800);
            unset($data['logo']);
        }

        if ($request->hasFile('bg')) {
            $data['bg_url'] = $this->imageService->optimize($request->file('bg'), 'uploads/settings', 'BG', 1600);
            unset($data['bg']);
        }

        $settings->fill($data);
        $settings->save();

        $this->logAction('UPDATE_SETTINGS', 'Setting', $settings->id, "Updated system settings");

        return response()->json($settings);
    }

    // --- 🔗 FOOTER LINKS (ADMIN ONLY) ---

    public function footerLinksIndex()
    {
        return response()->json(\App\Models\FooterLink::orderBy('order')->get());
    }

    public function footerLinksStore(Request $request)
    {
        $data = $request->except(['logo', 'id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);
        
        if ($request->hasFile('logo')) {
            $data['logoUrl'] = $this->imageService->optimize($request->file('logo'), 'uploads/footer', 'FOOTER', 400);
            unset($data['logo']);
        }

        if (isset($data['isActive'])) {
            $data['isActive'] = filter_var($data['isActive'], FILTER_VALIDATE_BOOLEAN);
        }

        $link = \App\Models\FooterLink::create($data);
        $this->logAction('CREATE_FOOTER_LINK', 'FooterLink', $link->id, "Created footer link: {$link->label}");
        return response()->json($link);
    }

    public function footerLinksUpdate(Request $request, $id)
    {
        $link = \App\Models\FooterLink::find($id);
        if (!$link) return response()->json(['error' => 'Not Found'], 404);

        $data = $request->except(['logo', 'id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', '_method']);

        if ($request->hasFile('logo')) {
            $data['logoUrl'] = $this->imageService->optimize($request->file('logo'), 'uploads/footer', 'FOOTER', 400);
            unset($data['logo']);
        }

        // Handle isActive boolean from FormData (often comes as "true"/"false" strings)
        if (isset($data['isActive'])) {
            $data['isActive'] = filter_var($data['isActive'], FILTER_VALIDATE_BOOLEAN);
        }

        $link->update($data);
        $this->logAction('UPDATE_FOOTER_LINK', 'FooterLink', $link->id, "Updated footer link: {$link->label}");
        return response()->json($link);
    }

    public function footerLinksDestroy($id)
    {
        \App\Models\FooterLink::destroy($id);
        $this->logAction('DELETE_FOOTER_LINK', 'FooterLink', $id, "Deleted footer link ID: {$id}");
        return response()->json(['success' => true]);
    }

    // --- 🤖 AI FEATURES ---

    public function generateAiTagline(Request $request)
    {
        $appName = $request->input('appName', 'SIGAP');
        $tagline = $this->geminiService->generateTagline($appName);
        return response()->json(['tagline' => $tagline]);
    }

    // --- 🛡️ SYSTEM MAINTENANCE (SUPER ADMIN ONLY) ---

    public function systemBackup()
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $date = date('Y-m-d_H-i-s');
        $zipFilename = "sigap_full_backup_{$date}.zip";
        $sqlFilename = "database_backup_{$date}.sql";
        
        $backupDir = storage_path('app/backups');
        if (!file_exists($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $sqlPath = $backupDir . '/' . $sqlFilename;
        $zipPath = $backupDir . '/' . $zipFilename;

        $dbHost = env('DB_HOST', '127.0.0.1');
        $dbName = env('DB_DATABASE');
        $dbUser = env('DB_USERNAME');
        $dbPass = env('DB_PASSWORD');

        // 1. Generate SQL Dump ke file temporary
        // Gunakan escapeshellarg untuk keamanan karakter khusus di password/db
        $shHost = escapeshellarg($dbHost);
        $shUser = escapeshellarg($dbUser);
        $shPass = escapeshellarg($dbPass);
        $shName = escapeshellarg($dbName);
        $shPath = escapeshellarg($sqlPath);

        $command = "mysqldump -h {$shHost} -u {$shUser} -p{$shPass} {$shName} --no-tablespaces > {$shPath} 2>&1";
        
        $output = [];
        $returnVar = 0;
        exec($command, $output, $returnVar);

        if ($returnVar !== 0) {
            \Log::error("Backup failed: " . implode("\n", $output));
            return response()->json(['error' => 'Gagal melakukan backup database. ' . implode(" ", $output)], 500);
        }

        // 2. Buat ZIP archive
        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== TRUE) {
            return response()->json(['error' => 'Gagal membuat file ZIP archive.'], 500);
        }

        // Tambahkan file SQL ke ZIP
        $zip->addFile($sqlPath, $sqlFilename);

        // Tambahkan folder uploads ke ZIP
        $uploadDir = public_path('uploads');
        if (is_dir($uploadDir)) {
            $files = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($uploadDir, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );

            foreach ($files as $name => $file) {
                if (!$file->isDir()) {
                    $filePath = $file->getRealPath();
                    // Buat path relatif di dalam ZIP (uploads/...)
                    $relativePath = 'uploads/' . substr($filePath, strlen($uploadDir) + 1);
                    $zip->addFile($filePath, $relativePath);
                }
            }
        }

        $zip->close();

        // Bersihkan file SQL temporary (ZIP tetap ada untuk di-download)
        if (file_exists($sqlPath)) {
            unlink($sqlPath);
        }

        $this->logAction('BACKUP_DATABASE', 'System', null, "Exported Full ZIP backup (SQL + Uploads): {$zipFilename}");

        // Return file sebagai download dan hapus setelah terkirim
        return response()->download($zipPath, $zipFilename)->deleteFileAfterSend(true);
    }

    public function systemReset()
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        try {
            DB::beginTransaction();
            
            // 1. Matikan Foreign Key Checks
            DB::statement('SET FOREIGN_KEY_CHECKS = 0');

            // 2. Daftar tabel yang akan dikosongkan (Wipe operasional data)
            $tables = [
                'event_items', 'events', 'audit_logs', 
                'click_logs', 'links', 'feedbacks', 'footer_links',
                'categories', 'settings', 'notifications', 'sessions'
            ];

            foreach ($tables as $table) {
                DB::table($table)->truncate();
            }

            // 3. Hapus User kecuali sigap_admin & admin asli
            User::whereNotIn('username', ['sigap_admin', 'admin'])->delete();
            DB::statement('ALTER TABLE users AUTO_INCREMENT = 1');

            DB::statement('SET FOREIGN_KEY_CHECKS = 1');
            DB::commit();

            // 4. Bersihkan folder uploads
            $uploadDir = public_path('uploads');
            if (is_dir($uploadDir)) {
                $files = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($uploadDir, \RecursiveDirectoryIterator::SKIP_DOTS),
                    \RecursiveIteratorIterator::CHILD_FIRST
                );

                foreach ($files as $fileinfo) {
                    $todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
                    $todo($fileinfo->getRealPath());
                }
            }

            return response()->json(['status' => 'success', 'message' => 'Sistem berhasil di-reset sepenuhnya.']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Gagal mereset sistem: ' . $e->getMessage()], 500);
        } finally {
            // Selalu nyalakan kembali FK checks
            DB::statement('SET FOREIGN_KEY_CHECKS = 1');
            
            // Pastikan folder uploads tetap ada (kosong) agar sistem tidak crash saat simpan file baru
            $uploadDir = public_path('uploads');
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
            
            // Log action di luar transaksi agar tidak terbawa rollback jika log gagal (tapi tetap coba log)
            try {
                if (isset($user)) {
                    $this->logAction('RESET_SYSTEM', 'System', null, "System has been reset by user ID: {$user->id}");
                }
            } catch (\Exception $logErr) {
                \Log::warning("Failed to log RESET_SYSTEM: " . $logErr->getMessage());
            }
        }
    }

    // --- 📊 DASHBOARD & LOGS ---

    public function dashboardStats(Request $request)
    {
        $month = $request->input('month', 'all');
        $year = $request->input('year', date('Y'));

        $totalLinks = Link::count();
        $totalCategories = Category::count();
        $totalClicks = Link::sum('clicks');
        $totalEngagement = $totalLinks > 0 ? min(round(($totalClicks / $totalLinks) * 10), 100) : 0;

        $topLinks = Link::with('category')->orderBy('clicks', 'desc')->limit(10)->get();

        // Real chartData from click_logs
        $chartData = [];
        $currentYear = $year == 'all' ? date('Y') : $year;

        for ($m = 1; $m <= 12; $m++) {
            $monthName = date('F', mktime(0, 0, 0, $m, 1));
            
            // Count Login User Clicks (All roles except GUEST)
            $userClicks = \App\Models\Link::whereHas('clickLogs', function($q) use ($m, $currentYear) {
                $q->where('userRole', '!=', 'GUEST')
                  ->whereYear('clickedAt', $currentYear)
                  ->whereMonth('clickedAt', $m);
            })->count();

            // Count Guest Clicks
            $guestClicks = \App\Models\Link::whereHas('clickLogs', function($q) use ($m, $currentYear) {
                $q->where('userRole', 'GUEST')
                  ->whereYear('clickedAt', $currentYear)
                  ->whereMonth('clickedAt', $m);
            })->count();

            // Alternative: Directly query click_logs if it's more efficient (likely it is)
            $userClicks = DB::table('click_logs')
                            ->where('userRole', '!=', 'GUEST')
                            ->whereYear('clickedAt', $currentYear)
                            ->whereMonth('clickedAt', $m)
                            ->count();

            $guestClicks = DB::table('click_logs')
                             ->where('userRole', 'GUEST')
                             ->whereYear('clickedAt', $currentYear)
                             ->whereMonth('clickedAt', $m)
                             ->count();

            $chartData[] = [
                'id' => $m,
                'title' => $monthName,
                'stats' => [
                    'total' => $userClicks + $guestClicks,
                    'user' => $userClicks,
                    'guest' => $guestClicks
                ]
            ];
        }

        return response()->json([
            'stats' => [
                'totalLinks' => $totalLinks,
                'totalCategories' => $totalCategories,
                'totalClicks' => $totalClicks,
                'totalEngagement' => $totalEngagement
            ],
            'topLinks' => $topLinks,
            'chartData' => $chartData
        ]);
    }

    public function exportAuditLogs(Request $request)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $startDate = $request->input('startDate');
        $endDate = $request->input('endDate');
        $format = $request->input('format', 'csv'); // csv or txt

        $query = \App\Models\AuditLog::with('user')->orderBy('created_at', 'asc');

        if ($startDate) $query->where('created_at', '>=', $startDate . ' 00:00:00');
        if ($endDate) $query->where('created_at', '<=', $endDate . ' 23:59:59');

        $logs = $query->get();

        if ($format === 'txt') {
            $content = "LAPORAN AKTIVITAS PENGGUNA - SIGAP\n";
            $content .= "Periode: " . ($startDate ?: 'Awal') . " s/d " . ($endDate ?: 'Sekarang') . "\n";
            $content .= str_repeat("-", 80) . "\n\n";

            foreach ($logs as $log) {
                $time = $log->created_at->format('Y-m-d H:i:s');
                $actor = $log->user ? ($log->user->fullName ?: $log->user->username) : 'Sistem';
                $content .= "[$time] $actor: {$log->action} pada {$log->resource} ({$log->resourceId}) - {$log->details}\n";
            }
            
            return response($content)
                ->header('Content-Type', 'text/plain')
                ->header('Content-Disposition', 'attachment; filename="Activity_Log_'.date('Ymd').'.txt"');
        }

        // CSV Format
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=Activity_Report_".date('Ymd').".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['Waktu', 'Pengguna', 'Aksi', 'Sumber Daya', 'Detail', 'IP Address'];

        $callback = function() use($logs, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns, ';');

            foreach ($logs as $log) {
                $row = [
                    'Waktu'  => $log->created_at->format('Y-m-d H:i:s'),
                    'Pengguna' => $log->user ? ($log->user->fullName ?: $log->user->username) : 'Sistem',
                    'Aksi'  => $log->action,
                    'Sumber Daya' => $log->resource,
                    'Detail' => $log->details,
                    'IP Address' => $log->ipAddress
                ];

                fputcsv($file, array_values($row), ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function systemLogsDownload()
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $path = storage_path('logs/laravel.log');
        if (!file_exists($path)) {
            return response()->json(['message' => 'File log tidak ditemukan'], 404);
        }

        return response()->download($path, 'laravel_system_' . date('Ymd_His') . '.log');
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
            'category_id' => $user?->category_id,
            'ipAddress' => request()->ip(),
            'userAgent' => request()->userAgent(),
        ]);
    }
}
