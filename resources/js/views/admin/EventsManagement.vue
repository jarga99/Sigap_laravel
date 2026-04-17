<script setup lang="ts">
import { ref, onMounted, computed, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'

const setActiveSlug = inject('setActiveSlug') as (slug: string) => void
const router = useRouter()
const events = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const activeTab = ref('active') // 'active', 'inactive', 'archive'
 
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 20, 50, 100]

watch([pageSize, searchQuery, activeTab], () => {
  currentPage.value = 1
})

const fetchEvents = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/admin/events')
    events.value = res.data
  } catch (err) { console.error(err); alert('Gagal mengambil data event') }
  finally { isLoading.value = false }
}

const filteredEvents = computed(() => {
  return events.value.filter(e => {
    if (activeTab.value === 'active' && e.status !== 'AKTIF') return false
    if (activeTab.value === 'inactive' && e.status !== 'TIDAK_AKTIF') return false
    if (activeTab.value === 'archive' && e.status !== 'ARSIP') return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return e.title.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q)
    }
    return true
  })
})

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
  } catch (err: any) { alert(err.response?.data?.error || 'Gagal membuat event') }
  finally { isCreating.value = false; showCreateModal.value = false }
}

const deleteEvent = async (id: number) => {
  if (!confirm('Hapus event ini secara permanen?')) return
  try { await api.delete(`/admin/events/${id}`); fetchEvents() }
  catch (err) { alert('Gagal menghapus event') }
}

onMounted(() => {
  fetchEvents()
  setActiveSlug('')
})
</script>

<template>
  <div class="space-y-8 animate-fadeup pb-20">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Sigap Event Links</h1>
        <p class="text-sm text-slate-500 font-medium">Kelola halaman landing page (Taplink style) untuk event Anda.</p>
      </div>
      <button @click="openCreateModal" class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-widest">
        <SIGAPIcons name="Plus" :size="18" /> 
        <span>Buat Event Baru</span>
      </button>
    </div>

    <!-- Status Tabs -->
    <div class="flex flex-wrap gap-2">
       <button v-for="tab in [
         { id: 'active', label: 'Aktif', color: 'emerald' },
         { id: 'inactive', label: 'Tidak Aktif', color: 'rose' },
         { id: 'archive', label: 'Arsip', color: 'slate' }
       ]" :key="tab.id" @click="activeTab = tab.id"
       :class="activeTab === tab.id ? `bg-slate-800 text-white` : `bg-white text-slate-500 hover:bg-slate-50 border border-slate-100`"
       class="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm">
         {{ tab.label }}
       </button>
    </div>

    <!-- Toolbar -->
    <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4">
      <div class="relative flex-1">
        <SIGAPIcons name="Search" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="searchQuery" type="text" placeholder="Cari event berdasarkan judul atau slug..." class="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </div>
      <div class="flex gap-2">
         <select v-model="pageSize" class="bg-slate-50 border-none rounded-2xl px-4 py-3 text-xs font-bold text-slate-500 outline-none">
           <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }} Per Hal</option>
         </select>
      </div>
    </div>

    <!-- Content Table -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-50">
              <th class="px-6 py-5">Event & Url Signature</th>
              <th class="px-6 py-5 text-center">Status</th>
              <th class="px-6 py-5">Komponen / Konten</th>
              <th class="px-6 py-5">Dibuat</th>
              <th class="px-6 py-5 text-right">Manajemen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="isLoading" v-for="i in 3" :key="i" class="animate-pulse">
               <td colspan="5" class="px-6 py-8"><div class="h-4 bg-slate-50 rounded-full w-full"></div></td>
            </tr>
            <tr v-else v-for="event in paginatedEvents" :key="event.id" class="group hover:bg-slate-50/50 transition-all">
              <td class="px-6 py-5">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all font-black text-xs">
                    EV
                  </div>
                  <div>
                    <div class="font-bold text-slate-700 text-sm leading-tight">{{ event.title }}</div>
                    <div class="text-[10px] text-blue-500 font-bold font-mono">/e/{{ event.slug }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5 text-center">
                 <span :class="{
                   'bg-emerald-50 text-emerald-600 border-emerald-100': event.status === 'AKTIF',
                   'bg-slate-50 text-slate-400 border-slate-100': event.status !== 'AKTIF',
                 }" class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border">
                   {{ event.status }}
                 </span>
              </td>
              <td class="px-6 py-5">
                 <div class="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tighter">
                    <SIGAPIcons name="Layers" :size="14" class="opacity-40" />
                    {{ event._count?.items || 0 }} Item Konten
                 </div>
              </td>
              <td class="px-6 py-5">
                 <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ new Date(event.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }}</span>
              </td>
              <td class="px-6 py-5 text-right">
                <div class="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                   <a :href="'/e/' + event.slug" target="_blank" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white transition-all">
                      <SIGAPIcons name="ExternalLink" :size="16" />
                   </a>
                   <button @click="router.push('/admin/events/edit/' + event.id)" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-amber-500 hover:text-white transition-all">
                      <SIGAPIcons name="Settings" :size="16" />
                   </button>
                   <button @click="deleteEvent(event.id)" class="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white transition-all">
                      <SIGAPIcons name="Trash2" :size="16" />
                   </button>
                </div>
              </td>
            </tr>
            <tr v-if="!isLoading && filteredEvents.length === 0">
               <td colspan="5" class="px-6 py-20 text-center">
                  <SIGAPIcons name="Inbox" :size="48" class="mx-auto text-slate-200 mb-4" />
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Tidak ada event ditemukan</p>
               </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
       <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showCreateModal = false"></div>
          <div class="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fadeup p-8 text-center">
             <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <SIGAPIcons name="Plus" :size="32" />
             </div>
             <h3 class="font-black text-slate-800 text-xl tracking-tight mb-2">Buat Event Baru</h3>
             <p class="text-xs text-slate-400 font-medium mb-8 uppercase tracking-widest leading-relaxed">Berikan judul untuk landing page portofolio baru Anda.</p>
             
             <div class="space-y-6">
                <input v-model="newEventTitle" type="text" required placeholder="Contoh: Pameran Teknologi 2026" class="w-full bg-slate-50 border-none rounded-2xl p-4 text-center text-sm font-bold border-2 border-transparent focus:border-blue-500 transition-all outline-none" @keyup.enter="submitNewEvent" />

                <div class="flex gap-3">
                   <button type="button" @click="showCreateModal = false" class="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                   <button @click="submitNewEvent" :disabled="isCreating || !newEventTitle" class="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <span v-if="!isCreating">Buat Sekarang</span>
                      <span v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                   </button>
                </div>
             </div>
          </div>
       </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
