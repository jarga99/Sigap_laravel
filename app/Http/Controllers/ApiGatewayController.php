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
        return response()->json(['status' => 'success', 'user' => $user->load('category')]);
    }

    // --- 👥 USER MANAGEMENT (ADMIN ONLY) ---

    public function usersIndex(Request $request)
    {
        $limit = $request->input('limit', 10);
        $users = User::with('category')->orderBy('username')->paginate($limit);
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

    public function categories(Request $request)
    {
        $user = $this->currentUser();
        $query = Category::withCount(['links' => function($q) {
            $q->where('is_active', true);
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
        return response()->json($category);
    }

    public function categoriesUpdate(Request $request, $id)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $category = Category::find($id);
        if (!$category) return response()->json(['error' => 'Not Found'], 404);

        $category->update($request->all());
        return response()->json($category);
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

    // --- 🔗 LINKS MANAGEMENT (URL SHORTENER) ---

    public function linksIndex()
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);
        
        $query = Link::with('category');
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
        return response()->json($link);
    }

    public function linksUpdate(Request $request, $id)
    {
        $link = Link::find($id);
        if (!$link) return response()->json(['error' => 'Not found'], 404);

        $link->update($request->all());
        return response()->json($link);
    }

    public function linksDestroy($id)
    {
        $link = Link::find($id);
        if (!$link) return response()->json(['error' => 'Not found'], 404);
        
        $link->delete();
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

            // Simple Metadata Extraction using Http client
            $response = \Illuminate\Support\Facades\Http::timeout(5)->get($url);
            if (!$response->successful()) throw new \Exception("Could not fetch URL");

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
        $data = $request->all();
        $feedback = Feedback::create($data);

        // Notify Admins
        \App\Models\Notification::create([
            'type' => 'FEEDBACK',
            'message' => "Laporan baru dari " . ($feedback->is_anonymous ? "Anonim" : ($feedback->name ?: "Pengunjung")),
            'link' => '/admin/feedback'
        ]);

        return response()->json(['status' => 'success', 'id' => $feedback->id]);
    }

    public function feedbackIndex()
    {
        $feedbacks = Feedback::orderBy('created_at', 'desc')->get();
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
        return response()->json(['status' => 'success', 'data' => $feedback]);
    }

    public function feedbackToggleRead($id)
    {
        $feedback = Feedback::find($id);
        if (!$feedback) return response()->json(['error' => 'Not Found'], 404);
        $feedback->update(['is_read' => !$feedback->is_read]);
        return response()->json($feedback);
    }

    // --- 🔔 NOTIFICATIONS ---

    public function notifications()
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['notifications' => [], 'unreadCount' => 0]);

        $notifs = \App\Models\Notification::orderBy('created_at', 'desc')->limit(20)->get();
        $unread = \App\Models\Notification::where('isRead', false)->count();

        return response()->json([
            'notifications' => $notifs,
            'unreadCount' => $unread
        ]);
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

        $data = $request->all();

        // --- 🖼️ HANDAL UPLOAD LOGO & BG ---
        if ($request->hasFile('logo')) {
            $data['logo_url'] = $this->imageService->optimize($request->file('logo'), 'uploads/settings', 'LOGO', 800);
        }

        if ($request->hasFile('bg')) {
            $data['bg_url'] = $this->imageService->optimize($request->file('bg'), 'uploads/settings', 'BG', 1600);
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
        $data = $request->all();
        
        if ($request->hasFile('logo')) {
            $data['logoUrl'] = $this->imageService->optimize($request->file('logo'), 'uploads/footer', 'FOOTER', 400);
        }

        $link = \App\Models\FooterLink::create($data);
        $this->logAction('CREATE_FOOTER_LINK', 'FooterLink', $link->id, "Created footer link: {$link->label}");
        return response()->json($link);
    }

    public function footerLinksUpdate(Request $request, $id)
    {
        $link = \App\Models\FooterLink::find($id);
        if (!$link) return response()->json(['error' => 'Not Found'], 404);

        $data = $request->all();

        if ($request->hasFile('logo')) {
            $data['logoUrl'] = $this->imageService->optimize($request->file('logo'), 'uploads/footer', 'FOOTER', 400);
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

        $filename = 'sigap_backup_' . date('Y-m-d_H-i-s') . '.sql';
        
        $dbHost = env('DB_HOST', '127.0.0.1');
        $dbName = env('DB_DATABASE');
        $dbUser = env('DB_USERNAME');
        $dbPass = env('DB_PASSWORD');

        // Simple mysqldump wrapper
        $command = "mysqldump -h {$dbHost} -u {$dbUser} -p\"{$dbPass}\" {$dbName} --no-tablespaces";
        
        $output = [];
        $returnVar = 0;
        exec($command, $output, $returnVar);

        if ($returnVar !== 0) {
            return response()->json(['error' => 'Gagal melakukan backup. Pastikan mysqldump terinstall.'], 500);
        }

        $this->logAction('BACKUP_DATABASE', 'System', null, "Exported SQL backup: {$filename}");

        return response(implode("\n", $output))
            ->header('Content-Type', 'application/sql')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
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
                'categories', 'settings'
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

            $this->logAction('RESET_SYSTEM', 'System', null, "System has been reset by user ID: {$user->id}");

            return response()->json(['status' => 'success', 'message' => 'Sistem berhasil di-reset sepenuhnya.']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Gagal mereset sistem: ' . $e->getMessage()], 500);
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

        // Mock chartData representing months/days. Assuming months for simplicity.
        $chartData = [];
        foreach (range(1, 12) as $m) {
            $chartData[] = [
                'id' => $m,
                'title' => date('F', mktime(0, 0, 0, $m, 1)),
                'stats' => [
                    'total' => rand(100, 1000), 
                    'user' => rand(50, 500), 
                    'guest' => rand(50, 500)
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

    public function auditLogs()
    {
        // Frontend does client-side pagination, so return the collection directly.
        // Limit to 200 for performance safety on shared hosting.
        return response()->json(AuditLog::with('user')->orderBy('created_at', 'desc')->limit(200)->get());
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
            'sid' => $payload['sid'] ?? null,
            'category_id' => $user?->category_id,
            'ipAddress' => request()->ip(),
            'userAgent' => request()->userAgent(),
        ]);
    }
}
