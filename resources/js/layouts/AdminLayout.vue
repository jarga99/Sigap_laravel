<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { API_BASE_URL } from '../lib/config'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import SIGAPIcons from '../components/SIGAPIcons.vue'
import api from '@/lib/axios'
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
  
  // If it's already a full URL (e.g., Google or absolute path), return as is
  if (photoPath.startsWith('http')) return photoPath
  
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
    { label: 'Users', to: '/admin/users', icon: 'Users', onlyAdmin: true },
    { label: 'Profil', to: '/admin/profile', icon: 'UserCircle' },
    { label: 'Pengaturan', to: '/admin/settings', icon: 'Settings', onlyAdmin: true },
    { label: 'Kotak Saran', to: '/admin/feedback', icon: 'MessageSquare', onlyAdmin: true },
  ]

  return allItems.filter(item => {
    if (userRole === 'EMPLOYEE') {
      const employeeMenus = ['/admin/dashboard', '/admin/links', '/admin/events', '/admin/categories', '/admin/profile', '/admin/feedback']
      return employeeMenus.some(path => item.to === path || item.to.startsWith(path))
    }
    if (userRole === 'ADMIN_EVENT') {
      const adminEventMenus = ['/admin/dashboard', '/admin/events', '/admin/profile', '/admin/feedback']
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
    api.post('/notifications/read').then(() => {
      unreadCount.value = 0
      notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
    })
  }
}

const handleLogout = () => {
  authStore.logout()
  router.replace('/login')
}

// --- 💬 FLOATING FEEDBACK LOGIC ---
const isFeedbackModalOpen = ref(false)
const isSubmittingFeedback = ref(false)
const feedbackForm = ref({
  comment: '',
  is_anonymous: false,
  file: null,
  previewUrl: ''
})

const handleFeedbackFile = (e) => {
  const file = e.target.files[0]
  if (!file) return
  feedbackForm.value.file = file
  feedbackForm.value.previewUrl = URL.createObjectURL(file)
}

const submitFeedback = async () => {
  if (!feedbackForm.value.comment.trim()) return
  
  isSubmittingFeedback.value = true
  try {
    const fd = new FormData()
    fd.append('comment', feedbackForm.value.comment)
    fd.append('is_anonymous', feedbackForm.value.is_anonymous ? '1' : '0')
    if (feedbackForm.value.file) {
      fd.append('file', feedbackForm.value.file)
    }

    const res = await api.post('/feedback', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (res.data.status === 'success') {
      alert('Terima kasih! Saran anda telah kami terima.')
      isFeedbackModalOpen.value = false
      feedbackForm.value = { comment: '', is_anonymous: false, file: null, previewUrl: '' }
    }
  } catch (err) {
    alert('Gagal mengirim saran. Silakan coba lagi.')
  } finally {
    isSubmittingFeedback.value = false
  }
}

// --- 🖱️ DRAGGABLE LOGIC ---
const dragPosition = ref({ x: 0, y: 0 })
const isDragging = ref(false)
let startX = 0
let startY = 0
let hasMoved = false

const startDrag = (e) => {
  isDragging.value = true
  hasMoved = false
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  startX = clientX - dragPosition.value.x
  startY = clientY - dragPosition.value.y
  
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', onDrag)
  window.addEventListener('touchend', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  hasMoved = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  dragPosition.value = {
    x: clientX - startX,
    y: clientY - startY
  }
}

const stopDrag = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
}

const handleFeedbackClick = () => {
  if (!hasMoved) {
    isFeedbackModalOpen.value = true
  }
}

const goToNotification = async (notif) => {
  isNotificationOpen.value = false
  try {
    // Mark as read specifically
    await api.put(`/notifications/${notif.id}/read`)
    fetchNotifications() // Reload list immediately so next unread pops in (FIFO)
    
    if (notif.link) {
      router.push(notif.link)
    }
  } catch (err) { console.error(err) }
}

let intervalId

onMounted(() => {
  fetchNotifications()
  intervalId = setInterval(fetchNotifications, 300000) // Cek setiap 5 menit
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] flex flex-col font-sans overflow-x-hidden text-slate-800">
    <!-- Navbar Header -->
    <nav class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 h-16 flex items-center justify-between shadow-xl shadow-slate-900/10 transition-all">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg border border-slate-700 overflow-hidden group hover:border-blue-500 transition-all">
          <img v-if="settings.logo_url" :src="settings.logo_url.startsWith('http') ? settings.logo_url : API_URL + settings.logo_url" class="w-full h-full object-contain p-2" />
          <span v-else class="font-black text-blue-400 text-xl">S</span>
        </div>
        <div class="leading-tight hidden lg:block">
          <div class="font-black text-white text-sm tracking-tight">{{ settings.app_name || 'Sigap Admin' }}</div>
          <div class="text-[10px] text-slate-500 font-bold tracking-widest uppercase opacity-80">{{ settings.instansi_name || 'Portal layanan' }}</div>
        </div>
      </div>

      <!-- Desktop Nav -->
      <div class="hidden md:flex items-center gap-1">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
          :class="route.path.startsWith(item.to) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'">
          <SIGAPIcons :name="item.icon" :size="16" />
          <span class="hidden xl:inline-block truncate max-w-[120px]">{{ item.label }}</span>
        </router-link>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1">
           <!-- Notifications -->
           <div class="relative">
              <button @click="toggleNotifications" class="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white relative transition-all">
                <SIGAPIcons name="Bell" :size="20" />
                <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
                  {{ unreadCount > 9 ? '9+' : unreadCount }}
                </span>
              </button>

              <div v-if="isNotificationOpen" class="absolute right-0 mt-3 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 z-[100] overflow-hidden animate-fadeup">
                <div class="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                  <h4 class="font-black text-slate-200 text-[10px] tracking-widest uppercase">Notifikasi</h4>
                  <span class="text-[10px] font-bold text-slate-500">{{ notifications.length }} pesan</span>
                </div>
                <div class="max-h-64 overflow-y-auto">
                   <div v-if="notifications.length === 0" class="p-8 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">Kosong</div>
                   <div v-else v-for="notif in notifications" :key="notif.id" 
                      @click="goToNotification(notif)"
                      class="p-4 border-b border-slate-800 hover:bg-slate-800 transition-colors text-xs cursor-pointer group/notif">
                      <p :class="!notif.isRead ? 'font-black text-white group-hover/notif:text-blue-400' : 'text-slate-400 font-medium group-hover/notif:text-slate-200'">{{ notif.message }}</p>
                      <span class="text-[9px] text-slate-600 font-bold mt-1.5 block group-hover/notif:text-slate-500">{{ new Date(notif.createdAt).toLocaleDateString() }}</span>
                   </div>
                </div>
                <div @click="router.push('/admin/notifications'); isNotificationOpen = false" class="p-3 bg-slate-800/80 hover:bg-slate-700 text-center cursor-pointer transition-all">
                   <span class="text-[10px] font-black uppercase tracking-widest text-[#4f86e8] hover:text-blue-300">Lihat Semua Notifikasi</span>
                </div>
              </div>
           </div>

           <a href="/" target="_blank" title="Lihat Portal" class="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all border border-transparent hover:border-slate-700">
             <SIGAPIcons name="ExternalLink" :size="18" />
             <span class="hidden lg:inline-block text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Portal Layanan</span>
           </a>
        </div>

        <div class="h-8 w-px bg-slate-800 hidden sm:block"></div>

        <!-- Profil User -->
        <div class="flex items-center gap-2">
          <div class="hidden sm:block text-right leading-tight max-w-[150px]">
            <div class="font-black text-xs text-white truncate">{{ user.fullName || user.username }}</div>
            <div class="text-[9px] text-slate-500 font-black tracking-widest uppercase truncate">{{ user.role === 'ADMIN' ? 'Administrator' : 'Staff' }}</div>
          </div>
          <div class="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 overflow-hidden shadow-lg">
            <img v-if="userPhoto" :src="userPhoto" class="w-full h-full object-cover" />
            <span v-else class="font-black text-blue-400 text-xs">{{ userInitials }}</span>
          </div>
        </div>

        <button @click="handleLogout" class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
          <SIGAPIcons name="LogOut" :size="20" />
        </button>

        <button @click="isMobileOpen = !isMobileOpen" class="md:hidden p-1 text-slate-400">
           <SIGAPIcons :name="isMobileOpen ? 'X' : 'Menu'" :size="24" />
        </button>
      </div>
    </nav>

    <!-- Mobile Menu -->
    <div v-if="isMobileOpen" class="md:hidden bg-slate-900 border-b border-slate-800 animate-fadedown">
      <div class="p-3 space-y-1">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to" @click="isMobileOpen = false"
          class="flex items-center gap-3 px-6 py-4 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] transition-all"
          active-class="bg-blue-600 text-white shadow-lg shadow-blue-500/20">
          <SIGAPIcons :name="item.icon" :size="18" />
          {{ item.label }}
        </router-link>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 p-4 md:p-6 lg:px-8 w-full">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Footer -->
    <footer class="py-16 bg-slate-900 border-t border-slate-800 text-center text-[11px] text-slate-500">
      <p class="font-black mb-1 text-slate-300 tracking-tight">{{ settings.app_name }} &copy; 2026 Administrator Portal</p>
      <p class="opacity-100 font-bold text-slate-500 uppercase tracking-widest text-[9px]">System designed for ultimate performance by wiradika.jr</p>
    </footer>

    <!-- 🚀 FLOATING FEEDBACK BUTTON (Visible for non-admin global managers) -->
    <button v-if="user.role !== 'ADMIN'" 
       @mousedown="startDrag"
       @touchstart="startDrag"
       @click="handleFeedbackClick"
       :style="{ transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)`, cursor: isDragging ? 'grabbing' : 'grab' }"
       class="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-2xl shadow-blue-500/40 flex items-center justify-center transition-transform duration-75 z-[90] group select-none">
       <SIGAPIcons name="MessageSquare" :size="28" class="group-hover:rotate-12 transition-transform" />
    </button>

    <!-- 💬 FEEDBACK MODAL -->
    <Teleport to="body">
       <div v-if="isFeedbackModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="isFeedbackModalOpen = false"></div>
          <div class="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-fadeup border border-slate-100">
             <div class="p-8 border-b border-slate-50 flex justify-between items-center bg-[#f4f8ff]/50">
                <div>
                   <h3 class="font-black text-slate-800 text-xl tracking-tighter uppercase">Kirim Saran</h3>
                   <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Sampaikan masukan anda kepada administrator</p>
                </div>
                <button @click="isFeedbackModalOpen = false" class="p-2 text-slate-300 hover:text-slate-500 transition-all">
                   <SIGAPIcons name="X" :size="24" />
                </button>
             </div>

             <div class="p-8 space-y-6">
                <div class="space-y-3">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pesan / Masukan</label>
                   <textarea v-model="feedbackForm.comment" rows="5" placeholder="Tuliskan saran, keluhan, atau ide fitur baru..." 
                             class="w-full bg-[#f4f8ff] border-2 border-transparent focus:border-blue-300 focus:bg-white rounded-2xl p-5 text-sm font-bold outline-none transition-all resize-none"></textarea>
                </div>

                <div class="space-y-3">
                   <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lampiran Gambar (Opsional)</label>
                   
                   <div v-if="feedbackForm.previewUrl" class="relative w-full aspect-video bg-blue-50 rounded-2xl overflow-hidden border-2 border-blue-100 group shadow-md">
                      <img :src="feedbackForm.previewUrl" class="w-full h-full object-cover" />
                      <button @click="feedbackForm.file = null; feedbackForm.previewUrl = ''" class="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95">
                         <SIGAPIcons name="Trash2" :size="16" />
                      </button>
                   </div>
                   
                   <div v-else class="relative h-24 w-full border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-400 transition-all group overflow-hidden bg-slate-50 flex items-center justify-center">
                      <input type="file" @change="handleFeedbackFile" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div class="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-500">
                         <SIGAPIcons name="Image" :size="24" />
                         <span class="text-[9px] font-black uppercase tracking-widest">Pilih Gambar</span>
                      </div>
                   </div>
                </div>

                <div class="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-white shadow-sm">
                   <div>
                      <p class="text-[10px] font-black text-slate-800 uppercase tracking-tighter">Kirim sebagai Anonim</p>
                      <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sembunyikan nama anda</p>
                   </div>
                   <button @click="feedbackForm.is_anonymous = !feedbackForm.is_anonymous"
                      :class="feedbackForm.is_anonymous ? 'bg-blue-600' : 'bg-slate-300'"
                      class="w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner">
                      <div :class="feedbackForm.is_anonymous ? 'translate-x-6' : 'translate-x-1'" 
                           class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-lg"></div>
                   </button>
                </div>

                <button @click="submitFeedback" :disabled="!feedbackForm.comment.trim() || isSubmittingFeedback" 
                        class="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                   <span v-if="!isSubmittingFeedback">Kirim Sekarang</span>
                   <span v-else class="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                </button>
             </div>
          </div>
       </div>
    </Teleport>
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