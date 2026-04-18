<script setup lang="ts">
import { ref, onMounted, computed, watch, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'
import { useAuthStore } from '../../stores/auth'
import QRCode from 'qrcode'

const authStore = useAuthStore()
const setActiveSlug = inject('setActiveSlug') as (slug: string) => void
const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const isSaving = ref(false)
const isGeneratingAI = ref({ description: false, footer: false })

const selectedPanel = ref<string>('branding') 
const showIconModal = ref(false)
const activeItemIndex = ref<number | null>(null)

const event = ref<any>({
  id: null,
  title: '',
  slug: '',
  description: '',
  status: 'TIDAK_AKTIF',
  bgType: 'color',
  bgValue: '#f8fafc',
  profilePhoto: '',
  profileShape: 'circle',
  profileBorderStyle: 'solid', 
  profileBorderWidth: 2,       
  profileBgColor: '#cbd5e1',
  showProfile: true,
  showCover: true,
  showTitle: true,
  showDescription: true,
  showFooter: true,
  showSystemBranding: true,
  customBranding: 'SIGAP',
  customPoweredBy: 'Sigap Engine',
  eventPhoto: '',
  footerText: '',
  profileWidth: 80,
  profileHeight: 80,
  coverHeight: 140,
  titleColor: '#1e293b',
  titleFont: 'Inter',
  descColor: '#64748b',
  descFont: 'Inter',
  footerColor: '#94a3b8',
  footerFont: 'Inter',
  buttonShape: 'rounded',
  buttonRadius: 16,
  items: []
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
    if (event.value?.slug) setActiveSlug(event.value.slug)
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
    else event.value.bgValue = data.url
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
    isActive: true
  }
  event.value.items.push(newItem)
}

const moveItem = (index: number, direction: 'up' | 'down') => {
  const targetIdx = direction === 'up' ? index - 1 : index + 1
  if (targetIdx < 0 || targetIdx >= event.value.items.length) return
  const temp = event.value.items[index]
  event.value.items[index] = event.value.items[targetIdx]
  event.value.items[targetIdx] = temp
}

const openIconSelector = (index: number) => {
  activeItemIndex.value = index
  showIconModal.value = true
}

const handleIconSelect = (icon: string) => {
  if (activeItemIndex.value !== null) event.value.items[activeItemIndex.value].icon = icon
}

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

const saveEvent = async () => {
  isSaving.value = true
  try {
    const res = await api.put(`/admin/events/${event.value.id}`, event.value)
    event.value = res.data
    alert('Pengaturan event berhasil disimpan!')
  } catch (err: any) { alert(err.response?.data?.error || 'Gagal menyimpan') }
  finally { isSaving.value = false }
}

// --- ✨ AI SUGGEST (Restored from backup)
const suggestAI = async (type: 'description' | 'footer') => {
  if (!event.value.title) {
    alert('Silakan isi Judul Event terlebih dahulu.')
    return
  }
  isGeneratingAI.value[type] = true
  try {
    const res = await api.post('/admin/events/ai-suggest', {
      title: event.value.title,
      type: type
    })
    if (type === 'description') event.value.description = res.data.suggestion
    else event.value.footerText = res.data.suggestion
  } catch (err: any) {
    alert(err.response?.data?.error || 'Gagal mendapatkan saran AI')
  } finally {
    isGeneratingAI.value[type] = false
  }
}

// --- 🔗 SHARE LINK (Restored)
const copyShareLink = () => {
  const url = `${window.location.origin}/e/${event.value.slug}`
  navigator.clipboard.writeText(url)
  alert(`Link Event berhasil disalin ke clipboard:\n\n${url}`)
}

// --- 🔒 PREVIEW-LOCK (Restored)
const handlePreviewClick = (e: MouseEvent, url: string) => {
  if (event.value.status !== 'AKTIF') {
    e.preventDefault()
    if (confirm(`Peringatan: Event berstatus ${event.value.status}.\nPublik tidak dapat mengklik link ini.\n\nApakah Anda tetap ingin mengetes?`)) {
      window.open(url, '_blank')
    }
  }
}

// --- 🎯 QR MODAL (Draggable QR Poster Restored)
const showQrPoster = ref(false)
const qrPosterCanvas = ref<HTMLCanvasElement | null>(null)
const qrPosition = ref({ x: 50, y: 60 })
const isDragging = ref(false)
let dragStartX = 0, dragStartY = 0

const openQrPoster = async () => {
  showQrPoster.value = true
  setTimeout(drawQrPoster, 100)
}

const drawQrPoster = async () => {
  if (!qrPosterCanvas.value) return
  const canvas = qrPosterCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const url = `${window.location.origin}/e/${event.value.slug}`
  try {
    await QRCode.toCanvas(canvas, url, {
      width: 500,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch (e) { console.error(e) }
}

const startDrag = (e: MouseEvent | TouchEvent) => {
  isDragging.value = true
  const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
  const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY
  dragStartX = clientX - qrPosition.value.x
  dragStartY = clientY - qrPosition.value.y
}

const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return
  const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
  const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY
  qrPosition.value.x = Math.max(0, Math.min(80, clientX - dragStartX))
  qrPosition.value.y = Math.max(0, Math.min(80, clientY - dragStartY))
}

const stopDrag = () => { isDragging.value = false }

const downloadQrPoster = () => {
  if (!qrPosterCanvas.value) return
  const a = document.createElement('a')
  a.download = `QR-Poster-${event.value.slug}.png`
  a.href = qrPosterCanvas.value.toDataURL()
  a.click()
}

// --- 📡 WATCH SLUG
watch(() => event.value.slug, (newSlug) => {
  if (newSlug) setActiveSlug(newSlug)
})

watch(() => event.value.title, (newTitle) => {
  if (newTitle && (!event.value.slug || event.value.slug.trim() === '')) {
    event.value.slug = newTitle.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  }
})

onMounted(fetchEvent)
</script>

<template>
  <div class="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-2rem)] bg-white lg:m-4 lg:rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl animate-fadeup">
    
    <!-- Left: Settings Panel -->
    <div class="w-full lg:w-[480px] bg-white border-r border-slate-50 flex flex-col overflow-hidden">
       <!-- Toolbar Editor -->
       <div class="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center gap-3">
             <button @click="router.push('/admin/events')" class="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all">
                <SIGAPIcons name="ArrowLeft" :size="18" />
             </button>
             <div>
                <h3 class="font-black text-slate-800 text-sm uppercase tracking-tighter truncate max-w-[150px]">{{ event.title }}</h3>
                <p class="text-[10px] font-bold text-slate-400">Penyunting Landing Page</p>
             </div>
          </div>
          <div class="flex gap-2">
             <button @click="copyShareLink" class="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
               <SIGAPIcons name="Share2" :size="14" /> Share
             </button>
             <button @click="openQrPoster" class="p-2.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-purple-600 hover:text-white transition-all shadow-sm">
               <SIGAPIcons name="QrCode" :size="14" /> QR
             </button>
             <button @click="saveEvent" :disabled="isSaving" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all">
                <SIGAPIcons v-if="!isSaving" name="Save" :size="14" />
                <span v-else class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {{ isSaving ? 'Menyimpan' : 'Simpan' }}
             </button>
          </div>
       </div>

       <!-- Nav Tabs -->
       <div class="flex p-2 bg-slate-50/50 border-b border-slate-50 overflow-x-auto scrollbar-hide">
          <button v-for="tab in ['branding', 'display', 'typography', 'links', 'footer']" :key="tab"
                  @click="selectedPanel = tab"
                  :class="selectedPanel === tab ? 'bg-white text-blue-600 shadow-sm border-slate-100' : 'text-slate-400 border-transparent'"
                  class="flex-1 min-w-[80px] py-3 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all">
            {{ tab }}
          </button>
       </div>

       <!-- Panel Content -->
       <div class="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          <!-- BRANDING PANEL -->
          <div v-if="selectedPanel === 'branding'" class="space-y-6 animate-fadeup">
             <div class="space-y-4">
                <div class="space-y-1.5 font-bold">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest">Judul Event</label>
                   <input v-model="event.title" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                </div>
                <div class="space-y-1.5 font-bold">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest">URL Slug</label>
                   <div class="relative">
                      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">/e/</span>
                      <input v-model="event.slug" class="w-full bg-slate-50 rounded-2xl p-4 pl-10 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" />
                   </div>
                </div>
                <!-- Status Publikasi (Restored) -->
                <div class="space-y-1.5 font-bold">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest">Status Publikasi</label>
                   <select v-model="event.status" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all appearance-none">
                     <option value="AKTIF">🟢 AKTIF (Publik)</option>
                     <option value="TIDAK_AKTIF">🔴 TIDAK AKTIF (Draft)</option>
                     <option value="ARSIP">📦 ARSIP (Hidden)</option>
                   </select>
                </div>
                <!-- AI Suggest Deskripsi (Restored) -->
                <div class="space-y-1.5 font-bold">
                   <div class="flex items-center justify-between">
                     <label class="text-[10px] uppercase text-slate-400 tracking-widest">Deskripsi</label>
                     <button @click="suggestAI('description')" :disabled="isGeneratingAI.description" class="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-purple-100 transition-all border border-purple-100">
                       <SIGAPIcons name="Sparkles" :size="12" />
                       {{ isGeneratingAI.description ? 'AI Generating...' : 'AI Suggest' }}
                     </button>
                   </div>
                   <textarea v-model="event.description" rows="4" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all resize-none" placeholder="Deskripsi event..."></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4 pt-2">
                   <div v-for="comp in [{k:'showProfile', l:'Profil'}, {k:'showCover', l:'Sampul'}, {k:'showTitle', l:'Judul'}, {k:'showDescription', l:'Deskripsi'}]" :key="comp.k" class="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                      <span class="text-[10px] font-black text-slate-500 uppercase">{{ comp.l }}</span>
                      <button @click="event[comp.k] = !event[comp.k]" :class="event[comp.k] ? 'bg-blue-600' : 'bg-slate-300'" class="w-10 h-5 rounded-full relative transition-all">
                        <div :class="event[comp.k] ? 'translate-x-5' : 'translate-x-1'" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-all"></div>
                      </button>
                   </div>
                </div>
                <div class="space-y-1.5 font-bold pt-2">
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest">Warna Latar Belakang</label>
                   <div class="flex gap-4">
                      <input type="color" v-model="event.bgValue" class="w-14 h-14 rounded-2xl overflow-hidden border-none shrink-0" />
                      <input v-model="event.bgValue" class="w-full bg-slate-50 rounded-2xl px-4 text-sm font-mono font-bold outline-none" placeholder="#000000" />
                   </div>
                </div>
             </div>
          </div>

          <!-- DISPLAY PANEL -->
          <div v-if="selectedPanel === 'display'" class="space-y-6 animate-fadeup">
             <div class="space-y-6">
                <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-6">
                   <div class="relative group">
                      <div :class="event.profileShape === 'circle' ? 'rounded-full' : 'rounded-3xl'" class="w-20 h-20 bg-slate-200 overflow-hidden shadow-inner border-2 border-white transition-all">
                         <img v-if="event.profilePhoto" :src="event.profilePhoto" class="w-full h-full object-cover" />
                      </div>
                      <button @click="$refs.pInput.click()" class="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                         <SIGAPIcons name="Upload" :size="20" />
                      </button>
                      <input type="file" ref="pInput" @change="handleFileUpload($event, 'profile')" hidden />
                   </div>
                   <div class="flex-1 space-y-2">
                      <p class="text-[10px] font-black text-slate-400 uppercase">Bentuk Profil</p>
                      <div class="flex gap-2">
                         <button @click="event.profileShape = 'circle'" :class="event.profileShape === 'circle' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'" class="flex-1 py-2 rounded-xl text-[9px] font-black uppercase border border-slate-100 shadow-sm transition-all">BULAT</button>
                         <button @click="event.profileShape = 'square'" :class="event.profileShape === 'square' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'" class="flex-1 py-2 rounded-xl text-[9px] font-black uppercase border border-slate-100 shadow-sm transition-all">KOTAK</button>
                      </div>
                   </div>
                </div>

                <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gambar Sampul (Cover)</p>
                   <div class="relative h-24 bg-slate-200 rounded-2xl overflow-hidden group">
                      <img v-if="event.eventPhoto" :src="event.eventPhoto" class="w-full h-full object-cover" />
                      <button @click="$refs.cInput.click()" class="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                         <SIGAPIcons name="Plus" :size="24" />
                      </button>
                      <input type="file" ref="cInput" @change="handleFileUpload($event, 'cover')" hidden />
                   </div>
                </div>
             </div>
          </div>

          <!-- LINKS PANEL -->
          <div v-if="selectedPanel === 'links'" class="space-y-6 animate-fadeup">
             <div class="flex gap-2">
                <button @click="addNewItem('BUTTON')" class="flex-1 p-4 bg-blue-50 text-blue-600 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-100 transition-all">
                   <SIGAPIcons name="Link" :size="20" />
                   <span class="text-[9px] font-black uppercase">Link</span>
                </button>
                <button @click="addNewItem('SOCIAL')" class="flex-1 p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex flex-col items-center gap-2 hover:bg-emerald-100 transition-all">
                   <SIGAPIcons name="Instagram" :size="20" />
                   <span class="text-[9px] font-black uppercase">Social</span>
                </button>
                <button @click="addNewItem('DIVIDER')" class="flex-1 p-4 bg-slate-50 text-slate-500 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-100 transition-all">
                   <SIGAPIcons name="Layers" :size="20" />
                   <span class="text-[9px] font-black uppercase">Garis</span>
                </button>
             </div>

             <div class="space-y-4">
                <div v-for="(it, idx) in event.items" :key="idx" class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group/item">
                   <div class="flex items-center gap-4">
                      <!-- Drag Alt (Up Down) -->
                      <div class="flex flex-col gap-1">
                         <button @click="moveItem(idx, 'up')" :disabled="idx === 0" class="text-slate-300 hover:text-blue-500 disabled:opacity-0"><SIGAPIcons name="Menu" :size="12" class="rotate-180" /></button>
                         <button @click="moveItem(idx, 'down')" :disabled="idx === event.items.length - 1" class="text-slate-300 hover:text-blue-500 disabled:opacity-0"><SIGAPIcons name="Menu" :size="12" /></button>
                      </div>

                      <div class="flex-1 space-y-4">
                         <div class="flex items-center gap-3">
                            <button @click="openIconSelector(idx)" class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                               <SIGAPIcons :name="it.icon || 'Link'" :size="18" />
                            </button>
                            <input v-model="it.label" class="flex-1 text-sm font-bold border-none outline-none focus:text-blue-600" placeholder="Label..." />
                            <button @click="event.items.splice(idx, 1)" class="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all">
                               <SIGAPIcons name="Trash2" :size="16" />
                            </button>
                         </div>
                         <div v-if="it.type !== 'DIVIDER'" class="flex flex-col gap-2">
                            <input v-model="it.url" class="w-full bg-slate-50 p-2.5 rounded-xl text-[10px] font-mono border-none outline-none" placeholder="https://..." />
                            <div class="flex gap-4">
                               <div class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full scale-75 origin-left">
                                  <input type="color" v-model="it.color" class="w-4 h-4 rounded-full border-none" />
                                  <span class="text-[10px] font-black text-slate-400 uppercase">BG</span>
                               </div>
                               <div class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full scale-75 origin-left">
                                  <input type="color" v-model="it.textColor" class="w-4 h-4 rounded-full border-none" />
                                  <span class="text-[10px] font-black text-slate-400 uppercase">Text</span>
                               </div>
                               <button v-if="it.type === 'SOCIAL'" @click="it.layout = it.layout === 'icon-only' ? 'icon-left' : 'icon-only'"
                                       :class="it.layout === 'icon-only' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'"
                                       class="px-3 py-1.5 rounded-full text-[8px] font-black uppercase ml-auto">ICON ONLY</button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <!-- FOOTER PANEL -->
          <div v-if="selectedPanel === 'footer'" class="space-y-6 animate-fadeup">
             <div class="space-y-4">
                <div class="space-y-1.5 font-bold">
                   <div class="flex items-center justify-between">
                     <label class="text-[10px] uppercase text-slate-400 tracking-widest">Teks Penutup</label>
                     <button @click="suggestAI('footer')" :disabled="isGeneratingAI.footer" class="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-purple-100 transition-all border border-purple-100">
                       <SIGAPIcons name="Sparkles" :size="12" />
                       {{ isGeneratingAI.footer ? 'AI Generating...' : 'AI Suggest' }}
                     </button>
                   </div>
                   <textarea v-model="event.footerText" rows="4" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="Pesan akhir untuk audiens..."></textarea>
                </div>
                <div class="bg-blue-50 border border-blue-100 p-6 rounded-3xl space-y-4">
                   <div class="flex items-center justify-between">
                      <span class="text-xs font-black text-blue-700 uppercase tracking-tighter">Branding Sistem</span>
                      <button @click="event.showSystemBranding = !event.showSystemBranding" :class="event.showSystemBranding ? 'bg-blue-600' : 'bg-slate-300'" class="w-10 h-5 rounded-full relative transition-all">
                        <div :class="event.showSystemBranding ? 'translate-x-5' : 'translate-x-1'" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-all"></div>
                      </button>
                   </div>
                   <div v-if="event.showSystemBranding" class="space-y-2">
                     <input v-model="event.customBranding" class="w-full bg-white rounded-xl p-3 text-xs font-bold border-none outline-none" placeholder="Nama Brand..." />
                     <input v-model="event.customPoweredBy" class="w-full bg-white rounded-xl p-3 text-xs font-bold border-none outline-none" placeholder="Powered By..." />
                   </div>
                </div>
             </div>
          </div>

       </div>
    </div>

    <!-- Right: Live Preview Panel -->
    <div class="flex-1 bg-slate-100/50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
       <!-- Simulator Title -->
       <div class="hidden lg:flex absolute top-10 left-10 items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Simulator Preview</span>
       </div>

       <div class="flex gap-4 absolute top-10 right-10">
          <a :href="'/e/' + event.slug" target="_blank" class="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm transition-all">
             <SIGAPIcons name="ExternalLink" :size="18" />
          </a>
       </div>

       <!-- Phone Frame Simulator -->
       <div class="w-[360px] h-[720px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl border-[8px] border-slate-800 relative z-10 shrink-0 scale-90 lg:scale-100 transition-all overflow-hidden">
          <div class="w-full h-full bg-white rounded-[2.2rem] overflow-hidden relative flex flex-col" :style="{ backgroundColor: event.bgValue }">
             <!-- Preview-Lock Banner (Restored) -->
             <div v-if="event.status !== 'AKTIF'" class="sticky top-0 z-30 w-full bg-red-500/90 backdrop-blur-sm p-2 flex items-center justify-center gap-2">
               <SIGAPIcons name="ShieldAlert" :size="12" class="text-white" />
               <span class="text-[8px] font-black text-white uppercase tracking-widest">{{ event.status === 'ARSIP' ? 'ARSIP' : 'INAKTIF - PREVIEW' }}</span>
             </div>
             <div class="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
                <!-- Cover -->
                <div v-if="event.showCover" class="w-full shrink-0 bg-slate-800" :style="{ height: event.coverHeight + 'px' }">
                   <img v-if="event.eventPhoto" :src="event.eventPhoto" class="w-full h-full object-cover" />
                </div>

                <!-- Profile & Header -->
                <div class="flex flex-col items-center px-6 text-center" :class="event.showCover && event.showProfile ? '-mt-12' : 'pt-12'">
                   <div v-if="event.showProfile" :class="event.profileShape === 'circle' ? 'rounded-full' : 'rounded-[2rem]'" 
                        :style="{ width: event.profileWidth + 'px', height: event.profileHeight + 'px', borderWidth: event.profileBorderWidth + 'px', borderStyle: 'solid', borderColor: event.profileBgColor }"
                        class="bg-white overflow-hidden shadow-xl mb-4 transition-all shrink-0">
                      <img v-if="event.profilePhoto" :src="event.profilePhoto" class="w-full h-full object-cover" />
                      <div v-else class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300 font-black text-2xl uppercase">EP</div>
                   </div>
                   <h2 v-if="event.showTitle" :style="{ color: event.titleColor }" class="text-xl font-black leading-tight tracking-tight">{{ event.title || 'Judul Event' }}</h2>
                   <p v-if="event.showDescription" :style="{ color: event.descColor }" class="mt-2 text-[10px] font-medium leading-relaxed opacity-80 px-4">{{ event.description || 'Deskripsi singkat layanan event.' }}</p>
                </div>

                <!-- Items -->
                <div class="p-6 space-y-3 pb-20">
                   <template v-for="(it, i) in groupedItems" :key="i">
                      <!-- Social Grid -->
                      <div v-if="it.type === 'SOC_GROUP'" class="flex flex-wrap justify-center gap-3 py-2">
                         <div v-for="(s, si) in it.items" :key="'s'+si"
                              :style="{ backgroundColor: s.color, color: s.textColor, borderRadius: event.buttonRadius + 'px' }"
                              class="w-12 h-12 flex items-center justify-center shadow-lg transform active:scale-95 transition-all">
                               <SIGAPIcons :name="s.icon || 'Instagram'" :size="20" />
                         </div>
                      </div>

                      <!-- Divider -->
                      <div v-else-if="it.type === 'DIVIDER'" class="py-4 flex justify-center">
                         <div class="w-1/2 h-px bg-slate-200" :style="{ backgroundColor: it.color, height: it.order + 'px' }"></div>
                      </div>

                      <!-- Button -->
                      <div v-else-if="it.isActive" :style="{ backgroundColor: it.color, color: it.textColor, borderRadius: event.buttonRadius + 'px' }"
                           class="w-full p-4 flex items-center gap-3 shadow-lg transform active:scale-[0.98] transition-all">
                         <SIGAPIcons v-if="it.layout === 'icon-left'" :name="it.icon || 'Link'" :size="18" />
                         <span class="flex-1 text-center text-xs font-black uppercase tracking-tight">{{ it.label }}</span>
                      </div>
                   </template>
                </div>
             </div>

             <!-- Footer Branding -->
             <div v-if="event.showFooter" class="absolute bottom-6 left-0 right-0 px-6 text-center">
                <p v-if="event.footerText" :style="{ color: event.footerColor }" class="text-[8px] font-bold uppercase tracking-widest leading-relaxed mb-4 whitespace-pre-wrap">{{ event.footerText }}</p>
                <div v-if="event.showSystemBranding" class="flex flex-col items-center gap-1 opacity-40 grayscale">
                   <p class="text-[7px] font-black uppercase tracking-[0.2em] text-slate-800">© {{ new Date().getFullYear() }} {{ event.customBranding }}</p>
                   <p class="text-[6px] font-bold text-slate-500 uppercase tracking-widest">Powered By {{ event.customPoweredBy }}</p>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- Modals -->
    <IconSelectorModal :isOpen="showIconModal" :currentIcon="activeItemIndex !== null ? event.items[activeItemIndex].icon : ''" 
                       @close="showIconModal = false" @select="handleIconSelect" />

    <!-- QR Poster Modal (Restored) -->
    <Teleport to="body">
      <div v-if="showQrPoster" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-xl" @click="showQrPoster = false"></div>
        <div class="relative bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden animate-pop">
          <div class="p-8 flex items-center justify-between border-b border-slate-50">
            <div>
              <h3 class="text-xl font-bold text-slate-800">QR Code Event</h3>
              <p class="text-[10px] text-slate-400 font-medium">Unduh dan bagikan QR Code event ini</p>
            </div>
            <button @click="showQrPoster = false" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
              <SIGAPIcons name="X" :size="20" />
            </button>
          </div>
          <div class="p-8 flex flex-col items-center gap-6">
            <div class="bg-slate-50 p-6 rounded-3xl shadow-inner border border-slate-100 inline-block">
              <canvas ref="qrPosterCanvas" class="rounded-2xl"></canvas>
            </div>
            <div class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-[10px] text-slate-400 break-all text-center">
              /e/{{ event.slug }}
            </div>
            <div class="flex gap-4 w-full">
              <button @click="downloadQrPoster" class="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                <SIGAPIcons name="Download" :size="16" /> Unduh QR Code
              </button>
              <button @click="showQrPoster = false" class="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase hover:bg-slate-200 transition-all">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>
