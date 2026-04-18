<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue'
import api from '../lib/axios'
import QRCode from 'qrcode'
import { useRouter } from 'vue-router'
import SIGAPIcons from '../components/SIGAPIcons.vue'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'
import { API_BASE_URL } from '../lib/config'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const links = ref<any[]>([])
const categories = ref<any[]>([])
const isLoading = ref(true)
const isOffline = ref(false)
const searchQuery = ref('')
const selectedCategory = ref<number | 'ALL'>('ALL')
const isMobileMenuOpen = ref(false)
const currentPage = ref(1)
const linksPerPage = 6

const settings = computed(() => settingsStore.settings)
const API_URL = API_BASE_URL

// Modal & QR State
const showQrModal = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const activeLinkTitle = ref('')
const activeShortUrl = ref('')
const copiedId = ref<number | null>(null)
const hoveredCardId = ref<number | null>(null)
const previewData = reactive<Record<number, any>>({})
const previewLoading = reactive<Record<number, boolean>>({})
const hoverTimers = reactive<Record<number, any>>({})

const qrOptions = ref({
  color: '#0f172a',
  bgColor: '#ffffff',
  shape: 'square', // square, circle
  cornerShape: 'square', // square, rounded
  errorLevel: 'M'
})

// Real-time QR update
watch(qrOptions, () => {
  if (showQrModal.value) renderCanvas()
}, { deep: true })

// Reset page on search or category change
watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1
})

const downloadQR = () => {
  if (!qrCanvas.value) return
  const link = document.createElement('a')
  link.href = qrCanvas.value.toDataURL('image/png')
  link.download = `QR-${activeLinkTitle.value}.png`
  link.click()
}

const getImageUrl = (path: string) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

const openLink = (link: any) => {
  if (!link) return
  const redirectionUrl = link.slug ? `/s/${link.slug}` : link.url
  window.open(redirectionUrl, '_blank')
}

const onCardHover = (link: any) => {
  hoveredCardId.value = link.id
  if (previewData[link.id]) return

  hoverTimers[link.id] = setTimeout(async () => {
    try {
      previewLoading[link.id] = true
      const res = await api.get(`/portal/preview?url=${encodeURIComponent(link.url)}`)
      if (hoveredCardId.value === link.id) {
        previewData[link.id] = res.data
      }
    } catch (e) {
      previewData[link.id] = { error: true }
    } finally {
      previewLoading[link.id] = false
    }
  }, 150)
}

const onCardLeave = (link: any) => {
  hoveredCardId.value = null
  if (hoverTimers[link.id]) {
    clearTimeout(hoverTimers[link.id])
    delete hoverTimers[link.id]
  }
}

const loadData = async () => {
  isLoading.value = true
  isOffline.value = false
  try {
    await settingsStore.fetchSettings()
    const [resLinks, resCats] = await Promise.allSettled([
      api.get('/portal/links'),
      api.get('/categories')
    ])
    if (resLinks.status === 'rejected') isOffline.value = true
    else {
      if (resLinks.status === 'fulfilled') links.value = resLinks.value.data
      if (resCats.status === 'fulfilled') categories.value = resCats.value.data
    }
  } catch (err) { isOffline.value = true }
  finally { isLoading.value = false }
}

const filteredLinks = computed(() => {
  return links.value.filter(link => {
    const title = (link.title || '').toLowerCase()
    const desc = (link.desc || '').toLowerCase()
    const search = searchQuery.value.toLowerCase()
    const matchSearch = title.includes(search) || desc.includes(search)
    const linkCatId = link.category_id || link.category?.id
    const matchCat = selectedCategory.value === 'ALL' || linkCatId === selectedCategory.value
    return matchSearch && matchCat
  })
})

const visibleCategories = computed(() => {
  const activeCategoryIds = new Set(links.value.map(l => l.category_id || l.category?.id))
  return categories.value.filter(cat => activeCategoryIds.has(cat.id))
})

const totalPages = computed(() => Math.ceil(filteredLinks.value.length / linksPerPage))

const paginatedLinks = computed(() => {
  const start = (currentPage.value - 1) * linksPerPage
  return filteredLinks.value.slice(start, start + linksPerPage)
})

const generateQR = (link: any) => {
  activeLinkTitle.value = link.title
  activeShortUrl.value = `${window.location.origin}/s/${link.slug}`
  showQrModal.value = true
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
    const size = 600 // High res for canvas
    const margin = 4
    const cellSize = size / (moduleCount + margin * 2)
    
    canvas.width = size; canvas.height = size
    ctx.fillStyle = qrOptions.value.bgColor; ctx.fillRect(0, 0, size, size)
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
            // @ts-ignore - roundRect is newer but supported in modern browsers
            if (ctx.roundRect) {
               ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.2)
            } else {
               ctx.rect(x, y, cellSize, cellSize)
            }
            ctx.fill()
          } else if (qrOptions.value.shape === 'circle') {
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

const copyLink = (link: any) => {
  navigator.clipboard.writeText(`${window.location.origin}/s/${link.slug}`)
  copiedId.value = link.id
  setTimeout(() => copiedId.value = null, 2000)
}

onMounted(() => {
  loadData()
  document.documentElement.classList.remove('dark') // Force light mode
})
</script>

<template>
  <div class="min-h-screen bg-slate-200/40 font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-600 relative">
    <!-- Sophisticated Background Layer -->
    <div class="fixed inset-0 pointer-events-none bg-gradient-to-br from-blue-100/20 via-slate-50 to-indigo-100/20"></div>
    <div v-if="settings.bg_url" class="fixed inset-0 opacity-10 pointer-events-none bg-center bg-cover mix-blend-multiply" :style="{ backgroundImage: `url(${getImageUrl(settings.bg_url)})` }"></div>

    <div v-if="isLoading" class="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
       <div class="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
       <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Menyiapkan Layanan</p>
    </div>

    <!-- Navigation -->
    <nav class="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 shadow-2xl shadow-slate-900/20 transition-all duration-300">
       <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div class="flex items-center gap-4 cursor-pointer" @click="router.push('/')">
             <img v-if="settings.logo_url" :src="getImageUrl(settings.logo_url)" class="h-10 w-auto object-contain brightness-0 invert" />
             <div v-else class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20"><SIGAPIcons name="Activity" :size="24" /></div>
             <div>
                <h1 class="font-black text-2xl tracking-tighter leading-none text-white">{{ settings.app_name || 'SIGAP' }}</h1>
                <p class="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5">{{ settings.instansi_name || 'Portal Layanan' }}</p>
             </div>
          </div>

          <div class="hidden md:flex items-center gap-4">
             <button v-if="!authStore.token" @click="router.push('/login')" class="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                <SIGAPIcons name="LogIn" :size="14" /> Login Pegawai
             </button>
             <button v-else @click="router.push('/admin/dashboard')" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
                <SIGAPIcons name="LayoutDashboard" :size="14" /> Dashboard
             </button>
          </div>
          
          <button class="md:hidden p-2 text-white" @click="isMobileMenuOpen = !isMobileMenuOpen">
             <SIGAPIcons :name="isMobileMenuOpen ? 'X' : 'Menu'" :size="24" />
          </button>
       </div>
    </nav>

    <!-- Hero Section -->
    <header class="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center space-y-10 animate-fadeup relative z-10">
        <h2 class="text-4xl md:text-6xl font-black text-slate-800 tracking-tight leading-[1.1] max-w-4xl mx-auto">
          {{ settings.hero_title || 'Pusat Layanan Digital' }}
       </h2>
       <p class="text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium text-lg">
          {{ settings.hero_subtitle || 'Akses cepat dan mudah ke seluruh aplikasi internal serta layanan internal kami dalam satu pintu.' }}
       </p>
              <div class="max-w-2xl mx-auto relative group">
          <SIGAPIcons name="Search" :size="20" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input v-model="searchQuery" type="text" placeholder="Cari layanan atau aplikasi..." class="w-full bg-white border-2 border-slate-200 rounded-[2rem] py-5 px-14 text-sm font-bold shadow-2xl shadow-blue-900/5 outline-none focus:border-blue-500 transition-all placeholder:text-slate-400" />
       </div>
    </header>

    <!-- Categories -->
    <div class="max-w-7xl mx-auto px-6 mb-12 flex flex-wrap justify-center gap-3 relative z-10">
       <button @click="selectedCategory = 'ALL'" :class="selectedCategory === 'ALL' ? 'bg-slate-800 text-white shadow-xl shadow-slate-900/20 ring-4 ring-slate-800/10' : 'bg-white/80 text-slate-600 hover:bg-white border-2 border-slate-200 shadow-sm'" class="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Semua</button>
       <button v-for="cat in visibleCategories" :key="cat.id" @click="selectedCategory = cat.id" :class="selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 ring-4 ring-blue-600/10' : 'bg-white/80 text-slate-600 hover:bg-white border-2 border-slate-200 shadow-sm'" class="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
          {{ cat.name }}
       </button>
    </div>

    <!-- 🌐 GUEST PORTAL (INTERNAL) -->
     <main class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32 relative z-10">
        <div 
         v-for="link in paginatedLinks" 
         :key="link.id" 
         @click="openLink(link)" 
         @mouseenter="onCardHover(link)"
         @mouseleave="onCardLeave(link)"
         :class="[
           'group bg-white p-8 rounded-[2.5rem] border-2 border-slate-200 shadow-xl shadow-slate-200 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-2 transition-all cursor-pointer flex flex-col items-center text-center relative',
           hoveredCardId === link.id ? 'z-50' : 'z-10'
         ]"
       >
          <!-- Background Effects Wrapper (Clipped) -->
          <div class="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
             <div class="absolute inset-0 bg-gradient-to-b from-blue-50/0 via-transparent to-blue-50/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <!-- Hover Preview Tooltip -->
          <Transition name="fade">
            <div v-if="hoveredCardId === link.id" class="absolute bottom-[calc(100%+1.5rem)] left-1/2 w-[300px] -ml-[150px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden z-[100] pointer-events-none shadow-blue-900/10">
              
              <!-- Loading State -->
              <div v-if="previewLoading[link.id] && !previewData[link.id]" class="p-8 flex flex-col items-center gap-3">
                 <div class="w-8 h-8 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                 <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Mengambil Pratinjau...</p>
              </div>

              <!-- Content State -->
              <template v-else-if="previewData[link.id] && !previewData[link.id].error">
                <div v-if="previewData[link.id].image" class="aspect-video w-full overflow-hidden bg-slate-100">
                  <img :src="previewData[link.id].image" class="w-full h-full object-cover" />
                </div>
                <div class="p-8 text-left">
                  <h4 class="font-black text-slate-800 text-sm mb-2 line-clamp-2 leading-tight">{{ previewData[link.id].title || link.title }}</h4>
                  <p class="text-[10px] text-slate-500 font-bold line-clamp-3 leading-relaxed opacity-80">{{ previewData[link.id].description || link.desc }}</p>
                </div>
                <div class="px-8 py-4 bg-slate-50 border-t border-slate-100 text-[9px] font-bold text-blue-600 truncate flex items-center gap-2">
                   <SIGAPIcons name="ExternalLink" :size="10" />
                   {{ link.url }}
                </div>
              </template>

              <!-- Fallback/Error State -->
              <div v-else-if="previewData[link.id] && previewData[link.id].error" class="p-8 text-center">
                 <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Pratinjau Tidak Tersedia</p>
              </div>
            </div>
          </Transition>

          <div class="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6 mb-6 z-10 border border-blue-100/50">
             <SIGAPIcons :name="link.icon || 'Link'" :size="32" />
          </div>
          <h3 class="font-black text-slate-700 text-lg tracking-tight mb-2 z-10">{{ link.title }}</h3>
          <p class="text-xs text-slate-500 font-bold leading-relaxed mb-8 grow line-clamp-3 z-10 opacity-70 group-hover:opacity-100">{{ link.desc || 'Akses layanan ini secara langsung.' }}</p>
          
          <div class="w-full flex items-center gap-2 pt-6 border-t border-slate-100 z-10">
             <button @click.stop="copyLink(link)" class="p-3 bg-slate-100 rounded-xl text-slate-500 hover:text-blue-600 transition-all active:scale-90">
                <SIGAPIcons v-if="copiedId !== link.id" name="Copy" :size="18" />
                <SIGAPIcons v-else name="Check" :size="18" class="text-emerald-600" />
             </button>
             <button @click.stop="generateQR(link)" class="p-3 bg-slate-100 rounded-xl text-slate-500 hover:text-blue-600 transition-all active:scale-90">
                <SIGAPIcons name="QrCode" :size="18" />
             </button>
             <div class="grow"></div>
             <button class="px-6 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 group-hover:shadow-blue-200">Buka Layanan</button>
          </div>
        </div>
     </main>

     <!-- Pagination UI -->
     <div v-if="totalPages > 1" class="max-w-7xl mx-auto px-6 mb-16 flex items-center justify-center gap-4 relative z-10 animate-fadeup">
        <button 
          @click="currentPage--" 
          :disabled="currentPage === 1"
          class="p-4 rounded-3xl border-2 border-slate-200 bg-white text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-lg shadow-slate-200 active:scale-90"
        >
           <SIGAPIcons name="ChevronLeft" :size="20" />
        </button>
        
        <div class="flex items-center gap-2">
           <button 
             v-for="page in totalPages" 
             :key="page" 
             @click="currentPage = page"
             :class="currentPage === page ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
             class="w-12 h-12 rounded-2xl border-2 font-black text-xs transition-all active:scale-95"
           >
              {{ page }}
           </button>
        </div>

        <button 
          @click="currentPage++" 
          :disabled="currentPage === totalPages"
          class="p-4 rounded-3xl border-2 border-slate-200 bg-white text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-lg shadow-slate-200 active:scale-90"
        >
           <SIGAPIcons name="ChevronRight" :size="20" />
        </button>
     </div>

    <!-- Footer -->
    <footer class="bg-slate-900 border-t border-slate-800 pt-16 pb-12 relative z-10 text-white">
       <div class="max-w-7xl mx-auto px-6 text-center space-y-8">
          <div class="flex items-center justify-center gap-4 opacity-100">
             <img v-if="settings.logo_url" :src="getImageUrl(settings.logo_url)" class="h-8 w-auto brightness-0 invert" />
             <span class="font-black text-white text-xs tracking-[0.3em] uppercase">{{ settings.app_name }}</span>
          </div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-relaxed max-w-xl mx-auto">
             {{ settings.footer_text || 'Inovasi Digital untuk Pelayanan yang Lebih Baik' }}
          </p>
          <div class="pt-8 border-t border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest flex flex-col md:flex-row justify-between items-center gap-4">
             <p>© 2026 {{ settings.instansi_name }}. All rights reserved.</p>
             <p class="text-blue-500">Designed by wiradika.jr</p>
          </div>
       </div>
    </footer>

    <!-- Advanced QR Modal -->
    <Teleport to="body">
       <div v-if="showQrModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="showQrModal = false"></div>
          <div class="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-fadeup border border-slate-100 overflow-hidden">
             
             <!-- Modal Header -->
             <div class="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <div class="flex items-center gap-4 text-slate-800">
                   <div class="p-3 bg-blue-50 text-blue-600 rounded-2xl"><SIGAPIcons name="QrCode" :size="24" /></div>
                   <h3 class="font-black text-xl tracking-tight">{{ activeLinkTitle }}</h3>
                </div>
                <button @click="showQrModal = false" class="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><SIGAPIcons name="X" :size="20" /></button>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                <!-- Left: Preview -->
                <div class="space-y-6">
                   <div class="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 flex items-center justify-center group shadow-inner">
                      <canvas ref="qrCanvas" class="w-full h-auto aspect-square object-contain transition-transform group-hover:scale-105"></canvas>
                   </div>
                   <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                      <p class="text-[10px] font-mono font-bold text-blue-600 text-center truncate">{{ activeShortUrl }}</p>
                   </div>
                </div>

                <!-- Right: Configs -->
                <div class="space-y-6">
                   <!-- Shape -->
                   <div class="space-y-3">
                      <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bentuk Titik</label>
                      <div class="flex gap-2">
                         <button @click="qrOptions.shape = 'square'" :class="qrOptions.shape === 'square' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'" class="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent">Kotak</button>
                         <button @click="qrOptions.shape = 'circle'" :class="qrOptions.shape === 'circle' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'" class="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent">Bulat</button>
                      </div>
                   </div>

                   <!-- Corner -->
                   <div class="space-y-3">
                      <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Model Sudut</label>
                      <div class="flex gap-2">
                         <button @click="qrOptions.cornerShape = 'square'" :class="qrOptions.cornerShape === 'square' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'" class="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent">Tajam</button>
                         <button @click="qrOptions.cornerShape = 'rounded'" :class="qrOptions.cornerShape === 'rounded' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'" class="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent">Halus</button>
                      </div>
                   </div>

                   <!-- Colors -->
                   <div class="space-y-3">
                      <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Warna</label>
                      <div class="grid grid-cols-2 gap-4">
                         <div class="relative overflow-hidden group">
                           <input type="color" v-model="qrOptions.color" class="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" title="Warna QR" />
                           <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                              <span class="text-[10px] font-black text-slate-700">QR</span>
                              <div class="w-4 h-4 rounded-full border border-slate-200 shadow-sm" :style="{ backgroundColor: qrOptions.color }"></div>
                           </div>
                         </div>
                         <div class="relative overflow-hidden group">
                           <input type="color" v-model="qrOptions.bgColor" class="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" title="Warna Background" />
                           <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                              <span class="text-[10px] font-black text-slate-700">BG</span>
                              <div class="w-4 h-4 rounded-full border border-slate-200 shadow-sm" :style="{ backgroundColor: qrOptions.bgColor }"></div>
                           </div>
                         </div>
                      </div>
                   </div>

                   <!-- Download Button -->
                   <div class="pt-6">
                      <button @click="downloadQR" class="w-full py-5 bg-slate-800 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl shadow-slate-800/20 active:scale-95 flex items-center justify-center gap-3 group">
                         <SIGAPIcons name="Download" :size="20" class="group-hover:-translate-y-1 transition-transform" /> Download PNG
                      </button>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
.scrollbar-hide::-webkit-scrollbar { display: none; }
/* Link Preview Transition */
.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
