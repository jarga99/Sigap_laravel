<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import api from '../lib/axios'
import QRCode from 'qrcode'
import { useRouter } from 'vue-router'
import { 
  Building2, Monitor, LayoutDashboard, ExternalLink, Globe, Layout, 
  MapPin, Phone, Mail, Search, Sparkles, LogIn, Github, MessageSquare, Heart,
  QrCode, Copy, Check, Command, Moon, Sun, ChevronDown, Download, WifiOff, Menu, X,
  FolderOpen, Briefcase, Activity, Archive, Book, Star, Video, Image as ImageIcon
} from 'lucide-vue-next'
import { useSettingsStore } from '../stores/settings'

const iconMap: Record<string, any> = {
  FolderOpen, Briefcase, Globe, Activity, Archive, Book, Heart, Star, Video, ImageIcon
}
import { useAuthStore } from '../stores/auth'
import { API_BASE_URL } from '../lib/config'

const router = useRouter()
const authStore = useAuthStore()

// --- STATE MANAGEMENT ---
const links = ref<any[]>([])
const categories = ref<any[]>([])
const API_URL = API_BASE_URL
const settingsStore = useSettingsStore()
const settings = computed(() => settingsStore.settings)
const footerLinks = computed(() => settingsStore.settings.footerLinks || [])
const isLoading = ref(true)
const isOffline = ref(false)
const searchQuery = ref('')
const selectedCategory = ref<number | 'ALL'>('ALL')
const isMobileMenuOpen = ref(false)
const hoveredCardId = ref<number | null>(null) // TRACKING AKTIF UNTUK PERBAIKAN BUG HOVER

// Theme & Language (Persist ke LocalStorage)
const isDarkMode = ref(localStorage.getItem('theme') === 'dark')
const currentLang = ref<'id' | 'en'>((localStorage.getItem('lang') as 'id' | 'en') || 'id')

// Expansion state untuk "Read More" (獨立 tiap card)
const expandedLinks = reactive<Record<number, boolean>>({})

// Modal & QR State
const showQrModal = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const activeLinkTitle = ref('')
const activeShortUrl = ref('')
const copiedId = ref<number | null>(null)

const qrOptions = ref({
  color: '#0f172a',
  bgColor: '#ffffff',
  shape: 'square', // square, circle
  cornerShape: 'square', // square, rounded
  errorLevel: 'M' // L, M, Q, H
})

// Fungsi untuk memastikan URL gambar valid
const getImageUrl = (path: string) => {
  if (!path) return undefined;
  // Jika path sudah berupa URL (http/https), biarkan saja
  if (path.startsWith('http')) return path;
  // Jika bukan URL, sambungkan dengan Base URL Backend (Port 3000)
  // Sesuaikan alamat ini dengan backend Anda
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// --- FUNGSI BARU UNTUK MEMBUKA LINK ---
const openLink = (link: any) => {
  if (!link) return

  // 1. Tentukan URL Tujuan
  // Jika ada slug (shortlink), arahkan ke Backend (Port 3000) agar terhitung statistiknya
  // Jika tidak ada slug, buka URL asli langsung
  let targetUrl = ''

  if (link.slug) {
    // Pastikan port ini sesuai dengan port Backend Next.js Anda (biasanya 3000)
    targetUrl = `${API_URL}/s/${link.slug}`
  } else {
    targetUrl = link.url
  }

  // 2. Buka di Tab Baru
  if (targetUrl) {
    window.open(targetUrl, '_blank')
  }
}

// --- WATCHERS ---
watch(isDarkMode, (val) => {
  const html = document.documentElement
  val ? html.classList.add('dark') : html.classList.remove('dark')
  localStorage.setItem('theme', val ? 'dark' : 'light')
}, { immediate: true })

watch(currentLang, (val) => {
  localStorage.setItem('lang', val)
})

// --- LOGIC FUNCTIONS ---
const getBaseUrl = () => {
  if (settings.value.custom_domain?.startsWith('http')) {
    return settings.value.custom_domain.replace(/\/$/, '')
  }
  return API_BASE_URL
}

const getShortUrl = (slug: string) => `${getBaseUrl()}/s/${slug}`

// Helper untuk mengambil konten berdasarkan bahasa aktif
// Fungsi ini sekarang 100% cocok dengan schema.prisma terbaru kamu
const getDbContent = (item: any, field: string) => {
  if (!item) return ''

  const isEn = currentLang.value === 'en'
  const valEn = item[`${field}_en`]
  const valId = item[field]

  // Jika pilih Inggris DAN ada datanya, pakai Inggris. 
  // Jika tidak ada data Inggris atau pilih Indonesia, pakai data default (ID).
  if (isEn && valEn && valEn.trim() !== '') {
    return valEn
  }

  return valId || ''
}

// Translasi UI statis
const t = computed(() => {
  const isEn = currentLang.value === 'en'
  return {
    heroTitle: isEn ? 'Digital Service Center' : 'Pusat Layanan Digital',
    searchPlaceholder: isEn ? 'Search for services...' : 'Cari layanan atau aplikasi...',
    allCategories: isEn ? 'All' : 'Semua',
    login: isEn ? 'Staff Login' : 'Login Pegawai',
    dashboard: 'Dashboard',
    showMore: isEn ? 'Read More' : 'Selengkapnya',
    showLess: isEn ? 'Show Less' : 'Sembunyikan',
    copy: isEn ? 'Copy Link' : 'Salin Link',
    open: isEn ? 'Open' : 'Buka',
    scan: 'QR Code'
  }
})

const toggleExpand = (id: number) => {
  expandedLinks[id] = !expandedLinks[id]
}

const loadData = async () => {
  isLoading.value = true
  isOffline.value = false // Reset status offline tiap kali mencoba memuat

  try {
    await settingsStore.fetchSettings()
    const [resLinks, resCats] = await Promise.allSettled([
      api.get('/portal/links'),
      api.get('/categories')
    ])

    // Deteksi Offline: Jika request utama gagal (rejected), tandai sebagai offline
    if (resLinks.status === 'rejected') {
      isOffline.value = true
    } else {
      // Jika berhasil, masukkan datanya
      if (resLinks.status === 'fulfilled') links.value = resLinks.value.data
      if (resCats.status === 'fulfilled') categories.value = resCats.value.data
    }
  } catch (error) {
    // Jaga-jaga jika ada error tak terduga yang lolos dari Promise.allSettled
    isOffline.value = true
  } finally {
    isLoading.value = false
  }
}

const filteredLinks = computed(() => {
  return links.value.filter(link => {
    const title = getDbContent(link, 'title').toLowerCase()
    const desc = getDbContent(link, 'desc').toLowerCase()
    const search = searchQuery.value.toLowerCase()

    const matchSearch = title.includes(search) || desc.includes(search)
    const linkCatId = link.category_id || link.category?.id
    const matchCat = selectedCategory.value === 'ALL' || linkCatId === selectedCategory.value

    return matchSearch && matchCat
  })
})

// --- PAGINATION LIS ---
const currentPage = ref(1)
const itemsPerPage = 6

const paginatedLinks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredLinks.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredLinks.value.length / itemsPerPage) || 1
})

watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1
})

// TAMBAHKAN INI DI BAWAHNYA:
const visibleCategories = computed(() => {
  // Kita ambil ID kategori dari link yang AKTIF saja
  const activeCategoryIds = new Set(links.value.map(link => link.category_id || link.category?.id));

  // Kita filter daftar kategori asli berdasarkan ID yang benar-benar punya link
  return categories.value.filter(cat => activeCategoryIds.has(cat.id));
});

const generateQR = (link: any) => {
  activeLinkTitle.value = getDbContent(link, 'title')
  activeShortUrl.value = getShortUrl(link.slug)
  showQrModal.value = true
  // Tunggu modal render canvas
  setTimeout(renderCanvas, 100)
}

const renderCanvas = async () => {
  if (!activeShortUrl.value || !qrCanvas.value) return

  const canvas = qrCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  try {
    const qrData = QRCode.create(activeShortUrl.value, { errorCorrectionLevel: qrOptions.value.errorLevel as any })
    const { modules } = qrData
    const moduleCount = modules.size
    const margin = 4
    const size = 400
    const cellSize = size / (moduleCount + margin * 2)

    canvas.width = size
    canvas.height = size

    // Bg
    ctx.fillStyle = qrOptions.value.bgColor
    ctx.fillRect(0, 0, size, size)

    // Fg
    ctx.fillStyle = qrOptions.value.color

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          const x = (col + margin) * cellSize
          const y = (row + margin) * cellSize

          const isTopLeft = row < 7 && col < 7
          const isTopRight = row < 7 && col >= moduleCount - 7
          const isBottomLeft = row >= moduleCount - 7 && col < 7

          if ((isTopLeft || isTopRight || isBottomLeft) && qrOptions.value.cornerShape === 'rounded') {
            ctx.beginPath()
            ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.2)
            ctx.fill()
          } else if (qrOptions.value.shape === 'circle') {
            ctx.beginPath()
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.45, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, cellSize, cellSize)
          }
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
}

watch(qrOptions, renderCanvas, { deep: true })

const copyLink = (link: any) => {
  navigator.clipboard.writeText(getShortUrl(link.slug))
  copiedId.value = link.id
  setTimeout(() => copiedId.value = null, 2000)
}

const downloadQR = () => {
  if (!qrCanvas.value) return
  const link = document.createElement('a')
  link.href = qrCanvas.value.toDataURL('image/png')
  link.download = `QR-${activeLinkTitle.value}.png`
  link.click()
}

// --- HOVER PREVIEW (FIXED LOGIC) ---
const previewData = reactive<Record<number, any>>({})
const hoverTimers = reactive<Record<number, number>>({})
const abortControllers = reactive<Record<number, AbortController>>({})

const onCardHover = (link: any) => {
  // Tandai kartu mana yang sedang disentuh kursor secara real-time
  hoveredCardId.value = link.id

  if (previewData[link.id] || hoverTimers[link.id]) return
  
  hoverTimers[link.id] = window.setTimeout(async () => {
    // Abort previous request for this card if any (shouldn't happen with timers but defensive)
    if (abortControllers[link.id]) {
      abortControllers[link.id].abort()
    }
    
    // Create new controller
    const controller = new AbortController()
    abortControllers[link.id] = controller

    try {
      const res = await api.get(`/portal/preview?url=${encodeURIComponent(link.url)}`, {
        signal: controller.signal
      })
      
      if (hoveredCardId.value === link.id) {
        previewData[link.id] = res.data
      }
    } catch(e: any) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return
      
      if (hoveredCardId.value === link.id) {
        previewData[link.id] = { error: true }
      }
    } finally {
      delete hoverTimers[link.id]
      delete abortControllers[link.id]
    }
  }, 100)
}

const onCardLeave = (link: any) => {
  // Hanya bersihkan jika ini memang kartu yang ditinggalkan
  if (hoveredCardId.value === link.id) {
    hoveredCardId.value = null
  }

  if (hoverTimers[link.id]) {
    clearTimeout(hoverTimers[link.id])
    delete hoverTimers[link.id]
  }

  if (abortControllers[link.id]) {
    abortControllers[link.id].abort()
    delete abortControllers[link.id]
  }
  
  // Hapus data agar tidak "menempel" (ghosting)
  if (previewData[link.id]) {
    delete previewData[link.id]
  }
}

onMounted(loadData)
</script>

<template>
  <div class="page-container" :class="{ 'dark-mode': isDarkMode }">
    <!-- Solid color defined in CSS, background image with low opacity above it -->
    <div class="bg-image" :style="settings.bg_url ? { backgroundImage: `url(${getImageUrl(settings.bg_url)})` } : {}">
    </div>

    <!-- Konten diangkat ke depan dengan relative & z-index -->
    <div style="position: relative; z-index: 10; display: flex; flex-direction: column; min-height: 100vh;">

    <div v-if="isLoading || isOffline" class="full-page-loader">
      <div class="loader-content text-center">

        <template v-if="isLoading">
          <div class="spinner"></div>
          <p class="loading-text">Memuat Data...</p>
        </template>

        <template v-else-if="isOffline">
          <div style="color: #ef4444; margin-bottom: 1rem; display: flex; justify-content: center;">
            <WifiOff :size="64" />
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">
            Server Offline
          </h2>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
            Gagal terhubung ke server. Silakan periksa koneksi atau coba lagi nanti.
          </p>
          <button @click="loadData" class="btn-launch" style="margin: 0 auto;">
            Coba Lagi
          </button>
        </template>

      </div>
    </div>

    <template v-else>
      <nav class="glass-nav">
        <div class="nav-content">
          <div class="brand" @click="router.push('/')">
            <div class="logo-box">
              <img v-if="settings.logo_url" :src="getImageUrl(settings.logo_url)" alt="Logo" />
              <span v-else>🚀</span>
            </div>
            <div class="brand-info">
              <h1 class="project-name">{{ settings.app_name || 'SIGAP' }}</h1>
              <span class="instansi-name">{{ getDbContent(settings, 'instansi_name') || 'PORTAL LAYANAN' }}</span>
            </div>
          </div>

          <button class="mobile-menu-btn" @click="isMobileMenuOpen = !isMobileMenuOpen">
            <Menu v-if="!isMobileMenuOpen" :size="24" />
            <X v-else :size="24" />
          </button>

          <div class="nav-actions" :class="{ 'is-open': isMobileMenuOpen }">
            <div class="lang-switcher">
              <button @click="currentLang = 'id'" :class="['lang-btn', { active: currentLang === 'id' }]">ID</button>
              <button @click="currentLang = 'en'" :class="['lang-btn', { active: currentLang === 'en' }]">EN</button>
            </div>
            <div class="nav-divider"></div>
            <button @click="isDarkMode = !isDarkMode" class="theme-toggle">
              <Sun v-if="isDarkMode" :size="20" />
              <Moon v-else :size="20" />
            </button>
            <button v-if="!authStore.token" @click="router.push('/login')" class="btn-auth">
              <LogIn :size="18" /> <span class="desktop-only">{{ t.login }}</span>
            </button>
            <button v-else @click="router.push('/admin/links')" class="btn-auth admin">
              <LayoutDashboard :size="18" /> <span class="desktop-only">{{ t.dashboard }}</span>
            </button>
          </div>
        </div>
      </nav>

      <main class="content-wrapper">
        <header class="hero-section">
          <h2 class="animate-title">{{ t.heroTitle }}</h2>
          <p v-if="getDbContent(settings, 'instansi_desc')" class="instansi-description">
            {{ getDbContent(settings, 'instansi_desc') }}
          </p>

          <div class="search-box">
            <Search class="search-icon" :size="20" />
            <input v-model="searchQuery" type="text" :placeholder="t.searchPlaceholder" />
            <div class="kbd-shortcut">
              <Command :size="12" /> K
            </div>
          </div>
        </header>

        <div class="category-wrapper">
          <button :class="['cat-tab', { active: selectedCategory === 'ALL' }]" @click="selectedCategory = 'ALL'">
            {{ t.allCategories }}
          </button>
          <button v-for="cat in visibleCategories" :key="cat.id"
            :class="['cat-tab', { active: selectedCategory === cat.id }]" @click="selectedCategory = cat.id">
            {{ getDbContent(cat, 'name') }}
          </button>
        </div>

        <div class="grid-container">
          <div v-for="link in paginatedLinks" :key="link.id" class="pro-card" @click="openLink(link)">
            
            <!-- HOVER PREVIEW O.G (WHATSAPP STYLE) -->
            <transition name="fade">
              <div v-if="hoveredCardId === link.id && previewData[link.id] && !previewData[link.id].error" class="preview-tooltip">
                <div v-if="previewData[link.id].image" class="preview-img-wrapper">
                  <img :src="previewData[link.id].image" alt="Preview"/>
                </div>
                <div class="preview-info">
                  <h4 class="p-title">{{ previewData[link.id].title || getDbContent(link, 'title') }}</h4>
                  <p class="p-desc">{{ previewData[link.id].description || getDbContent(link, 'desc') }}</p>
                  <small class="p-url">{{ link.url }}</small>
                </div>
              </div>
            </transition>

            <div class="card-main">
              <div class="card-header-flex">
                <div class="card-icon">
                  <component v-if="link.icon && iconMap[link.icon]" :is="iconMap[link.icon]" :size="24" />
                  <span v-else>{{ getDbContent(link, 'title').charAt(0) }}</span>
                </div>
                <div class="title-area" @mouseenter="onCardHover(link)" @mouseleave="onCardLeave(link)">
                  <h3>{{ getDbContent(link, 'title') }}</h3>
                </div>
              </div>
              <div v-if="getDbContent(link, 'desc')" class="desc-wrapper">
                <p class="desc-text" :class="{ 'is-clamped': !expandedLinks[link.id] }">
                  {{ getDbContent(link, 'desc') }}
                </p>
                <button v-if="getDbContent(link, 'desc').length > 90" @click.stop="toggleExpand(link.id)"
                  class="btn-read-more">
                  {{ expandedLinks[link.id] ? t.showLess : t.showMore }}
                  <ChevronDown :size="14" :class="{ 'rotate-180': expandedLinks[link.id] }" />
                </button>
              </div>
            </div>
            <div class="card-footer">
              <div class="footer-left">
                <button @click.stop="copyLink(link)" class="tool-btn">
                  <Check v-if="copiedId === link.id" :size="16" class="text-green-500" />
                  <Copy v-else :size="16" />
                </button>
                <button @click.stop="generateQR(link)" class="tool-btn">
                  <QrCode :size="16" />
                </button>
              </div>
              <button class="btn-launch">{{ t.open }}
                <ExternalLink :size="14" />
              </button>
            </div>
          </div>
        </div>

        <!-- PAGINATION CONTROLS -->
        <div v-if="filteredLinks.length > 0" style="display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-top: 4rem; padding-bottom: 2rem;">
          <button @click="currentPage--" :disabled="currentPage === 1" 
                  class="btn-page-portal"
                  :style="currentPage === 1 ? 'opacity: 0.4; cursor: not-allowed;' : ''">
            &laquo; Prev
          </button>
          <div style="text-align: center;">
            <span style="display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">Halaman</span>
            <span style="color: var(--text-main); font-weight: 800; font-size: 1.1rem;">{{ currentPage }} <small style="color: var(--text-muted); font-weight: 400; font-size: 0.85rem;">dari</small> {{ totalPages }}</span>
          </div>
          <button @click="currentPage++" :disabled="currentPage === totalPages" 
                  class="btn-page-portal"
                  :style="currentPage === totalPages ? 'opacity: 0.4; cursor: not-allowed;' : ''">
            Next &raquo;
          </button>
        </div>

      </main>

      <footer class="portal-footer">
        <!-- MODE COMPLEX (GRID LENGKAP) -->
        <div v-if="settings.footer_mode !== 'SIMPLE'" class="footer-grid">
          <div class="footer-col brand-col">
            <div class="f-logo">
              <img v-if="settings.logo_url" :src="getImageUrl(settings.logo_url)" alt="Logo" />
              <span v-else>🚀</span>
              <span class="f-app-name">{{ settings.app_name || 'SIGAP' }}</span>
            </div>
            <p class="f-desc">
              {{ getDbContent(settings, 'footer_text') || getDbContent(settings, 'instansi_desc') }}
            </p>
          </div>

          <div class="footer-col">
            <h4>{{ currentLang === 'en' ? 'Contact Info' : 'Info Kontak' }}</h4>
            <ul class="f-contact">
              <li v-if="settings.contact_address">
                <MapPin :size="16" /> {{ settings.contact_address }}
              </li>
              <li v-if="settings.contact_phone">
                <Phone :size="16" /> {{ settings.contact_phone }}
              </li>
              <li v-if="settings.contact_email">
                <Mail :size="16" /> {{ settings.contact_email }}
              </li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>{{ currentLang === 'en' ? 'Quick Links' : 'Tautan Cepat' }}</h4>
            
            <!-- Link Tipe TEXT -->
            <ul class="f-links" v-if="settings.footerLinks?.some(l => l.type === 'TEXT')">
              <li v-for="link in settings.footerLinks.filter(l => l.type === 'TEXT')" 
                  :key="link.id" 
                  @click="window.open(link.url, '_blank')">
                {{ link.label }}
              </li>
              <li @click="router.push('/login')">Admin Login</li>
            </ul>

            <!-- Link Tipe IMAGE / LOGO -->
            <div class="f-logo-grid" v-if="settings.footerLinks?.some(l => l.type === 'IMAGE')">
              <button v-for="link in settings.footerLinks.filter(l => l.type === 'IMAGE')" 
                      :key="link.id"
                      class="f-logo-btn"
                      @click="window.open(link.url, '_blank')"
                      :title="link.label">
                <img :src="getImageUrl(link.logoUrl)" :alt="link.label" />
              </button>
            </div>

            <!-- Fallback jika belum ada link dinamis -->
            <ul class="f-links" v-if="!settings.footerLinks || settings.footerLinks.length === 0">
              <li @click="router.push('/login')">Admin Login</li>
              <li v-if="settings.custom_domain" @click="window.open('https://' + settings.custom_domain, '_blank')">Official Site</li>
            </ul>
          </div>
        </div>

        <!-- MODE SIMPLE (MINIMALIST) -->
        <div v-if="settings.footer_mode === 'SIMPLE'" class="footer-simple-info">
          <div class="f-logo mb-4 flex justify-center items-center gap-3">
            <img v-if="settings.logo_url" :src="getImageUrl(settings.logo_url)" alt="Logo" class="w-8 h-8 object-contain" />
            <span class="font-bold text-lg">{{ settings.app_name || 'SIGAP' }}</span>
          </div>
        </div>
        
        <div class="footer-bottom" :class="{ 'mt-0 border-none pt-0': settings.footer_mode === 'SIMPLE' }">
          <div class="footer-inner">
            <p>{{ settings.footer_copyright || `&copy; 2026 ${settings.app_name || 'SIGAP'}. All rights reserved.` }}</p>
            <div class="footer-credit">Sistem ini di desain dan di buat oleh : <strong>wiradika.jr</strong></div>
          </div>
        </div>
      </footer>
    </template>

    <Transition name="fade">
      <div v-if="showQrModal" class="modal-overlay" @click.self="showQrModal = false">
        <div class="modal-content qr-modal-wide">
          <div class="modal-header">
            <h3 class="qr-title">{{ activeLinkTitle }}</h3>
            <button @click="showQrModal = false" class="btn-close">✕</button>
          </div>

          <div class="qr-grid">
            <div class="qr-preview-area">
              <div class="qr-img-wrapper">
                <canvas ref="qrCanvas" style="max-width: 100%; height: auto;"></canvas>
              </div>
              <div class="qr-url-box">
                <p class="qr-url">{{ activeShortUrl }}</p>
              </div>
            </div>

            <div class="qr-configs">
              <div class="config-group">
                <label>{{ currentLang === 'en' ? 'Point Shape' : 'Bentuk Titik' }}</label>
                <select v-model="qrOptions.shape">
                  <option value="square">{{ currentLang === 'en' ? 'Square' : 'Kotak' }}</option>
                  <option value="circle">{{ currentLang === 'en' ? 'Circle' : 'Bulat' }}</option>
                </select>
              </div>

              <div class="config-group">
                <label>{{ currentLang === 'en' ? 'Corner Style' : 'Model Sudut' }}</label>
                <select v-model="qrOptions.cornerShape">
                  <option value="square">{{ currentLang === 'en' ? 'Standard' : 'Tajam' }}</option>
                  <option value="rounded">{{ currentLang === 'en' ? 'Rounded' : 'Halus' }}</option>
                </select>
              </div>

              <div class="config-group">
                <label>{{ currentLang === 'en' ? 'Colors' : 'Pilihan Warna' }}</label>
                <div class="color-row">
                  <div class="color-item">
                    <small>QR</small>
                    <input type="color" v-model="qrOptions.color" />
                  </div>
                  <div class="color-item">
                    <small>Bg</small>
                    <input type="color" v-model="qrOptions.bgColor" />
                  </div>
                </div>
              </div>

              <div class="config-group">
                <label>{{ currentLang === 'en' ? 'Density' : 'Kepadatan' }}</label>
                <select v-model="qrOptions.errorLevel">
                  <option value="L">Low</option>
                  <option value="M">Medium</option>
                  <option value="Q">Quartile</option>
                  <option value="H">High</option>
                </select>
              </div>

              <button @click="downloadQR" class="btn-download">
                <Download :size="20" /> Download QR
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</div>
</template>

<style scoped>
/* --- VARIABLES --- */
.page-container {
  --primary: #2563eb;
  --text-main: #0f172a;
  --text-muted: #475569;
  --card-bg: #ffffff;
  --glass-border: rgba(0, 0, 0, 0.05);
  --nav-bg: #ffffff;
  --solid-bg: #f8fafc;
  background-color: var(--solid-bg);
  min-height: 100vh;
  position: relative;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  max-width: 100%;
}

.dark-mode {
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --card-bg: #1e293b;
  --glass-border: rgba(255, 255, 255, 0.1);
  --nav-bg: #0f172a;
  --solid-bg: #0b1121;
}

/* --- BACKGROUND --- */
.bg-image {
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 2; /* Di atas solid bg (z-index 1) */
  opacity: 0.4; /* Meningkatkan opasitas agar lebih terlihat menindih warna */
  pointer-events: none;
}

.dark-mode .bg-image {
  opacity: 0.15;
}

/* Deskripsi Instansi */
.instansi-description {
  max-width: 800px;
  margin: -1rem auto 2.5rem;
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 1.1rem;
}

/* Footer Styling */
.portal-footer {
  margin-top: auto;
  padding: 2.5rem 1.5rem;
  background: var(--nav-bg);
  border-top: 1px solid var(--glass-border);
  color: var(--text-muted);
  text-align: center;
}

.footer-inner p {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.footer-tagline {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.7;
}

/* Dynamic Footer Logo Grid */
.f-logo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 1rem;
  justify-content: center;
}

@media (min-width: 1024px) {
  .f-logo-grid {
    justify-content: flex-start;
  }
}

.f-logo-btn {
  width: 54px;
  height: 54px;
  background: white;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark-mode .f-logo-btn {
  background: #1e293b;
}

.f-logo-btn:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);
  border-color: var(--primary);
}

.f-logo-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Penyesuaian Pro Card agar lebih "Ringan" tanpa blur */
.pro-card {
  background: var(--card-bg);
  border: 1px solid var(--glass-border);

  /* ... sisa properti card tetap sama ... */
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* --- NAVIGATION --- */
.glass-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--nav-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--glass-border);
  transition: all 0.3s ease;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.8rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: transform 0.2s;
}

.brand:hover {
  transform: scale(1.02);
}

.logo-box {
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.dark-mode .logo-box {
  background: #1e293b;
  border-color: var(--glass-border);
}

.logo-box img {
  width: 100%;
  height: 100%;
  padding: 4px; /* Beri sedikit ruang agar tidak terlalu menempel ke tepi */
  object-fit: contain;
}

.project-name {
  font-weight: 900;
  font-size: 1.4rem;
  margin: 0;
  color: var(--text-main);
  letter-spacing: -0.5px;
}

.instansi-name {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-divider {
  width: 1px;
  height: 24px;
  background: var(--glass-border);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.dark-mode .nav-divider {
  border-right: none;
}

.mobile-menu-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--text-main);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.dark-mode .mobile-menu-btn {
  color: #f8fafc;
}

.mobile-menu-btn:hover {
  background: rgba(0,0,0,0.05);
}

.dark-mode .mobile-menu-btn:hover {
  background: rgba(255,255,255,0.1);
}

.lang-switcher {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
}

.dark-mode .lang-switcher {
  background: rgba(255, 255, 255, 0.05);
}

.lang-btn {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.lang-btn.active {
  background: white;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.dark-mode .lang-btn.active {
  background: var(--primary);
  color: #0f172a;
}

.theme-toggle {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid var(--glass-border);
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.dark-mode .theme-toggle {
  background: rgba(255, 255, 255, 0.05);
}

.theme-toggle:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: rotate(15deg);
}

.btn-auth {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--text-main);
  color: var(--card-bg);
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-auth:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.btn-auth.admin {
  background: var(--primary);
  color: white;
}

.dark-mode .btn-auth.admin {
  color: #0f172a;
  background: var(--primary);
}

/* Pastikan container cukup lebar untuk 3 kolom */
.content-wrapper {
  max-width: 1200px;
  /* Standard untuk 3 kolom @ 300px-400px per card */
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

.hero-section {
  text-align: center;
  margin-bottom: 4rem;
  animation: fadeInDown 0.8s ease-out;
}

.animate-title {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, var(--text-main) 0%, var(--primary) 50%, #8b5cf6 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -2px;
  animation: shine 3s linear infinite;
}

@keyframes shine {
  to {
    background-position: 200% center;
  }
}

.dark-mode .animate-title {
  background: linear-gradient(135deg, #ffffff 0%, #93c5fd 100%);
  -webkit-background-clip: text;
  background-clip: text;
  /* <-- TAMBAHKAN INI */
}

.search-box {
  max-width: 600px;
  margin: 0 auto;
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.search-box:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
  transform: translateY(-2px);
}

.search-icon {
  color: var(--text-muted);
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  color: var(--text-main);
  font-size: 1.1rem;
  font-weight: 500;
}

.kbd-shortcut {
  font-size: 0.75rem;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  border: 1px solid var(--glass-border);
}

.dark-mode .kbd-shortcut {
  background: rgba(255, 255, 255, 0.1);
}

/* --- PENYESUAIAN GRID 3 KOLOM --- */
.grid-container {
  display: grid;
  /* Standar: biarkan auto-fill bekerja untuk fleksibilitas */
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.pro-card {
  background: var(--card-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  height: fit-content;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  position: relative;
  overflow: visible; /* Penting untuk tooltip */
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.pro-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), #8b5cf6);
  border-radius: 24px 24px 0 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.pro-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-hover);
  border-color: rgba(37, 99, 235, 0.3);
}

.pro-card:hover::before {
  opacity: 1;
}

.card-main {
  padding: 1.75rem;
  flex-grow: 1;
}

.card-header-flex {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.card-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--primary), #6366f1);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.8rem;
  flex-shrink: 0;
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
  transition: transform 0.3s ease;
}

.pro-card:hover .card-icon {
  transform: scale(1.1) rotate(-5deg);
}

.preview-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: white;
  border-radius: 16px;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.15);
  border: 1px solid var(--glass-border);
  z-index: 50;
  overflow: hidden;
  pointer-events: none;
  animation: slideDownHover 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDownHover {
  0% {
    opacity: 0;
    transform: translateY(-120%);
  }
  100% {
    opacity: 1;
    transform: translateY(-102%);
  }
}

.dark-mode .preview-tooltip {
  background: #1e293b;
  border-color: #334155;
}

.preview-img-wrapper {
  width: 100%;
  height: 120px;
  overflow: hidden;
  background: #f1f5f9;
}

.preview-img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-info {
  padding: 12px;
}

.p-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.p-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.p-url {
  font-size: 0.65rem;
  color: var(--primary);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.title-area h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.3;
}

.category-label {
  font-size: 0.75rem;
  color: var(--primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 4px 10px;
  border-radius: 50px;
  font-weight: 700;
  text-transform: uppercase;
  margin-top: 8px;
  display: inline-block;
  letter-spacing: 0.5px;
}

.desc-wrapper {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--glass-border);
}

.desc-text {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

.desc-text.is-clamped {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  /* <-- TAMBAHKAN INI */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-read-more {
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  padding: 8px 0 0;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-footer {
  padding: 1.25rem 1.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-top: 1px solid var(--glass-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dark-mode .card-footer {
  background: rgba(255, 255, 255, 0.02);
}

.footer-left {
  display: flex;
  gap: 8px;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: translateY(-2px);
}

.btn-launch {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
}

.dark-mode .btn-launch {
  color: #0f172a;
}

.btn-launch:hover {
  background: var(--primary-hover);
  transform: scale(1.03);
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
}

/* --- CATEGORIES --- */
.category-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 3rem;
}

.cat-tab {
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  border: 1px solid var(--glass-border);
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  color: var(--text-muted);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
}

.cat-tab:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-2px);
}

.cat-tab.active {
  background: var(--text-main);
  color: white;
  border-color: var(--text-main);
  transform: scale(1.05);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.dark-mode .cat-tab.active {
  background: var(--primary);
  color: #0f172a;
  border-color: var(--primary);
}

/* --- EMPTY STATE & LOADING --- */
.empty-state {
  padding: 6rem 2rem;
  text-align: center;
  background: var(--card-bg);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  border: 1px solid var(--glass-border);
  max-width: 600px;
  margin: 0 auto;
}

/* --- FULL PAGE LOADER --- */
.full-page-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Agar mengikuti tema gelap/terang dengan efek blur */
  background: var(--nav-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: fadeInDown 0.5s ease-out;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 5px solid var(--glass-border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0;
}

.loading-text {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 1px;
  animation: pulse 1.5s infinite;
}

.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  background: rgba(37, 99, 235, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  color: var(--primary);
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.btn-reset {
  background: var(--text-main);
  color: var(--card-bg);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-reset:hover {
  transform: scale(1.05);
}

/* --- MODAL --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.modal-content {
  background: var(--card-bg);
  width: 100%;
  max-width: 420px;
  border-radius: 32px;
  padding: 2.5rem;
  position: relative;
  text-align: center;
  border: 1px solid var(--glass-border);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.dark-mode .modal-content {
  background: #1e293b;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.btn-close {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-muted);
  font-weight: bold;
  transition: all 0.2s;
}

.dark-mode .btn-close {
  background: rgba(255, 255, 255, 0.1);
}

.btn-close:hover {
  background: #ef4444;
  color: white;
  transform: rotate(90deg);
}



.qr-img-wrapper {
  background: white;
  padding: 1rem;
  border-radius: 24px;
  margin-bottom: 1.5rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.qr-body img {
  width: 100%;
  max-width: 280px;
  border-radius: 12px;
  display: block;
  margin: 0 auto;
}

.qr-title {
  font-weight: 800;
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-main);
}

.qr-url {
  font-family: 'JetBrains Mono', monospace;
  /* Gunakan mono agar terlihat teknis */
  font-size: 0.85rem;
  color: var(--primary);
  word-break: break-all;
}

/* Penyesuaian Modal agar muncul di tengah */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- QR MODAL ENHANCED --- */
.qr-modal-wide {
  max-width: 750px !important;
  width: 90% !important;
}

.qr-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 2rem;
  padding: 1rem;
}

.qr-preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.03);
  padding: 2rem;
  border-radius: 20px;
  border: 1px dashed var(--glass-border);
}

.dark-mode .qr-preview-area {
  background: rgba(255, 255, 255, 0.05);
}

.qr-img-wrapper {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 300px;
}

.qr-url-box {
  margin-top: 1.5rem;
  text-align: center;
}

.qr-url {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-muted);
  word-break: break-all;
}

.qr-configs {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.config-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-group label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.config-group select {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: var(--card-bg);
  color: var(--text-main);
  outline: none;
  font-size: 0.9rem;
}

.color-row {
  display: flex;
  gap: 1rem;
}

.color-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--solid-bg);
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
}

.color-item small {
  font-weight: 700;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.color-item input[type="color"] {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
}

.btn-download {
  width: 100%;
  background: var(--text-main);
  color: var(--card-bg);
  padding: 1rem;
  border-radius: 16px;
  border: none;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 1rem;
  transition: all 0.2s;
}

.dark-mode .btn-download {
  background: var(--primary);
  color: #0f172a;
}

.btn-download:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.2);
  opacity: 0.9;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* --- RESPONSIVITAS GABUNGAN (AMAN) --- */

/* 1. Layar Besar (Desktop) - Paksa 3 Kolom */
@media (min-width: 1024px) {
  .grid-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 2. Layar Menengah (Tablet / iPad) */
@media (max-width: 1023px) and (min-width: 768px) {
  .grid-container {
    grid-template-columns: repeat(2, 1fr);
  }
  .content-wrapper {
    padding: 4rem 2.5rem; /* Margin aman iPad Kiri-Kanan */
  }
}

/* 3. Layar Kecil (Mobile) - Hamburger Menu Dropdown */
@media (max-width: 767px) {
  .grid-container {
    grid-template-columns: 1fr;
  }
  .content-wrapper {
    padding: 2rem 1.5rem;
  }
  .animate-title {
    font-size: 2.2rem;
  }
  .desktop-only {
    display: none;
  }
  .card-header-flex {
    flex-direction: column;
    gap: 1rem;
  }
  .card-icon {
    width: 48px;
    height: 48px;
    font-size: 1.5rem;
  }

  /* Hamburger Menu Tweak */
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .nav-content {
    padding: 0.8rem 1.5rem;
  }
  .brand {
    gap: 10px;
    min-width: 0; /* Penting: izinkan elemen mengecil */
    flex: 1;
  }
  .brand-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  .instansi-name {
    font-size: 0.65rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .logo-box {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }
  .logo-box img {
    width: 22px;
    height: 22px;
  }
  .project-name {
    font-size: 1.1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* Dropdown Style for Nav Actions */
  .nav-actions {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: var(--card-bg);
    border-bottom: 1px solid var(--glass-border);
    flex-direction: column;
    padding: 1.5rem;
    gap: 1rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    
    /* Toggle feature */
    display: none; 
  }
  
  .dark-mode .nav-actions {
    background: #1e293b;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  }

  .nav-actions.is-open {
    display: flex;
    animation: fadeInDown 0.2s ease-out;
  }
  
  .nav-divider {
    display: none;
  }
  
  .lang-switcher, .theme-toggle, .btn-auth {
    width: 100%;
    justify-content: center;
  }
  
  .btn-auth {
    padding: 12px;
    border-radius: 12px;
  }
}

/* 4. Layar Sangat Terbatas (< 360px) */
@media (max-width: 360px) {
  .nav-content {
    padding: 0.8rem 1rem;
  }
  .project-name {
    font-size: 1.1rem;
  }
  .instansi-name {
    font-size: 0.6rem;
  }
}

.btn-page-portal {
  padding: 12px 24px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-main);
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.btn-page-portal:not(:disabled):hover {
  transform: translateY(-2px);
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
}

/* --- PORTAL FOOTER --- */
.portal-footer {
  margin-top: 6rem;
  background: var(--card-bg);
  border-top: 1px solid var(--glass-border);
  padding: 4rem 10% 0; /* Menambah padding samping menjadi 10% agar lebih lega */
  transition: all 0.3s ease;
}

.footer-grid {
  max-width: 1200px;
  margin: 0 auto 4rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 4rem;
}

.footer-col h4 {
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1.5rem;
  color: var(--text-main);
}

.brand-col .f-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.2rem;
}

.brand-col .f-logo img {
  height: 32px;
  width: auto;
}

.brand-col .f-app-name {
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--text-main);
}

.brand-col .f-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 400px;
}

.f-contact, .f-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.f-contact li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.f-contact li svg {
  flex-shrink: 0;
  color: var(--primary);
  margin-top: 2px;
}

.f-links li {
  font-size: 0.9rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
}

.f-links li:hover {
  color: var(--primary);
}

.footer-bottom {
  border-top: 1px solid var(--glass-border);
  padding: 2rem 10%; /* Menambah padding samping menjadi 10% agar sejajar */
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
  
  .footer-inner {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }
}

.footer-credit {
  font-size: 0.8rem;
  opacity: 0.7;
}

.footer-credit strong {
  color: var(--primary);
}
</style>