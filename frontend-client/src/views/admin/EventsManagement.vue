<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../lib/axios'
import { 
  Plus, 
  ExternalLink, 
  Settings, 
  Trash2, 
  Search, 
  Archive, 
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-vue-next'

import { watch, inject } from 'vue'

const setActiveSlug = inject('setActiveSlug') as (slug: string) => void

const router = useRouter()
const events = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const activeTab = ref('active') // 'active', 'inactive', 'archive'
 
 // Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 30, 40, 50, 75, 100]

watch([pageSize, searchQuery, activeTab], () => {
  currentPage.value = 1
})

const fetchEvents = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/admin/events')
    events.value = res.data
  } catch (err) {
    console.error(err)
    alert('Gagal mengambil data event')
  } finally {
    isLoading.value = false
  }
}

const filteredEvents = computed(() => {
  return events.value.filter(e => {
    // 1. Filter by Tab
    if (activeTab.value === 'active' && e.status !== 'AKTIF') return false
    if (activeTab.value === 'inactive' && e.status !== 'TIDAK_AKTIF') return false
    if (activeTab.value === 'archive' && e.status !== 'ARSIP') return false

    // 2. Filter by Search
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return e.title.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q)
    }
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredEvents.value.length / pageSize.value) || 1)
const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredEvents.value.slice(start, start + pageSize.value)
})

const showCreateModal = ref(false)
const newEventTitle = ref('')
const isCreating = ref(false)

const openCreateModal = () => {
  newEventTitle.value = ''
  showCreateModal.value = true
}

const submitNewEvent = async () => {
  if (!newEventTitle.value) return
  isCreating.value = true
  try {
    const res = await api.post('/admin/events', { title: newEventTitle.value })
    router.push(`/admin/events/edit/${res.data.id}`)
  } catch (err: any) {
    alert(err.response?.data?.error || 'Gagal membuat event')
  } finally {
    isCreating.value = false
    showCreateModal.value = false
  }
}

const deleteEvent = async (id: number) => {
  if (!confirm('Yakin ingin menghapus event ini secara permanen?')) return
  try {
    await api.delete(`/admin/events/${id}`)
    fetchEvents()
  } catch (err) {
    alert('Gagal menghapus event')
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'AKTIF': return 'badge-success'
    case 'TIDAK_AKTIF': return 'badge-danger'
    case 'ARSIP': return 'badge-secondary'
    default: return ''
  }
}

onMounted(() => {
  fetchEvents()
  setActiveSlug('')
})
</script>

<template>
  <div class="admin-container">
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
      <div class="w-full md:w-auto flex-1">
        <h2 class="title">Sigap Event Links</h2>
        <p class="subtitle">Kelola halaman landing page (Taplink style) untuk event Anda.</p>
      </div>
      <div class="w-full md:w-auto mt-2 md:mt-0">
        <button @click="openCreateModal" class="w-full md:w-auto px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
          <Plus :size="18" /> Buat Event Baru
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-fancy">
      <button 
        @click="activeTab = 'active'" 
        :class="['tab-item tab-emerald', activeTab === 'active' ? 'active' : '']"
      >
        <CheckCircle :size="18" /> <span>Aktif</span>
      </button>
      <button 
        @click="activeTab = 'inactive'" 
        :class="['tab-item tab-rose', activeTab === 'inactive' ? 'active' : '']"
      >
        <XCircle :size="18" /> <span>Tidak Aktif</span>
      </button>
      <button 
        @click="activeTab = 'archive'" 
        :class="['tab-item tab-slate', activeTab === 'archive' ? 'active' : '']"
      >
        <Archive :size="18" /> <span>Arsip</span>
      </button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar-fancy">
      <div class="search-input-fancy w-full">
        <Search :size="18" class="search-icon" />
        <input v-model="searchQuery" placeholder="Cari judul atau slug..." class="w-full" />
      </div>
    </div>

    <!-- Table (Audit Log Style) -->
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
      <div class="overflow-x-auto">
        <table v-if="!isLoading" class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider transition-colors">
              <th class="px-6 py-4">Event / Slug</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4">Item Link</th>
              <th class="px-6 py-4">Dibuat Pada</th>
              <th class="px-6 py-4 text-right">Aksi & Kontrol</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700 transition-colors">
              <tr v-for="event in paginatedEvents" :key="event.id" class="transition-none!">
                <td class="px-6 py-4">
                  <div class="flex flex-col">
                    <span class="font-bold text-slate-500 dark:text-slate-400">{{ event.title }}</span>
                    <span class="text-[10px] text-slate-400 uppercase tracking-tighter">/e/{{ event.slug }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {{ event.status === 'AKTIF' ? 'Aktif' : (event.status === 'ARSIP' ? 'Arsip' : 'Draft') }}
                  </span>
                </td>
                <td class="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">{{ event._count?.items || 0 }} Tautan</td>
                <td class="px-6 py-4 text-slate-400 small-date">{{ new Date(event.createdAt).toLocaleDateString('id-ID') }}</td>
                <td class="px-6 py-4 text-right">
                  <div class="super-action-group">
                    <a :href="'/e/' + event.slug" target="_blank" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] hover:-translate-y-0.5 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 dark:hover:bg-blue-500/20" title="Lihat Halaman">
                      <ExternalLink :size="16" />
                    </a>
                    <button @click="router.push('/admin/events/edit/' + event.id)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] hover:-translate-y-0.5 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/20" title="Pengaturan">
                      <Settings :size="16" />
                    </button>
                    <button @click="deleteEvent(event.id)" class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all bg-[#fef2f2] text-[#dc2626] border border-[#fee2e2] hover:-translate-y-0.5 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/20" title="Hapus">
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </td>
              </tr>
            <tr v-if="filteredEvents.length === 0">
              <td colspan="5" class="empty-state">
                Tidak ada event dalam kategori ini.
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="flex justify-center p-12">
          <Loader2 class="animate-spin text-slate-400" :size="32" />
        </div>

        <!-- Pagination Controls -->
        <div class="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Tampilkan</span>
            <select v-model="pageSize" class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20">
              <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }} Baris</option>
            </select>
          </div>

          <div class="flex items-center gap-6">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
              Hal <span class="text-slate-700 dark:text-slate-200">{{ currentPage }}</span> dari {{ totalPages }}
            </span>
            
            <div class="flex items-center gap-1">
              <button 
                @click="currentPage--" 
                :disabled="currentPage === 1" 
                class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold"
              >
                &lsaquo;
              </button>
              <button 
                @click="currentPage++" 
                :disabled="currentPage >= totalPages" 
                class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold"
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[9999]">
        <div class="border border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-white/95 backdrop-blur-2xl dark:bg-slate-800/95 dark:text-slate-100 dark:border-blue-500/60 dark:shadow-[0_0_50px_rgba(59,130,246,0.45)] w-full max-w-md rounded-2xl overflow-hidden mx-4">
          <div class="p-6 border-b dark:border-slate-700/50 flex justify-between items-center">
            <h3 class="text-xl font-bold dark:text-slate-100">Buat Event Baru</h3>
            <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <XCircle :size="24" />
            </button>
          </div>
          <div class="p-6">
            <label class="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Judul Event</label>
            <input 
              v-model="newEventTitle" 
              class="w-full p-4 rounded-xl border dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 font-medium" 
              placeholder="Masukkan judul landing page event..."
              @keyup.enter="submitNewEvent"
            />
          </div>
          <div class="p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end gap-3">
            <button @click="showCreateModal = false" class="px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all shadow-sm bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
              Batal
            </button>
            <button @click="submitNewEvent" :disabled="isCreating || !newEventTitle" class="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <Loader2 v-if="isCreating" class="animate-spin" :size="18" />
              Buat Sekarang
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-container {
  padding: 2rem;
  max-width: 2000px;
  margin: 0 auto;
  min-height: 100vh;
}

.title {
  font-size: 2rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #64748b;
  font-size: 1rem;
  margin-top: 0.25rem;
}

/* TABS FANCY */
.tabs-fancy {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 1.5rem;
  width: 100%;
}

.tab-item {
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

/* Emerald Tab */
.tab-emerald { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.tab-emerald:hover { background: #dcfce7; }
.tab-emerald.active { background: #16a34a; color: white; border-color: #16a34a; box-shadow: 0 10px 15px -3px rgba(22, 163, 74, 0.25); }

/* Rose Tab */
.tab-rose { background: #fff1f2; color: #e11d48; border-color: #fecdd3; }
.tab-rose:hover { background: #ffe4e6; }
.tab-rose.active { background: #e11d48; color: white; border-color: #e11d48; box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.25); }

/* Slate Tab */
.tab-slate { background: #f8fafc; color: #475569; border-color: #e2e8f0; }
.tab-slate:hover { background: #f1f5f9; }
.tab-slate.active { background: #475569; color: white; border-color: #475569; box-shadow: 0 10px 15px -3px rgba(71, 85, 105, 0.25); }

/* BUTTONS */
.btn-primary-gradient {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.shadow-btn { box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }

/* TABLE CARD */
.table-card-wrapper { width: 100%; margin-bottom: 3rem; }

.table-box {
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  padding: 1rem;
}

.toolbar-fancy { padding: 0.5rem 0 1.5rem 0; }

.search-input-fancy {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-input-fancy input {
  padding: 0.75rem 1rem 0.75rem 2.8rem;
  width: 100%;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  outline: none;
  transition: all 0.2s;
}

.search-input-fancy input:focus {
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.table-responsive-wrapper {
  width: 100%;
  overflow-x: auto;
}

.table-responsive-wrapper::-webkit-scrollbar { height: 6px; }
.table-responsive-wrapper::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

.main-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 900px; }

.main-table th {
  background: #f8fafc;
  padding: 1rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.main-table td {
  padding: 1.25rem 1rem;
  border-top: 1px solid #f1f5f9;
  vertical-align: middle;
}

.row-item:hover { background: #f1f5f9; }

.event-name { display: block; font-weight: 800; color: #1e293b; font-size: 1rem; }
.event-slug { font-size: 0.8rem; color: #2563eb; font-weight: 600; margin-top: 2px; }

.status-badge {
  padding: 6px 12px;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

.status-badge.aktif { background: #dcfce7; color: #15803d; }
.status-badge.tidak_aktif { background: #fee2e2; color: #b91c1c; }
.status-badge.arsip { background: #f1f5f9; color: #475569; }

.action-cell { text-align: right; }
.super-action-group { display: flex; gap: 8px; justify-content: flex-end; }

.btn-action-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f1f5f9;
  color: #64748b;
}

.btn-action-icon:hover { transform: translateY(-2px); }
.btn-action-icon.blue:hover { background: #eff6ff; color: #2563eb; border-color: #dbeafe; }
.btn-action-icon.amber:hover { background: #fffbeb; color: #d97706; border-color: #fef3c7; }
.btn-action-icon.red:hover { background: #fef2f2; color: #dc2626; border-color: #fee2e2; }

.empty-state { padding: 4rem; text-align: center; color: #94a3b8; font-weight: 500; }

/* DARK MODE */
:global(.dark) .admin-container { background: #0f172a; }
:global(.dark) .title { color: #f1f5f9; }
:global(.dark) .tab-item { background: #1e293b; border-color: #334155; color: #94a3b8; }
:global(.dark) .tab-item.active { background: #2563eb; color: #ffffff; }
:global(.dark) .row-item { background: #1e293b; color: #94a3b8; transition: none !important; }
:global(.dark) .row-item:hover { background: transparent !important; }
:global(.dark) .btn-action-icon.blue { color: #60a5fa; border-color: rgba(96, 165, 250, 0.3); background: rgba(96, 165, 250, 0.1); }
:global(.dark) .btn-action-icon.amber { color: #fbbf24; border-color: rgba(251, 191, 36, 0.3); background: rgba(251, 191, 36, 0.1); }
:global(.dark) .btn-action-icon.red { color: #f87171; border-color: rgba(248, 113, 113, 0.3); background: rgba(248, 113, 113, 0.1); }
:global(.dark) .status-badge.aktif { background: rgba(21, 128, 61, 0.2); color: #4ade80; }
:global(.dark) .status-badge.tidak_aktif { background: rgba(185, 28, 28, 0.2); color: #f87171; }
:global(.dark) .status-badge.arsip { background: rgba(71, 85, 105, 0.2); color: #94a3b8; }

/* DARK MODE TABS */
:global(.dark) .tab-emerald { background: rgba(22, 163, 74, 0.1); border-color: rgba(22, 163, 74, 0.2); color: #4ade80; }
:global(.dark) .tab-emerald:hover { background: rgba(22, 163, 74, 0.2); }
:global(.dark) .tab-emerald.active { background: #16a34a; color: white; border-color: #16a34a; box-shadow: 0 10px 15px -3px rgba(22, 163, 74, 0.3); }

:global(.dark) .tab-rose { background: rgba(225, 29, 72, 0.1); border-color: rgba(225, 29, 72, 0.2); color: #fb7185; }
:global(.dark) .tab-rose:hover { background: rgba(225, 29, 72, 0.2); }
:global(.dark) .tab-rose.active { background: #e11d48; color: white; border-color: #e11d48; box-shadow: 0 10px 15px -3px rgba(225, 29, 72, 0.3); }

:global(.dark) .tab-slate { background: #1e293b; border-color: #334155; color: #94a3b8; }
:global(.dark) .tab-slate:hover { background: #334155; }
:global(.dark) .tab-slate.active { background: #475569; color: white; border-color: #475569; box-shadow: 0 10px 15px -3px rgba(71, 85, 105, 0.3); }
</style>
