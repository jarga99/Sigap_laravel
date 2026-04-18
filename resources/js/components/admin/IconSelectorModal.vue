<script setup lang="ts">
import { ref, computed } from 'vue'
import SIGAPIcons from '../SIGAPIcons.vue'

const props = defineProps<{
  isOpen: boolean
  currentIcon: string
}>()

const emit = defineEmits(['close', 'select'])

const searchQuery = ref('')
const icons = [
  // Tautan & Media Sosial
  'Link', 'ExternalLink', 'Globe', 'Mail', 'Phone', 'MapPin', 'FileText', 'User', 'Users', 'UserCircle',
  'Whatsapp', 'Tiktok', 'Instagram', 'Facebook', 'Twitter', 'Linkedin', 'Youtube', 'Github',
  
  // Navigasi & Aksi
  'Home', 'Search', 'Plus', 'Download', 'Upload', 'Save', 'Trash2', 'Edit2', 'Copy', 'RefreshCcw',
  'ChevronRight', 'ChevronDown', 'Maximize', 'X', 'Check', 'CheckCircle', 'AlertCircle', 'Info', 'HelpCircle',
  
  // Konten & Multimedia
  'FolderOpen', 'Archive', 'Book', 'BookOpen', 'FileSpreadsheet', 'Image', 'Video', 'Camera', 'MessageSquare', 'MessageCircle', 'Send', 'Quote',
  
  // Bisnis & Status
  'Briefcase', 'Building', 'Activity', 'Shield', 'Lock', 'Zap', 'Sparkles', 'Star', 'Heart', 'Award', 'Bell', 'Clock', 'Calendar',
  
  // Sistem
  'LayoutDashboard', 'Settings', 'LogOut', 'LogIn', 'Sun', 'Moon', 'Inbox'
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
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="emit('close')"></div>
        
        <!-- Modal -->
        <div class="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-blue-100 flex flex-col max-h-[85vh] animate-pop">
          <div class="p-8 border-b border-blue-50 flex items-center justify-between">
            <h3 class="text-xl font-bold text-slate-800 tracking-tight">Pilih Ikon Layanan</h3>
            <button @click="emit('close')" class="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400">
               <SIGAPIcons name="X" :size="20" />
            </button>
          </div>
          
          <div class="p-4 bg-blue-50/30">
            <div class="relative">
              <SIGAPIcons name="Search" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                v-model="searchQuery" 
                placeholder="Cari nama ikon..." 
                class="w-full bg-white border border-blue-100 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-6 grid grid-cols-4 sm:grid-cols-6 gap-3">
            <button 
              v-for="icon in filteredIcons" 
              :key="icon" 
              class="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all group border"
              :class="currentIcon === icon ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 border-transparent hover:border-blue-200 text-slate-400 hover:text-blue-600'"
              @click="selectIcon(icon)"
            >
              <SIGAPIcons :name="icon" :size="24" />
              <span class="text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center" :class="currentIcon === icon ? 'text-blue-50' : 'text-slate-400'">{{ icon }}</span>
            </button>
          </div>

          <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <button @click="selectIcon('')" class="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-all">Kosongkan</button>
            <button @click="emit('close')" class="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.animate-pop {
  animation: pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
