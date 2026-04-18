<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import SIGAPSelect from '../../components/admin/SIGAPSelect.vue'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'
import { useAuthStore } from '../../stores/auth'
import QRCode from 'qrcode'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const isSaving = ref(false)
const settings = ref<any>({})

const selectedPanel = ref<string>('branding') 
const togglePanel = (tab: string) => {
  if (selectedPanel.value === tab) {
    selectedPanel.value = '' 
  } else {
    selectedPanel.value = tab
  }
}
const windowWidth = ref(window.innerWidth)
const handleResize = () => { windowWidth.value = window.innerWidth }
const showIconModal = ref(false)
const activeItemIndex = ref<number | null>(null)

const event = ref<any>({
  id: null,
  title: '',
  slug: '',
  description: '',
  status: 'TIDAK_AKTIF',
  bgType: 'color', // 'color' | 'image'
  bgValue: '#f8fafc',
  bgOpacity: 100,
  bgOverlayColor: '#000000',
  profilePhoto: '',
  profileShape: 'circle',
  profileBorderStyle: 'solid', 
  profileBorderWidth: 2,       
  profileBgColor: '#cbd5e1',
  profileWidth: 80,
  profileHeight: 80,
  showProfile: true,
  showCover: true,
  showTitle: true,
  showDescription: true,
  showFooter: true,
  showSystemBranding: true,
  customBranding: 'SIGAP',
  customPoweredBy: 'Sigap Engine',
  eventPhoto: '',
  coverHeight: 140,
  footerText: '',
  titleColor: '#1e293b',
  titleFont: 'Inter',
  titleAlign: 'center',
  titleFontSize: 24,
  titleFontWeight: 'black',
  titleFontStyle: 'normal',
  titleTextDecoration: 'none',
  titleTextTransform: 'uppercase',
  
  descColor: '#64748b',
  descFont: 'Inter',
  descAlign: 'center',
  descFontSize: 12,
  descFontWeight: 'bold',
  descFontStyle: 'normal',
  descTextDecoration: 'none',
  descTextTransform: 'none',
  
  footerColor: '#94a3b8',
  footerFont: 'Inter',
  footerAlign: 'center',
  footerFontSize: 9,
  footerFontWeight: 'black',
  footerFontStyle: 'normal',
  footerTextDecoration: 'none',
  footerTextTransform: 'uppercase',
  footerBgColor: 'transparent',
  footerBgOpacity: 100,
  buttonShape: 'rounded', // 'rounded' | 'square'
  buttonRadius: 16,
  items: []
})

const statusOptions = [
  { id: 'AKTIF', name: '🟢 AKTIF (Tayang)' },
  { id: 'TIDAK_AKTIF', name: '🔴 TIDAK AKTIF (Draft)' },
  { id: 'ARSIP', name: '📦 ARSIP (Hidden)' }
]

const borderStyleOptions = [
  { id: 'none', name: 'TANPA BORDER' },
  { id: 'solid', name: 'SOLID' },
  { id: 'dashed', name: 'DASHED' },
  { id: 'double', name: 'DOUBLE' },
  { id: 'outline', name: 'OUTLINE' }
]

const fontSelectOptions = computed(() => {
  return fontOptions.map(f => ({ id: f.name, name: f.name }))
})

const fontOptions = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Space Grotesk', value: "'Space Grotesk', sans-serif" }
]

const getFontStack = (fontName: string) => {
  const found = fontOptions.find(f => f.name === fontName)
  return found ? found.value : "'Inter', sans-serif"
}

const fetchSettings = async () => {
  try {
    const res = await api.get('/admin/settings')
    settings.value = res.data
  } catch (err) { console.error('Gagal mengambil settings') }
}

const fetchEvent = async () => {
  const id = route.params.id
  try {
    const res = await api.get(`/admin/events/${id}`)
    const data = res.data
    // Sanitize data
    if (data.bgType === 'color' && (!data.bgValue || !data.bgValue.startsWith('#'))) {
      data.bgValue = '#f8fafc'
    }
    if (data.items) {
      data.items = data.items.map((it: any) => ({
        ...it,
        color: (it.color && it.color.startsWith('#')) ? it.color : '#3b82f6',
        textColor: (it.textColor && it.textColor.startsWith('#')) ? it.textColor : '#ffffff'
      }))
    }
    event.value = data
  } catch (err) {
    alert('Gagal mengambil data event')
    router.push('/admin/events')
  } finally {
    isLoading.value = false
  }
}

const handleFileUpload = async (eventTarget: Event, type: 'profile' | 'background' | 'cover') => {
  const target = eventTarget.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', 'events')
  try {
    const { data } = await api.post('/admin/upload', formData)
    if (type === 'profile') event.value.profilePhoto = data.url
    else if (type === 'cover') event.value.eventPhoto = data.url
    else {
      event.value.bgValue = data.url
      event.value.bgType = 'image' // Automatically switch to image mode
    }
  } catch (err) { alert('Gagal mengunggah gambar') }
}

const addNewItem = (type: string) => {
  const newItem = {
    label: type === 'DIVIDER' ? 'Separator' : 'Tautan Baru',
    url: type === 'DIVIDER' ? '#' : 'https://',
    type,
    color: type === 'BUTTON' ? '#3b82f6' : (type === 'SOCIAL' ? '#1e293b' : '#e2e8f0'),
    textColor: type === 'BUTTON' || type === 'SOCIAL' ? '#ffffff' : '#64748b',
    iconColor: '#ffffff',
    icon: type === 'BUTTON' ? 'Link' : (type === 'SOCIAL' ? 'Instagram' : 'Circle'),
    order: event.value.items.length,
    layout: type === 'SOCIAL' ? 'icon-only' : 'icon-left',
    showLabel: true,
    isActive: true,
    dividerStyle: 'solid', 
    dividerCap: 'sharp',   
    dividerWidth: 70,      
    dividerText: '',
    dividerThickness: 2
  }
  event.value.items.push(newItem)
}

const moveItem = (index: number, direction: 'up' | 'down') => {
  const targetIdx = direction === 'up' ? index - 1 : index + 1
  if (targetIdx < 0 || targetIdx >= event.value.items.length) return
  const items = [...event.value.items]
  const temp = items[index]
  items[index] = items[targetIdx]
  items[targetIdx] = temp
  event.value.items = items
}

const openIconSelector = (index: number) => {
  activeItemIndex.value = index
  showIconModal.value = true
}

const handleIconSelect = (icon: string) => {
  if (activeItemIndex.value !== null) event.value.items[activeItemIndex.value].icon = icon
}

const globalPalette = computed(() => {
  const colors = new Set<string>()
  if (event.value.titleColor?.startsWith('#')) colors.add(event.value.titleColor.toLowerCase())
  if (event.value.descColor?.startsWith('#')) colors.add(event.value.descColor.toLowerCase())
  if (event.value.footerColor?.startsWith('#')) colors.add(event.value.footerColor.toLowerCase())
  if (event.value.bgType === 'color' && event.value.bgValue?.startsWith('#')) colors.add(event.value.bgValue.toLowerCase())
  
  const defaults = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#1e293b', '#ffffff', '#000000']
  defaults.forEach(c => colors.add(c.toLowerCase()))
  
  return Array.from(colors)
})

const groupedItems = computed(() => {
  const result: any[] = []
  let currentSoc: any[] = []
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

const applyStyleToAll = (type: string, field: string, value: string) => {
  event.value.items.forEach((item: any) => {
    if (item.type === type) {
      item[field] = value
    }
  })
  const typeLabel = type === 'BUTTON' ? 'Tombol Link' : (type === 'SOCIAL' ? 'Sosial Media' : 'Separator')
  alert(`✅ Berhasil! Semua ${typeLabel} kini menggunakan warna yang sama.`)
}

const saveEvent = async () => {
  isSaving.value = true
  try {
    const res = await api.put(`/admin/events/${event.value.id}`, event.value)
    event.value = res.data
    alert('Pengaturan event berhasil disimpan!')
  } catch (err: any) { 
    const msg = err.response?.data?.details || err.response?.data?.error || 'Gagal menyimpan'
    alert(msg) 
  }
  finally { isSaving.value = false }
}

const showQrModal = ref(false)
const qrPosterCanvas = ref<HTMLCanvasElement | null>(null)
const qrOptions = ref({
  color: '#4f86e8',
  bgColor: '#ffffff',
  shape: 'square',
  cornerShape: 'square',
  errorLevel: 'M'
})

const qrTargetUrl = computed(() => {
  const base = settings.value?.custom_domain 
    ? settings.value.custom_domain.replace(/\/$/, '') 
    : window.location.origin
  return event.value.slug ? `${base}/e/${event.value.slug}` : `${base}/`
})

const copyShareLink = () => {
  navigator.clipboard.writeText(qrTargetUrl.value)
  alert(`Link berhasil disalin ke clipboard:\n\n${qrTargetUrl.value}`)
}

const openShareModal = () => {
  showQrModal.value = true
  setTimeout(drawQrPoster, 100)
}

const drawQrPoster = async () => {
  if (!qrPosterCanvas.value) return
  const canvas = qrPosterCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  try {
    const qrData = QRCode.create(qrTargetUrl.value, { errorCorrectionLevel: qrOptions.value.errorLevel as any })
    const { modules } = qrData
    const moduleCount = modules.size
    const margin = 4
    const size = 600 
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
          
          const isTopLeft = row < 7 && col < 7
          const isTopRight = row < 7 && col >= moduleCount - 7
          const isBottomLeft = row >= moduleCount - 7 && col < 7
  
          if ((isTopLeft || isTopRight || isBottomLeft) && qrOptions.value.cornerShape === 'rounded') {
             ctx.beginPath()
             ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.25)
             ctx.fill()
          } else if (qrOptions.value.shape === 'circle') {
             ctx.beginPath()
             ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.42, 0, Math.PI * 2)
             ctx.fill()
          } else {
             ctx.fillRect(x, y, cellSize, cellSize)
          }
        }
      }
    }
  } catch (err) { console.error('Gagal menggambar QR', err) }
}

const downloadQrPoster = () => {
  if (!qrPosterCanvas.value) return
  const a = document.createElement('a')
  a.download = `QR-Poster-${event.value.slug || 'portal'}.png`
  a.href = qrPosterCanvas.value.toDataURL()
  a.click()
}

watch(qrOptions, drawQrPoster, { deep: true })
watch(() => event.value.slug, () => { if (showQrModal.value) drawQrPoster() })

onMounted(() => {
  fetchSettings()
  fetchEvent()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

watch(() => event.value.title, (newTitle) => {
  if (newTitle && (!event.value.slug || event.value.slug.trim() === '')) {
    event.value.slug = newTitle.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  }
})

const formatText = (text: string, transformType: string) => {
  if (!text) return text;
  if (transformType === 'uppercase') return text.toUpperCase();
  if (transformType === 'lowercase') return text.toLowerCase();
  if (transformType === 'proper') {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
  if (transformType === 'capitalize') {
    return text.toLowerCase().replace(/\b\w/g, m => m.toUpperCase());
  }
  return text;
}
</script>

<template>
  <div class="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-slate-50 overflow-hidden animate-fadeup">
    
    <!-- LEFT: Settings Sidebar -->
    <aside 
      :class="{ 
        'mobile-overlay': selectedPanel && windowWidth < 1024, 
        'mobile-hidden': !selectedPanel && windowWidth < 1024,
        'w-full lg:w-1/2 border-r-4 border-slate-100 shadow-2xl relative z-20': windowWidth >= 1024,
        'fixed left-0 right-0 bottom-20 h-[80vh] w-full bg-white z-[100] transition-transform duration-300 rounded-[3rem_3rem_0_0] overflow-hidden flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-none': windowWidth < 1024
      }"
      class="bg-white flex flex-col transition-all duration-300 overflow-hidden"
    >
       
       <!-- Sidebar Header -->
       <div class="p-4 lg:px-6 border-b border-slate-50 flex items-center justify-between bg-[#f4f8ff]/50 shrink-0">
          <div class="flex items-center gap-3">
             <button @click="router.push('/admin/events')" class="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#4f86e8] shadow-sm transition-all">
                <SIGAPIcons name="ArrowLeft" :size="18" />
             </button>
             <div>
                <h3 class="font-black text-slate-800 text-sm uppercase tracking-tighter truncate max-w-[150px]">{{ event.title || 'Loading...' }}</h3>
                <p class="text-[10px] font-bold text-slate-400">Penyunting Page</p>
             </div>
          </div>
          <div class="flex items-center gap-2">
             <button @click="openShareModal" 
                     class="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-500 shadow-sm transition-all group"
                     title="Share Event">
                <SIGAPIcons name="Share2" :size="20" />
             </button>
             <a :href="'/e/' + event.slug" target="_blank" 
                class="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-500 shadow-sm transition-all"
                title="Preview Live">
                <SIGAPIcons name="Eye" :size="20" />
             </a>
             <button @click="saveEvent" :disabled="isSaving" class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700 transition-all flex-shrink-0">
                <SIGAPIcons v-if="!isSaving" name="Save" :size="14" />
                <span v-else class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {{ isSaving ? 'Menyimpan' : 'Simpan' }}
             </button>
          </div>
       </div>

       <!-- Nav Tabs -->
       <div class="flex p-1 lg:p-1.5 bg-[#f4f8ff]/50 border-b border-slate-50 shrink-0 overflow-x-auto scrollbar-hide">
          <button v-for="tab in ['branding', 'display', 'typography', 'links', 'footer']" :key="tab"
                  @click="selectedPanel = tab"
                  :class="selectedPanel === tab ? 'bg-white text-[#4f86e8] shadow-sm border-slate-100' : 'text-slate-400 border-transparent'"
                  class="flex-1 min-w-[80px] py-2 lg:py-2 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all">
            {{ tab }}
          </button>
       </div>

       <!-- Panel Content Container -->
       <div class="flex-1 overflow-y-auto p-6 space-y-6 lg:space-y-4 scrollbar-hide pb-24 lg:pb-8">
          
          <!-- BRANDING PANEL -->
          <div v-if="selectedPanel === 'branding'" class="space-y-6 animate-fadeup">
             <div class="space-y-4">
                <div class="space-y-1.5 font-bold">
                   <label class="label-soft uppercase tracking-widest text-[9px] lg:text-[11px] text-slate-400">Judul Event</label>
                   <input v-model="event.title" class="input-soft" placeholder="Judul event..." />
                </div>
                <div class="space-y-1.5 font-bold">
                   <label class="label-soft uppercase tracking-widest text-[9px] lg:text-[11px] text-slate-400">URL Slug</label>
                   <div class="input-soft !p-0 flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <span class="px-4 py-3 bg-slate-50 text-slate-300 border-r border-slate-100 whitespace-nowrap select-none font-bold text-[10px] uppercase tracking-tighter">
                         {{ settings.custom_domain ? 'DOMAIN' : 'URL' }} /e/
                      </span>
                      <input v-model="event.slug" 
                             class="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm font-bold text-slate-700 placeholder:text-slate-300"
                             placeholder="slug-anda" />
                   </div>
                </div>
                <div class="space-y-1.5 font-bold">
                   <label class="label-soft uppercase tracking-widest text-[9px] lg:text-[11px] text-slate-400">Status</label>
                   <SIGAPSelect v-model="event.status" :options="statusOptions" />
                </div>
                <div class="space-y-1.5 font-bold">
                   <label class="label-soft uppercase tracking-widest text-[9px] lg:text-[11px] text-slate-400">Latar Belakang</label>
                   <div class="flex p-1 bg-slate-50 rounded-xl mb-3 border border-slate-100">
                      <button @click="event.bgType = 'color'" :class="event.bgType === 'color' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'" class="flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all">Solid</button>
                      <button @click="event.bgType = 'image'" :class="event.bgType === 'image' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'" class="flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all">Image</button>
                   </div>
                   
                   <div v-if="event.bgType === 'color'" class="flex flex-col gap-3">
                      <div class="flex gap-3">
                         <input type="color" v-model="event.bgValue" class="w-12 h-12 rounded-xl border-none cursor-pointer" />
                         <input v-model="event.bgValue" class="input-soft flex-1 uppercase font-mono !text-xs" />
                      </div>
                      <div class="space-y-2 px-1 pb-2">
                         <div class="flex justify-between items-center">
                            <span class="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase">Transparansi: {{ event.bgOpacity }}%</span>
                         </div>
                         <input type="range" v-model.number="event.bgOpacity" min="0" max="100" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      </div>
                   </div>
                   <div v-else class="space-y-4">
                      <div class="relative h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden hover:border-blue-200 transition-all group" @click="$refs.bgInput.click()">
                         <img v-if="event.bgValue && event.bgValue.startsWith('http')" :src="event.bgValue" class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform" />
                         <div class="relative z-10 flex flex-col items-center gap-2">
                            <SIGAPIcons name="Image" :size="24" class="text-slate-300 group-hover:text-blue-400 transition-colors" />
                            <span class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest">Pilih Gambar</span>
                         </div>
                         <input type="file" ref="bgInput" @change="handleFileUpload($event, 'background')" hidden accept="image/*" />
                      </div>
                      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
                         <div class="space-y-2">
                            <span class="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Warna Overlay</span>
                            <div class="flex gap-2">
                               <input type="color" v-model="event.bgOverlayColor" class="w-10 h-10 rounded-xl border-none cursor-pointer" />
                               <input v-model="event.bgOverlayColor" class="input-soft !p-2 !text-xs font-mono flex-1 uppercase" />
                            </div>
                         </div>
                         <div class="space-y-2 flex flex-col justify-end">
                            <span class="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5">Kepadatan Overlay: {{ event.bgOpacity }}%</span>
                            <input type="range" v-model.number="event.bgOpacity" min="0" max="100" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <!-- DISPLAY PANEL -->
          <div v-if="selectedPanel === 'display'" class="space-y-6 animate-fadeup">
             <div class="bg-[#f4f8ff] p-6 rounded-[2rem] border border-blue-50/50 flex flex-col items-center gap-6">
                 <div class="relative group cursor-pointer" @click="$refs.pInput.click()">
                    <div :class="event.profileShape === 'circle' ? 'rounded-full' : 'rounded-[2rem]'" class="w-24 h-24 bg-white shadow-2xl overflow-hidden border-4 border-white relative">
                       <img v-if="event.profilePhoto" :src="event.profilePhoto" class="w-full h-full object-cover" />
                       <div v-else class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                          <SIGAPIcons name="User" :size="32" />
                       </div>
                       <div class="absolute inset-x-0 bottom-0 bg-black/40 text-white h-7 flex items-center justify-center transition-all">
                          <SIGAPIcons name="Upload" :size="20" />
                       </div>
                    </div>
                    <input type="file" ref="pInput" @change="handleFileUpload($event, 'profile')" hidden accept="image/*" />
                 </div>
                 <div class="w-full grid grid-cols-2 gap-3">
                    <button @click="event.profileShape = 'circle'" :class="event.profileShape === 'circle' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100'" class="py-2.5 rounded-xl text-[9px] font-black uppercase border transition-all">Bulat</button>
                    <button @click="event.profileShape = 'square'" :class="event.profileShape === 'square' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100'" class="py-2.5 rounded-xl text-[9px] font-black uppercase border transition-all">Kotak</button>
                 </div>
             </div>

             <div class="bg-[#f4f8ff] p-6 rounded-[2rem] border border-blue-50/50 space-y-6">
                <div class="space-y-2">
                   <label class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Gaya Border Profil</label>
                   <SIGAPSelect v-model="event.profileBorderStyle" :options="borderStyleOptions" />
                </div>
                <div v-if="event.profileBorderStyle !== 'none'" class="space-y-6 animate-fadeup pt-2">
                   <div class="space-y-2">
                      <div class="flex justify-between items-center ml-1">
                         <span class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase">Tebal: {{ event.profileBorderWidth }}px</span>
                      </div>
                      <input type="range" v-model.number="event.profileBorderWidth" min="1" max="15" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                   </div>
                   <div class="space-y-2">
                      <span class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase ml-1">Warna Border</span>
                      <div class="flex gap-3">
                         <input type="color" v-model="event.profileBgColor" class="w-10 h-10 rounded-xl border-none cursor-pointer" />
                         <input v-model="event.profileBgColor" class="input-soft !p-2 !text-xs font-mono flex-1" />
                      </div>
                   </div>
                </div>
                <div class="grid grid-cols-2 gap-3 pt-2">
                   <div class="space-y-2">
                      <span class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase ml-1">Lebar: {{ event.profileWidth }}px</span>
                      <input type="range" v-model.number="event.profileWidth" min="40" max="250" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                   </div>
                   <div class="space-y-2">
                      <span class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase ml-1">Tinggi: {{ event.profileHeight }}px</span>
                      <input type="range" v-model.number="event.profileHeight" min="40" max="250" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                   </div>
                </div>
             </div>

             <div class="bg-[#f4f8ff] p-6 rounded-[2rem] border border-blue-50/50 space-y-4">
                <div class="flex justify-between items-center">
                   <label class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Gambar Sampul</label>
                   <span class="text-[9px] font-bold text-slate-400 uppercase">{{ event.coverHeight }}px</span>
                </div>
                <div class="relative h-28 bg-white rounded-2xl border border-slate-100 overflow-hidden group cursor-pointer" @click="$refs.coverInput.click()">
                   <img v-if="event.eventPhoto" :src="event.eventPhoto" class="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                   <div class="absolute inset-0 bg-black/20 flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100">
                      <SIGAPIcons name="Plus" :size="24" />
                   </div>
                   <input type="file" ref="coverInput" @change="handleFileUpload($event, 'cover')" hidden accept="image/*" />
                </div>
                <input type="range" v-model.number="event.coverHeight" min="80" max="400" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2" />
             </div>
          </div>

          <!-- TYPOGRAPHY PANEL -->
          <div v-if="selectedPanel === 'typography'" class="space-y-6 animate-fadeup">
             <div v-for="part in [{id:'title', label:'Judul'}, {id:'desc', label:'Deskripsi'}, {id:'footer', label:'Footer'}]" :key="part.id" class="bg-[#f4f8ff] p-6 rounded-[2rem] border border-blue-50/50 space-y-4">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{{ part.label }} Font Style</p>
                <div class="space-y-4">
                   <SIGAPSelect v-model="event[part.id + 'Font']" :options="fontSelectOptions" />
                   <div class="flex gap-3">
                      <input type="color" v-model="event[part.id + 'Color']" class="w-10 h-10 rounded-xl border-none cursor-pointer" />
                      <input v-model="event[part.id + 'Color']" class="input-soft !p-2 !text-xs font-mono flex-1" />
                   </div>
                   <!-- Text Alignment -->
                   <div class="space-y-2">
                      <span class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Rata Teks</span>
                      <div class="grid grid-cols-4 bg-slate-50 p-1 rounded-xl gap-1 border border-slate-100">
                         <button v-for="a in [{v:'left',i:'AlignLeft',l:'Kiri'},{v:'center',i:'AlignCenter',l:'Tengah'},{v:'right',i:'AlignRight',l:'Kanan'},{v:'justify',i:'AlignJustify',l:'Justify'}]" :key="a.v"
                                 @click="event[part.id + 'Align'] = a.v"
                                 :class="event[part.id + 'Align'] === a.v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
                                 class="py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all">
                            <SIGAPIcons :name="a.i" :size="14" />
                            <span class="text-[7px] font-black uppercase leading-none">{{ a.l }}</span>
                         </button>
                      </div>
                   </div>
                   <!-- Font Size -->
                   <div class="space-y-2 px-1">
                      <div class="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                         <span>Ukuran Font</span>
                         <span>{{ event[part.id + 'FontSize'] }}px</span>
                      </div>
                      <input type="range" v-model.number="event[part.id + 'FontSize']" min="8" max="72" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                   </div>
                   <!-- Font Weight -->
                   <div class="space-y-2">
                       <span class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Ketebalan</span>
                       <div class="grid grid-cols-4 bg-slate-50 p-1 rounded-xl gap-1 border border-slate-100">
                          <button v-for="w in [{v:'normal', l:'Norm'},{v:'medium', l:'Med'},{v:'bold', l:'Bold'},{v:'black', l:'Black'}]" :key="w.v"
                                  @click="event[part.id + 'FontWeight'] = w.v"
                                  :class="event[part.id + 'FontWeight'] === w.v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
                                  class="py-2 text-[8px] font-black uppercase rounded-lg transition-all">
                             {{ w.l }}
                          </button>
                       </div>
                   </div>
                   <!-- Style & Decoration -->
                   <div class="space-y-2">
                       <span class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Gaya Teks</span>
                       <div class="grid grid-cols-2 gap-2">
                           <button @click="event[part.id + 'FontStyle'] = event[part.id + 'FontStyle'] === 'italic' ? 'normal' : 'italic'"
                                   :class="event[part.id + 'FontStyle'] === 'italic' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-100'"
                                   class="py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all">
                               <SIGAPIcons name="Italic" :size="16" />
                               <span class="text-[8px] font-black uppercase">Miring</span>
                           </button>
                           <button @click="event[part.id + 'TextDecoration'] = event[part.id + 'TextDecoration'] === 'underline' ? 'none' : 'underline'"
                                   :class="event[part.id + 'TextDecoration'] === 'underline' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-100'"
                                   class="py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all">
                               <SIGAPIcons name="Underline" :size="16" />
                               <span class="text-[8px] font-black uppercase">Garis Bawah</span>
                           </button>
                       </div>
                   </div>
                   <!-- Text Transform -->
                   <div class="space-y-2">
                       <span class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Format Karakter</span>
                       <div class="grid grid-cols-4 bg-slate-50 p-1 rounded-xl gap-1 border border-slate-100">
                          <button v-for="t in [{v:'uppercase', l:'AA'},{v:'lowercase', l:'aa'},{v:'proper', l:'Aaaa'},{v:'capitalize', l:'AaBb'}]" :key="t.v"
                                  @click="event[part.id + 'TextTransform'] = t.v"
                                  :class="event[part.id + 'TextTransform'] === t.v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
                                  class="py-2 text-[9px] font-black rounded-lg transition-all">
                             {{ t.l }}
                          </button>
                       </div>
                   </div>
                </div>
             </div>
          </div>

          <!-- LINKS PANEL -->
          <div v-if="selectedPanel === 'links'" class="space-y-6 animate-fadeup">
             <div class="flex gap-3 shrink-0">
                <button @click="addNewItem('BUTTON')" class="flex-1 p-5 bg-blue-600 text-white rounded-[2rem] flex flex-col items-center gap-2 hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-1 transition-all">
                   <SIGAPIcons name="Link" :size="24" />
                   <span class="text-[10px] font-black uppercase tracking-widest">Link</span>
                </button>
                <button @click="addNewItem('SOCIAL')" class="flex-1 p-5 bg-emerald-500 text-white rounded-[2rem] flex flex-col items-center gap-2 hover:shadow-xl hover:shadow-emerald-200 hover:-translate-y-1 transition-all">
                   <SIGAPIcons name="Instagram" :size="24" />
                   <span class="text-[10px] font-black uppercase tracking-widest">Social</span>
                </button>
                <button @click="addNewItem('DIVIDER')" class="flex-1 p-5 bg-slate-800 text-white rounded-[2rem] flex flex-col items-center gap-2 hover:shadow-xl hover:shadow-slate-200 hover:-translate-y-1 transition-all">
                   <SIGAPIcons name="Layers" :size="24" />
                   <span class="text-[10px] font-black uppercase tracking-widest">Garis</span>
                </button>
             </div>

             <div class="space-y-4 pb-12">
                 <div v-for="(it, idx) in event.items" :key="idx" class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative group/item hover:border-blue-100 transition-all">
                    <div class="flex items-start gap-4">
                       <div class="flex flex-col gap-1 mt-1 shrink-0">
                          <button @click="moveItem(idx, 'up')" :disabled="idx === 0" class="p-1 text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><SIGAPIcons name="ChevronUp" :size="16" /></button>
                          <button @click="moveItem(idx, 'down')" :disabled="idx === event.items.length - 1" class="p-1 text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-colors"><SIGAPIcons name="ChevronDown" :size="16" /></button>
                       </div>

                       <div class="flex-1 space-y-4">
                          <div class="flex items-center gap-4">
                             <div v-if="it.type !== 'DIVIDER'" class="relative group/icon-btn cursor-pointer shrink-0" @click="openIconSelector(idx)">
                                <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover/item:bg-blue-50 transition-all border border-transparent group-hover/icon-btn:border-blue-200 shadow-inner">
                                   <SIGAPIcons :name="it.icon || 'Link'" :size="24" :style="{ color: it.iconColor }" />
                                </div>
                                <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white z-20 group-hover/icon-btn:scale-110 transition-transform">
                                   <SIGAPIcons name="Edit2" :size="12" />
                                 </div>
                             </div>
                             <div class="flex-1">
                                <input v-if="it.type !== 'DIVIDER'" v-model="it.label" class="w-full text-base font-black border-none outline-none focus:text-blue-600 bg-transparent uppercase tracking-tight" placeholder="Nama Label..." />
                                <div v-else class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Separator Config</div>
                             </div>
                              <button @click="event.items.splice(idx, 1)" class="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex-shrink-0">
                                 <SIGAPIcons name="Trash2" :size="20" />
                              </button>
                          </div>

                          <div v-if="it.type === 'DIVIDER'" class="p-5 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                             <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1.5">
                                  <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Style</label>
                                  <SIGAPSelect v-model="it.dividerStyle" :options="[{id:'solid', name:'SOLID'}, {id:'dashed', name:'DASHED'}, {id:'dotted', name:'DOTTED'}, {id:'spacer', name:'SPACER'}]" />
                                </div>
                                <div class="space-y-1.5">
                                  <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Caps</label>
                                  <SIGAPSelect v-model="it.dividerCap" :options="[{id:'sharp', name:'SHARP'}, {id:'rounded', name:'ROUNDED'}, {id:'tapered', name:'TAPERED'}]" />
                                </div>
                             </div>
                             <div class="space-y-4">
                               <div class="space-y-2">
                                 <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 flex justify-between">Lebar <span>{{ it.dividerWidth }}%</span></label>
                                 <input type="range" v-model.number="it.dividerWidth" min="20" max="100" class="w-full h-1 bg-slate-200 accent-blue-600 appearance-none rounded-full cursor-pointer" />
                               </div>
                               <div class="space-y-2">
                                 <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 flex justify-between">Tebal <span>{{ it.dividerThickness }}px</span></label>
                                 <input type="range" v-model.number="it.dividerThickness" min="1" max="50" class="w-full h-1 bg-slate-200 accent-blue-600 appearance-none rounded-full cursor-pointer" />
                               </div>
                             </div>
                             <div class="space-y-3">
                                <div class="flex justify-between items-center px-1">
                                   <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Warna Separator</label>
                                   <button @click="applyStyleToAll(it.type, 'color', it.color)" class="text-[7px] lg:text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-tighter transition-all flex items-center gap-1 group/sync">
                                      <SIGAPIcons name="RefreshCw" :size="8" class="group-hover/sync:rotate-180 transition-transform duration-500" />
                                      Terapkan ke Semua
                                   </button>
                                </div>
                                <div class="flex gap-3">
                                   <input type="color" v-model="it.color" class="w-10 h-10 rounded-xl border-none cursor-pointer" />
                                   <input v-model="it.color" class="flex-1 input-soft !p-2 uppercase font-mono !text-xs" />
                                </div>
                             </div>
                             <input v-model="it.dividerText" class="input-soft !p-3 !text-xs font-bold" placeholder="Teks opsional di tengah..." />
                          </div>

                          <div v-else class="space-y-5 animate-fadeup">
                             <div class="space-y-1.5">
                                <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Destinasi URL</label>
                                <input v-model="it.url" class="input-soft font-mono !text-[11px] !py-3" placeholder="https://..." />
                             </div>
                             
                             <div class="space-y-2">
                                <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Gaya Tombol</label>
                                <div class="grid grid-cols-3 bg-slate-50 p-1.5 rounded-2xl gap-1 border border-slate-100 shadow-inner">
                                   <button v-for="l in ['icon-left', 'icon-right', 'icon-edge-left', 'icon-edge-right', 'text-only', (it.type==='SOCIAL'?'icon-only':null)].filter(n=>n)" 
                                           :key="l" @click="it.layout = l"
                                           :class="it.layout === l ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
                                           class="p-2 flex flex-col items-center justify-center gap-1 text-[7px] font-black uppercase rounded-xl transition-all h-14">
                                           <SIGAPIcons :name="l === 'icon-only' ? 'User' : (l === 'text-only' ? 'Type' : 'Layout')" :size="14" class="opacity-70" />
                                           <span class="leading-none text-center">
                                              {{ l === 'icon-only' ? 'LOGO' : (l === 'text-only' ? 'TEXT' : l.replace('icon-', '').replace('edge-', 'E-').toUpperCase()) }}
                                           </span>
                                   </button>
                                </div>
                             </div>

                             <div class="space-y-6 animate-fadeup">
                                <div class="space-y-2">
                                   <div class="flex justify-between items-center px-1">
                                      <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Warna Tombol</label>
                                      <button @click="applyStyleToAll(it.type, 'color', it.color)" class="text-[7px] lg:text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-tighter transition-all flex items-center gap-1 group/sync">
                                         <SIGAPIcons name="RefreshCw" :size="8" class="group-hover/sync:rotate-180 transition-transform duration-500" />
                                         Terapkan ke Semua
                                      </button>
                                   </div>
                                   <div class="flex gap-3 items-center">
                                      <input type="color" v-model="it.color" class="w-8 h-8 rounded-full border-none cursor-pointer shrink-0" />
                                      <div class="flex-1 flex flex-wrap gap-1.5">
                                         <button v-for="c in globalPalette" :key="'bg-'+c" @click="it.color = c"
                                                 :style="{ backgroundColor: c }"
                                                 class="w-6 h-6 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110"></button>
                                      </div>
                                   </div>
                                </div>

                                <div class="space-y-2">
                                   <div class="flex justify-between items-center px-1">
                                      <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Warna Teks</label>
                                      <button @click="applyStyleToAll(it.type, 'textColor', it.textColor)" class="text-[7px] lg:text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-tighter transition-all flex items-center gap-1 group/sync">
                                         <SIGAPIcons name="RefreshCw" :size="8" class="group-hover/sync:rotate-180 transition-transform duration-500" />
                                         Terapkan ke Semua
                                      </button>
                                   </div>
                                   <div class="flex gap-3 items-center">
                                      <input type="color" v-model="it.textColor" class="w-8 h-8 rounded-full border-none cursor-pointer shrink-0" />
                                      <div class="flex-1 flex flex-wrap gap-1.5">
                                         <button v-for="c in globalPalette" :key="'txt-'+c" @click="it.textColor = c"
                                                 :style="{ backgroundColor: c }"
                                                 class="w-6 h-6 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110"></button>
                                      </div>
                                   </div>
                                </div>

                                <div class="space-y-2">
                                   <div class="flex justify-between items-center px-1">
                                      <label class="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Warna Ikon</label>
                                      <button @click="applyStyleToAll(it.type, 'iconColor', it.iconColor)" class="text-[7px] lg:text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-tighter transition-all flex items-center gap-1 group/sync">
                                         <SIGAPIcons name="RefreshCw" :size="8" class="group-hover/sync:rotate-180 transition-transform duration-500" />
                                         Terapkan ke Semua
                                      </button>
                                   </div>
                                   <div class="flex gap-3 items-center">
                                      <input type="color" v-model="it.iconColor" class="w-8 h-8 rounded-full border-none cursor-pointer shrink-0" />
                                      <div class="flex-1 flex flex-wrap gap-1.5">
                                         <button v-for="c in globalPalette" :key="'ic-'+c" @click="it.iconColor = c"
                                                 :style="{ backgroundColor: c }"
                                                 class="w-6 h-6 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110"></button>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
             </div>
          </div>

          <!-- FOOTER PANEL -->
          <div v-if="selectedPanel === 'footer'" class="space-y-8 animate-fadeup">
             <div class="bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] space-y-6">
                <p class="text-[10px] lg:text-[11px] font-black text-blue-700 uppercase tracking-widest ml-1">Global Button Radius</p>
                <div class="grid grid-cols-2 gap-3">
                   <button @click="event.buttonShape = 'rounded'" :class="event.buttonShape === 'rounded' ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-slate-400 border-slate-100'" class="py-3 rounded-xl text-[10px] font-black uppercase border transition-all">Pillow</button>
                   <button @click="event.buttonShape = 'square'" :class="event.buttonShape === 'square' ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-slate-400 border-slate-100'" class="py-3 rounded-xl text-[10px] font-black uppercase border transition-all">Square</button>
                </div>
                <div v-if="event.buttonShape === 'rounded'" class="space-y-2 px-1">
                   <div class="flex justify-between items-center text-[9px] font-black text-blue-400 uppercase">
                      <span>Radius Curvature</span>
                      <span>{{ event.buttonRadius }}px</span>
                   </div>
                   <input type="range" v-model.number="event.buttonRadius" min="0" max="40" class="w-full h-1.5 bg-blue-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
                </div>
             </div>

             <div class="space-y-2">
                <label class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Footer Message</label>
                <textarea v-model="event.footerText" rows="5" class="input-soft !p-3 !text-xs font-bold leading-relaxed" placeholder="Teks penutup untuk audiens Anda..."></textarea>
             </div>

             <div class="space-y-4">
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                   <div class="flex items-center justify-between">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Footer Background</label>
                      <div class="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                         <input type="color" v-model="event.footerBgColor" class="w-5 h-5 rounded-md border-none p-0 cursor-pointer" />
                         <span class="text-[10px] font-black text-slate-400 font-mono">{{ event.footerBgColor.toUpperCase() }}</span>
                      </div>
                   </div>
                   <div class="space-y-2 px-1">
                      <div class="flex justify-between items-center">
                         <span class="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase">Transparansi Footer: {{ event.footerBgOpacity }}%</span>
                      </div>
                      <input type="range" v-model.number="event.footerBgOpacity" min="0" max="100" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                   </div>
                   <div class="flex items-center justify-between">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Text Color</label>
                      <div class="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                         <input type="color" v-model="event.footerColor" class="w-5 h-5 rounded-md border-none p-0 cursor-pointer" />
                         <span class="text-[10px] font-black text-slate-400 font-mono">{{ event.footerColor.toUpperCase() }}</span>
                      </div>
                   </div>
                </div>
                <div class="flex items-center justify-between px-1">
                   <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Branding System</label>
                   <button @click="event.showSystemBranding = !event.showSystemBranding" :class="event.showSystemBranding ? 'bg-emerald-500' : 'bg-slate-300'" class="w-12 h-6 rounded-full relative transition-all">
                     <div :class="event.showSystemBranding ? 'translate-x-6' : 'translate-x-1'" class="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all"></div>
                   </button>
                </div>
                <div v-if="event.showSystemBranding" class="space-y-4 pt-6 animate-fadeup border-t border-slate-100">
                   <div class="space-y-1.5">
                      <span class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Copyright Holder</span>
                      <input v-model="event.customBranding" class="input-soft !py-2 !text-[11px]" placeholder="Contoh: My Campaign" />
                   </div>
                   <div class="space-y-1.5">
                      <span class="text-[9px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Platform Identity</span>
                      <input v-model="event.customPoweredBy" class="input-soft !py-2 !text-[11px]" placeholder="Contoh: Powered by Sigap" />
                   </div>
                </div>
             </div>
          </div>
       </div>
    </aside>

    <!-- RIGHT: Live Simulator -->
    <main class="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 bg-slate-100 relative overflow-hidden h-full">
       <div class="absolute top-8 left-8 hidden lg:block">
          <span class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Simulator Preview</span>
       </div>

       <!-- Simulator Phone Frame -->
       <div class="w-[320px] sm:w-[500px] h-full flex flex-col items-center justify-center relative animate-fadeup">
          
          <div class="w-[320px] sm:w-[360px] h-[640px] sm:h-[720px] bg-white rounded-[3.5rem] shadow-2xl shadow-blue-900/10 border-[12px] border-slate-900 relative z-10 shrink-0 scale-90 sm:scale-95 lg:scale-100 transition-all overflow-hidden origin-center">
             
             <!-- Simulator Content Body -->
             <div class="w-full h-full bg-white relative flex flex-col scrollbar-hide">
                <!-- SOLID BG LAYER -->
                <div v-if="event.bgType === 'color'" class="absolute inset-0 z-0" :style="{ backgroundColor: event.bgValue, opacity: (event.bgOpacity ?? 100) / 100 }"></div>
                
                <!-- IMAGE BG LAYER -->
                <template v-if="event.bgType === 'image' && event.bgValue">
                   <img :src="event.bgValue" class="absolute inset-0 w-full h-full object-cover z-0" />
                   <!-- Overlay -->
                   <div class="absolute inset-0 z-[1]" :style="{ backgroundColor: event.bgOverlayColor || '#000', opacity: (event.bgOpacity ?? 0) / 100 }"></div>
                </template>
                
                <!-- Status Banner -->
                <div v-if="event.status !== 'AKTIF'" class="sticky top-0 z-40 w-full bg-red-500/90 backdrop-blur-md p-2 flex items-center justify-center gap-2 border-b border-red-400/20">
                  <SIGAPIcons name="ShieldAlert" :size="12" class="text-white" />
                  <span class="text-[9px] font-black text-white uppercase tracking-widest">{{ event.status }} - INACTIVE PREVIEW</span>
                </div>

                <!-- Scrollable View -->
                <div class="flex-1 overflow-y-auto scrollbar-hide flex flex-col relative z-10">
                   
                   <!-- Cover Photo -->
                   <div v-if="event.showCover" class="w-full shrink-0 bg-slate-900 shadow-md" :style="{ height: event.coverHeight + 'px' }">
                      <img v-if="event.eventPhoto" :src="event.eventPhoto" class="w-full h-full object-cover" />
                   </div>

                    <!-- Profile Branding Section -->
                    <div class="flex flex-col items-center px-8 text-center relative" :class="event.showCover ? (event.showProfile ? '-mt-12' : 'pt-8') : 'pt-16'">
                      <div v-if="event.showProfile" 
                           :class="event.profileShape === 'circle' ? 'rounded-full' : 'rounded-[2rem]'" 
                           :style="{ 
                               width: event.profileWidth + 'px', 
                               height: event.profileHeight + 'px', 
                               border: event.profileBorderStyle !== 'none' ? `${event.profileBorderWidth}px ${event.profileBorderStyle} ${event.profileBgColor}` : 'none' 
                           }"
                           class="bg-white shadow-2xl overflow-hidden shrink-0 ring-4 ring-white/50">
                        <img v-if="event.profilePhoto" :src="event.profilePhoto" class="w-full h-full object-cover" />
                        <div v-else class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                           <SIGAPIcons name="User" :size="32" />
                        </div>
                      </div>

                      <div class="mt-6 space-y-2 w-full">
                        <h1 v-if="event.showTitle" 
                            :style="{ 
                                color: event.titleColor, 
                                fontFamily: getFontStack(event.titleFont), 
                                textAlign: event.titleAlign || 'center',
                                fontSize: event.titleFontSize + 'px',
                                fontWeight: event.titleFontWeight,
                                fontStyle: event.titleFontStyle,
                                textDecoration: event.titleTextDecoration
                            }"
                            class="tracking-tight leading-none drop-shadow-sm w-full">
                          {{ formatText(event.title || 'Judul Event', event.titleTextTransform) }}
                        </h1>
                        <p v-if="event.showDescription" 
                           :style="{ 
                               color: event.descColor, 
                               fontFamily: getFontStack(event.descFont), 
                               textAlign: event.descAlign || 'center',
                               fontSize: event.descFontSize + 'px',
                               fontWeight: event.descFontWeight,
                               fontStyle: event.descFontStyle,
                               textDecoration: event.descTextDecoration
                           }"
                           class="opacity-80 leading-relaxed w-full">
                          {{ formatText(event.description || 'Deskripsi singkat event Anda akan muncul di sini...', event.descTextTransform) }}
                        </p>
                      </div>
                    </div>

                    <!-- Dynamic Item List -->
                    <div class="px-8 space-y-3 pb-24 w-full relative z-10 mt-8">
                       <template v-for="(it, i) in groupedItems" :key="i">
                          <!-- Social Icons Row -->
                          <div v-if="it.type === 'SOC_GROUP'" class="flex flex-wrap justify-center gap-4 py-3">
                             <div v-for="(s, si) in it.items" :key="'s'+si"
                                  :style="{ backgroundColor: s.color, color: s.textColor, borderRadius: event.buttonShape === 'square' ? '8px' : '50%' }"
                                  class="w-12 h-12 flex items-center justify-center shadow-xl transform hover:scale-105 transition-all">
                                   <SIGAPIcons :name="s.icon || 'Instagram'" :size="22" :style="{ color: s.iconColor }" />
                             </div>
                          </div>

                          <!-- Standard Button -->
                          <div v-else-if="it.type === 'BUTTON' || (it.type === 'SOCIAL' && it.layout !== 'icon-only')"
                               :style="{ 
                                 backgroundColor: it.color, 
                                 color: it.textColor,
                                 borderRadius: (event.buttonShape === 'square' ? 8 : event.buttonRadius) + 'px'
                               }"
                               class="relative flex items-center w-full p-4 shadow-xl shadow-black/5 border border-white/10 group cursor-pointer transition-all">
                             
                             <div v-if="it.layout === 'icon-left' || it.layout === 'icon-edge-left'" 
                                  :class="it.layout === 'icon-edge-left' ? 'mr-auto' : 'mr-4'">
                                <SIGAPIcons :name="it.icon || 'Link'" :size="22" :style="{ color: it.iconColor }" />
                             </div>

                             <span class="flex-1 font-black uppercase tracking-widest text-[10px] text-center">{{ it.label }}</span>

                             <div v-if="it.layout === 'icon-right' || it.layout === 'icon-edge-right'" 
                                  :class="it.layout === 'icon-edge-right' ? 'ml-auto' : 'ml-4'">
                                <SIGAPIcons :name="it.icon || 'Link'" :size="22" :style="{ color: it.iconColor }" />
                             </div>
                          </div>

                          <!-- Divider Line -->
                          <div v-else-if="it.type === 'DIVIDER'" class="py-6 flex justify-center w-full overflow-hidden">
                             <div v-if="it.dividerStyle === 'spacer'" :style="{ height: (it.dividerThickness || 2) + 'px' }" class="w-full"></div>
                             <div v-else class="flex items-center justify-center gap-4 mx-auto" :style="{ width: (it.dividerWidth || 100) + '%' }">
                                <div class="flex-1" :style="{ 
                                   borderTop: it.dividerStyle !== 'solid' ? `${it.dividerThickness || 2}px ${it.dividerStyle} ${it.color}` : 'none',
                                   height: it.dividerStyle === 'solid' ? (it.dividerThickness || 2) + 'px' : '0px',
                                   backgroundColor: it.dividerStyle === 'solid' ? it.color : 'transparent',
                                   borderRadius: it.dividerCap === 'rounded' ? '999px' : '0px',
                                   WebkitMaskImage: it.dividerCap === 'tapered' ? 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' : 'none',
                                   maskImage: it.dividerCap === 'tapered' ? 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' : 'none'
                                }"></div>
                                <span v-if="it.dividerText" :style="{ color: it.color }" class="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{{ it.dividerText }}</span>
                                <div v-if="it.dividerText" class="flex-1" :style="{ 
                                   borderTop: it.dividerStyle !== 'solid' ? `${it.dividerThickness || 2}px ${it.dividerStyle} ${it.color}` : 'none',
                                   height: it.dividerStyle === 'solid' ? (it.dividerThickness || 2) + 'px' : '0px',
                                   backgroundColor: it.dividerStyle === 'solid' ? it.color : 'transparent',
                                   borderRadius: it.dividerCap === 'rounded' ? '999px' : '0px',
                                   WebkitMaskImage: it.dividerCap === 'tapered' ? 'linear-gradient(to left, transparent, black 15%, black 85%, transparent)' : 'none',
                                   maskImage: it.dividerCap === 'tapered' ? 'linear-gradient(to left, transparent, black 15%, black 85%, transparent)' : 'none'
                                }"></div>
                             </div>
                          </div>
                       </template>
                    </div>

                    <!-- Footer Preview -->
                    <div v-if="event.showFooter" 
                         class="w-full shrink-0 flex flex-col items-center py-10 px-8 gap-4 mt-auto relative"
                         :style="{ textAlign: event.footerAlign || 'center' }">
                       <!-- Footer BG Layer with Opacity -->
                       <div class="absolute inset-0 z-0" :style="{ backgroundColor: event.footerBgColor || 'transparent', opacity: (event.footerBgOpacity ?? 100) / 100 }"></div>
                      
                      <p v-if="event.footerText" 
                         :style="{ 
                             color: event.footerColor, 
                             fontFamily: getFontStack(event.footerFont), 
                             fontSize: event.footerFontSize + 'px',
                             fontWeight: event.footerFontWeight,
                             fontStyle: event.footerFontStyle,
                             textDecoration: event.footerTextDecoration
                         }"
                         class="tracking-[0.2em] leading-relaxed opacity-70 whitespace-pre-wrap relative z-10 w-full">
                        {{ formatText(event.footerText, event.footerTextTransform) }}
                      </p>

                      <template v-if="event.showSystemBranding">
                         <div class="flex items-center gap-2 relative z-10 w-full" :class="{ 'justify-center': (event.footerAlign || 'center') === 'center', 'justify-start': event.footerAlign === 'left', 'justify-end': event.footerAlign === 'right' }">
                            <div class="w-6 h-[1px]" :style="{ backgroundColor: event.footerColor || '#94a3b8' }" style="opacity:0.3"></div>
                            <span class="text-[8px] tracking-widest" 
                                  :style="{ 
                                     color: event.footerColor || '#94a3b8',
                                     fontFamily: getFontStack(event.footerFont),
                                     fontWeight: event.footerFontWeight,
                                     fontStyle: event.footerFontStyle,
                                     textDecoration: event.footerTextDecoration
                                  }" style="opacity:0.5">{{ formatText(event.customBranding || 'SIGAP', event.footerTextTransform) }}</span>
                            <div class="w-6 h-[1px]" :style="{ backgroundColor: event.footerColor || '#94a3b8' }" style="opacity:0.3"></div>
                         </div>
                         <h5 class="text-[10px] tracking-tighter opacity-30 relative z-10 w-full" 
                             :style="{ 
                                 color: event.footerColor || '#94a3b8',
                                 fontFamily: getFontStack(event.footerFont),
                                 fontWeight: event.footerFontWeight,
                                 fontStyle: event.footerFontStyle,
                                 textDecoration: event.footerTextDecoration
                             }">{{ formatText(event.customPoweredBy || 'Sigap Engine', event.footerTextTransform) }}</h5>
                      </template>
                    </div>

                </div>
             </div>
             
             <!-- Bottom Decor -->
             <div class="absolute bottom-6 w-32 h-1.5 bg-slate-800 rounded-full z-20"></div>
          </div>
       </div>
    </main>

    <!-- Modal: QR & Sharing -->
    <div v-if="showQrModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
       <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="showQrModal = false"></div>
       <div class="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col lg:flex-row animate-fadeup">
          <div class="lg:w-1/2 p-10 bg-slate-50 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
             <canvas ref="qrPosterCanvas" class="w-full max-w-[280px] h-auto shadow-2xl rounded-2xl bg-white p-4 mb-6"></canvas>
             <button @click="downloadQrPoster" class="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Download QR</button>
          </div>
          <div class="lg:w-1/2 p-10 space-y-8">
             <header class="flex justify-between items-start">
                <div>
                   <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tighter">Sebarkan Link</h2>
                   <p class="text-xs font-bold text-slate-400">Pilih gaya QR Anda</p>
                </div>
                <button @click="showQrModal = false" class="text-slate-300 hover:text-red-500"><SIGAPIcons name="X" :size="24" /></button>
             </header>
             <div class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                   <div class="space-y-1.5">
                      <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warna QR</label>
                      <input type="color" v-model="qrOptions.color" class="w-full h-10 rounded-xl border-none cursor-pointer" />
                   </div>
                   <div class="space-y-1.5">
                      <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shape</label>
                      <SIGAPSelect v-model="qrOptions.shape" :options="[{id:'square', name:'KOTAK'}, {id:'circle', name:'BULAT'}]" />
                   </div>
                </div>
                <div class="space-y-1.5">
                   <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Link Event</label>
                   <div class="flex gap-2">
                      <input :value="qrTargetUrl" readonly class="input-soft flex-1 !text-xs font-mono" />
                      <button @click="copyShareLink" class="p-4 bg-slate-800 text-white rounded-2xl hover:scale-105 transition-all"><SIGAPIcons name="Copy" :size="20" /></button>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- Modal: Icon Selector -->
    <IconSelectorModal 
      :show="showIconModal" 
      @close="showIconModal = false" 
      @select="handleIconSelect" 
    />

  </div>
</template>

<style>
@reference "../../../css/app.css";

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.mobile-overlay { transform: translateY(0) !important; }
.mobile-hidden { transform: translateY(100%) !important; }
@keyframes fadeup {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeup { animation: fadeup 0.4s ease-out forwards; }
</style>
