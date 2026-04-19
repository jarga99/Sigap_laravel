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
        $data = $request->validate([
            'username' => 'required|string|unique:users,username|max:255',
            'fullName' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'password' => 'required|string|min:4',
            'role' => 'required|string|in:ADMIN,EMPLOYEE,ADMIN_EVENT',
            'category_id' => 'nullable|integer'
        ]);

        if (isset($data['role']) && $data['role'] === 'SUPER_ADMIN') {
            return response()->json(['error' => 'Akses ditolak. Tidak dapat membuat Super Admin.'], 403);
        }
        
        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);
        $this->logAction('CREATE_USER', 'User', $user->id, "Created user: {$user->username} (Role: {$user->role}, Email: " . ($user->email ?: '-') . ")");
        return response()->json($user);
    }

    public function usersUpdate(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) return response()->json(['error' => 'Not Found'], 404);

        // Security: Cannot edit Super Admin via standard API
        if ($user->role === 'SUPER_ADMIN') {
            return response()->json(['error' => 'Akses Terlarang: Akun Super Admin tidak dapat diubah melalui menu ini.'], 403);
        }

        $data = $request->validate([
            'username' => 'sometimes|string|max:255|unique:users,username,'.$id,
            'fullName' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:255',
            'password' => 'nullable|string|min:4',
            'role' => 'sometimes|string|in:ADMIN,EMPLOYEE,ADMIN_EVENT',
            'category_id' => 'nullable|integer'
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        $this->logAction('UPDATE_USER', 'User', $user->id, "Updated user: {$user->username} (Email: " . ($user->email ?: '-') . ")");
        return response()->json($user);
    }

    public function usersDestroy($id)
    {
        $user = User::find($id);
        if (!$user) return response()->json(['error' => 'Not Found'], 404);

        // Security: Cannot delete Super Admin
        if ($user->role === 'SUPER_ADMIN') {
            return response()->json(['error' => 'Akses Terlarang: Akun Super Admin tidak dapat dihapus.'], 403);
        }

        $user->delete();
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

        // Search
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('title', 'like', "%$s%")
                  ->orWhere('slug', 'like', "%$s%");
            });
        }

        // Status filter (from Tab)
        if ($request->filled('status')) {
            $status = strtoupper($request->status);
            if ($status === 'ACTIVE') $query->where('status', 'AKTIF');
            else if ($status === 'INACTIVE') $query->where('status', 'TIDAK_AKTIF');
            else if ($status === 'ARCHIVE') $query->where('status', 'ARSIP');
        }

        // Role-based access: ADMIN sees all, ADMIN_EVENT & EMPLOYEE see only their own events
        if ($user->role === 'ADMIN_EVENT' || $user->role === 'EMPLOYEE') {
            $query->where('userId', $user->id);
        }

        $limit = $request->input('limit', 15);
        return response()->json($query->orderBy('created_at', 'desc')->paginate($limit));
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

    public function linksIndex(Request $request)
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);
        
        $query = Link::with(['category', 'user']);
        
        // Search
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('title', 'like', "%$s%")
                  ->orWhere('slug', 'like', "%$s%")
                  ->orWhereHas('category', function($cq) use ($s) {
                      $cq->where('name', 'like', "%$s%");
                  });
            });
        }

        // Filters
        if ($request->filled('month') && $request->month !== 'all') {
            $query->whereMonth('created_at', $request->month);
        }
        if ($request->filled('year') && $request->year !== 'all') {
            $query->whereYear('created_at', $request->year);
        }

        // Permissions
        if ($user->role === 'EMPLOYEE') {
            $query->where(function($q) use ($user) {
                $q->where('visibility', 'INTERNAL')
                  ->orWhere('category_id', $user->category_id)
                  ->orWhere('userId', $user->id);
            });
        }

        // Sorting
        $sortBy = $request->input('sortBy', 'newest');
        if ($sortBy === 'a-z') $query->orderBy('title', 'asc');
        else if ($sortBy === 'z-a') $query->orderBy('title', 'desc');
        else if ($sortBy === 'clicks') $query->orderBy('clicks', 'desc');
        else $query->orderBy('created_at', 'desc');

        $limit = $request->input('limit', 20);
        return response()->json($query->paginate($limit));
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
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $link = Link::find($id);
        if (!$link) return response()->json(['error' => 'Not found'], 404);

        // RBAC: Employee only same category or owner
        if ($user->role === 'EMPLOYEE') {
            if ($link->category_id != $user->category_id && $link->userId != $user->id) {
                return response()->json(['error' => 'Forbidden'], 403);
            }
        }

        $link->update($request->all());
        $this->logAction('UPDATE_LINK', 'Link', $link->id, "Updated link: {$link->title}");
        return response()->json($link);
    }

    public function linksDestroy($id)
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $link = Link::find($id);
        if (!$link) return response()->json(['error' => 'Not found'], 404);
        
        // RBAC: Employee only same category or owner
        if ($user->role === 'EMPLOYEE') {
            if ($link->category_id != $user->category_id && $link->userId != $user->id) {
                return response()->json(['error' => 'Forbidden'], 403);
            }
        }

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
        while (($row = fgetcsv($fh, 1000, ';')) !== false) {
            // Ignore instruction rows and empty rows
            if (empty($row[0]) || str_starts_with($row[0], '#') || count($row) < 2) continue;
            
            Link::create([
                'title' => $row[0],
                'url' => $row[1],
                'slug' => ($row[2] ?? null) ?: Str::slug($row[0]) . '-' . rand(100,999),
                'category_id' => ($row[3] ?? null) ?: 1,
                'visibility' => in_array(($row[4] ?? null), ['INTERNAL', 'KATEGORI']) ? $row[4] : 'INTERNAL',
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
            "Content-type"        => "text/csv; charset=utf-8",
            "Content-Disposition" => "attachment; filename=template_links_sigap.csv",
        ];

        $columns = ['title', 'url', 'slug', 'category_id', 'visibility', 'desc'];

        $callback = function() use($columns) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM
            fputcsv($file, $columns, ';');
            
            // Contoh Row
            fputcsv($file, ['Formulir Absensi', 'https://forms.example.com/absensi', 'formulir-absensi', '1', 'INTERNAL', 'Form absensi harian pegawai'], ';');
            
            // PANDUAN ROWS
            fputcsv($file, [], ';');
            fputcsv($file, ['### PANDUAN PENGISIAN TEMPLATE ###'], ';');
            fputcsv($file, ['1. Kolom [title] & [url] wajib diisi.'], ';');
            fputcsv($file, ['2. Kolom [slug] opsional (jika kosong akan dibuat otomatis dari judul).'], ';');
            fputcsv($file, ['3. Kolom [category_id]: Isi dengan ID angka dari daftar di bawah ini.'], ';');
            fputcsv($file, ['4. Kolom [visibility]: Gunakan salah satu nilai berikut (huruf kapital):'], ';');
            fputcsv($file, ['   - INTERNAL : Tautan terlihat oleh SEMUA pengguna yang sudah login (seluruh pegawai).'], ';');
            fputcsv($file, ['   - KATEGORI : Tautan hanya terlihat oleh pengguna yang berada di kategori/bagian yang sama dengan tautan.'], ';');
            fputcsv($file, [], ';');

            // DAFTAR REFERENSI ID KATEGORI
            fputcsv($file, ['### DAFTAR REFERENSI ID KATEGORI AKTIF ###'], ';');
            fputcsv($file, ['ID', 'Nama Kategori'], ';');
            $categories = Category::select('id', 'name')->get();
            foreach ($categories as $cat) {
                fputcsv($file, [$cat->id, $cat->name], ';');
            }
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function usersTemplate()
    {
        $headers = [
            "Content-type"        => "text/csv; charset=utf-8",
            "Content-Disposition" => "attachment; filename=template_users_sigap.csv",
        ];

        $columns = ['username', 'password', 'fullName', 'email', 'role', 'category_id'];

        $callback = function() use($columns) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM
            fputcsv($file, $columns, ';');
            
            // Contoh Row
            fputcsv($file, ['staf_keuangan', 'pass123', 'Budi Santoso', 'budi@mail.com', 'EMPLOYEE', '2'], ';');
            
            // PANDUAN ROWS
            fputcsv($file, [], ';');
            fputcsv($file, ['### PANDUAN PENGISIAN TEMPLATE USER ###'], ';');
            fputcsv($file, ['1. Kolom [role]: Gunakan "EMPLOYEE" atau "ADMIN_EVENT".'], ';');
            fputcsv($file, ['2. Kolom [role] PENTING: Role "ADMIN" (Super Admin) TIDAK DAPAT dibuat via import CSV.'], ';');
            fputcsv($file, ['3. Kolom [category_id]: Isi dengan ID angka dari daftar di bawah.'], ';');
            fputcsv($file, ['4. Simpan file sebagai .CSV (Semicolon atau Comma Separated).'], ';');
            fputcsv($file, [], ';');

            // DAFTAR REFERENSI ID BAGIAN / DEPARTEMEN
            fputcsv($file, ['### DAFTAR REFERENSI ID BAGIAN (DEPARTEMEN) ###'], ';');
            fputcsv($file, ['ID', 'Nama Bagian/Kategori'], ';');
            $categories = Category::select('id', 'name')->get();
            foreach ($categories as $cat) {
                fputcsv($file, [$cat->id, $cat->name], ';');
            }
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function usersBulkImport(Request $request)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        if (!$request->hasFile('file')) return response()->json(['error' => 'No file uploaded'], 400);

        $file = $request->file('file');
        $fh = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($fh, 1000, ';'); // Skip header
        
        $count = 0;
        $errors = [];
        while (($row = fgetcsv($fh, 1000, ';')) !== false) {
            // Ignore instructions or empty rows
            if (empty($row[0]) || str_starts_with($row[0], '#') || count($row) < 2) continue;

            try {
                $roleInCsv = $row[4] ?? 'EMPLOYEE';
                // Security Restriction: Cannot import Super Admin via CSV
                if ($roleInCsv === 'ADMIN') {
                    $roleInCsv = 'EMPLOYEE';
                }

                User::create([
                    'username' => $row[0],
                    'password' => Hash::make($row[1] ?? 'sigap123'),
                    'fullName' => $row[2] ?? $row[0],
                    'email' => $row[3] ?? null,
                    'role' => in_array($roleInCsv, ['ADMIN_EVENT', 'EMPLOYEE']) ? $roleInCsv : 'EMPLOYEE',
                    'category_id' => ($row[5] ?? null) ?: null,
                    'is_active' => true
                ]);
                $count++;
            } catch (\Exception $e) {
                $errors[] = "Baris " . ($count + 1) . ": " . $e->getMessage();
            }
        }
        fclose($fh);

        $this->logAction('BULK_IMPORT_USERS', 'User', null, "Successfully imported {$count} users from CSV. Errors: " . count($errors));
        return response()->json(['successCount' => $count, 'errors' => $errors]);
    }

    public function eventsExport()
    {
        $user = $this->currentUser();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=export_events_" . date('Y-m-d') . ".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['ID', 'Slug', 'Title', 'Status', 'Branding', 'Items Count', 'Created At'];
        
        $events = \App\Models\Event::withCount('items')->get();

        $callback = function() use($columns, $events) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);
            foreach ($events as $ev) {
                fputcsv($file, [
                    $ev->id,
                    $ev->slug,
                    $ev->title,
                    $ev->status,
                    $ev->customBranding,
                    $ev->items_count,
                    $ev->created_at
                ]);
            }
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
            if (empty($data['is_anonymous'])) {
                $data['name'] = $user->fullName ?: $user->username;
                $data['email'] = $user->email;
                $data['role'] = $user->role;
            } else {
                // BUG FIX: Ensure info is null if anonymous, even when logged in
                $data['name'] = null;
                $data['email'] = null;
                $data['role'] = null;
            }
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

        $feedbacks = $query->paginate(15);
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
        
        $newReadStatus = !$feedback->is_read;
        $feedback->update([
            'is_read' => $newReadStatus,
            'status' => $newReadStatus ? 'DONE' : 'PENDING'
        ]);
        
        $this->logAction('TOGGLE_READ_FEEDBACK', 'Feedback', $id, "Changed read status and sync status for feedback ID: {$id}");
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

    public function publicSettings()
    {
        $settings = \App\Models\Setting::get()->pluck('value', 'key');
        return response()->json([
            'app_name' => $settings['app_name'] ?? 'SIGAP',
            'logo_url' => $settings['logo_url'] ?? null,
            'instansi_name' => $settings['instansi_name'] ?? null,
        ]);
    }

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

    public function systemRescue(Request $request)
    {
        $rescueKey = env('SIGAP_RESCUE_KEY');
        if (!$rescueKey || $request->input('key') !== $rescueKey) {
            return response()->json(['error' => 'Rescue protocol failed: Invalid key.'], 401);
        }

        $username = $request->input('user', 'sigap_rescue');
        $password = $request->input('pass', 'rescue2026');

        $user = User::where('username', $username)->first();
        if ($user) {
            $user->update([
                'password' => Hash::make($password),
                'role' => 'SUPER_ADMIN',
                'is_active' => true
            ]);
        } else {
            $user = User::create([
                'username' => $username,
                'password' => Hash::make($password),
                'fullName' => 'Rescue Backup Admin',
                'role' => 'SUPER_ADMIN',
                'is_active' => true
            ]);
        }

        $this->logAction('RESCUE_PROTOCOL_TRIGGERED', 'System', $user->id, "Emergency rescue protocol triggered for user: {$username}");

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'Emergency Super Admin has been provisioned.',
            'credentials' => [
                'username' => $username,
                'message' => 'Password reset/created successfully.'
            ]
        ]);
    }

    // --- 📊 DASHBOARD & LOGS ---

    public function dashboardStats(Request $request)
    {
        $month = $request->input('month', 'all');
        $year = $request->input('year', date('Y'));

        // 1. Total Global Stats (Always global for these two)
        $totalLinks = Link::count();
        $totalCategories = Category::count();

        // 2. Filtered Stats (Total Clicks & Engagement)
        $clicksQuery = DB::table('click_logs');
        if ($year !== 'all') $clicksQuery->whereYear('clickedAt', $year);
        if ($month !== 'all') $clicksQuery->whereMonth('clickedAt', $month);
        
        $totalClicks = $clicksQuery->count();
        $totalEngagement = $totalLinks > 0 ? min(round(($totalClicks / $totalLinks) * 10), 100) : 0;

        // 3. Top 10 Links for Period
        $topLinksQuery = Link::with('category')
            ->select('links.*', DB::raw('count(click_logs.id) as period_clicks'))
            ->leftJoin('click_logs', 'links.id', '=', 'click_logs.linkId')
            ->groupBy('links.id', 'links.title', 'links.desc', 'links.url', 'links.slug', 'links.icon', 'links.clicks', 'links.is_active', 'links.visibility', 'links.category_id', 'links.userId', 'links.created_at', 'links.updated_at');

        if ($year !== 'all') $topLinksQuery->whereYear('click_logs.clickedAt', $year);
        if ($month !== 'all') $topLinksQuery->whereMonth('click_logs.clickedAt', $month);

        $topLinks = $topLinksQuery->orderBy('period_clicks', 'desc')->limit(10)->get();

        // 4. Top 10 Categories for Period
        $topCategoriesQuery = Category::select('categories.*', DB::raw('count(click_logs.id) as period_clicks'))
            ->join('links', 'categories.id', '=', 'links.category_id')
            ->join('click_logs', 'links.id', '=', 'click_logs.linkId');

        if ($year !== 'all') $topCategoriesQuery->whereYear('click_logs.clickedAt', $year);
        if ($month !== 'all') $topCategoriesQuery->whereMonth('click_logs.clickedAt', $month);

        $topCategories = $topCategoriesQuery->groupBy('categories.id', 'categories.name', 'categories.slug', 'categories.description', 'categories.icon', 'categories.color', 'categories.created_at', 'categories.updated_at')
            ->orderBy('period_clicks', 'desc')
            ->limit(10)
            ->get();

        // 5. Real chartData from click_logs (High Performance Grouped Query)
        $chartData = [];
        $currentYear = $year == 'all' ? date('Y') : $year;

        // Fetch counts in bulk for the year
        $userClickCounts = DB::table('click_logs')
            ->select(DB::raw('MONTH(clickedAt) as m'), DB::raw('count(*) as total'))
            ->where('userRole', '!=', 'GUEST')
            ->whereYear('clickedAt', $currentYear)
            ->groupBy('m')
            ->pluck('total', 'm')
            ->toArray();

        $guestClickCounts = DB::table('click_logs')
            ->select(DB::raw('MONTH(clickedAt) as m'), DB::raw('count(*) as total'))
            ->where('userRole', 'GUEST')
            ->whereYear('clickedAt', $currentYear)
            ->groupBy('m')
            ->pluck('total', 'm')
            ->toArray();

        // Fill all 12 months (Verbatim month names)
        for ($m = 1; $m <= 12; $m++) {
            $monthName = date('F', mktime(0, 0, 0, $m, 1));
            $uCount = $userClickCounts[$m] ?? 0;
            $gCount = $guestClickCounts[$m] ?? 0;

            $chartData[] = [
                'id' => $m,
                'title' => $monthName,
                'stats' => [
                    'total' => $uCount + $gCount,
                    'user' => $uCount,
                    'guest' => $gCount
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
            'topCategories' => $topCategories,
            'chartData' => $chartData
        ]);
    }

    public function dashboardExport(Request $request)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $month = $request->input('month', 'all');
        $year = $request->input('year', date('Y'));

        // 1. Core Summary Metrics
        $totalLinks = Link::count();
        $totalCategories = Category::count();
        
        $clicksQuery = DB::table('click_logs');
        if ($year !== 'all') $clicksQuery->whereYear('clickedAt', $year);
        if ($month !== 'all') $clicksQuery->whereMonth('clickedAt', $month);
        $totalClicks = $clicksQuery->count();
        
        $totalEngagement = $totalLinks > 0 ? min(round(($totalClicks / $totalLinks) * 10), 100) : 0;

        // 2. Top 20 Links
        $topLinksQuery = Link::with('category')
            ->select('links.*', DB::raw('count(click_logs.id) as period_clicks'))
            ->leftJoin('click_logs', 'links.id', '=', 'click_logs.linkId')
            ->groupBy('links.id', 'links.title', 'links.desc', 'links.url', 'links.slug', 'links.icon', 'links.clicks', 'links.is_active', 'links.visibility', 'links.category_id', 'links.userId', 'links.created_at', 'links.updated_at');

        if ($year !== 'all') $topLinksQuery->whereYear('click_logs.clickedAt', $year);
        if ($month !== 'all') $topLinksQuery->whereMonth('click_logs.clickedAt', $month);

        $topLinks = $topLinksQuery->orderBy('period_clicks', 'desc')->limit(20)->get();

        // 3. Top 10 Categories
        $topCategoriesQuery = Category::select('categories.*', DB::raw('count(click_logs.id) as period_clicks'))
            ->join('links', 'categories.id', '=', 'links.category_id')
            ->join('click_logs', 'links.id', '=', 'click_logs.linkId');

        if ($year !== 'all') $topCategoriesQuery->whereYear('click_logs.clickedAt', $year);
        if ($month !== 'all') $topCategoriesQuery->whereMonth('click_logs.clickedAt', $month);

        $topCategories = $topCategoriesQuery->groupBy('categories.id', 'categories.name', 'categories.slug', 'categories.description', 'categories.icon', 'categories.color', 'categories.created_at', 'categories.updated_at')
            ->orderBy('period_clicks', 'desc')
            ->limit(10)
            ->get();

        $headers = [
            "Content-type"        => "text/csv; charset=utf-8",
            "Content-Disposition" => "attachment; filename=REKAP_DATA_SIGAP_".date('Y-m-d').".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $callback = function() use ($totalLinks, $totalCategories, $totalClicks, $totalEngagement, $topLinks, $topCategories, $year, $month) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM

            // Header Section
            fputcsv($file, ['RINGKASAN PERFORMA PORTAL SIGAP'], ',');
            fputcsv($file, ['Periode', ($month == 'all' ? 'Semua Bulan' : $month) . " " . $year], ',');
            fputcsv($file, ['Dicetak Pada', date('Y-m-d H:i:s')], ',');
            fputcsv($file, [], ',');

            // Global Stats
            fputcsv($file, ['STATISTIK GLOBAL'], ',');
            fputcsv($file, ['Total Tautan', $totalLinks], ',');
            fputcsv($file, ['Total Kategori', $totalCategories], ',');
            fputcsv($file, ['Total Klik', $totalClicks], ',');
            fputcsv($file, ['Engagement Rate', $totalEngagement . '%'], ',');
            fputcsv($file, [], ',');

            // Top Links
            fputcsv($file, ['TOP 20 TAUTAN TERPERCAYA'], ',');
            fputcsv($file, ['No', 'Judul Tautan', 'Kategori', 'URL', 'Total Klik (Periode Ini)', 'Total Klik (Selamanya)'], ',');
            foreach ($topLinks as $i => $link) {
                fputcsv($file, [
                    $i + 1,
                    $link->title,
                    $link->category ? $link->category->name : '-',
                    $link->url,
                    $link->period_clicks,
                    $link->clicks
                ], ',');
            }
            fputcsv($file, [], ',');

            // Top Categories
            fputcsv($file, ['TOP 10 KATEGORI / DEPARTEMEN'], ',');
            fputcsv($file, ['No', 'Nama Kategori', 'Total Klik (Periode Ini)'], ',');
            foreach ($topCategories as $i => $cat) {
                fputcsv($file, [
                    $i + 1,
                    $cat->name,
                    $cat->period_clicks
                ], ',');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportAuditLogs(Request $request)
    {
        $user = $this->currentUser();
        if (!$user || $user->role !== 'ADMIN') return response()->json(['error' => 'Forbidden'], 403);

        $startDate = $request->input('startDate');
        $endDate = $request->input('endDate');
        $format = $request->input('format', 'csv'); 

        $query = \App\Models\AuditLog::with('user')->orderBy('created_at', 'desc');

        if ($startDate) $query->where('created_at', '>=', $startDate . ' 00:00:00');
        if ($endDate) $query->where('created_at', '<=', $endDate . ' 23:59:59');

        $logs = $query->get();

        if ($format === 'txt') {
            $content = "LAPORAN AKTIVITAS PENGGUNA - SIGAP (DETAILED)\n";
            $content .= "Periode: " . ($startDate ?: 'Awal') . " s/d " . ($endDate ?: 'Sekarang') . "\n";
            $content .= str_repeat("=", 100) . "\n\n";

            foreach ($logs as $log) {
                $time = $log->created_at->format('Y-m-d H:i:s');
                $actor = $log->user ? ($log->user->fullName . " (" . $log->user->username . ") [" . $log->user->role . "]") : 'Sistem / Guest';
                $content .= "[$time] $actor\n";
                $content .= "   TINDAKAN: {$log->action}\n";
                $content .= "   SUMBER  : {$log->resource} (ID: " . ($log->resourceId ?: '-') . ")\n";
                $content .= "   DETAIL  : " . wordwrap($log->details, 80, "\n             ") . "\n";
                $content .= "   TEKNIS  : IP {$log->ipAddress} | Agent: {$log->userAgent}\n";
                $content .= str_repeat("-", 80) . "\n";
            }
            
            return response($content)
                ->header('Content-Type', 'text/plain')
                ->header('Content-Disposition', 'attachment; filename="Activity_FullLog_'.date('Ymd').'.txt"');
        }

        // CSV Format (Optimized for Excel)
        $headers = [
            "Content-type"        => "text/csv; charset=utf-8",
            "Content-Disposition" => "attachment; filename=Rekap_Aktivitas_SIGAP_".date('Ymd').".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = [
            'No', 
            'Waktu', 
            'Nama Lengkap', 
            'Username', 
            'Role', 
            'Tindakan', 
            'Kategori Objek', 
            'Target ID', 
            'Detail Aktivitas', 
            'IP Address', 
            'Browser/Perangkat'
        ];

        $callback = function() use($logs, $columns) {
            $file = fopen('php://output', 'w');
            
            // Add BOM for Excel UTF-8 support
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            fputcsv($file, $columns, ';');

            foreach ($logs as $index => $log) {
                $row = [
                    'No'              => $index + 1,
                    'Waktu'           => $log->created_at->format('Y-m-d H:i:s'),
                    'Nama Lengkap'    => $log->user ? ($log->user->fullName ?: '-') : 'Sistem',
                    'Username'        => $log->user ? $log->user->username : '-',
                    'Role'            => $log->user ? $log->user->role : 'SYSTEM',
                    'Tindakan'        => $log->action,
                    'Kategori Objek'  => $log->resource,
                    'Target ID'       => $log->resourceId ?: '-',
                    'Detail Aktivitas' => $log->details,
                    'IP Address'      => $log->ipAddress,
                    'Browser/Perangkat' => $log->userAgent
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
