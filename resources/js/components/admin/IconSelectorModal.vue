<script setup lang="ts">
import { ref, computed } from 'vue'
import SIGAPIcons from '../SIGAPIcons.vue'

const props = defineProps<{
  isOpen: boolean
  currentIcon: string
}>()

const emit = defineEmits(['close', 'select'])

const searchQuery = ref('')

// Predefined set of icons available in SIGAPIcons
const icons = [
  'Link', 'ExternalLink', 'Globe', 'Mail', 'Phone', 'MapPin', 'User', 'UserCircle',
  'Star', 'Heart', 'Instagram', 'Github', 'Twitter', 'Facebook', 'Linkedin', 'Youtube',
  'Video', 'Camera', 'ImageIcon', 'Briefcase', 'Book', 'Clock', 'Search', 'Settings',
  'Bell', 'MessageSquare', 'MessageCircle', 'Send', 'Lock', 'Shield', 'Archive',
  'Activity', 'Layers', 'ClipboardList', 'Inbox', 'Plus', 'Download', 'Upload',
  'RefreshCcw', 'AlertCircle', 'CheckCircle', 'Printer', 'FileSpreadsheet', 'Building'
]

const filteredIcons = computed(() => {
  if (!searchQuery.value) return icons
  const q = searchQuery.value.toLowerCase()
  return icons.filter(i => i.toLowerCase().includes(q))
})

const selectIcon = (icon: string) => {
  emit('select', icon)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="emit('close')"></div>
      
      <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-fadeup border border-slate-100">
        <!-- Header -->
        <div class="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 class="font-black text-slate-800 text-sm uppercase tracking-tighter">Pilih Visual Ikon</h3>
          <button @click="emit('close')" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
            <SIGAPIcons name="X" :size="20" />
          </button>
        </div>
        
        <!-- Search -->
        <div class="p-6 pb-2">
          <div class="relative">
            <SIGAPIcons name="Search" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="searchQuery" type="text" placeholder="Cari ikon (misal: mail, phone, link)..." class="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none" autoFocus />
          </div>
        </div>

        <!-- Grid Container -->
        <div class="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div class="grid grid-cols-4 sm:grid-cols-5 gap-3">
            <button v-for="icon in filteredIcons" :key="icon" 
                    @click="selectIcon(icon)"
                    :class="currentIcon === icon ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
                    class="group relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all aspect-square border-2 border-transparent">
              <SIGAPIcons :name="icon" :size="24" :strokeWidth="currentIcon === icon ? 3 : 2" />
              <span :class="currentIcon === icon ? 'text-white/80' : 'text-slate-400'" class="text-[8px] font-black uppercase mt-2 tracking-tighter truncate w-full text-center">
                {{ icon }}
              </span>
              <div v-if="currentIcon === icon" class="absolute top-2 right-2">
                 <div class="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </button>
          </div>
          
          <div v-if="filteredIcons.length === 0" class="py-20 text-center">
             <SIGAPIcons name="Inbox" :size="48" class="mx-auto text-slate-200 mb-4" />
             <p class="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Ikon tidak ditemukan</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="p-6 border-t border-slate-50 flex gap-3">
           <button @click="selectIcon('')" class="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Tanpa Ikon</button>
           <button @click="emit('close')" class="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Selesai</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
