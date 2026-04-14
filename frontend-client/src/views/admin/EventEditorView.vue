<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../lib/axios'
import * as LucideIcons from 'lucide-vue-next'
import { 
  ArrowLeft, Save, Plus, Trash2, Eye, Palette, 
  Link as LinkIcon, MessageCircle, Instagram, Loader2, 
  ChevronUp, ChevronDown, Upload, Settings, 
  GripVertical, MousePointer2, Share2, Sparkles, Layout,
  MoreVertical, X, CheckCircle, XCircle, Archive, CloudUpload,
  Circle, Square, Type
} from 'lucide-vue-next'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'

const route = useRoute()
const router = useRouter()
const isLoading = ref(true)
const isSaving = ref(false)
const isGeneratingAI = ref({ description: false, footer: false })
const windowWidth = ref(window.innerWidth)

// State for Navigation & Panels
const selectedPanel = ref<string>('branding') 

// State for Icon Selector
const showIconModal = ref(false)
const activeItemIndex = ref<number | null>(null)

const event = ref<any>({
  id: null,
  title: '',
  slug: '',
  description: '',
  status: 'TIDAK_AKTIF',
  bgType: 'color',
  bgValue: '#0f172a',
  profilePhoto: '',
  profileShape: 'circle',
  profileBorderStyle: 'solid', 
  profileBorderWidth: 2,       
  profileBgColor: '#ffffff',
  showProfile: true,
  showCover: true,
  showTitle: true,
  showDescription: true,
  showFooter: true,
  eventPhoto: '',
  footerText: '',
  profileWidth: 80,
  profileHeight: 80,
  coverHeight: 128,
  titleColor: '#ffffff',
  titleFont: 'Inter',
  descColor: '#ffffff',
  descFont: 'Inter',
  footerColor: '#ffffff',
  footerFont: 'Inter',
  buttonShape: 'rounded',
  buttonRadius: 12,
  items: []
})

const fontOptions = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
  { name: 'Playfair Display', value: "'Playfair Display', serif" },
  { name: 'Space Grotesk', value: "'Space Grotesk', sans-serif" }
]

const fetchEvent = async () => {
  const id = route.params.id
  try {
    const res = await api.get(`/admin/events/${id}`)
    const data = res.data
    // Sanitize data
    if (data.bgType === 'color' && (!data.bgValue || !data.bgValue.startsWith('#'))) {
      data.bgValue = '#0f172a'
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
    else event.value.bgValue = data.url
  } catch (err) {
    alert('Gagal mengunggah gambar')
  }
}

const addNewItem = (type: string) => {
  const newItem = {
    label: type === 'DIVIDER' ? 'Separator' : 'Tautan Baru',
    url: type === 'DIVIDER' ? '#' : 'https://',
    type,
    color: type === 'BUTTON' ? '#3b82f6' : (type === 'SOCIAL' ? '#1e293b' : '#cbd5e1'),
    textColor: '#ffffff',
    iconColor: '#ffffff',
    icon: type === 'BUTTON' ? 'Link' : (type === 'SOCIAL' ? 'Instagram' : 'solid'),
    order: event.value.items.length,
    layout: 'icon-left',
    showLabel: true,
    isActive: true
  }
  event.value.items.push(newItem)
}

const removeItem = (index: number) => {
  if (confirm('Hapus item ini?')) event.value.items.splice(index, 1)
}

const moveItem = (index: number, direction: 'up' | 'down') => {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= event.value.items.length) return
  const temp = { ...event.value.items[index] }
  event.value.items[index] = { ...event.value.items[targetIndex] }
  event.value.items[targetIndex] = temp
  event.value.items.forEach((item: any, i: number) => item.order = i)
}

const openIconSelector = (index: number) => {
  activeItemIndex.value = index
  showIconModal.value = true
}

const handleIconSelect = (icon: string) => {
  if (activeItemIndex.value !== null) event.value.items[activeItemIndex.value].icon = icon
}

watch(() => event.value.title, (newTitle) => {
  if (newTitle && (!event.value.slug || event.value.slug.trim() === '')) {
    event.value.slug = newTitle.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }
})

const saveEvent = async () => {
  isSaving.value = true
  try {
    const res = await api.put(`/admin/events/${event.value.id}`, event.value)
    event.value = res.data
    alert('Simpan berhasil!')
  } catch (err: any) {
    alert(err.response?.data?.error || 'Gagal menyimpan data event')
  } finally {
    isSaving.value = false
  }
}

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

onMounted(() => {
  fetchEvent()
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})
</script>

<template>
  <div class="editor-layout bg-slate-50 dark:bg-slate-900 md:rounded-2xl md:m-4 md:h-[calc(100vh-2rem)] border border-blue-400 dark:border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.25)] overflow-hidden">
    <!-- 🏗️ TOP NAVBAR -->
    <header class="editor-nav bg-white dark:bg-slate-800 shadow-sm flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
      <div class="flex items-center gap-4">
        <button @click="router.push('/admin/events')" class="p-2 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-400 hover:text-blue-500 transition-colors">
          <ArrowLeft :size="18" />
        </button>
        <div>
          <h1 class="text-sm md:text-md font-black dark:text-slate-100 uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">{{ event.title || 'Event Editor' }}</h1>
          <span class="text-[10px] text-slate-400 font-bold block leading-none mt-1">sigap.id/e/{{ event.slug }}</span>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Preview Button -->
        <a :href="'/e/' + event.slug" target="_blank" 
           class="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-2.5 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-all"
           title="Preview">
          <Eye :size="16" />
          <span class="hidden lg:inline">Preview</span>
        </a>

        <!-- Live Preview Sync Status -->
        <div class="hidden lg:flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
          <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
          SYNCED
        </div>

        <button @click="saveEvent" :disabled="isSaving" class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all disabled:opacity-50">
          <Loader2 v-if="isSaving" class="animate-spin" :size="16" />
          <Save v-else :size="16" />
          <span class="hidden sm:inline">Simpan</span>
        </button>
      </div>
    </header>

    <div v-if="isLoading" class="flex flex-1 h-[calc(100%-60px)] items-center justify-center">
      <Loader2 class="animate-spin text-blue-500" :size="40" />
    </div>

    <main v-else class="editor-main flex flex-row relative h-[calc(100%-60px)] overflow-hidden">
      <!-- 🖥️ SIDEBAR (Desktop: Fixed, Mobile: Bottom-Nav Triggered) -->
      <aside class="sidebar-container h-full w-[360px] border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 overflow-hidden flex flex-col z-40 transition-transform duration-300"
             :class="{ 'mobile-overlay': selectedPanel && windowWidth < 768, 'mobile-hidden': !selectedPanel && windowWidth < 768 }">
        
        <!-- Sidebar Navigation Tabs -->
        <div class="sidebar-tabs flex overflow-x-auto scrollbar-hide border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-1">
          <button v-for="tab in ['branding', 'display', 'typography', 'links', 'footer']" :key="tab"
                  @click="selectedPanel = tab"
                  :class="selectedPanel === tab ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'"
                  class="flex-1 min-w-[70px] py-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all">
            {{ tab }}
          </button>
        </div>

        <!-- Scrollable settings content -->
        <div class="sidebar-content flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">
          
          <!-- [1] BRANDING TAB -->
          <div v-if="selectedPanel === 'branding'" class="space-y-6 animate-fadein">
            <div class="group-v4">
              <label>Informasi Utama</label>
              <input v-model="event.title" class="input-v3" placeholder="Nama Event" />
              <select v-model="event.status" class="input-v3 mt-3">
                <option value="AKTIF">AKTIF</option>
                <option value="TIDAK_AKTIF">TIDAK AKTIF</option>
                <option value="ARSIP">ARSIP</option>
              </select>
            </div>

            <div class="group-v4">
              <label>Visibilitas Komponen Utama</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100">
                  <span class="text-[10px] font-black uppercase text-slate-500">Profil</span>
                  <button @click="event.showProfile = !event.showProfile" :class="event.showProfile ? 'bg-blue-600' : 'bg-slate-300'" class="w-10 h-5 rounded-full relative transition-colors">
                    <div :class="event.showProfile ? 'translate-x-5' : 'translate-x-1'" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-transform"></div>
                  </button>
                </div>
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100">
                  <span class="text-[10px] font-black uppercase text-slate-500">Sampul</span>
                  <button @click="event.showCover = !event.showCover" :class="event.showCover ? 'bg-blue-600' : 'bg-slate-300'" class="w-10 h-5 rounded-full relative transition-colors">
                    <div :class="event.showCover ? 'translate-x-5' : 'translate-x-1'" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-transform"></div>
                  </button>
                </div>
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100">
                  <span class="text-[10px] font-black uppercase text-slate-500">Judul</span>
                  <button @click="event.showTitle = !event.showTitle" :class="event.showTitle ? 'bg-blue-600' : 'bg-slate-300'" class="w-10 h-5 rounded-full relative transition-colors">
                    <div :class="event.showTitle ? 'translate-x-5' : 'translate-x-1'" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-transform"></div>
                  </button>
                </div>
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100">
                  <span class="text-[10px] font-black uppercase text-slate-500">Deskripsi</span>
                  <button @click="event.showDescription = !event.showDescription" :class="event.showDescription ? 'bg-blue-600' : 'bg-slate-300'" class="w-10 h-5 rounded-full relative transition-colors">
                    <div :class="event.showDescription ? 'translate-x-5' : 'translate-x-1'" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-transform"></div>
                  </button>
                </div>
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100">
                  <span class="text-[10px] font-black uppercase text-slate-500">Footer</span>
                  <button @click="event.showFooter = !event.showFooter" :class="event.showFooter ? 'bg-blue-600' : 'bg-slate-300'" class="w-10 h-5 rounded-full relative transition-colors">
                    <div :class="event.showFooter ? 'translate-x-5' : 'translate-x-1'" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-transform"></div>
                  </button>
                </div>
              </div>
            </div>

            <div class="group-v4">
              <div class="flex justify-between items-center mb-2">
                <label class="m-0">Deskripsi</label>
                <button @click="suggestAI('description')" class="ai-btn" :disabled="isGeneratingAI.description">
                  <Sparkles :size="12" /> AI Sugest
                </button>
              </div>
              <textarea v-model="event.description" rows="4" class="input-v3 text-xs leading-relaxed" placeholder="Deskripsi event..."></textarea>
            </div>

            <div class="group-v4">
              <label>Latar Belakang Dasar</label>
              <div class="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-3">
                <button v-for="t in ['color', 'image']" :key="t" @click="event.bgType = t"
                        :class="event.bgType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
                        class="flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all">{{ t }}</button>
              </div>
              <div v-if="event.bgType === 'color'" class="flex gap-2">
                <input type="color" v-model="event.bgValue" class="w-12 h-12 rounded-xl cursor-pointer border-none" />
                <input v-model="event.bgValue" class="input-v3 font-mono text-xs uppercase flex-1" />
              </div>
              <div v-else class="upload-area" @click="$refs.bgInput.click()">
                <CloudUpload :size="32" class="text-blue-500 mb-2" />
                <span class="text-[10px] font-black uppercase text-slate-400">Pilih Gambar</span>
                <input type="file" ref="bgInput" @change="handleFileUpload($event, 'background')" hidden accept="image/*" />
              </div>
            </div>
          </div>

          <!-- [2] DISPLAY TAB -->
          <div v-if="selectedPanel === 'display'" class="space-y-6 animate-fadein">
            <div class="group-v4">
               <label>Foto Profil Utama</label>
               <div class="flex items-center gap-4 mb-6">
                  <div class="relative w-24 h-24 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-100 shadow-inner group">
                    <img v-if="event.profilePhoto" :src="event.profilePhoto" class="w-full h-full object-cover" />
                    <div class="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer" @click="$refs.profileInput.click()">
                      <Upload :size="20" />
                    </div>
                  </div>
                  <div class="flex-1 space-y-2">
                    <button @click="event.profileShape = 'circle'" :class="event.profileShape === 'circle' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'" class="w-full py-2 rounded-lg text-[10px] font-black uppercase">BULAT</button>
                    <button @click="event.profileShape = 'square'" :class="event.profileShape === 'square' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'" class="w-full py-2 rounded-lg text-[10px] font-black uppercase">KOTAK</button>
                  </div>
                  <input type="file" ref="profileInput" @change="handleFileUpload($event, 'profile')" hidden accept="image/*" />
               </div>

               <label>Gaya Border Profil (Bug 2 & 3)</label>
               <select v-model="event.profileBorderStyle" class="input-v3 mb-3">
                 <option value="none">TANPA BORDER</option>
                 <option value="solid">SOLID</option>
                 <option value="dashed">DASHED (Putus-putus)</option>
                 <option value="double">DOUBLE</option>
                 <option value="outline">OUTLINE (Luar Saja)</option>
               </select>

               <div v-if="event.profileBorderStyle !== 'none'" class="space-y-4">
                 <div>
                   <span class="text-[9px] font-black text-slate-400 uppercase block mb-1">Ketebalan: {{ event.profileBorderWidth }}px</span>
                   <input type="range" v-model.number="event.profileBorderWidth" min="1" max="15" class="w-full accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none" />
                 </div>
                  <div class="flex gap-2">
                    <input type="color" v-model="event.profileBgColor" class="w-10 h-10 rounded-lg cursor-pointer" />
                    <input v-model="event.profileBgColor" class="input-v3 font-mono text-xs uppercase flex-1" />
                  </div>
                </div>

                <div class="mt-4 space-y-4">
                  <label>Ukuran Foto Profil</label>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <span class="text-[9px] font-black text-slate-400 uppercase block mb-1">Lebar: {{ event.profileWidth }}px</span>
                      <input type="range" v-model.number="event.profileWidth" min="40" max="250" class="w-full accent-blue-600 h-1 bg-slate-100" />
                    </div>
                    <div>
                      <span class="text-[9px] font-black text-slate-400 uppercase block mb-1">Tinggi: {{ event.profileHeight }}px</span>
                      <input type="range" v-model.number="event.profileHeight" min="40" max="250" class="w-full accent-blue-600 h-1 bg-slate-100" />
                    </div>
                  </div>
                </div>
            </div>

            <div class="group-v4">
               <label>Foto Sampul (Cover)</label>
               <div class="relative w-full h-32 bg-slate-100 rounded-2xl overflow-hidden group border border-slate-200">
                  <img v-if="event.eventPhoto" :src="event.eventPhoto" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer" @click="$refs.coverInput.click()">
                    <Plus :size="24" />
                    <input type="file" ref="coverInput" @change="handleFileUpload($event, 'cover')" hidden accept="image/*" />
                  </div>
               </div>
               <div class="mt-3">
                 <span class="text-[9px] font-black text-slate-400 uppercase block mb-1">Tinggi Sampul: {{ event.coverHeight }}px</span>
                 <input type="range" v-model.number="event.coverHeight" min="80" max="400" class="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg" />
               </div>
            </div>
            </div>

          <!-- [3] TYPOGRAPHY TAB (Bug 4) -->
          <div v-if="selectedPanel === 'typography'" class="space-y-6 animate-fadein">
            <div v-for="part in [{id:'title', label:'Judul'}, {id:'desc', label:'Deskripsi'}, {id:'footer', label:'Footer'}]" :key="part.id" class="group-v4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100">
              <label>{{ part.label }} Typography</label>
              <div class="space-y-3">
                <select v-model="event[part.id + 'Font']" class="input-v3 font-medium">
                  <option v-for="f in fontOptions" :key="f.name" :value="f.name">{{ f.name }}</option>
                </select>
                <div class="flex gap-2">
                   <input type="color" v-model="event[part.id + 'Color']" class="w-10 h-10 rounded-lg" />
                   <input v-model="event[part.id + 'Color']" class="input-v3 font-mono text-xs uppercase flex-1" />
                </div>
              </div>
            </div>
          </div>

          <!-- [4] LINKS TAB (Bugs 5, 6, 7, 8, 9) -->
          <div v-if="selectedPanel === 'links'" class="space-y-6 animate-fadein">
            <div class="grid grid-cols-3 gap-2">
              <button @click="addNewItem('BUTTON')" class="add-btn bg-blue-50 text-blue-600 border-blue-100"><LinkIcon :size="18" /><span>LINK</span></button>
              <button @click="addNewItem('SOCIAL')" class="add-btn bg-red-50 text-red-600 border-red-100"><MessageCircle :size="18" /><span>SOSMED</span></button>
              <button @click="addNewItem('DIVIDER')" class="add-btn bg-slate-50 text-slate-600 border-slate-200"><Type :size="18" /><span>DEV</span></button>
            </div>

            <div class="space-y-4">
              <div v-for="(it, idx) in event.items" :key="idx" class="item-card group">
                <div class="flex items-start gap-3">
                  <div class="flex flex-col gap-1 mt-1">
                    <button @click="moveItem(idx,'up')" :disabled="idx==0" class="text-slate-300 hover:text-blue-500 disabled:opacity-0"><ChevronUp :size="14" /></button>
                    <button @click="moveItem(idx,'down')" :disabled="idx==event.items.length-1" class="text-slate-300 hover:text-blue-500 disabled:opacity-0"><ChevronDown :size="14" /></button>
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <button @click="openIconSelector(idx)" class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all shrink-0">
                        <component :is="(LucideIcons as any)[it.icon?.split('|')[0] || 'Link']" :size="20" :style="{ color: it.iconColor }" />
                      </button>
                      <input v-model="it.label" class="flex-1 bg-transparent font-black text-xs uppercase tracking-tight outline-none" placeholder="Label Tautan" />
                      
                      <!-- Status Toggle (Bug Part 11) -->
                      <button @click="it.isActive = !it.isActive" :class="it.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'" class="p-1 px-2 rounded-md text-[8px] font-black uppercase tracking-widest transition-all">
                        {{ it.isActive ? 'ON' : 'OFF' }}
                      </button>
                    </div>

                    <div v-if="it.type !== 'DIVIDER'" class="space-y-3">
                      <input v-model="it.url" class="input-v3 !py-1.5 !text-[10px]" placeholder="URL Tautan" />
                      
                      <!-- Layout Control (Bug 6) -->
                      <div class="flex items-center gap-2">
                        <span class="text-[8px] font-black text-slate-400 uppercase">Layout:</span>
                        <div class="flex bg-slate-100 rounded-lg p-0.5 grow">
                          <button v-for="l in ['icon-left', 'icon-right', 'icon-edge-left', 'icon-edge-right', 'text-only', (it.type==='SOCIAL'?'icon-only':null)].filter(n=>n)" :key="l" @click="it.layout = l"
                                  :class="it.layout === l ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400'"
                                  class="flex-1 py-1 text-[7px] font-black uppercase rounded-md transition-all">
                            {{ l === 'icon-left' ? 'LEFT' : l === 'icon-right' ? 'RIGHT' : l === 'icon-edge-left' ? 'EDGE L' : l === 'icon-edge-right' ? 'EDGE R' : l === 'text-only' ? 'TEXT' : 'ICON' }}
                          </button>
                        </div>
                      </div>

                      <!-- Colors Fix (Bug 7, 9) -->
                      <div class="flex gap-4 p-2 bg-slate-50 rounded-xl">
                        <div class="flex items-center gap-1.5">
                          <input type="color" v-model="it.color" class="w-5 h-5 rounded-full" />
                          <span class="text-[8px] font-black uppercase text-slate-400">BTN</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <input type="color" v-model="it.textColor" class="w-5 h-5 rounded-full" />
                          <span class="text-[8px] font-black uppercase text-slate-400">TXT</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <input type="color" v-model="it.iconColor" class="w-5 h-5 rounded-full" />
                          <span class="text-[8px] font-black uppercase text-slate-400">ICO</span>
                        </div>
                        <!-- Label Toggle for Social (Bug 8) -->
                        <div v-if="it.type==='SOCIAL'" class="flex items-center gap-1 ml-auto">
                          <span class="text-[8px] font-black uppercase text-slate-400">LABEL</span>
                          <input type="checkbox" v-model="it.showLabel" class="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    <!-- Divider Customization (Bug 5) -->
                    <div v-else class="flex items-center gap-4 bg-slate-50 p-2 rounded-xl">
                      <input type="color" v-model="it.color" class="w-6 h-6 rounded-full" />
                      <div class="flex-1">
                        <span class="text-[8px] font-black uppercase text-slate-400 block mb-1">Ketebalan: {{ it.order }}px</span>
                        <input type="range" v-model.number="it.order" min="1" max="12" class="w-full h-1 accent-slate-400" />
                      </div>
                    </div>
                  </div>

                  <button @click="removeItem(idx)" class="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- [5] FOOTER TAB (Bug 10) -->
          <div v-if="selectedPanel === 'footer'" class="space-y-6 animate-fadein">
            <div class="group-v4 p-4 border-2 border-dashed border-blue-100 rounded-2xl bg-blue-50/20">
              <label>Gaya Tombol Global</label>
              <div class="flex p-1 bg-slate-200/50 rounded-xl mb-4">
                <button @click="event.buttonShape = 'rounded'" :class="event.buttonShape === 'rounded' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'" class="flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all">ROUNDED</button>
                <button @click="event.buttonShape = 'square'" :class="event.buttonShape === 'square' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'" class="flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all">SQUARE</button>
              </div>
              <div v-if="event.buttonShape === 'rounded'" class="px-2">
                 <span class="text-[9px] font-black text-slate-400 uppercase block mb-1">Radius: {{ event.buttonRadius }}px</span>
                 <input type="range" v-model.number="event.buttonRadius" min="0" max="40" class="w-full accent-blue-600" />
              </div>
            </div>

            <div class="group-v4">
              <div class="flex justify-between items-center mb-2">
                <label class="m-0 uppercase tracking-widest text-[11px] font-black">Pesan Footer</label>
                <button @click="suggestAI('footer')" class="ai-btn" :disabled="isGeneratingAI.footer">
                  <Sparkles :size="12" /> AI Sugest
                </button>
              </div>
              <textarea v-model="event.footerText" rows="6" class="input-v3 text-xs leading-relaxed" placeholder="Pesan akhir event..."></textarea>
            </div>
          </div>

        </div>
      </aside>

      <!-- 🖥️ WORKSPACE (Enlarged Simulator - Bug 11) -->
      <section class="editor-workspace flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-slate-200/30 overflow-hidden relative">
        <!-- Enlarged Simulator Design -->
        <div class="simulator-container max-w-[500px] w-full h-full flex flex-col animate-fadein shadow-2xl rounded-[3rem] border-[12px] border-slate-900 overflow-hidden bg-white dark:bg-slate-900 relative">
          
          <div class="h-full overflow-y-auto scrollbar-hide flex flex-col relative" :style="{ backgroundColor: event.bgType === 'color' ? event.bgValue : '#000' }">
             <img v-if="event.bgType === 'image' && event.bgValue" :src="event.bgValue" class="absolute inset-0 w-full h-full object-cover opacity-60" />
             
             <div class="relative z-10 w-full flex flex-col min-h-full">
                <!-- Cover Image -->
                <div v-if="event.showCover" class="w-full shrink-0 overflow-hidden bg-slate-800" :style="{ height: event.coverHeight + 'px', maxHeight: '40%' }">
                   <img v-if="event.eventPhoto" :src="event.eventPhoto" class="w-full h-full object-cover" />
                </div>

                 <!-- Profile Info -->
                 <div v-if="event.showProfile || event.showTitle || event.showDescription" 
                      class="flex flex-col items-center px-6 pb-6 text-center transition-all duration-300" 
                      :class="{ 
                        '-mt-12': event.showCover && event.showProfile,
                        'pt-12': !event.showCover,
                        'pt-6': !event.showCover && !event.showProfile
                      }">
                    <!-- Profile Image with Dynamic Border (Bug 2 & 3 Fix) -->
                    <div v-if="event.showProfile" 
                         class="relative overflow-hidden mb-6 transition-all duration-300 shadow-xl"
                         :style="event.profileBorderStyle === 'outline' 
                           ? { 
                               width: event.profileWidth + 'px', 
                               height: event.profileHeight + 'px',
                               maxWidth: '90%',
                               borderRadius: event.profileShape === 'circle' ? '50%' : '16px',
                               outline: `${event.profileBorderWidth}px solid ${event.profileBgColor}`,
                               outlineOffset: '4px',
                               backgroundColor: '#fff'
                             }
                           : {
                               width: event.profileWidth + 'px', 
                               height: event.profileHeight + 'px',
                               maxWidth: '90%',
                               borderRadius: event.profileShape === 'circle' ? '50%' : '16px',
                               border: `${event.profileBorderWidth}px ${event.profileBorderStyle} ${event.profileBgColor}`,
                               backgroundColor: '#fff'
                             }">
                        <img v-if="event.profilePhoto" :src="event.profilePhoto" class="w-full h-full object-cover" />
                    </div>
                    
                    <!-- Title & Desc (Bug 4) -->
                    <h2 v-if="event.showTitle" :style="{ color: event.titleColor, fontFamily: event.titleFont }" class="text-2xl font-black drop-shadow-md leading-tight">{{ event.title || 'Judul Event' }}</h2>
                    <p v-if="event.showDescription" :style="{ color: event.descColor, fontFamily: event.descFont }" class="mt-3 text-xs font-medium leading-relaxed drop-shadow-sm whitespace-pre-wrap opacity-90 px-4">{{ event.description || 'Deskripsi singkat event Anda...' }}</p>
                 </div>

                 <!-- Safe Padding when everything is hidden -->
                 <div v-if="!event.showCover && !event.showProfile && !event.showTitle && !event.showDescription" class="pt-20"></div>

                <!-- Action Items List -->
                <div class="flex-1 px-6 space-y-3 pb-20">
                  <template v-for="it in event.items" :key="it.order">
                    <div v-if="it.isActive" class="w-full">
                      
                      <!-- BUTTON TYPE -->
                      <a v-if="it.type === 'BUTTON'" :href="it.url" target="_blank"
                         :style="{ 
                           backgroundColor: it.color, 
                           color: it.textColor,
                           borderRadius: event.buttonShape === 'square' ? '4px' : (event.buttonShape === 'rounded' ? event.buttonRadius + 'px' : '16px')
                         }"
                         :class="{ 'flex-row-reverse': it.layout === 'icon-right', 'justify-center': it.layout === 'icon-left' || it.layout === 'icon-right' }"
                         class="flex items-center gap-3 p-4 shadow-lg hover:scale-[1.02] transition-transform duration-200 border border-white/10 group">
                         <component v-if="it.layout !== 'text-only'" :is="(LucideIcons as any)[it.icon || 'Link']" :size="20" :style="{ color: it.iconColor }" />
                         <span class="text-sm font-black uppercase tracking-tight" :class="{ 'flex-1 text-center': it.layout.includes('edge') || it.layout === 'text-only' || it.layout === 'icon-left' || it.layout === 'icon-right' }">{{ it.label }}</span>
                         <div v-if="it.layout.includes('edge')" class="w-5 h-5 invisible"></div>
                      </a>

                      <!-- SOCIAL TYPE (Bug 7, 8, 9) -->
                      <a v-else-if="it.type === 'SOCIAL'" :href="it.url" target="_blank"
                         :style="{ 
                            backgroundColor: it.color, 
                            color: it.textColor,
                            borderRadius: event.buttonShape === 'square' ? '4px' : (event.buttonShape === 'rounded' ? event.buttonRadius + 'px' : '16px'),
                            width: it.layout === 'icon-only' ? '60px' : '100%',
                            margin: it.layout === 'icon-only' ? '0 auto' : '0'
                         }"
                         :class="{ 
                           'flex-row-reverse': it.layout === 'icon-right' || it.layout === 'icon-edge-right', 
                           'justify-center': it.layout === 'icon-only' || it.layout === 'icon-left' || it.layout === 'icon-right',
                           'justify-between !px-4': it.layout === 'icon-edge-left' || it.layout === 'icon-edge-right'
                         }"
                         class="flex items-center gap-3 p-4 shadow-md transition-all hover:scale-[1.02]">
                         <component v-if="it.layout !== 'text-only'" :is="(LucideIcons as any)[it.icon?.split('|')[0] || 'Instagram']" :size="20" :style="{ color: it.iconColor }" />
                         <span v-if="it.layout !== 'icon-only' && it.showLabel" class="text-xs font-black uppercase tracking-tight" :class="{ 'flex-1 text-center': it.layout.includes('edge') || it.layout === 'text-only' || it.layout === 'icon-left' || it.layout === 'icon-right' }">{{ it.label }}</span>
                         <div v-if="it.layout.includes('edge')" class="w-5 h-5 invisible"></div>
                      </a>

                      <!-- DIVIDER TYPE (Bug 5) -->
                      <div v-else-if="it.type === 'DIVIDER'" class="flex items-center gap-4 py-6">
                        <div class="grow opacity-20" :style="{ backgroundColor: it.color, height: it.order + 'px' }"></div>
                        <span v-if="it.label !== 'Separator'" :style="{ color: it.color }" class="text-[10px] font-black uppercase tracking-widest">{{ it.label }}</span>
                        <div class="grow opacity-20" :style="{ backgroundColor: it.color, height: it.order + 'px' }"></div>
                      </div>

                    </div>
                  </template>

                  <!-- Simulator Footer Branding (Bug 4) -->
                  <div v-if="event.showFooter" class="pt-10 pb-16 text-center">
                    <div class="h-[1px] w-1/2 mx-auto bg-white/20 mb-6"></div>
                    <p :style="{ color: event.footerColor, fontFamily: event.footerFont }" class="text-[10px] font-bold px-8 leading-relaxed opacity-60 whitespace-pre-wrap italic">{{ event.footerText || 'Create your own event portal with Sigap.' }}</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      <!-- 📱 MOBILE OVERLAY TOGGLE -->
      <div v-if="selectedPanel && windowWidth < 768" @click="selectedPanel = ''" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity"></div>
    </main>

    <!-- 📱 MOBILE BOTTOM TOOLBAR (Fixed Docked) -->
    <nav class="mobile-toolbar fixed bottom-0 left-0 right-0 flex md:hidden items-center justify-around bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 h-16 px-2 z-50">
      <button v-for="tab in [{id:'branding', ic:'Palette'}, {id:'display', ic:'Layout'}, {id:'links', ic:'LinkIcon'}, {id:'footer', ic:'Settings'}]" 
              :key="tab.id" @click="selectedPanel = (selectedPanel === tab.id ? '' : tab.id)" 
              :class="selectedPanel === tab.id ? 'text-blue-600' : 'text-slate-400'"
              class="flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all">
        <component :is="(LucideIcons as any)[tab.ic]" :size="20" />
        <span class="text-[8px] font-black uppercase">{{ tab.id }}</span>
      </button>
      <div class="w-[1px] h-8 bg-slate-100 dark:bg-slate-700 mx-1"></div>
      <button @click="saveEvent" class="bg-blue-600 text-white w-12 h-10 rounded-lg flex items-center justify-center">
        <Save :size="18" />
      </button>
    </nav>
  </div>

  <!-- Icon Selector Modal -->
  <IconSelectorModal :isOpen="showIconModal" :currentIcon="activeItemIndex !== null ? event.items[activeItemIndex].icon : ''" @close="showIconModal = false" @select="handleIconSelect" />
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Poppins:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Roboto:wght@400;700;900&family=Open+Sans:wght@400;700;800&family=Playfair+Display:wght@700;900&family=Space+Grotesk:wght@400;700&display=swap');

.editor-layout { font-family: 'Inter', sans-serif; display: flex; flex-direction: column; }
.editor-nav { height: 4rem; display: flex; align-items: center; justify-content: space-between; padding: 0 1rem; }
.input-v3 { width: 100%; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 13px; font-weight: 700; outline: none; transition: all 0.2s; }
.dark .input-v3 { background: #0f172a; border-color: #1e293b; color: #f1f5f9; }
.input-v3:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.group-v4 { border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
.dark .group-v4 { border-color: #1e293b; }
.group-v4 label { display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 0.05em; }
.ai-btn { display: flex; align-items: center; gap: 0.375rem; padding: 4px 10px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; border: none; cursor: pointer; }
.upload-area { width: 100%; border: 2px dashed #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; }
.upload-area:hover { border-color: #3b82f6; background: #f0f9ff; }
.add-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px; border: 1px solid transparent; border-radius: 16px; font-size: 8px; font-weight: 900; transition: all 0.2s; }
.item-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 20px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.dark .item-card { background: #1e293b; border-color: #334155; }
.animate-fadein { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Mobile logic override (Docked Style) */
@media (max-width: 767px) {
  .editor-layout { height: 100vh; height: 100svh; margin: 0; border: none; border-radius: 0; box-shadow: none; }
  .sidebar-container { 
    position: fixed; 
    left: 0; 
    right: 0; 
    bottom: 64px; 
    height: 80vh; 
    width: 100%; 
    transform: translateY(100%); 
    border-radius: 20px 20px 0 0; 
    border: none;
    box-shadow: 0 -10px 25px rgba(0,0,0,0.1);
  }
  .sidebar-container.mobile-overlay { transform: translateY(0); }
  .editor-workspace { padding: 20px; flex-shrink: 0; height: calc(100% - 64px); background: #f8fafc; }
  .simulator-container { transform: scale(0.8); transform-origin: top center; border-width: 6px; }
}

/* Landscape Mode Fix */
@media (max-width: 932px) and (orientation: landscape) {
  .editor-layout { height: 100vh; height: 100svh; display: flex; flex-direction: column; }
  .editor-main { flex: 1; min-height: 0; display: flex; flex-direction: row !important; }
  .sidebar-container { 
    position: relative !important; 
    transform: none !important; 
    width: 280px !important; 
    height: 100% !important; 
    bottom: 0 !important;
    border-radius: 0 !important;
    display: flex !important;
    flex-shrink: 0;
    box-shadow: none;
    border-right: 1px solid #e2e8f0;
  }
  .mobile-toolbar { display: none !important; }
  .mobile-overlay { display: none !important; }
  .editor-workspace { flex: 1; height: 100% !important; padding: 10px; background: #fff; overflow-y: auto; }
  .simulator-container { 
    transform: scale(0.5); 
    transform-origin: top center; 
    margin: 0 auto; 
    height: 800px;
  }
  .mobile-hidden { display: flex !important; }
}

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
