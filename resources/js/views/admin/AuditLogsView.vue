<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import api from '../../lib/axios'
import SIGAPIcons from '../../components/SIGAPIcons.vue'

const logs = ref<any[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(15)

const fetchLogs = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/admin/audit-logs')
    logs.value = res.data
  } catch (err) { console.error(err) }
  finally { isLoading.value = false }
}

const filteredLogs = computed(() => {
  if (!searchQuery.value) return logs.value
  const q = searchQuery.value.toLowerCase()
  return logs.value.filter(l => 
    l.action.toLowerCase().includes(q) || 
    l.user?.username?.toLowerCase().includes(q) ||
    l.details?.toLowerCase().includes(q)
  )
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredLogs.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => Math.ceil(filteredLogs.value.length / pageSize.value) || 1)

onMounted(fetchLogs)

const getActionBadge = (action: string) => {
  if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-600 border-emerald-100'
  if (action.includes('UPDATE')) return 'bg-amber-50 text-amber-600 border-amber-100'
  if (action.includes('DELETE')) return 'bg-red-50 text-red-600 border-red-100'
  return 'bg-slate-50 text-slate-500 border-slate-100'
}
</script>

<template>
  <div class="space-y-8 animate-fadeup pb-20">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Audit logs</h1>
        <p class="text-sm text-slate-500 font-medium">Rekaman jejak aktivitas sistem dan perubahan data operasional.</p>
      </div>
      <button @click="fetchLogs" class="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
         <SIGAPIcons name="RefreshCcw" :size="20" />
      </button>
    </div>

    <!-- Toolbar -->
    <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4">
      <div class="relative flex-1">
        <SIGAPIcons name="Search" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="searchQuery" type="text" placeholder="Cari aksi, user, atau detail log..." class="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </div>
    </div>

    <!-- Logs Table -->
    <div class="bg-blue-50/40 rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="text-slate-400 font-bold text-[10px] border-b border-blue-50">
              <th class="px-6 py-5 font-bold">Waktu</th>
              <th class="px-6 py-5 font-bold">Aksi</th>
              <th class="px-6 py-5 font-bold">Aktor</th>
              <th class="px-6 py-5 font-bold">Entitas / nilai</th>
              <th class="px-6 py-5 font-bold">IP address</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="isLoading" v-for="i in 5" :key="i" class="animate-pulse">
               <td colspan="5" class="px-6 py-6"><div class="h-4 bg-slate-50 rounded-full w-full"></div></td>
            </tr>
            <tr v-else v-for="log in paginatedLogs" :key="log.id" class="group hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-5">
                 <div class="flex flex-col">
                    <span class="font-bold text-slate-700 text-xs">{{ new Date(log.createdAt).toLocaleTimeString('id-ID') }}</span>
                    <span class="text-[10px] text-slate-400 font-medium">{{ new Date(log.createdAt).toLocaleDateString('id-ID') }}</span>
                 </div>
              </td>
              <td class="px-6 py-5">
                 <span :class="getActionBadge(log.action)" class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border">
                    {{ log.action }}
                 </span>
              </td>
              <td class="px-6 py-5">
                 <div class="flex items-center gap-2">
                    <div class="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                       {{ log.user?.username?.charAt(0).toUpperCase() || 'S' }}
                    </div>
                    <span class="font-bold text-slate-600 text-xs">{{ log.user?.username || 'SYSTEM' }}</span>
                 </div>
              </td>
              <td class="px-6 py-5">
                 <p class="text-xs text-slate-500 font-medium leading-relaxed italic line-clamp-1 max-w-xs">{{ log.details || '-' }}</p>
              </td>
              <td class="px-6 py-5 text-slate-400 font-mono text-[10px] tracking-widest">
                 {{ log.ip_address || '127.0.0.1' }}
              </td>
            </tr>
            <tr v-if="!isLoading && paginatedLogs.length === 0">
               <td colspan="5" class="px-6 py-20 text-center">
                  <SIGAPIcons name="Inbox" :size="48" class="mx-auto text-slate-100 mb-4" />
                  <p class="text-xs font-black text-slate-300 uppercase tracking-widest leading-relaxed">Log tidak ditemukan</p>
               </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Pagination -->
      <div class="p-4 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
         <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tercatat {{ logs.length }} Aktivitas</p>
         <div class="flex gap-2">
            <button @click="currentPage--" :disabled="currentPage === 1" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-30">Prev</button>
            <button @click="currentPage++" :disabled="currentPage >= totalPages" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-30">Next</button>
         </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeup { animation: fadeup 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
