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

const settings = computed(() => settingsStore.settings)
const API_URL = API_BASE_URL

// Modal & QR State
const showQrModal = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const activeLinkTitle = ref('')
const activeShortUrl = ref('')
const copiedId = ref<number | null>(null)

const qrOptions = ref({
  color: '#0f172a',
  bgColor: '#ffffff',
  shape: 'square',
  cornerShape: 'square',
  errorLevel: 'M'
})

const getImageUrl = (path: string) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

const openLink = (link: any) => {
  if (!link) return
  if (link.slug) window.open(`${API_URL}/s/${link.slug}`, '_blank')
  else window.open(link.url, '_blank')
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
    const size = 400
    const margin = 4
    const cellSize = size / (modules.size + margin * 2)
    canvas.width = size; canvas.height = size
    ctx.fillStyle = qrOptions.value.bgColor; ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = qrOptions.value.color
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) {
          const x = (col + margin) * cellSize
          const y = (row + margin) * cellSize
          if (qrOptions.value.shape === 'circle') {
            ctx.beginPath(); ctx.arc(x + cellSize/2, y + cellSize/2, cellSize*0.4, 0, Math.PI*2); ctx.fill()
          } else { ctx.fillRect(x, y, cellSize, cellSize) }
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
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-600">
    <div v-if="settings.bg_url" class="fixed inset-0 opacity-10 pointer-events-none bg-center bg-cover" :style="{ backgroundImage: `url(${getImageUrl(settings.bg_url)})` }"></div>

    <div v-if="isLoading" class="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
       <div class="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
       <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Menyiapkan Layanan</p>
    </div>

    <!-- Navigation -->
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
       <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div class="flex items-center gap-4 cursor-pointer" @click="router.push('/')">
             <img v-if="settings.logo_url" :src="getImageUrl(settings.logo_url)" class="h-10 w-auto object-contain" />
             <div v-else class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><SIGAPIcons name="Activity" :size="24" /></div>
             <div>
                <h1 class="font-black text-lg tracking-tighter leading-none">{{ settings.app_name || 'SIGAP' }}</h1>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{{ settings.instansi_name || 'Portal Layanan' }}</p>
             </div>
          </div>

          <div class="hidden md:flex items-center gap-4">
             <button v-if="!authStore.token" @click="router.push('/login')" class="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2">
                <SIGAPIcons name="LogIn" :size="14" /> Login Pegawai
             </button>
             <button v-else @click="router.push('/admin/dashboard')" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                <SIGAPIcons name="LayoutDashboard" :size="14" /> Dashboard
             </button>
          </div>
          
          <button class="md:hidden p-2 text-slate-600" @click="isMobileMenuOpen = !isMobileMenuOpen">
             <SIGAPIcons :name="isMobileMenuOpen ? 'X' : 'Menu'" :size="24" />
          </button>
       </div>
    </nav>

    <!-- Hero Section -->
    <header class="max-w-7xl mx-auto px-6 pt-16 pb-12 text-center space-y-8 animate-fadeup relative z-10">
       <h2 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto italic">
          {{ settings.hero_title || 'Pusat Layanan Digital' }}
       </h2>
       <p class="text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
          {{ settings.hero_subtitle || 'Akses cepat dan mudah ke seluruh aplikasi internal serta layanan publik kami dalam satu pintu.' }}
       </p>
       
       <div class="max-w-2xl mx-auto relative group">
          <SIGAPIcons name="Search" :size="20" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
          <input v-model="searchQuery" type="text" placeholder="Cari layanan atau aplikasi..." class="w-full bg-white border-2 border-slate-100 rounded-[2rem] py-5 px-14 text-sm font-bold shadow-2xl shadow-slate-200/50 outline-none focus:border-blue-500 transition-all" />
       </div>
    </header>

    <!-- Categories -->
    <div class="max-w-7xl mx-auto px-6 mb-12 flex flex-wrap justify-center gap-2 relative z-10">
       <button @click="selectedCategory = 'ALL'" :class="selectedCategory === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100'" class="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">Semua</button>
       <button v-for="cat in visibleCategories" :key="cat.id" @click="selectedCategory = cat.id" :class="selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100'" class="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
          {{ cat.name }}
       </button>
    </div>

    <!-- Main Grid -->
    <main class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32 relative z-10">
       <div v-for="link in filteredLinks" :key="link.id" @click="openLink(link)" class="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all cursor-pointer flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6 mb-6">
             <SIGAPIcons :name="link.icon || 'Link'" :size="32" />
          </div>
          <h3 class="font-black text-slate-800 text-lg tracking-tight mb-2">{{ link.title }}</h3>
          <p class="text-xs text-slate-400 font-medium leading-relaxed mb-8 grow line-clamp-3">{{ link.desc || 'Akses layanan ini secara langsung.' }}</p>
          
          <div class="w-full flex items-center gap-2 pt-6 border-t border-slate-50">
             <button @click.stop="copyLink(link)" class="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-90">
                <SIGAPIcons v-if="copiedId !== link.id" name="Copy" :size="18" />
                <SIGAPIcons v-else name="Check" :size="18" class="text-emerald-500" />
             </button>
             <button @click.stop="generateQR(link)" class="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-90">
                <SIGAPIcons name="QrCode" :size="18" />
             </button>
             <div class="grow"></div>
             <button class="px-6 py-3 bg-slate-50 text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all">Buka Layanan</button>
          </div>
       </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-100 pt-16 pb-12 relative z-10">
       <div class="max-w-7xl mx-auto px-6 text-center space-y-8">
          <div class="flex items-center justify-center gap-4 opacity-40">
             <img v-if="settings.logo_url" :src="getImageUrl(settings.logo_url)" class="h-8 w-auto grayscale" />
             <span class="font-bold text-slate-400 text-xs tracking-widest uppercase">{{ settings.app_name }}</span>
          </div>
          <p class="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] leading-relaxed max-w-xl mx-auto">
             {{ settings.footer_text || 'Inovasi Digital untuk Pelayanan yang Lebih Baik' }}
          </p>
          <div class="pt-8 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-col md:flex-row justify-between items-center gap-4">
             <p>© 2026 {{ settings.instansi_name }}. All rights reserved.</p>
             <p class="text-blue-600/50">Designed by wiradika.jr</p>
          </div>
       </div>
    </footer>

    <!-- QR Modal -->
    <Teleport to="body">
       <div v-if="showQrModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showQrModal = false"></div>
          <div class="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 text-center animate-fadeup border border-slate-100">
             <h3 class="font-black text-slate-800 text-xl tracking-tight mb-8">{{ activeLinkTitle }}</h3>
             <div class="p-6 bg-slate-50 rounded-[2rem] inline-block mb-8">
                <canvas ref="qrCanvas" class="w-64 h-64 object-contain mx-auto"></canvas>
             </div>
             <div class="bg-slate-50 p-4 rounded-2xl mb-8">
                <p class="text-[10px] font-mono font-bold text-blue-600">{{ activeShortUrl }}</p>
             </div>
             <button @click="showQrModal = false" class="w-full py-4 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">Tutup Pratinjau</button>
          </div>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>