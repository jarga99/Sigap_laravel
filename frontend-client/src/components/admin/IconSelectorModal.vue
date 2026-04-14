<script setup lang="ts">
import { ref, computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import { Search, X, Check } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  currentIcon: string
}>()

const emit = defineEmits(['close', 'select'])

const searchQuery = ref('')
const icons = [
  'Link', 'ExternalLink', 'Globe', 'Mail', 'Phone', 'MapPin', 'FileText', 'User', 
  'Home', 'Star', 'Heart', 'Share2', 'Instagram', 'Github', 'Twitter', 'Facebook',
  'Linkedin', 'Youtube', 'Music', 'Play', 'Video', 'Camera', 'Image', 'ShoppingCart',
  'CreditCard', 'Briefcase', 'BookOpen', 'GraduationCap', 'Coffee', 'Utensils',
  'Zap', 'Award', 'Bell', 'Calendar', 'Download', 'Cloud', 'Lock', 'Shield',
  'Settings', 'Info', 'HelpCircle', 'MessageCircle', 'MessageSquare', 'Send', 
  'Smartphone', 'Tent', 'Plane', 'Truck', 'Gift', 'Clock', 'Search'
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
    <div v-if="isOpen" class="modal-overlay">
      <div class="modal-content border border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-white/95 backdrop-blur-2xl dark:bg-slate-800/95 dark:text-slate-100 dark:border-blue-500/60 dark:shadow-[0_0_50px_rgba(59,130,246,0.45)]">
        <div class="modal-header dark:border-slate-700/50">
          <h3 class="text-lg font-bold">Pilih Ikon</h3>
          <button @click="emit('close')" class="close-btn hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-1"><X :size="20" /></button>
        </div>
        
        <div class="search-wrapper">
          <Search class="search-icon" :size="18" />
          <input 
            v-model="searchQuery" 
            placeholder="Cari ikon (misal: mail, phone)..." 
            class="icon-search-input"
            autoFocus
          />
        </div>

        <div class="icon-grid">
          <button 
            v-for="icon in filteredIcons" 
            :key="icon" 
            class="icon-item"
            :class="{ active: currentIcon === icon }"
            @click="selectIcon(icon)"
          >
            <component :is="(LucideIcons as any)[icon]" :size="24" />
            <span class="icon-name">{{ icon }}</span>
            <div v-if="currentIcon === icon" class="active-badge">
              <Check :size="10" />
            </div>
          </button>
        </div>

        <div class="modal-footer">
          <button @click="selectIcon('')" class="clear-btn">Tanpa Ikon</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

:global(.dark) .modal-content {
  background: #1e293b;
  color: white;
}

.modal-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
}

.search-wrapper {
  padding: 1rem 1.5rem;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 32px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.icon-search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}

:global(.dark) .icon-search-input {
  background: #334155;
  border-color: #475569;
}

.icon-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 1rem 1.5rem;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.icon-item:hover {
  background: #f1f5f9;
}

:global(.dark) .icon-item:hover {
  background: #334155;
}

.icon-item.active {
  background: #2563eb1a;
  border-color: #2563eb;
  color: #2563eb;
}

.icon-name {
  font-size: 0.65rem;
  color: #64748b;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #2563eb;
  color: white;
  border-radius: 50%;
  padding: 2px;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  text-align: right;
}

.clear-btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.85rem;
}
</style>
