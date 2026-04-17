<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import api from '../lib/axios'
import QRCode from 'qrcode'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import SIGAPIcons from '../components/SIGAPIcons.vue'

const router = useRouter()
const route = useRoute()
const event = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// QR State
const showQrModal = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const copied = ref(false)
const qrOptions = ref({
  color: '#0f172a',
  bgColor: '#ffffff',
  shape: 'square',
  cornerShape: 'square',
  errorLevel: 'M'
})

const currentUrl = computed(() => window.location.href)

const apiBase = import.meta.env.VITE_API_URL || '/api'

const fetchEventData = async () => {
  try {
    const slug = route.params.slug
    const res = await axios.get(`${apiBase}/public/events/${slug}`)
    event.value = res.data
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Halaman tidak ditemukan'
  } finally {
    isLoading.value = false
  }
}

const handleLinkClick = async (e: MouseEvent, item: any) => {
  if (event.value && event.value.status !== 'AKTIF') {
    e.preventDefault()
    if (confirm(`Pratinjau: Link ini berstatus ${event.value.status}. Lanjut tes link?`)) {
      window.open(item.url, '_blank')
    }
    return
  }
  try { await axios.post(`${apiBase}/public/events/click`, { itemId: item.id }) } catch (err) { console.error(err) }
}

const bgStyle = computed(() => {
  if (!event.value) return {}
  if (event.value.bgType === 'image') return { backgroundImage: `url(${event.value.bgValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { backgroundColor: event.value.bgValue }
})

const renderCanvas = async () => {
  if (!qrCanvas.value) return
  const canvas = qrCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  try {
    const qrData = QRCode.create(currentUrl.value, { errorCorrectionLevel: qrOptions.value.errorLevel as any })
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

const generateQR = () => { showQrModal.value = true; setTimeout(renderCanvas, 100) }

const groupedItems = computed(() => {
  const result: any[] = []
  let currentSoc: any[] = []
  if (!event.value?.items) return []
  event.value.items.forEach((item: any) => {
    if (item.type === 'SOCIAL' && item.layout === 'icon-only' && item.isActive) {
      currentSoc.push(item)
    } else {
      if (currentSoc.length > 0) { result.push({ type: 'SOC_GROUP', items: [...currentSoc] }); currentSoc = [] }
      result.push(item)
    }
  })
  if (currentSoc.length > 0) result.push({ type: 'SOC_GROUP', items: [...currentSoc] })
  return result
})

onMounted(() => {
  fetchEventData()
  document.documentElement.classList.remove('dark')
})
</script>

<template>
  <div class="min-h-screen w-full flex flex-col items-center selection:bg-white/20 selection:text-white font-sans" :style="bgStyle">
    <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center text-white/40">
       <div class="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin mb-4"></div>
       <p class="text-[10px] font-black uppercase tracking-widest">Memuat Event</p>
    </div>

    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center text-white/40 text-center px-6">
       <SIGAPIcons name="AlertCircle" :size="64" class="mb-4 text-red-500" />
       <h2 class="text-xl font-black text-white tracking-tight">{{ error }}</h2>
       <p class="text-xs font-bold text-white/60 uppercase tracking-widest mt-2">Halaman tidak tersedia atau inaktif.</p>
    </div>

    <div v-else class="w-full max-w-[600px] flex flex-col items-center animate-fadeup">
       <!-- Header Section -->
       <div class="w-full mb-10 text-center">
          <div v-if="event.showCover" class="w-full overflow-hidden bg-slate-900 shadow-2xl relative" :style="{ height: (event.coverHeight || 180) + 'px' }">
             <img v-if="event.eventPhoto" :src="event.eventPhoto" class="w-full h-full object-cover" />
             <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
          
          <div class="px-6 flex flex-col items-center" :class="event.showCover && event.showProfile ? '-mt-14' : 'pt-12'">
             <div v-if="event.showProfile" :class="event.profileShape === 'circle' ? 'rounded-full' : 'rounded-[2.5rem]'"
                  :style="{ width: event.profileWidth + 'px', height: event.profileHeight + 'px', borderWidth: event.profileBorderWidth + 'px', borderStyle: 'solid', borderColor: event.profileBgColor }"
                  class="bg-white overflow-hidden shadow-2xl transition-all relative z-10">
                <img v-if="event.profilePhoto" :src="event.profilePhoto" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-black text-3xl uppercase">EP</div>
             </div>
             
             <h1 v-if="event.showTitle" class="text-2xl font-black mt-6 tracking-tight leading-tight" :style="{ color: event.titleColor, fontFamily: event.titleFont }">
                {{ event.title }}
             </h1>
             <p v-if="event.showDescription" class="mt-4 text-sm font-medium leading-relaxed opacity-80 px-6 max-w-md mx-auto" :style="{ color: event.descColor, fontFamily: event.descFont }">
                {{ event.description }}
             </p>
          </div>
       </div>

       <!-- Links List -->
       <div class="w-full px-6 space-y-4 pb-12">
          <template v-for="(item, i) in groupedItems" :key="i">
             <!-- Social Grid -->
             <div v-if="item.type === 'SOC_GROUP'" class="flex flex-wrap justify-center gap-4 py-4">
                <a v-for="(soc, si) in item.items" :key="'s'+si" :href="soc.url" target="_blank"
                   @click="handleLinkClick($event, soc)"
                   :style="{ backgroundColor: soc.color, color: soc.textColor, borderRadius: event.buttonRadius + 'px' }"
                   class="w-14 h-14 flex items-center justify-center shadow-xl hover:scale-110 transition-all border border-white/10 active:scale-95">
                   <SIGAPIcons :name="soc.icon || 'Instagram'" :size="24" />
                </a>
             </div>

             <!-- Divider -->
             <div v-else-if="item.type === 'DIVIDER'" class="py-6 flex flex-col items-center gap-2">
                <div class="w-1/3 opacity-20" :style="{ backgroundColor: item.color, height: (item.order || 1) + 'px' }"></div>
                <span v-if="item.label" class="text-[9px] font-black uppercase tracking-[0.2em] opacity-40" :style="{ color: item.color }">{{ item.label }}</span>
             </div>

             <!-- Regular Button -->
             <a v-else-if="item.isActive" :href="item.url" target="_blank"
                @click="handleLinkClick($event, item)"
                :style="{ backgroundColor: item.color, color: item.textColor, borderRadius: event.buttonRadius + 'px' }"
                :class="{ 'flex-row-reverse': item.layout === 'icon-right' || item.layout === 'icon-edge-right', 'justify-between': item.layout.includes('edge'), 'justify-center': !item.layout.includes('edge') }"
                class="w-full p-4.5 flex items-center gap-3 shadow-xl hover:scale-[1.02] transition-all transform active:scale-100 border border-white/10">
                <SIGAPIcons v-if="item.layout !== 'text-only'" :name="item.icon || 'Link'" :size="20" />
                <span class="text-sm font-black uppercase tracking-tight text-center" :class="{ 'flex-1': item.layout.includes('edge') || item.layout === 'text-only' || item.layout === 'icon-left' || item.layout === 'icon-right' }">{{ item.label }}</span>
                <div v-if="item.layout.includes('edge')" class="w-5 h-5 invisible"></div>
             </a>
          </template>
       </div>

       <!-- Footer Section -->
       <footer v-if="event.showFooter" class="w-full mt-auto py-12 px-10 text-center space-y-8">
          <p v-if="event.footerText" class="text-xs font-bold leading-relaxed opacity-90 whitespace-pre-wrap" :style="{ color: event.footerColor, fontFamily: event.footerFont }">
             {{ event.footerText }}
          </p>
          
          <div v-if="event.showSystemBranding" class="space-y-1 opacity-30 grayscale pt-6 border-t border-white/5">
             <p class="text-[9px] font-black uppercase tracking-[0.2em]">© {{ new Date().getFullYear() }} {{ event.customBranding }}</p>
             <p class="text-[7px] font-bold uppercase tracking-widest opacity-60">Powered by {{ event.customPoweredBy }}</p>
          </div>
       </footer>

       <!-- Share Float Button -->
       <button @click="generateQR" class="fixed bottom-8 right-8 w-14 h-14 bg-white text-slate-900 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group">
          <SIGAPIcons name="QrCode" :size="24" />
          <span class="absolute right-full mr-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-all">Bagikan Koleksi</span>
       </button>
    </div>

    <!-- QR Modal -->
    <Teleport to="body">
       <div v-if="showQrModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="showQrModal = false"></div>
          <div class="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center animate-fadeup border border-slate-100">
             <h3 class="font-black text-slate-800 text-xl tracking-tight mb-8">Pindai Kode QR</h3>
             <div class="p-8 bg-slate-50 rounded-[2.5rem] inline-block mb-8 shadow-inner">
                <canvas ref="qrCanvas" class="w-64 h-64 mx-auto"></canvas>
             </div>
             <div class="bg-blue-50 p-4 rounded-2xl mb-8 flex items-center justify-between gap-4">
                <p class="text-[10px] font-mono font-bold text-blue-600 truncate">{{ currentUrl }}</p>
                <button @click="generateQR" class="p-2 bg-white text-blue-600 rounded-xl shadow-sm"><SIGAPIcons name="RefreshCcw" :size="14" /></button>
             </div>
             <button @click="showQrModal = false" class="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">Tutup Link</button>
          </div>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
