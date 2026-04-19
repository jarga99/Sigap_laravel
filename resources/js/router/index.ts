/** 
 * SIGAP Platform - Framework Keamanan & Lisensi Terpadu
 * Dibuat secara orisinal oleh wiradika.jr (Copyright © 2026)
 * Upaya penggandaan atau penggunaan tanpa seizin pengembang adalah tindakan ilegal.
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

// Layouts
import AdminLayout from '../layouts/AdminLayout.vue'

// Views Public
import PortalView from '../views/PortalView.vue'
import LoginView from '../views/LoginView.vue'

// Views Admin (Sesuai struktur Anda) - Lazy Loaded
const AdminDashboard = () => import('../views/admin/DashboardView.vue')
const LinksIndex = () => import('../views/admin/LinksIndex.vue')
const CategoriesIndex = () => import('../views/admin/CategoriesIndex.vue')
const SettingsView = () => import('../views/admin/SettingsView.vue')
// TAMBAHAN BARU (Supaya tidak error "No match found")
const UsersIndex = () => import('../views/admin/UsersIndex.vue')
const AdminProfileView = () => import('../views/admin/ProfileView.vue')
const FeedbackView = () => import('../views/admin/FeedbackView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- PUBLIC ROUTES ---
    {
      path: '/',
      name: 'home',
      component: PortalView,
      meta: { requiresAuth: false, title: 'Portal Utama' }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true, title: 'Login Admin' }
    },

    // --- ADMIN ROUTES ---
    {
      path: '/e/:slug',
      name: 'event-landing',
      component: () => import('../views/EventLinkView.vue'),
      meta: { title: 'Event' }
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/admin/dashboard'
        },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: AdminDashboard,
          meta: { title: 'Dashboard' }
        },
        {
          path: 'links',
          name: 'admin-links',
          component: LinksIndex,
          meta: { title: 'Manajemen Tautan' }
        },
        {
          path: 'categories',
          name: 'admin-categories',
          component: CategoriesIndex,
          meta: { title: 'Kategori' }
        },
        // --- FIX: RUTE YANG HILANG ---
        {
          path: 'events',
          name: 'admin-events',
          component: () => import('../views/admin/EventsManagement.vue'),
          meta: { title: 'Manajemen Event' }
        },
        {
          path: 'events/edit/:id',
          name: 'admin-event-editor',
          component: () => import('../views/admin/EventEditorView.vue'),
          meta: { title: 'Edit Event' }
        },
        {
          path: 'users',
          name: 'admin-users',
          component: UsersIndex,
          meta: { title: 'Manajemen User' }
        },
        {
          path: 'profile',
          name: 'admin-profile',
          component: AdminProfileView,
          meta: { title: 'Profil Saya' }
        },
        // -----------------------------
        {
          path: 'settings',
          name: 'admin-settings',
          component: SettingsView,
          meta: { title: 'Pengaturan Sistem' }
        },
        {
          path: 'feedback',
          name: 'admin-feedback',
          component: FeedbackView,
          meta: { title: 'Kotak Saran' }
        },
        {
          path: 'notifications',
          name: 'admin-notifications',
          component: () => import('../views/admin/NotificationsView.vue'),
          meta: { title: 'Riwayat Notifikasi' }
        }
      ]
    },

    // --- SHORT URL REDIRECT ---
    {
      path: '/s/:slug',
      name: 'short-link',
      component: PortalView,
    }
  ]
})

// Helper for JWT Expiry Detection
function isTokenExpired(token: string | null) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
}

// Navigation Guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 1. Session Expiry Check
  if (authStore.token && isTokenExpired(authStore.token)) {
    authStore.logout(); // Bersihkan token
    if (to.meta.requiresAuth) {
      return next('/login');
    }
  }

  // 2. Requires Auth Check
  if (to.meta.requiresAuth) {
    if (!authStore.token) {
      return next('/login')
    }
    
    // Perbaikan Bug Login: Jika token ada tapi belum diverifikasi oleh backend (cold start)
    // Verifikasi sekali di awal sebelum mengizinkan masuk ke dashboard
    if (!authStore.isVerified) {
      console.log("🚦 [ROUTER GUARD]: Memverifikasi token via syncProfile...");
      authStore.syncProfile().then(success => {
        if (success) {
          console.log("✅ [ROUTER GUARD]: syncProfile Berhasil! Melanjutkan ke", to.fullPath);
          router.push(to.fullPath) // Re-trigger navigation after sync
        } else {
          console.warn("🛑 [ROUTER GUARD]: syncProfile GAGAL! Kehilangan sesi, kembali ke login.");
          router.push('/login')
        }
      }).catch(err => {
         console.error("💥 [ROUTER GUARD]: INTERNAL ERROR FATAL saat memanggil syncProfile:", err);
         router.push('/login')
      })
      return // Halt current navigation until sync finishes
    }
  }
  
  // 3. Guest Only Check
  if (to.meta.guest && authStore.token) {
    return next('/')
  }

  // 4. RBAC Check for ADMIN_EVENT
  if (to.path.startsWith('/admin') && authStore.user?.role === 'ADMIN_EVENT') {
    // ADMIN_EVENT diizinkan mengakses dashboard dan fitur operasional kecuali Users, Settings, & Categories
    const forbiddenPaths = ['/admin/users', '/admin/settings', '/admin/categories'];
    if (forbiddenPaths.some(path => to.path.startsWith(path))) {
      return next('/admin/dashboard');
    }
  }

  // 5. LICENSE PROTECTION (Stage B)
  const settingsStore = useSettingsStore()
  // Jika lisensi terdeteksi ILEGAL dan mencoba masuk ke Admin/Settings yang kritikal
  if (settingsStore.settings._license?.status === 'UNAUTHORIZED' && to.path.includes('/admin/settings')) {
    // Blokir akses ke pengaturan sistem untuk mencegah modifikasi lebih lanjut
    console.error('PRO-PROTECTION: Lisensi Ilegal Terdeteksi di domain ini.');
    return next('/admin/dashboard')
  }

  next()
})

export default router