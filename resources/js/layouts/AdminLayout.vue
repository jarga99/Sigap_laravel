<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE_URL } from '../lib/config'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import SIGAPIcons from '../components/SIGAPIcons.vue'
import api from '@/lib/axios'
import QRCode from 'qrcode'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isMobileOpen = ref(false)
const settingsStore = useSettingsStore()
const settings = computed(() => settingsStore.settings)

// --- PRO-ONLY LIGHT THEME (Pembersihan Dark Mode) ---
onMounted(() => {
  document.documentElement.classList.remove('dark')
  localStorage.setItem('theme', 'light')
})

const user = computed(() => authStore.user || {})
const API_URL = API_BASE_URL

const userPhoto = computed(() => {
  const user = authStore.user
  if (!user) return null
  const photoPath = user.image_url || user.photo
  if (!photoPath) return null
  const fileName = photoPath.split('/').pop()
  return `${API_URL}/uploads/profiles/${fileName}`
})

const userInitials = computed(() => {
  const name = user.value.name || user.value.username || 'U'
  return name.charAt(0).toUpperCase()
})

const navItems = computed(() => {
  const userRole = authStore.user?.role || ''
  const allItems = [
    { label: 'Dashboard', to: '/admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Links', to: '/admin/links', icon: 'Link' },
    { label: 'Sigap Events', to: '/admin/events', icon: 'Sparkles' },
    { label: 'Kategori', to: '/admin/categories', icon: 'Layers' },
    { label: 'Logs Aktivitas', to: '/admin/audit-logs', icon: 'ClipboardList' },
    { label: 'Users', to: '/admin/users', icon: 'Users', onlyAdmin: true },
    { label: 'Profil', to: '/admin/profile', icon: 'UserCircle' },
    { label: 'Pengaturan', to: '/admin/settings', icon: 'Settings', onlyAdmin: true },
    { label: 'Kotak Saran', to: '/admin/feedback', icon: 'MessageSquare', onlyAdmin: true },
  ]

  return allItems.filter(item => {
    if (userRole === 'EMPLOYEE') {
      const employeeMenus = ['/admin/dashboard', '/admin/links', '/admin/events', '/admin/categories', '/admin/audit-logs', '/admin/profile', '/admin/feedback']
      return employeeMenus.some(path => item.to === path || item.to.startsWith(path))
    }
    if (userRole === 'ADMIN_EVENT') {
      const adminEventMenus = ['/admin/dashboard', '/admin/events', '/admin/audit-logs', '/admin/profile', '/admin/feedback']
      return adminEventMenus.some(path => item.to === path || item.to.startsWith(path))
    }
    if (item.onlyAdmin) return userRole === 'ADMIN'
    return true
  })
})

const isNotificationOpen = ref(false)
const notifications = ref([])
const unreadCount = ref(0)

const fetchNotifications = async () => {
  try {
    const { data } = await api.get('/notifications')
    notifications.value = data.notifications
    unreadCount.value = data.unreadCount
  } catch (err) { console.error('Gagal memuat notifikasi', err) }
}

const toggleNotifications = () => {
  isNotificationOpen.value = !isNotificationOpen.value
  if (isNotificationOpen.value && unreadCount.value > 0) {
    api.put('/notifications').then(() => {
      unreadCount.value = 0
      notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
    })
  }
}

const handleLogout = () => {
  authStore.logout()
  router.replace('/login')
}

// QR Code Logic Simplified
const isQrModalOpen = ref(false)
const qrCanvas = ref(null)
const activeSlug = ref('')
const qrTargetUrl = computed(() => {
  const base = window.location.origin
  return activeSlug.value ? `${base}/e/${activeSlug.value}` : `${base}/`
})

const generateQR = async () => {
  isQrModalOpen.value = true
  setTimeout(async () => {
    if (qrCanvas.value) {
      await QRCode.toCanvas(qrCanvas.value, qrTargetUrl.value, { width: 250, margin: 2 })
    }
  }, 100)
}

const downloadQr = () => {
  const link = document.createElement('a')
  link.href = qrCanvas.value.toDataURL('image/png')
  link.download = `QR-Event-${activeSlug.value || 'Portal'}.png`
  link.click()
}

import { provide } from 'vue'
provide('setActiveSlug', (slug) => { activeSlug.value = slug })

onMounted(() => {
  fetchNotifications()
  setInterval(fetchNotifications, 120000)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden text-slate-900">
    <!-- Navbar Header -->
    <nav class="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 h-16 flex items-center justify-between shadow-sm">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200 overflow-hidden">
          <img v-if="settings.logo_url" :src="settings.logo_url.startsWith('http') ? settings.logo_url : API_URL + settings.logo_url" class="w-full h-full object-contain p-1" />
          <span v-else class="font-bold text-blue-600">S</span>
        </div>
        <div class="leading-tight hidden lg:block">
          <div class="font-bold text-slate-800 text-sm uppercase tracking-tight">{{ settings.app_name || 'SIGAP ADMIN' }}</div>
          <div class="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{{ settings.instansi_name || 'Portal Layanan' }}</div>
        </div>
      </div>

      <!-- Desktop Nav -->
      <div class="hidden md:flex items-center gap-1">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all"
          :class="route.path.startsWith(item.to) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'">
          <SIGAPIcons :name="item.icon" :size="18" />
          <span class="hidden xl:inline-block truncate max-w-[120px]">{{ item.label }}</span>
        </router-link>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1">
           <!-- Notifications -->
           <div class="relative">
              <button @click="toggleNotifications" class="p-2 rounded-full text-slate-600 hover:bg-slate-100 relative">
                <SIGAPIcons name="Bell" :size="20" />
                <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {{ unreadCount > 9 ? '9+' : unreadCount }}
                </span>
              </button>

              <div v-if="isNotificationOpen" class="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-[100] overflow-hidden animate-fadeup">
                <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider">Notifikasi</h4>
                  <span class="text-[10px] font-bold text-slate-400">{{ notifications.length }} Pesan</span>
                </div>
                <div class="max-h-64 overflow-y-auto">
                   <div v-if="notifications.length === 0" class="p-8 text-center text-slate-400 text-xs">Kosong</div>
                   <div v-else v-for="notif in notifications" :key="notif.id" class="p-3 border-b border-slate-50 hover:bg-slate-50 text-xs">
                      <p :class="!notif.isRead ? 'font-bold text-slate-800' : 'text-slate-500'">{{ notif.message }}</p>
                      <span class="text-[9px] text-slate-300 mt-1 block">{{ new Date(notif.createdAt).toLocaleDateString() }}</span>
                   </div>
                </div>
              </div>
           </div>

           <a href="/" target="_blank" title="Lihat Portal" class="p-2 rounded-full text-slate-600 hover:bg-slate-100">
             <SIGAPIcons name="ExternalLink" :size="20" />
           </a>
        </div>

        <div class="h-8 w-px bg-slate-100 hidden sm:block"></div>

        <!-- Profil User -->
        <div class="flex items-center gap-2">
          <div class="hidden sm:block text-right">
            <div class="font-bold text-xs text-slate-700 leading-none mb-1">{{ user.fullName || user.username }}</div>
            <div class="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{{ user.role === 'ADMIN' ? 'Administrator' : 'Staff' }}</div>
          </div>
          <div class="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
            <img v-if="userPhoto" :src="userPhoto" class="w-full h-full object-cover" />
            <span v-else class="font-black text-blue-600 text-xs">{{ userInitials }}</span>
          </div>
        </div>

        <button @click="handleLogout" class="p-2 text-red-500 hover:bg-red-50 rounded-full transition">
          <SIGAPIcons name="LogOut" :size="20" />
        </button>

        <button @click="isMobileOpen = !isMobileOpen" class="md:hidden p-1 text-slate-600">
           <SIGAPIcons :name="isMobileOpen ? 'X' : 'Menu'" :size="24" />
        </button>
      </div>
    </nav>

    <!-- Mobile Menu -->
    <div v-if="isMobileOpen" class="md:hidden bg-white border-b border-slate-200 animate-fadedown">
      <div class="p-3 space-y-1">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to" @click="isMobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 font-bold"
          active-class="bg-blue-50 text-blue-700">
          <SIGAPIcons :name="item.icon" :size="20" />
          {{ item.label }}
        </router-link>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Footer -->
    <footer class="py-10 bg-white border-t border-slate-100 text-center text-[11px] text-slate-400">
      <p class="font-bold mb-1">{{ settings.app_name }} &copy; 2026 Administrator</p>
      <p class="opacity-70 tracking-tight">System designed for ultra-fast performance by wiradika.jr</p>
    </footer>

    <!-- QR Modal (Simplified) -->
    <div v-if="isQrModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="isQrModalOpen = false"></div>
      <div class="relative bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-fadeup border border-white">
        <h3 class="font-bold text-slate-800 mb-6 flex items-center justify-center gap-2">
           <SIGAPIcons name="Link" :size="20" class="text-emerald-500" /> Bagikan Akses
        </h3>
        <div class="bg-slate-50 p-4 rounded-2xl inline-block mb-6 shadow-inner border border-slate-100">
           <canvas ref="qrCanvas" class="mx-auto rounded-lg"></canvas>
        </div>
        <p class="text-[10px] text-slate-400 mb-6 font-mono break-all">{{ qrTargetUrl }}</p>
        <div class="flex gap-3">
           <button @click="downloadQr" class="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 transition-all">Unduh QR</button>
           <button @click="isQrModalOpen = false" class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold text-xs transition-all">Tutup</button>
        </div>
      </div>
    </div>

    <!-- Floating QR Trigger (Only on Event Routes) -->
    <button v-if="route.name === 'admin-event-editor'" 
      @click="generateQR"
      class="fixed bottom-8 right-8 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-emerald-200 hover:-translate-y-1 transition-all z-40">
      <SIGAPIcons name="Link" :size="24" />
    </button>
  </div>
</template>

<style>
.animate-fadeup { animation: fadeup 0.3s ease-out; }
@keyframes fadeup { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.animate-fadedown { animation: fadedown 0.2s ease-out; }
@keyframes fadedown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

.page-enter-active, .page-leave-active { transition: opacity 0.2s, transform 0.2s; }
.page-enter-from { opacity: 0; transform: translateY(5px); }
.page-leave-to { opacity: 0; transform: translateY(-5px); }

/* Custom Scrollbar for extreme lightweight feel */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>