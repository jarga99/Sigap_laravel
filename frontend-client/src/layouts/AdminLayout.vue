<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { API_BASE_URL } from '../lib/config'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

import {
  LayoutDashboard,
  Link as LinkIcon,
  Layers,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Sun,
  Moon,
  ClipboardList,
  ExternalLink,
  Sparkles,
  Menu,
  X,
  MessageSquare,
  Send,
  LifeBuoy,
  Camera,
  Trash2,
  Bell,
  Inbox,
  AlertTriangle,
  ServerOff,
  ShieldAlert
} from 'lucide-vue-next'
import api from '@/lib/axios'
import axios from 'axios'
import QRCode from 'qrcode'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isMobileOpen = ref(false)
const settingsStore = useSettingsStore()
const settings = computed(() => settingsStore.settings)

// --- FITUR MULTI BAHASA & DARK MODE ---
const isDarkMode = ref(localStorage.getItem('theme') === 'dark')

watch(isDarkMode, (val) => {
  const html = document.documentElement
  val ? html.classList.add('dark') : html.classList.remove('dark')
  localStorage.setItem('theme', val ? 'dark' : 'light')
}, { immediate: true })

// --- PERBAIKAN LOGIKA USER & FOTO ---
const user = computed(() => authStore.user || {})

// 1. Definisikan API_URL untuk profil dan aset
const API_URL = API_BASE_URL

const userPhoto = computed(() => {
  const user = authStore.user
  if (!user) return null

  // Ambil data foto dari field yang ada di database
  const photoPath = user.image_url || user.photo

  if (!photoPath) return null

  // Ambil hanya nama filenya saja (pop) untuk menghindari URL ganda
  const fileName = photoPath.split('/').pop()

  // Arahkan ke folder Backend
  return `${API_URL}/uploads/profiles/${fileName}`
})

const userInitials = computed(() => {
  const name = user.value.name || user.value.username || 'U'
  return name.charAt(0).toUpperCase()
})

// 2. Logic Menu Dinamis
const navItems = computed(() => {
  // Ambil role user, default ke string kosong jika null
  const userRole = authStore.user?.role || ''

  // Daftar Semua Menu
  const allItems = [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Links', to: '/admin/links', icon: LinkIcon },
    { label: 'Sigap Events', to: '/admin/events', icon: Sparkles },
    { label: 'Kategori', to: '/admin/categories', icon: Layers },
    { label: 'Logs Aktivitas', to: '/admin/audit-logs', icon: ClipboardList },

    // Menu Khusus Admin
    {
      label: 'Users',
      to: '/admin/users',
      icon: Users,
      onlyAdmin: true // Penanda khusus
    },

    { label: 'Profil', to: '/admin/profile', icon: UserCircle },

    {
      label: 'Pengaturan',
      to: '/admin/settings',
      icon: Settings,
      onlyAdmin: true // Penanda khusus
    },
    {
      label: 'Kotak Saran',
      to: '/admin/feedback',
      icon: MessageSquare,
      onlyAdmin: true
    },
  ]

  // Filter menu berdasarkan Role
  return allItems.filter(item => {
    // 1. Role Pegawai (EMPLOYEE)
    if (userRole === 'EMPLOYEE') {
      const employeeMenus = [
        '/admin/dashboard', 
        '/admin/links', 
        '/admin/events', 
        '/admin/categories', 
        '/admin/audit-logs', 
        '/admin/profile',
        '/admin/feedback'
      ]
      return employeeMenus.some(path => item.to === path || item.to.startsWith(path))
    }

    // 2. Role Admin Event (ADMIN_EVENT)
    if (userRole === 'ADMIN_EVENT') {
      const adminEventMenus = [
        '/admin/dashboard', 
        '/admin/events', 
        '/admin/audit-logs', 
        '/admin/profile',
        '/admin/feedback'
      ]
      return adminEventMenus.some(path => item.to === path || item.to.startsWith(path))
    }

    // 3. Super Admin (ADMIN)
    if (item.onlyAdmin) {
      return userRole === 'ADMIN'
    }
    
    return true
  })
})

// --- LOGIC FEEDBACK DRAGGABLE ---
const isDragging = ref(false)
const feedbackPos = ref({ x: 0, y: 0 })
const startPos = ref({ x: 0, y: 0 })

const initPos = () => {
  const saved = localStorage.getItem('feedback_pos')
  if (saved) {
    feedbackPos.value = JSON.parse(saved)
  }
}

const onDragStart = (e) => {
  isDragging.value = false
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
  
  startPos.value = { x: clientX, y: clientY }
  
  const moveHandler = (mE) => {
    const mX = mE.type.includes('touch') ? mE.touches[0].clientX : mE.clientX
    const mY = mE.type.includes('touch') ? mE.touches[0].clientY : mE.clientY
    
    const deltaX = startPos.value.x - mX
    const deltaY = startPos.value.y - mY
    
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      isDragging.value = true
    }
    
    if (isDragging.value) {
      // Perhitungan posisi: Inversi karena menggunakan right & bottom
      feedbackPos.value.x += deltaX
      feedbackPos.value.y += deltaY
      startPos.value = { x: mX, y: mY }
    }
  }
  
  const stopHandler = () => {
    window.removeEventListener('mousemove', moveHandler)
    window.removeEventListener('mouseup', stopHandler)
    window.removeEventListener('touchmove', moveHandler)
    window.removeEventListener('touchend', stopHandler)
    if (isDragging.value) {
      localStorage.setItem('feedback_pos', JSON.stringify(feedbackPos.value))
    }
  }
  
  window.addEventListener('mousemove', moveHandler)
  window.addEventListener('mouseup', stopHandler)
  window.addEventListener('touchmove', moveHandler)
  window.addEventListener('touchend', stopHandler)
}

const handleFeedbackClick = () => {
  if (!isDragging.value) {
    isFeedbackModalOpen.value = true
  }
}

// --- LOGIC QR CODE DRAGGABLE (MIRRORED FROM FEEDBACK) ---
const isQrDragging = ref(false)
const qrBtnPos = ref({ x: 0, y: 0 })
const qrStartPos = ref({ x: 0, y: 0 })
const isQrModalOpen = ref(false)
const activeSlug = ref('')
const qrCanvas = ref(null)
const qrOptions = ref({
  color: '#0f172a',
  bgColor: '#ffffff',
  shape: 'square',
  cornerShape: 'square',
  errorLevel: 'M'
})

const initQrPos = () => {
  const saved = localStorage.getItem('qr_btn_pos')
  if (saved) {
    qrBtnPos.value = JSON.parse(saved)
  }
}

const onQrDragStart = (e) => {
  isQrDragging.value = false
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
  
  qrStartPos.value = { x: clientX, y: clientY }
  
  const moveHandler = (mE) => {
    const mX = mE.type.includes('touch') ? mE.touches[0].clientX : mE.clientX
    const mY = mE.type.includes('touch') ? mE.touches[0].clientY : mE.clientY
    
    const deltaX = qrStartPos.value.x - mX
    const deltaY = qrStartPos.value.y - mY
    
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      isQrDragging.value = true
    }
    
    if (isQrDragging.value) {
      qrBtnPos.value.x += deltaX
      qrBtnPos.value.y += deltaY
      qrStartPos.value = { x: mX, y: mY }
    }
  }
  
  const stopHandler = () => {
    window.removeEventListener('mousemove', moveHandler)
    window.removeEventListener('mouseup', stopHandler)
    window.removeEventListener('touchmove', moveHandler)
    window.removeEventListener('touchend', stopHandler)
    if (isQrDragging.value) {
      localStorage.setItem('qr_btn_pos', JSON.stringify(qrBtnPos.value))
    }
  }
  
  window.addEventListener('mousemove', moveHandler)
  window.addEventListener('mouseup', stopHandler)
  window.addEventListener('touchmove', moveHandler)
  window.addEventListener('touchend', stopHandler)
}

const showQrButton = computed(() => {
  return route.name === 'admin-event-editor'
})

const qrTargetUrl = computed(() => {
  const base = window.location.origin
  if (activeSlug.value) return `${base}/e/${activeSlug.value}`
  return `${base}/` // Default to home/portal
})

const generateQR = () => {
  if (isQrDragging.value) return
  isQrModalOpen.value = true
  setTimeout(renderQrCanvas, 100)
}

const renderQrCanvas = async () => {
  if (!qrCanvas.value) return
  const canvas = qrCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  try {
    const qrData = QRCode.create(qrTargetUrl.value, { errorCorrectionLevel: qrOptions.value.errorLevel })
    const { modules } = qrData
    const moduleCount = modules.size
    const margin = 4
    const size = 300
    const cellSize = size / (moduleCount + margin * 2)

    canvas.width = size
    canvas.height = size
    ctx.fillStyle = qrOptions.value.bgColor
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = qrOptions.value.color

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = (col + margin) * cellSize
          const y = (row + margin) * cellSize
          if (qrOptions.value.shape === 'circle') {
             ctx.beginPath()
             ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.45, 0, Math.PI * 2)
             ctx.fill()
          } else {
             ctx.fillRect(x, y, cellSize, cellSize)
          }
        }
      }
    }
  } catch (err) { console.error(err) }
}

const downloadQr = () => {
  if (!qrCanvas.value) return
  const link = document.createElement('a')
  link.href = qrCanvas.value.toDataURL('image/png')
  link.download = `QR-Event-${activeSlug.value || 'Portal'}.png`
  link.click()
}

import { provide } from 'vue'
provide('setActiveSlug', (slug) => { activeSlug.value = slug })

watch(qrOptions, renderQrCanvas, { deep: true })
watch(qrTargetUrl, () => { if (isQrModalOpen.value) renderQrCanvas() })

const loadSettings = async () => {
  // Settings are now loaded globally in App.vue via settingsStore
}

const handleLogout = () => {
  authStore.logout()
  router.replace('/login')
}

// --- LOGIC NOTIFIKASI ---
const notifications = ref([])
const unreadCount = ref(0)
const isNotificationOpen = ref(false)

const fetchNotifications = async () => {
  try {
    const { data } = await api.get('/notifications')
    notifications.value = data.notifications
    unreadCount.value = data.unreadCount
  } catch (err) {
    console.error('Gagal memuat notifikasi', err)
  }
}

const markNotificationsRead = async () => {
  if (unreadCount.value === 0) return
  try {
    await api.put('/notifications')
    unreadCount.value = 0
    notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
  } catch (err) {
    console.error('Gagal update notifikasi', err)
  }
}

const toggleNotifications = () => {
  isNotificationOpen.value = !isNotificationOpen.value
  if (isNotificationOpen.value) {
    markNotificationsRead()
  }
}

const handleNotificationClick = (notif) => {
  isNotificationOpen.value = false
  if (notif.type === 'NEW_FEEDBACK' || notif.type === 'FEEDBACK_REPLY') {
    router.push('/admin/feedback')
  }
}

// --- LOGIC FEEDBACK ---
const isFeedbackModalOpen = ref(false)
const feedbackMsg = ref('')
const isAnonymous = ref(false)
const feedbackImage = ref(null)
const previewUrl = ref(null)
const isSendingFeedback = ref(false)

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    feedbackImage.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

const handleSendFeedback = async () => {
  if (!feedbackMsg.value.trim()) return
  isSendingFeedback.value = true
  try {
    const token = localStorage.getItem('token')
    let imageUrl = null

    // 1. Upload Gambar jika ada
    if (feedbackImage.value) {
      const formData = new FormData()
      formData.append('file', feedbackImage.value)
      formData.append('type', 'feedback')
      
      try {
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        imageUrl = uploadRes.data.url
      } catch (uploadErr) {
        console.error('Gagal upload gambar feedback', uploadErr)
      }
    }

    // 2. Kirim Feedback
    await api.post('/feedback', {
      message: feedbackMsg.value,
      isAnonymous: isAnonymous.value,
      image: imageUrl
    })

    alert('Feedback berhasil dikirim. Terima kasih!')
    feedbackMsg.value = ''
    isAnonymous.value = false
    feedbackImage.value = null
    previewUrl.value = null
    isFeedbackModalOpen.value = false
  } catch (err) {
    console.error('Gagal kirim feedback', err)
    const errorDetail = err.response?.data?.error || 'Silakan cek koneksi atau hubungi admin.'
    alert(`Gagal mengirim feedback: ${errorDetail}`)
  } finally {
    isSendingFeedback.value = false
  }
}

onMounted(() => {
  loadSettings()
  fetchNotifications()
  initPos()
  initQrPos()
  // Refresh notifikasi setiap 2 menit
  setInterval(fetchNotifications, 120000)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-300 overflow-x-hidden">
    <nav
      class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 px-4 h-16 flex items-center justify-between shadow-sm transition-colors duration-300">

      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
          <img v-if="settings.logo_url" :src="settings.logo_url.startsWith('http') ? settings.logo_url : API_URL + settings.logo_url" class="w-full h-full object-contain p-1" />
          <span v-else class="font-bold text-blue-600 dark:text-blue-400">S</span>
        </div>
        <div class="leading-tight hidden xl:block">
          <div class="font-bold text-slate-800 dark:text-slate-300 text-sm uppercase tracking-tight">{{ settings.app_name || 'SIGAP ADMIN' }}</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[150px]">
            {{ settings.instansi_name || 'Portal Layanan' }}
          </div>
        </div>
      </div>

      <div class="hidden md:flex items-center gap-0.5 lg:gap-1">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to"
          :title="item.label"
          class="flex items-center gap-1.5 px-2 lg:px-2.5 py-2 rounded-lg text-sm font-bold transition-all"
          :class="route.path.startsWith(item.to) ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500 rounded-b-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'">
          <component :is="item.icon" :size="20" class="shrink-0" />
          <span class="hidden xl:inline-block whitespace-nowrap">{{ item.label }}</span>
        </router-link>
      </div>

      <div class="flex items-center gap-2 lg:gap-4">
        <!-- 🔥 Tombol Lihat Portal Baru -->
        <a href="/" target="_blank" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-600 shadow-sm mr-1 lg:mr-2">
          <ExternalLink :size="14" />
          <span class="hidden lg:inline-block">Lihat Portal</span>
        </a>

        <div class="hidden md:flex items-center gap-2 lg:gap-3 text-right border-r border-slate-200 dark:border-slate-700 pr-2 lg:pr-4">
          <!-- 🔔 NOTIFICATION BELL -->
          <div class="relative">
            <button @click="toggleNotifications" class="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer relative">
              <Bell :size="20" />
              <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                {{ unreadCount > 9 ? '9+' : unreadCount }}
              </span>
            </button>

            <!-- Notification Dropdown -->
            <div v-if="isNotificationOpen" class="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[120] overflow-hidden animate-fadeup">
              <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h4 class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Bell :size="16" class="text-blue-500" /> Notifikasi
                </h4>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">{{ notifications.length }} Pesan</span>
              </div>
              
              <div class="max-h-80 overflow-y-auto">
                <div v-if="notifications.length === 0" class="p-8 text-center">
                  <Inbox :size="32" class="mx-auto text-slate-300 mb-2" />
                  <p class="text-xs text-slate-500">Tidak ada notifikasi baru.</p>
                </div>
                <div v-else>
                  <button v-for="notif in notifications" :key="notif.id" 
                    @click="handleNotificationClick(notif)"
                    class="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 transition-colors flex gap-3"
                    :class="!notif.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      :class="notif.type === 'NEW_FEEDBACK' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'">
                      <MessageSquare :size="14" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs text-slate-700 dark:text-slate-200 leading-snug line-clamp-2" :class="!notif.isRead ? 'font-bold' : ''">
                        {{ notif.message }}
                      </p>
                      <span class="text-[9px] text-slate-400 mt-1 block">{{ new Date(notif.createdAt).toLocaleString() }}</span>
                    </div>
                  </button>
                </div>
              </div>
              
              <router-link to="/admin/feedback" @click="isNotificationOpen = false" class="block w-full text-center py-3 text-xs font-bold text-blue-600 dark:text-blue-400 border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                Lihat Semua Feedback
              </router-link>
            </div>
          </div>

          <button @click="isDarkMode = !isDarkMode" class="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer">
            <Sun v-if="isDarkMode" :size="20" />
            <Moon v-else :size="20" />
          </button>
        </div>

        <div class="hidden lg:flex items-center gap-3 text-right">
          <div class="leading-tight">
            <div class="font-bold text-sm text-slate-700 dark:text-slate-300">{{ user.fullName || user.username }}</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
              {{ user.role === 'ADMIN' ? 'Administrator' : (user.role === 'ADMIN_EVENT' ? 'Admin Event' : (user.department?.name || 'Pegawai')) }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-600">
            <img v-if="userPhoto" :src="userPhoto" class="w-full h-full object-cover" />
            <span v-else class="font-bold text-slate-600 dark:text-slate-300">{{ userInitials }}</span>
          </div>
        </div>

        <button @click="handleLogout"
          class="hidden md:flex items-center justify-center w-9 h-9 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition cursor-pointer"
          title="Keluar">
          <LogOut :size="20" />
        </button>

        <button @click="isMobileOpen = !isMobileOpen" class="md:hidden p-2 text-slate-600 dark:text-slate-300 cursor-pointer">
          <component :is="isMobileOpen ? X : Menu" :size="24" />
        </button>
      </div>
    </nav>

    <div v-if="isMobileOpen" class="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-lg transition-colors">

      <div class="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
        <div
          class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center overflow-hidden border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold">
          <img v-if="userPhoto" :src="userPhoto" class="w-full h-full object-cover" />
          <span v-else>{{ userInitials }}</span>
        </div>
        <div>
          <div class="font-bold text-slate-800 dark:text-slate-200">{{ user.fullName || user.username }}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {{ user.role === 'ADMIN' ? 'Administrator' : (user.role === 'ADMIN_EVENT' ? 'Admin Event' : (user.department?.name || 'Pegawai')) }}
          </div>
        </div>
      </div>

      <div class="p-2 space-y-1">
        <!-- New items for mobile theme/lang -->
        <div class="flex items-center gap-2 mb-4 p-2">
          <button @click="isDarkMode = !isDarkMode" class="w-full flex justify-center items-center py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-600 cursor-pointer">
            <Sun v-if="isDarkMode" :size="16" class="mr-2" />
            <Moon v-else :size="16" class="mr-2" /> 
            <span class="text-xs">{{ isDarkMode ? 'Terang' : 'Gelap' }}</span>
          </button>
        </div>

        <router-link v-for="item in navItems" :key="item.to" :to="item.to" @click="isMobileOpen = false"
          class="flex items-center gap-3 px-3 py-3 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
          active-class="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
          <component :is="item.icon" :size="20" />
          {{ item.label }}
        </router-link>
        <button @click="handleLogout"
          class="w-full text-left flex items-center gap-3 px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md cursor-pointer">
          <LogOut :size="20" /> Keluar
        </button>
      </div>
    </div>
    <main class="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <!-- 🚧 PRO-PROTECTION BANNER (Stage B) -->
      <div v-if="settings._license?.status === 'UNAUTHORIZED'" 
           class="mb-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 animate-pulse shadow-lg shadow-red-500/10">
        <div class="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
          <ShieldAlert :size="32" />
        </div>
        <div class="flex-1 text-center md:text-left">
          <h3 class="text-xl font-black text-red-700 dark:text-red-400 mb-1">DETEKSI LISENSI ILEGAL!</h3>
          <p class="text-sm text-red-600 dark:text-red-300/80 leading-relaxed">
            Sistem mendeteksi bahwa instalasi ini berjalan pada domain <strong>({{ settings._license.host }})</strong> yang tidak terdaftar secara resmi.
            Segala bentuk penggandaan atau penggunaan tanpa seizin pengembang adalah tindakan **Ilegal** dan melanggar hukum Hak Cipta.
          </p>
          <div class="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
            <span class="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Akses Terbatas Aktif</span>
            <span class="text-xs text-red-500 dark:text-red-400 font-bold">Hubungi Developer: wiradika.jr untuk aktivasi resmi.</span>
          </div>
        </div>
      </div>

      <router-view />
    </main>

    <footer class="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-auto text-center py-6 text-slate-500 dark:text-slate-400 text-sm transition-colors duration-300">
      <div class="mb-1">{{ settings.footer_copyright || `&copy; 2026 ${settings.app_name || 'SIGAP'} Administrator. Hak Cipta Dilindungi Undang-Undang.` }}</div>
      <div class="text-[10px] opacity-70">Sistem ini di desain dan di buat oleh : <strong>wiradika.jr</strong></div>
    </footer>

    <!-- 🔥 FLOATING FEEDBACK BUTTON (Draggable & Responsive) -->
    <button v-if="user.role !== 'ADMIN'" 
      @mousedown="onDragStart"
      @touchstart="onDragStart"
      @click="handleFeedbackClick"
      class="fixed z-[9900] w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-blue-500/80 transform group active:scale-95 border-2 md:border-4 border-white/30"
      :class="[isDragging ? 'cursor-grabbing scale-105' : 'cursor-move transition-all hover:-translate-y-1']"
      :style="{ 
        right: `calc(1.5rem + ${feedbackPos.x}px)`, 
        bottom: `calc(1.5rem + ${feedbackPos.y}px)` 
      }">
      <LifeBuoy :size="22" class="group-hover:rotate-45 transition-transform sm:w-[26px] sm:h-[26px]" />
      <span class="absolute right-full mr-4 px-3 py-2 bg-slate-800/90 backdrop-blur-md text-white text-[11px] font-bold rounded-xl opacity-0 hidden lg:block group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none border border-white/10">
        Butuh Bantuan? Geser atau Klik
      </span>
    </button>

    <!-- 🔥 FLOATING QR BUTTON (ONLY ON EVENT ROUTES) -->
    <button v-if="showQrButton" 
      @mousedown="onQrDragStart"
      @touchstart="onQrDragStart"
      @click="generateQR"
      class="fixed z-[9900] w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-emerald-500/80 transform group active:scale-95 border-2 md:border-4 border-white/30"
      :class="[isQrDragging ? 'cursor-grabbing scale-105' : 'cursor-move transition-all hover:-translate-y-1']"
      :style="{ 
        right: `calc(1.5rem + ${qrBtnPos.x}px)`, 
        bottom: `calc(5rem + 1.5rem + ${qrBtnPos.y}px)` 
      }">
      <LinkIcon :size="22" class="group-hover:rotate-12 transition-transform sm:w-[26px] sm:h-[26px]" />
      <span class="absolute right-full mr-4 px-3 py-2 bg-slate-800/90 backdrop-blur-md text-white text-[11px] font-bold rounded-xl opacity-0 hidden lg:block group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none border border-white/10">
        Bagikan Event (QR)
      </span>
    </button>

    <!-- 💎 QR MODAL (MATCHING FEEDBACK STYLE) -->
    <div v-if="isQrModalOpen" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="isQrModalOpen = false"></div>
      
      <div class="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden animate-fadeup bg-opacity-95 dark:bg-opacity-95 backdrop-blur-md">
        <div class="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
              <LinkIcon :size="20" />
            </div>
            <div>
              <h3 class="font-black text-slate-800 dark:text-slate-100">Bagikan Event</h3>
              <p class="text-xs text-slate-500">Scan QR Code untuk akses cepat.</p>
            </div>
          </div>
          <button @click="isQrModalOpen = false" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <X :size="24" />
          </button>
        </div>

        <div class="p-8 flex flex-col items-center gap-6">
          <div class="p-4 bg-white rounded-2xl shadow-inner border border-slate-100">
            <canvas ref="qrCanvas"></canvas>
          </div>
          
          <div class="w-full bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1 overflow-hidden">
             <span class="text-[9px] font-black text-slate-400 uppercase">Target URL</span>
             <span class="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{{ qrTargetUrl }}</span>
          </div>

          <div class="grid grid-cols-2 gap-4 w-full">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-slate-400">Titik QR</label>
              <select v-model="qrOptions.shape" class="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-xs font-bold p-2 outline-none">
                <option value="square">Kotak</option>
                <option value="circle">Bulat</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-slate-400">Warna</label>
              <div class="flex gap-2">
                <input type="color" v-model="qrOptions.color" class="w-full h-8 rounded-lg cursor-pointer border-none p-0 bg-transparent" />
                <input type="color" v-model="qrOptions.bgColor" class="w-full h-8 rounded-lg cursor-pointer border-none p-0 bg-transparent" />
              </div>
            </div>
          </div>
        </div>

        <div class="p-6 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col gap-3">
          <button @click="downloadQr" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
            <Download :size="18" /> Unduh QR Code
          </button>
          <button @click="isQrModalOpen = false" class="w-full py-2 text-slate-400 font-bold text-xs hover:text-slate-600 transition">Tutup</button>
        </div>
      </div>
    </div>

    <!-- 💎 FEEDBACK MODAL (GLASSMORPHISM) -->
    <div v-if="isFeedbackModalOpen" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="isFeedbackModalOpen = false"></div>
      
      <div class="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden animate-fadeup bg-opacity-95 dark:bg-opacity-95 backdrop-blur-md">
        <div class="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
              <MessageSquare :size="20" />
            </div>
            <div>
              <h3 class="font-black text-slate-800 dark:text-slate-100">Kirim Feedback</h3>
              <p class="text-xs text-slate-500">Bantu kami menyempurnakan sistem ini.</p>
            </div>
          </div>
          <button @click="isFeedbackModalOpen = false" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
            <X :size="24" />
          </button>
        </div>

        <div class="p-4 sm:p-6 space-y-4 overflow-y-auto grow">
          <div class="flex flex-col gap-2">
            <label class="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Pesan / Laporan / Saran</label>
            <textarea 
              v-model="feedbackMsg"
              placeholder="Tuliskan kendala atau saran Anda di sini..."
              class="w-full h-28 sm:h-32 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
            ></textarea>
          </div>

          <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div class="flex items-center gap-2 cursor-pointer group" @click="isAnonymous = !isAnonymous">
              <div class="w-10 h-6 rounded-full transition-colors relative" :class="isAnonymous ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'">
                <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform" :class="isAnonymous ? 'translate-x-4' : 'translate-x-0'"></div>
              </div>
              <span class="text-sm font-bold text-slate-600 dark:text-slate-400">Kirim Secara Anonim</span>
            </div>

            <div class="relative">
              <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileChange" />
              <button @click="$refs.fileInput.click()" class="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-600">
                <Camera :size="16" />
                {{ feedbackImage ? 'Ganti Foto' : 'Lampirkan Foto' }}
              </button>
            </div>
          </div>

          <div v-if="previewUrl" class="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            <img :src="previewUrl" class="max-w-full max-h-full object-contain" />
            <button @click="feedbackImage = null; previewUrl = null" class="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <div class="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end gap-3 shrink-0 border-t border-slate-200 dark:border-slate-700/50">
          <button @click="isFeedbackModalOpen = false" class="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Batal</button>
          <button 
            @click="handleSendFeedback" 
            :disabled="isSendingFeedback || !feedbackMsg.trim()"
            class="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <span v-if="isSendingFeedback">Mengirim...</span>
            <template v-else>
              <Send :size="18" /> Kirim Sekarang
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
main {
  position: relative;
  z-index: 1;
}

.animate-fadeup {
  animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>