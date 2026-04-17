<script setup lang="ts">
import { ref, onMounted, computed, watch, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'
import IconSelectorModal from '../../components/admin/IconSelectorModal.vue'
import { useAuthStore } from '../../stores/auth'

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
    event.value = res.data
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
          <button @click="saveEvent" :disabled="isSaving" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all">
             <SIGAPIcons v-if="!isSaving" name="Save" :size="14" />
             <span v-else class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
             {{ isSaving ? 'Menyimpan' : 'Simpan' }}
          </button>
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
                   <label class="text-[10px] uppercase text-slate-400 tracking-widest">Teks Penutup</label>
                   <textarea v-model="event.footerText" rows="4" class="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="Pesan akhir untuk audiens..."></textarea>
                </div>
                <div class="bg-blue-50 border border-blue-100 p-6 rounded-3xl space-y-4">
                   <div class="flex items-center justify-between">
                      <span class="text-xs font-black text-blue-700 uppercase tracking-tighter">Branding Sistem</span>
                      <button @click="event.showSystemBranding = !event.showSystemBranding" :class="event.showSystemBranding ? 'bg-blue-600' : 'bg-slate-300'" class="w-10 h-5 rounded-full relative transition-all">
                        <div :class="event.showSystemBranding ? 'translate-x-5' : 'translate-x-1'" class="absolute top-1 w-3 h-3 bg-white rounded-full transition-all"></div>
                      </button>
                   </div>
                   <input v-if="event.showSystemBranding" v-model="event.customBranding" class="w-full bg-white rounded-xl p-3 text-xs font-bold border-none outline-none" placeholder="Nama Brand..." />
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

  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.animate-fadeup { animation: fadeup 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>
